use std::time::Duration;

/// State of the crossfade
pub(crate) enum CrossfadeState {
    None,
    Fading {
        start_time: std::time::Instant,
        duration: Duration,
    },
}
