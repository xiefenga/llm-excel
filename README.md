# Selgetabel

[中文文档](README.zh-CN.md)

LLM-powered Excel data processing. Describe what you need in natural language — get structured operations, formulas, and downloadable Excel files.

## How It Works

1. Upload Excel file(s)
2. Describe your data processing requirement in natural language
3. LLM generates structured JSON operations (not raw formulas)
4. Engine executes operations and produces Excel files with real formulas

All formulas are 100% reproducible — no LLM-generated code is executed directly.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Router v7, Vite, TypeScript, Tailwind CSS |
| Backend | Python FastAPI, multi-provider LLM support |
| Storage | PostgreSQL, MinIO (S3-compatible) |
| Infra | pnpm workspace, Turborepo, Docker Compose |

## Quick Start (Docker)

### Prerequisites

- Docker & Docker Compose

### Deploy

```bash
# Clone and enter the project
git clone https://github.com/xiefenga/selgetabel.git
cd selgetabel/docker

# Create environment config
cp .env.example .env
```

Edit `.env` and configure the required variables:

```bash
# Required
POSTGRES_PASSWORD=strong_password   # Database password
MINIO_ROOT_PASSWORD=strong_password # Object storage password
JWT_SECRET_KEY=xxx                  # Run: openssl rand -hex 32
```

Start the services:

```bash
docker compose up -d

# Access the app at http://localhost:8080
```

After startup, configure LLM providers through the admin panel (Settings > LLM Providers). See [LLM Providers](#llm-providers) for details.

### Upgrade

```bash
cd docker
./scripts/upgrade.sh <version>
```

## Local Development

### Prerequisites

- Node.js 22+ / pnpm 10+
- Python 3.11+
- PostgreSQL & MinIO (or use `docker compose -f docker/docker-compose.dev.yml up -d`)

### Setup

```bash
# Install frontend dependencies
pnpm install

# Install backend dependencies
pnpm --filter @selgetabel/api install

# Start all services
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### Commands

```bash
pnpm dev          # Start web + API
pnpm dev:api      # Start API only
pnpm build        # Build all packages
pnpm format       # Format code (Prettier)
pnpm check-types  # Type checking
```

## Architecture

```
selgetabel/
├── apps/
│   ├── api/           # Python FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py        # App entry point
│   │   │   ├── api/routes/    # Route handlers
│   │   │   ├── engine/        # Core: parser, executor, formula gen, LLM prompts
│   │   │   ├── processor/     # Processing pipeline
│   │   │   ├── services/      # Business logic, file I/O, auth
│   │   │   ├── models/        # SQLAlchemy ORM
│   │   │   └── core/          # Config, DB, JWT
│   │   └── pyproject.toml
│   └── web/           # React Router v7 frontend
│       ├── app/
│       │   ├── routes/        # File-based routing
│       │   ├── components/    # Shared UI components
│       │   ├── features/      # Feature modules
│       │   └── lib/           # Utilities & API client
│       └── vite.config.ts
├── docker/            # Docker Compose deployment
├── docs/              # Technical documentation
│   ├── design/        # System design & architecture
│   ├── specs/         # Protocol & format specifications
│   ├── conventions/   # Coding standards & workflows
│   └── guides/        # How-to guides
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### LLM Providers

The system supports multiple LLM providers with database-driven configuration. Providers, models, and credentials are managed via the admin API (`/llm/*`).

**Supported providers:**

| Provider | Type | Status |
|----------|------|--------|
| OpenAI | `openai` | Available |
| OpenAI-compatible | `openai_compatible` | Available |
| Anthropic | `anthropic` | Planned |
| Azure OpenAI | `azure_openai` | Planned |
| DeepSeek | `deepseek` | Planned |
| Qwen | `qwen` | Planned |
| Ollama | `ollama` | Planned |

**Stage-level routing** — different pipeline stages (analyze, generate, title) can use different provider/model combinations.

See [LLM Provider Design](docs/design/LLM_PROVIDER_DESIGN.md) for the full architecture.

### Processing Pipeline

The backend streams SSE events through a multi-stage pipeline:

```
Upload → Load → Generate (LLM) → Validate → Execute → Export
```

- **Generate**: LLM produces structured JSON operations from natural language
- **Validate**: Parser checks format and applies function whitelist
- **Execute**: Engine runs operations and generates Excel formulas
- **Export**: Outputs downloadable `.xlsx` with embedded formulas

### Supported Operations

| Operation | Description |
|-----------|-------------|
| `aggregate` | Column aggregation (SUM, AVERAGE, SUMIF, etc.) |
| `add_column` | Add calculated column with formula |
| `update_column` | Update existing column values |
| `compute` | Scalar computation on variables |
| `filter` | Filter rows by condition |
| `sort` | Sort by column(s) |
| `group_by` | Group and aggregate |
| `take` | Limit row count |
| `select_columns` | Select specific columns |
| `drop_columns` | Remove columns |
| `create_sheet` | Create new worksheet |

## Documentation

- [Operation Specification](docs/specs/OPERATION_SPEC.md) — JSON operation format
- [SSE Protocol](docs/specs/SSE_SPEC.md) — Server-Sent Events protocol
- [Steps Storage](docs/specs/STEPS_STORAGE_SPEC.md) — ThreadTurn steps format
- [LLM Provider Design](docs/design/LLM_PROVIDER_DESIGN.md) — Multi-provider architecture
- [Engine Architecture](docs/design/ENGINE_ARCHITECTURE.md) — Core engine design
- [Database Design](docs/design/DATABASE_DESIGN.md) — Data model
- [Docker Scripts](docs/guides/DOCKER_SCRIPTS.md) — Deployment scripts guide

## License

[Apache-2.0](LICENSE)
