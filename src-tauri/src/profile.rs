use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct ProfileState(pub Mutex<Option<String>>);

#[tauri::command]
pub fn set_active_profile(app: AppHandle, profile_id: Option<String>) {
    log::info!("Setting active profile to: {:?}", profile_id);
    let state = app.state::<ProfileState>();
    let mut current = state.0.lock().unwrap();
    *current = profile_id;
}

pub fn get_library_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // Default path
    let mut db_name = "library.db".to_string();

    // Check state if available
    if let Some(state) = app.try_state::<ProfileState>() {
        let current = state.0.lock().unwrap();
        if let Some(id) = &*current {
            db_name = format!("library_{}.db", id);
        } else {
            log::info!("No active profile set in state. Using default library.db");
        }
    } else {
        log::warn!("ProfileState not found! Using default library.db");
    }

    log::info!("Resolved DB path: {:?}", db_name);

    Ok(app_data_dir.join(db_name))
}

#[tauri::command]
pub fn delete_profile_data(app: AppHandle, profile_id: String) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // 1. Delete Database
    let db_path = app_data_dir.join(format!("library_{}.db", profile_id));
    if db_path.exists() {
        std::fs::remove_file(&db_path).map_err(|e| format!("Failed to delete DB: {}", e))?;
    }

    // 2. Delete Settings
    let settings_path = app_data_dir.join(format!("settings_{}.json", profile_id));
    if settings_path.exists() {
        std::fs::remove_file(&settings_path)
            .map_err(|e| format!("Failed to delete settings: {}", e))?;
    }

    // 3. Delete Avatar
    let avatars_dir = app_data_dir.join("avatars");
    if avatars_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&avatars_dir) {
            for entry in entries.flatten() {
                 let path = entry.path();
                 if path.is_file() {
                      if let Some(stem) = path.file_stem() {
                          if stem.to_string_lossy() == profile_id {
                               log::info!("Deleting profile avatar: {:?}", path);
                               let _ = std::fs::remove_file(path);
                          }
                      }
                 }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn upload_profile_avatar(
    app: AppHandle,
    profile_id: String,
    file_path: String,
) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let avatars_dir = app_data_dir.join("avatars");

    // Create avatars directory if it doesn't exist
    if !avatars_dir.exists() {
        std::fs::create_dir_all(&avatars_dir).map_err(|e| e.to_string())?;
    }

    let source_path = std::path::Path::new(&file_path);
    if !source_path.exists() {
        return Err("Source file does not exist".to_string());
    }

    let extension = source_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg"); // Default to jpg if unknown, though we should validate

    let target_filename = format!("{}.{}", profile_id, extension);
    let target_path = avatars_dir.join(&target_filename);

    std::fs::copy(source_path, &target_path).map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_profile_avatar_bytes(
    app: AppHandle,
    profile_id: String,
    image_data: Vec<u8>,
) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let avatars_dir = app_data_dir.join("avatars");

    if !avatars_dir.exists() {
        std::fs::create_dir_all(&avatars_dir).map_err(|e| e.to_string())?;
    }

    // Always save as jpg for cropped images (assuming ImageCropDialog outputs jpeg)
    // Or we could detect signature, but jpg is safe assumption from frontend default (0.9 quality jpeg)
    let target_filename = format!("{}.jpg", profile_id);
    let target_path = avatars_dir.join(&target_filename);

    use std::io::Write;
    let mut file =
        std::fs::File::create(&target_path).map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&image_data)
        .map_err(|e| format!("Failed to write data: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}
