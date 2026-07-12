use log::error;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Runtime, State};
use tauri_plugin_updater::{Update, UpdaterExt};
use serde::{Deserialize, Serialize};
use crate::install_format::InstallFormat;

// --- Types ---

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
/// Metadata for an available update.
pub struct UpdateMetadata {
    pub version: String,
    pub current_version: String,
    pub body: Option<String>,
    pub date: Option<String>,
    pub requires_manual_download: bool,
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
        // Compile-time override via VIBEMUSIC_NIGHTLY_ENDPOINT env var, set in CI.
        // Falls back to the default if not set (e.g., local dev builds).
        let url = option_env!("VIBEMUSIC_NIGHTLY_ENDPOINT")
            .unwrap_or("https://github.com/justCallMeJeg/vibemusic/releases/download/nightly/latest.json");
        url::Url::parse(url).ok()
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
    install_format: String,
) -> Result<Option<UpdateMetadata>, String> {
    let mut builder = app.updater_builder();

    if let Some(url) = get_endpoint_for_channel(&channel) {
        builder = builder.endpoints(vec![url]).map_err(|e| e.to_string())?;
    }

    let updater = builder.build().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            let install_fmt: InstallFormat = serde_json::from_str(&format!("\"{}\"", install_format)).unwrap_or_default();
            let requires_manual_download = !install_fmt.supports_auto_update();

            let metadata = UpdateMetadata {
                version: update.version.clone(),
                current_version: update.current_version.clone(),
                body: update.body.clone(),
                date: update.date.map(|d| d.to_string()),
                requires_manual_download,
            };
            
            // Store the update for later download
            match pending_update.update.lock() {
                Ok(mut g) => *g = Some(update),
                Err(e) => {
                    error!("Updater update lock poisoned: {}", e);
                    return Err("Internal error: update lock poisoned".to_string());
                }
            }
            match pending_update.bytes.lock() {
                Ok(mut g) => *g = None,
                Err(e) => {
                    error!("Updater bytes lock poisoned: {}", e);
                    return Err("Internal error: bytes lock poisoned".to_string());
                }
            }

            Ok(Some(metadata))
        }
        Ok(None) => {
            if let Ok(mut g) = pending_update.update.lock() {
                *g = None;
            }
            if let Ok(mut g) = pending_update.bytes.lock() {
                *g = None;
            }
            Ok(None)
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Fetch the latest release changelog without triggering an update check.
#[tauri::command]
pub async fn get_latest_release<R: Runtime>(
    _app: AppHandle<R>,
    channel: String,
) -> Result<Option<UpdateMetadata>, String> {
    let url = if channel == "dev" {
        option_env!("VIBEMUSIC_NIGHTLY_ENDPOINT")
            .unwrap_or("https://github.com/justCallMeJeg/vibemusic/releases/download/nightly/latest.json")
    } else {
        "https://github.com/justCallMeJeg/vibemusic/releases/latest/download/latest.json"
    };

    let client = reqwest::Client::builder()
        .user_agent(format!("vibemusic/{}", env!("CARGO_PKG_VERSION")))
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(url).send().await.map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Ok(None);
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ReleaseManifest {
        version: String,
        notes: Option<String>,
        pub_date: Option<String>,
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    let manifest: ReleaseManifest = serde_json::from_str(&body).map_err(|e| e.to_string())?;

    Ok(Some(UpdateMetadata {
        version: manifest.version,
        current_version: env!("CARGO_PKG_VERSION").to_string(),
        body: manifest.notes,
        date: manifest.pub_date,
        requires_manual_download: false,
    }))
}

/// Download the pending update (stores bytes for later install)
#[tauri::command]
pub async fn download_update<R: Runtime>(
    app: AppHandle<R>,
    pending_update: State<'_, PendingUpdate>,
) -> Result<(), String> {
    let update = {
        let guard = pending_update.update.lock()
            .map_err(|e| format!("Updater update lock poisoned: {}", e))?;
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
    match pending_update.bytes.lock() {
        Ok(mut g) => *g = Some(bytes),
        Err(e) => {
            error!("Updater bytes lock poisoned: {}", e);
            return Err("Internal error: bytes lock poisoned".to_string());
        }
    }
    
    // Emit download complete event
    let _ = app.emit("update-download-complete", ());
    
    Ok(())
}

/// Install the previously downloaded update
#[tauri::command]
pub fn install_update(
    pending_update: State<'_, PendingUpdate>,
) -> Result<(), String> {
    let update = pending_update.update.lock()
        .map_err(|e| format!("Updater update lock poisoned: {}", e))?
        .take();
    let bytes = pending_update.bytes.lock()
        .map_err(|e| format!("Updater bytes lock poisoned: {}", e))?
        .take();
    
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
