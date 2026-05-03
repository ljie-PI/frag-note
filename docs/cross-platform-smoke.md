# Cross-Platform Desktop Smoke Verification

> **Status: forward-looking.** This document is intentionally landed ahead of the
> feature work it describes (PRs **#23** foundation, **#24** cross-platform
> Alt+Shift+C via enigo, **#25** drag-to-select screenshot via xcap). Until those
> three PRs merge to `main`, the matrix below describes the **target** behavior.
> The maintainer updates the cells with ✅ / ❌ only after the corresponding code
> has merged AND been manually exercised on the listed platform. **Do not file
> issues against this doc for "feature X is not implemented yet" — that is the
> point of the dependency PRs.**
>
> When all three dependency PRs have merged, remove this banner and update the
> "Scope" reference below to past tense.

This document tracks manual verification of the desktop app's capture UI on Linux,
macOS, and Windows. It is updated by the maintainer after each cross-platform release
candidate. Cells marked **TBD** have not yet been verified on that platform.

> Scope provided by PRs #23 (foundation), #25 (drag-to-select screenshot via xcap),
> and #24 (cross-platform Alt+Shift+C via enigo). Run the matrix only after those
> PRs have merged into `main`.

## How to run the matrix

For each platform:

1. Pull `main` after PRs #23/#24/#25 are merged.
2. Install Linux system deps if applicable (see README "Prerequisites").
3. `bun install`.
4. `cd apps/desktop/src-tauri && cargo build` — confirms native deps OK.
5. From repo root: `bun --env-file=.env run --filter @frag-note/desktop tauri:dev`.
6. Walk through every row in the matrix below; record outcome.
7. For any ❌, file a follow-up issue with platform + repro.

## Voice recording verification (Phase 3)

| Step | Expected |
|---|---|
| Click voice button in main palette → speak → click again | Asset added to capture row with correct icon |
| Submit fragment | Server-side `processing_jobs` row picks up; `derived_artifacts` includes `transcript` after worker run |
| Mime type on the asset payload | Linux/Win: `audio/webm` (with `;codecs=opus`). macOS: `audio/mp4` |
| Filename extension on the local Tauri SQLite payload | matches the mime: `.webm`, `.m4a` (after PR #23 `mime-detect`) |
| First-run on macOS | OS prompt: "frag-note 想访问您的麦克风" — grant once |

## Smoke matrix

| # | Surface | Linux X11 | Linux Wayland | macOS | Windows |
|---|---|---|---|---|---|
| 1 | `tauri dev` boots, main window renders, transparent rounded chrome OK | TBD | TBD | TBD | TBD |
| 2 | First-launch macOS permission prompts: mic + screen recording + accessibility | n/a | n/a | TBD | n/a |
| 3 | Quick-capture **Alt+Shift+C** text-grab works | TBD | TBD ⚠ Wayland fallback toast expected | TBD | TBD |
| 4 | Quick-capture **Alt+Shift+S** opens new screenshot overlay → drag-select → asset added | TBD | TBD | TBD | TBD |
| 5 | Quick-capture **Alt+Shift+V** mic recording, stops on second press, asset added | TBD | TBD | TBD | TBD |
| 6 | Voice in main palette: record → stop → submit → end-to-end processed (see Phase 3) | TBD | TBD | TBD | TBD |
| 7 | Screenshot button in main palette: click → overlay → drag → asset saved | TBD | TBD | TBD | TBD |
| 8 | File drop / paperclip pick into FileDropzone → asset added | TBD | TBD | TBD | TBD |
| 9 | Window controls: minimize / toggle-maximize / close / drag titlebar | TBD | TBD | TBD | TBD |
| 10 | Hi-DPI: cropped screenshot dimensions match user-selected region (no half-res) | TBD | TBD | TBD (Retina 2.0×) | TBD (125%/150% scale) |
| 11 | macOS Accessibility-permission toast appears on first failed Alt+Shift+C; "去设置" deep-links to System Settings | n/a | n/a | TBD | n/a |
| 12 | Wayland-clipboard-fallback toast appears once per session on first Alt+Shift+C | n/a | TBD | n/a | n/a |

## Notes & known gaps

- xcap Wayland support is marked ⛔ for "edge-case scenarios" by upstream — verify on
  GNOME (mutter) and KDE (kwin) compositors at minimum.
- `cargo build` on Linux requires GTK3 + WebKit2GTK dev libs; CI will eventually pin
  these via a pre-built base image (out of scope for this PR set).
- Wayland Alt+Shift+C cannot truly inject `Ctrl+C` into another app per Wayland security
  model. Future enhancement: opt-in `ydotool` daemon support.
- Multi-monitor screenshot overlay currently captures only the cursor's monitor. Spanning
  all monitors at once is a follow-up.

## Per-platform installation tips

### Linux (Debian/Ubuntu)

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libsoup-3.0-dev \
  build-essential pkg-config libssl-dev \
  xdg-desktop-portal-gtk wl-clipboard pipewire pipewire-pulse
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install webkit2gtk4.1-devel gtk3-devel librsvg2-devel libsoup3-devel \
  gcc-c++ pkgconf openssl-devel \
  xdg-desktop-portal-gtk wl-clipboard pipewire pipewire-pulseaudio
```

### Linux (Arch)

```bash
sudo pacman -S webkit2gtk-4.1 gtk3 librsvg libsoup3 base-devel pkgconf openssl \
  xdg-desktop-portal-gtk wl-clipboard pipewire pipewire-pulse
```

### macOS

- macOS 10.15 Catalina or newer.
- Xcode Command Line Tools: `xcode-select --install`.
- On first launch you will see three permission prompts (mic / screen recording /
  accessibility). Grant each in System Settings → Privacy & Security; for screen
  recording you may need to relaunch the app once.

### Windows

- Windows 10 needs the WebView2 Runtime: install from
  <https://developer.microsoft.com/microsoft-edge/webview2/?form=MA13LH#download>.
- Windows 11 ships WebView2.
- Visual Studio Build Tools 2022 with the "Desktop development with C++" workload.

## Sign-off

After all rows above show ✅:

- [ ] Linux X11 verified by `<name>` on `<date>` against commit `<sha>`
- [ ] Linux Wayland verified by `<name>` on `<date>` against commit `<sha>`
- [ ] macOS verified by `<name>` on `<date>` against commit `<sha>`
- [ ] Windows verified by `<name>` on `<date>` against commit `<sha>`
