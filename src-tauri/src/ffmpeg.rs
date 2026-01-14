use std::path::PathBuf;
use std::process::{Command, Stdio, Child};
use std::io::Read;
use tauri::{AppHandle, Manager, Runtime, Emitter};
use log::info;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;


#[derive(serde::Serialize, Clone, Debug)]
#[serde(tag = "status")]
pub enum FFmpegStatus {
    Ready { path: String, version: String },
    Missing,
    #[allow(dead_code)]
    ManualRequired
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct DownloadProgress {
    pub progress: u64,
    pub total: u64,
}

#[derive(Debug, Clone)]
pub struct MediaMetadata {
    pub duration_ms: u64,
    pub sample_rate: u32,
    pub channels: u16,
}

pub struct FFmpegProcess {
    child: Child,
}

impl FFmpegProcess {
    pub fn spawn(path: &str, sample_rate: u32, channels: u16) -> Result<Self, String> {
        Self::spawn_at(path, sample_rate, channels, None)
    }

    pub fn spawn_at(path: &str, sample_rate: u32, channels: u16, position_ms: Option<u64>) -> Result<Self, String> {
        let ffmpeg_path = resolve_ffmpeg_path_internal()
            .ok_or("FFmpeg binary not found")?;

        let mut cmd = Command::new(ffmpeg_path);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000);

        
        if let Some(pos) = position_ms {
            let seconds = pos as f64 / 1000.0;
            cmd.arg("-ss").arg(format!("{:.3}", seconds));
        }

        cmd.arg("-i")
           .arg(path)
           .arg("-f").arg("f32le")       // Output format: float 32 little endian
           .arg("-ac").arg(channels.to_string())
           .arg("-ar").arg(sample_rate.to_string())
           .arg("-acodec").arg("pcm_f32le")
           .arg("pipe:1")                // Output to stdout
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());       // Capture stderr for debugging

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;
        
        let stderr = child.stderr.take();
        if let Some(mut stderr) = stderr {
            std::thread::spawn(move || {
                let mut buffer = String::new();
                if stderr.read_to_string(&mut buffer).is_ok() {
                    // Only log if there's actual output and it's not just basic info
                    if !buffer.trim().is_empty() {
                         log::warn!("FFmpeg Stderr: {}", buffer);
                    }
                }
            });
        }

