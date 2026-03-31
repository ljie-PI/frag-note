mod commands;

use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState as GsState};

#[derive(Default)]
pub struct ShortcutState {
    pub shortcut: Mutex<Option<String>>,
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

                    let mode = if *shortcut == alt_shift_c {
                        "clipboard"
                    } else if *shortcut == alt_shift_s {
                        "screenshot"
                    } else if *shortcut == alt_shift_v {
                        "voice"
                    } else {
                        return;
                    };

                    // Show the quick-capture window
                    if let Some(win) = app.get_webview_window("quick-capture") {
                        let _ = win.show();
                        let _ = win.set_focus();
                        let _ = win.emit("quick-capture", mode);
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
