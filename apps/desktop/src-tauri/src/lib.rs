mod commands;
mod selection_grab_flow;

use selection_grab_flow::{
    clipboard_grab_release_settle_duration, clipboard_text_for_result, shortcut_action_for_event,
    with_clipboard_grab_lock, CopyShortcutResult, ShortcutAction, ShortcutKind, ShortcutPhase,
};
use serde::Serialize;
use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState as GsState,
};

#[derive(Default)]
pub struct ShortcutState {
    pub shortcut: Mutex<Option<String>>,
}

#[derive(Clone, Serialize)]
struct QuickCapturePayload {
    mode: String,
    text: String,
}

static EMITTED_ONE_SHOT_EVENTS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();

enum ClipboardTextSnapshot {
    Text(String),
    Empty,
}

fn is_wayland_session() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
        && std::env::var("XDG_SESSION_TYPE")
            .map(|value| value.eq_ignore_ascii_case("wayland"))
            .unwrap_or(false)
}

fn simulate_copy_shortcut() -> CopyShortcutResult {
    if is_wayland_session() {
        return CopyShortcutResult::SkippedWayland;
    }

    use enigo::{Direction, Enigo, Key, Keyboard, Settings};

    let mut enigo = match Enigo::new(&Settings::default()) {
        Ok(enigo) => enigo,
        Err(_) => return CopyShortcutResult::PermissionDenied,
    };

    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;

    if enigo.key(modifier, Direction::Press).is_err() {
        return CopyShortcutResult::PermissionDenied;
    }

    let click_result = enigo.key(Key::Unicode('c'), Direction::Click);
    let release_result = enigo.key(modifier, Direction::Release);

    if click_result.and(release_result).is_ok() {
        CopyShortcutResult::Sent
    } else {
        CopyShortcutResult::PermissionDenied
    }
}

fn capture_clipboard_text_snapshot(clipboard: &mut arboard::Clipboard) -> ClipboardTextSnapshot {
    match clipboard.get_text() {
        Ok(text) => ClipboardTextSnapshot::Text(text),
        Err(_) => ClipboardTextSnapshot::Empty,
    }
}

fn restore_clipboard_text(clipboard: &mut arboard::Clipboard, snapshot: ClipboardTextSnapshot) {
    match snapshot {
        ClipboardTextSnapshot::Text(text) => {
            let _ = clipboard.set_text(text);
        }
        ClipboardTextSnapshot::Empty => {
            let _ = clipboard.clear();
        }
    }
}

fn clipboard_was_cleared(clipboard: &mut arboard::Clipboard) -> bool {
    if clipboard.clear().is_err() {
        return false;
    }

    !matches!(clipboard.get_text(), Ok(text) if !text.is_empty())
}

fn is_fresh_clipboard_text(
    text: &str,
    original: &ClipboardTextSnapshot,
    clipboard_cleared: bool,
) -> bool {
    if text.is_empty() {
        return false;
    }

    if clipboard_cleared {
        return true;
    }

    match original {
        ClipboardTextSnapshot::Text(original_text) => original_text.as_str() != text,
        ClipboardTextSnapshot::Empty => true,
    }
}

fn poll_fresh_clipboard_text(
    clipboard: &mut arboard::Clipboard,
    original: &ClipboardTextSnapshot,
    clipboard_cleared: bool,
) -> String {
    let start = Instant::now();
    while start.elapsed() < Duration::from_millis(500) {
        if let Ok(text) = clipboard.get_text() {
            if is_fresh_clipboard_text(&text, original, clipboard_cleared) {
                return text;
            }
        }
        std::thread::sleep(Duration::from_millis(50));
    }

    String::new()
}

fn grab_clipboard_text() -> String {
    let Ok(mut clipboard) = arboard::Clipboard::new() else {
        return String::new();
    };

    clipboard.get_text().unwrap_or_default()
}

/// Clear before simulating copy so the Sent path only accepts text written by the
/// target app.
fn grab_text_via_simulated_copy() -> (CopyShortcutResult, String) {
    with_clipboard_grab_lock(grab_text_via_simulated_copy_unlocked)
        .unwrap_or((CopyShortcutResult::PermissionDenied, String::new()))
}

fn grab_text_via_simulated_copy_unlocked() -> (CopyShortcutResult, String) {
    if is_wayland_session() {
        let text = grab_clipboard_text();
        return (
            CopyShortcutResult::SkippedWayland,
            clipboard_text_for_result(CopyShortcutResult::SkippedWayland, &text),
        );
    }

    let Ok(mut clipboard) = arboard::Clipboard::new() else {
        let result = simulate_copy_shortcut();
        let text = match result {
            CopyShortcutResult::Sent => String::new(),
            CopyShortcutResult::SkippedWayland => {
                let text = grab_clipboard_text();
                clipboard_text_for_result(result, &text)
            }
            CopyShortcutResult::PermissionDenied => clipboard_text_for_result(result, ""),
        };
        return (result, text);
    };

    let original = capture_clipboard_text_snapshot(&mut clipboard);
    let clipboard_cleared = clipboard_was_cleared(&mut clipboard);

    let result = simulate_copy_shortcut();
    match result {
        CopyShortcutResult::Sent => {
            std::thread::sleep(Duration::from_millis(80));
            let grabbed = poll_fresh_clipboard_text(&mut clipboard, &original, clipboard_cleared);
            restore_clipboard_text(&mut clipboard, original);
            (CopyShortcutResult::Sent, grabbed)
        }
        CopyShortcutResult::SkippedWayland => {
            restore_clipboard_text(&mut clipboard, original);
            let text = grab_clipboard_text();
            (
                CopyShortcutResult::SkippedWayland,
                clipboard_text_for_result(CopyShortcutResult::SkippedWayland, &text),
            )
        }
        CopyShortcutResult::PermissionDenied => {
            restore_clipboard_text(&mut clipboard, original);
            (
                CopyShortcutResult::PermissionDenied,
                clipboard_text_for_result(CopyShortcutResult::PermissionDenied, ""),
            )
        }
    }
}

