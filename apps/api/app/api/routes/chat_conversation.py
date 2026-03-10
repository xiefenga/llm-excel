"""聊天对话路由 - 纯文本对话端点"""

import logging
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_current_user, get_db
from app.core.database import AsyncSessionLocal
from app.core.sse import sse
from app.models.user import User
from app.services.chat_service import get_chat_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Request/Response Models ============

class ChatRequest(BaseModel):
    """聊天请求"""
    
    query: str = Field(..., description="用户查询文本")
    file_ids: List[str] = Field(
        default_factory=list,
        description="上传文件返回的 file_id 列表（UUID 字符串），支持多个文件"
    )
    thread_id: Optional[str] = Field(None, description="线程 ID（可选，用于继续对话）")


class ChatResponse(BaseModel):
    """聊天响应"""
    
    response: str = Field(..., description="AI回复")
    thread_id: str = Field(..., description="线程ID")
    turn_id: Optional[str] = Field(None, description="对话轮次ID")
    is_new_thread: bool = Field(..., description="是否是新创建的线程")
    thread_title: str = Field(..., description="线程标题")
    history_count: int = Field(..., description="历史对话轮次数")


class ConversationSummaryRequest(BaseModel):
    """对话摘要请求"""
    
    thread_id: str = Field(..., description="线程ID")


class ClearHistoryRequest(BaseModel):
    """清空历史请求"""
    
    thread_id: str = Field(..., description="线程ID")


# ============ Error Codes ============

class ErrorCode:
    """错误码常量"""
    
    INVALID_THREAD_ID = "INVALID_THREAD_ID"
    CHAT_PROCESSING_FAILED = "CHAT_PROCESSING_FAILED"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"


# ============ API Endpoints ============

@router.post(
    "/conversation",
    response_model=ChatResponse,
    description="纯文本聊天对话"
)
async def chat_conversation(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSessionLocal = Depends(get_db)
):
    """
    聊天对话端点
    
    处理纯文本对话，不涉及文件处理。
    支持多轮对话，自动维护对话历史。
    """
    # 1. 参数验证
    thread_id = None
    if request.thread_id:
        try:
            thread_id = UUID(request.thread_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="无效的 thread_id 格式"
            )
    
    # 2. 获取聊天服务
    try:
        chat_service = await get_chat_service(db)
    except Exception as e:
        logger.error(f"获取聊天服务失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="系统内部错误：无法初始化聊天服务"
        )
    
    # 3. 处理聊天请求
    try:
        result = await chat_service.chat(
            query=request.query,
            user_id=current_user.id,
            thread_id=thread_id,
            db_session=db
        )
    except ValueError as e:
        # 线程访问权限错误
        raise HTTPException(
            status_code=403,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"聊天处理失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"聊天处理失败: {str(e)}"
        )
    
    # 4. 返回结果
    return ChatResponse(**result)


@router.post(
    "/conversation/stream",
    description="流式聊天对话（SSE）"
)
async def chat_conversation_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSessionLocal = Depends(get_db)
):
    """
    流式聊天对话
    
    使用SSE返回聊天回复，适合需要实时反馈的场景。
    """
    # 1. 参数验证
    thread_id = None
    if request.thread_id:
        try:
            thread_id = UUID(request.thread_id)
        except ValueError:
            # 返回错误事件
            async def error_stream():
                yield sse(
                    {"code": ErrorCode.INVALID_THREAD_ID, "message": "无效的 thread_id 格式"},
                    event="error"
                )
            return EventSourceResponse(error_stream())
    
    async def stream():
        try:
            # 2. 获取聊天服务
            chat_service = await get_chat_service(db)
            
            # 3. 开始流式处理
            yield sse({"status": "started", "message": "开始处理聊天请求"}, event="status")
            
            # 4. 流式生成回复
            full_response = ""
            async for chunk in chat_service.chat_stream(
                query=request.query,
                user_id=current_user.id,
                thread_id=thread_id,
                db_session=db
            ):
                full_response += chunk
                yield sse({"delta": chunk}, event="chunk")
            
            # 5. 发送完成事件
            yield sse(
                {
                    "status": "completed",
                    "message": "聊天处理完成",
                    "response_length": len(full_response)
                },
                event="status"
            )
            
        except ValueError as e:
            # 线程访问权限错误
            yield sse(
                {"code": ErrorCode.UNAUTHORIZED_ACCESS, "message": str(e)},
                event="error"
            )
        except Exception as e:
            logger.error(f"流式聊天失败: {e}", exc_info=True)
            yield sse(
                {"code": ErrorCode.CHAT_PROCESSING_FAILED, "message": f"聊天处理失败: {str(e)}"},
                event="error"
            )
    
    return EventSourceResponse(stream())


@router.post(
    "/conversation/summary",
    description="获取对话摘要"
)
async def get_conversation_summary(
    request: ConversationSummaryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSessionLocal = Depends(get_db)
):
    """
    获取对话摘要
    
    返回指定对话线程的统计信息和摘要。
    """
    # 1. 参数验证
    try:
        thread_id = UUID(request.thread_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="无效的 thread_id 格式"
        )
    
    # 2. 获取聊天服务
    try:
        chat_service = await get_chat_service(db)
    except Exception as e:
        logger.error(f"获取聊天服务失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="系统内部错误：无法初始化聊天服务"
        )
    
    # 3. 获取对话摘要
    try:
        summary = await chat_service.get_conversation_summary(
            thread_id=thread_id,
            user_id=current_user.id,
            db_session=db
        )
    except Exception as e:
        logger.error(f"获取对话摘要失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"获取对话摘要失败: {str(e)}"
        )
    
    # 4. 检查错误
    if "error" in summary:
        raise HTTPException(
            status_code=400,
            detail=summary["error"]
        )
    
    # 5. 返回摘要
    return summary


