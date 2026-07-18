//! Audio feature — symphonia-based decoding and CPAL output engine.
//!
//! Sub-modules:
//! - [`types`]: Playback state, device, and command types
//! - [`engine`]: AudioEngine (command sender) and AudioState wrapper
//! - [`decoder`]: Symphonia-based file decoder
//! - [`crossfade`]: Crossfade state machine
//! - [`worker`]: AudioWorker thread (decode, resample, mix, output)
//! - [`commands`]: Tauri command handlers

pub mod commands;
pub mod crossfade;
pub mod decoder;
pub mod engine;
#[cfg(test)]
mod tests;
pub mod types;
pub mod worker;

pub use engine::{AudioEngine, AudioState};
#[allow(unused_imports)]
pub use types::{AudioDevice, PlaybackState};
