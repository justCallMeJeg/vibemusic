use super::engine::AudioState;
use super::types::{AudioDevice, PlaybackState};
use crate::shared::error::AppError;
use cpal::traits::{DeviceTrait, HostTrait};

#[tauri::command]
pub fn audio_play(
    state: tauri::State<AudioState>,
    path: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    artwork_path: Option<String>,
    crossfade: Option<bool>,
) -> Result<(), AppError> {
    state.0.play(
        path,
        title.unwrap_or("Unknown".into()),
        artist.unwrap_or("Unknown".into()),
        album.unwrap_or("Unknown".into()),
        artwork_path,
        crossfade.unwrap_or(false),
    );
    Ok(())
}

#[tauri::command]
pub fn audio_pause(state: tauri::State<AudioState>) -> Result<(), AppError> {
    state.0.pause();
    Ok(())
}

#[tauri::command]
pub fn audio_resume(state: tauri::State<AudioState>) -> Result<(), AppError> {
    state.0.resume();
    Ok(())
}

#[tauri::command]
pub fn audio_stop(state: tauri::State<AudioState>) -> Result<(), AppError> {
    state.0.stop();
    Ok(())
}

#[tauri::command]
pub fn audio_seek(state: tauri::State<AudioState>, position_ms: u64) -> Result<(), AppError> {
    state.0.seek(position_ms);
    Ok(())
}

#[tauri::command]
pub fn audio_set_volume(state: tauri::State<AudioState>, volume: f32) -> Result<(), AppError> {
    state.0.set_volume(volume);
    Ok(())
}

#[tauri::command]
pub fn audio_get_devices() -> Result<Vec<AudioDevice>, AppError> {
    let host = cpal::default_host();
    let devices = host
        .output_devices()
        .map_err(|e| AppError::Audio(e.to_string()))?
        .filter_map(|d| d.name().ok())
        .map(|name| AudioDevice { name })
        .collect();
    Ok(devices)
}

#[tauri::command]
pub fn audio_set_device(
    state: tauri::State<AudioState>,
    device_name: String,
) -> Result<(), AppError> {
    state.0.set_device(device_name);
    Ok(())
}

#[tauri::command]
pub fn audio_set_crossfade(
    state: tauri::State<AudioState>,
    duration_ms: u64,
) -> Result<(), AppError> {
    state.0.set_crossfade(duration_ms);
    Ok(())
}

#[tauri::command]
pub fn audio_set_fade_in_out(
    state: tauri::State<AudioState>,
    enabled: bool,
    duration_ms: Option<u64>,
) -> Result<(), AppError> {
    let duration = duration_ms.unwrap_or(1000).min(3000);
    state.0.set_fade_in_out(enabled, duration);
    Ok(())
}

#[tauri::command]
pub fn audio_get_state(state: tauri::State<AudioState>) -> PlaybackState {
    state.0.get_state()
}
