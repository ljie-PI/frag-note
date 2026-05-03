use tauri::State;

use crate::ShortcutState;

#[tauri::command]
pub fn register_capture_shortcut(
    shortcut: String,
    state: State<'_, ShortcutState>,
) -> Result<String, String> {
    let mut current = state
        .shortcut
        .lock()
        .map_err(|_| String::from("shortcut state poisoned"))?;

    *current = Some(shortcut.clone());
    Ok(shortcut)
}

#[tauri::command]
pub fn current_capture_shortcut(
    state: State<'_, ShortcutState>,
) -> Result<Option<String>, String> {
    let current = state
        .shortcut
        .lock()
        .map_err(|_| String::from("shortcut state poisoned"))?;

    Ok(current.clone())
}

#[tauri::command]
pub fn open_macos_accessibility_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    Err("Only available on macOS".into())
}
