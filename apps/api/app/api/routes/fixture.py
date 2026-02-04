"""Fixture 测试接口"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.core.sse import sse_error
from app.services.processor_stream import stream_excel_processing
from app.engine.excel_parser import ExcelParser
from app.services.fixture import get_fixture_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fixture", tags=["fixture"])


# ============ Response Models ============


class GroupResponse(BaseModel):
    """分组响应"""

    id: str
    name: str
    description: str
    scenario_count: int


class ScenarioSummary(BaseModel):
    """场景摘要"""

    id: str
    name: str
    group: str
    tags: List[str]
    case_count: int = 0


class CaseSummary(BaseModel):
    """用例摘要"""

    id: str
    name: str
    prompt: str
    tags: List[str]


class DatasetInfo(BaseModel):
    """数据集信息"""

    file: str
    description: str


class ScenarioDetail(BaseModel):
    """场景详情"""

    id: str
    name: str
    description: str
    group: str
    tags: List[str]
    datasets: List[DatasetInfo]
    cases: List[CaseSummary]


class FixtureListResponse(BaseModel):
    """Fixture 列表响应"""

    groups: List[GroupResponse]
    scenarios: List[ScenarioSummary]


# ============ API Endpoints ============


@router.get("/list", response_model=FixtureListResponse)
async def get_fixture_list():
    """
    获取所有测试用例列表

    返回分组和场景信息，用于构建测试界面。
    """
    service = get_fixture_service()

    try:
        index = service.load_index()

        # 构建分组响应
        groups = []
        for g in index.groups:
            groups.append(
                GroupResponse(
                    id=g.id,
                    name=g.name,
                    description=g.description,
                    scenario_count=len(g.scenario_ids),
                )
            )

        # 构建场景摘要
        scenarios = []
        for s in index.scenarios:
            # 加载场景以获取用例数量
            try:
                scenario = service.load_scenario(s["id"])
                case_count = len(scenario.cases)
            except Exception:
                case_count = 0

            scenarios.append(
                ScenarioSummary(
                    id=s["id"],
                    name=s["name"],
                    group=s.get("group", ""),
                    tags=s.get("tags", []),
                    case_count=case_count,
                )
            )

        return FixtureListResponse(groups=groups, scenarios=scenarios)

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception(f"获取 Fixture 列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取列表失败: {e}")


@router.get("/scenario/{scenario_id}", response_model=ScenarioDetail)
async def get_scenario_detail(scenario_id: str):
    """
    获取场景详情

    包含数据集和用例列表。
    """
    service = get_fixture_service()

    try:
        scenario = service.load_scenario(scenario_id)

        return ScenarioDetail(
            id=scenario.id,
            name=scenario.name,
            description=scenario.description,
            group=scenario.group,
            tags=scenario.tags,
            datasets=[
                DatasetInfo(file=ds.file, description=ds.description)
                for ds in scenario.datasets
            ],
            cases=[
                CaseSummary(id=c.id, name=c.name, prompt=c.prompt, tags=c.tags)
                for c in scenario.cases
            ],
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception(f"获取场景详情失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取详情失败: {e}")


@router.post("/run/{scenario_id}/{case_id}")
async def run_fixture_case(
    scenario_id: str,
    case_id: str,
    stream_llm: bool = Query(True, description="是否使用流式 LLM 调用"),
):
    """
    运行单个测试用例（SSE 流式响应）

    Args:
        scenario_id: 场景 ID（如 "01-titanic"）
        case_id: 用例 ID（如 "missing-value"）
        stream_llm: 是否使用流式 LLM（默认 True）

    SSE 事件协议:
    - event: error    - 系统级错误
    - (default)       - 步骤事件 { step, status, delta/output/error }

    步骤事件:
    - load:file: 加载文件 → { files }
    - analyze: 需求分析 → { content }
    - generate: 生成操作 → { operations }
    - execute: 执行操作 → { formulas, variables, new_columns }
    - export:result: 导出结果 → { output_files }
    - complete: 完成 → { success, errors }
    """
    service = get_fixture_service()

    # 预加载场景和用例（在流之前验证）
    try:
        scenario, case = service.get_case(scenario_id, case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    async def stream():
        try:
            # 加载文件的函数
            async def load_tables():
                file_paths = {ds.path.stem: ds.path for ds in scenario.datasets}
                return await asyncio.to_thread(
                    ExcelParser.parse_multiple_files, file_paths
                )

            # 执行处理流程
            async for sse_event in stream_excel_processing(
                load_tables_fn=load_tables,
                query=case.prompt,
                stream_llm=stream_llm,
                export_path_prefix=f"fixture_outputs/{scenario_id}/{case_id}",
            ):
                yield sse_event

        except Exception as e:
            logger.exception(f"运行测试用例失败: {e}")
            yield sse_error(f"运行失败: {e}")

    return EventSourceResponse(stream())


@router.get("/cases", response_model=List[Dict[str, Any]])
async def list_all_cases(
    group: Optional[str] = Query(
        None, description="按分组筛选（basic/advanced/multi-table）"
    ),
):
    """
    列出所有测试用例

    Args:
        group: 可选的分组 ID 筛选

    Returns:
        用例列表
    """
    service = get_fixture_service()

    try:
        if group:
            return service.list_cases_by_group(group)
        else:
            return service.list_all_cases()

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception(f"列出用例失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取列表失败: {e}")


@router.get("/dataset/{scenario_id}/{filename}")
async def get_dataset_file(scenario_id: str, filename: str):
    """
    获取场景的数据集文件

    用于前端预览数据集内容。

    Args:
        scenario_id: 场景 ID（如 "01-titanic"）
        filename: 数据集文件名（如 "titanic.xlsx"）

    Returns:
        文件内容（FileResponse）
    """
    service = get_fixture_service()

    try:
        # 加载场景
        scenario = service.load_scenario(scenario_id)

        # 查找数据集
        dataset = next(
            (ds for ds in scenario.datasets if ds.file == filename), None
        )
        if not dataset:
            raise HTTPException(
                status_code=404, detail=f"数据集不存在: {filename}"
            )

        # 检查文件是否存在
        if not dataset.path.exists():
            raise HTTPException(
                status_code=404, detail=f"数据集文件不存在: {dataset.path}"
            )

        # 根据文件扩展名确定 MIME 类型
        suffix = dataset.path.suffix.lower()
        media_type_map = {
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls": "application/vnd.ms-excel",
            ".csv": "text/csv",
        }
        media_type = media_type_map.get(suffix, "application/octet-stream")

        return FileResponse(
            path=dataset.path,
            filename=filename,
            media_type=media_type,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception(f"获取数据集文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取文件失败: {e}")
