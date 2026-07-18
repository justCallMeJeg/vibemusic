use super::crossfade::CrossfadeState;
use super::decoder::SymphoniaDecoder;
use super::types::{
    AudioCommand, PlaybackState, EVENT_PLAYBACK_ERROR, EVENT_PLAYBACK_FINISHED,
    EVENT_PLAYBACK_PROGRESS, EVENT_PLAYBACK_STATE,
};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Stream, StreamConfig};
use log::{debug, error, info, warn};
use ringbuf::{
    traits::{Consumer, Observer, Producer, Split},
    HeapRb,
};
use souvlaki::{MediaMetadata, MediaPlayback, MediaPosition};
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::mpsc::{Receiver, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub(crate) struct AudioWorker {
    pub(crate) receiver: Receiver<AudioCommand>,
    pub(crate) state: Arc<Mutex<PlaybackState>>,
    pub(crate) media_controls: Arc<Mutex<Option<souvlaki::MediaControls>>>,
    pub(crate) app_handle: AppHandle,

    pub(crate) _current_stream: Option<Stream>,
    pub(crate) producer: Option<ringbuf::HeapProd<f32>>,
    pub(crate) volume: Arc<AtomicU64>,
    pub(crate) is_playing: Arc<AtomicBool>,
    pub(crate) device_error: Arc<AtomicBool>,

    pub(crate) primary_decoder: Option<SymphoniaDecoder>,
    pub(crate) secondary_decoder: Option<SymphoniaDecoder>,

    pub(crate) crossfade_setting: Duration,
    pub(crate) crossfade_state: CrossfadeState,

    pub(crate) fade_gain: Arc<AtomicU32>,
    pub(crate) fade_target: Arc<AtomicU32>,
    pub(crate) fade_step: Arc<AtomicU32>,
    pub(crate) fade_in_out_enabled: bool,

    pub(crate) device_sample_rate: u32,
    pub(crate) device_channels: u16,
    pub(crate) selected_device_name: Option<String>,

    pub(crate) current_file_path: Option<String>,
    pub(crate) duration_ms: u64,
    pub(crate) current_position_ms: u64,
    pub(crate) samples_played: u64,
    pub(crate) current_file_sample_rate: u32,

    pub(crate) crossfade_batches_logged: u8,

    pub(crate) last_media_pos_update: Instant,

    pub(crate) primary_buffer: Vec<f32>,
    pub(crate) secondary_buffer: Vec<f32>,
    pub(crate) resample_buf: Vec<f32>,
    pub(crate) mix_buf: Vec<f32>,
}

impl AudioWorker {
    pub(crate) fn new(
        receiver: Receiver<AudioCommand>,
        state: Arc<Mutex<PlaybackState>>,
        media_controls: Arc<Mutex<Option<souvlaki::MediaControls>>>,
        app_handle: AppHandle,
    ) -> Self {
        let host = cpal::default_host();

        let (sample_rate, channels) = host
            .default_output_device()
            .and_then(|device| device.default_output_config().ok())
            .map(|config| (config.sample_rate().0, config.channels()))
            .unwrap_or_else(|| {
                error!("No audio output device found, using default config (44100Hz, stereo)");
                (44100, 2)
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
            fade_gain: Arc::new(AtomicU32::new(f32::to_bits(1.0))),
            fade_target: Arc::new(AtomicU32::new(f32::to_bits(1.0))),
            fade_step: Arc::new(AtomicU32::new(f32::to_bits(0.0))),
            fade_in_out_enabled: false,
            device_sample_rate: sample_rate,
            device_channels: channels,
            selected_device_name: None,
            current_file_path: None,
            duration_ms: 0,
            current_position_ms: 0,
            samples_played: 0,
            current_file_sample_rate: sample_rate,
            crossfade_batches_logged: 0,
            last_media_pos_update: Instant::now(),
            primary_buffer: vec![0.0f32; 8192],
            secondary_buffer: vec![0.0f32; 8192],
            resample_buf: vec![0.0f32; 8192],
            mix_buf: vec![0.0f32; 8192],
        }
    }

    pub(crate) fn run(&mut self) {
        let mut last_progress_emit = Instant::now();
        loop {
            match self.receiver.recv_timeout(Duration::from_millis(5)) {
                Ok(cmd) => self.handle_command(cmd),
                Err(RecvTimeoutError::Timeout) => {
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
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
    }

    pub(crate) fn handle_command(&mut self, cmd: AudioCommand) {
        match cmd {
            AudioCommand::Play {
                path,
                title,
                artist,
                album,
                artwork_path,
                crossfade,
            } => {
                self.handle_play_request(
                    &path,
                    &title,
                    &artist,
                    &album,
                    artwork_path.as_deref(),
                    crossfade,
                );
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
            AudioCommand::SetFadeInOut {
                enabled,
                duration_ms,
            } => {
                self.fade_in_out_enabled = enabled;
                let step = if enabled && duration_ms > 0 {
                    1.0 / ((duration_ms as f32 / 1000.0)
                        * self.device_sample_rate as f32
                        * self.device_channels as f32)
                } else {
                    0.0
                };
                self.fade_step.store(f32::to_bits(step), Ordering::Relaxed);
            }
        }
    }

    pub(crate) fn handle_play_request(
        &mut self,
        path: &str,
        title: &str,
        artist: &str,
        album: &str,
        artwork_path: Option<&str>,
        crossfade_enabled: bool,
    ) {
        let is_same_track = self.current_file_path.as_deref() == Some(path);

        let should_crossfade = crossfade_enabled
            && self.is_playing.load(Ordering::Relaxed)
            && self.crossfade_setting.as_millis() > 0
            && self.primary_decoder.is_some()
            && !is_same_track;

        if should_crossfade {
            match SymphoniaDecoder::new(path) {
                Ok((decoder, buf)) => {
                    info!("Crossfading to new track: {}", path);
                    debug!("Crossfade duration: {:?}", self.crossfade_setting);
                    {
                        let primary_rate = self
                            .primary_decoder
                            .as_ref()
                            .map(|d| d.sample_rate())
                            .unwrap_or(0);
                        let primary_ch = self
                            .primary_decoder
                            .as_ref()
                            .map(|d| d.channels())
                            .unwrap_or(0);
                        let secondary_rate = decoder.sample_rate();
                        let secondary_ch = decoder.channels();
                        debug!(
                            "[crossfade] start: pri_rate={}hz pri_ch={} sec_rate={}hz sec_ch={} dev_rate={}hz dev_ch={} pri_buf={} sec_buf={}",
                            primary_rate, primary_ch, secondary_rate, secondary_ch,
                            self.device_sample_rate, self.device_channels,
                            self.primary_buffer.len(), buf.len()
                        );
                    }
                    self.secondary_decoder = Some(decoder);
                    self.secondary_buffer = buf;
                    self.crossfade_state = CrossfadeState::Fading {
                        start_time: Instant::now(),
                        duration: self.crossfade_setting,
                    };

                    self.resample_buf
                        .resize(self.secondary_buffer.len() * 2, 0.0);
                    self.duration_ms = self
                        .secondary_decoder
                        .as_ref()
                        .map(|d| d.duration_ms())
                        .unwrap_or(0);
                    self.current_file_path = Some(path.to_string());
                    self.current_position_ms = 0;
                    self.samples_played = 0;

                    {
                        match self.state.lock() {
                            Ok(mut s) => {
                                s.current_file = Some(path.to_string());
                                s.duration_ms = self.duration_ms;
                                s.position_ms = 0;
                            }
                            Err(poisoned) => {
                                error!(
                                    "Audio state mutex poisoned in handle_play_request, recovering"
                                );
                                let mut s = poisoned.into_inner();
                                s.current_file = Some(path.to_string());
                                s.duration_ms = self.duration_ms;
                                s.position_ms = 0;
                            }
                        }
                    }

                    self.update_media_metadata(
                        title,
                        artist,
                        album,
                        artwork_path,
                        self.duration_ms,
                    );
                    self.emit_state();
                    self.emit_progress();
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

    pub(crate) fn play_file_hard_cut(
        &mut self,
        path: &str,
        title: &str,
        artist: &str,
        album: &str,
        artwork_path: Option<&str>,
    ) {
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

    pub(crate) fn update_media_metadata(
        &self,
        title: &str,
        artist: &str,
        album: &str,
        _artwork_path: Option<&str>,
        duration_ms: u64,
    ) {
        if let Ok(mut guard) = self.media_controls.lock() {
            if let Some(ref mut c) = *guard {
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

    pub(crate) fn recreate_cpal_stream(&mut self, _sample_rate: u32, _channels: u16) {
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
            self.app_handle
                .emit(EVENT_PLAYBACK_ERROR, "No audio output device available")
                .ok();
            return;
        };

        let config: StreamConfig = match device.default_output_config() {
            Ok(c) => c.into(),
            Err(e) => {
                error!("Failed to get default audio config: {}", e);
                self.app_handle
                    .emit(EVENT_PLAYBACK_ERROR, format!("Audio device error: {}", e))
                    .ok();
                return;
            }
        };

        self.device_sample_rate = config.sample_rate.0;
        self.device_channels = config.channels;

        let min_buffer = self.primary_buffer.len() * 2;
        let buffer_size =
            (self.device_sample_rate as usize * self.device_channels as usize).max(min_buffer);

        let (producer, consumer) = HeapRb::<f32>::new(buffer_size).split();
        self.producer = Some(producer);

        let volume = self.volume.clone();
        let is_playing = self.is_playing.clone();
        let device_error = self.device_error.clone();
        let fade_gain_arc = self.fade_gain.clone();
        let fade_target_arc = self.fade_target.clone();
        let fade_step_arc = self.fade_step.clone();
        let channels = self.device_channels as usize;
        let mut consumer = consumer;

        let stream = match device.build_output_stream(
            &config,
            move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                if !is_playing.load(Ordering::Relaxed) {
                    data.fill(0.0);
                    return;
                }

                let vol = f32::from_bits(volume.load(Ordering::Relaxed) as u32);
                let mut gain = f32::from_bits(fade_gain_arc.load(Ordering::Relaxed));
                let target = f32::from_bits(fade_target_arc.load(Ordering::Relaxed));
                let step = f32::from_bits(fade_step_arc.load(Ordering::Relaxed));

                let mut should_stop = false;
                for frame in data.chunks_mut(channels) {
                    for sample in frame.iter_mut() {
                        if (gain - target).abs() > step * 0.5 {
                            gain += if gain < target { step } else { -step };
                            if (gain - target).abs() <= step {
                                gain = target;
                            }
                        }
                        if gain <= f32::EPSILON && target <= f32::EPSILON {
                            should_stop = true;
                        }
                        *sample = consumer.try_pop().unwrap_or(0.0) * vol * gain;
                    }
                }
                fade_gain_arc.store(gain.to_bits(), Ordering::Relaxed);
                if should_stop {
                    is_playing.store(false, Ordering::Relaxed);
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
                self.app_handle
                    .emit(
                        EVENT_PLAYBACK_ERROR,
                        format!("Failed to initialize audio: {}", e),
                    )
                    .ok();
                return;
            }
        };

        if let Err(e) = stream.play() {
            error!("Failed to play audio stream: {}", e);
            self.app_handle
                .emit(
                    EVENT_PLAYBACK_ERROR,
                    format!("Failed to start playback: {}", e),
                )
                .ok();
            return;
        }

        self._current_stream = Some(stream);
    }

    /// Linear interpolation resampler: converts audio from input_rate to output_rate
    pub(crate) fn resample_audio(
        input: &[f32],
        input_rate: u32,
        output_rate: u32,
        channels: usize,
        output: &mut [f32],
    ) -> usize {
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
                let a = if fi < input_frames {
                    input[fi * channels + ch] as f64
                } else {
                    0.0
                };
                let b = if fi + 1 < input_frames {
                    input[(fi + 1) * channels + ch] as f64
                } else {
                    a
                };
                output[of * channels + ch] = (a * (1.0 - frac) + b * frac).clamp(-1.0, 1.0) as f32;
            }
        }

        output_frames * channels
    }

    pub(crate) fn decode_and_push(&mut self) {
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

                let mut crossfade_progress = 0.0;
                let mut is_fading = false;
                let mut crossfade_dur = Duration::from_secs(0);

                if let CrossfadeState::Fading {
                    start_time,
                    duration,
                } = self.crossfade_state
                {
                    crossfade_dur = duration;
                    let elapsed = start_time.elapsed();
                    crossfade_progress = (elapsed.as_secs_f32() / duration.as_secs_f32()).min(1.0);
                    is_fading = true;
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

                    if secondary_read == 0 {
                        track_finished = true;
                        break;
                    }

                    let dev_channels = self.device_channels as usize;
                    let dev_rate = self.device_sample_rate;
                    let crossfade_dur_secs = crossfade_dur.as_secs_f32();
                    let samples_per_sec = dev_rate as f32 * dev_channels as f32;

                    let secondary_rate = self
                        .secondary_decoder
                        .as_ref()
                        .map(|d| d.sample_rate())
                        .unwrap_or(44100);
                    let secondary_len = Self::resample_audio(
                        &secondary_buffer[..secondary_read],
                        secondary_rate,
                        dev_rate,
                        dev_channels,
                        &mut self.resample_buf,
                    );

                    if secondary_len == 0 {
                        track_finished = true;
                        break;
                    }

                    let vol_step_fade_in = if crossfade_dur_secs > 0.0 {
                        1.0 / (crossfade_dur_secs * samples_per_sec)
                    } else {
                        1.0
                    };
                    for i in 0..secondary_len {
                        let t = (crossfade_progress + i as f32 * vol_step_fade_in).min(1.0);
                        self.resample_buf[i] *= t;
                    }
                    if self.mix_buf.len() < secondary_len {
                        self.mix_buf.resize(secondary_len, 0.0);
                    }
                    self.mix_buf[..secondary_len]
                        .copy_from_slice(&self.resample_buf[..secondary_len]);

                    let primary_rate = self
                        .primary_decoder
                        .as_ref()
                        .map(|d| d.sample_rate())
                        .unwrap_or(44100);

                    if primary_buffer.len() < secondary_read {
                        primary_buffer.resize(secondary_read, 0.0);
                    }
                    if primary_read < secondary_read {
                        primary_buffer[primary_read..secondary_read].fill(0.0);
                    }

                    let primary_len = Self::resample_audio(
                        &primary_buffer[..secondary_read],
                        primary_rate,
                        dev_rate,
                        dev_channels,
                        &mut self.resample_buf,
                    );

                    let vol_step_fade_out = if crossfade_dur_secs > 0.0 {
                        -1.0 / (crossfade_dur_secs * samples_per_sec)
                    } else {
                        -1.0
                    };

                    debug!(
                        "[crossfade] batch: pri_read={} sec_read={} pri_resampled={} sec_resampled={} rate_pri={}hz→{}hz rate_sec={}hz→{}hz progress={:.4} fade_delta_in={:.6}",
                        primary_read, secondary_read, primary_len, secondary_len,
                        primary_rate, dev_rate, secondary_rate, dev_rate,
                        crossfade_progress, secondary_len as f32 * vol_step_fade_in,
                    );
                    for i in 0..primary_len {
                        let t = (1.0 - crossfade_progress + i as f32 * vol_step_fade_out).max(0.0);
                        self.resample_buf[i] *= t;
                    }

                    let mix_len = secondary_len.max(primary_len);
                    for i in 0..secondary_len.min(primary_len) {
                        self.resample_buf[i] += self.mix_buf[i];
                    }
                    if secondary_len > primary_len {
                        if self.resample_buf.len() < secondary_len {
                            self.resample_buf.resize(secondary_len, 0.0);
                        }
                        self.resample_buf[primary_len..secondary_len]
                            .copy_from_slice(&self.mix_buf[primary_len..secondary_len]);
                    }
                    producer.push_slice(&self.resample_buf[..mix_len]);

                    self.samples_played += secondary_len as u64;
                    let samples_per_ms = (dev_rate as u64 * self.device_channels as u64) / 1000;
                    if samples_per_ms > 0 {
                        self.current_position_ms = self.samples_played / samples_per_ms;
                    }

                    if crossfade_progress + secondary_len as f32 * vol_step_fade_in >= 1.0 {
                        debug!(
                            "[crossfade] complete: new_rate={}hz new_ch={}",
                            self.secondary_decoder
                                .as_ref()
                                .map(|d| d.sample_rate())
                                .unwrap_or(0),
                            self.secondary_decoder
                                .as_ref()
                                .map(|d| d.channels())
                                .unwrap_or(0),
                        );
                        self.primary_decoder = self.secondary_decoder.take();
                        if self.primary_buffer.len() != self.secondary_buffer.len() {
                            self.primary_buffer.resize(self.secondary_buffer.len(), 0.0);
                            self.resample_buf.resize(self.primary_buffer.len() * 2, 0.0);
                            self.mix_buf.resize(self.secondary_buffer.len() * 2, 0.0);
                        }
                        self.primary_buffer.copy_from_slice(&self.secondary_buffer);
                        self.current_file_sample_rate = self
                            .primary_decoder
                            .as_ref()
                            .map(|d| d.sample_rate())
                            .unwrap_or(44100);
                        self.crossfade_state = CrossfadeState::None;
                        self.crossfade_batches_logged = 5;
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

        if self.crossfade_batches_logged > 0 {
            debug!(
                "[crossfade] post batch {}/5: file_rate={}hz dev_rate={}hz dev_ch={} is_crossfade_done={}",
                6 - self.crossfade_batches_logged,
                self.current_file_sample_rate, self.device_sample_rate,
                self.device_channels,
                matches!(self.crossfade_state, CrossfadeState::None),
            );
            self.crossfade_batches_logged -= 1;
        }

        if track_finished {
            self.handle_end_of_track();
        }
    }

    pub(crate) fn handle_device_change(&mut self) {
        info!("Audio device changed, reconfiguring stream");
        self.device_error.store(false, Ordering::Relaxed);
        if self.current_file_path.is_some() {
            self._current_stream = None;
            self.producer = None;
            self.recreate_cpal_stream(self.device_sample_rate, self.device_channels);
            self.app_handle.emit("audio-device-recovered", ()).ok();
        }
    }

    pub(crate) fn handle_end_of_track(&mut self) {
        info!("Track finished naturally");
        self.stop();
        self.app_handle.emit(EVENT_PLAYBACK_FINISHED, ()).ok();
    }

    pub(crate) fn pause(&mut self) {
        let step = f32::from_bits(self.fade_step.load(Ordering::Relaxed));
        if self.fade_in_out_enabled && step > 0.0 && self.is_playing.load(Ordering::Relaxed) {
            info!("Playback paused (fade-out)");
            self.fade_target.store(f32::to_bits(0.0), Ordering::Relaxed);
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
        } else {
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
    }

    pub(crate) fn resume(&mut self) {
        let step = f32::from_bits(self.fade_step.load(Ordering::Relaxed));
        if self.fade_in_out_enabled && step > 0.0 {
            info!("Playback resumed (fade-in)");
            self.is_playing.store(true, Ordering::Relaxed);
            self.fade_gain.store(f32::to_bits(0.0), Ordering::Relaxed);
            self.fade_target.store(f32::to_bits(1.0), Ordering::Relaxed);
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
        } else {
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
    }

    pub(crate) fn stop(&mut self) {
        info!("Playback stopped");
        self.is_playing.store(false, Ordering::Relaxed);
        self.fade_gain.store(f32::to_bits(1.0), Ordering::Relaxed);
        self.fade_target.store(f32::to_bits(1.0), Ordering::Relaxed);

        self.primary_decoder = None;
        self.secondary_decoder = None;

        self._current_stream = None;
        self.producer = None;
        self.current_file_path = None;
        self.current_position_ms = 0;
        self.duration_ms = 0;
        self.samples_played = 0;
        self.crossfade_state = CrossfadeState::None;
        self.crossfade_batches_logged = 0;

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

    pub(crate) fn seek(&mut self, pos_ms: u64) {
        info!("Seeking to {}ms", pos_ms);

        self.secondary_decoder = None;
        self.crossfade_state = CrossfadeState::None;
        self.crossfade_batches_logged = 0;
        self.fade_gain.store(f32::to_bits(1.0), Ordering::Relaxed);
        self.fade_target.store(f32::to_bits(1.0), Ordering::Relaxed);

        let seek_ok = self
            .primary_decoder
            .as_mut()
            .map(|dec| dec.seek_to(pos_ms).is_ok())
            .unwrap_or(false);

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

            self._current_stream = None;
            self.producer = None;
            self.recreate_cpal_stream(self.device_sample_rate, self.device_channels);

            self.update_media_controls();
        } else {
            error!("Seek failed");
        }
    }

    pub(crate) fn emit_progress(&mut self) {
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
        if should_update {
            self.update_media_controls();
            self.last_media_pos_update = Instant::now();
        }
    }

    pub(crate) fn emit_state(&self) {
        let guard = match self.state.lock() {
            Ok(g) => g,
            Err(poisoned) => {
                error!("Audio state mutex poisoned in emit_state, recovering");
                poisoned.into_inner()
            }
        };
        self.app_handle.emit(EVENT_PLAYBACK_STATE, &*guard).ok();
    }

    pub(crate) fn update_media_controls(&self) {
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
