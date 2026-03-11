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

    # 🌟 优化点1：改为动态模板，注入Schema，并增加严格的隔离指令
    SYSTEM_PROMPT_TEMPLATE = """\
你是一个精准的意图分类器。请严格区分【历史对话记录】和用户的【当前最新指令】。历史记录仅作背景参考，你必须仅针对【当前最新指令】做出意图分类判断！

【当前可用文件表头信息 (Schema)】
{schema_info}

意图类型：
- chat: 纯聊天，不涉及文件处理（如：日常打招呼“你好”、感谢、询问功能等）。注意：即使历史记录全是在处理数据报错，只要当前指令是聊天，就必须分类为 chat！
- analysis: 数据分析/总结，不修改数据
- processing: 数据处理，修改/转换/导出数据
- unclear: 需求不明确，或要求操作的列不存在，需要澄清

分类核心规则（必须绝对遵守）：
1. 闲聊防误判：如果当前指令是打招呼或闲聊，不管有没有文件，直接判定为 chat！
2. 上下文意图继承（新规则）：如果用户的【当前最新指令】非常简短（如只提供了一个列名、"是"、"对"、"升序"等），请务必查看最近一条【历史对话记录】。如果用户是在回答系统的提问，或者在更正上一步的列名，请继承历史记录中的操作意图（如排序、筛选等），根据情况判定是processing还是unclear！
3. 指令完整性校验（关键！）：如果当前指令是数据处理，但缺少必要的参数（例如：只说了“分组”、“合并”，但没说按哪一列分组；只说了“计算平均值”，没说算哪一列），必须判定为 unclear，requires_clarification=true，并在 clarification_question 中温柔地反问用户缺少的信息。
4. 列名真实性校验（关键！）：如果当前指令要求操作具体的列，你必须核对该列名是否存在于上方的【当前可用文件表头信息】中！
   - 如果列名不存在：必须判定为 unclear，requires_clarification=true，并在 clarification_question 中明确告诉用户找不到该列，并列出真实可用的列名。
   - 如果需求完整且列名存在：正常判定为 processing 或 analysis。

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
        schema_info: str = "当前无文件或无法获取表头信息"  
    ) -> Dict:
        """分类用户意图"""
        try:
            # 格式化动态 System Prompt
            system_prompt = self.SYSTEM_PROMPT_TEMPLATE.replace("{schema_info}", schema_info)

            # 🌟 优化点3：实施物理隔离（Boundary Framing）
            messages = []
            if history_messages:
                messages.append({"role": "system", "content": "--- 以下为历史对话记录，仅作为上下文参考，切勿作为当前意图的判断主体 ---"})
                messages.extend(history_messages)
                messages.append({"role": "system", "content": "--- 历史对话记录结束 ---"})

            # 强推当前指令，将其变为 LLM 的绝对注意力核心
            current_message = f"【当前最新指令】(是否有文件: {has_files})\n用户说：{query}"
            messages.append({"role": "user", "content": current_message})

            response = self.llm_client.call_llm(
                "intent", system_prompt, messages=messages
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
        """解析LLM响应 (保持原样)"""
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

        # 🌟 优化点4：去掉“发你好就强制拦截要求处理数据”的错误死循环逻辑
        elif has_files and intent == IntentType.CHAT.value:
            # 如果不是闲聊，才做进一步纠正；如果是闲聊（如"你好"），直接放行保留 CHAT 意图！
            if not self._is_chat_query(query):
                if self._looks_like_data_processing(query):
                    result['intent'] = IntentType.PROCESSING.value
                    result['requires_clarification'] = False
                    result['clarification_question'] = None
                    result['reasoning'] += " (修正: 有文件且query非闲聊，包含数据处理关键词)"
                elif self._looks_like_analysis(query):
                    result['intent'] = IntentType.ANALYSIS.value
                    result['requires_clarification'] = False
                    result['clarification_question'] = None
                    result['reasoning'] += " (修正: 有文件且query非闲聊，包含分析关键词)"

        return result

    def _is_chat_query(self, query: str) -> bool:
        """保持原样"""
        chat_keywords = ['你好', '嗨', 'hello', 'hi', '谢谢', '感谢', '请问', '帮助', '介绍', '功能']
        query_lower = query.lower()
        for keyword in chat_keywords:
            if keyword in query_lower:
                return True
        if len(query.strip()) < 10:
            return True
        return False

    def _looks_like_data_processing(self, query: str) -> bool:
        """保持原样"""
        processing_keywords = ['筛选', '过滤', '排序', '计算', '新增', '添加', '删除',
                              '修改', '更新', '导出', '导入', '合并', '拆分', '转换']
        query_lower = query.lower()
        return any(kw in query_lower for kw in processing_keywords)

    def _looks_like_analysis(self, query: str) -> bool:
        """保持原样"""
        analysis_keywords = ['分析', '总结', '统计', '趋势', '分布', '洞察', '报告',
                            '查看', '观察', '了解', '认识', '特点', '特征']
        query_lower = query.lower()
        return any(kw in query_lower for kw in analysis_keywords)

    def _get_default_result(self, query: str, has_files: bool) -> Dict:
        """保持原样"""
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