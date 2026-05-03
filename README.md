# frag-note

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

Linux build dependencies:

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install build-essential pkg-config libssl-dev libgtk-3-dev librsvg2-dev libsoup-3.0-dev libwebkit2gtk-4.1-dev

# Fedora / RHEL
sudo dnf install gcc gcc-c++ make pkgconf-pkg-config openssl-devel gtk3-devel librsvg2-devel libsoup3-devel webkit2gtk4.1-devel

# Arch
sudo pacman -S --needed base-devel pkgconf openssl gtk3 librsvg libsoup3 webkit2gtk-4.1
```

Linux runtime dependencies for desktop capture and clipboard integration:

```bash
# Debian / Ubuntu
sudo apt install xdg-desktop-portal xdg-desktop-portal-gtk wl-clipboard pipewire pipewire-pulse

# Fedora / RHEL
sudo dnf install xdg-desktop-portal xdg-desktop-portal-gnome wl-clipboard pipewire pipewire-pulseaudio

# Arch
sudo pacman -S --needed xdg-desktop-portal xdg-desktop-portal-gtk wl-clipboard pipewire pipewire-pulse
```

Use the KDE portal package instead of the GNOME/GTK flavor on KDE. On Wayland, screen capture goes through `xdg-desktop-portal` and shows a one-time prompt; `arboard` clipboard access requires `wl-clipboard`.

Windows 10 users need the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/?form=MA13LH#download) installed. Windows 11 ships it by default.

If `bun install` appears to hang behind a local proxy, unset proxy variables and retry:

```bash
bun install
```

## Environment

Copy the example file first:

```bash
cp .env.example .env
```

For cross-platform usage (including Windows), run commands through Bun with an explicit env file:

```bash
bun --env-file=.env run <command>
```

If you still want to load variables into the current shell on macOS/Linux:

```bash
source .env
```

Variables currently used on `main`:

- Server / worker:
  - `HOST`
  - `PORT`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_RAW_BUCKET`
  - `SUPABASE_STORAGE_DERIVED_BUCKET`
  - `SUPABASE_DB_URL`
  - `LLM_API_KEY` – global default API key
  - `LLM_BASE_URL` – global default base URL
  - `SUMMARY_MODEL`, `SUMMARY_API_KEY`, `SUMMARY_BASE_URL`
  - `EMBEDDING_MODEL`, `EMBEDDING_API_KEY`, `EMBEDDING_BASE_URL`
  - `TRANSCRIPTION_MODEL`, `TRANSCRIPTION_API_KEY`, `TRANSCRIPTION_BASE_URL`
  - `OCR_MODEL`, `OCR_API_KEY`, `OCR_BASE_URL`
- Desktop frontend:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_BASE_URL`

Example exports:

```bash
export HOST="0.0.0.0"
export PORT="3000"
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export SUPABASE_STORAGE_RAW_BUCKET="captures-raw"
export SUPABASE_STORAGE_DERIVED_BUCKET="captures-derived"
export SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:5432/frag_note"
export LLM_API_KEY="<optional-api-key>"
export LLM_BASE_URL="https://api.openai.com/v1"
export SUMMARY_MODEL="gpt-4.1-mini"
# export SUMMARY_API_KEY="<override-key>"
# export SUMMARY_BASE_URL="<override-url>"
export EMBEDDING_MODEL="text-embedding-3-small"
# export EMBEDDING_API_KEY="<override-key>"
# export EMBEDDING_BASE_URL="<override-url>"
export TRANSCRIPTION_MODEL="gpt-4o-mini-transcribe"
# export TRANSCRIPTION_API_KEY="<override-key>"
# export TRANSCRIPTION_BASE_URL="<override-url>"
export OCR_MODEL="gpt-4.1-mini"
# export OCR_API_KEY="<override-key>"
# export OCR_BASE_URL="<override-url>"
export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
export VITE_API_BASE_URL="http://127.0.0.1:3000"
```

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
```

4. Set function secrets (for the active Edge Functions above).

```bash
supabase secrets set \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
```

Current checked-in Edge Functions read:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`LLM_*`, `SUMMARY_*`, `EMBEDDING_*`, `TRANSCRIPTION_*`, `OCR_*`, `SUPABASE_STORAGE_RAW_BUCKET`, `SUPABASE_STORAGE_DERIVED_BUCKET`, `HOST`,
`PORT`, and `SUPABASE_DB_URL` are relevant for the local API/worker runtime.

## Install

```bash
bun install
```

## Run

Terminal 1, start the API shell:

```bash
bun --env-file=.env run --filter @frag-note/api build
bun --env-file=.env run --filter @frag-note/api start
```

Terminal 2, start the worker:

```bash
bun --env-file=.env run --filter @frag-note/api start:worker
```

Terminal 3, start the desktop UI in the browser:

```bash
bun --env-file=.env run --filter @frag-note/desktop dev
```

Optional, start the native desktop shell:

```bash
bun --env-file=.env run --filter @frag-note/desktop tauri:dev
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

Run API tests only:

```bash
bun --env-file=.env run --filter @frag-note/api test
```

Run desktop tests only:

```bash
bun --env-file=.env run --filter @frag-note/desktop test
```

## Production Notes

- Keep the worker running. `processing_jobs` now use claim, lease, heartbeat, retry, and terminal-failure semantics.
- Raw and derived storage are user-scoped by object key prefix.
- The desktop client now requires a real Supabase login and automatically refreshes expired sessions.
- OCR, transcription, embeddings, summaries, and search answers use OpenAI when configured, and deterministic fallbacks otherwise.
- On Linux, `tauri:dev` may still require extra GTK/WebKit packages from your distro.
