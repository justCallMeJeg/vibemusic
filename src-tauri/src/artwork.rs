use image::ImageFormat;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};

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
        if let Err(_) = fs::create_dir_all(cache_dir) {
            return None;
        }
    }

    // 5. Load and resize image
    if let Ok(img) = image::load_from_memory(data) {
        // Resize to max 500x500 to save space and load time
        // preserve_aspect_ratio = true
        let resized = img.resize(500, 500, image::imageops::FilterType::Lanczos3);

        // 6. Save as optimized JPEG
        if let Ok(mut file) = fs::File::create(&file_path) {
            // Write with 80% quality
            if resized.write_to(&mut file, ImageFormat::Jpeg).is_ok() {
                return Some(file_path.to_string_lossy().to_string());
            }
        }
    }

    None
}
