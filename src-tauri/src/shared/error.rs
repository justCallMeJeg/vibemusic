//! Application-wide error type for VibeMusic.
//!
//! Uses [`thiserror`] for ergonomic error derivation and implements
//! [`Serialize`] for Tauri command compatibility.

use serde::Serialize;
use thiserror::Error;

/// Application-wide error type.
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("IO: {0}")]
    Io(#[from] std::io::Error),
    #[error("Audio: {0}")]
    Audio(String),
    #[error("HTTP: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Validation: {0}")]
    Validation(String),
    #[error("{0}")]
    Internal(String),
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
        AppError::Internal(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_error_audio_display() {
        let err = AppError::Audio("device not found".to_string());
        assert_eq!(err.to_string(), "Audio: device not found");
    }

    #[test]
    fn test_app_error_not_found_display() {
        let err = AppError::NotFound("track #42".to_string());
        assert_eq!(err.to_string(), "Not found: track #42");
    }

    #[test]
    fn test_app_error_from_string() {
        let err: AppError = "custom error".to_string().into();
        match err {
            AppError::Internal(s) => assert_eq!(s, "custom error"),
            _ => panic!("Expected Internal variant"),
        }
    }

    #[test]
    fn test_app_error_serializes_to_string() {
        let err = AppError::Audio("no output".to_string());
        let serialized = serde_json::to_string(&err).unwrap_or_default();
        assert_eq!(serialized, "\"Audio: no output\"");
    }

    #[test]
    fn test_app_error_internal_display() {
        let err = AppError::Internal("lock poisoned".to_string());
        assert_eq!(err.to_string(), "lock poisoned");
    }
}
