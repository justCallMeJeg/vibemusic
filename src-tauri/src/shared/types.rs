//! Cross-feature data types shared across VibeMusic modules.
//!
//! Consolidates type definitions previously scattered across `scanner.rs`,
//! `library.rs`, `playlists.rs`, and `stats.rs`.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Scanner types
// ---------------------------------------------------------------------------

/// Metadata extracted from an audio file.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrackMetadata {
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub file_format: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub artists: Vec<String>,
    pub featured_artist_names: Vec<String>,
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
    pub modification_time: u64,
}

/// Progress event emitted during scanning.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgress {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
    pub status: String,
}

/// Result of a folder scan.
#[derive(Debug, Serialize, Deserialize)]
pub struct ScanStats {
    pub scanned_count: usize,
    pub success_count: usize,
    pub error_count: usize,
}

// ---------------------------------------------------------------------------
// Library types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct LibraryTrack {
    pub id: i64,
    pub title: String,
    pub artist: Option<String>,
    pub artist_id: Option<i64>,
    pub artist_names: Vec<String>,
    pub artist_ids: Vec<i64>,
    pub artist_roles: Vec<String>,
    pub album: Option<String>,
    pub album_id: Option<i64>,
    pub duration_ms: u64,
    pub file_path: String,
    pub artwork_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Artist {
    pub id: i64,
    pub name: String,
    pub album_count: i64,
    pub track_count: i64,
    pub artwork_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LibraryAlbum {
    pub id: i64,
    pub title: String,
    pub artist_id: Option<i64>,
    pub artist_name: Option<String>,
    pub artist_names: Vec<String>,
    pub album_artist_names: Vec<String>,
    pub year: Option<i32>,
    pub artwork_path: Option<String>,
    pub track_count: i64,
    pub total_duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResults {
    pub tracks: Vec<LibraryTrack>,
    pub albums: Vec<LibraryAlbum>,
    pub playlists: Vec<Playlist>,
}

// ---------------------------------------------------------------------------
// Playlist types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub artwork_path: Option<String>,
    pub track_count: i64,
    pub created_at: String,
    pub is_liked: bool,
    pub is_system: bool,
    pub pinned: bool,
    pub pinned_at: Option<String>,
}

// ---------------------------------------------------------------------------
// Stats types
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct StatsData {
    pub top_tracks: Vec<TopTrack>,
    pub top_artists: Vec<TopArtist>,
    pub top_albums: Vec<TopAlbum>,
    pub activity_history: Vec<ActivityPoint>,
    pub top_genres: Vec<TopGenre>,
    pub heatmap: Vec<HeatmapPoint>,
    pub trends: TrendsData,
    pub total_listening_ms: i64,
    pub streaks: StreaksData,
    pub day_night_split: DayNightSplit,
    pub weekly_wrap: WeeklyWrapData,
}

#[derive(Serialize)]
pub struct TrendsData {
    pub listening_time_change: f64,
    pub play_count_change: f64,
    pub new_artists_count: i64,
}

#[derive(Serialize)]
pub struct HeatmapPoint {
    pub day: u8,
    pub hour: u8,
    pub intensity: u32,
    pub normalized: f64,
}

#[derive(Serialize)]
pub struct StreaksData {
    pub current_streak: i64,
    pub longest_streak: i64,
    pub week_days: Vec<WeekDayStatus>,
}

#[derive(Serialize)]
pub struct WeekDayStatus {
    pub day: String,
    pub active: bool,
    pub date: String,
}

#[derive(Serialize)]
pub struct DayNightSplit {
    pub day_plays: i64,
    pub night_plays: i64,
    pub day_percentage: f64,
    pub night_percentage: f64,
}

#[derive(Serialize)]
pub struct WeeklyWrapData {
    pub total_plays: i64,
    pub total_listening_ms: i64,
    pub unique_tracks: i64,
    pub unique_artists: i64,
    pub top_track: Option<String>,
    pub top_artist: Option<String>,
    pub most_active_day: Option<String>,
    pub most_active_day_plays: i64,
}

#[derive(Serialize)]
pub struct TopTrack {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub cover_image: Option<String>,
    pub file_path: String,
    pub play_count: i64,
    pub duration_ms: i64,
}

#[derive(Serialize)]
pub struct TopArtist {
    pub id: i64,
    pub name: String,
    pub cover_image: Option<String>,
    pub play_count: i64,
}

#[derive(Serialize)]
pub struct TopAlbum {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub cover_image: Option<String>,
    pub play_count: i64,
}

#[derive(Serialize)]
pub struct ActivityPoint {
    pub date: String,
    pub duration_ms: i64,
}

#[derive(Serialize)]
pub struct TopGenre {
    pub genre: String,
    pub play_count: i64,
}
