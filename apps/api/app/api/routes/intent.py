"""意图识别路由 - 统一入口端点"""

import logging
import asyncio
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_current_user, get_db
from app.core.database import AsyncSessionLocal
from app.core.sse import sse
from app.models.user import User
from app.services.intent_service import get_intent_service
from app.services.chat_service import get_chat_service
from app.engine.intent_classifier import IntentType

import json
from app.engine.step_tracker import StepTracker
from app.persistence import TurnRepository
from app.services.excel import get_files_by_ids_from_db, load_tables_from_files
from app.services.processor_stream import stream_excel_processing, StageContext
from app.processor import EventType
from app.models.btrack import BTrack
from app.processor.prompt import build_initial_user_message
from .data_processing import _init_session

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Request/Response Models ============

class IntentRequest(BaseModel):
    """意图识别请求"""
    
    query: str = Field(..., description="用户查询的自然语言描述")
    file_ids: List[str] = Field(
        default_factory=list,
        description="上传文件返回的 file_id 列表（UUID 字符串），支持多个文件"
    )
    thread_id: Optional[str] = Field(None, description="线程 ID（可选，用于继续会话）")


class IntentResponse(BaseModel):
    """意图识别响应 (保留以供非流式接口使用)"""
    
    intent: str = Field(..., description="意图类型: chat|analysis|processing|unclear")
    confidence: float = Field(..., description="置信度 (0.0-1.0)", ge=0.0, le=1.0)
    requires_clarification: bool = Field(..., description="是否需要澄清")
    clarification_question: Optional[str] = Field(None, description="如果需要澄清的问题")
    processing_route: str = Field(..., description="建议的处理路由")
    context: dict = Field(..., description="上下文信息")
    file_ids: List[str] = Field(..., description="文件ID列表")
    query: str = Field(..., description="用户查询")
    reasoning: Optional[str] = Field(None, description="分类理由")


class ClarificationRequest(BaseModel):
    """澄清响应请求"""
    
    original_intent_result: dict = Field(..., description="原始的意图识别结果")
    user_response: str = Field(..., description="用户的澄清响应")
    thread_id: Optional[str] = Field(None, description="线程 ID")


# ============ Error Codes ============

class ErrorCode:
    """错误码常量"""
    
    INVALID_FILE_IDS = "INVALID_FILE_IDS"
    INTENT_RECOGNITION_FAILED = "INTENT_RECOGNITION_FAILED"
    CLARIFICATION_FAILED = "CLARIFICATION_FAILED"


# ============ API Endpoints ============

@router.post(
    "/process",
    description="统一入口：流式返回聊天、澄清反问或路由到处理模块"
)
async def process_request(
    request: IntentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSessionLocal = Depends(get_db)
):
    """
    统一入口端点 (SSE 流式返回)
    
    接收用户请求，识别意图：
    1. 如果需要澄清或意图为 Chat，则直接通过 `generate` step 返回文字流。
    2. 如果为明确的处理任务，则进入处理流程。
    """
    async def stream():
        try:
            # ==========================================
            # 1. 数据库持久化：保存用户的提问
            # ==========================================
            # TODO: 请根据你的模型取消注释并修改
            # user_msg = ThreadTurn(thread_id=request.thread_id, role="user", content=request.query)
            # db.add(user_msg)
            # await db.commit()

            # 验证并转换 file_ids
            file_ids = []
            if request.file_ids:
                try:
                    file_ids = [str(UUID(fid)) for fid in request.file_ids]
                except ValueError as e:
                    yield sse(
                        {"code": ErrorCode.INVALID_FILE_IDS, "message": f"无效的 file_id 格式: {e}"},
                        event="error"
                    )
                    return

