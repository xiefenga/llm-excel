from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.processor.stages.generate_validate import GenerateValidateStage
from app.processor.types import EventType, ProcessConfig


class FakeLLMClient:
    def __init__(self):
        self.stream_calls = []
        self.generate_calls = []

    def generate_operations_stream(
        self,
        query,
        analysis,
        schemas,
        previous_errors=None,
        previous_json=None,
    ):
        self.stream_calls.append(
            {
                "query": query,
                "analysis": analysis,
                "schemas": schemas,
                "previous_errors": previous_errors,
                "previous_json": previous_json,
            }
        )
        yield "", (
            '{"operations": [{"type": "drop_columns", "file_id": "file-1", '
            '"table": "Sheet1", "columns": ["Date"], "description": "删除 Date 列"}]}'
        )

    def generate_operations(
        self,
        query,
        analysis,
        schemas,
        previous_errors=None,
        previous_json=None,
    ):
        self.generate_calls.append(
            {
                "query": query,
                "analysis": analysis,
                "schemas": schemas,
                "previous_errors": previous_errors,
                "previous_json": previous_json,
            }
        )
        return (
            '{"operations": [{"type": "drop_columns", "file_id": "file-1", '
            '"table": "Sheet1", "columns": ["WrongColumn"], "description": "错误结果"}]}'
        )


def _collect_events(generator):
    events = []
    while True:
        try:
            events.append(next(generator))
        except StopIteration as exc:
            return events, exc.value


def test_stream_generate_uses_previous_errors_for_retry():
    llm_client = FakeLLMClient()
    stage = GenerateValidateStage(llm_client)

    generator = stage._run_generate(
        query="删除date列所有数据 直接操作",
        analysis="",
        schemas={"file-1": {"Sheet1": []}},
        config=ProcessConfig(stream_llm=True),
        previous_errors=["列名不存在"],
        previous_json='{"operations": []}',
    )

    events, result = _collect_events(generator)

    assert [event.event_type for event in events] == [
        EventType.STAGE_START,
        EventType.STAGE_STREAM,
        EventType.STAGE_DONE,
    ]
    assert llm_client.stream_calls == [
        {
            "query": "删除date列所有数据 直接操作",
            "analysis": "",
            "schemas": {"file-1": {"Sheet1": []}},
            "previous_errors": ["列名不存在"],
            "previous_json": '{"operations": []}',
        }
    ]
    assert llm_client.generate_calls == []
    assert result[1]["operations"][0]["columns"] == ["Date"]