        Ok(Self { child })
    }

    pub fn read_samples(&mut self, buffer: &mut [f32]) -> Result<usize, std::io::Error> {
        let stdout = self.child.stdout.as_mut().ok_or(std::io::Error::new(std::io::ErrorKind::BrokenPipe, "No stdout"))?;
        
        // Read bytes directly into f32 buffer by casting/transmuting?
        // Safer to read into u8 buffer then convert, or use `read_exact` logic.
        // Since we are reading f32le, we need 4 bytes per sample.
        let bytes_needed = buffer.len() * 4;
        let mut byte_buffer = vec![0u8; bytes_needed];
        
        // Read as much as available/needed
        let bytes_read = stdout.read(&mut byte_buffer)?;
        if bytes_read == 0 {
            return Ok(0); // EOF
        }

        let samples_read = bytes_read / 4;
        
        for i in 0..samples_read {
            let start = i * 4;
            let bytes = [
                byte_buffer[start],
                byte_buffer[start + 1],
                byte_buffer[start + 2],
                byte_buffer[start + 3]
            ];
            buffer[i] = f32::from_le_bytes(bytes);
        }

        Ok(samples_read)
    }

    pub fn kill(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

pub fn probe_file(path: &str) -> Result<MediaMetadata, String> {
    let ffmpeg_path = resolve_ffmpeg_path_internal()
        .ok_or("FFmpeg binary not found")?;

    // Use ffprobe if available, or ffmpeg -i
    // We expect ffprobe to be next to ffmpeg
    let ffprobe_path = ffmpeg_path.parent()
        .map(|p| p.join(if cfg!(target_os = "windows") { "ffprobe.exe" } else { "ffprobe" }))
        .unwrap_or_else(|| PathBuf::from("ffprobe"));

    // Check if ffprobe exists, else try system path
    let effective_ffprobe = if ffprobe_path.exists() {
        ffprobe_path
    } else {
        match which::which("ffprobe") {
             Ok(p) => p,
             Err(_) => return Err("ffprobe not found".to_string())
        }
    };

    let mut cmd = Command::new(effective_ffprobe);
    cmd.args(&[
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path
    ]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let output = cmd.output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        return Err("ffprobe execution failed".to_string());
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse ffprobe json: {}", e))?;

    // Extract info
    let duration_secs = json["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    // Find audio stream
    let streams = json["streams"].as_array().ok_or("No streams found")?;
    let audio_stream = streams.iter().find(|s| s["codec_type"] == "audio")
        .ok_or("No audio stream found")?;

    let sample_rate = audio_stream["sample_rate"]
        .as_str()
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(44100);

    let channels = audio_stream["channels"]
        .as_u64()
        .map(|c| c as u16)
        .unwrap_or(2);

    Ok(MediaMetadata {
        duration_ms: (duration_secs * 1000.0) as u64,
        sample_rate,
        channels,
    })
}


// --- Helper ---

fn get_local_ffmpeg_path() -> Option<PathBuf> {
    let suffix = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };
    
    // Try to resolve generic cache dir
    if let Some(cache_dir) = dirs::data_local_dir() {
        // Priority 1: com.music.vibe (Identifier)
        let path_id = cache_dir.join("com.music.vibe").join("binaries").join(suffix);
        if path_id.exists() {
            return Some(path_id);
        }

        // Priority 2: vibemusic (ProductName)
        let path_prod = cache_dir.join("vibemusic").join("binaries").join(suffix);
        if path_prod.exists() {
            return Some(path_prod);
        }
    }
    None
}

fn resolve_ffmpeg_path_internal() -> Option<PathBuf> {
   // 1. Check App Data (Manual/Local) first
   if let Some(path) = get_local_ffmpeg_path() {
       return Some(path);
   }

   // 2. Check System PATH
   if let Ok(path) = which::which("ffmpeg") {
       return Some(path);
   }
   
   None
}

// --- Commands ---

/// Checks if FFmpeg is available on the system or in the app data directory.
#[tauri::command]
pub fn check_ffmpeg_status<R: Runtime>(app: AppHandle<R>) -> FFmpegStatus {
    // 1. Check App Data (Prioritize Local/Manual)
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let suffix = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };
        let local_path = app_data_dir.join("binaries").join(suffix);
        if local_path.exists() {
            info!("check_ffmpeg_status found local binary: {:?}", local_path);
            let version = get_ffmpeg_version(&local_path);
            return FFmpegStatus::Ready { 
                path: local_path.to_string_lossy().to_string(),
                version
            };
        }
    }

    // Fallback: Check manual resolution helper
    if let Some(path) = get_local_ffmpeg_path() {
        info!("check_ffmpeg_status found local binary via helper: {:?}", path);
        let version = get_ffmpeg_version(&path);
        return FFmpegStatus::Ready { 
            path: path.to_string_lossy().to_string(),
            version
        };
    }

    // 2. Check System
    if let Ok(path) = which::which("ffmpeg") {
         info!("check_ffmpeg_status found system binary: {:?}", path);
         let version = get_ffmpeg_version(&path);
         return FFmpegStatus::Ready { 
            path: path.to_string_lossy().to_string(),
            version
         };
    }

    FFmpegStatus::Missing
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct FFmpegVersion {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[tauri::command]
pub fn get_supported_ffmpeg_versions() -> Vec<FFmpegVersion> {
    let mut versions = vec![
        FFmpegVersion {
            id: "latest".to_string(),
            name: "Latest Stable".to_string(),
            description: "Recommended. Best support for newer formats (M4A/AAC).".to_string(),
        }
    ];

    // Windows has access to Gyan.dev archives
    if cfg!(target_os = "windows") {
        versions.push(FFmpegVersion {
            id: "6.1.1".to_string(),
            name: "v6.1.1".to_string(),
            description: "Stable release from 2023.".to_string(),
        });
        versions.push(FFmpegVersion {
            id: "5.1.4".to_string(),
            name: "v5.1.4".to_string(),
            description: "LTS release from 2022.".to_string(),
        });
    }

    // FFbinaries (Legacy) is available everywhere
    versions.push(FFmpegVersion {
        id: "4.4.1".to_string(),
        name: "v4.4.1 (Legacy)".to_string(),
        description: "Older release. Use if you experience compatibility issues.".to_string(),
    });

    versions
}

/// Downloads and extracts FFmpeg to the app data directory.
#[tauri::command]
pub async fn download_ffmpeg<R: Runtime>(app: AppHandle<R>, version_id: Option<String>) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let binaries_dir = app_data_dir.join("binaries");

    if !binaries_dir.exists() {
        std::fs::create_dir_all(&binaries_dir).map_err(|e| e.to_string())?;
    }

    let version = version_id.as_deref().unwrap_or("latest");
    
    // URL Resolution
    let (url, zip_name) = resolve_ffmpeg_url(version)?;

    info!("Downloading FFmpeg ({}) from: {}", version, url);

    let client = reqwest::Client::new();
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    let total_size = res.content_length().unwrap_or(0);

    let zip_path = binaries_dir.join(zip_name);
    let mut file = tokio::fs::File::create(&zip_path).await.map_err(|e| e.to_string())?;

    use futures_util::StreamExt;
    let mut stream = res.bytes_stream();
    let mut downloaded: u64 = 0;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        tokio::io::AsyncWriteExt::write_all(&mut file, &chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        // Emit progress
        let _ = app.emit("download-progress", DownloadProgress { progress: downloaded, total: total_size });
    }

    info!("Download complete. Extracting...");
    
    // Extraction
    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let binary_name = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };
    let mut found = false;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let path_in_zip = file.name();
        
        let matches = if cfg!(target_os = "windows") {
             path_in_zip.ends_with("ffmpeg.exe") && !path_in_zip.contains("__MACOSX")
        } else {
             path_in_zip.ends_with("ffmpeg") && !path_in_zip.contains("__MACOSX") && !path_in_zip.ends_with(".c")
        };

        if matches {
             info!("Found binary in zip: {}", path_in_zip);
             let final_path = binaries_dir.join(binary_name);
             let mut outfile = std::fs::File::create(&final_path).map_err(|e| e.to_string())?;
             std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
             
             #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(metadata) = outfile.metadata() {
                    let mut perms = metadata.permissions();
                    perms.set_mode(0o755);
                    std::fs::set_permissions(&final_path, perms).ok();
                }
            }
            found = true;
            break;
        }
    }

    let _ = std::fs::remove_file(&zip_path);

    let final_path = binaries_dir.join(binary_name);
    
    if found && final_path.exists() {
        Ok(final_path.to_string_lossy().to_string())
    } else {
        Err("Extraction failed or ffmpeg binary not found in zip".to_string())
    }
}