# 获取意图服务并识别
            intent_service = await get_intent_service(db)
            intent_result = await intent_service.recognize_intent(
                query=request.query,
                file_ids=file_ids,
                thread_id=request.thread_id,
                db_session=db
            )

            # 🛑 注意：我把原来的 yield sse(..., event="session") 从这里删掉了！
            # 我们要在下面的分支里，拿到真正的 thread_id 后再发给前端。

            # ==========================================
            # 分支 A：需要澄清 (反问) 或 纯聊天 (Chat)
            # ==========================================
            if intent_result.get("requires_clarification") or intent_result.get("intent") == IntentType.CHAT.value:
                chat_service = await get_chat_service(db)
                
                # 💡 核心修复：如果前端没传 thread_id，我们提前生成真正的 thread_id！
                actual_thread_id = request.thread_id
                if not actual_thread_id:
                    thread, _ = await chat_service._get_or_create_thread(
                        user_id=current_user.id,
                        thread_id=None,
                        initial_query=request.query,
                        db_session=db
                    )
                    actual_thread_id = str(thread.id)

                # 💡 现在把【真实的】 thread_id 发给前端，前端下次请求就会带上它了！
                yield sse({
                    "thread_id": actual_thread_id, 
                    "intent": intent_result.get("intent")
                }, event="session")
                
                reply_text = intent_result.get("clarification_question")
                
                # 1. 如果有反问/澄清文本，走伪装打字机输出
                if reply_text:
                    yield sse({"step": "chat", "status": "running"}, event="message")
                    for char in reply_text:
                        yield sse({"step": "chat", "status": "streaming", "delta": char}, event="message")
                        await asyncio.sleep(0.02)
                    yield sse({"step": "chat", "status": "done", "output": reply_text}, event="message")
                
                # 2. 真正的纯聊天，直接接入 LLM 流式输出
                elif intent_result.get("intent") == IntentType.CHAT.value:
                    yield sse({"step": "chat", "status": "running"}, event="message")
                    full_reply = ""
                    try:
                        # 💡 注意这里：传入的必须是 actual_thread_id
                        async for chunk in chat_service.chat_stream(
                            query=request.query,
                            user_id=current_user.id,
                            thread_id=UUID(actual_thread_id),
                            db_session=db
                        ):
                            full_reply += chunk
                            yield sse({"step": "chat", "status": "streaming", "delta": chunk}, event="message")
                            
                        yield sse({"step": "chat", "status": "done", "output": full_reply}, event="message")
                        
                    except Exception as e:
                        logger.error(f"聊天服务流式调用失败: {e}", exc_info=True)
                        error_msg = "抱歉，目前系统出小差了，请稍后再试。"
                        yield sse({"step": "chat", "status": "done", "output": error_msg}, event="message")
                
                else:
                    yield sse({"step": "chat", "status": "done", "output": "您的需求不够明确，请具体说明。"}, event="message")

                yield sse({"step": "complete", "status": "done"}, event="message")
                return

            # ==========================================
            # 分支 B：明确的数据处理 (Processing)
            # ==========================================
            if intent_result.get("intent") in [IntentType.PROCESSING.value, IntentType.ANALYSIS.value]:
                repo = TurnRepository(db)
                tracker = StepTracker()
                
                intent_context = intent_result.get("context", {})
                
                # 尝试初始化会话 (复用原有的 _init_session)
                session_result = await _init_session(
                    repo, current_user.id, request.query, file_ids, request.thread_id
                )
                
                if session_result.get("error"):
                    yield sse(
                        {"code": session_result["error"]["code"], "message": session_result["error"]["message"]},
                        event="error"
                    )
                    return

                turn_id = UUID(session_result["turn_id"])
                actual_thread_id = str(session_result["thread_id"])

                # 💡 处理分支也一样，拿到初始化后的真实 ID 发给前端
                yield sse({
                    "thread_id": actual_thread_id, 
                    "intent": intent_result.get("intent")
                }, event="session")

                # ====== 以下代码保持你原样不变 ======
                try:
                    if intent_context and "context_type" in intent_context:
                        from app.services.context_service import get_context_service
                        context_service = await get_context_service(db)
                        await context_service.save_context_snapshot(turn_id, intent_context)
                except Exception as e:
                    logger.warning(f"保存上下文快照失败（不影响主流程）: {e}")

                await repo.mark_processing(turn_id, tracker)

                async def on_event(ctx: StageContext):
                    if ctx.event_type == EventType.STAGE_START:
                        tracker.start(ctx.step)
                    elif ctx.event_type == EventType.STAGE_DONE:
                        tracker.done(ctx.step, ctx.output)
                        await repo.save_steps(turn_id, tracker)
                    elif ctx.event_type == EventType.STAGE_ERROR:
                        tracker.error(ctx.step, "STEP_ERROR", ctx.error)
                        await repo.mark_failed(turn_id, tracker)
                        await repo.commit()

                async def load_tables():
                    files = await get_files_by_ids_from_db(db, file_ids, current_user.id)
                    return await asyncio.to_thread(load_tables_from_files, files)

                process_with_errors = False
                process_errors = []

                async def on_failure(errors: List[str]):
                    nonlocal process_errors, process_with_errors
                    process_errors.extend(errors)
                    process_with_errors = True

                file_collection = None

                async def on_load_tables(tables):
                    nonlocal file_collection
                    file_collection = tables

                async for sse_event in stream_excel_processing(
                    load_tables_fn=load_tables,
                    query=request.query,
                    stream_llm=True,
                    export_path_prefix=f"users/{current_user.id}/outputs",
                    on_event=on_event,
                    on_failure=on_failure,
                    on_load_tables=on_load_tables,
                ):
                    yield sse_event

                await repo.mark_completed(turn_id, UUID(actual_thread_id), tracker)
                await repo.commit()

                if process_with_errors and file_collection:
                    db.add(
                        BTrack(
                            reporter_id=current_user.id,
                            steps=tracker.to_list(),
                            errors=json.dumps(process_errors, ensure_ascii=False),
                            thread_turn_id=turn_id,
                            generation_prompt=build_initial_user_message(
                                request.query, 
                                file_collection.get_schemas_with_samples(sample_count=3)
                            )
                        )
                    )
                    await db.commit()

                return

        except Exception as e:
            logger.error(f"处理请求流失败: {e}", exc_info=True)
            yield sse(
                {"message": f"处理失败: {str(e)}"},
                event="error"
            )

    return EventSourceResponse(stream())


