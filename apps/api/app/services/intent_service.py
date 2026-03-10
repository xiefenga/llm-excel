"""意图识别服务 - 处理意图分类和路由决策"""

import logging
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from app.engine.intent_classifier import IntentClassifier, IntentType
from app.core.database import AsyncSessionLocal
from app.api.deps import get_llm_client

logger = logging.getLogger(__name__)


class IntentService:
    """
    意图识别服务
    
    负责：
    1. 调用意图分类器识别用户意图
    2. 根据意图决定处理路由
    3. 处理需求澄清逻辑
    4. 管理意图识别相关状态
    """
    
    def __init__(self, intent_classifier: IntentClassifier):
        """
        初始化意图服务
        
        Args:
            intent_classifier: 意图分类器实例
        """
        self.intent_classifier = intent_classifier
        
    async def recognize_intent(
        self,
        query: str,
        file_ids: List[str],
        thread_id: Optional[str] = None,
        db_session: Optional[AsyncSessionLocal] = None
    ) -> Dict:
        """
        识别用户意图并返回路由决策

        Args:
            query: 用户查询文本
            file_ids: 文件ID列表
            thread_id: 线程ID（可选，用于多轮对话）
            db_session: 数据库会话（可选）
            
        Returns:
            意图识别结果，包含：
            - intent: 意图类型
            - confidence: 置信度
            - requires_clarification: 是否需要澄清
            - clarification_question: 澄清问题
            - processing_route: 建议的处理路由
            - context: 上下文信息
        """
        try:
            # =======================================================
            # 💡 核心修复：如果当前没有传文件，尝试从历史对话中继承文件
            # =======================================================
            if not file_ids and thread_id and db_session:
                from sqlalchemy import select
                from sqlalchemy.orm import selectinload
                from app.models.thread import ThreadTurn
                from uuid import UUID
                
                try:
                    # 去数据库里找这个会话最近的几轮记录
                    stmt = (
                        select(ThreadTurn)
                        .where(ThreadTurn.thread_id == UUID(thread_id))
                        .order_by(ThreadTurn.turn_number.desc())
                        .options(selectinload(ThreadTurn.files))
                        .limit(5)  # 往回找最近的 5 轮
                    )
                    result = await db_session.execute(stmt)
                    recent_turns = result.scalars().all()
                    
                    # 找到最近一个带有文件的轮次，继承它的文件
                    for turn in recent_turns:
                        if turn.files:
                            file_ids = [str(f.id) for f in turn.files]
                            logger.info(f"🔄 从历史对话(turn={turn.turn_number})中自动继承了 {len(file_ids)} 个文件")
                            break
                except Exception as db_e:
                    logger.warning(f"尝试继承历史文件失败: {db_e}")
            # =======================================================

            # 检查是否有文件 (此时如果继承成功，has_files 就会变成 True!)
            has_files = len(file_ids) > 0
            file_count = len(file_ids)
            
            # 调用分类器
            classification_result = self.intent_classifier.classify(
                query=query,
                has_files=has_files,
                file_count=file_count
            )
            
            # 获取意图类型
            intent = classification_result['intent']
            confidence = classification_result['confidence']
            requires_clarification = classification_result['requires_clarification']
            clarification_question = classification_result['clarification_question']
            
            # 根据意图决定处理路由
            processing_route = self._determine_processing_route(
                intent=intent,
                requires_clarification=requires_clarification,
                has_files=has_files
            )
            
            # 构建上下文信息 - 使用增强的ContextService
            context = await self._build_context(
                intent=intent,
                thread_id=thread_id,
                file_ids=file_ids,
                query=query,  # 添加当前查询参数
                db_session=db_session
            )
            
            # 构建最终结果
            result = {
                "intent": intent,
                "confidence": confidence,
                "requires_clarification": requires_clarification,
                "clarification_question": clarification_question,
                "processing_route": processing_route,
                "context": context,
                "file_ids": file_ids if has_files else [],
                "query": query,
                "reasoning": classification_result.get('reasoning', '')
            }
            
            logger.info(f"意图识别完成: intent={intent}, route={processing_route}, "
                       f"clarification={requires_clarification}")
            
            return result
            
        except Exception as e:
            logger.error(f"意图识别失败: {e}", exc_info=True)
            # 返回错误结果
            return self._get_error_result(query, file_ids, str(e))
    
    def _determine_processing_route(
        self,
        intent: str,
        requires_clarification: bool,
        has_files: bool
    ) -> str:
        """
        根据意图决定处理路由
        
        Returns:
            处理路由路径
        """
        # 如果需要澄清，返回澄清路由
        if requires_clarification:
            return "/api/intent/clarify"
        
        # 根据意图类型返回相应路由
        if intent == IntentType.CHAT.value:
            return "/api/chat/conversation"
        elif intent == IntentType.ANALYSIS.value:
            return "/api/analysis"
        elif intent == IntentType.PROCESSING.value:
            return "/api/data/processing"
        elif intent == IntentType.UNCLEAR.value:
            return "/api/intent/clarify"
        else:
            # 未知意图，默认返回澄清路由
            return "/api/intent/clarify"
    
    async def _build_context(
        self,
        intent: str,
        thread_id: Optional[str],
        file_ids: List[str],
        query: str,
        db_session: Optional[AsyncSessionLocal] = None
    ) -> Dict:
        """
        构建上下文信息
        
        Args:
            intent: 意图类型
            thread_id: 线程ID
            file_ids: 文件ID列表
            query: 当前用户查询
            db_session: 数据库会话
            
        Returns:
            上下文信息字典
        """
        # 如果没有数据库会话，返回简化上下文
        if not db_session:
            return {
                "intent": intent,
                "thread_id": thread_id,
                "file_ids": file_ids,
                "has_files": len(file_ids) > 0,
                "current_query": query,
                "timestamp": self._get_current_timestamp(),
                "note": "简化上下文（无数据库会话）"
            }
        
        try:
            # 导入ContextService（避免循环导入）
            from app.services.context_service import get_context_service
            
            # 获取上下文服务
            context_service = await get_context_service(db_session)
            
            # 如果有线程ID，构建完整上下文
            if thread_id:
                try:
                    from uuid import UUID
                    thread_uuid = UUID(thread_id)
                    
                    # 构建完整上下文
                    context_data = await context_service.build_context(
                        thread_id=thread_uuid,
                        current_turn_id=None,  # 当前还没有创建turn
                        intent_type=intent,
                        current_query=query,
                        file_ids=file_ids,
                        max_history=5
                    )
                    
                    return context_data
                    
                except (ValueError, TypeError) as e:
                    logger.warning(f"线程ID格式错误或构建上下文失败: {e}, thread_id={thread_id}")
                    # 继续使用简化上下文
            
            # 返回简化上下文
            return {
                "intent": intent,
                "thread_id": thread_id,
                "file_ids": file_ids,
                "has_files": len(file_ids) > 0,
                "current_query": query,
                "timestamp": self._get_current_timestamp(),
                "note": "简化上下文（无有效线程ID或构建失败）"
            }
            
        except Exception as e:
            logger.error(f"构建上下文失败: {e}", exc_info=True)
            # 返回错误上下文
            return {
                "intent": intent,
                "thread_id": thread_id,
                "file_ids": file_ids,
                "has_files": len(file_ids) > 0,
                "current_query": query,
                "timestamp": self._get_current_timestamp(),
                "error": str(e),
                "note": "上下文构建失败"
            }
    
    def _get_error_result(self, query: str, file_ids: List[str], error_msg: str) -> Dict:
        """获取错误结果"""
        return {
            "intent": IntentType.UNCLEAR.value,
            "confidence": 0.1,
            "requires_clarification": True,
            "clarification_question": f"系统处理出错: {error_msg}。请重新描述您的需求。",
            "processing_route": "/api/intent/clarify",
            "context": {
                "intent": IntentType.UNCLEAR.value,
                "thread_id": None,
                "file_ids": file_ids,
                "has_files": len(file_ids) > 0,
                "error": error_msg,
                "timestamp": self._get_current_timestamp()
            },
            "file_ids": file_ids,
            "query": query,
            "reasoning": f"意图识别失败: {error_msg}"
        }
    
    def _get_current_timestamp(self) -> str:
        """获取当前时间戳"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    async def handle_clarification_response(
        self,
        original_intent_result: Dict,
        user_response: str,
        thread_id: Optional[str] = None
    ) -> Dict:
        """
        处理用户的澄清响应
        
        Args:
            original_intent_result: 原始的意图识别结果
            user_response: 用户的澄清响应
            thread_id: 线程ID
            
        Returns:
            更新后的意图识别结果
        """
        try:
            # 合并原始query和澄清响应
            original_query = original_intent_result.get('query', '')
            combined_query = f"{original_query} {user_response}".strip()
            
            # 重新识别意图
            file_ids = original_intent_result.get('file_ids', [])
            
            # 这里可以优化：使用原始分类结果作为上下文
            new_result = await self.recognize_intent(
                query=combined_query,
                file_ids=file_ids,
                thread_id=thread_id
            )
            
            # 标记这是澄清后的结果
            new_result['is_clarification_result'] = True
            new_result['original_intent'] = original_intent_result.get('intent')
            
            logger.info(f"澄清响应处理完成: 原始意图={original_intent_result.get('intent')}, "
                       f"新意图={new_result.get('intent')}")
            
            return new_result
            
        except Exception as e:
            logger.error(f"处理澄清响应失败: {e}", exc_info=True)
            # 返回错误结果
            return self._get_error_result(
                query=user_response,
                file_ids=original_intent_result.get('file_ids', []),
                error_msg=f"处理澄清响应失败: {str(e)}"
            )
    
    def should_proceed_to_processing(self, intent_result: Dict) -> bool:
        """
        判断是否应该继续到实际处理
        
        Args:
            intent_result: 意图识别结果
            
        Returns:
            True如果应该继续处理，False如果需要澄清或错误
        """
        # 检查是否需要澄清
        if intent_result.get('requires_clarification', True):
            return False
        
        # 检查置信度是否足够高
        confidence = intent_result.get('confidence', 0)
        if confidence < 0.4:  # 置信度阈值
            return False
        
        # 检查是否有有效的处理路由
        processing_route = intent_result.get('processing_route', '')
        if not processing_route or processing_route == '/api/intent/clarify':
            return False
        
        return True


# 工厂函数和依赖注入
async def get_intent_service(db_session: Optional[AsyncSessionLocal] = None) -> IntentService:
    """
    获取意图服务实例
    
    Args:
        db_session: 数据库会话（可选）
        
    Returns:
        IntentService实例
    """
    try:
        # 获取LLM客户端
        llm_client = await get_llm_client(db_session)
        
        # 创建意图分类器
        from app.engine.intent_classifier import create_intent_classifier
        intent_classifier = create_intent_classifier(llm_client)
        
        # 创建意图服务
        return IntentService(intent_classifier)
        
    except Exception as e:
        logger.error(f"创建意图服务失败: {e}", exc_info=True)
        raise RuntimeError(f"无法创建意图服务: {str(e)}")