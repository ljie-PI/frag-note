use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use std::io::Cursor;
use tauri::{AppHandle, Emitter, Manager};
use xcap::Monitor;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotOverlayRequest {
    pub request_id: Option<String>,
    pub target_label: Option<String>,
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

#[tauri::command]
pub async fn capture_screens() -> Result<Vec<MonitorCapture>, String> {
    tauri::async_runtime::spawn_blocking(capture_screens_blocking)
        .await
        .map_err(|error| error.to_string())?
}

fn capture_screens_blocking() -> Result<Vec<MonitorCapture>, String> {
    let monitors = Monitor::all().map_err(|error| error.to_string())?;
    monitors
        .into_iter()
        .map(|monitor| {
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
        })
        .collect()
}

#[tauri::command]
pub fn show_screenshot_overlay(
    app: AppHandle,
    request_id: Option<String>,
    target_label: Option<String>,
) -> Result<(), String> {
    show_screenshot_overlay_window(&app, request_id, target_label)
}

pub fn show_screenshot_overlay_window(
    app: &AppHandle,
    request_id: Option<String>,
    target_label: Option<String>,
) -> Result<(), String> {
    let window = app
        .get_webview_window("screenshot-overlay")
        .ok_or_else(|| String::from("screenshot-overlay window not found"))?;

    window
        .emit(
            "screenshot-overlay-request",
            ScreenshotOverlayRequest {
                request_id,
                target_label,
            },
        )
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}
