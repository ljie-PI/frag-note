use std::{fs, path::PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn save_fragment_record(app: AppHandle, payload: String) -> Result<(), String> {
    let connection = open_database(&app)?;
    connection
        .execute(
            "insert into fragment_records (fragment_id, payload) values (?1, ?2)
             on conflict(fragment_id) do update set payload = excluded.payload",
            params![extract_fragment_id(&payload)?, payload],
        )
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_fragment_records(app: AppHandle) -> Result<Vec<String>, String> {
    let connection = open_database(&app)?;
    let mut statement = connection
        .prepare("select payload from fragment_records order by updated_at desc")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_fragment_record(
    app: AppHandle,
    fragment_id: String,
) -> Result<Option<String>, String> {
    let connection = open_database(&app)?;
    let mut statement = connection
        .prepare("select payload from fragment_records where fragment_id = ?1")
        .map_err(|error| error.to_string())?;
    let mut rows = statement
        .query(params![fragment_id])
        .map_err(|error| error.to_string())?;

    match rows.next().map_err(|error| error.to_string())? {
        Some(row) => row
            .get::<_, String>(0)
            .map(Some)
            .map_err(|error| error.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn create_screenshot_placeholder(app: AppHandle) -> Result<String, String> {
    create_placeholder_asset(&app, "placeholder-screenshot.png", &[])
}

#[tauri::command]
pub fn create_voice_placeholder(app: AppHandle) -> Result<String, String> {
    create_placeholder_asset(&app, "placeholder-voice.webm", b"voice")
}

#[tauri::command]
pub fn read_local_asset_base64(local_path: String) -> Result<String, String> {
    let bytes =
        fs::read(normalize_local_asset_path(&local_path)).map_err(|error| error.to_string())?;
    Ok(STANDARD.encode(bytes))
}

fn normalize_local_asset_path(input: &str) -> PathBuf {
    let (path, is_file_url) = match input.strip_prefix("file://") {
        Some(file_url_path) => (percent_decode_path(file_url_path), true),
        None => (input.to_owned(), false),
    };

    let path = if is_file_url {
        path.strip_prefix('/')
            .filter(|stripped| starts_with_windows_drive(stripped))
            .unwrap_or(&path)
    } else {
        &path
    };

    PathBuf::from(path)
}

fn starts_with_windows_drive(path: &str) -> bool {
    let bytes = path.as_bytes();
    bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':'
}

fn percent_decode_path(path: &str) -> String {
    let bytes = path.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;

    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let (Some(high), Some(low)) =
                (hex_value(bytes[index + 1]), hex_value(bytes[index + 2]))
            {
                decoded.push((high << 4) | low);
                index += 3;
                continue;
            }
        }

        decoded.push(bytes[index]);
        index += 1;
    }

    String::from_utf8(decoded).unwrap_or_else(|_| path.to_owned())
}

fn hex_value(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

fn create_placeholder_asset(
    app: &AppHandle,
    file_name: &str,
    contents: &[u8],
) -> Result<String, String> {
    let file_path = app_data_dir(app)?.join(file_name);
    fs::write(&file_path, contents).map_err(|error| error.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

fn open_database(app: &AppHandle) -> Result<Connection, String> {
    let database_path = app_data_dir(app)?.join("desktop-state.sqlite3");
    let connection = Connection::open(database_path).map_err(|error| error.to_string())?;

    connection
        .execute_batch(
            "create table if not exists fragment_records (
                fragment_id text primary key,
                payload text not null,
                updated_at text default current_timestamp
            );",
        )
        .map_err(|error| error.to_string())?;

    Ok(connection)
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn extract_fragment_id(payload: &str) -> Result<String, String> {
    let value: serde_json::Value =
        serde_json::from_str(payload).map_err(|error| error.to_string())?;
    value
        .get("fragment")
        .and_then(|fragment| fragment.get("fragmentId"))
        .and_then(|fragment_id| fragment_id.as_str())
        .map(str::to_owned)
        .ok_or_else(|| String::from("payload is missing fragment.fragmentId"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn normalize_local_asset_path_strips_file_url_prefix() {
        assert_eq!(
            normalize_local_asset_path("file:///home/fragnote/capture.png"),
            PathBuf::from("/home/fragnote/capture.png")
        );
    }

    #[test]
    fn normalize_local_asset_path_preserves_plain_paths() {
        assert_eq!(
            normalize_local_asset_path("/home/fragnote/capture.png"),
            PathBuf::from("/home/fragnote/capture.png")
        );
    }

    #[test]
    fn normalize_local_asset_path_decodes_file_url_spaces() {
        assert_eq!(
            normalize_local_asset_path("file:///home/Frag%20Note/capture.png"),
            PathBuf::from("/home/Frag Note/capture.png")
        );
    }

    #[test]
    fn normalize_local_asset_path_accepts_windows_file_urls() {
        assert_eq!(
            normalize_local_asset_path("file:///C:/Users/Frag%20Note/capture.png"),
            PathBuf::from("C:/Users/Frag Note/capture.png")
        );
    }

    #[test]
    fn normalize_local_asset_path_keeps_plain_windows_like_paths() {
        assert_eq!(
            normalize_local_asset_path("/C:/Users/Frag%20Note/capture.png"),
            PathBuf::from("/C:/Users/Frag%20Note/capture.png")
        );
    }
}
