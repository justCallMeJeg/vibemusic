use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use std::path::PathBuf;

pub struct ProfileState(pub Mutex<Option<String>>);

#[tauri::command]
pub fn set_active_profile(app: AppHandle, profile_id: Option<String>) {
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
        }
    }

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
        std::fs::remove_file(&settings_path).map_err(|e| format!("Failed to delete settings: {}", e))?;
    }
    
    // 3. Delete Store .lock? (Optional, store plugin might leave lock files)
    
    Ok(())
}
