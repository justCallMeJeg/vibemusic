use serde::Serialize;

pub const EVENT_PLAYBACK_STATE: &str = "audio-playback-state";
pub const EVENT_PLAYBACK_PROGRESS: &str = "audio-playback-progress";
pub const EVENT_PLAYBACK_FINISHED: &str = "audio-playback-finished";
pub const EVENT_PLAYBACK_ERROR: &str = "audio-playback-error";

/// Playback state shared between threads
#[derive(Debug, Clone, Serialize)]
pub struct PlaybackState {
    pub is_playing: bool,
    pub is_paused: bool,
    pub current_file: Option<String>,
    pub position_ms: u64,
    pub duration_ms: u64,
    pub volume: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct AudioDevice {
    pub name: String,
}

impl Default for PlaybackState {
    fn default() -> Self {
        Self {
            is_playing: false,
            is_paused: false,
            current_file: None,
            position_ms: 0,
            duration_ms: 0,
            volume: 1.0,
        }
    }
}

pub(crate) enum AudioCommand {
    Play {
        path: String,
        title: String,
        artist: String,
        album: String,
        artwork_path: Option<String>,
        crossfade: bool,
    },
    Pause,
    Resume,
    Stop,
    Seek(u64),
    SetVolume(f32),
    SetDevice(String),
    SetCrossfade(u64),
    SetFadeInOut {
        enabled: bool,
        duration_ms: u64,
    },
}
