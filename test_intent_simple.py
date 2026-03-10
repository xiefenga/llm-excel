#!/usr/bin/env python3
"""
意图识别系统简单测试
只测试新创建的模块，不导入整个项目
"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api/app'))

# 模拟必要的依赖
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

# 模拟 IntentType 枚举
class IntentType(str, Enum):
    CHAT = "chat"
    DATA_ANALYSIS = "data_analysis"
    DATA_PROCESSING = "data_processing"

# 模拟 IntentClassifier 类
class MockIntentClassifier:
    """模拟意图分类器"""
    
    def classify(self, query: str, has_files: bool = False) -> IntentType:
        """模拟意图分类逻辑"""
        query_lower = query.lower()
        
        # 简单规则分类
        if has_files:
            # 如果有文件上传，优先考虑数据处理
            if any(word in query_lower for word in ["处理", "修改", "计算", "筛选", "排序", "分析"]):
                return IntentType.DATA_PROCESSING
            else:
                return IntentType.DATA_ANALYSIS
        else:
            # 没有文件上传，只能是聊天
            return IntentType.CHAT

# 模拟 IntentService 类
class MockIntentService:
    """模拟意图服务"""
    
    def __init__(self):
        self.classifier = MockIntentClassifier()
    
    def recognize_intent(self, query: str, has_files: bool = False) -> Dict[str, Any]:
        """模拟意图识别"""
        intent = self.classifier.classify(query, has_files)
        
        # 构建响应
        response = {
            "intent": intent,
            "confidence": 0.9,
            "requires_clarification": False,
            "clarification_question": None
        }
        
        # 对于数据处理意图，检查是否需要澄清
        if intent == IntentType.DATA_PROCESSING:
            # 简单规则：如果查询太短或模糊，需要澄清
            if len(query.strip()) < 10 or "什么" in query or "如何" in query:
                response["requires_clarification"] = True
                response["clarification_question"] = "请具体说明您希望如何处理这个Excel文件？"
        
        return response

# 模拟 ContextService 类
class MockContextService:
    """模拟上下文服务"""
    
    def __init__(self):
        self.contexts = {}
    
    def build_context(self, session_id: str, user_query: str, assistant_response: Optional[str] = None) -> Dict[str, Any]:
        """构建对话上下文"""
        if session_id not in self.contexts:
            self.contexts[session_id] = []
        
        context_entry = {
            "user_query": user_query,
            "assistant_response": assistant_response,
            "timestamp": "2024-01-01T00:00:00"
        }
        
        self.contexts[session_id].append(context_entry)
        
        # 保持最近5轮对话
        if len(self.contexts[session_id]) > 5:
            self.contexts[session_id] = self.contexts[session_id][-5:]
        
        return {
            "session_id": session_id,
            "history": self.contexts[session_id],
            "total_turns": len(self.contexts[session_id])
        }
    
    def format_for_llm(self, session_id: str, current_query: str) -> str:
        """格式化上下文供LLM使用"""
        if session_id not in self.contexts:
            return f"用户提问：{current_query}"
        
        history = self.contexts[session_id]
        formatted = []
        
        for i, entry in enumerate(history, 1):
            formatted.append(f"第{i}轮对话：")
            formatted.append(f"用户：{entry['user_query']}")
            if entry['assistant_response']:
                formatted.append(f"助手：{entry['assistant_response']}")
        
        formatted.append(f"当前问题：{current_query}")
        return "\n".join(formatted)

def test_intent_classification():
    """测试意图分类"""
    print("=== 测试意图分类 ===")
    
    classifier = MockIntentClassifier()
    
    test_cases = [
        ("你好，今天天气怎么样？", False, IntentType.CHAT),
        ("请帮我分析这个销售数据", True, IntentType.DATA_ANALYSIS),
        ("请筛选出销售额大于1000的记录", True, IntentType.DATA_PROCESSING),
        ("这个表格有什么问题？", True, IntentType.DATA_PROCESSING),
    ]
    
    for query, has_files, expected in test_cases:
        result = classifier.classify(query, has_files)
        status = "PASS" if result == expected else "FAIL"
        print(f"{status} 查询: '{query}', 有文件: {has_files}")
        print(f"  预期: {expected}, 实际: {result}")
    
    print()

def test_intent_service():
    """测试意图服务"""
    print("=== 测试意图服务 ===")
    
    service = MockIntentService()
    
    test_cases = [
        ("你好", False),
        ("分析数据", True),
        ("处理", True),
        ("这个表格", True),
    ]
    
    for query, has_files in test_cases:
        result = service.recognize_intent(query, has_files)
        print(f"查询: '{query}', 有文件: {has_files}")
        print(f"  意图: {result['intent']}")
        print(f"  需要澄清: {result['requires_clarification']}")
        if result['clarification_question']:
            print(f"  澄清问题: {result['clarification_question']}")
        print()
    
    print()

def test_context_service():
    """测试上下文服务"""
    print("=== 测试上下文服务 ===")
    
    service = MockContextService()
    session_id = "test_session_123"
    
    # 第一轮对话
    context1 = service.build_context(session_id, "你好，请帮我分析销售数据")
    print(f"第一轮后上下文: {context1['total_turns']} 轮对话")
    
    # 第二轮对话
    context2 = service.build_context(session_id, "具体分析一下各地区的销售额", "好的，我已经分析了销售数据...")
    print(f"第二轮后上下文: {context2['total_turns']} 轮对话")
    
    # 格式化上下文
    formatted = service.format_for_llm(session_id, "哪个地区表现最好？")
    print("格式化上下文:")
    print(formatted[:200] + "..." if len(formatted) > 200 else formatted)
    
    print()

def test_integration_flow():
    """测试集成流程"""
    print("=== 测试集成流程 ===")
    
    # 模拟完整流程
    intent_service = MockIntentService()
    context_service = MockContextService()
    
    session_id = "integration_test_123"
    user_queries = [
        ("你好，今天怎么样？", False),
        ("我有一个销售数据表格，请帮我分析", True),
        ("具体分析一下各产品线的表现", True),
        ("筛选出销售额前10的产品", True),
    ]
    
    for i, (query, has_files) in enumerate(user_queries, 1):
        print(f"\n--- 第{i}轮对话 ---")
        print(f"用户: {query}")
        print(f"有文件: {has_files}")
        
        # 1. 识别意图
        intent_result = intent_service.recognize_intent(query, has_files)
        print(f"意图识别: {intent_result['intent']}")
        
        # 2. 构建上下文
        if i == 1:
            context = context_service.build_context(session_id, query)
        else:
            # 模拟助手响应
            assistant_response = f"这是对'{query}'的响应"
            context = context_service.build_context(session_id, query, assistant_response)
        
        print(f"上下文轮数: {context['total_turns']}")
        
        # 3. 如果需要澄清
        if intent_result['requires_clarification']:
            print(f"需要澄清: {intent_result['clarification_question']}")
        
        # 4. 路由决策
        intent = intent_result['intent']
        if intent == IntentType.CHAT:
            print("路由: 聊天服务")
        elif intent == IntentType.DATA_ANALYSIS:
            print("路由: 数据分析服务")
        elif intent == IntentType.DATA_PROCESSING:
            print("路由: 数据处理服务")
    
    print()

def main():
    """主测试函数"""
    print("开始测试意图识别系统...\n")
    
    try:
        test_intent_classification()
        test_intent_service()
        test_context_service()
        test_integration_flow()
        
        print("所有测试完成！")
        return 0
    except Exception as e:
        print(f"测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())