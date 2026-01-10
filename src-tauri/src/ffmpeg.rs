//! FFmpeg subprocess management for audio decoding
//!
//! This module provides utilities to spawn FFmpeg as a child process
//! and read raw PCM audio data from its stdout pipe.

use std::io::{self, BufReader, Read};
use std::process::{Child, ChildStdout, Command, Stdio};

/// Metadata about an audio file, obtained via ffprobe
#[derive(Debug, Clone)]
pub struct AudioMetadata {
    pub duration_ms: u64,
    pub sample_rate: u32,
    pub channels: u16,
}

/// FFmpeg child process wrapper for audio decoding
pub struct FFmpegProcess {
    child: Child,
    stdout: BufReader<ChildStdout>,
}

impl FFmpegProcess {
    /// Get the path to the bundled FFmpeg binary
    fn ffmpeg_path() -> String {
        Self::resolve_binary_path("ffmpeg")
    }

    /// Get the path to ffprobe
    fn ffprobe_path() -> String {
        Self::resolve_binary_path("ffprobe")
    }

    /// Resolve a binary path for both development and production
    fn resolve_binary_path(name: &str) -> String {
        // For Tauri sidecar, binaries need the target triple suffix
        #[cfg(target_os = "windows")]
        let binary_name = format!("{}-x86_64-pc-windows-msvc.exe", name);
        
        #[cfg(target_os = "macos")]
        let binary_name = format!("{}-x86_64-apple-darwin", name);
        
        #[cfg(target_os = "linux")]
        let binary_name = format!("{}-x86_64-unknown-linux-gnu", name);

        if let Ok(exe_path) = std::env::current_exe() {
            // Production: binary is next to the executable
            if let Some(exe_dir) = exe_path.parent() {
                let sidecar_path = exe_dir.join(&binary_name);
                if sidecar_path.exists() {
                    return sidecar_path.to_string_lossy().to_string();
                }
            }
            
            // Development: exe is in target/debug or target/release
            // binaries are in src-tauri/binaries/
            // Walk up from exe to find src-tauri/binaries
            let mut search_dir = exe_path.parent();
            for _ in 0..5 {
                if let Some(dir) = search_dir {
                    // Check if src-tauri/binaries exists at this level
                    let binaries_path = dir.join("binaries").join(&binary_name);
                    if binaries_path.exists() {
                        return binaries_path.to_string_lossy().to_string();
                    }
                    
                    // Also check direct binaries folder (for when exe is in src-tauri)
                    let src_tauri_binaries = dir.join("src-tauri").join("binaries").join(&binary_name);
                    if src_tauri_binaries.exists() {
                        return src_tauri_binaries.to_string_lossy().to_string();
                    }
                    
                    search_dir = dir.parent();
                } else {
                    break;
                }
            }
        }

        // Fall back to system PATH
        name.to_string()
    }

    /// Spawn FFmpeg to decode audio file to raw PCM f32le
    ///
    /// # Arguments
    /// * `path` - Path to the audio file
    /// * `sample_rate` - Target sample rate (e.g., 44100)
    /// * `channels` - Target channel count (e.g., 2 for stereo)
    pub fn spawn(path: &str, sample_rate: u32, channels: u16) -> io::Result<Self> {
        Self::spawn_at(path, sample_rate, channels, None)
    }

    /// Spawn FFmpeg with optional seek position
    ///
    /// # Arguments
    /// * `path` - Path to the audio file
    /// * `sample_rate` - Target sample rate
    /// * `channels` - Target channel count
    /// * `seek_ms` - Optional seek position in milliseconds
    pub fn spawn_at(
        path: &str,
        sample_rate: u32,
        channels: u16,
        seek_ms: Option<u64>,
    ) -> io::Result<Self> {
        let ffmpeg = Self::ffmpeg_path();

        let mut cmd = Command::new(&ffmpeg);
        
        // Hide banner and reduce logging
        cmd.args(["-hide_banner", "-loglevel", "error"]);
        
        // Add seek position BEFORE input (faster seeking with -ss before -i)
        if let Some(ms) = seek_ms {
            let seconds = ms as f64 / 1000.0;
            cmd.args(["-ss", &format!("{:.3}", seconds)]);
        }
        
        // Input file
        cmd.args(["-i", path]);
        
        // Output format: raw PCM f32le (little-endian float)
        cmd.args([
            "-f", "f32le",           // Raw 32-bit float little-endian
            "-acodec", "pcm_f32le",  // PCM codec
            "-ar", &sample_rate.to_string(),
            "-ac", &channels.to_string(),
            "-",                      // Output to stdout
        ]);
        
        // Configure pipes
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::null()); // Suppress errors to avoid blocking
        
