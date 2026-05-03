use base64::{engine::general_purpose::STANDARD, Engine as _};
use mouse_position::mouse_position::Mouse;
use serde::Serialize;
use std::{io::Cursor, panic, sync::Mutex};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use xcap::Monitor;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotOverlayRequest {
    pub request_id: Option<String>,
    pub target_label: Option<String>,
    pub cursor_x: Option<i32>,
    pub cursor_y: Option<i32>,
}

#[derive(Serialize)]
pub struct MonitorCapture {
    pub id: u32,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f32,
    pub is_primary: bool,
    pub base64_png: String,
}

#[derive(Default)]
pub struct PendingScreenshotOverlayRequest {
    request: Mutex<Option<ScreenshotOverlayRequest>>,
}

#[tauri::command]
pub async fn capture_screens() -> Result<Vec<MonitorCapture>, String> {
    tauri::async_runtime::spawn_blocking(capture_screens_blocking)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn capture_monitor_at_point(x: i32, y: i32) -> Result<MonitorCapture, String> {
    tauri::async_runtime::spawn_blocking(move || capture_monitor_at_point_blocking(x, y))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn capture_monitor_at_cursor() -> Result<MonitorCapture, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let target = monitor_at_cursor_or_primary()?;
        capture_monitor(target.monitor)
    })
    .await
    .map_err(|error| error.to_string())?
}

fn capture_screens_blocking() -> Result<Vec<MonitorCapture>, String> {
    let monitors = Monitor::all().map_err(|error| error.to_string())?;
    monitors.into_iter().map(capture_monitor).collect()
}

fn capture_monitor_at_point_blocking(x: i32, y: i32) -> Result<MonitorCapture, String> {
    let monitor = Monitor::from_point(x, y).map_err(|error| error.to_string())?;
    capture_monitor(monitor)
}

fn capture_monitor(monitor: Monitor) -> Result<MonitorCapture, String> {
    let id = monitor.id().map_err(|error| error.to_string())?;
    let x = monitor.x().map_err(|error| error.to_string())?;
    let y = monitor.y().map_err(|error| error.to_string())?;
    let width = monitor.width().map_err(|error| error.to_string())?;
    let height = monitor.height().map_err(|error| error.to_string())?;
    let scale_factor = monitor.scale_factor().map_err(|error| error.to_string())?;
    let is_primary = monitor.is_primary().map_err(|error| error.to_string())?;
    let image = monitor.capture_image().map_err(|error| error.to_string())?;
    let mut buffer = Vec::new();

    image
        .write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::Png)
        .map_err(|error| error.to_string())?;

    Ok(MonitorCapture {
        id,
        x,
        y,
        width,
        height,
        scale_factor,
        is_primary,
        base64_png: STANDARD.encode(buffer),
    })
}

#[tauri::command]
pub fn show_screenshot_overlay(
    app: AppHandle,
    request_id: Option<String>,
    target_label: Option<String>,
) -> Result<(), String> {
    show_screenshot_overlay_window(&app, request_id, target_label)
}

#[tauri::command]
pub fn hide_screenshot_overlay(app: AppHandle) -> Result<(), String> {
    app.get_webview_window("screenshot-overlay")
        .ok_or_else(|| String::from("screenshot-overlay window not found"))?
        .hide()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn take_pending_screenshot_overlay_request(
    state: tauri::State<'_, PendingScreenshotOverlayRequest>,
) -> Result<Option<ScreenshotOverlayRequest>, String> {
    let mut pending = state
        .request
        .lock()
        .map_err(|_| String::from("pending screenshot overlay request lock poisoned"))?;

    Ok(pending.take())
}

pub fn show_screenshot_overlay_window(
    app: &AppHandle,
    request_id: Option<String>,
    target_label: Option<String>,
) -> Result<(), String> {
    let window = app
        .get_webview_window("screenshot-overlay")
        .ok_or_else(|| String::from("screenshot-overlay window not found"))?;
    let target = monitor_at_cursor_or_primary()?;
    let request = ScreenshotOverlayRequest {
        request_id,
        target_label,
        cursor_x: Some(target.capture_x),
        cursor_y: Some(target.capture_y),
    };

    store_pending_screenshot_overlay_request(app, request.clone())?;
    position_overlay_on_monitor(&window, &target.monitor)?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    window
        .emit("screenshot-overlay-request", request)
        .map_err(|error| error.to_string())
}

struct TargetMonitor {
    monitor: Monitor,
    capture_x: i32,
    capture_y: i32,
}

fn monitor_at_cursor_or_primary() -> Result<TargetMonitor, String> {
    if let Ok((x, y)) = cursor_position() {
        if let Ok(monitor) = Monitor::from_point(x, y) {
            return Ok(TargetMonitor {
                monitor,
                capture_x: x,
                capture_y: y,
            });
        }
    }

    let monitor = primary_or_first_monitor()?;
    let (capture_x, capture_y) = monitor_center_point(&monitor)?;

    Ok(TargetMonitor {
        monitor,
        capture_x,
        capture_y,
    })
}

fn cursor_position() -> Result<(i32, i32), String> {
    let mouse = panic::catch_unwind(Mouse::get_mouse_position)
        .map_err(|_| String::from("failed to query mouse position"))?;

    match mouse {
        Mouse::Position { x, y } => Ok((x, y)),
        Mouse::Error => Err(String::from("failed to query mouse position")),
    }
}

fn primary_or_first_monitor() -> Result<Monitor, String> {
    let mut monitors = Monitor::all().map_err(|error| error.to_string())?;
    if monitors.is_empty() {
        return Err(String::from("no monitors available"));
    }

    let index = monitors
        .iter()
        .position(|monitor| monitor.is_primary().unwrap_or(false))
        .unwrap_or(0);

    Ok(monitors.swap_remove(index))
}

fn monitor_center_point(monitor: &Monitor) -> Result<(i32, i32), String> {
    let x = monitor.x().map_err(|error| error.to_string())?;
    let y = monitor.y().map_err(|error| error.to_string())?;
    let width = monitor.width().map_err(|error| error.to_string())?;
    let height = monitor.height().map_err(|error| error.to_string())?;

    Ok((
        x.saturating_add((width / 2).min(i32::MAX as u32) as i32),
        y.saturating_add((height / 2).min(i32::MAX as u32) as i32),
    ))
}

fn store_pending_screenshot_overlay_request(
    app: &AppHandle,
    request: ScreenshotOverlayRequest,
) -> Result<(), String> {
    let state = app.state::<PendingScreenshotOverlayRequest>();
    let mut pending = state
        .request
        .lock()
        .map_err(|_| String::from("pending screenshot overlay request lock poisoned"))?;
    *pending = Some(request);

    Ok(())
}

fn position_overlay_on_monitor(window: &WebviewWindow, monitor: &Monitor) -> Result<(), String> {
    let x = monitor.x().map_err(|error| error.to_string())?;
    let y = monitor.y().map_err(|error| error.to_string())?;
    let width = monitor.width().map_err(|error| error.to_string())?;
    let height = monitor.height().map_err(|error| error.to_string())?;

    window
        .set_fullscreen(false)
        .map_err(|error| error.to_string())?;
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
            x, y,
        )))
        .map_err(|error| error.to_string())?;
    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize::new(
            width, height,
        )))
        .map_err(|error| error.to_string())
}
