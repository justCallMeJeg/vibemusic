//! Scanner feature — audio file discovery, metadata extraction, and library maintenance.
//!
//! Sub-modules:
//! - [`discovery`]: File walking and format detection
//! - [`metadata`]: Tag extraction and artist parsing
//! - [`engine`]: Parallel scan orchestration with incremental DB writes
//! - [`prune`]: Library pruning and file existence checks

pub mod discovery;
pub mod engine;
pub mod metadata;
pub mod prune;
#[cfg(test)]
mod tests;

use crate::shared::types::{ScanStats, TrackMetadata};
use std::path::Path;
use tauri::{command, AppHandle};

/// Retrieves metadata for a single audio file without adding it to the library.
#[command]
pub fn get_file_metadata(path: String) -> Result<TrackMetadata, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    if !discovery::is_audio_file(path) {
        return Err("Not a supported audio file".to_string());
    }
    let cache_dir = std::env::temp_dir();
    metadata::extract_metadata(path, &cache_dir)
}

/// Recursively discovers audio files in the given directory.
#[command]
pub fn scan_folder(path: String) -> Result<Vec<String>, String> {
    discovery::scan_folder(path)
}

/// Scans all configured music library folders and persists discovered tracks.
#[command]
pub async fn scan_music_library(app: AppHandle, folders: Vec<String>) -> Result<ScanStats, String> {
    engine::scan_music_library(app, folders).await
}

/// Checks which of the given file paths still exist on disk.
#[command]
pub async fn check_files_exist(paths: Vec<String>) -> Vec<String> {
    prune::check_files_exist(paths)
}

/// Removes tracks from the database whose files no longer exist on disk.
#[command]
pub async fn prune_library(app: AppHandle) -> Result<ScanStats, String> {
    prune::prune_library(app).await
}
