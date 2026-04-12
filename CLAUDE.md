# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

**Selgetabel** is an LLM-assisted Excel processing system. Users upload one or more Excel files, describe what they want in natural language, and the backend generates structured operations, validates them, executes them, and exports reproducible Excel results with formulas.

## Monorepo Layout

```
llm-excel/
├── apps/
│   ├── api/           # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── api/
│   │   │   ├── core/
│   │   │   ├── engine/
│   │   │   ├── processor/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── persistence/
│   │   │   └── events/
│   │   ├── tests/
│   │   └── alembic/
│   └── web/           # React Router v7 frontend
│       ├── app/
│       │   ├── routes/
│       │   ├── features/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── contexts/
│       │   ├── stores/
│       │   └── types/
│       └── scripts/
├── docs/
├── docker/
├── fixtures/
└── turbo.json
```

## Development Commands

```bash
# From repo root
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm build
pnpm check-types
pnpm format
```

Backend commands:

```bash
# From apps/api
uv sync
uv run uvicorn app.main:app --reload --host localhost --port 8000
uv run alembic upgrade head
uv run pytest tests
```

Frontend commands:

```bash
# From apps/web
pnpm dev
pnpm build
pnpm typecheck
pnpm api:schema
```

## Backend Architecture

**Primary entry point:** `apps/api/app/main.py`

**HTTP routing:** `apps/api/app/api/main.py` aggregates route modules for chat, auth, file, thread, btrack, role, user, llm, and dev-only fixture APIs.

**Important backend layers:**
- `app/core/` — config, database, JWT, permissions, encryption, branding, SSE helpers.
- `app/engine/` — LLM integration, intent classification, context building, parser, executor, Excel formula generation, provider adapters.
- `app/processor/` — staged processing pipeline and stage contracts.
- `app/services/` — chat, processing stream, context, intent, auth, file, thread, and LLM config services.
- `app/models/` and `app/schemas/` — ORM and API schema definitions.
- `app/persistence/` and `app/events/` — repository and event-bus support code.

**Typical processing flow:**
1. Upload Excel file(s).
2. Submit a request through the chat flow.
3. Backend classifies intent and builds prompt/context.
4. LLM generates structured operations or chat output.
5. Parser and pipeline validate the response, retrying when needed.
6. Executor runs operations and emits exportable results through SSE.

## Frontend Architecture

**Framework:** React Router v7 with SSR enabled, built through Vite.

**Key frontend areas:**
- `app/routes/` — file-based route definitions and layouts.
- `app/features/` — domain modules such as task, admin, auth, fixture, and btrack.
- `app/components/` — shared UI and layout primitives.
- `app/lib/` — API clients, config, permissions, provider utilities, and SSE helpers.
- `app/hooks/`, `app/contexts/`, and `app/stores/` — state and composition utilities.

**Data access:**
- `app/lib/client.ts` uses `openapi-fetch` for typed API access.
- `app/lib/api.ts` covers axios-based requests and streaming cases.
- Vite proxies `/api` to the backend and `/storage` to MinIO during local development.

## Testing And Verification

- Backend automated tests currently live in `apps/api/tests/`.
- The frontend has limited colocated tests for pure logic; do not assume broad UI test coverage exists.
- For most changes, prefer running `pnpm check-types` plus targeted backend tests and manual end-to-end validation.

## Working Conventions

- Keep documentation and code structure descriptions aligned with the actual tree; this repo has evolved beyond its original scaffolding.
- When changing backend flows, update the matching design/spec docs in `docs/design/` or `docs/specs/` if behavior changes.
- When changing frontend route structure or API access patterns, verify the React Router file naming and proxy assumptions still hold.
