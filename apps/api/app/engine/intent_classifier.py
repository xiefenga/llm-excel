"""意图分类器 - 基于LLM的用户意图识别"""

import json
import logging
from typing import Dict, List, Optional, Tuple, Literal
from enum import Enum

from app.engine.llm_client import LLMClient
from app.engine.llm_types import LLMStageConfig

logger = logging.getLogger(__name__)


class IntentType(str, Enum):
    """意图类型枚举"""
    CHAT = "chat"  # 纯聊天对话
    ANALYSIS = "analysis"  # 数据分析总结
    PROCESSING = "processing"  # 数据处理
    UNCLEAR = "unclear"  # 需求不明确


class IntentClassifier:
    """
    意图分类器
    
    使用LLM识别用户请求的意图类型，支持三种主要意图：
    1. chat - 纯文本对话
    2. analysis - 数据分析总结
    3. processing - 数据处理
    
    对于processing意图，还会判断需求是否明确。
    """

    # 意图分类提示词
    INTENT_CLASSIFICATION_PROMPT = """
你是一个意图分类助手，负责分析用户请求并判断其意图类型。

## 意图类型定义

1. **聊天 (chat)**: 纯文本对话，不涉及文件处理或数据分析。例如：
   - "你好，今天天气怎么样？"
   - "介绍一下这个系统的功能"
   - "谢谢你的帮助"

2. **数据分析总结 (analysis)**: 对数据进行分析、总结、洞察，但不修改原始数据。例如：
   - "分析一下销售数据的趋势"
   - "总结这个表格的主要特点"
   - "统计各地区的销售额分布"

3. **数据处理 (processing)**: 对数据进行具体的操作和修改。例如：
   - "筛选出金额大于1000的记录"
   - "新增一列计算折扣价"
   - "按日期排序并导出结果"

## 分类规则

1. 如果用户没有上传文件，只能是聊天意图
2. 如果用户上传了文件，根据query内容判断是analysis还是processing
3. 对于processing意图，还需要判断需求是否明确

## 需求明确性判断

对于数据处理请求，判断需求是否足够明确：
- 明确：包含具体的操作、条件、目标
- 不明确：过于模糊、缺少关键信息、需要澄清

明确示例：
- "筛选出年龄大于30岁的用户" ✅
- "计算每个产品的平均价格" ✅

不明确示例：
- "处理一下这个表格" ❌
- "帮我看看数据" ❌
- "优化这个文件" ❌

## 输出格式

请严格按照以下JSON格式输出：
```json
{{
  "intent": "chat|analysis|processing|unclear",
  "confidence": 0.0-1.0,
  "requires_clarification": true|false,
  "clarification_question": "如果需要澄清的问题，否则为null",
  "reasoning": "分类理由"
}}
```

## 历史对话上下文
{history}

## 用户请求

用户query: {query}
是否有文件上传: {has_files}
"""

    def __init__(self, llm_client: LLMClient):
        """
        初始化意图分类器
        
        Args:
            llm_client: LLM客户端，用于调用分类模型
        """
        self.llm_client = llm_client
        
    def classify(
        self, 
        query: str, 
        has_files: bool = False,
        file_count: int = 0,
        history: str = ""
    ) -> Dict:
        """
        分类用户意图
        
        Args:
            query: 用户查询文本
            has_files: 是否有文件上传
            file_count: 文件数量
            
        Returns:
            分类结果字典，包含：
            - intent: 意图类型
            - confidence: 置信度
            - requires_clarification: 是否需要澄清
            - clarification_question: 澄清问题
            - reasoning: 分类理由
        """
        try:
            # 构建分类提示词
            prompt = self.INTENT_CLASSIFICATION_PROMPT.format(
                history=history if history else "无历史记录，这是第一轮对话",  # 👈 塞入历史
                query=query,
                has_files="是" if has_files else "否"
            )
            
            # 调用LLM进行分类
            # 使用现有的LLM配置，假设有一个"intent"阶段配置
            response = self.llm_client.call_llm("intent", prompt, "")
            
            # 解析响应
            result = self._parse_response(response)
            
            # 验证和修正结果
            result = self._validate_and_correct(result, has_files, query)
            
            logger.info(f"意图分类结果: query='{query[:50]}...', intent={result['intent']}, "
                       f"confidence={result['confidence']}, clarification={result['requires_clarification']}")
            
            return result
            
        except Exception as e:
            logger.error(f"意图分类失败: {e}", exc_info=True)
            # 返回默认结果
            return self._get_default_result(query, has_files)
    
    def _parse_response(self, response: str) -> Dict:
        """解析LLM响应"""
        try:
            # 尝试提取JSON部分
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                result = json.loads(json_str)
            else:
                # 如果没有找到JSON，尝试直接解析
                result = json.loads(response)
            
            # 验证必需字段
            required_fields = ['intent', 'confidence', 'requires_clarification']
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"缺少必需字段: {field}")
            
            # 确保意图类型有效
            valid_intents = [intent.value for intent in IntentType]
            if result['intent'] not in valid_intents:
                result['intent'] = IntentType.UNCLEAR.value
            
            # 确保置信度在合理范围
            confidence = float(result['confidence'])
            if confidence < 0 or confidence > 1:
                result['confidence'] = 0.5
            
            # 确保clarification_question存在
            if 'clarification_question' not in result:
                result['clarification_question'] = None
            
            # 确保reasoning存在
            if 'reasoning' not in result:
                result['reasoning'] = "LLM响应解析成功"
                
            return result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"解析LLM响应失败: {e}, 响应内容: {response[:200]}...")
            # 返回默认结果
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
        
        # 规则1: 如果没有文件，不能是analysis或processing
        if not has_files and intent in [IntentType.ANALYSIS.value, IntentType.PROCESSING.value]:
            logger.info(f"修正意图: 无文件但意图为{intent}，修正为chat")
            result['intent'] = IntentType.CHAT.value
            result['confidence'] = max(0.3, result['confidence'] - 0.2)
            result['requires_clarification'] = True
            result['clarification_question'] = "数据分析或处理需要上传文件，请先上传相关文件。"
            result['reasoning'] += " (修正: 无文件时不能进行数据分析或处理)"
        
        # 规则2: 如果有文件，不能是纯chat（除非query明显是聊天）
        elif has_files and intent == IntentType.CHAT.value:
            # 检查query是否真的是聊天内容
            if self._is_chat_query(query):
                # 确实是聊天，但需要提醒用户
                result['clarification_question'] = "检测到您上传了文件，但请求似乎是聊天内容。您是想分析或处理这些文件吗？"
            else:
                # 可能是误分类，尝试重新判断
                if self._looks_like_data_processing(query):
                    result['intent'] = IntentType.PROCESSING.value
                    result['reasoning'] += " (修正: 有文件且query包含数据处理关键词)"
                elif self._looks_like_analysis(query):
                    result['intent'] = IntentType.ANALYSIS.value
                    result['reasoning'] += " (修正: 有文件且query包含分析关键词)"
        
        return result
    
    def _is_chat_query(self, query: str) -> bool:
        """判断是否是聊天query"""
        chat_keywords = ['你好', '嗨', 'hello', 'hi', '谢谢', '感谢', '请问', '帮助', '介绍', '功能']
        query_lower = query.lower()
        
        # 检查是否包含聊天关键词
        for keyword in chat_keywords:
            if keyword in query_lower:
                return True
        
        # 检查是否是很短的query
        if len(query.strip()) < 10:
            return True
            
        return False
    
    def _looks_like_data_processing(self, query: str) -> bool:
        """判断是否像数据处理query"""
        processing_keywords = ['筛选', '过滤', '排序', '计算', '新增', '添加', '删除', 
                              '修改', '更新', '导出', '导入', '合并', '拆分', '转换']
        query_lower = query.lower()
        
        for keyword in processing_keywords:
            if keyword in query_lower:
                return True
                
        return False
    
    def _looks_like_analysis(self, query: str) -> bool:
        """判断是否像数据分析query"""
        analysis_keywords = ['分析', '总结', '统计', '趋势', '分布', '洞察', '报告',
                            '查看', '观察', '了解', '认识', '特点', '特征']
        query_lower = query.lower()
        
        for keyword in analysis_keywords:
            if keyword in query_lower:
                return True
                
        return False
    
    def _is_clear_processing_request(self, query: str) -> bool:
        """判断数据处理请求是否明确"""
        # 明确的特征：包含具体条件、操作、目标
        clear_indicators = [
            ('大于', '数值条件'),
            ('小于', '数值条件'),
            ('等于', '具体条件'),
            ('包含', '文本条件'),
            ('排序', '具体操作'),
            ('计算', '具体操作'),
            ('新增列', '具体操作'),
            ('筛选出', '具体目标'),
            ('找出', '具体目标'),
            ('统计', '具体目标')
        ]
        
        query_lower = query.lower()
        
        # 检查是否有具体条件
        has_specific_condition = any(
            indicator in query_lower for indicator, _ in clear_indicators
        )
        
        # 检查是否有模糊表述
        vague_indicators = ['处理一下', '帮我看看', '优化', '整理', '弄一下']
        has_vague_expression = any(
            vague in query_lower for vague in vague_indicators
        )
        
        # 如果包含具体条件且不包含模糊表述，则认为是明确的
        return has_specific_condition and not has_vague_expression
    
    def _generate_clarification_question(self, query: str) -> str:
        """生成澄清问题"""
        query_lower = query.lower()
        
        if '筛选' in query_lower or '过滤' in query_lower:
            return "请问您想按照什么条件进行筛选？例如：金额大于1000、状态为已完成等。"
        elif '排序' in query_lower:
            return "请问您想按照哪一列进行排序？是升序还是降序？"
        elif '计算' in query_lower:
            return "请问您想计算什么？例如：平均价格、总金额、折扣价等。"
        elif '新增' in query_lower or '添加' in query_lower:
            return "请问您想新增什么内容？例如：新增一列计算折扣价、新增汇总行等。"
        else:
            return "您的需求不够明确，请具体说明您想对数据做什么操作。例如：筛选出特定条件的记录、按某列排序、计算某列的值等。"
    
    def _get_default_result(self, query: str, has_files: bool) -> Dict:
        """获取默认分类结果"""
        # 基于简单规则生成默认结果
        if not has_files:
            intent = IntentType.CHAT.value
            confidence = 0.6
            clarification = True
            question = "请描述您的需求，或者上传文件进行数据分析或处理。"
        else:
            # 有文件时，尝试基于关键词判断
            if self._looks_like_data_processing(query):
                intent = IntentType.PROCESSING.value
                confidence = 0.5
                clarification = not self._is_clear_processing_request(query)
                question = "请具体说明您想对数据做什么操作。" if clarification else None
            elif self._looks_like_analysis(query):
                intent = IntentType.ANALYSIS.value
                confidence = 0.5
                clarification = False
                question = None
            else:
                intent = IntentType.UNCLEAR.value
                confidence = 0.3
                clarification = True
                question = "请具体说明您想对数据做什么操作，例如：分析数据趋势、筛选特定记录、计算统计值等。"
        
        return {
            "intent": intent,
            "confidence": confidence,
            "requires_clarification": clarification,
            "clarification_question": question,
            "reasoning": "使用默认规则分类"
        }


def create_intent_classifier(llm_client: LLMClient) -> IntentClassifier:
    """创建意图分类器的工厂函数"""
    return IntentClassifier(llm_client)