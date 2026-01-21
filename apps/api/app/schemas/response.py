"""API 响应模型"""

from typing import List, Optional, Any, TypeVar, Generic
from pydantic import BaseModel, Field

T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """统一 API 响应格式"""

    code: int = Field(
        ...,
        description="响应状态码，0 表示成功，非 0 表示失败",
        examples=[0, 400, 500],
    )
    data: Optional[T] = Field(
        None,
        description="响应数据",
    )
    msg: str = Field(
        ...,
        description="响应消息",
        examples=["成功", "请上传文件"],
    )


class HealthResponse(BaseModel):
    """健康检查响应"""

    status: str = Field(
        ...,
        description="服务状态",
        examples=["ok"],
    )
    service: str = Field(
        ...,
        description="服务名称",
        examples=["LLM Excel API"],
    )


class ErrorResponse(BaseModel):
    """错误响应"""

    detail: str = Field(
        ...,
        description="错误详情",
        examples=["请上传文件", "文件不存在"],
    )


class UploadItem(BaseModel):
    """上传文件项"""

    id: str = Field(
        ...,
        description="文件唯一标识",
        examples=["abc123def456"],
    )
    path: str = Field(
        ...,
        description="文件路径",
        examples=["/uploads/abc123def456/filename.xlsx"],
    )
    table: str = Field(
        ...,
        description="表名",
        examples=["orders"],
    )
    schema: dict[str, str] = Field(
        ...,
        description="表结构，格式: {列字母: 列名}",
        examples=[{"A": "订单ID", "B": "客户名称", "C": "金额"}],
    )


class ProcessResponse(BaseModel):
    """处理响应"""

    analysis: str = Field(
        ...,
        description="LLM 对需求的分析说明",
        examples=["用户需要筛选出金额大于1000的订单记录"],
    )
    operations: dict[str, Any] = Field(
        ...,
        description="生成的操作 JSON，描述具体执行的数据处理步骤",
        examples=[
            {
                "steps": [
                    {
                        "operation": "filter",
                        "table": "orders",
                        "condition": "金额 > 1000",
                    }
                ]
            }
        ],
    )
    variables: dict[str, Any] = Field(
        ...,
        description="执行过程中产生的变量和计算结果",
        examples=[{"filtered_count": 42, "total_amount": 156800.5}],
    )
    new_columns: dict[str, dict[str, list]] = Field(
        ...,
        description="新增列的预览数据，格式: {表名: {列名: [前10行数据]}}",
        examples=[{"orders": {"利润率": [0.15, 0.22, 0.18, 0.25, 0.12]}}],
    )
    excel_formulas: list[dict[str, Any]] = Field(
        ...,
        description="生成的 Excel 公式列表",
        examples=[[{"column": "D", "formula": "=C2/B2", "description": "计算利润率"}]],
    )
    output_file: Optional[str] = Field(
        None,
        description="生成的结果文件名，可通过 /download/{filename} 下载",
        examples=["result_20240115_143052.xlsx"],
    )
    errors: list[str] = Field(
        default=[],
        description="处理过程中的错误或警告信息",
        examples=[["某些单元格包含无效数据，已跳过"]],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "analysis": "筛选出金额大于1000的订单",
                    "operations": {
                        "steps": [
                            {
                                "operation": "filter",
                                "table": "orders",
                                "condition": "金额 > 1000",
                            }
                        ]
                    },
                    "variables": {"filtered_count": 42},
                    "new_columns": {},
                    "excel_formulas": [],
                    "output_file": "result_20240115_143052.xlsx",
                    "errors": [],
                }
            ]
        }
    }
