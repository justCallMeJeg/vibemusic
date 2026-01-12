use crate::database::DbHelper;
use crate::profile::get_library_db_path; // Import helper
use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle}; // Removed Manager import if not used

#[derive(Debug, Serialize, Deserialize)]
pub struct LibraryTrack {
    pub id: i64,
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration_ms: u64,
    pub file_path: String,
    pub artwork_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LibraryAlbum {
    pub id: i64,
    pub title: String,
    pub artist_id: Option<i64>,
    pub artist_name: Option<String>,
    pub year: Option<i32>,
    pub artwork_path: Option<String>,
    pub track_count: i64,
    pub total_duration_ms: u64,
}

#[command]
pub fn get_all_tracks(app: AppHandle) -> Result<Vec<LibraryTrack>, String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    db.get_all_tracks()
        .map_err(|e| format!("Failed to fetch tracks: {}", e))
}

#[command]
pub fn get_all_albums(app: AppHandle) -> Result<Vec<LibraryAlbum>, String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    db.get_all_albums()
        .map_err(|e| format!("Failed to fetch albums: {}", e))
}

#[command]
pub fn get_album_by_id(app: AppHandle, id: i64) -> Result<Option<LibraryAlbum>, String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    db.get_album_by_id(id)
        .map_err(|e| format!("Failed to fetch album: {}", e))
}

#[command]
pub fn get_album_tracks(app: AppHandle, album_id: i64) -> Result<Vec<LibraryTrack>, String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    db.get_album_tracks(album_id)
        .map_err(|e| format!("Failed to fetch album tracks: {}", e))
}

#[command]
pub fn delete_track(app: AppHandle, track_id: i64) -> Result<(), String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    db.delete_track(track_id)
        .map_err(|e| format!("Failed to delete track: {}", e))
}
