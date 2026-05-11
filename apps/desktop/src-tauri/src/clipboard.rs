use crate::selection_grab_flow::{
    clipboard_text_for_result, with_clipboard_grab_lock,
    CopyShortcutResult,
};
use std::time::{Duration, Instant};

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
pub(crate) fn grab_text_via_simulated_copy() -> (CopyShortcutResult, String) {
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
