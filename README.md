# sui-note
An AI-powered note-taking app for capturing fragmented notes anytime, anywhere. 碎记&amp;随记

## Prerequisites

- `bun@1.3.5`
- For native desktop development: Rust toolchain and Tauri system dependencies

## Quick Start

The easiest way to run the project today is the local in-memory mode. In this
mode, the desktop app talks to a local API server on `http://127.0.0.1:3000`
and you do not need Supabase credentials.

```bash
bun install
```

Terminal 1, start the API:

```bash
bun run --filter @sui-note/api build
bun run --filter @sui-note/api start
```

Terminal 2, start the desktop UI in the browser:

```bash
bun run --filter @sui-note/desktop dev
```

Optional, start the native Tauri shell instead of the browser UI:

```bash
bun run --filter @sui-note/desktop tauri:dev
```

## Supabase Mode

If you want to run the Supabase-backed path, set these environment variables
before starting the API and worker:

```bash
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export SUPABASE_STORAGE_RAW_BUCKET="captures-raw"
export SUPABASE_STORAGE_DERIVED_BUCKET="captures-derived"
export OPENAI_API_KEY="<optional-openai-key>"
```

Then start the API and worker in separate terminals:

```bash
bun run --filter @sui-note/api build
bun run --filter @sui-note/api start
bun run --filter @sui-note/api start:worker
```

To make the desktop app talk directly to Supabase, expose the Vite variables
before launching the desktop UI:

```bash
export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
bun run --filter @sui-note/desktop dev
```

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set, the desktop app
falls back to the local API at `http://127.0.0.1:3000`.

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

- The default local mode uses the in-memory runtime; it is the fastest way to
  verify the main flows without external services.
- The worker is only required for the Supabase-backed processing path.
- On Linux, `tauri:dev` may require extra GTK/WebKit packages from your distro.
