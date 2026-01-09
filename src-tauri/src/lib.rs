// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod audio;
mod scanner;
use audio::{AudioEngine, AudioState};
use std::sync::Arc;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize audio engine
    let engine = Arc::new(AudioEngine::new());
    let state = AudioState(engine.clone());

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .setup(move |app| {
            // Start background progress tracking
            audio::start_progress_tracking(app.handle().clone(), engine);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            scanner::get_file_metadata,
            scanner::scan_folder,
            scanner::scan_music_library,
            // Audio commands
            audio::audio_play,
            audio::audio_pause,
            audio::audio_resume,
            audio::audio_stop,
            audio::audio_seek,
            audio::audio_set_volume,
            audio::audio_get_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
