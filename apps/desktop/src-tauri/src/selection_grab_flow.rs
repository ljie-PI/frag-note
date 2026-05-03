use std::sync::{Mutex, OnceLock};
use std::time::Duration;

static CLIPBOARD_GRAB_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CopyShortcutResult {
    Sent,
    SkippedWayland,
    PermissionDenied,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ShortcutAction {
    Ignore,
    GrabClipboard,
    EmitScreenshot,
    EmitVoice,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ShortcutKind {
    Clipboard,
    Screenshot,
    Voice,
    Unknown,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ShortcutPhase {
    Pressed,
    Released,
}

pub fn shortcut_action_for_event(kind: ShortcutKind, phase: ShortcutPhase) -> ShortcutAction {
    match (kind, phase) {
        (ShortcutKind::Clipboard, ShortcutPhase::Released) => ShortcutAction::GrabClipboard,
        (ShortcutKind::Screenshot, ShortcutPhase::Pressed) => ShortcutAction::EmitScreenshot,
        (ShortcutKind::Voice, ShortcutPhase::Pressed) => ShortcutAction::EmitVoice,
        _ => ShortcutAction::Ignore,
    }
}

pub fn clipboard_text_for_result(result: CopyShortcutResult, candidate_text: &str) -> String {
    match result {
        CopyShortcutResult::Sent | CopyShortcutResult::SkippedWayland => candidate_text.to_owned(),
        CopyShortcutResult::PermissionDenied => String::new(),
    }
}

pub fn with_clipboard_grab_lock<R>(operation: impl FnOnce() -> R) -> Option<R> {
    let lock = CLIPBOARD_GRAB_LOCK.get_or_init(|| Mutex::new(()));
    let Ok(_guard) = lock.lock() else {
        return None;
    };

    Some(operation())
}

pub fn clipboard_grab_release_settle_duration() -> Duration {
    Duration::from_millis(120)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc,
    };
    use std::thread;

    #[test]
    fn clipboard_shortcut_waits_for_release_before_grabbing_selection() {
        assert_eq!(
            shortcut_action_for_event(ShortcutKind::Clipboard, ShortcutPhase::Pressed),
            ShortcutAction::Ignore
        );
        assert_eq!(
            shortcut_action_for_event(ShortcutKind::Clipboard, ShortcutPhase::Released),
            ShortcutAction::GrabClipboard
        );
    }

    #[test]
    fn direct_shortcuts_still_emit_on_press() {
        assert_eq!(
            shortcut_action_for_event(ShortcutKind::Screenshot, ShortcutPhase::Pressed),
            ShortcutAction::EmitScreenshot
        );
        assert_eq!(
            shortcut_action_for_event(ShortcutKind::Voice, ShortcutPhase::Pressed),
            ShortcutAction::EmitVoice
        );
        assert_eq!(
            shortcut_action_for_event(ShortcutKind::Screenshot, ShortcutPhase::Released),
            ShortcutAction::Ignore
        );
    }

    #[test]
    fn permission_denied_never_returns_existing_clipboard_text() {
        assert_eq!(
            clipboard_text_for_result(CopyShortcutResult::PermissionDenied, "secret clipboard"),
            ""
        );
        assert_eq!(
            clipboard_text_for_result(CopyShortcutResult::SkippedWayland, "user copied text"),
            "user copied text"
        );
        assert_eq!(
            clipboard_text_for_result(CopyShortcutResult::Sent, "fresh selection"),
            "fresh selection"
        );
    }

    #[test]
    fn clipboard_grab_lock_serializes_operations() {
        let (first_started_tx, first_started_rx) = mpsc::channel();
        let (release_first_tx, release_first_rx) = mpsc::channel();
        let second_entered = Arc::new(AtomicBool::new(false));

        let first = thread::spawn(move || {
            with_clipboard_grab_lock(|| {
                first_started_tx.send(()).unwrap();
                release_first_rx.recv().unwrap();
            });
        });

        first_started_rx.recv().unwrap();

        let second_entered_for_thread = Arc::clone(&second_entered);
        let second = thread::spawn(move || {
            with_clipboard_grab_lock(|| {
                second_entered_for_thread.store(true, Ordering::SeqCst);
            });
        });

        thread::sleep(Duration::from_millis(50));
        assert!(!second_entered.load(Ordering::SeqCst));

        release_first_tx.send(()).unwrap();
        first.join().unwrap();
        second.join().unwrap();

        assert!(second_entered.load(Ordering::SeqCst));
    }

    #[test]
    fn clipboard_grab_waits_briefly_after_shortcut_release() {
        assert!(clipboard_grab_release_settle_duration() >= Duration::from_millis(50));
    }
}
