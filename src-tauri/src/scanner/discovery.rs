use std::path::Path;
use walkdir::WalkDir;

/// Supported audio file extensions
const AUDIO_EXTENSIONS: &[&str] = &["mp3", "flac", "wav", "ogg", "m4a", "aac", "aiff"];

/// Check if a file has an audio extension
pub fn is_audio_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// Recursively discovers audio files in the given directory.
pub fn scan_folder(path: String) -> Result<Vec<String>, String> {
    let root = Path::new(&path);
    if !root.exists() {
        return Err("Directory does not exist".to_string());
    }
    if !root.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut audio_files = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() && is_audio_file(path) {
            audio_files.push(path.to_string_lossy().to_string());
        }
    }
    Ok(audio_files)
}
