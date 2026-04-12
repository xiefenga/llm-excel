# Repository Guidelines

## Project Structure & Module Organization
- `apps/api/` — FastAPI backend. App entry is `apps/api/app/main.py`; API router aggregation lives in `apps/api/app/api/main.py`.
- `apps/api/app/` — backend source, organized into `api/`, `core/`, `engine/`, `processor/`, `services/`, `models/`, `schemas/`, `persistence/`, and `events/`.
- `apps/api/tests/` — backend automated tests for pipeline and stage behavior.
- `apps/web/` — React Router v7 + Vite frontend. Main app code lives in `apps/web/app/`.
- `apps/web/app/` — frontend source, organized into `routes/`, `features/`, `components/`, `hooks/`, `lib/`, `contexts/`, `stores/`, and `types/`.
- `docs/` — architecture, specs, conventions, deployment, and operational guides.
- `docker/` — dev and production compose files, nginx config, initialization SQL, and deployment scripts.
- `fixtures/` — example datasets and metadata for local development and demos.

## Build, Test, and Development Commands
Run from repo root unless noted.
- `pnpm install` — install workspace dependencies.
- `pnpm dev` — start web and API through Turbo.
- `pnpm dev:web` — start frontend only.
- `pnpm dev:api` — start backend only.
- `pnpm build` — build all packages.
- `pnpm check-types` — run workspace type checks.
- `pnpm lint` — run lint tasks defined by packages.
- `pnpm format` — format `ts/tsx/md` files with Prettier.
- `pnpm dev:docker` — start the local Docker development stack.

Backend workflow from `apps/api/`:
- `uv sync` — install Python dependencies.
- `uv run uvicorn app.main:app --reload --host localhost --port 8000` — run API locally.
- `uv run alembic upgrade head` — apply database migrations.
- `uv run pytest tests` — run backend tests.

Frontend workflow from `apps/web/`:
- `pnpm dev` — run the React Router app.
- `pnpm build` — build production assets.
- `pnpm typecheck` — generate route types and run TypeScript checks.
- `pnpm api:schema` — regenerate typed API schema bindings.

## Coding Style & Naming Conventions
- TypeScript/TSX formatting is managed with Prettier; follow nearby patterns for imports and component layout.
- React code uses file-based routing and feature grouping. Keep route files thin and place reusable UI in `components/` or feature modules in `features/`.
- Frontend component filenames use kebab-case.
- Python modules use snake_case and should keep type hints where practical.
- Prefer small, focused modules over growing orchestration files further.

## Testing Guidelines
- Backend tests live in `apps/api/tests/` and run with `uv run pytest tests` from `apps/api/`.
- The frontend currently has a small number of colocated Node-based tests such as `apps/web/app/features/task/history-output-files.test.ts`; expand this pattern when adding critical pure logic.
- At minimum, run the most relevant checks for touched areas: `pnpm check-types`, backend pytest for API changes, and manual QA for end-to-end flows.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits with short Chinese summaries, for example `feat: 增加意图识别上下文构建` or `fix: 修复导出结果回显逻辑`.
- PRs should include a concise summary, impacted areas, verification commands, and linked issues when relevant.
- UI-facing changes should include screenshots or a short screen recording.

## Configuration Tips
- Root and app-specific `.env` files drive local configuration; check `ENV.md`, `README.md`, and `docker/.env.example` when wiring new environments.
- The frontend proxies `/api` to the backend and `/storage` to MinIO in development; keep that in mind when changing local ports.
- MinIO, PostgreSQL, and Docker bootstrap assets are under `docker/`; prefer updating those assets together with any infra-facing behavior change.
