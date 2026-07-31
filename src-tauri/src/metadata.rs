use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize)]
pub struct MediaMetadata {
    pub duration_ms: u64,
    pub sample_rate: u32,
    pub channels: u16,
    pub format_name: String,
    pub album_artist: Option<String>,
    pub composer: Option<String>,
    pub copyright: Option<String>,
    pub date: Option<String>,
    pub genre: Option<String>,
}

const PROBE_CACHE_TTL: Duration = Duration::from_secs(5);

type ProbeCache = HashMap<String, (Instant, MediaMetadata)>;

fn probe_cache() -> &'static Mutex<ProbeCache> {
    static CACHE: OnceLock<Mutex<ProbeCache>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
pub fn probe_file(path: String) -> Result<MediaMetadata, String> {
    // Check in-memory cache first
    let cache_key = path.clone();
    {
        let mut cache = probe_cache()
            .lock()
            .map_err(|e| format!("Cache lock poisoned: {}", e))?;
        if let Some((stored_at, cached)) = cache.get(&cache_key) {
            if stored_at.elapsed() < PROBE_CACHE_TTL {
                return Ok(cached.clone());
            }
        }
        // Evict expired entries opportunistically
        cache.retain(|_, (t, _)| t.elapsed() < PROBE_CACHE_TTL);
    }

    let path_obj = Path::new(&path);

    if !path_obj.exists() {
        return Err("File not found".to_string());
    }

    let file = Probe::open(path_obj)
        .map_err(|e| format!("Failed to open file: {}", e))?
        .read();

    let tagged_file = file.map_err(|e| format!("Failed to read file: {}", e))?;
    let props = tagged_file.properties();

    let format_name = path_obj
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_string();

    let mut album_artist = None;
    let mut composer = None;
    let mut copyright = None;
    let mut date = None;
    let mut genre = None;

    if let Some(tag) = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag())
    {
        album_artist = tag
            .get_string(&lofty::tag::ItemKey::AlbumArtist)
            .map(|s| s.to_string());
        composer = tag
            .get_string(&lofty::tag::ItemKey::Composer)
            .map(|s| s.to_string());
        copyright = tag
            .get_string(&lofty::tag::ItemKey::CopyrightUrl)
            .map(|s| s.to_string());
        date = tag
            .get_string(&lofty::tag::ItemKey::Year)
            .map(|s| s.to_string());
        genre = tag
            .get_string(&lofty::tag::ItemKey::Genre)
            .map(|s| s.to_string());
    }

    let metadata = MediaMetadata {
        duration_ms: props.duration().as_millis() as u64,
        sample_rate: props.sample_rate().unwrap_or(44100),
        channels: props.channels().unwrap_or(2) as u16,
        format_name,
        album_artist,
        composer,
        copyright,
        date,
        genre,
    };

    // Cache before returning
    if let Ok(mut cache) = probe_cache().lock() {
        cache.insert(cache_key, (Instant::now(), metadata.clone()));
    }

    Ok(metadata)
}
