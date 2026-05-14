mod clipboard;
mod commands;
mod selection_grab_flow;
mod window;

use clipboard::grab_text_via_simulated_copy;
use selection_grab_flow::{
    clipboard_grab_release_settle_duration, shortcut_action_for_event, CopyShortcutResult,
    ShortcutAction, ShortcutKind, ShortcutPhase,
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState as GsState,
};
use window::{
    emit_accessibility_permission_needed, emit_one_shot_event, emit_quick_capture,
    should_prevent_main_window_close, show_main_window, show_quick_capture, toggle_main_window,
    QuickCapturePayload,
};

#[derive(Default)]
pub struct ShortcutState {
    pub shortcut: Mutex<Option<String>>,
}

#[derive(Default)]
pub struct TrayExitState {
    pub is_quitting: AtomicBool,
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
        .manage(TrayExitState::default())
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

            let show_item =
                MenuItem::with_id(app, "show-main", "Show main window", true, None::<&str>)?;
            let quick_item =
                MenuItem::with_id(app, "show-quick", "Quick capture", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quick_item, &quit_item])?;
            let tray_icon = app.default_window_icon().cloned().ok_or_else(|| {
                std::io::Error::new(std::io::ErrorKind::NotFound, "no default window icon")
            })?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
                .tooltip("Frag Note Desktop")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app_handle, event| match event.id.as_ref() {
                    "show-main" => show_main_window(app_handle),
                    "show-quick" => show_quick_capture(app_handle),
                    "quit" => {
                        app_handle
                            .state::<TrayExitState>()
                            .is_quitting
                            .store(true, Ordering::SeqCst);
                        app_handle.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let is_quitting = window
                    .state::<TrayExitState>()
                    .is_quitting
                    .load(Ordering::SeqCst);
                if should_prevent_main_window_close(window.label(), is_quitting) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
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
