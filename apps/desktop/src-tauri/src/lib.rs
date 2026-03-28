mod commands;

use std::sync::Mutex;

#[derive(Default)]
pub struct ShortcutState {
    pub shortcut: Mutex<Option<String>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ShortcutState::default())
        .invoke_handler(tauri::generate_handler![
            commands::storage::save_fragment_record,
            commands::storage::list_fragment_records,
            commands::storage::get_fragment_record,
            commands::storage::create_screenshot_placeholder,
            commands::storage::create_voice_placeholder,
            commands::shortcuts::register_capture_shortcut,
            commands::shortcuts::current_capture_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
