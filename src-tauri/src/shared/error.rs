//! Application-wide error type for VibeMusic.
//!
//! Uses [`thiserror`] for ergonomic error derivation and implements
//! [`Serialize`] for Tauri command compatibility.

use serde::Serialize;
use thiserror::Error;

/// Application-wide error type.
#[derive(Error, Debug)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Audio error: {0}")]
    Audio(String),
    #[error("Internal error: {0}")]
    #[allow(dead_code)]
    Internal(String),
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Unknown(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_error_audio_display() {
        let err = AppError::Audio("device not found".to_string());
        assert_eq!(err.to_string(), "Audio error: device not found");
    }

    #[test]
    fn test_app_error_unknown_display() {
        let err = AppError::Unknown("something went wrong".to_string());
        assert_eq!(err.to_string(), "Unknown error: something went wrong");
    }

    #[test]
    fn test_app_error_from_string() {
        let err: AppError = "custom error".to_string().into();
        match err {
            AppError::Unknown(s) => assert_eq!(s, "custom error"),
            _ => panic!("Expected Unknown variant"),
        }
    }

    #[test]
    fn test_app_error_serializes_to_string() {
        let err = AppError::Audio("no output".to_string());
        let serialized = serde_json::to_string(&err).unwrap_or_default();
        assert_eq!(serialized, "\"Audio error: no output\"");
    }

    #[test]
    fn test_app_error_internal_display() {
        let err = AppError::Internal("lock poisoned".to_string());
        assert_eq!(err.to_string(), "Internal error: lock poisoned");
    }
}
