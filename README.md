# sui-note

An AI-powered note-taking app for capturing fragmented notes anytime, anywhere. 碎记&随记

## Architecture

This repository now runs in `Supabase-only` mode.

- `Supabase Auth` for user identity
- `Supabase Postgres` for fragments, assets, artifacts, relations, derived objects, answers, and processing jobs
- `Supabase Storage` for raw and derived assets
- `Supabase Edge Functions` for controlled write workflows
- `bun` worker for OCR, transcription, embeddings, summaries, linking, and answer synthesis
- `Tauri 2 + React` desktop client

There is no local in-memory runtime fallback.

## Prerequisites

- `bun@1.3.5`
- `supabase` CLI
- For native desktop development: Rust toolchain and Tauri system dependencies
- Optional: OpenAI API key for provider-backed OCR, transcription, summaries, and embeddings

If `bun install` appears to hang behind a local proxy, unset proxy variables and retry:

```bash
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
bun install
```

## Environment

Export the shared runtime variables:

```bash
cp .env.example .env
source .env

export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export SUPABASE_STORAGE_RAW_BUCKET="captures-raw"
export SUPABASE_STORAGE_DERIVED_BUCKET="captures-derived"

export OPENAI_API_KEY="<optional-openai-key>"
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_SUMMARY_MODEL="gpt-4.1-mini"
export OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
export OPENAI_TRANSCRIPTION_MODEL="gpt-4o-mini-transcribe"
export OPENAI_OCR_MODEL="gpt-4.1-mini"

export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
```

Or fill in `.env.example` and load it from your shell.

## Supabase Setup

1. Link the repo to your Supabase project.

```bash
supabase link --project-ref <project-ref>
```

2. Apply the SQL migrations in `supabase/migrations/`.

```bash
supabase db push
```

3. Deploy the Edge Functions in `supabase/functions/`.

```bash
supabase functions deploy device-session
supabase functions deploy capture-fragment
supabase functions deploy retry-fragment
supabase functions deploy review-derived-object
supabase functions deploy search-query
supabase functions deploy promote-answer
```

4. Set function secrets.

```bash
supabase secrets set \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  OPENAI_BASE_URL="$OPENAI_BASE_URL" \
  OPENAI_SUMMARY_MODEL="$OPENAI_SUMMARY_MODEL" \
  OPENAI_EMBEDDING_MODEL="$OPENAI_EMBEDDING_MODEL" \
  OPENAI_TRANSCRIPTION_MODEL="$OPENAI_TRANSCRIPTION_MODEL" \
  OPENAI_OCR_MODEL="$OPENAI_OCR_MODEL"
```

## Install

```bash
bun install
```

## Run

Terminal 1, start the API shell:

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

Optional, start the native desktop shell:

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
bun test ./tests
```

Run API tests only:

```bash
bun run --filter @sui-note/api test
```

Run desktop tests only:

```bash
bun run --filter @sui-note/desktop test
```

## Production Notes

- Keep the worker running. `processing_jobs` now use claim, lease, heartbeat, retry, and terminal-failure semantics.
- Raw and derived storage are user-scoped by object key prefix.
- The desktop client now requires a real Supabase login and automatically refreshes expired sessions.
- OCR, transcription, embeddings, summaries, and search answers use OpenAI when configured, and deterministic fallbacks otherwise.
- On Linux, `tauri:dev` may still require extra GTK/WebKit packages from your distro.
