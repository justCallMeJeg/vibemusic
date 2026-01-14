use std::path::PathBuf;
use std::process::{Command, Stdio, Child};
use std::io::Read;
use tauri::{AppHandle, Manager, Runtime, Emitter};
use log::info;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;


#[derive(serde::Serialize, Clone, Debug)]
#[serde(tag = "status", content = "path")]
pub enum FFmpegStatus {
    Ready(String),
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
           .stderr(Stdio::null());       // Silence stderr logs

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;
        
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

fn resolve_ffmpeg_path_internal() -> Option<PathBuf> {
   // 1. Check System PATH
   if let Ok(path) = which::which("ffmpeg") {
       return Some(path);
   }

   // 2. Check App Local Data (Hard to get AppHandle here properly without passing it down? 
   // Actually, we can't easily access AppHandle in static context easily without passing it.
   // But `probe_file` and `FFmpegProcess::spawn` are called from AudioThread which doesn't strictly have AppHandle refs everywhere easily.
   // However, `AudioEngine` DOES have AppHandle.
   // BUT, `probe_file` is a function.
   // Workaround: We will use a standard location: `AppLocalData/vibemusic/binaries/ffmpeg`.
   // Rust `dirs` crate or `tauri::api::path`?
   // Since version 2, tauri path API requires instance.
   
   // FIX: We can assume standard paths or ask caller to provide it.
   // But `resolve_ffmpeg_path_internal` is called by `spawn`.
   // Let's rely on standard OS paths for AppData for now if AppHandle isn't passed.
   // Or better: `which("ffmpeg")` failing implies we MUST check the local folder.
   // Let's construct the path manually based on OS conventions if possible, or use a global initialized path?
   
   // SIMPLIFICATION:
   // We will rely on `directories` crate or just `std::env`.
   // Or better, let's look relative to the executable? No, dev mode.
   // Let's use `dirs` crate if possible (need to add it?). `directories` is standard.
   
   // Actually, I can add `directories` to Cargo.toml or use `std::env::var`.
   // "APPDATA" on windows. "HOME/.local/share" on linux.
   let suffix = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };
   
   if let Some(cache_dir) = dirs::data_local_dir() {
       // Typically C:\Users\User\AppData\Local
       // Tauri uses `Bundle Identifier` usually. "com.music.vibe" or "vibemusic"?
       // tauri.conf.json says "identifier": "com.music.vibe" but "productName": "vibemusic".
       // Default dir is usually `AppName`.
       // Let's try `vibemusic/binaries/ffmpeg` first.
       
       let path = cache_dir.join("vibemusic").join("binaries").join(suffix);
       if path.exists() {
           return Some(path);
       }
       
       // Fallback to identifier?
       let path_id = cache_dir.join("com.music.vibe").join("binaries").join(suffix);
       if path_id.exists() {
           return Some(path_id);
       }
   }
   
   None
}

// --- Commands ---

/// Checks if FFmpeg is available on the system or in the app data directory.
#[tauri::command]
pub fn check_ffmpeg_status<R: Runtime>(app: AppHandle<R>) -> FFmpegStatus {
    // 1. Check System
    if which::which("ffmpeg").is_ok() {
         return FFmpegStatus::Ready("System PATH".to_string());
    }

    // 2. Check App Data (using Tauri API which is robust)
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let suffix = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };
        let local_path = app_data_dir.join("binaries").join(suffix);
        if local_path.exists() {
            return FFmpegStatus::Ready(local_path.to_string_lossy().to_string());
        }
    }

    FFmpegStatus::Missing
}

/// Downloads and extracts FFmpeg to the app data directory.
#[tauri::command]
pub async fn download_ffmpeg<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let binaries_dir = app_data_dir.join("binaries");

    if !binaries_dir.exists() {
        std::fs::create_dir_all(&binaries_dir).map_err(|e| e.to_string())?;
    }

    // Platform detection
    let (url, zip_name) = if cfg!(target_os = "windows") {
        ("https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip", "ffmpeg.zip")
    } else if cfg!(target_os = "macos") {
        ("https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-osx-64.zip", "ffmpeg.zip")
    } else {
        // Linux logic (more complex, maybe generic linux-64)
        ("https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-linux-64.zip", "ffmpeg.zip")
    };

    info!("Downloading FFmpeg from: {}", url);

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
    
    // Extraction (Synchronous is fine for unzip)
    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
             Some(path) => binaries_dir.join(path),
             None => continue,
        };

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(&p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
        
        // Unix permissions
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(metadata) = outfile.metadata() {
                let mut perms = metadata.permissions();
                perms.set_mode(0o755);
                std::fs::set_permissions(&outpath, perms).ok();
            }
        }
    }

    // Cleanup
    let _ = std::fs::remove_file(&zip_path);

    // Return the final path
    let binary_name = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };
    let final_path = binaries_dir.join(binary_name);
    
    if final_path.exists() {
        Ok(final_path.to_string_lossy().to_string())
    } else {
        Err("Extraction failed or file not found".to_string())
    }
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

        std::fs::copy(&path, &target_path).map_err(|e| e.to_string())?;
        
        return Ok(target_path.to_string_lossy().to_string());
    }

    Err("Invalid FFmpeg binary".to_string())
}
