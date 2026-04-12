import json
from types import SimpleNamespace
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import chat as chat_route
from app.core.sse import sse
from app.engine.intent_classifier import IntentType


class FakeIntentService:
    async def recognize_intent(self, **kwargs):
        return {
            "intent": IntentType.PROCESSING.value,
            "requires_clarification": False,
            "file_ids": [str(uuid4())],
            "context": {"context_type": "processing"},
        }


def _collect_sse_json(response):
    events = []
    for line in response.iter_lines():
        if not line:
            continue
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events


def test_chat_route_uses_processing_pipeline_for_processing_intent(monkeypatch):
    captured = {}

    async def fake_get_intent_service(db):
        return FakeIntentService()

    async def fake_get_current_user():
        return SimpleNamespace(id=uuid4())

    async def fake_get_db():
        yield object()

    async def fake_stream_processing_pipeline(**kwargs):
        captured.update(kwargs)
        yield sse({"step": "complete", "status": "done", "output": {"success": True}})

    app = FastAPI()
    app.include_router(chat_route.router)
    app.dependency_overrides[chat_route.get_current_user] = fake_get_current_user
    app.dependency_overrides[chat_route.get_db] = fake_get_db

    monkeypatch.setattr(chat_route, "get_intent_service", fake_get_intent_service)
    monkeypatch.setattr(chat_route, "stream_processing_pipeline", fake_stream_processing_pipeline)

    with TestClient(app) as client:
        with client.stream(
            "POST",
            "/chat",
            json={"query": "删除某列", "file_ids": [], "thread_id": None},
        ) as response:
            assert response.status_code == 200
            events = _collect_sse_json(response)

    assert captured["intent_type"] == IntentType.PROCESSING.value
    assert captured["intent_context"] == {"context_type": "processing"}
    assert captured["enhance_query_with_history"] is True
    assert len(captured["file_ids"]) == 1
    assert str(captured["file_ids"][0])
    assert events[-1]["output"]["success"] is True
