//! Audio Engine using symphonia (decoding) + CPAL (output)

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Stream, StreamConfig};
use ringbuf::{
    traits::{Consumer, Observer, Producer, Split},
    HeapRb,
};
use serde::Serialize;
use souvlaki::{MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig, SeekDirection};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use std::fs::File;
use tauri::{AppHandle, Emitter, Manager};
use log::{debug, info, error, warn};

use symphonia::core::codecs::audio::*;
use symphonia::core::formats::*;
use symphonia::core::formats::probe::Hint;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::units::{Time, Timestamp};

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
        artwork_path: Option<String>,
    },
    Pause,
    Resume,
    Stop,
    Seek(u64),
    SetVolume(f32),
    SetDevice(String),
    SetCrossfade(u64), // Duration in milliseconds
}

/// Main audio engine for managing playback.
pub struct AudioEngine {
    command_tx: Sender<AudioCommand>,
    state: Arc<Mutex<PlaybackState>>,
    media_controls: Arc<Mutex<Option<souvlaki::MediaControls>>>,
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

            match window.window_handle().expect("Window handle unavailable").as_raw() {
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

        let controls = match MediaControls::new(config) {
            Ok(mut c) => {
                c.set_playback(MediaPlayback::Stopped).ok();
                Some(c)
            }
            Err(e) => {
                warn!("Failed to initialize media controls (OS media keys disabled): {}", e);
                None
            }
        };
        let controls = Arc::new(Mutex::new(controls));

        let (tx, rx) = mpsc::channel();
        let state = Arc::new(Mutex::new(PlaybackState::default()));

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
        let mut guard = match controls.lock() {
            Ok(guard) => guard,
            Err(poisoned) => {
                error!("Media controls mutex poisoned in init_media_events, recovering");
                poisoned.into_inner()
            }
        };

        let Some(ref mut controls_guard) = *guard else {
            info!("Media controls not available, skipping OS media key registration");
            return;
        };

        controls_guard
            .attach(move |event| match event {
                souvlaki::MediaControlEvent::Play => {
                    let _ = handle.emit("media-play", ());
                }
                souvlaki::MediaControlEvent::Pause => {
                    let _ = handle.emit("media-pause", ());
                }
                souvlaki::MediaControlEvent::Toggle => {
                    let _ = handle.emit("media-toggle", ());
                }
                souvlaki::MediaControlEvent::Next => {
                    let _ = handle.emit("media-next", ());
                }
                souvlaki::MediaControlEvent::Previous => {
                    let _ = handle.emit("media-prev", ());
                }
                souvlaki::MediaControlEvent::Stop => {
                    let _ = handle.emit("media-stop", ());
                }
                souvlaki::MediaControlEvent::Seek(dir) => {
                    let dir_str = match dir {
                        SeekDirection::Forward => "forward",
                        SeekDirection::Backward => "backward",
                    };
                    let _ = handle.emit("media-seek", serde_json::json!({"direction": dir_str}));
                }
                souvlaki::MediaControlEvent::SeekBy(dir, dur) => {
                    let dir_str = match dir {
                        SeekDirection::Forward => "forward",
                        SeekDirection::Backward => "backward",
                    };
                    let _ = handle.emit("media-seek-by", serde_json::json!({
                        "direction": dir_str,
                        "duration_ms": dur.as_millis() as u64,
                    }));
                }
                souvlaki::MediaControlEvent::SetPosition(pos) => {
                    let _ = handle.emit("media-set-position", serde_json::json!({
                        "position_ms": pos.0.as_millis() as u64,
                    }));
                }
                souvlaki::MediaControlEvent::SetVolume(vol) => {
                    let _ = handle.emit("media-set-volume", serde_json::json!({"volume": vol}));
                }
                souvlaki::MediaControlEvent::Raise => {
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                souvlaki::MediaControlEvent::Quit => {
                    let _ = handle.emit("media-quit", ());
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
        artwork_path: Option<String>,
    ) {
        self.command_tx
            .send(AudioCommand::Play {
                path,
                title,
                artist,
                album,
                artwork_path,
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
        match self.state.lock() {
            Ok(guard) => guard.clone(),
            Err(poisoned) => {
                error!("Audio state mutex poisoned in get_state, recovering");
                poisoned.into_inner().clone()
            }
        }
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

struct SymphoniaDecoder {
    format: Box<dyn FormatReader>,
    decoder: Box<dyn AudioDecoder>,
    track_id: u32,
    sample_rate: u32,
    duration_ms: u64,
}

impl SymphoniaDecoder {
    fn new(path: &str) -> Result<(Self, Vec<f32>), String> {
        let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
        let mss = MediaSourceStream::new(Box::new(file), Default::default());

        let mut hint = Hint::new();
        if let Some(ext) = path.rsplit('.').next() {
            hint.with_extension(ext);
        }

        let format = symphonia::default::get_probe()
            .probe(&hint, mss, FormatOptions::default(), MetadataOptions::default())
            .map_err(|e| format!("Failed to probe file: {}", e))?;

        let track = format.default_track(TrackType::Audio)
            .ok_or("No audio track found")?;
        let track_id = track.id;

        let codec_params = track.codec_params.clone().ok_or("No codec parameters")?;
        let dec_opts: AudioDecoderOptions = Default::default();
        let audio_params = codec_params.audio().ok_or("No audio parameters")?;
        let decoder = symphonia::default::get_codecs()
            .make_audio_decoder(audio_params, &dec_opts)
            .map_err(|e| format!("Failed to create decoder: {}", e))?;
        let sample_rate = audio_params.sample_rate.unwrap_or(44100);
        let channels = audio_params.channels.as_ref().map(|c| c.count()).unwrap_or(2);
        let duration_ms = format.media_info().time_base
            .zip(format.media_info().duration)
            .and_then(|(tb, d)| tb.calc_time(Timestamp::from(d.get() as u32)))
            .map(|t| t.as_millis() as u64)
            .unwrap_or(0);

        let buf = vec![0.0f32; (sample_rate * channels as u32) as usize];

        Ok((
            Self {
                format,
                decoder,
                track_id,
                sample_rate,
                duration_ms,
            },
            buf,
        ))
    }

    fn decode(&mut self, output: &mut [f32]) -> Result<usize, ()> {
        loop {
            let packet = match self.format.next_packet() {
                Ok(Some(pkt)) => pkt,
                Ok(None) => return Ok(0),
                Err(_) => return Err(()),
            };

            if packet.track_id != self.track_id {
                continue;
            }

            match self.decoder.decode(&packet) {
                Ok(decoded) => {
                    let total = decoded.samples_interleaved();
                    let to_copy = total.min(output.len());
                    decoded.copy_to_slice_interleaved(&mut output[..to_copy]);
                    return Ok(to_copy);
                }
                Err(_) => continue,
            }
        }
    }

    fn seek_to(&mut self, pos_ms: u64) -> Result<(), ()> {
        let track = self.format.default_track(TrackType::Audio).ok_or(())?;
        let codec_params = track.codec_params.clone().ok_or(())?;
        let audio_params = codec_params.audio().ok_or(())?;
        let dec_opts: AudioDecoderOptions = Default::default();
        self.decoder = symphonia::default::get_codecs()
            .make_audio_decoder(audio_params, &dec_opts)
            .map_err(|_| ())?;

        self.format
            .seek(
                SeekMode::Coarse,
                SeekTo::Time {
                    time: Time::from_millis_u64(pos_ms),
                    track_id: Some(self.track_id),
                },
            )
            .map(|_| ())
            .map_err(|_| ())
    }

    fn sample_rate(&self) -> u32 { self.sample_rate }
    fn duration_ms(&self) -> u64 { self.duration_ms }
}

struct AudioWorker {
    receiver: Receiver<AudioCommand>,
    state: Arc<Mutex<PlaybackState>>,
    media_controls: Arc<Mutex<Option<souvlaki::MediaControls>>>,
    app_handle: AppHandle,

    // Playback resources
    _current_stream: Option<Stream>,
    producer: Option<ringbuf::HeapProd<f32>>,
    volume: Arc<AtomicU64>,
    is_playing: Arc<AtomicBool>,
    device_error: Arc<AtomicBool>,

    // symphonia decoders
    primary_decoder: Option<SymphoniaDecoder>,
    secondary_decoder: Option<SymphoniaDecoder>, // For crossfade

    // Crossfade State
    crossfade_setting: Duration,
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
    current_file_sample_rate: u32,

    // Media controls position update tracking
    last_media_pos_update: Instant,

    // Buffers
    primary_buffer: Vec<f32>,
    secondary_buffer: Vec<f32>,
    resample_buf: Vec<f32>,
}

impl AudioWorker {
    fn new(
        receiver: Receiver<AudioCommand>,
        state: Arc<Mutex<PlaybackState>>,
        media_controls: Arc<Mutex<Option<souvlaki::MediaControls>>>,
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
            primary_decoder: None,
            secondary_decoder: None,
            crossfade_setting: Duration::from_secs(0),
            crossfade_state: CrossfadeState::None,
            device_sample_rate: sample_rate,
            device_channels: channels,
            selected_device_name: None,
            current_file_path: None,
            duration_ms: 0,
            current_position_ms: 0,
            samples_played: 0,
            current_file_sample_rate: sample_rate,
            last_media_pos_update: Instant::now(),
            primary_buffer: vec![0.0f32; 8192],
            secondary_buffer: vec![0.0f32; 8192],
            resample_buf: vec![0.0f32; 8192],
        }
    }

    fn run(&mut self) {
        let mut last_progress_emit = Instant::now();
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
                    if last_progress_emit.elapsed() >= Duration::from_millis(250) {
                        self.emit_progress();
                        last_progress_emit = Instant::now();
                    }
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    }

    fn handle_command(&mut self, cmd: AudioCommand) {
        match cmd {
            AudioCommand::Play {
                path, title, artist, album, artwork_path,
            } => {
                self.handle_play_request(&path, &title, &artist, &album, artwork_path.as_deref());
            }
            AudioCommand::Pause => self.pause(),
            AudioCommand::Resume => self.resume(),
            AudioCommand::Stop => self.stop(),
            AudioCommand::Seek(pos) => self.seek(pos),
            AudioCommand::SetVolume(vol) => {
                self.volume
                    .store(f32::to_bits(vol) as u64, Ordering::Relaxed);
                if let Ok(mut s) = self.state.lock() {
                    s.volume = vol;
                } else {
                    warn!("Audio state mutex poisoned in set_volume, skipping");
                }
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

    fn handle_play_request(&mut self, path: &str, title: &str, artist: &str, album: &str, artwork_path: Option<&str>) {
        let is_same_track = self.current_file_path.as_deref() == Some(path);

        let should_crossfade = self.is_playing.load(Ordering::Relaxed)
            && self.crossfade_setting.as_millis() > 0
            && self.primary_decoder.is_some()
            && !is_same_track;

                if should_crossfade {
                    match SymphoniaDecoder::new(path) {
                        Ok((decoder, buf)) => {
                            info!("Crossfading to new track: {}", path);
                            debug!("Crossfade duration: {:?}", self.crossfade_setting);
                            self.secondary_decoder = Some(decoder);
                            self.secondary_buffer = buf;
                            self.crossfade_state = CrossfadeState::Fading {
                                start_time: Instant::now(),
                                duration: self.crossfade_setting,
                            };

                    self.resample_buf.resize(self.secondary_buffer.len() * 2, 0.0);
                    self.duration_ms = self.secondary_decoder.as_ref().map(|d| d.duration_ms()).unwrap_or(0);
                    self.current_file_path = Some(path.to_string());
                    self.current_position_ms = 0;
                    self.samples_played = 0;
                    self.recreate_cpal_stream(self.device_sample_rate, self.device_channels);

                    {
                        match self.state.lock() {
                            Ok(mut s) => {
                                s.current_file = Some(path.to_string());
                                s.duration_ms = self.duration_ms;
                                s.position_ms = 0;
                            }
                            Err(poisoned) => {
                                error!("Audio state mutex poisoned in handle_play_request, recovering");
                                let mut s = poisoned.into_inner();
                                s.current_file = Some(path.to_string());
                                s.duration_ms = self.duration_ms;
                                s.position_ms = 0;
                            }
                        }
                    }

                    self.update_media_metadata(title, artist, album, artwork_path, self.duration_ms);
                    self.emit_state();
                }
                Err(e) => {
                    error!("Failed to create secondary decoder: {}", e);
                    self.play_file_hard_cut(path, title, artist, album, artwork_path);
                }
            }
        } else {
            info!("Playing track (hard cut): {}", path);
            self.play_file_hard_cut(path, title, artist, album, artwork_path);
        }
    }

    fn play_file_hard_cut(&mut self, path: &str, title: &str, artist: &str, album: &str, artwork_path: Option<&str>) {
        self.stop();

        let (decoder, buf) = match SymphoniaDecoder::new(path) {
            Ok(d) => d,
            Err(e) => {
                let msg = format!("Failed to decode file: {}", e);
                self.app_handle.emit(EVENT_PLAYBACK_ERROR, msg).ok();
                return;
            }
        };

        let file_rate = decoder.sample_rate();
        self.duration_ms = decoder.duration_ms();
        self.current_file_sample_rate = file_rate;
        self.primary_buffer = buf;
        self.resample_buf.resize(self.primary_buffer.len() * 2, 0.0);
        self.recreate_cpal_stream(file_rate, self.device_channels);

        info!("Playing track: {}", path);
        self.primary_decoder = Some(decoder);
        self.current_file_path = Some(path.to_string());
        self.current_position_ms = 0;
        self.samples_played = 0;

        {
            match self.state.lock() {
                Ok(mut s) => {
                    s.is_playing = true;
                    s.is_paused = false;
                    s.current_file = Some(path.to_string());
                    s.duration_ms = self.duration_ms;
                    s.position_ms = 0;
                }
                Err(poisoned) => {
                    error!("Audio state mutex poisoned in play_file_hard_cut, recovering");
                    let mut s = poisoned.into_inner();
                    s.is_playing = true;
                    s.is_paused = false;
                    s.current_file = Some(path.to_string());
                    s.duration_ms = self.duration_ms;
                    s.position_ms = 0;
                }
            }
        }

        self.update_media_metadata(title, artist, album, artwork_path, self.duration_ms);
        self.is_playing.store(true, Ordering::Relaxed);
        self.emit_state();
    }

    fn update_media_metadata(&self, title: &str, artist: &str, album: &str, _artwork_path: Option<&str>, duration_ms: u64) {
        if let Ok(mut guard) = self.media_controls.lock() {
            if let Some(ref mut c) = *guard {
                // cover_url skipped: souvlaki's Windows backend has a bug with file:// URIs (HRESULT 0x800700A1)
                if let Err(e) = c.set_metadata(MediaMetadata {
                    title: Some(title),
                    artist: Some(artist),
                    album: Some(album),
                    duration: Some(Duration::from_millis(duration_ms)),
                    cover_url: None,
                }) {
                    error!("set_metadata failed: {:?}", e);
                }
                if let Err(e) = c.set_playback(MediaPlayback::Playing {
                    progress: Some(MediaPosition(Duration::ZERO)),
                }) {
                    error!("set_playback failed: {:?}", e);
                }
            }
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

        // Always use device default config; resample decoded audio to match in decode_and_push
        let config: StreamConfig = match device.default_output_config() {
            Ok(c) => c.into(),
            Err(e) => {
                error!("Failed to get default audio config: {}", e);
                self.app_handle.emit(EVENT_PLAYBACK_ERROR, format!("Audio device error: {}", e)).ok();
                return;
            }
        };

        self.device_sample_rate = config.sample_rate.0;
        self.device_channels = config.channels;

        let min_buffer = self.primary_buffer.len() * 2;
        let buffer_size = (self.device_sample_rate as usize * self.device_channels as usize).max(min_buffer);
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

    /// Linear interpolation resampler: converts audio from input_rate to output_rate
    fn resample_audio(input: &[f32], input_rate: u32, output_rate: u32, channels: usize, output: &mut [f32]) -> usize {
        if input_rate == output_rate || input_rate == 0 || output_rate == 0 {
            let n = input.len().min(output.len());
            output[..n].copy_from_slice(&input[..n]);
            return n;
        }

        let ratio = input_rate as f64 / output_rate as f64;
        let input_frames = input.len() / channels;
        let output_frames = ((input_frames as f64) / ratio).ceil() as usize;
        let output_frames = output_frames.min(output.len() / channels);

        for of in 0..output_frames {
            let src_pos = of as f64 * ratio;
            let fi = src_pos as usize;
            let frac = src_pos - fi as f64;

            for ch in 0..channels {
                let a = if fi < input_frames { input[fi * channels + ch] as f64 } else { 0.0 };
                let b = if fi + 1 < input_frames { input[(fi + 1) * channels + ch] as f64 } else { a };
                output[of * channels + ch] = (a * (1.0 - frac) + b * frac).clamp(-1.0, 1.0) as f32;
            }
        }

        output_frames * channels
    }

    fn decode_and_push(&mut self) {
        let mut track_finished = false;

        {
            let Some(ref mut producer) = self.producer else {
                return;
            };

            if self.primary_decoder.is_none() {
                return;
            }

            let capacity = producer.capacity().get();
            let target_fill = capacity / 2;
            let cycle_start = Instant::now();
            const MAX_CYCLE_DURATION: Duration = Duration::from_millis(10);

            loop {
                if cycle_start.elapsed() >= MAX_CYCLE_DURATION {
                    break;
                }
                let occupied = capacity - producer.vacant_len();
                if occupied >= target_fill {
                    break;
                }
                if producer.vacant_len() < self.primary_buffer.len() {
                    break;
                }
                let occupied = capacity - producer.vacant_len();
                if occupied >= target_fill {
                    break;
                }
                if producer.vacant_len() < self.primary_buffer.len() {
                    break;
                }

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
                        debug!("Crossfade complete, swapping to secondary decoder");
                        self.primary_decoder = self.secondary_decoder.take();
                        if self.primary_buffer.len() != self.secondary_buffer.len() {
                            self.primary_buffer.resize(self.secondary_buffer.len(), 0.0);
                            self.resample_buf.resize(self.primary_buffer.len() * 2, 0.0);
                        }
                        self.primary_buffer.copy_from_slice(&self.secondary_buffer);
                        self.current_file_sample_rate = self.primary_decoder.as_ref().map(|d| d.sample_rate()).unwrap_or(44100);
                        self.crossfade_state = CrossfadeState::None;
                        continue;
                    }
                }

                let primary_buffer = &mut self.primary_buffer;

                let primary_read = if let Some(dec) = &mut self.primary_decoder {
                    dec.decode(primary_buffer).unwrap_or_default()
                } else {
                    0
                };

                if primary_read == 0 && !is_fading {
                    track_finished = true;
                    break;
                }

                if is_fading && self.secondary_decoder.is_some() {
                    let secondary_buffer = &mut self.secondary_buffer;
                    let secondary_read = if let Some(dec) = &mut self.secondary_decoder {
                        dec.decode(secondary_buffer).unwrap_or_default()
                    } else {
                        0
                    };

                    let mix_count = secondary_read;

                    if mix_count == 0 {
                        track_finished = true;
                        break;
                    }

                    if primary_read < mix_count {
                        primary_buffer[primary_read..mix_count].fill(0.0);
                    }

                    for i in 0..mix_count {
                        let p = primary_buffer[i];
                        let s = secondary_buffer[i];
                        primary_buffer[i] =
                            (p * (1.0 - crossfade_progress)) + (s * crossfade_progress);
                    }

                    let file_rate = self.current_file_sample_rate;
                    let out_len = Self::resample_audio(
                        &primary_buffer[..mix_count],
                        file_rate,
                        self.device_sample_rate,
                        self.device_channels as usize,
                        &mut self.resample_buf,
                    );
                    producer.push_slice(&self.resample_buf[..out_len]);

                    self.samples_played += out_len as u64;
                    let samples_per_ms =
                        (self.device_sample_rate as u64 * self.device_channels as u64) / 1000;
                    if samples_per_ms > 0 {
                        self.current_position_ms = self.samples_played / samples_per_ms;
                    }
                } else if primary_read > 0 {
                    let file_rate = self.current_file_sample_rate;
                    let out_len = Self::resample_audio(
                        &primary_buffer[..primary_read],
                        file_rate,
                        self.device_sample_rate,
                        self.device_channels as usize,
                        &mut self.resample_buf,
                    );
                    producer.push_slice(&self.resample_buf[..out_len]);

                    self.samples_played += out_len as u64;
                    let samples_per_ms =
                        (self.device_sample_rate as u64 * self.device_channels as u64) / 1000;
                    if samples_per_ms > 0 {
                        self.current_position_ms = self.samples_played / samples_per_ms;
                    }
                }
            }
        }

        if track_finished {
            self.handle_end_of_track();
        }
    }

    fn handle_device_change(&mut self) {
        info!("Audio device changed, reconfiguring stream");
        self.device_error.store(false, Ordering::Relaxed);
        if self.current_file_path.is_some() {
            self._current_stream = None;
            self.producer = None;
            self.recreate_cpal_stream(self.device_sample_rate, self.device_channels);
            self.app_handle.emit("audio-device-recovered", ()).ok();
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
            match self.state.lock() {
                Ok(mut s) => {
                    s.is_paused = true;
                    s.is_playing = false;
                }
                Err(poisoned) => {
                    error!("Audio state mutex poisoned in pause, recovering");
                    let mut s = poisoned.into_inner();
                    s.is_paused = true;
                    s.is_playing = false;
                }
            }
        }
        self.update_media_controls();
        self.emit_state();
    }

    fn resume(&mut self) {
        info!("Playback resumed");
        self.is_playing.store(true, Ordering::Relaxed);
        {
            match self.state.lock() {
                Ok(mut s) => {
                    s.is_paused = false;
                    s.is_playing = true;
                }
                Err(poisoned) => {
                    error!("Audio state mutex poisoned in resume, recovering");
                    let mut s = poisoned.into_inner();
                    s.is_paused = false;
                    s.is_playing = true;
                }
            }
        }
        self.update_media_controls();
        self.emit_state();
    }

    fn stop(&mut self) {
        info!("Playback stopped");
        self.is_playing.store(false, Ordering::Relaxed);

        self.primary_decoder = None;
        self.secondary_decoder = None;

        self._current_stream = None;
        self.producer = None;
        self.current_file_path = None;
        self.current_position_ms = 0;
        self.duration_ms = 0;
        self.samples_played = 0;
        self.crossfade_state = CrossfadeState::None;

        {
            match self.state.lock() {
                Ok(mut s) => {
                    s.is_playing = false;
                    s.is_paused = false;
                    s.position_ms = 0;
                    s.current_file = None;
                }
                Err(poisoned) => {
                    error!("Audio state mutex poisoned in stop, recovering");
                    let mut s = poisoned.into_inner();
                    s.is_playing = false;
                    s.is_paused = false;
                    s.position_ms = 0;
                    s.current_file = None;
                }
            }
        }

        if let Ok(mut guard) = self.media_controls.lock() {
            if let Some(ref mut c) = *guard {
                c.set_playback(MediaPlayback::Stopped).ok();
            }
        }

        self.emit_state();
    }

    fn seek(&mut self, pos_ms: u64) {
        info!("Seeking to {}ms", pos_ms);

        self.secondary_decoder = None;
        self.crossfade_state = CrossfadeState::None;

        let seek_ok = self.primary_decoder.as_mut().map(|dec| dec.seek_to(pos_ms).is_ok()).unwrap_or(false);

        if seek_ok {
            self.current_position_ms = pos_ms;
            self.samples_played =
                pos_ms * (self.device_sample_rate as u64 * self.device_channels as u64) / 1000;

            {
                match self.state.lock() {
                    Ok(mut s) => s.position_ms = pos_ms,
                    Err(poisoned) => {
                        error!("Audio state mutex poisoned in seek, recovering");
                        poisoned.into_inner().position_ms = pos_ms;
                    }
                }
            }

            // Recreate the CPAL stream to flush stale samples from the ring buffer.
            // Without this, the callback continues playing ~1s of pre-seek audio.
            self._current_stream = None;
            self.producer = None;
            self.recreate_cpal_stream(self.device_sample_rate, self.device_channels);

            self.update_media_controls();
        } else {
            error!("Seek failed");
        }
    }

    fn emit_progress(&mut self) {
        let should_update = {
            let mut guard = match self.state.lock() {
                Ok(g) => g,
                Err(poisoned) => {
                    error!("Audio state mutex poisoned in emit_progress, recovering");
                    poisoned.into_inner()
                }
            };
            if guard.is_playing && !guard.is_paused {
                guard.position_ms = self.current_position_ms;
                self.app_handle.emit(EVENT_PLAYBACK_PROGRESS, &*guard).ok();
                self.last_media_pos_update.elapsed() >= Duration::from_secs(5)
            } else {
                false
            }
        };
        // Must not hold state lock when calling update_media_controls (it locks state too)
        if should_update {
            self.update_media_controls();
            self.last_media_pos_update = Instant::now();
        }
    }

    fn emit_state(&self) {
        let guard = match self.state.lock() {
            Ok(g) => g,
            Err(poisoned) => {
                error!("Audio state mutex poisoned in emit_state, recovering");
                poisoned.into_inner()
            }
        };
        self.app_handle.emit(EVENT_PLAYBACK_STATE, &*guard).ok();
    }

    fn update_media_controls(&self) {
        if let Ok(mut guard) = self.media_controls.lock() {
            let Some(ref mut c) = *guard else { return };
            let state_guard = match self.state.lock() {
                Ok(g) => g,
                Err(poisoned) => {
                    error!("Audio state mutex poisoned in update_media_controls, recovering");
                    poisoned.into_inner()
                }
            };
            let pos = MediaPosition(Duration::from_millis(state_guard.position_ms));
            if state_guard.is_paused {
                c.set_playback(MediaPlayback::Paused {
                    progress: Some(pos),
                })
                .ok();
            } else if state_guard.is_playing {
                c.set_playback(MediaPlayback::Playing {
                    progress: Some(pos),
                })
                .ok();
            }
        }
    }
}

pub struct AudioState(pub Arc<AudioEngine>);


use crate::error::AppError;

#[tauri::command]
pub fn audio_play(
    state: tauri::State<AudioState>,
    path: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    artwork_path: Option<String>,
) -> Result<(), AppError> {
    state.0.play(
        path,
        title.unwrap_or("Unknown".into()),
        artist.unwrap_or("Unknown".into()),
        album.unwrap_or("Unknown".into()),
        artwork_path,
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
pub fn audio_get_state(state: tauri::State<AudioState>) -> PlaybackState {
    state.0.get_state()
}

#[cfg(test)]
mod tests {
    use super::*;

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
        match CrossfadeState::None {
            CrossfadeState::None => {} // correct variant
            _ => panic!("Expected None"),
        }
    }

    #[test]
    fn test_crossfade_state_fading() {
        let fading = CrossfadeState::Fading {
            start_time: Instant::now(),
            duration: Duration::from_millis(2000),
        };
        match fading {
            CrossfadeState::Fading { duration, .. } => {
                assert_eq!(duration, Duration::from_millis(2000));
            }
            _ => panic!("Expected Fading"),
        }
    }

    #[test]
    fn test_resample_audio_passthrough_same_rate() {
        let input = vec![0.5f32, -0.5, 0.25, -0.25];
        let mut output = vec![0.0f32; 8];
        let n = AudioWorker::resample_audio(&input, 44100, 44100, 2, &mut output);
        assert_eq!(n, 4);
        assert_eq!(output[..4], input[..]);
    }

    #[test]
    fn test_resample_audio_zero_rates() {
        let input = vec![0.5f32; 4];
        let mut output = vec![0.0f32; 8];
        let n = AudioWorker::resample_audio(&input, 0, 44100, 2, &mut output);
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
        // Verify AudioCommand implements Send (required for thread safety)
        fn assert_send<T: Send>() {}
        assert_send::<AudioCommand>();
    }

    #[test]
    fn test_playback_state_send() {
        fn assert_send<T: Send>() {}
        assert_send::<PlaybackState>();
    }
}
