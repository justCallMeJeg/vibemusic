use crate::database::DbHelper;
use crate::profile::get_library_db_path;
use crate::shared::types::{ScanProgress, ScanStats, TrackMetadata};
use log::info;
use rayon::prelude::*;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::mpsc;
use tauri::{AppHandle, Emitter, Manager};

use super::discovery;
use super::metadata;

/// Scans all configured music library folders and persists discovered tracks.
pub async fn scan_music_library(app: AppHandle, folders: Vec<String>) -> Result<ScanStats, String> {
    let mut all_files: Vec<String> = Vec::new();
    for folder in &folders {
        match discovery::scan_folder(folder.clone()) {
            Ok(files) => all_files.extend(files),
            Err(e) => return Err(format!("Failed to scan folder {}: {}", folder, e)),
        }
    }

    let total = all_files.len();
    let progress_counter = AtomicUsize::new(0);
    let (tx, rx) = mpsc::sync_channel::<Result<TrackMetadata, String>>(100);

    let db_path = get_library_db_path(&app)?;

    let existing_map = {
        let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;
        let list = db.get_existing_metadata().map_err(|e| e.to_string())?;
        let mut map = std::collections::HashMap::with_capacity(list.len());
        for (path, size, mtime) in list {
            map.insert(path, (size, mtime));
        }
        map
    };

    info!("Scanner found {} existing tracks in DB", existing_map.len());

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let cache_dir = app_data_dir.join("covers");

    let db_thread = std::thread::spawn(move || {
        let mut db = match DbHelper::new(&db_path) {
            Ok(db) => db,
            Err(e) => return Err(format!("Failed to open database: {}", e)),
        };

        let mut success_count = 0;
        let mut error_count = 0;
        let mut batch = Vec::with_capacity(50);

        let process_batch = |db: &mut DbHelper, batch: &Vec<TrackMetadata>| {
            let tx = match db.get_conn_mut().transaction() {
                Ok(tx) => tx,
                Err(e) => {
                    log::error!("Failed to start transaction: {}", e);
                    return 0;
                }
            };

            let mut batch_success = 0;
            for metadata in batch {
                if let Err(e) = DbHelper::upsert_track(&tx, metadata) {
                    log::error!("Failed to save track in batch: {}", e);
                } else {
                    batch_success += 1;
                }
            }

            if let Err(e) = tx.commit() {
                log::error!("Failed to commit batch: {}", e);
                0
            } else {
                batch_success
            }
        };

        for result in rx {
            match result {
                Ok(metadata) => {
                    batch.push(metadata);
                    if batch.len() >= 50 {
                        let ok_count = process_batch(&mut db, &batch);
                        success_count += ok_count;
                        error_count += batch.len() - ok_count;
                        batch.clear();
                    }
                }
                Err(_) => {
                    error_count += 1;
                }
            }
        }

        if !batch.is_empty() {
            let ok_count = process_batch(&mut db, &batch);
            success_count += ok_count;
            error_count += batch.len() - ok_count;
        }

        Ok((success_count, error_count))
    });

    all_files.par_iter().for_each(|file_path| {
        let current = progress_counter.fetch_add(1, Ordering::SeqCst) + 1;

        if current.is_multiple_of(50) || current == total {
            let _ = app.emit(
                "scan-progress",
                ScanProgress {
                    current,
                    total,
                    current_file: file_path.clone(),
                    status: "scanning".to_string(),
                },
            );
        }

        let path = Path::new(file_path);
        let metadata = match std::fs::metadata(path) {
            Ok(m) => m,
            Err(_) => return,
        };

        let fs_size = metadata.len();
        let fs_mtime = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        if let Some((db_size, db_mtime)) = existing_map.get(file_path) {
            if *db_size == fs_size && *db_mtime == fs_mtime {
                return;
            }
        }

        let metadata = metadata::extract_metadata(path, &cache_dir)
            .map_err(|e| format!("{}: {}", file_path, e));
        let _ = tx.send(metadata);
    });

    drop(tx);

    let (success_count, error_count) = match db_thread.join() {
        Ok(res) => res?,
        Err(e) => return Err(format!("Database thread panicked: {:?}", e)),
    };

    let _ = app.emit(
        "scan-progress",
        ScanProgress {
            current: total,
            total,
            current_file: String::new(),
            status: "complete".to_string(),
        },
    );

    Ok(ScanStats {
        scanned_count: total,
        success_count,
        error_count,
    })
}
