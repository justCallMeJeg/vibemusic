use crate::database::DbHelper;
use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Manager};

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
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");

    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    
    db.get_all_tracks().map_err(|e| format!("Failed to fetch tracks: {}", e))
}

#[command]
pub fn get_all_albums(app: AppHandle) -> Result<Vec<LibraryAlbum>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");

    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    
    db.get_all_albums().map_err(|e| format!("Failed to fetch albums: {}", e))
}

#[command]
pub fn get_album_by_id(app: AppHandle, id: i64) -> Result<Option<LibraryAlbum>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");

    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    
    db.get_album_by_id(id).map_err(|e| format!("Failed to fetch album: {}", e))
}

#[command]
pub fn get_album_tracks(app: AppHandle, album_id: i64) -> Result<Vec<LibraryTrack>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");

    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    
    db.get_album_tracks(album_id).map_err(|e| format!("Failed to fetch album tracks: {}", e))
}
