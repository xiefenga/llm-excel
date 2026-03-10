"""上下文管理服务 - 管理多轮对话上下文"""

import json
import logging
from typing import Dict, List, Optional, Any
from uuid import UUID
from datetime import datetime

from app.core.database import AsyncSessionLocal
from app.persistence.turn_repository import TurnRepository
from app.engine.intent_classifier import IntentType

logger = logging.getLogger(__name__)


class ContextService:
    """
    上下文管理服务
    
    负责构建、存储和检索多轮对话上下文。
    """
    
    def __init__(self, db_session: AsyncSessionLocal):
        self.db_session = db_session
        self.repo = TurnRepository(db_session)
    
    async def build_context(
        self,
        intent_type: str,
        thread_id: Optional[UUID],
        file_ids: List[str],
        current_query: str,
        max_history: int = 5
    ) -> Dict[str, Any]:
        """
        构建上下文
        """
        context = {
            "intent_type": intent_type,
            "thread_id": str(thread_id) if thread_id else None,
            "file_ids": file_ids,
            "current_query": current_query,
            "timestamp": datetime.now().isoformat(),
            "has_files": len(file_ids) > 0
        }
        
        if thread_id:
            turns = await self.repo.get_thread_turns(thread_id, limit=max_history)
            history = []
            
            for turn in turns:
                history.append({
                    "query": turn.query,
                    "intent_type": getattr(turn, 'intent_type', 'unknown'),
                    "timestamp": turn.created_at.isoformat() if turn.created_at else None
                })
            
            context["history"] = history
        
        return context
    
    async def save_context(
        self,
        turn_id: UUID,
        context_data: Dict[str, Any]
    ) -> bool:
        """
        保存上下文
        """
        try:
            turn = await self.repo.get_turn(turn_id)
            if not turn:
                return False
            
            full_context = {
                "data": context_data,
                "saved_at": datetime.now().isoformat()
            }
            
            if hasattr(turn, 'context_json'):
                turn.context_json = json.dumps(full_context, ensure_ascii=False)
            
            await self.repo.commit()
            return True
            
        except Exception as e:
            logger.error(f"保存上下文失败: {e}")
            return False
    
    def format_for_llm(self, context: Dict[str, Any], intent_type: str) -> str:
        """
        格式化上下文以供LLM使用
        """
        if intent_type == IntentType.CHAT.value:
            return self._format_chat_context(context)
        elif intent_type == IntentType.PROCESSING.value:
            return self._format_processing_context(context)
        else:
            return self._format_default_context(context)
    
    def _format_chat_context(self, context: Dict[str, Any]) -> str:
        """格式化聊天上下文"""
        formatted = "## 对话上下文\n\n"
        
        history = context.get('history', [])
        if history:
            formatted += "### 历史对话\n\n"
            for item in history[-5:]:
                formatted += f"用户: {item.get('query', '')}\n\n"
        else:
            formatted += "这是新对话。\n\n"
        
        return formatted
    
    def _format_processing_context(self, context: Dict[str, Any]) -> str:
        """格式化数据处理上下文"""
        formatted = "## 数据处理上下文\n\n"
        
        file_ids = context.get('file_ids', [])
        if file_ids:
            formatted += f"### 当前文件\n\n"
            for file_id in file_ids:
                formatted += f"- 文件ID: {file_id}\n"
        
        history = context.get('history', [])
        if history:
            formatted += "\n### 之前的操作\n\n"
            for item in history[-3:]:
                if item.get('intent_type') == IntentType.PROCESSING.value:
                    formatted += f"- {item.get('query', '')}\n"
        
        return formatted
    
    def _format_default_context(self, context: Dict[str, Any]) -> str:
        """格式化默认上下文"""
        return f"## 上下文信息\n\n当前查询: {context.get('current_query', '')}\n"


# 工厂函数
async def get_context_service(db_session: AsyncSessionLocal) -> ContextService:
    """获取上下文服务实例"""
    return ContextService(db_session)