fn show_quick_capture(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("quick-capture") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

fn emit_quick_capture(app: &tauri::AppHandle, mode: &str, text: String) {
    if let Some(win) = app.get_webview_window("quick-capture") {
        let _ = win.emit(
            "quick-capture",
            QuickCapturePayload {
                mode: mode.into(),
                text,
            },
        );
    }
}

fn emit_one_shot_event(app: &tauri::AppHandle, name: &str) {
    let emitted_events = EMITTED_ONE_SHOT_EVENTS.get_or_init(|| Mutex::new(HashSet::new()));
    let Ok(mut emitted_events) = emitted_events.lock() else {
        return;
    };

    if !emitted_events.insert(name.to_string()) {
        return;
    }
    drop(emitted_events);

    let _ = app.emit(name, ());
}

fn emit_accessibility_permission_needed(app: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    emit_one_shot_event(app, "accessibility-permission-needed");

    #[cfg(not(target_os = "macos"))]
    let _ = app;
}

fn shortcut_kind_for(
    shortcut: &Shortcut,
    clipboard: &Shortcut,
    screenshot: &Shortcut,
    voice: &Shortcut,
) -> ShortcutKind {
    if *shortcut == *clipboard {
        ShortcutKind::Clipboard
    } else if *shortcut == *screenshot {
        ShortcutKind::Screenshot
    } else if *shortcut == *voice {
        ShortcutKind::Voice
    } else {
        ShortcutKind::Unknown
    }
}

fn shortcut_phase_for(state: GsState) -> ShortcutPhase {
    match state {
        GsState::Pressed => ShortcutPhase::Pressed,
        GsState::Released => ShortcutPhase::Released,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let alt_shift_c = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyC);
    let alt_shift_s = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyS);
    let alt_shift_v = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyV);

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    let kind =
                        shortcut_kind_for(shortcut, &alt_shift_c, &alt_shift_s, &alt_shift_v);
                    let action = shortcut_action_for_event(kind, shortcut_phase_for(event.state()));

                    match action {
                        ShortcutAction::Ignore => {}
                        ShortcutAction::GrabClipboard => {
                            let app_handle = app.clone();
                            std::thread::spawn(move || {
                                std::thread::sleep(clipboard_grab_release_settle_duration());
                                let (result, text) = grab_text_via_simulated_copy();
                                show_quick_capture(&app_handle);

                                match result {
                                    CopyShortcutResult::Sent => {
                                        emit_quick_capture(&app_handle, "clipboard", text);
                                    }
                                    CopyShortcutResult::SkippedWayland => {
                                        emit_quick_capture(&app_handle, "clipboard", text);
                                        emit_one_shot_event(
                                            &app_handle,
                                            "wayland-clipboard-fallback",
                                        );
                                    }
                                    CopyShortcutResult::PermissionDenied => {
                                        emit_accessibility_permission_needed(&app_handle);
                                        emit_quick_capture(&app_handle, "clipboard", text);
                                    }
                                }
                            });
                        }
                        ShortcutAction::EmitScreenshot => {
                            if let Err(error) = commands::screenshot::show_screenshot_overlay_window(
                                app,
                                None,
                                Some("quick-capture".into()),
                            ) {
                                eprintln!("failed to show screenshot overlay: {error}");
                            }
                        }
                        ShortcutAction::EmitVoice => {
                            let payload = QuickCapturePayload {
                                mode: "voice".into(),
                                text: String::new(),
                            };

                            show_quick_capture(app);
                            if let Some(win) = app.get_webview_window("quick-capture") {
                                let _ = win.emit("quick-capture", payload);
                            }
                        }
                    }
                })
                .build(),
        )
        .manage(ShortcutState::default())
        .manage(commands::screenshot::PendingScreenshotOverlayRequest::default())
        .setup(move |app| {
            // Register global shortcuts
            let gs = app.global_shortcut();
            gs.register(alt_shift_c)?;
            gs.register(alt_shift_s)?;
            gs.register(alt_shift_v)?;

            // Position quick-capture window at bottom-center of primary monitor
            if let Some(win) = app.get_webview_window("quick-capture") {
                if let Ok(Some(monitor)) = win.primary_monitor() {
                    let screen = monitor.size();
                    let scale = monitor.scale_factor();
                    let logical_w = screen.width as f64 / scale;
                    let logical_h = screen.height as f64 / scale;
                    let win_w = 600.0;
                    let win_h = 240.0;
                    let x = (logical_w - win_w) / 2.0;
                    let y = logical_h - win_h - 48.0;
                    let _ = win
                        .set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::storage::save_fragment_record,
            commands::storage::list_fragment_records,
            commands::storage::get_fragment_record,
            commands::storage::create_screenshot_placeholder,
            commands::storage::create_voice_placeholder,
            commands::storage::read_local_asset_base64,
            commands::screenshot::capture_screens,
            commands::screenshot::capture_monitor_at_point,
            commands::screenshot::capture_monitor_at_cursor,
            commands::screenshot::show_screenshot_overlay,
            commands::screenshot::hide_screenshot_overlay,
            commands::screenshot::take_pending_screenshot_overlay_request,
            commands::shortcuts::register_capture_shortcut,
            commands::shortcuts::current_capture_shortcut,
            commands::shortcuts::open_macos_accessibility_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
