"""上下文构建器 - 为LLM提示词格式化上下文

负责将上下文数据格式化为适合LLM处理的文本格式。
根据意图类型使用不同的模板和格式化策略。
"""

import logging
from typing import Dict, List, Optional, Any
from uuid import UUID

from app.engine.intent_classifier import IntentType

logger = logging.getLogger(__name__)


class ContextBuilder:
    """
    上下文构建器
    
    职责：为LLM提示词格式化上下文，根据意图类型使用特定模板。
    
    关键方法：
        build_prompt_context(): 构建完整的提示词上下文
        _build_chat_context(): 聊天上下文模板
        _build_analysis_context(): 分析上下文模板
        _build_processing_context(): 处理上下文模板
    """
    
    def __init__(self, max_history_turns: int = 5, max_tokens: int = 2000):
        """
        初始化上下文构建器
        
        Args:
            max_history_turns: 最大历史轮次数
            max_tokens: 最大令牌数（用于长度控制）
        """
        self.max_history_turns = max_history_turns
        self.max_tokens = max_tokens
    
    def build_prompt_context(
        self,
        intent_type: str,
        context_data: Dict[str, Any],
        current_query: str,
        current_files: List[Dict[str, Any]]
    ) -> str:
        """
        构建提示词上下文
        
        Args:
            intent_type: 意图类型
            context_data: 上下文数据（来自ContextService）
            current_query: 当前用户查询
            current_files: 当前文件列表
            
        Returns:
            格式化后的上下文文本
        """
        try:
            # 根据意图类型选择构建方法
            if intent_type == IntentType.CHAT.value:
                return self._build_chat_prompt_context(
                    context_data, current_query, current_files
                )
            elif intent_type == IntentType.ANALYSIS.value:
                return self._build_analysis_prompt_context(
                    context_data, current_query, current_files
                )
            elif intent_type == IntentType.PROCESSING.value:
                return self._build_processing_prompt_context(
                    context_data, current_query, current_files
                )
            else:
                return self._build_default_prompt_context(
                    context_data, current_query, current_files
                )
                
        except Exception as e:
            logger.error(f"构建提示词上下文失败: {e}", exc_info=True)
            return self._build_fallback_context(current_query, current_files)
    
    def _build_chat_prompt_context(
        self,
        context_data: Dict[str, Any],
        current_query: str,
        current_files: List[Dict[str, Any]]
    ) -> str:
        """
        构建聊天提示词上下文
        
        模板：对话历史、话题延续、情感分析
        """
        formatted = "## 对话上下文\n\n"
        
        # 添加对话历史
        conversation_history = context_data.get("conversation_history", [])
        if conversation_history:
            formatted += "### 历史对话记录\n\n"
            
            # 限制历史记录数量
            recent_history = conversation_history[-self.max_history_turns*2:]  # 每轮有用户和助手两条消息
            
            for msg in recent_history:
                role = "用户" if msg.get("role") == "user" else "助手"
                content = msg.get("content", "")
                timestamp = msg.get("timestamp", "")
                
                time_str = f" ({timestamp})" if timestamp else ""
                formatted += f"{role}{time_str}: {content}\n\n"
            
            formatted += f"共 {len(conversation_history)//2} 轮对话，显示最近 {len(recent_history)//2} 轮。\n\n"
        else:
            formatted += "这是新对话，没有历史记录。\n\n"
        
        # 添加话题连续性分析
        topic_continuity = context_data.get("topic_continuity", True)
        if not topic_continuity and conversation_history:
            formatted += "### 话题分析\n"
            formatted += "检测到话题可能已切换，请根据当前查询提供相关回应。\n\n"
        
        # 添加上下文元数据
        history_count = context_data.get("history_count", 0)
        if history_count > 0:
            formatted += f"### 上下文摘要\n"
            formatted += f"- 对话线程: {history_count} 个历史轮次\n"
            formatted += f"- 当前意图: 聊天对话\n"
        
        # 添加当前查询
        formatted += f"\n### 当前查询\n{current_query}\n"
        
        return self._truncate_to_token_limit(formatted)
    
    def _build_analysis_prompt_context(
        self,
        context_data: Dict[str, Any],
        current_query: str,
        current_files: List[Dict[str, Any]]
    ) -> str:
        """
        构建分析提示词上下文
        
        模板：文件信息、历史分析记录、数据洞察
        """
        formatted = "## 数据分析上下文\n\n"
        
        # 添加当前文件信息
        if current_files:
            formatted += "### 当前分析文件\n\n"
            for file in current_files:
                file_id = file.get("id", "未知")
                file_name = file.get("name", "未命名")
                file_type = file.get("type", "未知")
                file_size = file.get("size", 0)
                
                size_str = f"{file_size/1024:.1f}KB" if file_size < 1024*1024 else f"{file_size/(1024*1024):.1f}MB"
                formatted += f"- 文件: {file_name} ({file_type}, {size_str})\n"
            formatted += "\n"
        
        # 添加历史分析记录
        previous_analyses = context_data.get("previous_analyses", [])
        if previous_analyses:
            formatted += "### 历史分析记录\n\n"
            
            # 限制显示数量
            recent_analyses = previous_analyses[-min(3, len(previous_analyses)):]
            
            for i, analysis in enumerate(recent_analyses, 1):
                turn_number = analysis.get("turn_number", "未知")
                user_query = analysis.get("user_query", "")[:100]
                created_at = analysis.get("created_at", "")
                
                formatted += f"{i}. 第 {turn_number} 轮分析:\n"
                formatted += f"   查询: {user_query}...\n"
                
                # 添加分析洞察（如果有）
                insights = analysis.get("insights")
                if insights:
                    if isinstance(insights, list):
                        formatted += f"   关键洞察: {len(insights)} 条\n"
                    elif isinstance(insights, dict):
                        formatted += f"   分析结果: 包含 {len(insights)} 个维度\n"
                
                formatted += f"   时间: {created_at[:19] if created_at else '未知'}\n\n"
            
            if len(previous_analyses) > len(recent_analyses):
                formatted += f"（还有 {len(previous_analyses) - len(recent_analyses)} 条更早的分析记录）\n\n"
        
        # 添加数据洞察
        data_insights = context_data.get("data_insights", [])
        if data_insights:
            formatted += "### 历史数据洞察\n\n"
            
            # 限制显示数量
            recent_insights = data_insights[-min(5, len(data_insights)):]
            
            for i, insight in enumerate(recent_insights, 1):
                step = insight.get("step", "未知步骤")
                result = insight.get("result", "")
                has_data = insight.get("has_data", False)
                
                if result:
                    result_preview = result[:80] + "..." if len(result) > 80 else result
                    formatted += f"{i}. {step}: {result_preview}\n"
                elif has_data:
                    formatted += f"{i}. {step}: 已生成数据结果\n"
            
            if len(data_insights) > len(recent_insights):
                formatted += f"（还有 {len(data_insights) - len(recent_insights)} 条更早的洞察）\n\n"
        
        # 添加文件分析历史
        file_analysis_history = context_data.get("file_analysis_history", [])
        if file_analysis_history and current_files:
            # 找出当前文件的历史分析记录
            current_file_ids = {file.get("id") for file in current_files}
            relevant_history = [
                h for h in file_analysis_history 
                if h.get("file_id") in current_file_ids
            ]
            
            if relevant_history:
                formatted += "### 当前文件分析历史\n\n"
                for history in relevant_history[:3]:  # 最多显示3条
                    file_name = history.get("file_name", "未知文件")
                    analysis_turn = history.get("analysis_turn", "未知")
                    analysis_time = history.get("analysis_time", "")
                    
                    time_str = analysis_time[:19] if analysis_time else "未知时间"
                    formatted += f"- {file_name}: 第 {analysis_turn} 轮分析 ({time_str})\n"
                formatted += "\n"
        
        # 添加上下文元数据
        formatted += f"### 分析上下文摘要\n"
        formatted += f"- 历史分析次数: {len(previous_analyses)}\n"
        formatted += f"- 数据洞察数量: {len(data_insights)}\n"
        formatted += f"- 当前分析文件数: {len(current_files)}\n\n"
        
        # 添加当前查询
        formatted += f"### 当前分析请求\n{current_query}\n"
        
        return self._truncate_to_token_limit(formatted)
    
    def _build_processing_prompt_context(
        self,
        context_data: Dict[str, Any],
        current_query: str,
        current_files: List[Dict[str, Any]]
    ) -> str:
        """
        构建处理提示词上下文
        
        模板：输入文件、数据状态、可用输出文件、操作历史
        """
        formatted = "## 数据处理上下文\n\n"
        
        # 添加当前文件信息
        if current_files:
            formatted += "### 输入文件\n\n"
            for file in current_files:
                file_id = file.get("id", "未知")
                file_name = file.get("name", "未命名")
                file_type = file.get("type", "未知")
                file_size = file.get("size", 0)
                
                size_str = f"{file_size/1024:.1f}KB" if file_size < 1024*1024 else f"{file_size/(1024*1024):.1f}MB"
                formatted += f"- {file_name} ({file_type}, {size_str})\n"
            formatted += "\n"
        
        # 添加数据状态
        data_state = context_data.get("data_state", "unknown")
        data_state_map = {
            "processed": "已处理",
            "error": "存在错误",
            "in_progress": "处理中",
            "unknown": "未知状态"
        }
        formatted += f"### 数据状态\n{data_state_map.get(data_state, data_state)}\n\n"
        
        # 添加操作历史
        operation_history = context_data.get("operation_history", [])
        if operation_history:
            formatted += "### 最近操作记录\n\n"
            
            # 限制显示数量
            recent_operations = operation_history[-min(3, len(operation_history)):]
            
            for i, operation in enumerate(recent_operations, 1):
                turn_number = operation.get("turn_number", "未知")
                user_query = operation.get("user_query", "")[:80]
                status = operation.get("status", "未知")
                operations_list = operation.get("operations", [])
                
                status_map = {
                    "completed": "完成",
                    "failed": "失败",
                    "processing": "处理中",
                    "pending": "等待中"
                }
                status_str = status_map.get(status, status)
                
                formatted += f"{i}. 第 {turn_number} 轮操作 ({status_str}):\n"
                formatted += f"   请求: {user_query}...\n"
                
                # 显示操作详情
                if operations_list:
                    formatted += f"   执行步骤: "
                    step_names = [op.get("step", "") for op in operations_list if op.get("step")]
                    formatted += ", ".join(step_names) + "\n"
                
                formatted += "\n"
            
            if len(operation_history) > len(recent_operations):
                formatted += f"（还有 {len(operation_history) - len(recent_operations)} 条更早的操作记录）\n\n"
        
        # 添加可用文件
        available_files = context_data.get("available_files", [])
        if available_files:
            # 区分输入文件和输出文件
            input_files = [f for f in available_files if not f.get("is_output", False)]
            output_files = [f for f in available_files if f.get("is_output", False)]
            
            if output_files:
                formatted += "### 可用输出文件\n\n"
                for file in output_files[:5]:  # 最多显示5个输出文件
                    file_name = file.get("name", "未命名")
                    source_turn = file.get("source_turn", "未知")
                    file_type = file.get("type", "未知")
                    
                    formatted += f"- {file_name} ({file_type}, 来自第 {source_turn} 轮)\n"
                formatted += "\n"
            
            if input_files and len(input_files) > len(current_files):
                formatted += "### 其他可用输入文件\n\n"
                # 排除当前已选择的文件
                current_file_ids = {file.get("id") for file in current_files}
                other_input_files = [f for f in input_files if f.get("id") not in current_file_ids]
                
                for file in other_input_files[:3]:  # 最多显示3个
                    file_name = file.get("name", "未命名")
                    source_turn = file.get("source_turn", "未知")
                    
                    formatted += f"- {file_name} (来自第 {source_turn} 轮)\n"
                formatted += "\n"
        
        # 添加文件依赖
        file_dependencies = context_data.get("file_dependencies", [])
        if file_dependencies:
            formatted += "### 文件依赖关系\n\n"
            for dep in file_dependencies[:3]:  # 最多显示3个依赖
                file_id = dep.get("file_id", "未知")
                depends_on_turn = dep.get("depends_on_turn", "未知")
                dependency_type = dep.get("dependency_type", "未知")
                
                formatted += f"- 文件 {file_id[:8]}... 依赖于第 {depends_on_turn[:8]}... 轮 ({dependency_type})\n"
            formatted += "\n"
        
        # 添加上下文元数据
        formatted += f"### 处理上下文摘要\n"
        formatted += f"- 操作历史记录: {len(operation_history)} 条\n"
        formatted += f"- 可用文件总数: {len(available_files)} 个\n"
        formatted += f"- 文件依赖关系: {len(file_dependencies)} 个\n\n"
        
        # 添加当前查询
        formatted += f"### 当前处理请求\n{current_query}\n"
        
        return self._truncate_to_token_limit(formatted)
    
    def _build_default_prompt_context(
        self,
        context_data: Dict[str, Any],
        current_query: str,
        current_files: List[Dict[str, Any]]
    ) -> str:
        """
        构建默认提示词上下文
        """
        formatted = "## 上下文信息\n\n"
        
        # 添加上下文摘要
        history_summary = context_data.get("history_summary", {})
        if history_summary:
            total_turns = history_summary.get("total_turns", 0)
            recent_intents = history_summary.get("recent_intents", [])
            last_turn_time = history_summary.get("last_turn_time")
            
            formatted += f"### 对话历史摘要\n"
            formatted += f"- 总轮次数: {total_turns}\n"
            if recent_intents:
                formatted += f"- 最近意图: {', '.join(recent_intents)}\n"
            if last_turn_time:
                formatted += f"- 最后轮次时间: {last_turn_time[:19]}\n"
            formatted += "\n"
        
        # 添加当前文件信息
        if current_files:
            formatted += f"### 当前文件\n"
            for file in current_files:
                file_name = file.get("name", "未命名")
                formatted += f"- {file_name}\n"
            formatted += "\n"
        
        # 添加当前查询
        formatted += f"### 当前请求\n{current_query}\n"
        
        return self._truncate_to_token_limit(formatted)
    
    def _build_fallback_context(
        self,
        current_query: str,
        current_files: List[Dict[str, Any]]
    ) -> str:
        """
        构建降级上下文（当主要构建失败时使用）
        """
        formatted = "## 上下文信息（简化版）\n\n"
        
        formatted += f"### 当前请求\n{current_query}\n\n"
        
        if current_files:
            formatted += f"### 相关文件\n"
            for file in current_files:
                file_name = file.get("name", "未命名")
                formatted += f"- {file_name}\n"
        
        return formatted
    
    def _truncate_to_token_limit(self, text: str) -> str:
        """
        将文本截断到令牌限制
        
        注意：这是一个简化的实现，实际应该使用tokenizer。
        这里使用字符数作为近似值（假设1个token ≈ 4个字符）。
        """
        max_chars = self.max_tokens * 4
        
        if len(text) <= max_chars:
            return text
        
        # 截断文本并添加提示
        truncated = text[:max_chars]
        
        # 尝试在句子边界处截断
        last_period = truncated.rfind('.')
        last_newline = truncated.rfind('\n')
        
        # 选择最合适的截断点
        cutoff = max(last_period, last_newline)
        if cutoff > max_chars * 0.8:  # 如果截断点不太靠前
            truncated = truncated[:cutoff + 1]
        
        truncated += f"\n\n[上下文已截断，原始长度: {len(text)} 字符，限制: {max_chars} 字符]"
        
        return truncated
    
    def estimate_token_count(self, text: str) -> int:
        """
        估算文本的token数量
        
        简化实现：假设1个token ≈ 4个字符
        实际项目中应该使用真正的tokenizer
        """
        # 去除空白字符
        cleaned_text = ' '.join(text.split())
        # 简单估算
        return max(1, len(cleaned_text) // 4)


# 工厂函数
def create_context_builder(
    max_history_turns: int = 5,
    max_tokens: int = 2000
) -> ContextBuilder:
    """创建上下文构建器实例"""
    return ContextBuilder(
        max_history_turns=max_history_turns,
        max_tokens=max_tokens
    )