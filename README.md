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

Copy the example environment file first:

```bash
cp .env.example .env
```

Then fill in your Supabase and AI values. These are the variables currently
used by the code on `main`:

```bash
export HOST="0.0.0.0"
export PORT="3000"
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export SUPABASE_STORAGE_RAW_BUCKET="captures-raw"
export SUPABASE_STORAGE_DERIVED_BUCKET="captures-derived"
export SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:5432/sui_note"
export OPENAI_API_KEY="<optional-openai-key>"
export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
```

## Environment Variables

Server-side variables:

- `HOST`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_RAW_BUCKET`
- `SUPABASE_STORAGE_DERIVED_BUCKET`
- `SUPABASE_DB_URL`
- `OPENAI_API_KEY`

Desktop frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase Secrets

Current `main` does not yet contain a checked-in `supabase/functions` directory,
so `supabase secrets` is not required just to run the repo locally. The local
API and worker read server-side variables from your shell or `.env`.

If you later deploy Supabase Edge Functions, mirror the same server-side values
into Supabase secrets. The usual command shape is:

```bash
supabase secrets set \
  SUPABASE_URL="https://<project>.supabase.co" \
  SUPABASE_ANON_KEY="<anon-key>" \
  SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
  SUPABASE_STORAGE_RAW_BUCKET="captures-raw" \
  SUPABASE_STORAGE_DERIVED_BUCKET="captures-derived" \
  OPENAI_API_KEY="<optional-openai-key>"
```

You can also load secrets from the example file with the Supabase CLI's
`--env-file` flag after copying the relevant server-side values into a dedicated
file for functions deployment.

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
