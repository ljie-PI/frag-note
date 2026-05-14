use serde::Serialize;
use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Manager};

#[derive(Clone, Serialize)]
pub(crate) struct QuickCapturePayload {
    pub(crate) mode: String,
    pub(crate) text: String,
}

static EMITTED_ONE_SHOT_EVENTS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();

pub(crate) fn show_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

pub(crate) fn should_hide_main_window(is_visible: bool, is_minimized: bool) -> bool {
    is_visible && !is_minimized
}

pub(crate) fn should_prevent_main_window_close(label: &str, is_quitting: bool) -> bool {
    label == "main" && !is_quitting
}

pub(crate) fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        if should_hide_main_window(
            win.is_visible().unwrap_or(false),
            win.is_minimized().unwrap_or(false),
        ) {
            let _ = win.hide();
        } else {
            show_main_window(app);
        }
    }
}

pub(crate) fn show_quick_capture(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("quick-capture") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

pub(crate) fn emit_quick_capture(app: &tauri::AppHandle, mode: &str, text: String) {
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

pub(crate) fn emit_one_shot_event(app: &tauri::AppHandle, name: &str) {
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

pub(crate) fn emit_accessibility_permission_needed(app: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    emit_one_shot_event(app, "accessibility-permission-needed");

    #[cfg(not(target_os = "macos"))]
    let _ = app;
}

#[cfg(test)]
mod tests {
    use super::{should_hide_main_window, should_prevent_main_window_close};

    #[test]
    fn tray_toggle_hides_only_visible_unminimized_main_window() {
        assert!(should_hide_main_window(true, false));
        assert!(!should_hide_main_window(true, true));
        assert!(!should_hide_main_window(false, false));
    }

    #[test]
    fn close_interceptor_allows_quit_and_non_main_windows() {
        assert!(should_prevent_main_window_close("main", false));
        assert!(!should_prevent_main_window_close("main", true));
        assert!(!should_prevent_main_window_close("quick-capture", false));
    }
}
