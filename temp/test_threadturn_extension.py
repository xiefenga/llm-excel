#!/usr/bin/env python3
"""测试 ThreadTurn 模型扩展"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from app.models.thread import ThreadTurn
from uuid import uuid4
from datetime import datetime, timezone

def test_threadturn_model():
    """测试 ThreadTurn 模型的新字段"""
    print("测试 ThreadTurn 模型扩展...")
    
    # 创建一个 ThreadTurn 实例
    turn = ThreadTurn(
        id=uuid4(),
        thread_id=uuid4(),
        turn_number=1,
        user_query="测试查询",
        status="pending",
        intent_type="chat",
        response_text="这是测试回复",
        steps=[]
    )
    
    # 验证字段存在
    print(f"✓ ThreadTurn 实例创建成功")
    print(f"  - intent_type: {turn.intent_type} (期望: chat)")
    print(f"  - response_text: {turn.response_text[:20]}... (期望: 这是测试回复...)")
    
    # 测试字段类型
    assert turn.intent_type == "chat", f"intent_type 错误: {turn.intent_type}"
    assert turn.response_text == "这是测试回复", f"response_text 错误: {turn.response_text}"
    
    # 测试可选字段（可以为 None）
    turn2 = ThreadTurn(
        id=uuid4(),
        thread_id=uuid4(),
        turn_number=2,
        user_query="另一个查询",
        status="pending",
        intent_type=None,  # 可选
        response_text=None,  # 可选
        steps=[]
    )
    
    print(f"✓ 可选字段测试成功")
    print(f"  - intent_type: {turn2.intent_type} (期望: None)")
    print(f"  - response_text: {turn2.response_text} (期望: None)")
    
    assert turn2.intent_type is None, "intent_type 应该可以为 None"
    assert turn2.response_text is None, "response_text 应该可以为 None"
    
    print("\n✅ 所有测试通过！ThreadTurn 模型扩展成功。")

if __name__ == "__main__":
    try:
        test_threadturn_model()
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)