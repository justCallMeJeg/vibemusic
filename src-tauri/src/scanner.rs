use crate::artwork::extract_and_cache_cover;
use crate::database::DbHelper;
use crate::profile::get_library_db_path;
use lofty::config::{ParseOptions, ParsingMode};
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::Accessor;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::mpsc;
use tauri::Manager;
use tauri::{command, AppHandle, Emitter};
use walkdir::WalkDir;

/// Supported audio file extensions
const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "wav", "ogg", "m4a", "aac", "aiff", "wv", "opus",
];

/// Metadata extracted from an audio file
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrackMetadata {
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub file_format: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub artists: Vec<String>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
    pub year: Option<u32>,
    pub genre: Option<String>,
    pub duration_ms: u64,
    pub sample_rate: Option<u32>,
    pub bit_rate: Option<u32>,
    pub channels: Option<u8>,
    pub artwork_path: Option<String>,
}

/// Progress event emitted during scanning
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgress {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
    pub status: String,
}

/// Result of a folder scan
#[derive(Debug, Serialize, Deserialize)]
pub struct ScanStats {
    pub scanned_count: usize,
    pub success_count: usize,
    pub error_count: usize,
}

/// Check if a file has an audio extension
fn is_audio_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// Parse an artist string into individual artists
fn parse_artists(artist_str: Option<&str>) -> Vec<String> {
    match artist_str {
        None => Vec::new(),
        Some(s) => {
            let mut artists = Vec::new();
            let splitters = [',', '&'];

            for part in s.split(&splitters[..]) {
                let trimmed = part.trim();
                if !trimmed.is_empty() {
                    artists.push(trimmed.to_string());
                }
            }

            let mut seen = std::collections::HashSet::new();
            artists.retain(|x| seen.insert(x.clone()));

            artists
        }
    }
}

/// Extract metadata from a single audio file
fn extract_metadata(path: &Path, cache_dir: &Path) -> Result<TrackMetadata, String> {
    let file_path = path.to_string_lossy().to_string();

    let metadata =
        std::fs::metadata(path).map_err(|e| format!("Failed to read file metadata: {}", e))?;

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let file_format = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_uppercase();

    let probe = Probe::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let parse_options = ParseOptions::new().parsing_mode(ParsingMode::Relaxed);
    let tagged_file_result = probe.options(parse_options).read();

    let (duration_ms, sample_rate, bit_rate, channels, tag_info) = match tagged_file_result {
        Ok(tagged_file) => {
            let properties = tagged_file.properties();
            let duration = properties.duration().as_millis() as u64;
            let sr = properties.sample_rate();
            let br = properties.audio_bitrate();
            let ch = properties.channels();

            if duration == 0 {
                eprintln!(
                    "[WARN] Zero duration for: {} (format: {})",
                    path.display(),
                    file_format
                );
            }

            let tag = tagged_file
                .primary_tag()
                .or_else(|| tagged_file.first_tag());

            if tag.is_none() {
                eprintln!("[WARN] No tags found in: {}", path.display());
            }

            let tag_data = if let Some(tag) = tag {
                let artist_str = tag
                    .artist()
                    .map(|s| s.to_string())
                    .or_else(|| {
                        tag.get_string(&lofty::tag::ItemKey::AlbumArtist)
                            .map(|s| s.to_string())
                    })
                    .or_else(|| {
                        tag.get_string(&lofty::tag::ItemKey::TrackArtist)
                            .map(|s| s.to_string())
                    });

                if artist_str.is_none() {
                    eprintln!(
                        "[WARN] No artist found in: {} (tag type: {:?})",
                        path.display(),
                        tag.tag_type()
                    );
                }

                let artists = parse_artists(artist_str.as_deref());

                let artwork_path = tag
                    .pictures()
                    .iter()
                    .find(|p| p.pic_type() == lofty::picture::PictureType::CoverFront)
                    .or_else(|| tag.pictures().first())
                    .and_then(|pic| extract_and_cache_cover(pic, cache_dir));

                if artwork_path.is_none() && !tag.pictures().is_empty() {
                    eprintln!(
                        "[WARN] Found {} pictures but failed to extract for: {}",
                        tag.pictures().len(),
                        path.display()
                    );
                }

                (
                    tag.title().map(|s| s.to_string()),
                    artist_str,
                    artists,
                    tag.album().map(|s| s.to_string()),
                    tag.get_string(&lofty::tag::ItemKey::AlbumArtist)
                        .map(|s| s.to_string()),
                    tag.track(),
                    tag.disk(),
                    tag.year(),
                    tag.genre().map(|s| s.to_string()),
                    artwork_path,
                )
            } else {
                (
                    None,
                    None,
                    Vec::new(),
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                )
            };

            (duration, sr, br, ch, tag_data)
        }
        Err(e) => {
            eprintln!(
                "[WARN] Strict parse failed for {}: {}. Retrying without tags...",
                path.display(),
                e
            );

            let retry_probe = match Probe::open(path) {
                Ok(p) => p,
                Err(e2) => {
                    eprintln!("[ERROR] Failed to re-open file {}: {}", path.display(), e2);
                    return Err(format!("Failed to re-open file: {}", e2));
                }
            };

            let retry_options = ParseOptions::new()
                .parsing_mode(ParsingMode::Relaxed)
                .read_tags(false);

            match retry_probe.options(retry_options).read() {
                Ok(tagged_file) => {
                    eprintln!("[INFO] Successfully read properties for {}", path.display());
                    let properties = tagged_file.properties();
                    let duration = properties.duration().as_millis() as u64;
                    let sr = properties.sample_rate();
                    let br = properties.audio_bitrate();
                    let ch = properties.channels();

                    (
                        duration,
                        sr,
                        br,
                        ch,
                        (
                            None,
                            None,
                            Vec::new(),
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                        ),
                    )
                }
                Err(e2) => {
                    eprintln!(
                        "[ERROR] Failed to parse file {} even without tags: {}",
                        path.display(),
                        e2
                    );
                    (
                        0,
                        None,
                        None,
                        None,
                        (
                            None,
                            None,
                            Vec::new(),
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                        ),
                    )
                }
            }
        }
    };

    let (
        title,
        artist,
        artists,
        album,
        album_artist,
        track_number,
        disc_number,
        year,
        genre,
        artwork_path,
    ) = tag_info;

    let final_title: Option<String> = title.or_else(|| {
        path.file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
    });

    Ok(TrackMetadata {
        file_path,
        file_name,
        file_size: metadata.len(),
        file_format,
        title: final_title,
        artist,
        artists,
        album,
        album_artist,
        track_number,
        disc_number,
        year,
        genre,
        duration_ms,
        sample_rate,
        bit_rate,
        channels,
        artwork_path,
    })
}

