//! Audio Engine using FFmpeg (decoding) + CPAL (output)

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Stream, StreamConfig};
use ringbuf::{
    traits::{Consumer, Observer, Producer, Split},
    HeapRb,
};
use serde::Serialize;
use souvlaki::{MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use log::{info, error};

use crate::ffmpeg::{self, FFmpegProcess};

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
    SetCrossfade(u64), // Duration in milliseconds
}

pub struct AudioEngine {
    command_tx: Sender<AudioCommand>,
    state: Arc<Mutex<PlaybackState>>,
    media_controls: Arc<Mutex<MediaControls>>,
}

impl AudioEngine {
    pub fn new(handle: AppHandle) -> Self {
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

        let mut controls = MediaControls::new(config).expect("Failed to initialize media controls");
        controls.set_playback(MediaPlayback::Stopped).ok();

        let (tx, rx) = mpsc::channel();
        let state = Arc::new(Mutex::new(PlaybackState::default()));
        let controls = Arc::new(Mutex::new(controls));

        let state_clone = state.clone();
        let controls_clone = controls.clone();
        let handle_clone = handle.clone();

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

    pub fn set_crossfade(&self, duration_ms: u64) {
        self.command_tx
            .send(AudioCommand::SetCrossfade(duration_ms))
            .ok();
    }

    pub fn get_state(&self) -> PlaybackState {
        self.state.lock().unwrap().clone()
    }
}

/// State of the crossfade
enum CrossfadeState {
    None,
    Fading {
        start_time: Instant,
        duration: Duration,
    },
}

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

    // FFmpeg processes
    primary_process: Option<FFmpegProcess>,
    secondary_process: Option<FFmpegProcess>, // For the incoming track during crossfade

    // Crossfade State
    crossfade_setting: Duration, // User preference
    crossfade_state: CrossfadeState,

    // Device config
    device_sample_rate: u32,
    device_channels: u16,
    selected_device_name: Option<String>,

    // Track info
    current_file_path: Option<String>,
    duration_ms: u64,
    current_position_ms: u64,
    samples_played: u64,

    // Buffers
    primary_buffer: Vec<f32>,
    secondary_buffer: Vec<f32>,
}

