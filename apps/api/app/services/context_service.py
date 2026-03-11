"""上下文管理服务 - 管理多轮对话上下文"""

import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.persistence.turn_repository import TurnRepository
from app.engine.intent_classifier import IntentType
from app.models.thread import ThreadTurn, Thread
from app.models.file import File

logger = logging.getLogger(__name__)


class ContextService:
    """
    上下文管理服务
    
    负责构建、存储和检索多轮对话上下文。
    根据意图类型构建特定上下文，支持对话链和上下文快照。
    """
    
    def __init__(self, db_session: AsyncSessionLocal):
        self.db_session = db_session
        self.repo = TurnRepository(db_session)
    
    async def build_context(
        self,
        thread_id: UUID,
        current_turn_id: Optional[UUID],
        intent_type: str,
        current_query: str,
        file_ids: List[str],
        max_history: int = 5
    ) -> Dict[str, Any]:
        """
        构建上下文
        
        Args:
            thread_id: 线程ID
            current_turn_id: 当前轮次ID（可选）
            intent_type: 意图类型
            current_query: 当前用户查询
            file_ids: 文件ID列表
            max_history: 最大历史轮次数
            
        Returns:
            上下文字典
        """
        try:
            # 获取历史轮次
            history_turns = await self._get_history_turns(
                thread_id, current_turn_id, max_history
            )
            
            # 根据意图类型构建特定上下文
            if intent_type == IntentType.CHAT.value:
                context_data = await self._build_chat_context(
                    history_turns, current_query, file_ids
                )
            elif intent_type == IntentType.ANALYSIS.value:
                context_data = await self._build_analysis_context(
                    history_turns, current_query, file_ids
                )
            elif intent_type == IntentType.PROCESSING.value:
                context_data = await self._build_processing_context(
                    history_turns, current_query, file_ids
                )
            else:
                context_data = await self._build_default_context(
                    history_turns, current_query, file_ids
                )
            
            # 添加上下文元数据
            context_data.update({
                "intent_type": intent_type,
                "thread_id": str(thread_id),
                "current_turn_id": str(current_turn_id) if current_turn_id else None,
                "current_query": current_query,
                "file_ids": file_ids,
                "has_files": len(file_ids) > 0,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "history_count": len(history_turns)
            })
            
            logger.info(f"构建上下文成功: thread_id={thread_id}, intent={intent_type}, "
                       f"history_count={len(history_turns)}")
            
            return context_data
            
        except Exception as e:
            logger.error(f"构建上下文失败: {e}", exc_info=True)
            # 返回简化上下文
            return self._build_fallback_context(intent_type, current_query, file_ids)
    
    async def _get_history_turns(
        self,
        thread_id: UUID,
        current_turn_id: Optional[UUID],
        max_history: int
    ) -> List[ThreadTurn]:
        """
        获取历史轮次
        
        获取指定线程中最近的历史轮次，排除当前轮次（如果提供）。
        按轮次号降序排列，获取最近的轮次。
        """
        try:
            # 构建查询：获取指定线程的轮次，按轮次号降序排列
            stmt = (
                select(ThreadTurn)
                .where(ThreadTurn.thread_id == thread_id)
                .order_by(desc(ThreadTurn.turn_number))
                .limit(max_history + 1)  # 多取一个，用于排除当前轮次
                .options(selectinload(ThreadTurn.files))
            )
            
            result = await self.db_session.execute(stmt)
            all_turns = result.scalars().all()
            
            # 排除当前轮次（如果提供）
            if current_turn_id:
                history_turns = [turn for turn in all_turns if turn.id != current_turn_id]
            else:
                history_turns = all_turns
            
            # 限制数量并反转顺序（从旧到新）
            history_turns = history_turns[:max_history]
            history_turns.reverse()  # 从旧到新
            
            return history_turns
            
        except Exception as e:
            logger.error(f"获取历史轮次失败: {e}", exc_info=True)
            return []
    
    def _turn_to_dict(self, turn: ThreadTurn) -> Dict[str, Any]:
        """
        轮次对象转字典
        
        提取轮次的关键信息，用于上下文构建。
        """
        turn_dict = {
            "id": str(turn.id),
            "turn_number": turn.turn_number,
            "user_query": turn.user_query,
            "intent_type": turn.intent_type,
            "response_text": turn.response_text,
            "status": turn.status,
            "created_at": turn.created_at.isoformat() if turn.created_at else None,
            "completed_at": turn.completed_at.isoformat() if turn.completed_at else None,
            "parent_turn_id": str(turn.parent_turn_id) if turn.parent_turn_id else None,
            "has_context_snapshot": turn.context_snapshot is not None,
            "file_count": len(turn.files) if turn.files else 0,
        }
        
        # 提取步骤摘要
        if turn.steps:
            turn_dict["steps_summary"] = self._extract_steps_summary(turn.steps)
        
        # 提取文件信息
        if turn.files:
            turn_dict["files"] = [
                {
                    "id": str(file.id),
                    "name": file.filename,
                    "size": file.file_size,
                    "type": file.mime_type
                }
                for file in turn.files
            ]
        
        return turn_dict
    
    def _extract_steps_summary(self, steps: List[Dict]) -> Dict[str, Any]:
        """
        从steps字段提取关键信息
        
        分析步骤历史，提取关键操作和结果。
        """
        if not steps:
            return {}
        
        summary = {
            "total_steps": len(steps),
            "completed_steps": 0,
            "failed_steps": 0,
            "step_types": [],
            "last_operation": None,
            "key_results": []
        }
        
        for step in steps:
            step_name = step.get("step", "")
            step_status = step.get("status", "")
            
            # 统计状态
            if step_status == "done":
                summary["completed_steps"] += 1
            elif step_status in ["error", "failed"]:
                summary["failed_steps"] += 1
            
            # 收集步骤类型
            if step_name and step_name not in summary["step_types"]:
                summary["step_types"].append(step_name)
            
            # 提取关键结果
            output = step.get("output", {})
            if output and isinstance(output, dict):
                # 尝试提取关键信息
                if "result" in output:
                    summary["key_results"].append({
                        "step": step_name,
                        "result": output["result"][:100] if isinstance(output["result"], str) else str(output["result"])
                    })
                elif "data" in output:
                    summary["key_results"].append({
                        "step": step_name,
                        "has_data": True
                    })
        
        # 记录最后一个操作
        if steps:
            last_step = steps[-1]
            summary["last_operation"] = {
                "step": last_step.get("step", ""),
                "status": last_step.get("status", ""),
                "timestamp": last_step.get("completed_at", "")
            }
        
        return summary
    
    async def _build_chat_context(
        self,
        history_turns: List[ThreadTurn],
        current_query: str,
        file_ids: List[str]
    ) -> Dict[str, Any]:
        """
        构建聊天上下文
        
        专注于对话历史、话题延续和情感分析。
        """
        context = {
            "context_type": "chat",
            "conversation_history": [],
            "topic_continuity": True,
            "requires_topic_analysis": len(history_turns) > 0
        }
        
        # 构建对话历史
        for turn in history_turns:
            turn_dict = self._turn_to_dict(turn)
            if turn.intent_type == IntentType.CHAT.value:
                context["conversation_history"].append({
                    "role": "user",
                    "content": turn.user_query,
                    "timestamp": turn.created_at.isoformat() if turn.created_at else None
                })
                if turn.response_text:
                    context["conversation_history"].append({
                        "role": "assistant",
                        "content": turn.response_text,
                        "timestamp": turn.completed_at.isoformat() if turn.completed_at else None
                    })
        
        # 分析话题连续性（简单实现）
        if len(context["conversation_history"]) >= 2:
            last_user_msg = context["conversation_history"][-2]["content"] if len(context["conversation_history"]) >= 2 else ""
            context["topic_continuity"] = self._analyze_topic_continuity(last_user_msg, current_query)
        
        return context
    
    async def _build_analysis_context(
        self,
        history_turns: List[ThreadTurn],
        current_query: str,
        file_ids: List[str]
    ) -> Dict[str, Any]:
        """
        构建分析上下文
        
        专注于分析结果、数据洞察和历史分析记录。
        """
        context = {
            "context_type": "analysis",
            "previous_analyses": [],
            "data_insights": [],
            "file_analysis_history": []
        }
        
        # 提取历史分析记录
        for turn in history_turns:
            if turn.intent_type == IntentType.ANALYSIS.value:
                analysis_record = self._turn_to_dict(turn)
                
                # 从steps中提取分析结果
                if turn.steps:
                    for step in turn.steps:
                        if step.get("step") == "analyze" and step.get("output"):
                            output = step.get("output", {})
                            if isinstance(output, dict) and "insights" in output:
                                analysis_record["insights"] = output["insights"]
                
                context["previous_analyses"].append(analysis_record)
                
                # 记录文件分析历史
                if turn.files:
                    for file in turn.files:
                        context["file_analysis_history"].append({
                            "file_id": str(file.id),
                            "file_name": file.filename,
                            "analysis_turn": turn.turn_number,
                            "analysis_time": turn.completed_at.isoformat() if turn.completed_at else None
                        })
        
        # 提取数据洞察
        for turn in history_turns:
            if turn.steps:
                steps_summary = self._extract_steps_summary(turn.steps)
                if steps_summary.get("key_results"):
                    context["data_insights"].extend(steps_summary["key_results"])
        
        # 去重
        if context["data_insights"]:
            seen = set()
            unique_insights = []
            for insight in context["data_insights"]:
                key = json.dumps(insight, sort_keys=True)
                if key not in seen:
                    seen.add(key)
                    unique_insights.append(insight)
            context["data_insights"] = unique_insights
        
        return context
    
    async def _build_processing_context(
        self,
        history_turns: List[ThreadTurn],
        current_query: str,
        file_ids: List[str]
    ) -> Dict[str, Any]:
        """
        构建处理上下文
        
        专注于操作历史、数据状态、可用文件和文件依赖。
        """
        context = {
            "context_type": "processing",
            "operation_history": [],
            "data_state": "unknown",
            "available_files": [],
            "file_dependencies": []
        }
        
        # 提取操作历史
        for turn in history_turns:
            if turn.intent_type == IntentType.PROCESSING.value:
                operation_record = self._turn_to_dict(turn)
                
                # 从steps中提取操作详情
                if turn.steps:
                    operations = []
                    for step in turn.steps:
                        if step.get("step") in ["execute", "generate", "validate"]:
                            operations.append({
                                "step": step.get("step"),
                                "operation": step.get("output", {}).get("operation", ""),
                                "status": step.get("status")
                            })
                    operation_record["operations"] = operations
                
                context["operation_history"].append(operation_record)
        
        # 分析数据状态
        if context["operation_history"]:
            last_operation = context["operation_history"][-1]
            if last_operation.get("status") == "completed":
                context["data_state"] = "processed"
            elif last_operation.get("status") == "failed":
                context["data_state"] = "error"
            else:
                context["data_state"] = "in_progress"
        
        # 收集可用文件信息
        for turn in history_turns:
            if turn.files:
                for file in turn.files:
                    file_info = {
                        "id": str(file.id),
                        "name": file.filename,
                        "type": file.mime_type,
                        "size": file.file_size,
                        "source_turn": turn.turn_number,
                        "is_output": self._is_output_file(turn, file.id)
                    }
                    if file_info not in context["available_files"]:
                        context["available_files"].append(file_info)
        
        # 分析文件依赖
        for turn in history_turns:
            if turn.parent_turn_id and turn.files:
                # 这个轮次可能依赖于父轮次的文件
                for file in turn.files:
                    context["file_dependencies"].append({
                        "file_id": str(file.id),
                        "depends_on_turn": str(turn.parent_turn_id),
                        "dependency_type": "input"
                    })
        
        return context
    
    async def _build_default_context(
        self,
        history_turns: List[ThreadTurn],
        current_query: str,
        file_ids: List[str]
    ) -> Dict[str, Any]:
        """
        构建默认上下文
        """
        return {
            "context_type": "default",
            "history_summary": {
                "total_turns": len(history_turns),
                "recent_intents": [turn.intent_type for turn in history_turns[-3:] if turn.intent_type],
                "last_turn_time": history_turns[-1].created_at.isoformat() if history_turns else None
            }
        }
    
    def _build_fallback_context(
        self,
        intent_type: str,
        current_query: str,
        file_ids: List[str]
    ) -> Dict[str, Any]:
        """
        构建降级上下文（当主要构建失败时使用）
        """
        return {
            "context_type": "fallback",
            "intent_type": intent_type,
            "current_query": current_query,
            "file_ids": file_ids,
            "has_files": len(file_ids) > 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "简化上下文，完整上下文构建失败"
        }
    
    def _analyze_topic_continuity(self, previous_query: str, current_query: str) -> bool:
        """
        分析话题连续性
        
        简单实现：检查是否有共同的关键词
        """
        if not previous_query or not current_query:
            return True
        
        # 提取关键词（简单实现）
        prev_words = set(previous_query.lower().split())
        curr_words = set(current_query.lower().split())
        
        # 检查是否有共同的关键词
        common_words = prev_words.intersection(curr_words)
        
        # 排除常见停用词
        stop_words = {"的", "了", "在", "是", "我", "你", "他", "她", "它", "这", "那", "和", "与", "或"}
        meaningful_common = common_words - stop_words
        
        return len(meaningful_common) > 0
    
    def _is_output_file(self, turn: ThreadTurn, file_id: UUID) -> bool:
        """
        判断文件是否为输出文件
        
        简单实现：检查steps中是否有生成文件的记录
        """
        if not turn.steps:
            return False
        
        for step in turn.steps:
            if step.get("step") == "generate" and step.get("status") == "done":
                output = step.get("output", {})
                if isinstance(output, dict) and "generated_files" in output:
                    generated_files = output["generated_files"]
                    if isinstance(generated_files, list):
                        for gen_file in generated_files:
                            if isinstance(gen_file, dict) and gen_file.get("id") == str(file_id):
                                return True
        
        return False
    
    async def save_context_snapshot(
        self,
        turn_id: UUID,
        context_data: Dict[str, Any]
    ) -> bool:
        """
        保存上下文快照到数据库
        
        Args:
            turn_id: 轮次ID
            context_data: 上下文数据
            
        Returns:
            是否保存成功
        """
        try:
            stmt = select(ThreadTurn).where(ThreadTurn.id == turn_id)
            result = await self.db_session.execute(stmt)
            turn = result.scalar_one_or_none()
            
            if not turn:
                logger.error(f"保存上下文快照失败: 找不到轮次 {turn_id}")
                return False
            
            # 添加快照元数据
            snapshot = {
                "data": context_data,
                "saved_at": datetime.now(timezone.utc).isoformat(),
                "version": "1.0"
            }
            
            # 保存到数据库
            turn.context_snapshot = snapshot
            await self.db_session.commit()
            
            logger.info(f"保存上下文快照成功: turn_id={turn_id}")
            return True
            
        except Exception as e:
            logger.error(f"保存上下文快照失败: {e}", exc_info=True)
            await self.db_session.rollback()
            return False
    
    async def get_context_snapshot(self, turn_id: UUID) -> Optional[Dict[str, Any]]:
        """
        获取上下文快照
        
        Args:
            turn_id: 轮次ID
            
        Returns:
            上下文快照数据，如果不存在则返回None
        """
        try:
            stmt = select(ThreadTurn).where(ThreadTurn.id == turn_id)
            result = await self.db_session.execute(stmt)
            turn = result.scalar_one_or_none()
            
            if not turn or not turn.context_snapshot:
                return None
            
            return turn.context_snapshot
            
        except Exception as e:
            logger.error(f"获取上下文快照失败: {e}", exc_info=True)
            return None
    
    async def link_to_parent_turn(
        self,
        child_turn_id: UUID,
        parent_turn_id: UUID
    ) -> bool:
        """
        将子轮次链接到父轮次
        
        Args:
            child_turn_id: 子轮次ID
            parent_turn_id: 父轮次ID
            
        Returns:
            是否链接成功
        """
        try:
            stmt = select(ThreadTurn).where(ThreadTurn.id == child_turn_id)
            result = await self.db_session.execute(stmt)
            child_turn = result.scalar_one_or_none()
            
            if not child_turn:
                logger.error(f"链接父轮次失败: 找不到子轮次 {child_turn_id}")
                return False
            
            # 验证父轮次存在
            parent_stmt = select(ThreadTurn).where(ThreadTurn.id == parent_turn_id)
            parent_result = await self.db_session.execute(parent_stmt)
            parent_turn = parent_result.scalar_one_or_none()
            
            if not parent_turn:
                logger.error(f"链接父轮次失败: 找不到父轮次 {parent_turn_id}")
                return False
            
            # 设置父轮次ID
            child_turn.parent_turn_id = parent_turn_id
            await self.db_session.commit()
            
            logger.info(f"链接父轮次成功: child={child_turn_id}, parent={parent_turn_id}")
            return True
            
        except Exception as e:
            logger.error(f"链接父轮次失败: {e}", exc_info=True)
            await self.db_session.rollback()
            return False


# 工厂函数
async def get_context_service(db_session: AsyncSessionLocal) -> ContextService:
    """获取上下文服务实例"""
    return ContextService(db_session)
