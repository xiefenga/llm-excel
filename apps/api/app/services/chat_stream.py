"""聊天流式响应 - 从 intent.py 分支 A 提取"""

import asyncio
import logging
from typing import AsyncGenerator, List, Optional
from uuid import UUID

from sse_starlette.sse import ServerSentEvent

from app.core.sse import sse
from app.engine.intent_classifier import IntentType
from app.services.chat_service import get_chat_service

logger = logging.getLogger(__name__)


async def stream_chat_response(
    *,
    query: str,
    user_id: UUID,
    thread_id: Optional[str],
    intent_result: dict,
    db,
    file_ids: List[str],
) -> AsyncGenerator[ServerSentEvent, None]:
    """
    处理聊天/澄清分支的流式响应。

    1. 获取/创建 thread
    2. yield session 事件
    3. 澄清反问 → 伪打字机输出 / 纯聊天 → LLM 流式
    4. yield complete 事件
    """
    chat_service = await get_chat_service(db)

    # 如果前端没传 thread_id，提前生成真正的 thread_id
    actual_thread_id = thread_id
    if not actual_thread_id:
        thread, _ = await chat_service._get_or_create_thread(
            user_id=user_id,
            thread_id=None,
            initial_query=query,
            db_session=db,
        )
        actual_thread_id = str(thread.id)

    # 发送 session 事件（含真实 thread_id）
    yield sse(
        {"thread_id": actual_thread_id, "intent": intent_result.get("intent")},
        event="session",
    )

    reply_text = intent_result.get("clarification_question")

    # 1. 如果有反问/澄清文本，走伪装打字机输出
    if reply_text:
        yield sse({"step": "chat", "status": "running"}, event="message")
        for char in reply_text:
            yield sse(
                {"step": "chat", "status": "streaming", "delta": char},
                event="message",
            )
            await asyncio.sleep(0.02)
        yield sse(
            {"step": "chat", "status": "done", "output": reply_text},
            event="message",
        )

    # 2. 真正的纯聊天，直接接入 LLM 流式输出
    elif intent_result.get("intent") == IntentType.CHAT.value:
        yield sse({"step": "chat", "status": "running"}, event="message")
        full_reply = ""
        try:
            async for chunk in chat_service.chat_stream(
                query=query,
                user_id=user_id,
                thread_id=UUID(actual_thread_id),
                db_session=db,
                file_ids=file_ids,
            ):
                full_reply += chunk
                yield sse(
                    {"step": "chat", "status": "streaming", "delta": chunk},
                    event="message",
                )

            yield sse(
                {"step": "chat", "status": "done", "output": full_reply},
                event="message",
            )

        except Exception as e:
            logger.error(f"聊天服务流式调用失败: {e}", exc_info=True)
            error_msg = "抱歉，目前系统出小差了，请稍后再试。"
            yield sse(
                {"step": "chat", "status": "done", "output": error_msg},
                event="message",
            )

    else:
        yield sse(
            {"step": "chat", "status": "done", "output": "您的需求不够明确，请具体说明。"},
            event="message",
        )

    yield sse({"step": "complete", "status": "done"}, event="message")
