use rodio::{Decoder, OutputStream, Sink, Source};
use souvlaki::{MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

pub mod state;
use state::PlaybackState;

// Event names
const EVENT_PLAYBACK_STATE: &str = "audio-playback-state";
const EVENT_PLAYBACK_PROGRESS: &str = "audio-playback-progress";
const EVENT_PLAYBACK_FINISHED: &str = "audio-playback-finished";

pub struct AudioEngine {
    sink: Arc<Mutex<Sink>>,
    // _stream is leaked to ensure it lives forever
    state: Arc<Mutex<PlaybackState>>,
    media_controls: Arc<Mutex<MediaControls>>,
}

impl AudioEngine {
    pub fn new(handle: &AppHandle) -> Self {
        let (stream, stream_handle) = OutputStream::try_default().unwrap();
        // Leak the stream to keep it alive globally without storing it in the struct
        // This avoids Send/Sync trait issues with OutputStream
        Box::leak(Box::new(stream));

        let sink = Sink::try_new(&stream_handle).unwrap();

        // Initialize Media Controls
        #[cfg(target_os = "windows")]
        let hwnd = {
            use raw_window_handle::HasWindowHandle;
            use raw_window_handle::RawWindowHandle;
            use tauri::WebviewWindow;

            let window: WebviewWindow = handle
                .get_webview_window("main")
                .expect("Main window not found");

            // Get raw window handle for souvlaki
            match window.window_handle().unwrap().as_raw() {
                RawWindowHandle::Win32(handle) => Some(handle.hwnd.get() as *mut std::ffi::c_void),
                _ => None,
            }
        };

        #[cfg(not(target_os = "windows"))]
        let hwnd = None;

        let config = PlatformConfig {
            dbus_name: "vibemusic",
            display_name: "Vibe Music",
            hwnd,
        };

        let mut controls = MediaControls::new(config).expect("Failed to initialize media controls");

        // Set initial state
        controls.set_playback(MediaPlayback::Stopped).ok();

        Self {
            sink: Arc::new(Mutex::new(sink)),
            state: Arc::new(Mutex::new(PlaybackState::default())),
            media_controls: Arc::new(Mutex::new(controls)),
        }
    }

    pub fn init_media_events(&self, handle: AppHandle) {
        let controls = self.media_controls.clone();

        let mut controls_guard = controls.lock().unwrap();
        controls_guard
            .attach(move |event| match event {
                souvlaki::MediaControlEvent::Play => {
                    handle.emit("media-play", ()).unwrap();
                }
                souvlaki::MediaControlEvent::Pause => {
                    handle.emit("media-pause", ()).unwrap();
                }
                souvlaki::MediaControlEvent::Toggle => {
                    handle.emit("media-toggle", ()).unwrap();
                }
                souvlaki::MediaControlEvent::Next => {
                    handle.emit("media-next", ()).unwrap();
                }
                souvlaki::MediaControlEvent::Previous => {
                    handle.emit("media-prev", ()).unwrap();
                }
                souvlaki::MediaControlEvent::Stop => {
                    handle.emit("media-stop", ()).unwrap();
                }
                _ => {}
            })
            .ok();
    }

    pub fn play(
        &self,
        path: String,
        title: Option<String>,
        artist: Option<String>,
        album: Option<String>,
        _cover: Option<String>,
    ) -> Result<(), String> {
        let file = File::open(&path).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);
        let source = Decoder::new(reader).map_err(|e| e.to_string())?;

        // Extract duration if available
        let total_duration = source
            .total_duration()
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let sink = self.sink.lock().unwrap();

        if !sink.empty() {
            sink.clear();
        }

        sink.append(source);
        sink.play();

        // Update state
        let mut state = self.state.lock().unwrap();
        state.is_playing = true;
        state.is_paused = false;
        state.current_file = Some(path);
        state.duration_ms = total_duration;
        state.position_ms = 0;

        // Update Media Controls
        let mut controls = self.media_controls.lock().unwrap();
        controls
            .set_metadata(MediaMetadata {
                title: Some(
                    title
                        .unwrap_or_else(|| "Unknown Title".to_string())
                        .as_str(),
                ),
                artist: Some(
                    artist
                        .unwrap_or_else(|| "Unknown Artist".to_string())
                        .as_str(),
                ),
                album: Some(
                    album
                        .unwrap_or_else(|| "Unknown Album".to_string())
                        .as_str(),
                ),
                duration: Some(Duration::from_millis(total_duration)),
                cover_url: None, // TODO: Handle cover
            })
            .ok();

        controls
            .set_playback(MediaPlayback::Playing {
                progress: Some(MediaPosition(Duration::from_millis(0))),
            })
            .ok();

        Ok(())
    }

    pub fn pause(&self) {
        let sink = self.sink.lock().unwrap();
        sink.pause();

        let mut state = self.state.lock().unwrap();
        state.is_paused = true;
        state.is_playing = false;

        let mut controls = self.media_controls.lock().unwrap();
        controls
            .set_playback(MediaPlayback::Paused {
                progress: Some(MediaPosition(Duration::from_millis(state.position_ms))),
            })
            .ok();
    }

    pub fn resume(&self) {
        let sink = self.sink.lock().unwrap();
        sink.play();

        let mut state = self.state.lock().unwrap();
        state.is_paused = false;
        state.is_playing = true;

        let mut controls = self.media_controls.lock().unwrap();
        controls
            .set_playback(MediaPlayback::Playing {
                progress: Some(MediaPosition(Duration::from_millis(state.position_ms))),
            })
            .ok();
    }

    pub fn stop(&self) {
        let sink = self.sink.lock().unwrap();
        sink.stop();

        let mut state = self.state.lock().unwrap();
        state.is_playing = false;
        state.is_paused = false;
        state.position_ms = 0;
        state.current_file = None;

        let mut controls = self.media_controls.lock().unwrap();
        controls.set_playback(MediaPlayback::Stopped).ok();
    }

    pub fn set_volume(&self, volume: f32) {
        let sink = self.sink.lock().unwrap();
        sink.set_volume(volume);

        let mut state = self.state.lock().unwrap();
        state.volume = volume;
    }

    pub fn seek(&self, position_ms: u64) {
        let sink = self.sink.lock().unwrap();
        let pos = Duration::from_millis(position_ms);
        sink.try_seek(pos).ok();

        let mut state = self.state.lock().unwrap();
        state.position_ms = position_ms;

        let mut controls = self.media_controls.lock().unwrap();
        if state.is_paused {
            controls
                .set_playback(MediaPlayback::Paused {
                    progress: Some(MediaPosition(pos)),
                })
                .ok();
        } else {
            controls
                .set_playback(MediaPlayback::Playing {
                    progress: Some(MediaPosition(pos)),
                })
                .ok();
        }
    }
}

