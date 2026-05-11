mod clipboard;
mod commands;
mod selection_grab_flow;
mod window;

use clipboard::grab_text_via_simulated_copy;
use selection_grab_flow::{
    clipboard_grab_release_settle_duration, shortcut_action_for_event, CopyShortcutResult,
    ShortcutAction, ShortcutKind, ShortcutPhase,
};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState as GsState,
};
use window::{
    emit_accessibility_permission_needed, emit_one_shot_event, emit_quick_capture,
    show_quick_capture, QuickCapturePayload,
};

#[derive(Default)]
pub struct ShortcutState {
    pub shortcut: Mutex<Option<String>>,
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
