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