@router.post(
    "/conversation/clear",
    description="清空对话历史"
)
async def clear_conversation_history(
    request: ClearHistoryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSessionLocal = Depends(get_db)
):
    """
    清空对话历史
    
    删除指定对话线程的所有历史记录。
    """
    # 1. 参数验证
    try:
        thread_id = UUID(request.thread_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="无效的 thread_id 格式"
        )
    
    # 2. 获取聊天服务
    try:
        chat_service = await get_chat_service(db)
    except Exception as e:
        logger.error(f"获取聊天服务失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="系统内部错误：无法初始化聊天服务"
        )
    
    # 3. 清空历史
    try:
        success = await chat_service.clear_conversation_history(
            thread_id=thread_id,
            user_id=current_user.id,
            db_session=db
        )
    except Exception as e:
        logger.error(f"清空对话历史失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"清空对话历史失败: {str(e)}"
        )
    
    # 4. 返回结果
    if not success:
        raise HTTPException(
            status_code=403,
            detail="无权访问该对话线程或线程不存在"
        )
    
    return {
        "success": True,
        "message": "对话历史已清空",
        "thread_id": request.thread_id
    }


@router.get(
    "/conversation/supported-features",
    description="获取支持的聊天功能"
)
async def get_supported_chat_features():
    """
    获取支持的聊天功能
    
    返回系统支持的聊天相关功能列表。
    """
    return {
        "features": [
            {
                "name": "文本聊天",
                "description": "纯文本对话，不涉及文件处理",
                "endpoint": "/api/chat/conversation",
                "methods": ["POST"]
            },
            {
                "name": "流式聊天",
                "description": "实时流式回复，适合长对话",
                "endpoint": "/api/chat/conversation/stream",
                "methods": ["POST"]
            },
            {
                "name": "对话摘要",
                "description": "获取对话统计信息和摘要",
                "endpoint": "/api/chat/conversation/summary",
                "methods": ["POST"]
            },
            {
                "name": "清空历史",
                "description": "删除对话历史记录",
                "endpoint": "/api/chat/conversation/clear",
                "methods": ["POST"]
            }
        ],
        "limitations": [
            "不支持文件上传和处理",
            "对话历史最多保存最近50轮",
            "单次回复长度限制为2000字符"
        ]
    }


# ============ Helper Functions ============

async def validate_chat_request(
    query: str,
    thread_id: Optional[str],
    current_user: User
) -> tuple[Optional[UUID], List[str]]:
    """
    验证聊天请求
    
    Args:
        query: 用户查询
        thread_id: 线程ID
        current_user: 当前用户
        
    Returns:
        (验证后的线程ID, 错误列表)
    """
    errors = []
    validated_thread_id = None
    
    # 检查查询是否为空
    if not query or not query.strip():
        errors.append("查询内容不能为空")
    
    # 检查查询长度
    if len(query) > 1000:
        errors.append("查询内容过长，请控制在1000字符以内")
    
    # 验证线程ID
    if thread_id:
        try:
            validated_thread_id = UUID(thread_id)
        except ValueError:
            errors.append("无效的线程ID格式")
    
    return validated_thread_id, errors


def format_chat_response(
    response: str,
    thread_id: UUID,
    turn_id: Optional[UUID],
    is_new_thread: bool,
    thread_title: str,
    history_count: int
) -> Dict:
    """
    格式化聊天响应
    
    Args:
        response: AI回复
        thread_id: 线程ID
        turn_id: 轮次ID
        is_new_thread: 是否是新线程
        thread_title: 线程标题
        history_count: 历史轮次数
        
    Returns:
        格式化后的响应字典
    """
    return {
        "response": response,
        "thread_id": str(thread_id),
        "turn_id": str(turn_id) if turn_id else None,
        "is_new_thread": is_new_thread,
        "thread_title": thread_title,
        "history_count": history_count,
        "timestamp": _get_current_timestamp()
    }


def _get_current_timestamp() -> str:
    """获取当前时间戳"""
    from datetime import datetime
    return datetime.now().isoformat()


# ============ WebSocket 支持（可选） ============

# 如果需要WebSocket支持，可以添加以下代码
"""
from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/conversation/ws")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # 接收用户消息
            data = await websocket.receive_json()
            query = data.get("query", "")
            thread_id = data.get("thread_id")
            
            if not query:
                await websocket.send_json({"error": "查询内容不能为空"})
                continue
            
            # 处理聊天请求（简化版本）
            # 实际实现中应该调用chat_service
            response = f"收到您的消息: {query}"
            
            # 发送回复
            await websocket.send_json({
                "response": response,
                "thread_id": thread_id,
                "timestamp": _get_current_timestamp()
            })
            
    except WebSocketDisconnect:
        logger.info("WebSocket连接断开")
    except Exception as e:
        logger.error(f"WebSocket聊天失败: {e}", exc_info=True)
        try:
            await websocket.send_json({"error": f"聊天处理失败: {str(e)}"})
        except:
            pass
"""