use log::warn;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::{Accessor, ItemKey};
use regex::Regex;
use std::path::Path;
use serde::Deserialize;
use std::fs;
use std::sync::OnceLock;

#[derive(serde::Serialize, Clone, Debug)]
pub struct LyricLine {
    pub text: String,
    pub timestamp_ms: Option<u64>,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct LyricsData {
    pub lines: Vec<LyricLine>,
    pub is_synced: bool,
    pub source: String,
}

#[derive(Deserialize)]
struct LrcLibResponse {
    #[serde(rename = "plainLyrics")]
    plain_lyrics: Option<String>,
    #[serde(rename = "syncedLyrics")]
    synced_lyrics: Option<String>,
}

#[tauri::command]
pub async fn get_lyrics(path: String) -> Result<LyricsData, String> {
    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err("File not found".to_string());
    }

    // 1. Local Synced: Check for external .lrc file in the same directory
    let lrc_path = path_obj.with_extension("lrc");
    if lrc_path.exists() {
        if let Ok(content) = fs::read_to_string(&lrc_path) {
             let parsed = parse_lrc(&content);
             if !parsed.is_empty() {
                 return Ok(LyricsData {
                     lines: parsed,
                     is_synced: true,
                     source: "Local LRC File".to_string(),
                 });
             }
        }
    }

    // Prepare metadata for remote search or embedded check
    let tagged_file_res = Probe::open(path_obj)
        .map_err(|e| format!("Failed to open file: {}", e))?
        .read();

    let mut title = None;
    let mut artist = None;
    let mut album = None;
    let mut duration = 0;

    // We can extract metadata if valid, but we won't fail yet if file is unreadable (unlikely if exists)
    if let Ok(ref tagged_file) = tagged_file_res {
        duration = tagged_file.properties().duration().as_secs();
        if let Some(tag) = tagged_file.primary_tag().or_else(|| tagged_file.first_tag()) {
            title = tag.title().map(|s| s.to_string());
            artist = tag.artist().map(|s| s.to_string());
            album = tag.album().map(|s| s.to_string());
        }
    }

    // 2. Local Unsynced: Embedded Tags (USLT)
    // Check before network call to avoid round-trip for embedded-lyrics tracks.
    if let Ok(tagged_file) = tagged_file_res {
        let tag_opt = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());
        if let Some(tag) = tag_opt {
             if let Some(lyrics_str) = tag.get_string(&ItemKey::Lyrics) {
                 let lines = lyrics_str.lines()
                    .map(|line| LyricLine {
                        text: line.to_string(),
                        timestamp_ms: None 
                    })
                    .collect();
                 
                 let lrc_path_bg = lrc_path.clone();
                 let title_bg = title.clone();
                 let artist_bg = artist.clone();
                 let album_bg = album.clone();
                 tauri::async_runtime::spawn(async move {
                     if let (Some(t), Some(a), Some(al)) = (&title_bg, &artist_bg, &album_bg) {
                         if let Ok(response) = fetch_from_lrclib(t, a, al, duration).await {
                             if let Some(synced) = response.synced_lyrics {
                                 if let Err(e) = fs::write(&lrc_path_bg, &synced) {
                                     warn!("bg lrc fetch: failed to save: {}", e);
                                 }
                             }
                         }
                     }
                 });
                 
                 return Ok(LyricsData {
                     lines,
                     is_synced: false,
                     source: "Embedded (USLT)".to_string(),
                 });
            }
        }
    }

    // 3. Remote Synced: Query LRCLIB
    // Only reach here if no local .lrc or embedded lyrics found.
    let mut remote_plain_lyrics = None;

    if let (Some(t), Some(a), Some(al)) = (&title, &artist, &album) {
         if let Ok(response) = fetch_from_lrclib(t, a, al, duration).await {
             // If we have synced lyrics, Save and Return!
             if let Some(synced) = response.synced_lyrics {
                 // Save to .lrc file for future instant access
                if let Err(e) = fs::write(&lrc_path, &synced) {
                    warn!("Failed to save lrc file: {}", e);
                }
                 
                 return Ok(LyricsData {
                     lines: parse_lrc(&synced),
                     is_synced: true,
                     source: "LRCLIB (Synced)".to_string(),
                 });
             }
             // Store plain lyrics for fallback
             remote_plain_lyrics = response.plain_lyrics;
         }
    }

    // 4. Remote Unsynced: Use the plain lyrics we might have fetched earlier
    if let Some(plain) = remote_plain_lyrics {
        let lines = plain.lines()
            .map(|line| LyricLine {
                text: line.to_string(),
                timestamp_ms: None
            })
            .collect();
        return Ok(LyricsData {
            lines,
            is_synced: false,
            source: "LRCLIB (Plain)".to_string(),
        });
    }

    Err("No lyrics found".to_string())
}

