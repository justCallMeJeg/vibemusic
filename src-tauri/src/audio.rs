use rodio::{Decoder, OutputStream, Sink, Source};
use souvlaki::{MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

pub mod state;
use state::PlaybackState;

// Event names
const EVENT_PLAYBACK_STATE: &str = "audio-playback-state";
const EVENT_PLAYBACK_PROGRESS: &str = "audio-playback-progress";
const EVENT_PLAYBACK_FINISHED: &str = "audio-playback-finished";

struct TimerState {
    start_time: Option<Instant>,
    paused_duration: Duration,
    pause_start: Option<Instant>,
}

pub struct AudioEngine {
    sink: Arc<Mutex<Sink>>,
    // _stream is leaked to ensure it lives forever
    state: Arc<Mutex<PlaybackState>>,
    timer: Arc<Mutex<TimerState>>,
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
            timer: Arc::new(Mutex::new(TimerState {
                start_time: None,
                paused_duration: Duration::ZERO,
                pause_start: None,
            })),
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

        // Reset timer
        let mut timer = self.timer.lock().unwrap();
        timer.start_time = Some(Instant::now());
        timer.paused_duration = Duration::ZERO;
        timer.pause_start = None;

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

        let mut timer = self.timer.lock().unwrap();
        if timer.pause_start.is_none() {
            timer.pause_start = Some(Instant::now());
        }

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

        let mut timer = self.timer.lock().unwrap();
        if let Some(pause_start) = timer.pause_start {
            timer.paused_duration += pause_start.elapsed();
            timer.pause_start = None;
        }

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

        let mut timer = self.timer.lock().unwrap();
        timer.start_time = None;
        timer.paused_duration = Duration::ZERO;
        timer.pause_start = None;

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

        // Reset start time to act as if we started 'position_ms' ago
        // start_time = now - position_ms
        // paused_duration = 0
        // This is simpler than maintaining offsets
        let mut timer = self.timer.lock().unwrap();
        let now = Instant::now();
        if state.is_paused {
             // If paused, we want: when we resume, we start from here.
             // So essentially effective elapsed should be position_ms.
             // We can just set start_time = now - position_ms and pause_start = now
             // So when we resume, paused_duration = resume_time - pause_start (which is resume_time - now).
             // And elapsed = resume_time - start_time - paused_duration 
             //             = resume_time - (now - pos) - (resume_time - now)
             //             = resume_time - now + pos - resume_time + now
             //             = pos. Correct.
             timer.start_time = Some(now.checked_sub(Duration::from_millis(position_ms)).unwrap_or(now));
             timer.pause_start = Some(now);
             timer.paused_duration = Duration::ZERO;
        } else {
             timer.start_time = Some(now.checked_sub(Duration::from_millis(position_ms)).unwrap_or(now));
             timer.pause_start = None;
             timer.paused_duration = Duration::ZERO;
        }

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
        thread::sleep(Duration::from_millis(100));
        
        // Timer update logic
        // We do this in a block to release locks quickly
        let (should_emit, current_pos_ms) = {
             let mut state = engine.state.lock().unwrap();
             let timer = engine.timer.lock().unwrap();

             if state.is_playing && !state.is_paused {
                 if let Some(start_time) = timer.start_time {
                     let elapsed = start_time.elapsed();
                     let total_paused = timer.paused_duration;
                     // effective_elapsed = elapsed - total_paused
                     // careful with underflow if clocks skew or something weird, but usually elapsed > paused
                     let effective_elapsed = if elapsed >= total_paused { elapsed - total_paused } else { Duration::ZERO };
                     state.position_ms = effective_elapsed.as_millis() as u64;
                     
                     // Cap at duration if known
                     if state.duration_ms > 0 && state.position_ms > state.duration_ms {
                         state.position_ms = state.duration_ms;
                     }
                     
                     (true, state.position_ms)
                 } else {
                     (false, 0)
                 }
             } else {
                 (false, 0)
             }
        };

        let is_sink_empty = {
            let sink = engine.sink.lock().unwrap();
            sink.empty()
        };

        // We check state again for sink empty logic
        let mut state = engine.state.lock().unwrap();
        
        if state.is_playing && !state.is_paused {
             if is_sink_empty {
                state.is_playing = false;
                state.position_ms = 0;
                state.current_file = None;

                // Stop timer
                let mut timer = engine.timer.lock().unwrap();
                timer.start_time = None;
                timer.paused_duration = Duration::ZERO;
                timer.pause_start = None;

                app.emit(EVENT_PLAYBACK_FINISHED, ()).ok();
                app.emit(EVENT_PLAYBACK_STATE, &*state).ok();

                let mut controls = engine.media_controls.lock().unwrap();
                controls.set_playback(MediaPlayback::Stopped).ok();
            } else if should_emit {
                // state.position_ms was updated in the block above, need to make sure we emit the updated state
                // Actually we just locked it again, so we might have overwritten it?
                // No, we updated it in the first block.
                // But wait, we re-acquired the lock.
                // The first block: `let mut state = engine.state.lock().unwrap(); state.position_ms = ...;` -> lock released, state updated.
                // Then `let mut state = engine.state.lock().unwrap();` -> acquires lock, sees updated state.
                // So safe.
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
