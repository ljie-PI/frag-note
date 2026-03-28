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
