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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn audio_command_play_construct() {
        let cmd = AudioCommand::Play {
            path: "/music/test.mp3".into(),
            title: "Test".into(),
            artist: "Artist".into(),
            album: "Album".into(),
            artwork_path: Some("/art/test.jpg".into()),
            crossfade: true,
        };
        match cmd {
            AudioCommand::Play {
                path,
                title,
                artist,
                album,
                artwork_path,
                crossfade,
            } => {
                assert_eq!(path, "/music/test.mp3");
                assert_eq!(title, "Test");
                assert_eq!(artist, "Artist");
                assert_eq!(album, "Album");
                assert_eq!(artwork_path, Some("/art/test.jpg".into()));
                assert!(crossfade);
            }
            _ => panic!("Expected Play variant"),
        }
    }

    #[test]
    fn audio_command_pause_construct() {
        let cmd = AudioCommand::Pause;
        assert!(matches!(cmd, AudioCommand::Pause));
    }

    #[test]
    fn audio_command_resume_construct() {
        let cmd = AudioCommand::Resume;
        assert!(matches!(cmd, AudioCommand::Resume));
    }

    #[test]
    fn audio_command_stop_construct() {
        let cmd = AudioCommand::Stop;
        assert!(matches!(cmd, AudioCommand::Stop));
    }

    #[test]
    fn audio_command_seek_construct() {
        let cmd = AudioCommand::Seek(45000);
        match cmd {
            AudioCommand::Seek(pos) => assert_eq!(pos, 45000),
            _ => panic!("Expected Seek variant"),
        }
    }

    #[test]
    fn audio_command_set_volume_construct() {
        let cmd = AudioCommand::SetVolume(0.75);
        match cmd {
            AudioCommand::SetVolume(v) => assert!((v - 0.75).abs() < f32::EPSILON),
            _ => panic!("Expected SetVolume variant"),
        }
    }

    #[test]
    fn audio_command_set_device_construct() {
        let cmd = AudioCommand::SetDevice("Speakers".into());
        match cmd {
            AudioCommand::SetDevice(name) => assert_eq!(name, "Speakers"),
            _ => panic!("Expected SetDevice variant"),
        }
    }

    #[test]
    fn audio_command_set_crossfade_construct() {
        let cmd = AudioCommand::SetCrossfade(3000);
        match cmd {
            AudioCommand::SetCrossfade(ms) => assert_eq!(ms, 3000),
            _ => panic!("Expected SetCrossfade variant"),
        }
    }

    #[test]
    fn audio_command_set_fade_in_out_construct() {
        let cmd = AudioCommand::SetFadeInOut {
            enabled: true,
            duration_ms: 2000,
        };
        match cmd {
            AudioCommand::SetFadeInOut { enabled, duration_ms } => {
                assert!(enabled);
                assert_eq!(duration_ms, 2000);
            }
            _ => panic!("Expected SetFadeInOut variant"),
        }
    }

    #[test]
    fn audio_command_play_with_no_artwork() {
        let cmd = AudioCommand::Play {
            path: "/music/noart.mp3".into(),
            title: "No Art".into(),
            artist: "Artist".into(),
            album: "Album".into(),
            artwork_path: None,
            crossfade: false,
        };
        match cmd {
            AudioCommand::Play { artwork_path, .. } => assert!(artwork_path.is_none()),
            _ => panic!("Expected Play variant"),
        }
    }
}
