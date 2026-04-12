import json
from pathlib import Path

import pandas as pd
import pytest

from tablo import ExcelParser
from app.services import processor_stream


class FakeLLMClient:
    def __init__(self):
        self.generate_calls = []

    def generate_operations(self, query, analysis, schemas, previous_errors=None, previous_json=None):
        self.generate_calls.append(
            {
                "query": query,
                "analysis": analysis,
                "schemas": schemas,
                "previous_errors": previous_errors,
                "previous_json": previous_json,
            }
        )
        return json.dumps(
            {
                "operations": [
                    {
                        "type": "drop_columns",
                        "file_id": "orders",
                        "table": "Sheet1",
                        "columns": ["Date"],
                        "description": "删除 Date 列",
                    }
                ]
            },
            ensure_ascii=False,
        )

    def generate_operations_stream(self, query, analysis, schemas, previous_errors=None, previous_json=None):
        payload = self.generate_operations(query, analysis, schemas, previous_errors, previous_json)
        yield "", payload


@pytest.mark.anyio
async def test_stream_excel_processing_smoke_uses_tablo_core(tmp_path: Path, monkeypatch):
    fake_llm = FakeLLMClient()

    async def fake_get_llm_client(*args, **kwargs):
        return fake_llm

    class FakeContextBuilder:
        def build_prompt_context(
            self,
            intent_type,
            current_query,
            history_turns,
            current_files,
            analysis_result,
        ):
            assert intent_type == "processing"
            assert history_turns == [{"role": "user", "content": "上一步"}]
            assert current_files == [{"id": "orders"}]
            assert analysis_result == ""
            return "由 API 编排层构建的上下文"

    monkeypatch.setattr(processor_stream, "get_llm_client", fake_get_llm_client)
    monkeypatch.setattr(
        processor_stream,
        "create_context_builder",
        lambda: FakeContextBuilder(),
    )

    input_file = tmp_path / "orders.xlsx"
    pd.DataFrame(
        [
            {"Name": "A", "Date": "2024-01-01", "Amount": 1},
            {"Name": "B", "Date": "2024-01-02", "Amount": 2},
        ]
    ).to_excel(input_file, index=False)

    async def load_tables():
        return ExcelParser.parse_multiple_files({"orders": input_file})

    events = []
    async for event in processor_stream.stream_excel_processing(
        load_tables_fn=load_tables,
        query="删除 Date 列",
        stream_llm=False,
        export_path_prefix=None,
        history_turns=[{"role": "user", "content": "上一步"}],
        current_files=[{"id": "orders"}],
    ):
        payload = json.loads(event.data)
        events.append(payload)

    steps = [event["step"] for event in events if "step" in event]
    assert steps[0] == "load"
    assert "generate" in steps
    assert "validate" in steps
    assert "execute" in steps
    assert steps[-1] == "complete"
    assert events[-1]["output"]["success"] is True
    assert fake_llm.generate_calls[0]["query"] == (
        "由 API 编排层构建的上下文\n\n当前请求：删除 Date 列"
    )