@router.post(
    "/process/clarify",
    response_model=IntentResponse,
    description="处理用户的澄清响应(备用非流式接口)"
)
async def clarify_request(
    request: ClarificationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSessionLocal = Depends(get_db)
):
    """
    处理澄清响应 (非流式接口)
    """
    original_result = request.original_intent_result
    if not original_result or 'intent' not in original_result:
        raise HTTPException(
            status_code=400,
            detail="无效的原始意图结果"
        )
    
    try:
        intent_service = await get_intent_service(db)
        updated_result = await intent_service.handle_clarification_response(
            original_intent_result=original_result,
            user_response=request.user_response,
            thread_id=request.thread_id
        )
        return IntentResponse(**updated_result)
    except Exception as e:
        logger.error(f"处理澄清响应失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"处理澄清响应失败: {str(e)}"
        )


@router.get(
    "/process/intents",
    description="获取支持的意图类型列表"
)
async def get_supported_intents():
    """获取系统支持的意图类型列表"""
    
    intents = []
    for intent_type in IntentType:
        intents.append({
            "value": intent_type.value,
            "label": intent_type.name,
            "description": _get_intent_description(intent_type)
        })
    
    return {
        "intents": intents,
        "count": len(intents)
    }
    

# ============ Helper Functions ============

def _get_intent_description(intent_type: IntentType) -> str:
    """获取意图类型描述"""
    descriptions = {
        IntentType.CHAT: "纯文本对话，不涉及文件处理",
        IntentType.ANALYSIS: "数据分析总结，生成洞察报告",
        IntentType.PROCESSING: "数据处理操作，修改或转换数据",
        IntentType.UNCLEAR: "需求不明确，需要进一步澄清"
    }
    return descriptions.get(intent_type, "未知意图类型")

# 其他被抛弃/未使用的 route_to_xxx 方法由于现在已经聚合到流中处理，可以视情况删除以保持代码整洁。