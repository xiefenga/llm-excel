# CLAUDE.md

This file provides guidance to Claude Code when working in the `apps/api/` backend.

## Commands

```bash
# From monorepo root
pnpm dev:api                              # Start API with hot reload
pnpm --filter @selgetabel/api install     # Install Python dependencies (uv sync)

# From apps/api/
uv sync                                   # Install dependencies
uv run uvicorn app.main:app --reload      # Start dev server
uv run alembic upgrade head               # Run migrations
uv run alembic revision --autogenerate -m "description"  # Create migration
```

## Architecture

### Directory Structure

```
app/
├── main.py              # FastAPI app entry, lifespan, middleware, exception handlers
├── api/
│   ├── main.py          # Router aggregation (all route prefixes defined here)
│   ├── deps.py          # Dependency injection: auth, DB session, permissions, LLM client
│   └── routes/          # API endpoints
│       ├── chat.py      # POST /chat — main SSE processing endpoint
│       ├── auth.py      # /auth — register, login, refresh, logout, me, password
│       ├── file.py      # /file — upload
│       ├── thread.py    # /threads — conversation CRUD
│       ├── btrack.py    # /btracks — error tracking
│       ├── role.py      # /roles — role & permission management
│       ├── user.py      # /users — user management
│       ├── llm.py       # /llm — provider, model, credential, routing config
│       └── fixture.py   # /fixture — test fixtures (dev only)
├── core/                # Infrastructure
│   ├── config.py        # Pydantic Settings (env vars)
│   ├── database.py      # SQLAlchemy async engine & session
│   ├── base.py          # SQLAlchemy declarative base
│   ├── jwt.py           # JWT token generation & verification
│   ├── crypto.py        # Fernet encryption for LLM credentials
│   ├── permissions.py   # Permission constants & role mappings
│   ├── init_permissions.py  # Permission initialization
│   └── sse.py           # SSE utilities
├── models/              # SQLAlchemy ORM models
│   ├── user.py          # User, Account
│   ├── auth.py          # RefreshToken
│   ├── role.py          # Role, Permission, UserRole, RolePermission
│   ├── file.py          # File
│   ├── thread.py        # Thread, ThreadTurn, TurnFile
│   ├── btrack.py        # BTrack
│   └── llm.py           # LLMProvider, LLMModel, LLMCredential, LLMStageRoute
├── engine/              # Excel processing core
│   ├── parser.py        # JSON operation validation + function whitelist
│   ├── executor.py      # Operation execution + JSON expression evaluator
│   ├── excel_generator.py   # JSON expressions → Excel formulas
│   ├── excel_parser.py  # Excel file → Table/FileCollection objects
│   ├── functions.py     # Excel function implementations (SUM, IF, VLOOKUP, etc.)
│   ├── models.py        # Table, FileCollection, Operation type definitions
│   ├── prompt.py        # LLM system & user prompt templates
│   ├── output_generator.py  # Processing result generation
│   ├── llm_client.py    # Unified LLM API interface
│   ├── step_tracker.py  # Processing step tracking
│   └── llm_providers/   # Multi-provider adapter pattern
│       ├── registry.py  # Provider registry
│       ├── base.py      # Base provider interface
│       └── adapters/    # OpenAI-compatible providers
├── processor/           # Processing pipeline
│   ├── excel_processor.py   # Main orchestrator (linear pipeline)
│   ├── types.py         # ProcessEvent, ProcessStage, ProcessResult
│   └── stages/          # Pipeline stages
│       ├── generate_validate.py  # LLM generate + validation with retry
│       └── execute.py   # Operation execution
├── services/            # Business logic
│   ├── auth.py          # Registration, authentication, tokens
│   ├── excel.py         # File loading, table parsing
│   ├── oss.py           # MinIO object storage
│   ├── thread.py        # Thread/conversation management
│   ├── processor_stream.py  # SSE event streaming
│   ├── llm_config.py    # LLM config from database
│   └── fixture.py       # Test fixtures
├── persistence/         # Data access layer
│   └── turn_repository.py
├── events/              # Event bus
│   ├── bus.py
│   └── types.py
├── schemas/             # Pydantic request/response models
│   ├── response.py      # ApiResponse[T] unified format
│   └── auth.py
└── scripts/             # DB & storage initialization
    ├── init_db_data/
    └── init_minio/
```

### Processing Pipeline

```
POST /chat (SSE stream)
  → Parse uploaded Excel files (FileCollection)
  → GenerateValidateStage: LLM generates JSON operations + validation (with retry)
  → ExecuteStage: Execute operations, generate Excel formulas
  → Stream ProcessEvent objects as SSE to frontend
  → Persist steps to ThreadTurn.steps (JSONB)
```

### API Response Format

All endpoints use unified `ApiResponse[T]`:
```json
{ "code": 0, "data": null, "msg": "success" }
```

## Key Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/selgetabel

# JWT
JWT_SECRET_KEY=your-secret-key

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=selgetabel

# LLM (fallback, can also configure via /llm API)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# LLM credential encryption
LLM_SECRET_KEY=...  # Fernet key
```

## Common Workflows

**Adding a new operation type:**
1. Define schema in `docs/specs/OPERATION_SPEC.md`
2. Add validation in `engine/parser.py`
3. Implement execution in `engine/executor.py`
4. Add formula generation in `engine/excel_generator.py`
5. Update LLM prompt in `engine/prompt.py`

**Adding a new API route:**
1. Create route file in `api/routes/`
2. Register router in `api/main.py` with prefix
3. Add auth/permission dependencies from `api/deps.py`

**Database migration:**
1. Modify models in `models/`
2. Run `uv run alembic revision --autogenerate -m "description"`
3. Run `uv run alembic upgrade head`