impl AudioWorker {
    fn new(
        receiver: Receiver<AudioCommand>,
        state: Arc<Mutex<PlaybackState>>,
        media_controls: Arc<Mutex<MediaControls>>,
        app_handle: AppHandle,
    ) -> Self {
        let host = cpal::default_host();
        
        // Gracefully handle missing audio devices
        let (sample_rate, channels) = host
            .default_output_device()
            .and_then(|device| device.default_output_config().ok())
            .map(|config| (config.sample_rate().0, config.channels()))
            .unwrap_or_else(|| {
                error!("No audio output device found, using default config (44100Hz, stereo)");
                (44100, 2) // Default fallback
            });

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
            primary_process: None,
            secondary_process: None,
            crossfade_setting: Duration::from_secs(0),
            crossfade_state: CrossfadeState::None,
            device_sample_rate: sample_rate,
            device_channels: channels,
            selected_device_name: None,
            current_file_path: None,
            duration_ms: 0,
            current_position_ms: 0,
            samples_played: 0,
            primary_buffer: vec![0.0f32; 8192],
            secondary_buffer: vec![0.0f32; 8192],
        }
    }

    fn run(&mut self) {
        loop {
            match self.receiver.recv_timeout(Duration::from_millis(5)) {
                Ok(cmd) => self.handle_command(cmd),
                Err(mpsc::RecvTimeoutError::Timeout) => {
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
                _cover,
            } => {
                self.handle_play_request(&path, &title, &artist, &album);
            }
            AudioCommand::Pause => self.pause(),
            AudioCommand::Resume => self.resume(),
            AudioCommand::Stop => self.stop(),
            AudioCommand::Seek(pos) => self.seek(pos),
            AudioCommand::SetVolume(vol) => {
                self.volume
                    .store(f32::to_bits(vol) as u64, Ordering::Relaxed);
                self.state.lock().unwrap().volume = vol;
            }
            AudioCommand::SetDevice(name) => {
                self.selected_device_name = Some(name);
                self.handle_device_change();
            }
            AudioCommand::SetCrossfade(ms) => {
                self.crossfade_setting = Duration::from_millis(ms);
            }
        }
    }

    fn handle_play_request(&mut self, path: &str, title: &str, artist: &str, album: &str) {
        // Check if we are playing the same file
        let is_same_track = self.current_file_path.as_deref() == Some(path);

        // Decide if we should crossfade or hard cut
        // Crossfade if: we are currently playing, crossfade_setting > 0, we have a primary process, AND it's a different track
        let should_crossfade = self.is_playing.load(Ordering::Relaxed)
            && self.crossfade_setting.as_millis() > 0
            && self.primary_process.is_some()
            && !is_same_track;

        if should_crossfade {
            // Start Crossfade
            // 1. Set current secondary to None (sanity check)
            // 2. Spawn new process as secondary
            // 3. Set CrossfadeState to Fading

            // Probe new file
            let metadata = match ffmpeg::probe_file(path) {
                Ok(m) => m,
                Err(e) => {
                    let msg = format!("Failed to probe file (crossfade): {}", e);
                    self.app_handle.emit(EVENT_PLAYBACK_ERROR, msg).ok();
                    return;
                }
            };

            match FFmpegProcess::spawn(path, self.device_sample_rate, self.device_channels) {
                Ok(process) => {
                    info!("Crossfading to new track: {}", path);
                    self.secondary_process = Some(process);
                    self.crossfade_state = CrossfadeState::Fading {
                        start_time: Instant::now(),
                        duration: self.crossfade_setting,
                    };

                    // Note: We don't update current_file_path metadata yet to keeping the UI showing the old song fading out
                    // But typically UI wants to show the new song immediately.
                    // Let's swap metadata immediately for UI responsiveness, even though audio is mixing.
                    self.current_file_path = Some(path.to_string());
                    self.duration_ms = metadata.duration_ms;
                    self.current_position_ms = 0;
                    self.samples_played = 0;

                    {
                        let mut s = self.state.lock().unwrap();
                        s.current_file = Some(path.to_string());
                        s.duration_ms = self.duration_ms;
                        s.position_ms = 0;
                    }

                    self.update_media_metadata(title, artist, album, self.duration_ms);
                    self.emit_state();
                }
                Err(e) => {
                    error!("Failed to spawn secondary FFmpeg: {}", e);
                    // Fallback to hard cut
                    self.play_file_hard_cut(path, title, artist, album);
                }
            }
        } else {
            info!("Playing track (hard cut): {}", path);
            self.play_file_hard_cut(path, title, artist, album);
        }
    }

    fn play_file_hard_cut(&mut self, path: &str, title: &str, artist: &str, album: &str) {
        self.stop(); // Clears everything

        let metadata = match ffmpeg::probe_file(path) {
            Ok(m) => m,
            Err(e) => {
                let msg = format!("Failed to probe file: {}", e);
                self.app_handle.emit(EVENT_PLAYBACK_ERROR, msg).ok();
                return;
            }
        };

        self.duration_ms = metadata.duration_ms;
        self.recreate_cpal_stream(metadata.sample_rate, metadata.channels);

        match FFmpegProcess::spawn(path, self.device_sample_rate, self.device_channels) {
            Ok(process) => {
                info!("Spawned FFmpeg process for: {}", path);
                self.primary_process = Some(process);
            }
            Err(e) => {
                let msg = format!("Failed to spawn FFmpeg: {}", e);
                self.app_handle.emit(EVENT_PLAYBACK_ERROR, msg).ok();
                return;
            }
        }

        self.current_file_path = Some(path.to_string());
        self.current_position_ms = 0;
        self.samples_played = 0;

        {
            let mut s = self.state.lock().unwrap();
            s.is_playing = true;
            s.is_paused = false;
            s.current_file = Some(path.to_string());
            s.duration_ms = self.duration_ms;
            s.position_ms = 0;
        }

        self.update_media_metadata(title, artist, album, self.duration_ms);
        self.is_playing.store(true, Ordering::Relaxed);
        self.emit_state();
    }

    fn update_media_metadata(&self, title: &str, artist: &str, album: &str, duration_ms: u64) {
        if let Ok(mut c) = self.media_controls.lock() {
            c.set_metadata(MediaMetadata {
                title: Some(title),
                artist: Some(artist),
                album: Some(album),
                duration: Some(Duration::from_millis(duration_ms)),
                cover_url: None,
            })
            .ok();
            c.set_playback(MediaPlayback::Playing {
                progress: Some(MediaPosition(Duration::ZERO)),
            })
            .ok();
        }
    }

    fn recreate_cpal_stream(&mut self, _sample_rate: u32, _channels: u16) {
        let host = cpal::default_host();

        let device = if let Some(ref name) = self.selected_device_name {
            host.output_devices()
                .ok()
                .and_then(|mut devices| {
                    devices.find(|d| d.name().map(|n| n == *name).unwrap_or(false))
                })
                .or_else(|| host.default_output_device())
        } else {
            host.default_output_device()
        };

        let Some(device) = device else {
            error!("No audio output device available");
            self.app_handle.emit(EVENT_PLAYBACK_ERROR, "No audio output device available").ok();
            return;
        };

        let config: StreamConfig = match device.default_output_config() {
            Ok(c) => c.into(),
            Err(e) => {
                error!("Failed to get audio config: {}", e);
                self.app_handle.emit(EVENT_PLAYBACK_ERROR, format!("Audio device error: {}", e)).ok();
                return;
            }
        };

        self.device_sample_rate = config.sample_rate.0;
        self.device_channels = config.channels;

        let buffer_size = self.device_sample_rate as usize * self.device_channels as usize; // 1 sec
        let rb = HeapRb::<f32>::new(buffer_size);
        let (producer, consumer) = rb.split();
        self.producer = Some(producer);

        let volume = self.volume.clone();
        let is_playing = self.is_playing.clone();
        let device_error = self.device_error.clone();
        let mut consumer = consumer;
        let channels = self.device_channels as usize;

        let stream = match device.build_output_stream(
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
                error!("CPAL Error: {}", err);
                device_error.store(true, Ordering::Relaxed);
            },
            None,
        ) {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to build audio stream: {}", e);
                self.app_handle.emit(EVENT_PLAYBACK_ERROR, format!("Failed to initialize audio: {}", e)).ok();
                return;
            }
        };

        if let Err(e) = stream.play() {
            error!("Failed to play audio stream: {}", e);
            self.app_handle.emit(EVENT_PLAYBACK_ERROR, format!("Failed to start playback: {}", e)).ok();
            return;
        }
        
        self._current_stream = Some(stream);
    }

    fn decode_and_push(&mut self) {
        let mut track_finished = false;

        {
            let Some(ref mut producer) = self.producer else {
                return;
            };

            // Ensure we have at least a primary process
            if self.primary_process.is_none() {
                return;
            }

            let capacity = producer.capacity().get();
            let target_fill = capacity / 2;

            // We will process chunk by chunk
            loop {
                let occupied = capacity - producer.vacant_len();
                if occupied >= target_fill {
                    break;
                }
                if producer.vacant_len() < self.primary_buffer.len() {
                    break;
                }

                // Check crossfade status
                let mut crossfade_progress = 0.0;
                let mut is_fading = false;

                if let CrossfadeState::Fading {
                    start_time,
                    duration,
                } = self.crossfade_state
                {
                    let elapsed = start_time.elapsed();
                    if elapsed < duration {
                        crossfade_progress = elapsed.as_secs_f32() / duration.as_secs_f32();
                        is_fading = true;
                    } else {
                        // Fade complete! Inline finish_crossfade logic
                        if let Some(mut old_p) = self.primary_process.take() {
                            old_p.kill();
                        }
                        self.primary_process = self.secondary_process.take();
                        self.crossfade_state = CrossfadeState::None;
                        continue;
                    }
                }

                // Temporarily borrow buffers separately
                let primary_buffer = &mut self.primary_buffer;

                // Read Primary
                let primary_read = if let Some(proc) = &mut self.primary_process {
                    match proc.read_samples(primary_buffer) {
                        Ok(n) => n,
                        Err(_) => 0,
                    }
                } else {
                    0
                };

                if primary_read == 0 && !is_fading {
                    track_finished = true;
                    break;
                }

                // If fading, read secondary
                if is_fading && self.secondary_process.is_some() {
                    let secondary_buffer = &mut self.secondary_buffer;
                    let secondary_read = if let Some(proc) = &mut self.secondary_process {
                        match proc.read_samples(secondary_buffer) {
                            Ok(n) => n,
                            Err(_) => 0,
                        }
                    } else {
                        0
                    };

                    // Mixing logic
                    // We drive the output by the Secondary (incoming) track since it's the future.
                    let mix_count = secondary_read;

                    if mix_count == 0 {
                        // Secondary finished or failed?
                        // If secondary is empty, we probably shouldn't be fading or track ended.
                        // Treat as track finished for safety to avoid infinite loop.
                        track_finished = true;
                        break;
                    }

                    // Zero-pad primary if it ended early
                    if primary_read < mix_count {
                        for i in primary_read..mix_count {
                            primary_buffer[i] = 0.0;
                        }
                    }

                    for i in 0..mix_count {
                        let p = primary_buffer[i];
                        let s = secondary_buffer[i];
                        primary_buffer[i] =
                            (p * (1.0 - crossfade_progress)) + (s * crossfade_progress);
                    }

                    producer.push_slice(&primary_buffer[..mix_count]);

                    // Inline update_stats
                    self.samples_played += mix_count as u64;
                    let samples_per_ms =
                        (self.device_sample_rate as u64 * self.device_channels as u64) / 1000;
                    if samples_per_ms > 0 {
                        self.current_position_ms = self.samples_played / samples_per_ms;
                    }
                } else {
                    // Just Primary
                    if primary_read > 0 {
                        producer.push_slice(&primary_buffer[..primary_read]);

                        // Inline update_stats
                        self.samples_played += primary_read as u64;
                        let samples_per_ms =
                            (self.device_sample_rate as u64 * self.device_channels as u64) / 1000;
                        if samples_per_ms > 0 {
                            self.current_position_ms = self.samples_played / samples_per_ms;
                        }
                    }
                }
            }
        } // End of producer borrow scope

        if track_finished {
            self.handle_end_of_track();
        }
    }

    fn handle_device_change(&mut self) {
        self.device_error.store(false, Ordering::Relaxed);
        if self.current_file_path.is_some() {
            self._current_stream = None;
            self.producer = None;
            self.recreate_cpal_stream(self.device_sample_rate, self.device_channels);
        }
    }

    fn handle_end_of_track(&mut self) {
        info!("Track finished naturally");
        self.stop();
        self.app_handle.emit(EVENT_PLAYBACK_FINISHED, ()).ok();
    }

    fn pause(&mut self) {
        info!("Playback paused");
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
        info!("Playback resumed");
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
        info!("Playback stopped");
        self.is_playing.store(false, Ordering::Relaxed);

        if let Some(mut p) = self.primary_process.take() {
            p.kill();
        }
        if let Some(mut s) = self.secondary_process.take() {
            s.kill();
        }

        self._current_stream = None;
        self.producer = None;
        self.current_file_path = None;
        self.current_position_ms = 0;
        self.duration_ms = 0;
        self.samples_played = 0;
        self.crossfade_state = CrossfadeState::None;

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
        info!("Seeking to {}ms", pos_ms);
        let Some(path) = self.current_file_path.clone() else {
            return;
        };

        // Stop any fading, just hard seek primary
        if let Some(mut s) = self.secondary_process.take() {
            s.kill();
        }
        if let Some(mut p) = self.primary_process.take() {
            p.kill();
        }
        self.crossfade_state = CrossfadeState::None;

        self.producer = None;
        self._current_stream = None;

        match FFmpegProcess::spawn_at(
            &path,
            self.device_sample_rate,
            self.device_channels,
            Some(pos_ms),
        ) {
            Ok(process) => {
                self.primary_process = Some(process);
                self.recreate_cpal_stream(self.device_sample_rate, self.device_channels);

                self.current_position_ms = pos_ms;
                self.samples_played =
                    pos_ms * (self.device_sample_rate as u64 * self.device_channels as u64) / 1000;

                {
                    let mut s = self.state.lock().unwrap();
                    s.position_ms = pos_ms;
                }
                self.update_media_controls();
            }
            Err(e) => error!("Seek failed: {}", e),
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

pub struct AudioState(pub Arc<AudioEngine>);
pub fn start_progress_tracking(_app: AppHandle, _engine: Arc<AudioEngine>) {}

use crate::error::AppError;

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
    duration_secs: u64,
) -> Result<(), AppError> {
    state.0.set_crossfade(duration_secs);
    Ok(())
}

#[tauri::command]
pub fn audio_get_state(state: tauri::State<AudioState>) -> PlaybackState {
    state.0.get_state()
}
