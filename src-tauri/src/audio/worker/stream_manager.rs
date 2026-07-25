use std::sync::atomic::Ordering;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::StreamConfig;
use log::{error, info};
use ringbuf::{
    traits::{Consumer, Producer, Split},
    HeapRb,
};
use tauri::Emitter;

use crate::audio::types::EVENT_PLAYBACK_ERROR;

use super::AudioWorker;

impl AudioWorker {
    pub(crate) fn recreate_cpal_stream(
        &mut self,
        _sample_rate: u32,
        _channels: u16,
        prefill: Option<&[f32]>,
    ) {
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

        let (mut producer, consumer) = HeapRb::<f32>::new(buffer_size).split();

        if let Some(data) = prefill {
            let _ = producer.push_slice(data);
        }

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

        self.is_playing.store(true, Ordering::Relaxed);

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

    pub(crate) fn handle_device_change(&mut self) {
        info!("Audio device changed, reconfiguring stream");
        self.device_error.store(false, Ordering::Relaxed);
        if self.current_file_path.is_some() {
            self._current_stream = None;
            self.producer = None;
            self.recreate_cpal_stream(self.device_sample_rate, self.device_channels, None);
            self.app_handle.emit("audio-device-recovered", ()).ok();
        }
    }
}
