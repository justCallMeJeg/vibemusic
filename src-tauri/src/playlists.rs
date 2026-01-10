use crate::database::DbHelper;
// use crate::error::AppError;
use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub track_count: i64,
    pub created_at: String,
}

// #[derive(Debug, Serialize, Deserialize)]
// pub struct PlaylistTrack {
//     pub id: i64,
//     pub playlist_id: i64,
//     pub track_id: i64,
//     pub position: i64,
//     pub added_at: String,
// }

// Commands will be implemented after updating DbHelper
#[command]
pub fn create_playlist(
    app: AppHandle,
    name: String,
    description: Option<String>,
) -> Result<Playlist, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;
    
    db.create_playlist(name, description).map_err(|e| e.to_string())
}

#[command]
pub fn delete_playlist(app: AppHandle, id: i64) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;
    
    db.delete_playlist(id).map_err(|e| e.to_string())
}

#[command]
pub fn get_playlists(app: AppHandle) -> Result<Vec<Playlist>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;
    
    db.get_playlists().map_err(|e| e.to_string())
}

#[command]
pub fn get_playlist_tracks(app: AppHandle, id: i64) -> Result<Vec<crate::library::LibraryTrack>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;
    
    db.get_playlist_tracks(id).map_err(|e| e.to_string())
}

#[command]
pub fn add_track_to_playlist(
    app: AppHandle,
    playlist_id: i64,
    track_id: i64,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;
    
    db.add_track_to_playlist(playlist_id, track_id).map_err(|e| e.to_string())
}

#[command]
pub fn remove_track_from_playlist(
    app: AppHandle,
    playlist_id: i64,
    track_id: i64,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;
    
    db.remove_track_from_playlist(playlist_id, track_id).map_err(|e| e.to_string())
}
