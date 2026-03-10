"""Excel 数据处理接口 - 专门处理数据处理意图"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_current_user
from app.core.database import AsyncSessionLocal
from app.core.sse import sse
from app.models.user import User
from app.services.processing_pipeline import stream_processing_pipeline

# 兼容性 re-export（intent.py 曾 import _init_session）
from app.services.processing_pipeline import init_session as _init_session  # noqa: F401

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Error Codes ============


class ErrorCode:
    """错误码常量"""

    THREAD_NOT_FOUND = "THREAD_NOT_FOUND"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    INVALID_PARAMS = "INVALID_PARAMS"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# ============ Request Model ============


class ChatRequest(BaseModel):
    """Excel 处理请求"""

    query: str = Field(..., description="数据处理需求的自然语言描述")
    file_ids: List[str] = Field(
        ..., description="上传文件返回的 file_id 列表（UUID 字符串），支持多个文件"
    )
    thread_id: Optional[str] = Field(None, description="线程 ID（可选，用于继续会话）")


# ============ API Endpoint ============


@router.post("/processing")
async def process_data_processing(
    params: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    logger.info(
        f"🚀 [进入 Processing 接口] 收到请求: query='{params.query}', "
        f"file_ids={params.file_ids}, user_id={current_user.id}"
    )
    """
    处理数据处理意图的请求（SSE 流式响应）

    SSE 事件协议:
    - event: session  - 会话元数据（thread/turn 创建完成）
    - event: error    - 会话级/系统级错误
    - (default)       - 业务流程步骤 { step, status, delta/output/error }
    """
    # 参数验证和转换
    try:
        file_ids = [UUID(fid) for fid in params.file_ids]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"无效的 file_id 格式: {e}")

    thread_id: Optional[UUID] = None
    if params.thread_id:
        try:
            thread_id = UUID(params.thread_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的 thread_id 格式")

    async def stream():
        async with AsyncSessionLocal() as db:
            try:
                async for event in stream_processing_pipeline(
                    db=db,
                    user_id=current_user.id,
                    query=params.query,
                    file_ids=file_ids,
                    thread_id=thread_id,
                ):
                    yield event
            except Exception as e:
                logger.error(f"处理请求流失败: {e}", exc_info=True)
                yield sse({"message": f"处理失败: {str(e)}"}, event="error")

    return EventSourceResponse(stream())
