"""意图分类器 - 基于LLM的用户意图识别"""

import json
import logging
from typing import Dict, List, Optional
from enum import Enum

from app.engine.llm_client import LLMClient

logger = logging.getLogger(__name__)


class IntentType(str, Enum):
    """意图类型枚举"""
    CHAT = "chat"
    ANALYSIS = "analysis"
    PROCESSING = "processing"
    UNCLEAR = "unclear"


class IntentClassifier:
    """
    意图分类器

    使用 LLM 识别用户请求的意图类型。
    历史对话通过 messages 数组传入，而非字符串拼接。
    """

    SYSTEM_PROMPT = """\
对当前这一轮用户消息做意图分类。参考历史会话判断上下文。

意图类型：
- chat: 纯聊天，不涉及文件处理
- analysis: 数据分析/总结，不修改数据
- processing: 数据处理，修改/转换/导出数据
- unclear: 需求不明确，需要澄清

分类规则：
1. 无文件 → chat
2. 有文件 → 根据内容判断 analysis 或 processing
3. processing 需求不明确时 requires_clarification=true

严格输出 JSON：
{"intent":"...","confidence":0.0-1.0,"requires_clarification":true|false,"clarification_question":"...或null","reasoning":"..."}"""

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def classify(
        self,
        query: str,
        has_files: bool = False,
        file_count: int = 0,
        history_messages: Optional[List[Dict[str, str]]] = None,
    ) -> Dict:
        """
        分类用户意图

        Args:
            query: 用户查询文本
            has_files: 是否有文件上传
            file_count: 文件数量
            history_messages: 历史会话 messages 数组 [{"role":"user","content":"..."},...]

        Returns:
            分类结果字典
        """
        try:
            # 构建 messages: 历史会话 + 当前用户消息
            current_message = f"[有文件:{file_count}个] {query}" if has_files else f"[无文件] {query}"

            messages = list(history_messages or [])
            messages.append({"role": "user", "content": current_message})

            response = self.llm_client.call_llm(
                "intent", self.SYSTEM_PROMPT, messages=messages
            )

            result = self._parse_response(response)
            result = self._validate_and_correct(result, has_files, query)

            logger.info(
                f"意图分类结果: query='{query[:50]}...', intent={result['intent']}, "
                f"confidence={result['confidence']}, clarification={result['requires_clarification']}"
            )
            return result

        except Exception as e:
            logger.error(f"意图分类失败: {e}", exc_info=True)
            return self._get_default_result(query, has_files)

    def _parse_response(self, response: str) -> Dict:
        """解析LLM响应"""
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                result = json.loads(json_str)
            else:
                result = json.loads(response)

            required_fields = ['intent', 'confidence', 'requires_clarification']
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"缺少必需字段: {field}")

            valid_intents = [intent.value for intent in IntentType]
            if result['intent'] not in valid_intents:
                result['intent'] = IntentType.UNCLEAR.value

            confidence = float(result['confidence'])
            if confidence < 0 or confidence > 1:
                result['confidence'] = 0.5

            if 'clarification_question' not in result:
                result['clarification_question'] = None

            if 'reasoning' not in result:
                result['reasoning'] = ""

            return result

        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"解析LLM响应失败: {e}, 响应内容: {response[:200]}...")
            return {
                "intent": IntentType.UNCLEAR.value,
                "confidence": 0.3,
                "requires_clarification": True,
                "clarification_question": "抱歉，我没有理解您的请求，请重新描述您的需求。",
                "reasoning": f"解析失败: {str(e)}"
            }

    def _validate_and_correct(self, result: Dict, has_files: bool, query: str) -> Dict:
        """验证和修正分类结果"""
        intent = result['intent']

        # 规则1: 无文件 → 不能是 analysis/processing
        if not has_files and intent in [IntentType.ANALYSIS.value, IntentType.PROCESSING.value]:
            logger.info(f"修正意图: 无文件但意图为{intent}，修正为chat")
            result['intent'] = IntentType.CHAT.value
            result['confidence'] = max(0.3, result['confidence'] - 0.2)
            result['requires_clarification'] = True
            result['clarification_question'] = "数据分析或处理需要上传文件，请先上传相关文件。"
            result['reasoning'] += " (修正: 无文件时不能进行数据分析或处理)"

        # 规则2: 有文件但分为 chat → 关键词二次判断
        elif has_files and intent == IntentType.CHAT.value:
            if self._is_chat_query(query):
                result['clarification_question'] = "检测到您上传了文件，但请求似乎是聊天内容。您是想分析或处理这些文件吗？"
            elif self._looks_like_data_processing(query):
                result['intent'] = IntentType.PROCESSING.value
                result['reasoning'] += " (修正: 有文件且query包含数据处理关键词)"
            elif self._looks_like_analysis(query):
                result['intent'] = IntentType.ANALYSIS.value
                result['reasoning'] += " (修正: 有文件且query包含分析关键词)"

        return result

    def _is_chat_query(self, query: str) -> bool:
        chat_keywords = ['你好', '嗨', 'hello', 'hi', '谢谢', '感谢', '请问', '帮助', '介绍', '功能']
        query_lower = query.lower()
        for keyword in chat_keywords:
            if keyword in query_lower:
                return True
        if len(query.strip()) < 10:
            return True
        return False

    def _looks_like_data_processing(self, query: str) -> bool:
        processing_keywords = ['筛选', '过滤', '排序', '计算', '新增', '添加', '删除',
                              '修改', '更新', '导出', '导入', '合并', '拆分', '转换']
        query_lower = query.lower()
        return any(kw in query_lower for kw in processing_keywords)

    def _looks_like_analysis(self, query: str) -> bool:
        analysis_keywords = ['分析', '总结', '统计', '趋势', '分布', '洞察', '报告',
                            '查看', '观察', '了解', '认识', '特点', '特征']
        query_lower = query.lower()
        return any(kw in query_lower for kw in analysis_keywords)

    def _get_default_result(self, query: str, has_files: bool) -> Dict:
        """LLM 调用失败时的兜底规则"""
        if not has_files:
            return {
                "intent": IntentType.CHAT.value,
                "confidence": 0.6,
                "requires_clarification": True,
                "clarification_question": "请描述您的需求，或者上传文件进行数据分析或处理。",
                "reasoning": "使用默认规则分类"
            }

        if self._looks_like_data_processing(query):
            return {
                "intent": IntentType.PROCESSING.value,
                "confidence": 0.5,
                "requires_clarification": False,
                "clarification_question": None,
                "reasoning": "使用默认规则分类"
            }
        elif self._looks_like_analysis(query):
            return {
                "intent": IntentType.ANALYSIS.value,
                "confidence": 0.5,
                "requires_clarification": False,
                "clarification_question": None,
                "reasoning": "使用默认规则分类"
            }
        else:
            return {
                "intent": IntentType.UNCLEAR.value,
                "confidence": 0.3,
                "requires_clarification": True,
                "clarification_question": "请具体说明您想对数据做什么操作，例如：分析数据趋势、筛选特定记录、计算统计值等。",
                "reasoning": "使用默认规则分类"
            }


def create_intent_classifier(llm_client: LLMClient) -> IntentClassifier:
    """创建意图分类器的工厂函数"""
    return IntentClassifier(llm_client)
