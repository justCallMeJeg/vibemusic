use image::ImageFormat;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

/// Extract and cache cover art from ID3 tags
/// Returns the absolute path to the cached image
pub fn extract_and_cache_cover(
    picture: &lofty::picture::Picture,
    cache_dir: &Path,
) -> Option<String> {
    // 1. Get image data
    let data = picture.data();
    if data.is_empty() {
        return None;
    }

    // 2. Hash the data to create a unique filename
    let mut hasher = Sha256::new();
    hasher.update(data);
    let hash = format!("{:x}", hasher.finalize());

    // 3. Check if already cached
    let file_name = format!("{}.jpg", hash); // We'll convert everything to JPEG
    let file_path = cache_dir.join(&file_name);

    if file_path.exists() {
        return Some(file_path.to_string_lossy().to_string());
    }

    // 4. Create cache directory if needed
    if !cache_dir.exists() {
        if let Err(e) = fs::create_dir_all(cache_dir) {
            eprintln!("Failed to create cache dir: {}", e);
            return None;
        }
    }

    // 5. Load and resize image
    let img = match image::load_from_memory(data) {
        Ok(img) => img,
        Err(e) => {
            eprintln!("Failed to decode image data (hash: {}): {}", hash, e);
            return None;
        }
    };

    // Resize to max 500x500 to save space and load time
    let resized = img.resize(500, 500, image::imageops::FilterType::Lanczos3);

    // 6. Save as optimized JPEG using Atomic Write (Write temp -> Rename)
    // unique temp name to avoid collisions between threads processing same image
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    
    // Use thread ID or random mix to ensure uniqueness across threads
    let temp_name = format!("{}_{}.tmp", hash, timestamp);
    let temp_path = cache_dir.join(&temp_name);

    if let Ok(mut file) = fs::File::create(&temp_path) {
        // Write with 80% quality
        if let Err(e) = resized.write_to(&mut file, ImageFormat::Jpeg) {
            eprintln!("Failed to write to temp file: {}", e);
            let _ = fs::remove_file(&temp_path);
            return None;
        }
    } else {
        eprintln!("Failed to create temp file");
        return None;
    }

    // Atomic rename
    // On Windows, rename fails if target exists. This is fine, checking existence after failure confirms we are good.
    match fs::rename(&temp_path, &file_path) {
        Ok(_) => Some(file_path.to_string_lossy().to_string()),
        Err(_) => {
            // Clean up temp file
            let _ = fs::remove_file(&temp_path);
            
            // If rename failed, check if target exists (created by another thread)
            if file_path.exists() {
                Some(file_path.to_string_lossy().to_string())
            } else {
                eprintln!("Failed to rename temp file to final path");
                None
            }
        }
    }
}
