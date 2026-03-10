"""聊天服务 - 处理纯文本对话"""

import logging
from typing import Dict, List, Optional, AsyncGenerator
from uuid import UUID
from datetime import datetime

from app.engine.llm_client import LLMClient
from app.engine.context_builder import ContextBuilder, create_context_builder
from app.core.database import AsyncSessionLocal
from app.api.deps import get_llm_client
from app.persistence.turn_repository import TurnRepository
from app.models.thread import Thread, ThreadTurn

logger = logging.getLogger(__name__)


class ChatService:
    """
    聊天服务
    
    处理纯文本对话，不涉及文件处理。
    支持多轮对话，维护对话历史。
    """
    
    # 聊天系统提示词
    CHAT_SYSTEM_PROMPT = """你是一个友好的AI助手，专门帮助用户解答关于Excel数据处理系统的问题。

## 你的角色
1. 解答关于系统功能的问题
2. 提供使用指导和建议
3. 回答一般性技术问题
4. 保持友好、专业的语气

## 系统功能概述
- Excel文件上传和处理
- 自然语言描述数据处理需求
- 自动生成Excel公式和操作
- 支持数据分析、筛选、排序、计算等功能

## 注意事项
1. 如果用户询问文件处理相关功能，提醒他们需要先上传文件
2. 如果问题超出你的知识范围，如实告知
3. 保持回答简洁明了
4. 使用中文回答，除非用户明确要求其他语言

现在开始与用户对话。"""

    def __init__(self, llm_client: LLMClient, context_builder: Optional[ContextBuilder] = None):
        """
        初始化聊天服务
        
        Args:
            llm_client: LLM客户端
            context_builder: 上下文构建器（可选）
        """
        self.llm_client = llm_client
        self.context_builder = context_builder or create_context_builder()
    
    async def chat(
        self,
        query: str,
        user_id: UUID,
        thread_id: Optional[UUID] = None,
        db_session: Optional[AsyncSessionLocal] = None
    ) -> Dict:
        """
        处理聊天请求
        
        Args:
            query: 用户查询
            user_id: 用户ID
            thread_id: 线程ID（可选，用于继续对话）
            db_session: 数据库会话（可选）
            
        Returns:
            聊天响应
        """
        try:
            # 获取或创建对话线程
            thread, is_new_thread = await self._get_or_create_thread(
                user_id=user_id,
                thread_id=thread_id,
                initial_query=query,
                db_session=db_session
            )
            
            # 获取对话历史
            history = await self._get_conversation_history(
                thread_id=thread.id,
                db_session=db_session
            )
            
            # 构建LLM消息
            messages = self._build_messages(query, history)
            
            # 调用LLM生成回复
            response = await self._generate_response(messages)
            
            # 保存对话记录
            turn = await self._save_conversation_turn(
                thread_id=thread.id,
                query=query,
                response=response,
                db_session=db_session
            )
            
            # 构建返回结果
            result = {
                "response": response,
                "thread_id": str(thread.id),
                "turn_id": str(turn.id) if turn else None,
                "is_new_thread": is_new_thread,
                "thread_title": thread.title,
                "history_count": len(history) + 1  # 包括当前轮次
            }
            
            logger.info(f"聊天处理完成: user={user_id}, thread={thread.id}, "
                       f"query_length={len(query)}, response_length={len(response)}")
            
            return result
            
        except Exception as e:
            logger.error(f"聊天处理失败: {e}", exc_info=True)
            raise RuntimeError(f"聊天处理失败: {str(e)}")
    
    async def chat_stream(
        self,
        query: str,
        user_id: UUID,
        thread_id: Optional[UUID] = None,
        db_session: Optional[AsyncSessionLocal] = None,
        file_ids: List[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        流式聊天（已接入富上下文系统）
        """
        try:
            # 1. 获取或创建对话线程
            thread, is_new_thread = await self._get_or_create_thread(
                user_id=user_id,
                thread_id=thread_id,
                initial_query=query,
                db_session=db_session
            )
            
            # 💡 2. 使用你新增的 ContextService 提取并构建结构化上下文数据
            from app.services.context_service import get_context_service
            context_service = await get_context_service(db_session)
            
            # 这一步会自动去数据库拿历史，并按 chat 意图进行组装
            context_data = await context_service.build_context(
                thread_id=thread.id,
                current_turn_id=None,
                intent_type="chat",
                current_query=query,
                file_ids=[],
                max_history=10
            )
            
            # 💡 3. 使用 ContextBuilder 将字典数据渲染成 LLM 能看懂的 Markdown 文本
            formatted_context = self.context_builder.build_prompt_context(
                intent_type="chat",
                context_data=context_data,
                current_query=query,
                current_files=[]
            )
            
            # 💡 4. 组装终极 System Prompt（基础人设 + 历史记忆）
            enhanced_system_prompt = f"{self.CHAT_SYSTEM_PROMPT}\n\n{formatted_context}\n请基于以上上下文回答用户的问题。"
            
            # 💡 5. 流式生成回复（这次把 enhanced_system_prompt 真正喂给大模型）
            full_response = ""
            async for delta, content in self.llm_client._call_llm_stream_async(
                stage="chat",
                system_prompt=enhanced_system_prompt,
                user_message=query
            ):
                full_response = content
                yield delta
            
            # 6. 保存当前对话轮次
            turn = await self._save_conversation_turn(
                thread_id=thread.id,
                query=query,
                response=full_response,
                db_session=db_session,
                user_id=user_id,     # 👈 传进去
                file_ids=file_ids    # 👈 传进去
            )
            
            # 💡 7. 顺手将这次对话的上下文拍个快照存进数据库，方便以后追溯
            if turn:
                await context_service.save_context_snapshot(turn.id, context_data)
            
            logger.info(f"流式聊天完成: user={user_id}, thread={thread.id}, "
                       f"response_length={len(full_response)}")
            
        except Exception as e:
            logger.error(f"流式聊天失败: {e}", exc_info=True)
            yield f"聊天处理出错: {str(e)}"
    
    async def _get_or_create_thread(
        self,
        user_id: UUID,
        thread_id: Optional[UUID],
        initial_query: str,
        db_session: AsyncSessionLocal
    ) -> tuple[Thread, bool]:
        """
        获取或创建对话线程
        
        Returns:
            (线程对象, 是否是新线程)
        """
        if db_session is None:
            raise ValueError("需要数据库会话")
        
        repo = TurnRepository(db_session)
        
        if thread_id:
            # 获取现有线程
            thread = await repo.get_thread(thread_id, user_id)
            if not thread:
                raise ValueError(f"线程不存在或无权访问: {thread_id}")
            return thread, False
        else:
            # 创建新线程
            # 生成线程标题（使用查询的前几个词）
            title = self._generate_thread_title(initial_query)
            thread = await repo.create_thread(user_id, title)
            return thread, True
    
    async def _get_conversation_history(
        self,
        thread_id: UUID,
        db_session: AsyncSessionLocal,
        max_history: int = 10
    ) -> List[Dict]:
        """
        获取对话历史
        
        Args:
            thread_id: 线程ID
            db_session: 数据库会话
            max_history: 最大历史记录数
            
        Returns:
            对话历史列表
        """
        if db_session is None:
            return []
        
        repo = TurnRepository(db_session)
        
        # 获取最近的对话轮次
        turns = await repo.get_thread_turns(thread_id, limit=max_history)
        
        # 转换为消息格式
        history = []
        for turn in turns:
            history.append({
                "role": "user",
                "content": turn.query,
                "timestamp": turn.created_at.isoformat() if turn.created_at else None
            })
            
            # 如果有回复，添加助手消息
            # 使用新的 response_text 字段
            if turn.response_text:
                history.append({
                    "role": "assistant",
                    "content": turn.response_text,
                    "timestamp": turn.updated_at.isoformat() if turn.updated_at else None
                })
        
        return history
    
    def _build_messages(self, query: str, history: List[Dict]) -> List[Dict]:
        """
        构建LLM消息
        
        Args:
            query: 当前查询
            history: 对话历史
            
        Returns:
            LLM消息列表
        """
        messages = []
        
        # 使用ContextBuilder构建聊天上下文
        try:
            # 将历史转换为ContextBuilder所需的格式
            context_data = {
                "current_query": query,
                "history_turns": [],
                "current_files": [],
                "intent_type": "chat"
            }
            
            # 转换历史记录
            for i, msg in enumerate(history[-10:]):  # 限制历史长度
                if msg["role"] == "user":
                    context_data["history_turns"].append({
                        "query": msg["content"],
                        "response_text": None,
                        "intent_type": "chat",
                        "created_at": msg.get("timestamp")
                    })
                elif msg["role"] == "assistant" and context_data["history_turns"]:
                    # 将回复添加到最后一个用户消息
                    context_data["history_turns"][-1]["response_text"] = msg["content"]
            
            # 构建格式化上下文
            formatted_context = self.context_builder.build_prompt_context(
                intent_type="chat",
                current_query=query,
                history_turns=context_data["history_turns"],
                current_files=context_data["current_files"]
            )
            
            # 构建增强的系统提示
            enhanced_system_prompt = f"""{self.CHAT_SYSTEM_PROMPT}

## 对话上下文
{formatted_context}

请基于以上上下文回答用户的问题。"""
            
            messages.append({
                "role": "system",
                "content": enhanced_system_prompt
            })
            
        except Exception as e:
            logger.warning(f"构建聊天上下文失败，使用默认系统提示: {e}")
            messages.append({
                "role": "system",
                "content": self.CHAT_SYSTEM_PROMPT
            })
        
        # 添加历史消息（最近的优先）
        for msg in reversed(history[-10:]):  # 限制历史长度
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # 添加当前查询
        messages.append({
            "role": "user",
            "content": query
        })
        
        return messages
    
    async def _generate_response(self, messages: List[Dict]) -> str:
        """
        生成回复
        
        Args:
            messages: LLM消息列表
            
        Returns:
            回复文本
        """
        try:
            # 使用LLM客户端生成回复
            # 注意：需要扩展LLM客户端以支持多轮对话
            # 这里使用简化版本
            if len(messages) == 2:  # 只有系统提示和当前查询
                response = self.llm_client.call_llm(
                    "chat",
                    self.CHAT_SYSTEM_PROMPT,
                    messages[-1]["content"]  # 最后一个消息是用户查询
                )
            else:
                # 多轮对话，需要特殊处理
                # 这里简化处理：只使用最后几条消息
                recent_messages = messages[-6:]  # 最后3轮对话
                response = self.llm_client._call_llm(
                    "chat",
                    self.CHAT_SYSTEM_PROMPT,
                    user_message="\n".join([f"{m['role']}: {m['content']}" for m in recent_messages])
                )
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"生成回复失败: {e}", exc_info=True)
            return "抱歉，我暂时无法处理您的请求。请稍后再试或联系管理员。"
    
    async def _save_conversation_turn(
        self,
        thread_id: UUID,
        query: str,
        response: str,
        db_session: AsyncSessionLocal,
        user_id: Optional[UUID] = None,    # 👈 新增
        file_ids: Optional[List[str]] = None  # 👈 新增
    ) -> Optional[ThreadTurn]:
        """保存对话轮次"""
        if db_session is None: return None
        try:
            repo = TurnRepository(db_session)
            turn_number = await repo.get_next_turn_number(thread_id)
            turn = await repo.create_turn(
                thread_id=thread_id, turn_number=turn_number,
                user_query=query, intent_type="chat", response_text=response
            )
            
            # 💡 核心修复 3：如果是带文件的澄清/聊天，把文件关联到轮次上！
            if file_ids and user_id:
                try:
                    from uuid import UUID
                    file_uuids = [UUID(fid) if isinstance(fid, str) else fid for fid in file_ids]
                    await repo.link_files_to_turn(turn.id, file_uuids, user_id)
                except Exception as e:
                    logger.warning(f"聊天轮次关联文件失败: {e}")

            await repo.commit()
            return turn
        except Exception as e:
            logger.error(f"保存对话记录失败: {e}", exc_info=True)
            return None
    
    def _generate_thread_title(self, query: str) -> str:
        """
        生成线程标题
        
        Args:
            query: 初始查询
            
        Returns:
            线程标题
        """
        # 使用查询的前几个词作为标题
        words = query.strip().split()
        if len(words) <= 3:
            title = query[:30]
        else:
            title = " ".join(words[:3]) + "..."
        
        # 确保标题长度合适
        if len(title) > 50:
            title = title[:47] + "..."
        
        return title or "聊天对话"
    
    async def get_conversation_summary(
        self,
        thread_id: UUID,
        user_id: UUID,
        db_session: AsyncSessionLocal
    ) -> Dict:
        """
        获取对话摘要
        
        Args:
            thread_id: 线程ID
            user_id: 用户ID
            db_session: 数据库会话
            
        Returns:
            对话摘要
        """
        if db_session is None:
            return {"error": "需要数据库会话"}
        
        try:
            repo = TurnRepository(db_session)
            
            # 验证线程访问权限
            thread = await repo.get_thread(thread_id, user_id)
            if not thread:
                return {"error": "线程不存在或无权访问"}
            
            # 获取对话统计
            turns = await repo.get_thread_turns(thread_id, limit=50)
            
            # 计算统计信息
            total_turns = len(turns)
            user_messages = sum(1 for turn in turns if turn.query)
            last_active = max((turn.created_at for turn in turns if turn.created_at), default=None)
            
            # 生成摘要
            summary = {
                "thread_id": str(thread_id),
                "thread_title": thread.title,
                "total_turns": total_turns,
                "user_messages": user_messages,
                "created_at": thread.created_at.isoformat() if thread.created_at else None,
                "last_active": last_active.isoformat() if last_active else None,
                "intent_type": "chat"
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"获取对话摘要失败: {e}", exc_info=True)
            return {"error": f"获取对话摘要失败: {str(e)}"}
    
    async def clear_conversation_history(
        self,
        thread_id: UUID,
        user_id: UUID,
        db_session: AsyncSessionLocal
    ) -> bool:
        """
        清空对话历史
        
        Args:
            thread_id: 线程ID
            user_id: 用户ID
            db_session: 数据库会话
            
        Returns:
            是否成功
        """
        if db_session is None:
            return False
        
        try:
            repo = TurnRepository(db_session)
            
            # 验证线程访问权限
            thread = await repo.get_thread(thread_id, user_id)
            if not thread:
                return False
            
            # 删除该线程的所有轮次
            # 注意：这里需要实现删除方法
            # 暂时记录日志
            logger.info(f"请求清空对话历史: thread={thread_id}, user={user_id}")
            
            # 实际实现中应该删除相关记录
            # await repo.delete_thread_turns(thread_id)
            
            return True
            
        except Exception as e:
            logger.error(f"清空对话历史失败: {e}", exc_info=True)
            return False


# 工厂函数
async def get_chat_service(db_session: Optional[AsyncSessionLocal] = None) -> ChatService:
    """
    获取聊天服务实例
    
    Args:
        db_session: 数据库会话（可选）
        
    Returns:
        ChatService实例
    """
    try:
        # 获取LLM客户端
        llm_client = await get_llm_client(db_session)
        
        # 创建ContextBuilder
        context_builder = create_context_builder()
        
        # 创建聊天服务
        return ChatService(llm_client, context_builder)
        
    except Exception as e:
        logger.error(f"创建聊天服务失败: {e}", exc_info=True)
        raise RuntimeError(f"无法创建聊天服务: {str(e)}")