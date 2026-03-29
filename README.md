# sui-note
An AI-powered note-taking app for capturing fragmented notes anytime, anywhere. 碎记&amp;随记

## Prerequisites

- `bun@1.3.5`
- For native desktop development: Rust toolchain and Tauri system dependencies

## Quick Start

This project now runs in `Supabase-only` mode. The API, worker, and desktop app
all expect Supabase configuration. There is no local in-memory fallback runtime.

```bash
bun install
```

Export your Supabase and AI environment first:

```bash
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export SUPABASE_STORAGE_RAW_BUCKET="captures-raw"
export SUPABASE_STORAGE_DERIVED_BUCKET="captures-derived"
export OPENAI_API_KEY="<optional-openai-key>"
export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
```

Terminal 1, start the API:

```bash
bun run --filter @sui-note/api build
bun run --filter @sui-note/api start
```

Terminal 2, start the worker:

```bash
bun run --filter @sui-note/api start:worker
```

Terminal 3, start the desktop UI in the browser:

```bash
bun run --filter @sui-note/desktop dev
```

Optional, start the native Tauri shell instead of the browser UI:

```bash
bun run --filter @sui-note/desktop tauri:dev
```

## Common Commands

Build everything:

```bash
bun run build
```

Run all tests:

```bash
bun run test
```

Run workspace lint placeholders:

```bash
bun run lint
```

Run only API tests:

```bash
bun run --filter @sui-note/api test
```

Run only desktop tests:

```bash
bun run --filter @sui-note/desktop test
```

## Notes

- Missing Supabase environment variables now cause startup failures by design.
- The worker is part of the default runtime and should be running for background
  processing.
- On Linux, `tauri:dev` may require extra GTK/WebKit packages from your distro.
