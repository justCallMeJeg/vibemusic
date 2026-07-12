// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod artwork;
mod audio;
mod database;
mod error;
mod metadata;
mod library;
mod playlists;
mod profile;
mod scanner;
mod updater;
mod watcher;
mod lyrics;
mod stats;
mod install_format;


use audio::{AudioEngine, AudioState};
use profile::{DbCache, ProfileState};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::Manager;



/// Entry point for the Tauri application.
/// Initializes plugins, state, and runs the application loop.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:library.db",
                    vec![
                        tauri_plugin_sql::Migration {
                            version: 1,
                            description: "initial_schema",
                            sql: include_str!("../migrations/001_initial_schema.sql"),
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 2,
                            description: "add_playlist_artwork",
                            sql: include_str!("../migrations/002_add_playlist_artwork.sql"),
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 3,
                            description: "add_track_title_index",
                            sql: include_str!("../migrations/003_add_track_title_index.sql"),
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                    ],
                )
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .clear_targets()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("vibemusic".to_string()),
                    },
                ))
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(20))
                .max_file_size(2_000_000) // 2MB
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .setup(move |app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};

            // Initialize audio engine with app handle
            let engine = Arc::new(AudioEngine::new(app.handle().clone()));
            let state = AudioState(engine.clone());

            // Manage state manually since we are in setup
            app.manage(state);
            app.manage(ProfileState(Mutex::new(None)));
            app.manage(DbCache(Mutex::new(HashMap::new())));
            app.manage(updater::PendingUpdate::default());
            app.manage(watcher::init());
            app.manage(install_format::detect_install_format());

            // Initialize media events
            engine.init_media_events(app.handle().clone());

            // System Tray Setup
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("tray")
                .icon(app.default_window_icon().expect("window icon must be configured").clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        if let Some(state) = app.try_state::<AudioState>() {
                            state.0.stop();
                        }
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Library
            library::get_all_tracks,
            library::get_all_albums,
            library::get_album_by_id,
            library::get_album_tracks,
            library::delete_track,
            library::remove_location,
            scanner::get_file_metadata,
            scanner::scan_folder,
            scanner::scan_music_library,
            scanner::check_files_exist,
            scanner::prune_library,
            // Artist commands
            library::get_all_artists,
            library::get_artist_by_id,
            library::get_artist_albums,
            library::get_artist_tracks,
            library::search,
            // Audio commands
            audio::audio_play,
            audio::audio_pause,
            audio::audio_resume,
            audio::audio_stop,
            audio::audio_seek,
            audio::audio_set_volume,
            audio::audio_get_state,
            audio::audio_get_devices,
            audio::audio_set_device,
            audio::audio_set_crossfade,
            // Playlist commands
            playlists::create_playlist,
            playlists::delete_playlist,
            playlists::update_playlist,
            playlists::get_playlists,
            playlists::get_playlist_tracks,
            playlists::add_track_to_playlist,
            playlists::remove_track_from_playlist,
            playlists::reorder_playlist,
            // Profile
            profile::set_active_profile,
            profile::delete_profile_data,
            profile::upload_profile_avatar,
            profile::save_profile_avatar_bytes,
            // Updater
            updater::check_update,
            updater::get_latest_release,
            updater::download_update,
            updater::install_update,
            updater::download_and_install_update,
            // Watcher
            watcher::watch_paths,
            // Metadata
            metadata::probe_file,
            // Lyrics
            lyrics::get_lyrics,
            // Stats
            stats::record_playback,
            stats::get_stats,
            // Install format
            install_format::get_install_format,
            // App
            quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn quit_app(state: tauri::State<AudioState>, app: tauri::AppHandle) {
    state.0.stop();
    app.exit(0);
}
