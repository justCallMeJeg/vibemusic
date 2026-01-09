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

#[command]
pub fn get_all_tracks(app: AppHandle) -> Result<Vec<LibraryTrack>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");

    let db = DbHelper::new(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    
    db.get_all_tracks().map_err(|e| format!("Failed to fetch tracks: {}", e))
}
