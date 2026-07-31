use crate::database::DbHelper;
use crate::profile::get_library_db_path;
use crate::shared::types::ScanStats;
use log::info;
use rayon::prelude::*;
use std::path::Path;
use tauri::AppHandle;

/// Checks which of the given file paths still exist on disk.
pub fn check_files_exist(paths: Vec<String>) -> Vec<String> {
    paths
        .into_iter()
        .filter(|path| !Path::new(path).exists())
        .collect()
}

/// Removes tracks from the database whose files no longer exist on disk.
pub async fn prune_library(app: AppHandle) -> Result<ScanStats, String> {
    let db_path = get_library_db_path(&app)?;

    let stats = std::thread::spawn(move || -> Result<ScanStats, String> {
        let mut db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;

        let all_tracks = db.get_all_track_paths().map_err(|e| e.to_string())?;
        let total = all_tracks.len();

        let missing_ids: Vec<i64> = all_tracks
            .par_iter()
            .filter_map(|(id, path_str)| {
                if !Path::new(path_str).exists() {
                    Some(*id)
                } else {
                    None
                }
            })
            .collect();

        if missing_ids.is_empty() {
            return Ok(ScanStats {
                scanned_count: total,
                success_count: 0,
                error_count: 0,
            });
        }

        let tx = db.get_conn_mut().transaction().map_err(|e| e.to_string())?;
        DbHelper::delete_tracks(&tx, &missing_ids).map_err(|e| e.to_string())?;

        let deleted_count = missing_ids.len();

        if let Ok(album_count) = DbHelper::delete_empty_albums(&tx) {
            if album_count > 0 {
                info!("Pruned {} empty albums", album_count);
            }
        }

        tx.commit().map_err(|e| e.to_string())?;

        Ok(ScanStats {
            scanned_count: total,
            success_count: deleted_count,
            error_count: 0,
        })
    })
    .join()
    .map_err(|_| "Thread panicked".to_string())??;

    Ok(stats)
}
