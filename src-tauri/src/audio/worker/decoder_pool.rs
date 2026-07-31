use std::time::{Duration, Instant};

use super::AudioWorker;

impl AudioWorker {
    pub(crate) fn prefill_buffer(&mut self, file_rate: u32) -> Vec<f32> {
        let target_samples =
            (self.device_sample_rate as usize * self.device_channels as usize) / 4;
        let mut prefill = Vec::with_capacity(target_samples);
        let start = Instant::now();

        let Some(decoder) = self.primary_decoder.as_mut() else {
            return prefill;
        };

        let dev_rate = self.device_sample_rate;
        let dev_ch = self.device_channels as usize;

        while prefill.len() < target_samples && start.elapsed() < Duration::from_millis(100) {
            let Ok(n) = decoder.decode(&mut self.primary_buffer) else {
                break;
            };
            if n == 0 {
                break;
            }

            let len = if file_rate != dev_rate {
                Self::resample_audio(
                    &self.primary_buffer[..n],
                    file_rate,
                    dev_rate,
                    dev_ch,
                    &mut self.resample_buf,
                )
            } else {
                let copy_len = n.min(self.resample_buf.len());
                self.resample_buf[..copy_len].copy_from_slice(&self.primary_buffer[..copy_len]);
                copy_len
            };
            prefill.extend_from_slice(&self.resample_buf[..len]);
        }

        prefill
    }

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
}
