use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    #[allow(dead_code)]
    Database(String), // We convert sql error to string to avoid complex serialization traits
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Audio error: {0}")]
    Audio(String),
    #[error("Media Control error: {0}")]
    #[allow(dead_code)]
    MediaControl(String),
    #[error("Unknown error: {0}")]
    Unknown(String),
}

// We need to implement Serialize manually or use a trick because std::io::Error isn't Serialize
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// Helper for converting string errors
impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Unknown(s)
    }
}
