//! Audio Engine using FFmpeg (decoding) + CPAL (output)
//!
//! Architecture:
//! - AudioEngine: Public API, sends commands to AudioThread
//! - AudioThread: Spawns FFmpeg subprocess, reads PCM from pipe, pushes to ringbuf
//! - CPAL Callback: Pops from ringbuf, writes to output

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Stream, StreamConfig};
use ringbuf::{traits::{Consumer, Observer, Producer, Split}, HeapRb};
use serde::Serialize;
use souvlaki::{MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

use crate::ffmpeg::{self, FFmpegProcess};

// Event names
const EVENT_PLAYBACK_STATE: &str = "audio-playback-state";
const EVENT_PLAYBACK_PROGRESS: &str = "audio-playback-progress";
const EVENT_PLAYBACK_FINISHED: &str = "audio-playback-finished";
const EVENT_PLAYBACK_ERROR: &str = "audio-playback-error";

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

/// Commands sent to the audio thread
enum AudioCommand {
    Play {
        path: String,
        title: String,
        artist: String,
        album: String,
        _cover: Option<String>,
    },
    Pause,
    Resume,
    Stop,
    Seek(u64),
    SetVolume(f32),
    SetDevice(String),
}

/// Main audio engine - public API
pub struct AudioEngine {
    command_tx: Sender<AudioCommand>,
    state: Arc<Mutex<PlaybackState>>,
    media_controls: Arc<Mutex<MediaControls>>,
}

impl AudioEngine {
    pub fn new(handle: AppHandle) -> Self {
        // Initialize Media Controls
        #[cfg(target_os = "windows")]
        let hwnd = {
            use raw_window_handle::HasWindowHandle;
            use raw_window_handle::RawWindowHandle;
            use tauri::WebviewWindow;

            let window: WebviewWindow = handle
                .get_webview_window("main")
                .expect("Main window not found");

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

        let mut controls =
            MediaControls::new(config).expect("Failed to initialize media controls");
        controls.set_playback(MediaPlayback::Stopped).ok();

        let (tx, rx) = mpsc::channel();
        let state = Arc::new(Mutex::new(PlaybackState::default()));
        let controls = Arc::new(Mutex::new(controls));

        let state_clone = state.clone();
        let controls_clone = controls.clone();
        let handle_clone = handle.clone();

        // Spawn audio thread
        thread::spawn(move || {
            let mut worker = AudioWorker::new(rx, state_clone, controls_clone, handle_clone);
            worker.run();
        });

        Self {
            command_tx: tx,
            state,
            media_controls: controls,
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
        title: String,
        artist: String,
        album: String,
        cover: Option<String>,
    ) {
        self.command_tx
            .send(AudioCommand::Play {
                path,
                title,
                artist,
                album,
                _cover: cover,
            })
            .ok();
    }

    pub fn pause(&self) {
        self.command_tx.send(AudioCommand::Pause).ok();
    }

    pub fn resume(&self) {
        self.command_tx.send(AudioCommand::Resume).ok();
    }

    pub fn stop(&self) {
        self.command_tx.send(AudioCommand::Stop).ok();
    }

    pub fn seek(&self, position_ms: u64) {
        self.command_tx.send(AudioCommand::Seek(position_ms)).ok();
    }

    pub fn set_volume(&self, volume: f32) {
        self.command_tx.send(AudioCommand::SetVolume(volume)).ok();
    }

    pub fn set_device(&self, device_name: String) {
        self.command_tx
            .send(AudioCommand::SetDevice(device_name))
            .ok();
    }

    pub fn get_state(&self) -> PlaybackState {
        self.state.lock().unwrap().clone()
    }
}

/// Audio worker thread - handles decoding and playback
struct AudioWorker {
    receiver: Receiver<AudioCommand>,
    state: Arc<Mutex<PlaybackState>>,
    media_controls: Arc<Mutex<MediaControls>>,
    app_handle: AppHandle,

    // Playback resources
    _current_stream: Option<Stream>,
    producer: Option<ringbuf::HeapProd<f32>>,
    volume: Arc<AtomicU64>,
    is_playing: Arc<AtomicBool>,
    device_error: Arc<AtomicBool>,

    // FFmpeg process
    ffmpeg_process: Option<FFmpegProcess>,

    // Device config
    device_sample_rate: u32,
    device_channels: u16,
    selected_device_name: Option<String>,

    // Track info
    current_file_path: Option<String>,
    current_title: String,
    current_artist: String,
    current_album: String,
    duration_ms: u64,
    current_position_ms: u64,

    // Position tracking
    samples_played: u64,

    // Read buffer
    read_buffer: Vec<f32>,
}

impl AudioWorker {
    fn new(
        receiver: Receiver<AudioCommand>,
        state: Arc<Mutex<PlaybackState>>,
        media_controls: Arc<Mutex<MediaControls>>,
        app_handle: AppHandle,
    ) -> Self {
        // Initial setup - default device
        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .expect("No output device found");
        let config = device.default_output_config().expect("No default config");

        Self {
            receiver,
            state,
            media_controls,
            app_handle,
            _current_stream: None,
            producer: None,
            volume: Arc::new(AtomicU64::new(f32::to_bits(1.0) as u64)),
            is_playing: Arc::new(AtomicBool::new(false)),
            device_error: Arc::new(AtomicBool::new(false)),
            ffmpeg_process: None,
            device_sample_rate: config.sample_rate().0,
            device_channels: config.channels(),
            selected_device_name: None,
            current_file_path: None,
            current_title: String::new(),
            current_artist: String::new(),
            current_album: String::new(),
            duration_ms: 0,
            current_position_ms: 0,
            samples_played: 0,
            read_buffer: vec![0.0f32; 8192], // 8K sample buffer
        }
    }

    fn run(&mut self) {
        loop {
            match self.receiver.recv_timeout(Duration::from_millis(5)) {
                Ok(cmd) => self.handle_command(cmd),
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Check for device errors and reinit if needed
                    if self.device_error.load(Ordering::Relaxed) {
                        self.handle_device_change();
                    }
                    if self.is_playing.load(Ordering::Relaxed) {
                        self.decode_and_push();
                    }
                    self.emit_progress();
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    }

    fn handle_command(&mut self, cmd: AudioCommand) {
        match cmd {
            AudioCommand::Play {
                path,
                title,
                artist,
                album,
                _cover: _,
            } => {
                self.play_file(&path, &title, &artist, &album);
            }
            AudioCommand::Pause => self.pause(),
            AudioCommand::Resume => self.resume(),
            AudioCommand::Stop => self.stop(),
            AudioCommand::Seek(pos) => self.seek(pos),
            AudioCommand::SetVolume(vol) => {
                self.volume.store(f32::to_bits(vol) as u64, Ordering::Relaxed);
                self.state.lock().unwrap().volume = vol;
            }
            AudioCommand::SetDevice(name) => {
                self.selected_device_name = Some(name);
                self.handle_device_change();
            }
        }
    }

    fn play_file(&mut self, path: &str, title: &str, artist: &str, album: &str) {
        // Stop any current playback
        self.stop();

        // Probe file for metadata
        let metadata = match ffmpeg::probe_file(path) {
            Ok(m) => m,
            Err(e) => {
                let msg = format!("Failed to probe file: {}", e);
                eprintln!("{}", msg);
                self.app_handle.emit(EVENT_PLAYBACK_ERROR, msg).ok();
                return;
            }
        };

        self.duration_ms = metadata.duration_ms;

        // Setup CPAL stream with file's sample rate
        self.recreate_cpal_stream(metadata.sample_rate, metadata.channels);

        // Spawn FFmpeg process
        match FFmpegProcess::spawn(path, self.device_sample_rate, self.device_channels) {
            Ok(process) => {
                self.ffmpeg_process = Some(process);
            }
            Err(e) => {
                let msg = format!("Failed to spawn FFmpeg: {}", e);
                eprintln!("{}", msg);
                self.app_handle.emit(EVENT_PLAYBACK_ERROR, msg).ok();
                return;
            }
        }

        // Store track info
        self.current_file_path = Some(path.to_string());
        self.current_title = title.to_string();
        self.current_artist = artist.to_string();
        self.current_album = album.to_string();
        self.current_position_ms = 0;
        self.samples_played = 0;

        // Update state
        {
            let mut s = self.state.lock().unwrap();
            s.is_playing = true;
            s.is_paused = false;
            s.current_file = Some(path.to_string());
            s.duration_ms = self.duration_ms;
            s.position_ms = 0;
        }

        // Update media controls
        if let Ok(mut c) = self.media_controls.lock() {
            c.set_metadata(MediaMetadata {
                title: Some(title),
                artist: Some(artist),
                album: Some(album),
                duration: Some(Duration::from_millis(self.duration_ms)),
                cover_url: None,
            })
            .ok();
            c.set_playback(MediaPlayback::Playing {
                progress: Some(MediaPosition(Duration::ZERO)),
            })
            .ok();
        }

        self.emit_state();
    }

    fn recreate_cpal_stream(&mut self, _sample_rate: u32, _channels: u16) {
        let host = cpal::default_host();
        
        // Try to find selected device, otherwise default
        let device = if let Some(ref name) = self.selected_device_name {
            host.output_devices()
                .ok()
                .and_then(|mut devices| {
                    devices.find(|d| d.name().map(|n| n == *name).unwrap_or(false))
                })
                .or_else(|| host.default_output_device())
                .expect("No output device found")
        } else {
            host.default_output_device().expect("No output device found")
        };

        // Always use device default config - FFmpeg will resample to match
        let config: StreamConfig = device.default_output_config().unwrap().into();

        self.device_sample_rate = config.sample_rate.0;
        self.device_channels = config.channels;

        // Setup Ringbuf (1 second buffer)
        let buffer_size = self.device_sample_rate as usize * self.device_channels as usize;
        let rb = HeapRb::<f32>::new(buffer_size);
        let (producer, consumer) = rb.split();
        self.producer = Some(producer);

        // Setup Stream
        let volume = self.volume.clone();
        let is_playing = self.is_playing.clone();
        let device_error = self.device_error.clone();
        let mut consumer = consumer;
        let channels = self.device_channels as usize;

        let stream = device
            .build_output_stream(
                &config,
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    if !is_playing.load(Ordering::Relaxed) {
                        data.fill(0.0);
                        return;
                    }

                    let vol = f32::from_bits(volume.load(Ordering::Relaxed) as u32);
                    for frame in data.chunks_mut(channels) {
                        for sample in frame.iter_mut() {
                            if let Some(s) = consumer.try_pop() {
                                *sample = s * vol;
                            } else {
                                *sample = 0.0;
                            }
                        }
                    }
                },
                move |err| {
                    eprintln!("CPAL Error: {}", err);
                    device_error.store(true, Ordering::Relaxed);
                },
                None,
            )
            .expect("Failed to build CPAL stream");

        stream.play().expect("Failed to play CPAL stream");
        self._current_stream = Some(stream);
        self.is_playing.store(true, Ordering::Relaxed);
    }

    fn decode_and_push(&mut self) {
        let Some(ref mut ffmpeg) = self.ffmpeg_process else {
            return;
        };
        let Some(ref mut producer) = self.producer else {
            return;
        };

        // Keep filling buffer until it's adequately full or we run out of data
        // Target: keep buffer at least 50% full
        let capacity = producer.capacity().get();
        let target_fill = capacity / 2;
        
        loop {
            let occupied = capacity - producer.vacant_len();
            if occupied >= target_fill {
                break; // Buffer is full enough
            }
            
            if producer.vacant_len() < self.read_buffer.len() {
                break; // Not enough space for a full read
            }

            // Read from FFmpeg
            match ffmpeg.read_samples(&mut self.read_buffer) {
                Ok(0) => {
                    // EOF - track finished
                    self.handle_end_of_track();
                    return;
                }
                Ok(samples_read) => {
                    // Push to ringbuf
                    producer.push_slice(&self.read_buffer[..samples_read]);

                    // Update position tracking
                    self.samples_played += samples_read as u64;
                    let samples_per_ms =
                        (self.device_sample_rate as u64 * self.device_channels as u64) / 1000;
                    if samples_per_ms > 0 {
                        self.current_position_ms = self.samples_played / samples_per_ms;
                    }
                }
                Err(e) => {
                    eprintln!("FFmpeg read error: {}", e);
                    self.handle_end_of_track();
                    return;
                }
            }
        }
    }

    /// Handle device change by reinitializing the audio stream
    fn handle_device_change(&mut self) {
        self.device_error.store(false, Ordering::Relaxed);
        
        // If we're currently playing, reinitialize the stream
        if self.current_file_path.is_some() {
            eprintln!("Device changed, reinitializing audio stream...");
            
            // Drop current stream
            self._current_stream = None;
            self.producer = None;
            
            // Recreate stream with new default device
            self.recreate_cpal_stream(self.device_sample_rate, self.device_channels);
            
            // If we have FFmpeg running, let it continue feeding the new buffer
            // The buffer will refill automatically in the next decode_and_push cycle
        }
    }

    fn handle_end_of_track(&mut self) {
        self.stop();
        self.app_handle.emit(EVENT_PLAYBACK_FINISHED, ()).ok();
    }

    fn pause(&mut self) {
        self.is_playing.store(false, Ordering::Relaxed);
        {
            let mut s = self.state.lock().unwrap();
            s.is_paused = true;
            s.is_playing = false;
        }
        self.update_media_controls();
        self.emit_state();
    }

    fn resume(&mut self) {
        self.is_playing.store(true, Ordering::Relaxed);
        {
            let mut s = self.state.lock().unwrap();
            s.is_paused = false;
            s.is_playing = true;
        }
        self.update_media_controls();
        self.emit_state();
    }

    fn stop(&mut self) {
        self.is_playing.store(false, Ordering::Relaxed);

        // Kill FFmpeg process
        if let Some(mut ffmpeg) = self.ffmpeg_process.take() {
            ffmpeg.kill();
        }

        self._current_stream = None;
        self.producer = None;

        self.current_file_path = None;
        self.current_position_ms = 0;
        self.duration_ms = 0;
        self.samples_played = 0;

        {
            let mut s = self.state.lock().unwrap();
            s.is_playing = false;
            s.is_paused = false;
            s.position_ms = 0;
            s.current_file = None;
        }

        if let Ok(mut c) = self.media_controls.lock() {
            c.set_playback(MediaPlayback::Stopped).ok();
        }

        self.emit_state();
    }

    fn seek(&mut self, pos_ms: u64) {
        let Some(path) = self.current_file_path.clone() else {
            return;
        };

        // Kill current FFmpeg process
        if let Some(mut ffmpeg) = self.ffmpeg_process.take() {
            ffmpeg.kill();
        }

        // Clear the ringbuf by dropping the producer (stream will get silence)
        self.producer = None;
        self._current_stream = None;

        // Respawn FFmpeg at the new position
        match FFmpegProcess::spawn_at(
            &path,
            self.device_sample_rate,
            self.device_channels,
            Some(pos_ms),
        ) {
            Ok(process) => {
                self.ffmpeg_process = Some(process);

                // Recreate CPAL stream
                self.recreate_cpal_stream(self.device_sample_rate, self.device_channels);

                // Update position
                self.current_position_ms = pos_ms;
                self.samples_played =
                    pos_ms * (self.device_sample_rate as u64 * self.device_channels as u64) / 1000;

                {
                    let mut s = self.state.lock().unwrap();
                    s.position_ms = pos_ms;
                }

                self.update_media_controls();
            }
            Err(e) => {
                eprintln!("Seek failed: {}", e);
            }
        }
    }

    fn emit_progress(&self) {
        let mut s = self.state.lock().unwrap();
        if s.is_playing && !s.is_paused {
            s.position_ms = self.current_position_ms;
            self.app_handle.emit(EVENT_PLAYBACK_PROGRESS, &*s).ok();
        }
    }

    fn emit_state(&self) {
        let s = self.state.lock().unwrap();
        self.app_handle.emit(EVENT_PLAYBACK_STATE, &*s).ok();
    }

    fn update_media_controls(&self) {
        if let Ok(mut c) = self.media_controls.lock() {
            let s = self.state.lock().unwrap();
            let pos = MediaPosition(Duration::from_millis(s.position_ms));
            if s.is_paused {
                c.set_playback(MediaPlayback::Paused {
                    progress: Some(pos),
                })
                .ok();
            } else if s.is_playing {
                c.set_playback(MediaPlayback::Playing {
                    progress: Some(pos),
                })
                .ok();
            }
        }
    }
}

// Global state wrapper
pub struct AudioState(pub Arc<AudioEngine>);

// No-op for compatibility
pub fn start_progress_tracking(_app: AppHandle, _engine: Arc<AudioEngine>) {}

use crate::error::AppError;

// --- Tauri Commands ---

#[tauri::command]
pub fn audio_play(
    state: tauri::State<AudioState>,
    path: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    cover: Option<String>,
) -> Result<(), AppError> {
    state.0.play(
        path,
        title.unwrap_or("Unknown".into()),
        artist.unwrap_or("Unknown".into()),
        album.unwrap_or("Unknown".into()),
        cover,
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
pub fn audio_set_device(state: tauri::State<AudioState>, device_name: String) -> Result<(), AppError> {
    state.0.set_device(device_name);
    Ok(())
}

#[tauri::command]
pub fn audio_get_state(state: tauri::State<AudioState>) -> PlaybackState {
    state.0.get_state()
}
