//! Playlist feature — CRUD command handlers for user playlists.
//!
//! All database operations are delegated through the profile-based DB cache.

use crate::profile::{with_db, with_db_mut};
use crate::shared::error::AppError;
use crate::shared::types::{LibraryTrack, Playlist};
use tauri::{command, AppHandle};

/// Creates a new playlist with the given name and optional description.
#[command]
pub fn create_playlist(
    app: AppHandle,
    name: String,
    description: Option<String>,
) -> Result<Playlist, AppError> {
    with_db(&app, |db| db.create_playlist(name, description))
}

#[command]
pub fn delete_playlist(app: AppHandle, id: i64) -> Result<(), AppError> {
    with_db(&app, |db| db.delete_playlist(id))
}

#[command]
pub fn update_playlist(
    app: AppHandle,
    id: i64,
    name: String,
    description: Option<String>,
    artwork_path: Option<String>,
) -> Result<(), AppError> {
    with_db(&app, |db| {
        db.update_playlist(id, name, description, artwork_path)
    })
}

#[command]
pub fn get_playlists(app: AppHandle) -> Result<Vec<Playlist>, AppError> {
    with_db(&app, |db| db.get_playlists())
}

#[command]
pub fn get_playlist_tracks(app: AppHandle, id: i64) -> Result<Vec<LibraryTrack>, AppError> {
    with_db(&app, |db| db.get_playlist_tracks(id))
}

#[command]
pub fn add_track_to_playlist(
    app: AppHandle,
    playlist_id: i64,
    track_id: i64,
) -> Result<(), AppError> {
    with_db(&app, |db| db.add_track_to_playlist(playlist_id, track_id))
}

#[command]
pub fn remove_track_from_playlist(
    app: AppHandle,
    playlist_id: i64,
    track_id: i64,
) -> Result<(), AppError> {
    with_db(&app, |db| {
        db.remove_track_from_playlist(playlist_id, track_id)
    })
}

#[command]
pub fn reorder_playlist(app: AppHandle, id: i64, new_order: Vec<i64>) -> Result<(), AppError> {
    with_db_mut(&app, |db| db.reorder_playlist(id, new_order))
}

// ------------------------------------------------------------------
// Liked Music
// ------------------------------------------------------------------

/// Toggle like status for a track. Returns `true` if now liked, `false` if unliked.
#[command]
pub fn toggle_like_track(app: AppHandle, track_id: i64) -> Result<bool, AppError> {
    with_db(&app, |db| db.toggle_liked_track(track_id))
}

/// Returns all track IDs in the liked playlist.
#[command]
pub fn get_liked_track_ids(app: AppHandle) -> Result<Vec<i64>, AppError> {
    with_db(&app, |db| db.get_liked_track_ids())
}

// ------------------------------------------------------------------
// Pin
// ------------------------------------------------------------------

/// Pin or unpin a playlist.
#[command]
pub fn toggle_pin_playlist(app: AppHandle, id: i64, pinned: bool) -> Result<(), AppError> {
    with_db(&app, |db| db.toggle_pin_playlist(id, pinned))
}
