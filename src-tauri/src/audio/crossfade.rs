use std::time::Duration;

/// State of the crossfade
#[derive(Debug)]
pub(crate) enum CrossfadeState {
    None,
    Fading {
        start_time: std::time::Instant,
        duration: Duration,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crossfade_none_variant_exists() {
        let state = CrossfadeState::None;
        assert!(matches!(state, CrossfadeState::None));
    }

    #[test]
    fn crossfade_fading_construct() {
        let state = CrossfadeState::Fading {
            start_time: std::time::Instant::now(),
            duration: Duration::from_millis(2000),
        };
        match state {
            CrossfadeState::Fading { duration, .. } => {
                assert_eq!(duration, Duration::from_millis(2000));
            }
            _ => panic!("Expected Fading variant"),
        }
    }

    #[test]
    fn crossfade_fading_zero_duration() {
        let state = CrossfadeState::Fading {
            start_time: std::time::Instant::now(),
            duration: Duration::ZERO,
        };
        match state {
            CrossfadeState::Fading { duration, .. } => {
                assert_eq!(duration, Duration::ZERO);
            }
            _ => panic!("Expected Fading variant"),
        }
    }

    #[test]
    fn crossfade_state_is_debug() {
        let state = CrossfadeState::None;
        let debug = format!("{:?}", state);
        assert_eq!(debug, "None");
    }
}
