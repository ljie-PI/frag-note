# frag-note

AI-powered fragmented note-taking app. 碎记&随记

## Architecture Overview

Bun monorepo with two apps and four shared packages, backed by Supabase.

```
apps/api          Fastify HTTP server + async processing worker
apps/desktop      Tauri 2 + React 19 desktop client (Rust native layer)
packages/domain   Zod schemas — single source of truth for all types
packages/contracts API request/response schemas (depends on domain)
packages/config   Shared configuration
packages/testing  Test fixtures and seed data
supabase/         Edge Functions + SQL migrations
tests/            Centralized test directory (mirrors package structure)
```

### Package Dependency Direction

```
desktop → contracts → domain
api     → contracts → domain
```

Never import from `apps/` into `packages/`. Never import `api` from `desktop` or vice versa.

### Data Flow

```
Desktop capture → Supabase Auth → API ingest → processing_jobs queue
Worker claims job → OCR/transcription → embeddings/summaries → relations → candidates
```

## Key Patterns

### Domain Models
- All models defined as Zod schemas in `packages/domain/src/models/`
- Exported via `packages/domain/src/index.ts`
- Used by both API and desktop — change once, propagate everywhere

### API Runtime Interface
- `apps/api/src/runtime/runtime.ts` — abstract `ApiRuntime` interface
- `apps/api/src/runtime/supabase-runtime.ts` — Supabase implementation
- Methods return `Result<T>` for operations that can fail with business errors (not found, validation)
- Infrastructure errors (Supabase client failures) still throw via `throwIfError()`

### Error Handling
- `Result<T>` type (`packages/domain/src/result.ts`) — `ok(data)` / `err(message, code)`
- Route handlers pattern-match on `result.ok` and map `result.code` to HTTP status
- Global Fastify error handler catches uncaught throws → 401 (AuthorizationError) or 500

### Desktop Native Layer (Rust)
- `apps/desktop/src-tauri/src/clipboard.rs` — clipboard simulation, snapshot/restore
- `apps/desktop/src-tauri/src/window.rs` — quick-capture window management, event emission
- `apps/desktop/src-tauri/src/commands/` — Tauri commands (storage, screenshot, shortcuts)
- **Rule:** Rust handles I/O and OS integration only. No business logic in native layer.

### Processing Worker
- `runSupabaseProcessingLoop()` in `supabase-runtime.ts`
- Job semantics: claim → lease → heartbeat → retry (max 3 attempts) → terminal failure
- Steps: fetch fragment → build artifacts (LLM-backed with heuristic fallback) → build relations → build organization candidates (heuristic topic/project/entity clustering)

## Coding Conventions

- **Commits:** Conventional format (`feat`, `fix`, `refactor`, `chore`, `docs`)
- **Package manager:** Bun 1.3.5
- **Linter:** Biome 2.4 (lint errors block CI, warnings allowed, formatter disabled)
- **Validation:** Zod for all external data boundaries
- **Tests:** Bun test runner, files in centralized `tests/` directory
- **Branches:** Feature branches → draft PR → review → squash merge

## Database

- **Engine:** PostgreSQL via Supabase
- **ORM:** Drizzle (`apps/api/src/db/schema*.ts`)
- **Migrations:** Raw SQL in `supabase/migrations/` (sequential timestamp naming: `YYYYMMDDNNNN_description.sql`)
- **Constraints:** CHECK constraints on all enum text columns (aligned with Zod schemas)
- **Security:** RLS policies on all tables (user_id scoping), service role for worker operations
- **Key tables:** fragments, assets, derived_artifacts, derived_objects, derived_object_fragments (junction), relations, processing_jobs, answers

## Edge Functions vs API

| Operation | Edge Function | API Route | Canonical Path |
|-----------|:---:|:---:|----------------|
| Device session | `device-session` | — | Edge Function |
| Fragment capture | `capture-fragment` | `POST /v1/fragments` | API |
| Search | deprecated (410) | `POST /v1/search` | API only |
| Derived object review | `review-derived-object` | `POST /v1/derived-objects/:id/{action}` | API |

API is canonical for all authenticated operations. Edge Functions `search-query` and `promote-answer` return HTTP 410.

## Verification Commands

```bash
# TypeScript tests
bun run --filter @frag-note/domain test
bun run --filter @frag-note/contracts test
bun run --filter @frag-note/api test:shell

# Lint
bun run lint

# Rust check (from apps/desktop/src-tauri/)
cargo check

# All tests
bun run test
```