// Global state wrapper
pub struct AudioState(pub Arc<AudioEngine>);

// Background progress tracker
pub fn start_progress_tracking(app: AppHandle, engine: Arc<AudioEngine>) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(250));
        let is_sink_empty = {
            let sink = engine.sink.lock().unwrap();
            sink.empty()
        };

        let mut state = engine.state.lock().unwrap();

        if state.is_playing && !state.is_paused {
            if is_sink_empty {
                state.is_playing = false;
                state.position_ms = 0;
                state.current_file = None;

                app.emit(EVENT_PLAYBACK_FINISHED, ()).ok();
                app.emit(EVENT_PLAYBACK_STATE, &*state).ok();

                let mut controls = engine.media_controls.lock().unwrap();
                controls.set_playback(MediaPlayback::Stopped).ok();
            } else {
                app.emit(EVENT_PLAYBACK_PROGRESS, &*state).ok();
            }
        }
    });
}

use crate::error::AppError;

// ... (existing imports)

// --- Tauri Commands ---

#[tauri::command]
pub fn audio_play(
    state: tauri::State<AudioState>,
    app: AppHandle,
    path: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    _cover: Option<String>,
) -> Result<(), AppError> {
    state
        .0
        .play(path, title, artist, album, _cover)
        .map_err(AppError::Audio)?;

    let s = state.0.state.lock().unwrap();
    app.emit(EVENT_PLAYBACK_STATE, &*s)
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub fn audio_pause(state: tauri::State<AudioState>, app: AppHandle) -> Result<(), AppError> {
    state.0.pause();
    let s = state.0.state.lock().unwrap();
    app.emit(EVENT_PLAYBACK_STATE, &*s)
        .map_err(|e| AppError::Unknown(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn audio_resume(state: tauri::State<AudioState>, app: AppHandle) -> Result<(), AppError> {
    state.0.resume();
    let s = state.0.state.lock().unwrap();
    app.emit(EVENT_PLAYBACK_STATE, &*s)
        .map_err(|e| AppError::Unknown(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn audio_stop(state: tauri::State<AudioState>, app: AppHandle) -> Result<(), AppError> {
    state.0.stop();
    let s = state.0.state.lock().unwrap();
    app.emit(EVENT_PLAYBACK_STATE, &*s)
        .map_err(|e| AppError::Unknown(e.to_string()))?;
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
pub fn audio_get_state(state: tauri::State<AudioState>) -> PlaybackState {
    let s = state.0.state.lock().unwrap();
    s.clone()
}
