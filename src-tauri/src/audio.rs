use rodio::{Decoder, OutputStream, Sink, Source};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub mod state;
use state::PlaybackState;

// Event names
const EVENT_PLAYBACK_STATE: &str = "audio-playback-state";
const EVENT_PLAYBACK_PROGRESS: &str = "audio-playback-progress";

pub struct AudioEngine {
    sink: Arc<Mutex<Sink>>,
    // _stream is leaked to ensure it lives forever
    state: Arc<Mutex<PlaybackState>>,
}

impl AudioEngine {
    pub fn new() -> Self {
        let (stream, stream_handle) = OutputStream::try_default().unwrap();
        // Leak the stream to keep it alive globally without storing it in the struct
        // This avoids Send/Sync trait issues with OutputStream
        Box::leak(Box::new(stream));

        let sink = Sink::try_new(&stream_handle).unwrap();

        Self {
            sink: Arc::new(Mutex::new(sink)),
            state: Arc::new(Mutex::new(PlaybackState::default())),
        }
    }

    pub fn play(&self, path: String) -> Result<(), String> {
        let file = File::open(&path).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);
        let source = Decoder::new(reader).map_err(|e| e.to_string())?;

        // Extract duration if available
        let total_duration = source
            .total_duration()
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let sink = self.sink.lock().unwrap();

        // Stop current track if empty (though we usually clear it before)
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

        Ok(())
    }

    pub fn pause(&self) {
        let sink = self.sink.lock().unwrap();
        sink.pause();

        let mut state = self.state.lock().unwrap();
        state.is_paused = true;
        state.is_playing = false;
    }

    pub fn resume(&self) {
        let sink = self.sink.lock().unwrap();
        sink.play();

        let mut state = self.state.lock().unwrap();
        state.is_paused = false;
        state.is_playing = true;
    }

    pub fn stop(&self) {
        let sink = self.sink.lock().unwrap();
        sink.stop(); // Clears queue

        let mut state = self.state.lock().unwrap();
        state.is_playing = false;
        state.is_paused = false;
        state.position_ms = 0;
        state.current_file = None;
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

        // Update state immediately for responsiveness
        let mut state = self.state.lock().unwrap();
        state.position_ms = position_ms;
    }
}

// Global state wrapper for Tauri
pub struct AudioState(pub Arc<AudioEngine>);

// Background progress tracker
pub fn start_progress_tracking(app: AppHandle, engine: Arc<AudioEngine>) {
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_millis(250)); // Update 4 times a second

            let state_guard = engine.state.lock().unwrap();

            if state_guard.is_playing && !state_guard.is_paused {
                // Approximate position tracking not perfect with raw rodio sink
                // For accurate tracking we'd need to track elapsed time manually
                // Since rodio doesn't expose current position easily on Sink
                // TODO: Implement more accurate manual timer based tracking

                // For now, we emit the state to frontend
                app.emit(EVENT_PLAYBACK_PROGRESS, &*state_guard).ok();
            }
        }
    });
}

// --- Tauri Commands ---

#[tauri::command]
pub fn audio_play(
    state: tauri::State<AudioState>,
    app: AppHandle,
    path: String,
) -> Result<(), String> {
    state.0.play(path)?;

    // Start tracking if not already running (simplified for now)
    // In a real app we'd spawn this once at startup
    // For now we just emit the initial state
    let s = state.0.state.lock().unwrap();
    app.emit(EVENT_PLAYBACK_STATE, &*s)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn audio_pause(state: tauri::State<AudioState>, app: AppHandle) -> Result<(), String> {
    state.0.pause();
    let s = state.0.state.lock().unwrap();
    app.emit(EVENT_PLAYBACK_STATE, &*s)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn audio_resume(state: tauri::State<AudioState>, app: AppHandle) -> Result<(), String> {
    state.0.resume();
    let s = state.0.state.lock().unwrap();
    app.emit(EVENT_PLAYBACK_STATE, &*s)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn audio_stop(state: tauri::State<AudioState>, app: AppHandle) -> Result<(), String> {
    state.0.stop();
    let s = state.0.state.lock().unwrap();
    app.emit(EVENT_PLAYBACK_STATE, &*s)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn audio_seek(state: tauri::State<AudioState>, position_ms: u64) -> Result<(), String> {
    state.0.seek(position_ms);
    Ok(())
}

#[tauri::command]
pub fn audio_set_volume(state: tauri::State<AudioState>, volume: f32) -> Result<(), String> {
    state.0.set_volume(volume);
    Ok(())
}

#[tauri::command]
pub fn audio_get_state(state: tauri::State<AudioState>) -> PlaybackState {
    let s = state.0.state.lock().unwrap();
    s.clone()
}
