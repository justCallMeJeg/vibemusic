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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn track_metadata_serializes() {
        let meta = TrackMetadata {
            file_path: "/music/song.mp3".into(),
            file_name: "song.mp3".into(),
            file_size: 1024,
            file_format: "MP3".into(),
            title: Some("Test Song".into()),
            artist: Some("Test Artist".into()),
            artists: vec!["Test Artist".into()],
            featured_artist_names: vec![],
            album: Some("Test Album".into()),
            album_artist: None,
            track_number: Some(1),
            disc_number: Some(1),
            year: Some(2024),
            genre: Some("Rock".into()),
            duration_ms: 200000,
            sample_rate: Some(44100),
            bit_rate: Some(320),
            channels: Some(2),
            artwork_path: None,
            modification_time: 1704067200,
        };
        let json = serde_json::to_string(&meta).unwrap();
        assert!(json.contains("\"file_path\":\"/music/song.mp3\""));
        assert!(json.contains("\"title\":\"Test Song\""));
    }

    #[test]
    fn library_track_serializes() {
        let track = LibraryTrack {
            id: 1,
            title: "Song".into(),
            artist: Some("Artist".into()),
            artist_id: Some(10),
            artist_names: vec!["Artist".into()],
            artist_ids: vec![10],
            artist_roles: vec!["main".into()],
            album: Some("Album".into()),
            album_id: Some(5),
            duration_ms: 180000,
            file_path: "/music/song.flac".into(),
            artwork_path: Some("/covers/abc.jpg".into()),
        };
        let json = serde_json::to_string(&track).unwrap();
        assert!(json.contains("\"id\":1"));
        assert!(json.contains("\"title\":\"Song\""));
        assert!(json.contains("\"file_path\":\"/music/song.flac\""));
    }

    #[test]
    fn artist_serializes() {
        let artist = Artist {
            id: 42,
            name: "Test Artist".into(),
            album_count: 3,
            track_count: 25,
            artwork_path: Some("/art/test.jpg".into()),
        };
        let json = serde_json::to_string(&artist).unwrap();
        assert!(json.contains("\"name\":\"Test Artist\""));
        assert!(json.contains("\"album_count\":3"));
    }

    #[test]
    fn library_album_serializes() {
        let album = LibraryAlbum {
            id: 7,
            title: "Great Album".into(),
            artist_id: Some(42),
            artist_name: Some("Artist".into()),
            artist_names: vec!["Artist".into()],
            album_artist_names: vec!["Artist".into()],
            year: Some(2023),
            artwork_path: Some("/art/album.jpg".into()),
            track_count: 12,
            total_duration_ms: 3600000,
        };
        let json = serde_json::to_string(&album).unwrap();
        assert!(json.contains("\"title\":\"Great Album\""));
        assert!(json.contains("\"track_count\":12"));
    }

    #[test]
    fn playlist_serializes() {
        let playlist = Playlist {
            id: 3,
            name: "Favorites".into(),
            description: Some("My favorite tracks".into()),
            artwork_path: None,
            track_count: 15,
            created_at: "2024-01-15T10:00:00Z".into(),
            is_liked: false,
            is_system: false,
            pinned: true,
            pinned_at: Some("2024-06-01T00:00:00Z".into()),
        };
        let json = serde_json::to_string(&playlist).unwrap();
        assert!(json.contains("\"name\":\"Favorites\""));
        assert!(json.contains("\"track_count\":15"));
        assert!(json.contains("\"pinned\":true"));
    }

    #[test]
    fn scan_progress_serializes() {
        let progress = ScanProgress {
            current: 5,
            total: 100,
            current_file: "song.mp3".into(),
            status: "Scanning".into(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert_eq!(
            json,
            r#"{"current":5,"total":100,"current_file":"song.mp3","status":"Scanning"}"#
        );
    }

    #[test]
    fn scan_stats_serializes() {
        let stats = ScanStats {
            scanned_count: 100,
            success_count: 95,
            error_count: 5,
        };
        let json = serde_json::to_string(&stats).unwrap();
        assert_eq!(
            json,
            r#"{"scanned_count":100,"success_count":95,"error_count":5}"#
        );
    }

    #[test]
    fn search_results_serializes() {
        let results = SearchResults {
            tracks: vec![],
            albums: vec![],
            playlists: vec![],
        };
        let json = serde_json::to_string(&results).unwrap();
        assert!(json.contains("\"tracks\":[]"));
        assert!(json.contains("\"playlists\":[]"));
    }

    #[test]
    fn stats_data_contains_all_fields() {
        let stats = StatsData {
            top_tracks: vec![],
            top_artists: vec![],
            top_albums: vec![],
            activity_history: vec![],
            top_genres: vec![],
            heatmap: vec![],
            trends: TrendsData {
                listening_time_change: 15.5,
                play_count_change: -3.2,
                new_artists_count: 5,
            },
            total_listening_ms: 3600000,
            streaks: StreaksData {
                current_streak: 7,
                longest_streak: 30,
                week_days: vec![],
            },
            day_night_split: DayNightSplit {
                day_plays: 100,
                night_plays: 50,
                day_percentage: 66.7,
                night_percentage: 33.3,
            },
            weekly_wrap: WeeklyWrapData {
                total_plays: 200,
                total_listening_ms: 7200000,
                unique_tracks: 15,
                unique_artists: 8,
                top_track: Some("Best Song".into()),
                top_artist: Some("Best Artist".into()),
                most_active_day: Some("Monday".into()),
                most_active_day_plays: 40,
            },
        };
        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"total_listening_ms\":3600000"));
        assert!(json.contains("\"current_streak\":7"));
    }

    #[test]
    fn heatmap_point_serializes() {
        let point = HeatmapPoint {
            day: 3,
            hour: 14,
            intensity: 25,
            normalized: 0.5,
        };
        let json = serde_json::to_string(&point).unwrap();
        assert_eq!(
            json,
            r#"{"day":3,"hour":14,"intensity":25,"normalized":0.5}"#
        );
    }

    #[test]
    fn week_day_status_serializes() {
        let day = WeekDayStatus {
            day: "Monday".into(),
            active: true,
            date: "2024-01-01".into(),
        };
        let json = serde_json::to_string(&day).unwrap();
        assert_eq!(
            json,
            r#"{"day":"Monday","active":true,"date":"2024-01-01"}"#
        );
    }

    #[test]
    fn top_track_serializes() {
        let tt = TopTrack {
            id: 1,
            title: "Hit Song".into(),
            artist: "Hit Artist".into(),
            cover_image: Some("/covers/hit.jpg".into()),
            file_path: "/music/hit.mp3".into(),
            play_count: 500,
            duration_ms: 240000,
        };
        let json = serde_json::to_string(&tt).unwrap();
        assert!(json.contains("\"play_count\":500"));
        assert!(json.contains("\"title\":\"Hit Song\""));
    }

    #[test]
    fn empty_playlist_has_valid_json() {
        let playlist = Playlist {
            id: 0,
            name: String::new(),
            description: None,
            artwork_path: None,
            track_count: 0,
            created_at: String::new(),
            is_liked: false,
            is_system: false,
            pinned: false,
            pinned_at: None,
        };
        let json = serde_json::to_string(&playlist).unwrap();
        let deserialized: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized["id"], 0);
        assert_eq!(deserialized["name"], "");
    }
}
