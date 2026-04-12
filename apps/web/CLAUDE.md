# CLAUDE.md

This file provides guidance to Claude Code when working in `apps/web/`.

## Commands

```bash
# From repo root
pnpm dev:web

# From apps/web
pnpm dev
pnpm build
pnpm typecheck
pnpm api:schema
```

## Architecture

The frontend uses **React Router v7** with **SSR enabled**, **Vite**, **TypeScript**, **Tailwind CSS v4**, and **TanStack Query**.

### Directory Structure

```
app/
├── routes/            # File-based routes and layouts
├── features/          # Domain modules: task, admin, auth, fixture, btrack
├── components/        # Shared UI, layout, logo, chat, and primitive components
├── hooks/             # Reusable React hooks
├── lib/               # API clients, config, utils, permissions, SSE helpers
├── contexts/          # React context providers
├── stores/            # Local client state
├── api/               # Route-adjacent API helpers
├── assets/            # Static assets and SVGs
└── types/             # Generated or shared frontend types
```

### Routing

- Routing is file-based under `app/routes/`.
- `_auth.*` files define authenticated shells and pages.
- `_public.*` files define unauthenticated pages such as login and register.
- Admin pages live under `_auth._app.admin.*`.
- Dynamic params use React Router file conventions such as `$providerId`.

### Feature Boundaries

- `features/task/` contains the main task workbench and processing UI.
- `features/admin/` contains provider, thread, user, and admin-facing pages.
- `features/fixture/` supports fixture-driven demos and previews.
- Shared visual primitives belong in `components/`, not in feature folders.

### API And State

- `app/lib/client.ts` is the typed `openapi-fetch` client.
- `app/lib/api.ts` handles axios-based requests and streaming flows.
- The app uses TanStack Query for server state and Zustand for local UI state.
- `fetch-event-stream` is used for SSE-style incremental updates.

### Local Development Assumptions

- `vite.config.ts` proxies `/api` to `API_BASE_URL` and `/storage` to local MinIO.
- `~/` resolves to `app/`.
- API type generation is handled by `pnpm api:schema`.

## Testing

- There is at least some colocated frontend logic coverage, for example `app/features/task/history-output-files.test.ts`.
- Do not assume a broad frontend test harness is in place; verify how a touched module is currently exercised before adding new tests.
- For most frontend changes, `pnpm typecheck` plus manual QA is the baseline.

## Component Conventions

- Prefer route files as composition layers, with heavier UI and logic living in `features/` or `components/`.
- Keep shared UI filenames in kebab-case.
- Follow existing patterns for shadcn-style primitives in `components/ui/`.
- Before changing API access patterns, check whether the target call path belongs in the typed client, the axios client, or the SSE helper layer.