async fn fetch_from_lrclib(title: &str, artist: &str, album: &str, duration: u64) -> Result<LrcLibResponse, String> {
    let client = reqwest::Client::builder()
        .user_agent(format!("vibemusic/{} (https://github.com/justCallMeJeg/vibemusic)", env!("CARGO_PKG_VERSION")))
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = "https://lrclib.net/api/get";

    let res = client.get(url)
        .query(&[
            ("track_name", title),
            ("artist_name", artist),
            ("album_name", album),
            ("duration", &duration.to_string())
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().as_u16() == 404 {
        return Err("No lyrics found".to_string());
    }
    if !res.status().is_success() {
        return Err(format!("API Error: {}", res.status()));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    let response: LrcLibResponse = serde_json::from_str(&body).map_err(|e| e.to_string())?;

    Ok(response)
}

fn parse_lrc(content: &str) -> Vec<LyricLine> {
    static LRC_REGEX: OnceLock<Regex> = OnceLock::new();
    let re = LRC_REGEX.get_or_init(|| {
        Regex::new(r"^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$").expect("invalid LRC regex")
    });
    let mut lines = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        if let Some(caps) = re.captures(line) {
            let min: u64 = caps[1].parse().unwrap_or(0);
            let sec: u64 = caps[2].parse().unwrap_or(0);
            let ms_part: u64 = caps[3].parse().unwrap_or(0);
            
            // Handle 2 or 3 digit ms
            let ms = if caps[3].len() == 2 { ms_part * 10 } else { ms_part };

            let total_ms = (min * 60 * 1000) + (sec * 1000) + ms;
            let text = caps[4].trim().to_string();

            lines.push(LyricLine {
                text,
                timestamp_ms: Some(total_ms)
            });
        } 
        // Ignore headers like [ti:Title] for now
    }
    
    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_lrc_empty() {
        let result = parse_lrc("");
        assert!(result.is_empty());
    }

    #[test]
    fn test_parse_lrc_single_line() {
        let result = parse_lrc("[01:23.45]Hello world");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].text, "Hello world");
        assert_eq!(result[0].timestamp_ms, Some(83450));
    }

    #[test]
    fn test_parse_lrc_two_digit_ms() {
        let result = parse_lrc("[00:05.67]Test");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].timestamp_ms, Some(5670));
    }

    #[test]
    fn test_parse_lrc_three_digit_ms() {
        let result = parse_lrc("[00:05.678]Test");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].timestamp_ms, Some(5678));
    }

    #[test]
    fn test_parse_lrc_multiple_lines() {
        let content = "[00:01.00]Line 1\n[00:02.00]Line 2\n[00:03.50]Line 3";
        let result = parse_lrc(content);
        assert_eq!(result.len(), 3);
        assert_eq!(result[0].text, "Line 1");
        assert_eq!(result[1].text, "Line 2");
        assert_eq!(result[2].text, "Line 3");
    }

    #[test]
    fn test_parse_lrc_minutes_and_seconds() {
        let result = parse_lrc("[02:15.30]Long song");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].timestamp_ms, Some(135300));
    }

    #[test]
    fn test_parse_lrc_ignores_header_lines() {
        let content = "[ti:Title]\n[ar:Artist]\n[00:01.00]Actual lyric";
        let result = parse_lrc(content);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].text, "Actual lyric");
    }

    #[test]
    fn test_parse_lrc_ignores_non_lrc_lines() {
        let content = "This is not an LRC line\n[00:01.00]Lyric";
        let result = parse_lrc(content);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].text, "Lyric");
    }

    #[test]
    fn test_parse_lrc_trims_whitespace_from_text() {
        let result = parse_lrc("[00:01.00]  Hello  ");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].text, "Hello");
    }
}
