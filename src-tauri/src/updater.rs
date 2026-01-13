use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Runtime, State};
use tauri_plugin_updater::{Update, UpdaterExt};
use serde::Serialize;

// --- Types ---

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMetadata {
    pub version: String,
    pub current_version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: Option<u64>,
}

// --- Pending Update State ---
pub struct PendingUpdate {
    pub update: Mutex<Option<Update>>,
    pub bytes: Mutex<Option<Vec<u8>>>,
}

impl Default for PendingUpdate {
    fn default() -> Self {
        Self {
            update: Mutex::new(None),
            bytes: Mutex::new(None),
        }
    }
}

// --- Helper to build updater with channel ---
fn get_endpoint_for_channel(channel: &str) -> Option<url::Url> {
    if channel == "dev" {
        url::Url::parse("https://github.com/justCallMeJeg/vibemusic/releases/download/nightly/latest.json").ok()
    } else {
        None // Use default endpoint from config
    }
}

// --- Commands ---

/// Check for updates and store the update object for later download
#[tauri::command]
pub async fn check_update<R: Runtime>(
    app: AppHandle<R>,
    pending_update: State<'_, PendingUpdate>,
    channel: String,
) -> Result<Option<UpdateMetadata>, String> {
    let mut builder = app.updater_builder();

    if let Some(url) = get_endpoint_for_channel(&channel) {
        builder = builder.endpoints(vec![url]).map_err(|e| e.to_string())?;
    }

    let updater = builder.build().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            let metadata = UpdateMetadata {
                version: update.version.clone(),
                current_version: update.current_version.clone(),
                body: update.body.clone(),
                date: update.date.map(|d| d.to_string()),
            };
            
            // Store the update for later download
            *pending_update.update.lock().unwrap() = Some(update);
            *pending_update.bytes.lock().unwrap() = None;
            
            Ok(Some(metadata))
        }
        Ok(None) => {
            *pending_update.update.lock().unwrap() = None;
            *pending_update.bytes.lock().unwrap() = None;
            Ok(None)
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Download the pending update (stores bytes for later install)
#[tauri::command]
pub async fn download_update<R: Runtime>(
    app: AppHandle<R>,
    pending_update: State<'_, PendingUpdate>,
) -> Result<(), String> {
    let update = {
        let guard = pending_update.update.lock().unwrap();
        guard.clone()
    };
    
    let Some(update) = update else {
        return Err("No pending update to download".to_string());
    };

    let app_handle = app.clone();
    let mut downloaded: u64 = 0;
    
    // Download and get bytes
    let bytes = update.download(
        move |chunk_length, content_length| {
            downloaded += chunk_length as u64;
            let _ = app_handle.emit("update-download-progress", DownloadProgress {
                downloaded,
                total: content_length,
            });
        },
        || {
            // Download finished callback
        }
    ).await.map_err(|e| e.to_string())?;
    
    // Store the bytes for later installation
    *pending_update.bytes.lock().unwrap() = Some(bytes);
    
    // Emit download complete event
    let _ = app.emit("update-download-complete", ());
    
    Ok(())
}

/// Install the previously downloaded update
#[tauri::command]
pub fn install_update(
    pending_update: State<'_, PendingUpdate>,
) -> Result<(), String> {
    let update = pending_update.update.lock().unwrap().take();
    let bytes = pending_update.bytes.lock().unwrap().take();
    
    let Some(update) = update else {
        return Err("No pending update to install".to_string());
    };
    
    let Some(bytes) = bytes else {
        return Err("Update has not been downloaded yet".to_string());
    };

    // Install the update (will trigger app restart)
    update.install(&bytes).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Legacy command: Download and install in one step (kept for compatibility)
#[tauri::command]
pub async fn download_and_install_update<R: Runtime>(
    app: AppHandle<R>,
    channel: String,
) -> Result<(), String> {
    let mut builder = app.updater_builder();

    if let Some(url) = get_endpoint_for_channel(&channel) {
        builder = builder.endpoints(vec![url]).map_err(|e| e.to_string())?;
    }

    let updater = builder.build().map_err(|e| e.to_string())?;
    
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        let app_handle = app.clone();
        let mut downloaded: u64 = 0;
        
        update.download_and_install(
            move |chunk_length, content_length| {
                downloaded += chunk_length as u64;
                let _ = app_handle.emit("update-download-progress", DownloadProgress {
                    downloaded,
                    total: content_length,
                });
            },
            || {
                // Download complete, about to install
            }
        ).await.map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
