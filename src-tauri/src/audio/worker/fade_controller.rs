use std::sync::atomic::Ordering;

use log::{error, info};

use super::AudioWorker;

impl AudioWorker {
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
        self.notify_discord_rpc();
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
        self.notify_discord_rpc();
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
        self.current_title = None;
        self.current_artist = None;
        self.current_album = None;
        self.current_artwork_path = None;
        self.current_position_ms = 0;
        self.duration_ms = 0;
        self.samples_played = 0;
        self.crossfade_state = crate::audio::crossfade::CrossfadeState::None;
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
                c.set_playback(souvlaki::MediaPlayback::Stopped).ok();
            }
        }

        self.emit_state();

        #[cfg(feature = "discord-rpc")]
        {
            use tauri::Manager;
            if let Some(discord_state) = self
                .app_handle
                .try_state::<crate::discord_rpc::DiscordRpcHandle>()
            {
                discord_state.send(crate::discord_rpc::RpcCommand::ClearActivity);
            }
        }
    }
}
