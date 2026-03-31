mod commands;

use std::sync::Mutex;
use std::time::{Duration, Instant};
use serde::Serialize;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState as GsState};

#[derive(Default)]
pub struct ShortcutState {
    pub shortcut: Mutex<Option<String>>,
}

#[derive(Clone, Serialize)]
struct QuickCapturePayload {
    mode: String,
    text: String,
}

/// Simulate Ctrl+C on Windows to copy the current selection to clipboard.
#[cfg(target_os = "windows")]
fn simulate_ctrl_c() {
    extern "system" {
        fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
    }
    const VK_CONTROL: u8 = 0x11;
    const VK_C: u8 = 0x43;
    const KEYEVENTF_KEYUP: u32 = 0x0002;

    unsafe {
        keybd_event(VK_CONTROL, 0, 0, 0);
        keybd_event(VK_C, 0, 0, 0);
        keybd_event(VK_C, 0, KEYEVENTF_KEYUP, 0);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
    }
}

#[cfg(not(target_os = "windows"))]
fn simulate_ctrl_c() {
    // Not implemented for non-Windows platforms
}

/// Grab the currently selected text from any application.
/// Clears clipboard, simulates Ctrl+C, polls for up to 1s.
fn grab_selection() -> String {
    let Ok(mut clipboard) = arboard::Clipboard::new() else {
        return String::new();
    };

    // Save original clipboard and clear
    let original = clipboard.get_text().ok();
    let _ = clipboard.clear();

    // Simulate Ctrl+C
    simulate_ctrl_c();

    // Poll clipboard every 50ms for up to 1s
    let start = Instant::now();
    let mut selected = String::new();
    while start.elapsed() < Duration::from_millis(1000) {
        std::thread::sleep(Duration::from_millis(50));
        if let Ok(text) = clipboard.get_text() {
            if !text.is_empty() {
                selected = text;
                break;
            }
        }
    }

    // Restore original clipboard
    if let Some(orig) = original {
        let _ = clipboard.set_text(orig);
    } else {
        let _ = clipboard.clear();
    }

    selected
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
                    if event.state() != GsState::Pressed {
                        return;
                    }

                    let payload = if *shortcut == alt_shift_c {
                        let text = grab_selection();
                        QuickCapturePayload { mode: "clipboard".into(), text }
                    } else if *shortcut == alt_shift_s {
                        QuickCapturePayload { mode: "screenshot".into(), text: String::new() }
                    } else if *shortcut == alt_shift_v {
                        QuickCapturePayload { mode: "voice".into(), text: String::new() }
                    } else {
                        return;
                    };

                    if let Some(win) = app.get_webview_window("quick-capture") {
                        let _ = win.show();
                        let _ = win.set_focus();
                        let _ = win.emit("quick-capture", payload);
                    }
                })
                .build(),
        )
        .manage(ShortcutState::default())
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
                    let win_h = 260.0;
                    let x = (logical_w - win_w) / 2.0;
                    let y = logical_h - win_h - 48.0;
                    let _ = win.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
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
            commands::shortcuts::register_capture_shortcut,
            commands::shortcuts::current_capture_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
