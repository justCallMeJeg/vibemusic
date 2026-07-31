use std::sync::Mutex;

use crate::scrobbler::auth_server;
use crate::scrobbler::client::ScrobblerClient;

pub struct ScrobblerState(pub Mutex<Option<ScrobblerClient>>);

impl ScrobblerState {
    pub fn new() -> Self {
        Self(Mutex::new(None))
    }
}

#[tauri::command]
pub fn lastfm_start_auth() -> Result<(String, String), String> {
    auth_server::start_auth()
}

#[tauri::command]
pub fn lastfm_connect(
    state: tauri::State<ScrobblerState>,
    session_key: String,
) -> Result<(), String> {
    let client = ScrobblerClient::new(session_key);
    *state.0.lock().map_err(|e| e.to_string())? = Some(client);
    Ok(())
}

#[tauri::command]
pub fn lastfm_disconnect(state: tauri::State<ScrobblerState>) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

#[tauri::command]
pub fn lastfm_get_status(state: tauri::State<ScrobblerState>) -> Result<bool, String> {
    Ok(state.0.lock().map_err(|e| e.to_string())?.is_some())
}

#[tauri::command]
pub fn update_now_playing(
    state: tauri::State<ScrobblerState>,
    artist: String,
    track: String,
    album: String,
    duration_secs: u64,
) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref client) = *guard {
        client.now_playing(&artist, &track, &album, duration_secs)?;
    }
    Ok(())
}

#[tauri::command]
pub fn scrobble_track(
    state: tauri::State<ScrobblerState>,
    artist: String,
    track: String,
    album: String,
    duration_secs: u64,
    timestamp: u64,
) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref client) = *guard {
        client.scrobble(&artist, &track, &album, duration_secs, timestamp)?;
    }
    Ok(())
}
