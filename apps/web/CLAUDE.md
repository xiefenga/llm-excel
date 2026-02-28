# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (from monorepo root)
pnpm dev          # starts both web + api
pnpm --filter @selgetabel/web dev  # web only

# Build & type-check
pnpm --filter @selgetabel/web build
pnpm --filter @selgetabel/web typecheck

# Regenerate OpenAPI types from backend schema
pnpm --filter @selgetabel/web api:schema
```

## Architecture

**React Router v7** (SSR-enabled, file-based routing) + **Tailwind CSS v4** + **TanStack Query** for data fetching.

### Routing

File-based routes in `app/routes/`. Naming convention uses dot-separated segments with layout nesting:

- `_auth.tsx` — auth guard layout (checks login)
- `_auth._app.tsx` — main app shell (header + sidebar)
- `_auth._app.admin.*` — admin pages
- `_public.*` — public pages (login, register)

Dynamic params use `$param` (e.g., `_auth._app.admin.provider.$providerId.tsx`).

### Key Directories

- `app/routes/` — Page components (thin, delegate to features)
- `app/features/` — Feature modules grouped by domain (admin, thread, auth, etc.)
- `app/components/` — Shared components (app-level + `ui/` for primitives)
- `app/lib/` — API clients, types, utilities
- `app/hooks/` — Shared hooks

### API Layer

Two API clients coexist:

- `lib/client.ts` — **openapi-fetch** typed client (`/api/*` prefix, auto-proxied to backend)
- `lib/api.ts` — **axios**-based client for legacy endpoints and SSE streaming

SSE streaming uses `fetch-event-stream` for real-time processing events.

### State Management

- **TanStack Query** for server state (queries + mutations)
- **Zustand** for client-side UI state
- **Immer** (via `use-immer`) for complex state updates

### UI Components

- `app/components/ui/` — shadcn/ui primitives (Radix UI + CVA)
- `@lobehub/icons` — LLM provider icons
- `lucide-react` — General icons
- `sonner` — Toast notifications

## Component Conventions

See [docs/COMPONENT_CONVENTIONS.md](../../docs/COMPONENT_CONVENTIONS.md) for full rules:

- Define components with `const` + arrow function (no `function` declarations)
- Named export → `export const Xxx = ...`
- Default export → define first, then `export default Xxx` at the bottom
- One component per file; use directory + `index.tsx` for sub-components

## Path Alias

`~/` maps to `app/` (configured in tsconfig `paths`).
