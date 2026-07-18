use super::*;
use crate::audio::decoder::SymphoniaDecoder;
use std::time::{Duration, Instant};

#[test]
fn test_playback_state_default() {
    let state = PlaybackState::default();
    assert!(!state.is_playing);
    assert!(!state.is_paused);
    assert!(state.current_file.is_none());
    assert_eq!(state.position_ms, 0);
    assert_eq!(state.duration_ms, 0);
    assert_eq!(state.volume, 1.0);
}

#[test]
fn test_playback_state_serialization() {
    let state = PlaybackState {
        is_playing: true,
        is_paused: false,
        current_file: Some("/music/test.mp3".into()),
        position_ms: 50000,
        duration_ms: 200000,
        volume: 0.75,
    };
    let json = serde_json::to_string(&state).unwrap();
    assert!(json.contains("\"is_playing\":true"));
    assert!(json.contains("\"current_file\":\"/music/test.mp3\""));
    assert!(json.contains("\"volume\":0.75"));
}

#[test]
fn test_playback_state_clone() {
    let state = PlaybackState {
        is_playing: true,
        is_paused: false,
        current_file: Some("/music/clone.mp3".into()),
        position_ms: 10000,
        duration_ms: 300000,
        volume: 0.5,
    };
    let cloned = state.clone();
    assert_eq!(cloned.is_playing, state.is_playing);
    assert_eq!(cloned.current_file, state.current_file);
    assert_eq!(cloned.position_ms, state.position_ms);
}

#[test]
fn test_audio_device_serialization() {
    let device = AudioDevice {
        name: "Speakers".into(),
    };
    let json = serde_json::to_string(&device).unwrap();
    assert_eq!(json, r#"{"name":"Speakers"}"#);
}

#[test]
fn test_crossfade_state_none() {
    match crossfade::CrossfadeState::None {
        crossfade::CrossfadeState::None => {}
        _ => panic!("Expected None"),
    }
}

#[test]
fn test_crossfade_state_fading() {
    let fading = crossfade::CrossfadeState::Fading {
        start_time: Instant::now(),
        duration: Duration::from_millis(2000),
    };
    match fading {
        crossfade::CrossfadeState::Fading { duration, .. } => {
            assert_eq!(duration, Duration::from_millis(2000));
        }
        _ => panic!("Expected Fading"),
    }
}

#[test]
fn test_resample_audio_passthrough_same_rate() {
    let input = vec![0.5f32, -0.5, 0.25, -0.25];
    let mut output = vec![0.0f32; 8];
    let n = worker::AudioWorker::resample_audio(&input, 44100, 44100, 2, &mut output);
    assert_eq!(n, 4);
    assert_eq!(output[..4], input[..]);
}

#[test]
fn test_resample_audio_zero_rates() {
    let input = vec![0.5f32; 4];
    let mut output = vec![0.0f32; 8];
    let n = worker::AudioWorker::resample_audio(&input, 0, 44100, 2, &mut output);
    assert_eq!(n, 4);
    assert_eq!(output[..4], input[..]);
}

#[test]
fn test_symphonia_decoder_nonexistent_file() {
    let result = SymphoniaDecoder::new("C:\\nonexistent\\file.mp3");
    assert!(result.is_err());
}

#[test]
fn test_audio_command_send() {
    fn assert_send<T: Send>() {}
    assert_send::<types::AudioCommand>();
}

#[test]
fn test_playback_state_send() {
    fn assert_send<T: Send>() {}
    assert_send::<PlaybackState>();
}
