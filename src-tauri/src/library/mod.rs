//! Library feature — track, album, and artist browsing commands.
//!
//! Provides Tauri command handlers that delegate to the database layer
//! via the profile-based DB cache.

use crate::profile::{with_db, with_db_mut};
use crate::shared::error::AppError;
use crate::shared::types::{Artist, LibraryAlbum, LibraryTrack, SearchResults};
use tauri::{command, AppHandle};

/// Retrieves all tracks from the database.
#[command]
pub fn get_all_tracks(app: AppHandle) -> Result<Vec<LibraryTrack>, AppError> {
    with_db(&app, |db| db.get_all_tracks())
}

#[command]
pub fn get_all_albums(app: AppHandle) -> Result<Vec<LibraryAlbum>, AppError> {
    with_db(&app, |db| db.get_all_albums())
}

#[command]
pub fn get_album_by_id(app: AppHandle, id: i64) -> Result<Option<LibraryAlbum>, AppError> {
    with_db(&app, |db| db.get_album_by_id(id))
}

#[command]
pub fn get_album_tracks(app: AppHandle, album_id: i64) -> Result<Vec<LibraryTrack>, AppError> {
    with_db(&app, |db| db.get_album_tracks(album_id))
}

#[command]
pub fn delete_track(app: AppHandle, track_id: i64) -> Result<(), AppError> {
    with_db(&app, |db| db.delete_track(track_id))
}

#[command]
pub fn remove_location(app: AppHandle, path: String) -> Result<usize, AppError> {
    with_db_mut(&app, |db| db.remove_folder(&path))
}

#[command]
pub fn get_all_artists(app: AppHandle) -> Result<Vec<Artist>, AppError> {
    with_db(&app, |db| db.get_all_artists())
}

#[command]
pub fn get_artist_by_id(app: AppHandle, id: i64) -> Result<Option<Artist>, AppError> {
    with_db(&app, |db| db.get_artist_by_id(id))
}

#[command]
pub fn get_artist_albums(app: AppHandle, id: i64) -> Result<Vec<LibraryAlbum>, AppError> {
    with_db(&app, |db| db.get_artist_albums(id))
}

#[command]
pub fn get_artist_tracks(app: AppHandle, id: i64) -> Result<Vec<LibraryTrack>, AppError> {
    with_db(&app, |db| db.get_artist_tracks(id))
}

#[command]
pub fn search(app: AppHandle, query: String) -> Result<SearchResults, AppError> {
    with_db(&app, |db| db.search(&query))
}
