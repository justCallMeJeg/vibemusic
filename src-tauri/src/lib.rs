// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod artwork;
mod audio;
mod database;
mod error;
mod ffmpeg;
mod library;
mod scanner;
mod playlists;
use audio::{AudioEngine, AudioState};
use std::sync::Arc;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:library.db",
                    vec![tauri_plugin_sql::Migration {
                        version: 1,
                        description: "initial_schema",
                        sql: include_str!("../migrations/001_initial_schema.sql"),
                        kind: tauri_plugin_sql::MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            // Initialize audio engine with app handle
            let engine = Arc::new(AudioEngine::new(app.handle().clone()));
            let state = AudioState(engine.clone());

            // Manage state manually since we are in setup
            app.manage(state);

            // Initialize media events
            engine.init_media_events(app.handle().clone());

            // Start background progress tracking
            audio::start_progress_tracking(app.handle().clone(), engine);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            library::get_all_tracks,
            library::get_all_albums,
            library::get_album_by_id,
            library::get_album_tracks,
            scanner::get_file_metadata,
            scanner::scan_folder,
            scanner::scan_music_library,
            scanner::check_files_exist,
            scanner::prune_library,
            // Audio commands
            audio::audio_play,
            audio::audio_pause,
            audio::audio_resume,
            audio::audio_stop,
            audio::audio_seek,
            audio::audio_set_volume,
            audio::audio_set_volume,
            audio::audio_set_volume,
            audio::audio_get_state,
            audio::audio_get_devices,
            audio::audio_set_device,
            audio::audio_set_crossfade,
            // Playlist commands
            playlists::create_playlist,
            playlists::delete_playlist,
            playlists::get_playlists,
            playlists::get_playlist_tracks,
            playlists::add_track_to_playlist,
            playlists::remove_track_from_playlist
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