        // On Windows, hide the console window
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let mut child = cmd.spawn()?;
        
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "Failed to capture stdout"))?;

        Ok(Self {
            child,
            stdout: BufReader::with_capacity(65536, stdout), // 64KB buffer
        })
    }

    /// Read samples into buffer
    ///
    /// Returns the number of samples actually read.
    /// Returns 0 when EOF is reached (track finished).
    pub fn read_samples(&mut self, buffer: &mut [f32]) -> io::Result<usize> {
        // Each f32 sample is 4 bytes
        let byte_buffer_size = buffer.len() * 4;
        let mut byte_buffer = vec![0u8; byte_buffer_size];
        
        let bytes_read = self.stdout.read(&mut byte_buffer)?;
        
        if bytes_read == 0 {
            return Ok(0); // EOF
        }
        
        // Convert bytes to f32 samples (little-endian)
        let samples_read = bytes_read / 4;
        for i in 0..samples_read {
            let bytes = [
                byte_buffer[i * 4],
                byte_buffer[i * 4 + 1],
                byte_buffer[i * 4 + 2],
                byte_buffer[i * 4 + 3],
            ];
            buffer[i] = f32::from_le_bytes(bytes);
        }
        
        Ok(samples_read)
    }

    /// Kill the FFmpeg process
    pub fn kill(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait(); // Reap the process
    }

    /// Check if the process is still running
    pub fn _is_running(&mut self) -> bool {
        matches!(self.child.try_wait(), Ok(None))
    }
}

impl Drop for FFmpegProcess {
    fn drop(&mut self) {
        self.kill();
    }
}

/// Probe an audio file for metadata using ffprobe
///
/// Returns duration, sample rate, and channel count
pub fn probe_file(path: &str) -> io::Result<AudioMetadata> {
    let ffprobe = FFmpegProcess::ffprobe_path();

    // Build ffprobe command
    let mut cmd = Command::new(&ffprobe);
    
    cmd.args([
        "-v", "error",
        "-select_streams", "a:0",
        "-show_entries", "stream=sample_rate,channels:format=duration",
        "-of", "csv=p=0",
        path,
    ]);
    
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::null());
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let output = cmd.output()?;
    
    if !output.status.success() {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            "ffprobe failed to probe file",
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_ffprobe_output(&stdout)
}

/// Parse ffprobe CSV output
fn parse_ffprobe_output(output: &str) -> io::Result<AudioMetadata> {
    // Expected format: "sample_rate,channels\nduration"
    // Example: "44100,2\n180.5"
    let lines: Vec<&str> = output.trim().lines().collect();
    
    if lines.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "Empty ffprobe output",
        ));
    }

    // Parse stream info (first line): sample_rate,channels
    let stream_parts: Vec<&str> = lines[0].split(',').collect();
    
    let sample_rate = stream_parts
        .first()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(44100);
        
    let channels = stream_parts
        .get(1)
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(2);

    // Parse duration (second line or in same line)
    let duration_str = if lines.len() > 1 {
        lines[1]
    } else if stream_parts.len() > 2 {
        stream_parts[2]
    } else {
        "0"
    };
    
    let duration_secs: f64 = duration_str.trim().parse().unwrap_or(0.0);
    let duration_ms = (duration_secs * 1000.0) as u64;

    Ok(AudioMetadata {
        duration_ms,
        sample_rate,
        channels,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ffprobe_output() {
        let output = "44100,2\n180.5";
        let metadata = parse_ffprobe_output(output).unwrap();
        assert_eq!(metadata.sample_rate, 44100);
        assert_eq!(metadata.channels, 2);
        assert_eq!(metadata.duration_ms, 180500);
    }
}
