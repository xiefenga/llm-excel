from fastapi import APIRouter

from app.core.config import settings
from app.api.routes import intent, chat_conversation, auth, file, thread, btrack, role, user, llm

api_router = APIRouter()

# 统一入口：意图识别路由（必须放在最前面）
api_router.include_router(intent.router, prefix="/intent", tags=["意图识别"])

# 聊天对话路由
api_router.include_router(chat_conversation.router, prefix="/chat", tags=["聊天对话"])

# 现有路由（保持向后兼容）
from app.api.routes import data_processing
api_router.include_router(data_processing.router, prefix="/data", tags=["数据处理"])

api_router.include_router(auth.router, tags=["认证"])

api_router.include_router(file.router, tags=["文件"])

api_router.include_router(thread.router, tags=["线程"])

api_router.include_router(btrack.router, tags=["错误跟踪"])

api_router.include_router(role.router, tags=["角色"])

api_router.include_router(user.router, tags=["用户"])

api_router.include_router(llm.router, tags=["LLM配置"])

# 只在开发环境启用 fixture 路由
if settings.ENV == "development":
    from app.api.routes import fixture

    api_router.include_router(fixture.router, tags=["测试数据"])

