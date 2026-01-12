use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_updater::UpdaterExt;
use serde::Serialize;

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

#[tauri::command]
pub async fn check_update<R: Runtime>(
    app: AppHandle<R>,
    channel: String,
) -> Result<Option<UpdateMetadata>, String> {
    let mut builder = app.updater_builder();

    if channel == "dev" {
        builder = builder.endpoints(vec![
            url::Url::parse("https://github.com/justCallMeJeg/vibemusic/releases/download/nightly/latest.json")
                .map_err(|e| e.to_string())?
        ]).map_err(|e| e.to_string())?;
    }

    let updater = builder.build().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            Ok(Some(UpdateMetadata {
                version: update.version,
                current_version: update.current_version,
                body: update.body,
                date: update.date.map(|d| d.to_string()),
            }))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn install_update<R: Runtime>(
    app: AppHandle<R>,
    channel: String,
) -> Result<(), String> {
    let mut builder = app.updater_builder();

    if channel == "dev" {
         builder = builder.endpoints(vec![
            url::Url::parse("https://github.com/justCallMeJeg/vibemusic/releases/download/nightly/latest.json")
                .map_err(|e| e.to_string())?
        ]).map_err(|e| e.to_string())?;
    }

    let updater = builder.build().map_err(|e| e.to_string())?;
    
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        let app_handle = app.clone();
        
        update.download_and_install(
            move |downloaded, total| {
                let _ = app_handle.emit("update-download-progress", DownloadProgress {
                    downloaded: downloaded as u64,
                    total: total.map(|t| t as u64),
                });
            },
            || {
                // Download complete, about to install
            }
        ).await.map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

