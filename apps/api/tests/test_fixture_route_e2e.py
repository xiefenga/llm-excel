import json
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.fixture import router as fixture_router
from app.services import processor_stream


class FakeLLMClient:
    def generate_operations(self, query, analysis, schemas, previous_errors=None, previous_json=None):
        return json.dumps(
            {
                "operations": [
                    {
                        "type": "drop_columns",
                        "file_id": "titanic",
                        "table": "train",
                        "columns": ["Cabin"],
                        "description": "删除 Cabin 列",
                    }
                ]
            },
            ensure_ascii=False,
        )

    def generate_operations_stream(self, query, analysis, schemas, previous_errors=None, previous_json=None):
        payload = self.generate_operations(query, analysis, schemas, previous_errors, previous_json)
        yield "", payload


def _collect_sse_json(response):
    events = []
    for line in response.iter_lines():
        if not line:
            continue
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events


def test_fixture_run_route_streams_processing_pipeline(monkeypatch):
    async def fake_get_llm_client(*args, **kwargs):
        return FakeLLMClient()

    monkeypatch.setattr(processor_stream, "get_llm_client", fake_get_llm_client)
    monkeypatch.setattr(processor_stream, "upload_file", lambda **kwargs: "https://example.com/output.xlsx")

    app = FastAPI()
    app.include_router(fixture_router)

    with TestClient(app) as client:
        with client.stream("POST", "/fixture/run/01-titanic/filter-sort?stream_llm=false") as response:
            assert response.status_code == 200
            events = _collect_sse_json(response)

    steps = [event["step"] for event in events if "step" in event]
    assert steps[0] == "load"
    assert "generate" in steps
    assert "validate" in steps
    assert "execute" in steps
    assert "complete" in steps
    assert events[-1]["output"]["success"] is True