#[command]
pub fn get_file_metadata(path: String) -> Result<TrackMetadata, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    if !is_audio_file(path) {
        return Err("Not a supported audio file".to_string());
    }
    let cache_dir = std::env::temp_dir();
    extract_metadata(path, &cache_dir)
}

#[command]
pub fn scan_folder(path: String) -> Result<Vec<String>, String> {
    let root = Path::new(&path);
    if !root.exists() {
        return Err("Directory does not exist".to_string());
    }
    if !root.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut audio_files = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() && is_audio_file(path) {
            audio_files.push(path.to_string_lossy().to_string());
        }
    }
    Ok(audio_files)
}

#[command]
pub async fn scan_music_library(app: AppHandle, folders: Vec<String>) -> Result<ScanStats, String> {
    let mut all_files: Vec<String> = Vec::new();
    for folder in &folders {
        match scan_folder(folder.clone()) {
            Ok(files) => all_files.extend(files),
            Err(e) => return Err(format!("Failed to scan folder {}: {}", folder, e)),
        }
    }

    let total = all_files.len();
    let progress_counter = AtomicUsize::new(0);
    let (tx, rx) = mpsc::sync_channel::<Result<TrackMetadata, String>>(100);

    // Get database path using profile helper
    let db_path = get_library_db_path(&app)?;
    eprintln!("Scanner using database at: {:?}", db_path);

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
                    eprintln!("Failed to start transaction: {}", e);
                    return 0;
                }
            };

            let mut batch_success = 0;
            for metadata in batch {
                if let Err(e) = DbHelper::upsert_track(&tx, metadata) {
                    eprintln!("Failed to save track in batch: {}", e);
                } else {
                    batch_success += 1;
                }
            }

            if let Err(e) = tx.commit() {
                eprintln!("Failed to commit batch: {}", e);
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
        let _ = app.emit(
            "scan-progress",
            ScanProgress {
                current,
                total,
                current_file: file_path.clone(),
                status: "scanning".to_string(),
            },
        );

        let metadata = extract_metadata(Path::new(file_path), &cache_dir)
            .map_err(|e| format!("{}: {}", file_path, e));
        let _ = tx.send(metadata);
    });

    drop(tx);

    let (success_count, error_count) = match db_thread.join() {
        Ok(res) => res?,
        Err(_) => return Err("Database thread panicked".to_string()),
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

#[command]
pub async fn check_files_exist(paths: Vec<String>) -> Vec<String> {
    paths
        .into_iter()
        .filter(|path| !Path::new(path).exists())
        .collect()
}

#[command]
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
        
        // Clean up empty albums
        if let Ok(album_count) = DbHelper::delete_empty_albums(&tx) {
             if album_count > 0 {
                 println!("Pruned {} empty albums", album_count);
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
