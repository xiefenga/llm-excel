"""SSE 事件辅助函数"""

import json
from typing import Any, Optional

from sse_starlette.sse import ServerSentEvent


class StepStatus:
    """步骤状态常量"""

    RUNNING = "running"
    STREAMING = "streaming"
    DONE = "done"
    ERROR = "error"


def sse(data: Any, event: Optional[str] = None) -> ServerSentEvent:
    """创建 SSE 事件"""
    return ServerSentEvent(data=json.dumps(data, ensure_ascii=False), event=event)


def sse_error(message: str) -> ServerSentEvent:
    """创建系统级错误事件"""
    return sse({"message": message}, event="error")


def sse_step_running(step: str, stage_id: str) -> ServerSentEvent:
    """创建步骤开始事件"""
    return sse({"step": step, "status": StepStatus.RUNNING, "stage_id": stage_id})


def sse_step_streaming(step: str, delta: str, stage_id: str) -> ServerSentEvent:
    """创建步骤流式输出事件"""
    return sse(
        {"step": step, "status": StepStatus.STREAMING, "delta": delta, "stage_id": stage_id}
    )


def sse_step_done(step: str, output: Any, stage_id: Optional[str] = None) -> ServerSentEvent:
    """创建步骤完成事件"""
    data = {"step": step, "status": StepStatus.DONE, "output": output}
    if stage_id:
        data["stage_id"] = stage_id
    return sse(data)


def sse_step_error(step: str, error: str, stage_id: str) -> ServerSentEvent:
    """创建步骤错误事件"""
    return sse({"step": step, "status": StepStatus.ERROR, "error": error, "stage_id": stage_id})
