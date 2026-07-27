// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod shared;

mod artwork;
mod audio;
mod database;
mod install_format;
mod library;
mod lyrics;
mod metadata;
mod playlists;
mod profile;
mod scanner;
mod stats;
mod updater;
mod watcher;

#[cfg(feature = "discord-rpc")]
mod discord_rpc;

#[cfg(feature = "scrobbler")]
mod scrobbler;

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

            #[cfg(feature = "discord-rpc")]
            {
                let discord_handle = discord_rpc::DiscordRpcHandle::new();
                app.manage(discord_handle);
            }

            #[cfg(feature = "scrobbler")]
            {
                let scrobbler_state = scrobbler::commands::ScrobblerState::new();
                app.manage(scrobbler_state);
            }

            // Initialize media events
            engine.init_media_events(app.handle().clone());

            // System Tray Setup
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("tray")
                .icon(
                    app.default_window_icon()
                        .expect("window icon must be configured")
                        .clone(),
                )
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        if let Some(state) = app.try_state::<AudioState>() {
                            state.0.stop();
                        }
                        #[cfg(feature = "discord-rpc")]
                        if let Some(discord_state) =
                            app.try_state::<discord_rpc::DiscordRpcHandle>()
                        {
                            discord_state.shutdown();
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
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
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
            audio::commands::audio_play,
            audio::commands::audio_pause,
            audio::commands::audio_resume,
            audio::commands::audio_stop,
            audio::commands::audio_seek,
            audio::commands::audio_set_volume,
            audio::commands::audio_get_state,
            audio::commands::audio_get_devices,
            audio::commands::audio_set_device,
            audio::commands::audio_set_crossfade,
            audio::commands::audio_set_fade_in_out,
            // Playlist commands
            playlists::create_playlist,
            playlists::delete_playlist,
            playlists::update_playlist,
            playlists::get_playlists,
            playlists::get_playlist_tracks,
            playlists::add_track_to_playlist,
            playlists::remove_track_from_playlist,
            playlists::reorder_playlist,
            playlists::toggle_like_track,
            playlists::get_liked_track_ids,
            playlists::toggle_pin_playlist,
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
            #[cfg(feature = "discord-rpc")]
            discord_rpc_enable,
            #[cfg(feature = "discord-rpc")]
            discord_rpc_disable,
            #[cfg(feature = "discord-rpc")]
            discord_rpc_get_status,
            #[cfg(feature = "scrobbler")]
            scrobbler::commands::lastfm_start_auth,
            #[cfg(feature = "scrobbler")]
            scrobbler::commands::lastfm_connect,
            #[cfg(feature = "scrobbler")]
            scrobbler::commands::lastfm_disconnect,
            #[cfg(feature = "scrobbler")]
            scrobbler::commands::lastfm_get_status,
            #[cfg(feature = "scrobbler")]
            scrobbler::commands::update_now_playing,
            #[cfg(feature = "scrobbler")]
            scrobbler::commands::scrobble_track,
            get_available_features,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn quit_app(state: tauri::State<AudioState>, app: tauri::AppHandle) {
    state.0.stop();
    #[cfg(feature = "discord-rpc")]
    if let Some(discord_state) = app.try_state::<discord_rpc::DiscordRpcHandle>() {
        discord_state.shutdown();
    }
    app.exit(0);
}

#[cfg(feature = "discord-rpc")]
#[tauri::command]
fn discord_rpc_enable(state: tauri::State<discord_rpc::DiscordRpcHandle>) {
    state.init();
}

#[cfg(feature = "discord-rpc")]
#[tauri::command]
fn discord_rpc_disable(state: tauri::State<discord_rpc::DiscordRpcHandle>) {
    state.shutdown();
}

#[cfg(feature = "discord-rpc")]
#[tauri::command]
fn discord_rpc_get_status(state: tauri::State<discord_rpc::DiscordRpcHandle>) -> bool {
    state.is_active()
}

#[tauri::command]
fn get_available_features() -> serde_json::Value {
    serde_json::json!({
        "scrobbler": cfg!(feature = "scrobbler"),
        "discord_rpc": cfg!(feature = "discord-rpc"),
    })
}
