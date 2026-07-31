use super::types::{AudioCommand, PlaybackState};
use super::worker::AudioWorker;
use log::{error, info, warn};
use souvlaki::{MediaControls, MediaPlayback, PlatformConfig, SeekDirection};
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

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

            match window
                .window_handle()
                .expect("Window handle unavailable")
                .as_raw()
            {
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
                warn!(
                    "Failed to initialize media controls (OS media keys disabled): {}",
                    e
                );
                None
            }
        };
        let controls = Arc::new(Mutex::new(controls));

        let (tx, rx) = mpsc::channel();
        let state = Arc::new(Mutex::new(PlaybackState::default()));

        let state_clone = state.clone();
        let controls_clone = controls.clone();

        std::thread::spawn(move || {
            let mut worker = AudioWorker::new(rx, state_clone, controls_clone, handle);
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
                    let _ = handle.emit(
                        "media-seek-by",
                        serde_json::json!({
                            "direction": dir_str,
                            "duration_ms": dur.as_millis() as u64,
                        }),
                    );
                }
                souvlaki::MediaControlEvent::SetPosition(pos) => {
                    let _ = handle.emit(
                        "media-set-position",
                        serde_json::json!({
                            "position_ms": pos.0.as_millis() as u64,
                        }),
                    );
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
        crossfade: bool,
    ) {
        self.command_tx
            .send(AudioCommand::Play {
                path,
                title,
                artist,
                album,
                artwork_path,
                crossfade,
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

    pub fn set_fade_in_out(&self, enabled: bool, duration_ms: u64) {
        self.command_tx
            .send(AudioCommand::SetFadeInOut {
                enabled,
                duration_ms,
            })
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

pub struct AudioState(pub Arc<AudioEngine>);