fn resolve_ffmpeg_url(version: &str) -> Result<(&'static str, &'static str), String> {
    if cfg!(target_os = "windows") {
        match version {
            "latest" => Ok(("https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip", "ffmpeg.zip")),
            "6.1.1" => Ok(("https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-6.1.1-essentials_build.zip", "ffmpeg.zip")),
            "5.1.4" => Ok(("https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-5.1.4-essentials_build.zip", "ffmpeg.zip")),
            "4.4.1" => Ok(("https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip", "ffmpeg.zip")),
            _ => Err(format!("Unknown version for Windows: {}", version))
        }
    } else if cfg!(target_os = "macos") {
        match version {
            "latest" => Ok(("https://evermeet.cx/ffmpeg/ffmpeg.zip", "ffmpeg.zip")),
            "4.4.1" => Ok(("https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-osx-64.zip", "ffmpeg.zip")),
            _ => Err(format!("Unknown version for macOS: {}", version))
        }
    } else {
        // Linux
         match version {
            "4.4.1" | "latest" => Ok(("https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-linux-64.zip", "ffmpeg.zip")),
            _ => Err(format!("Unknown version for Linux: {}", version))
        }
    }
}

fn get_ffmpeg_version(path: &std::path::Path) -> String {
    let mut cmd = Command::new(path);
    cmd.arg("-version");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    if let Ok(output) = cmd.output() {
        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            // Example: "ffmpeg version 6.1.1-essentials_build-www.gyan.dev Copyright (c) 2000-2023 the FFmpeg developers"
            if let Some(line) = output_str.lines().next() {
                // Split at "Copyright" to remove the legal text
                let part = line.split("Copyright").next().unwrap_or(line);
                // remove "ffmpeg version" prefix if present for cleaner UI? 
                // User probably wants "6.1.1" or "version 6.1.1".
                // Let's keep "ffmpeg version ..." but trimmed. 
                // Actually, let's try to remove "ffmpeg version " prefix to make it short: "6.1.1-..."
                let cleaner = part.trim().trim_start_matches("ffmpeg version ").trim();
                return cleaner.to_string();
            }
        }
    }
    "Unknown Version".to_string()
}

/// Allows user to manually set FFmpeg path (validates version)
#[tauri::command]
pub fn manual_set_ffmpeg_path<R: Runtime>(app: AppHandle<R>, path: String) -> Result<String, String> {
    let mut cmd = Command::new(&path);
    cmd.arg("-version");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let output = cmd.output()
        .map_err(|_| "Failed to execute binary".to_string())?;
    
    if output.status.success() {
        // Copy to AppData binary folder so we don't depend on external paths
        let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let binaries_dir = app_data_dir.join("binaries");
         if !binaries_dir.exists() {
            let _ = std::fs::create_dir_all(&binaries_dir);
        }
        
        let binary_name = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };
        let target_path = binaries_dir.join(binary_name);

        info!("Copying manual FFmpeg from {:?} to {:?}", path, target_path);
        std::fs::copy(&path, &target_path).map_err(|e| e.to_string())?;
        
        return Ok(target_path.to_string_lossy().to_string());
    }

    Err("Invalid FFmpeg binary".to_string())
}
