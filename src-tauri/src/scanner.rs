use crate::artwork::extract_and_cache_cover;
use crate::database::DbHelper;
/**
 * Music File Scanner Module
 * Scans directories for audio files and extracts metadata using lofty-rs
 */
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
/// Now simplified to just return counts, as actual data is in DB
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
/// Handles common separators: ";", "/", ",", " feat. ", " ft. ", " featuring ", " & ", " x ", " X "
fn parse_artists(artist_str: Option<&str>) -> Vec<String> {
    match artist_str {
        None => Vec::new(),
        Some(s) => {
            // Replace common "featuring" variations with a standard separator
            let normalized = s
                .replace(" featuring ", ";")
                .replace(" Featuring ", ";")
                .replace(" feat. ", ";")
                .replace(" Feat. ", ";")
                .replace(" ft. ", ";")
                .replace(" Ft. ", ";")
                .replace(" ft ", ";")
                .replace(" x ", ";")
                .replace(" X ", ";");

            // Split by common separators: semicolon, slash, ampersand
            // Note: We're careful with comma as it might be part of "LastName, FirstName" format
            let mut artists: Vec<String> = Vec::new();

            for part in normalized.split(';') {
                let part = part.trim();
                if !part.is_empty() {
                    // Further split by " & " and " / "
                    for subpart in part.split(" & ") {
                        let subpart = subpart.trim();
                        if !subpart.is_empty() {
                            for final_part in subpart.split(" / ") {
                                let final_part = final_part.trim();
                                if !final_part.is_empty() {
                                    artists.push(final_part.to_string());
                                }
                            }
                        }
                    }
                }
            }

            // Deduplicate while preserving order
            let mut seen = std::collections::HashSet::new();
            artists.retain(|x| seen.insert(x.clone()));

            artists
        }
    }
}

/// Extract metadata from a single audio file
fn extract_metadata(path: &Path, cache_dir: &Path) -> Result<TrackMetadata, String> {
    let file_path = path.to_string_lossy().to_string();

    // Get file info
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

    // Read audio file with lofty using lenient parsing
    let probe = Probe::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    // Try to read with default options first, fall back to basic info on error
    let tagged_file_result = probe.read();

    let (duration_ms, sample_rate, bit_rate, channels, tag_info) = match tagged_file_result {
        Ok(tagged_file) => {
            // Get audio properties
            let properties = tagged_file.properties();
            let duration = properties.duration().as_millis() as u64;
            let sr = properties.sample_rate();
            let br = properties.audio_bitrate();
            let ch = properties.channels();

            // Get primary tag (try multiple tag types)
            let tag = tagged_file
                .primary_tag()
                .or_else(|| tagged_file.first_tag());

            let tag_data = if let Some(tag) = tag {
                // Get artist string and parse into individual artists
                let artist_str = tag.artist().map(|s| s.to_string());
                let artists = parse_artists(artist_str.as_deref());

                // Extract artwork
                let artwork_path = tag
                    .pictures()
                    .first()
                    .and_then(|pic| extract_and_cache_cover(pic, cache_dir));

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
        Err(_) => {
            // File has corrupted metadata, but we can still index it with filename
            // Return basic info with no tag data
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

    // Use filename as title if no title tag found
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

/// Get metadata for a single file
#[command]
pub fn get_file_metadata(path: String) -> Result<TrackMetadata, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    if !is_audio_file(path) {
        return Err("Not a supported audio file".to_string());
    }

    // We pass a dummy path for single file metadata as we don't want to pollute cache for one-offs maybe?
    // Or we should? For now let's just use temp dir or skip artwork for this simple command
    // But to match signature we need a path.
    // Ideally this command should only be used for debugging.
    let cache_dir = std::env::temp_dir();
    extract_metadata(path, &cache_dir)
}

/// Find all audio files in a directory
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

/// Scan a music library and extract metadata for all files
#[command]
pub async fn scan_music_library(app: AppHandle, folders: Vec<String>) -> Result<ScanStats, String> {
    let mut all_files: Vec<String> = Vec::new();

    // Collect all audio files from all folders
    for folder in &folders {
        match scan_folder(folder.clone()) {
            Ok(files) => all_files.extend(files),
            Err(e) => return Err(format!("Failed to scan folder {}: {}", folder, e)),
        }
    }

    let total = all_files.len();
    let progress_counter = AtomicUsize::new(0);

    // Create channel for sending metadata to DB thread
    // We use a sync_channel with a small buffer to provide backpressure
    // This prevents the scanner from using too much RAM if DB is slow
    let (tx, rx) = mpsc::sync_channel::<Result<TrackMetadata, String>>(100);

    // Get database path
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");
    eprintln!("Scanner using database at: {:?}", db_path);
    let cache_dir = app_data_dir.join("covers");

    // Spawn DB writer thread
    let db_thread = std::thread::spawn(move || {
        let mut db = match DbHelper::new(&db_path) {
            Ok(db) => db,
            Err(e) => return Err(format!("Failed to open database: {}", e)),
        };

        let mut success_count = 0;
        let mut error_count = 0;

        for result in rx {
            match result {
                Ok(metadata) => {
                    if let Err(e) = db.upsert_track(&metadata) {
                        eprintln!("Failed to save track: {}", e);
                        error_count += 1;
                    } else {
                        success_count += 1;
                    }
                }
                Err(_) => {
                    error_count += 1;
                }
            }
        }
        Ok((success_count, error_count))
    });

    // Process files in parallel and send to channel
    all_files.par_iter().for_each(|file_path| {
        // Increment progress
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

    // Drop sender to signal end of stream
    drop(tx);

    // Wait for DB thread
    let (success_count, error_count) = match db_thread.join() {
        Ok(res) => res?,
        Err(_) => return Err("Database thread panicked".to_string()),
    };

    // Emit completion event
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

/// Check if files exist at the given paths
#[command]
pub async fn check_files_exist(paths: Vec<String>) -> Vec<String> {
    paths
        .into_iter()
        .filter(|path| !Path::new(path).exists())
        .collect()
}
