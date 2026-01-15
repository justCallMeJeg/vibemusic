use crate::database::DbHelper;
use crate::profile::get_library_db_path; // Import helper
                                         // use crate::error::AppError;
use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle};

#[derive(Debug, Serialize, Deserialize)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub artwork_path: Option<String>,
    pub track_count: i64,
    pub created_at: String,
}

// Commands follow below
#[command]
/// Creates a new playlist with the given name and optional description.
pub fn create_playlist(
    app: AppHandle,
    name: String,
    description: Option<String>,
) -> Result<Playlist, String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;

    db.create_playlist(name, description)
        .map_err(|e| e.to_string())
}

#[command]
pub fn delete_playlist(app: AppHandle, id: i64) -> Result<(), String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;

    db.delete_playlist(id).map_err(|e| e.to_string())
}

#[command]
pub fn update_playlist(
    app: AppHandle,
    id: i64,
    name: String,
    description: Option<String>,
    artwork_path: Option<String>,
) -> Result<(), String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;

    db.update_playlist(id, name, description, artwork_path)
        .map_err(|e| e.to_string())
}

#[command]
pub fn get_playlists(app: AppHandle) -> Result<Vec<Playlist>, String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;

    db.get_playlists().map_err(|e| e.to_string())
}

#[command]
pub fn get_playlist_tracks(
    app: AppHandle,
    id: i64,
) -> Result<Vec<crate::library::LibraryTrack>, String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;

    db.get_playlist_tracks(id).map_err(|e| e.to_string())
}

#[command]
pub fn add_track_to_playlist(
    app: AppHandle,
    playlist_id: i64,
    track_id: i64,
) -> Result<(), String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;

    db.add_track_to_playlist(playlist_id, track_id)
        .map_err(|e| e.to_string())
}

#[command]
pub fn remove_track_from_playlist(
    app: AppHandle,
    playlist_id: i64,
    track_id: i64,
) -> Result<(), String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;

    db.remove_track_from_playlist(playlist_id, track_id)
        .map_err(|e| e.to_string())
}

#[command]
pub fn reorder_playlist(
    app: AppHandle,
    id: i64,
    new_order: Vec<i64>,
) -> Result<(), String> {
    let db_path = get_library_db_path(&app)?;
    let mut db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;

    db.reorder_playlist(id, new_order)
        .map_err(|e| e.to_string())
}
