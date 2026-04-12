# CLAUDE.md

This file provides guidance to Claude Code when working in `apps/api/`.

## Commands

```bash
# From repo root
pnpm dev:api
pnpm --filter @selgetabel/api install

# From apps/api
uv sync
uv run uvicorn app.main:app --reload --host localhost --port 8000
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "description"
uv run pytest tests
```

## Directory Structure

```
app/
├── main.py                 # FastAPI app entry, middleware, exception handling
├── api/
│   ├── main.py             # Router aggregation
│   └── routes/             # auth, btrack, chat, file, llm, role, thread, user, fixture
├── core/                   # config, database, jwt, crypto, permissions, branding, SSE
├── engine/                 # parser, executor, formula generation, intent, context, LLM providers
├── processor/              # staged processing pipeline
│   └── stages/             # base, generate_validate, execute, errors
├── services/               # chat, processing, context, intent, auth, file, thread, storage
├── models/                 # SQLAlchemy ORM models
├── schemas/                # Pydantic request/response models
├── persistence/            # data access helpers
├── events/                 # event bus and types
└── scripts/                # initialization helpers
```

## Key Concepts

### Request Paths

- `chat` routes handle the main conversational and processing entry points.
- Auth, RBAC, user, file, thread, btrack, and LLM configuration are split into separate route modules.
- Fixture routes are only included in development mode.

### Processing Pipeline

The current backend is split between conversational handling and operation execution:

1. Accept request and resolve user/file/thread context.
2. Classify intent and build prompt/context payload.
3. Generate model output through provider adapters.
4. Validate structured operations in `engine/parser.py`.
5. Execute operations and generate Excel output through `engine/executor.py` and `engine/excel_generator.py`.
6. Stream progress and results back to the client.

### LLM Integration

- Provider abstractions live in `app/engine/llm_providers/`.
- `llm_client.py`, `intent_classifier.py`, and `context_builder.py` are central to model-facing behavior.
- Database-backed provider configuration is handled through the LLM APIs and related service code.

## Data And Infra

- ORM models live in `app/models/`; schema contracts live in `app/schemas/`.
- Database migrations are managed with Alembic in `alembic/`.
- Object storage integration is implemented in `app/services/oss.py`.
- Shared response envelopes use `app/schemas/response.py`.

## Tests

- Automated tests currently live in `tests/`.
- Existing coverage focuses on processor stages and stage export behavior.
- When touching parser, executor, pipeline, or intent logic, add or extend targeted pytest coverage instead of relying only on manual testing.

## Change Guidance

- Prefer keeping route handlers thin and move business logic into `services/`, `engine/`, or `processor/`.
- Avoid mixing intent/chat concerns with Excel execution concerns unless the flow truly spans both.
- If you add a new operation type, update parser validation, executor behavior, Excel generation, prompts, and the corresponding spec in `docs/specs/OPERATION_SPEC.md`.
