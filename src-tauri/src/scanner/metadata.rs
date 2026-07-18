use crate::artwork::extract_and_cache_cover;
use crate::shared::types::TrackMetadata;
use lofty::config::{ParseOptions, ParsingMode};
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::Accessor;
use log::{error, info, warn};
use regex::Regex;
use std::path::Path;
use std::sync::OnceLock;

/// Parse an artist string into individual artists
pub fn parse_artists(artist_str: Option<&str>) -> Vec<String> {
    match artist_str {
        None => Vec::new(),
        Some(s) => {
            static SAFE_SPLIT_RE: OnceLock<Regex> = OnceLock::new();
            let safe_re = SAFE_SPLIT_RE.get_or_init(|| {
                Regex::new(r"(?i)\s*(?:;|,\s+|\s+&\s+|[\(\[]\s*(?:feat\.?|ft\.?|featuring|with|vs\.?)\s+|(?:\s+)(?:feat\.?|ft\.?|featuring|with|vs\.?)(?:\s+))\s*").expect("invalid artist-split regex")
            });

            let mut artists = Vec::new();

            for part in safe_re.split(s) {
                let trimmed = part
                    .trim_matches(|c| c == '(' || c == ')' || c == '[' || c == ']' || c == ' ')
                    .trim();
                if !trimmed.is_empty() {
                    artists.push(trimmed.to_string());
                }
            }
            artists
        }
    }
}

/// Extract featured artists from a track title
pub fn extract_features_from_title(title: &str) -> (String, Vec<String>) {
    static FEAT_RE: OnceLock<Regex> = OnceLock::new();
    let feat_re = FEAT_RE.get_or_init(|| {
        Regex::new(r"(?i)\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|with|vs\.?)\s+(.+?)\s*[\)\]]\s*$")
            .expect("invalid feature extraction regex")
    });

    if let Some(caps) = feat_re.captures(title) {
        let clean_title = feat_re.replace(title, "").to_string();
        let feat_text = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let features = parse_artists(Some(feat_text));
        (clean_title, features)
    } else {
        (title.to_string(), Vec::new())
    }
}

/// Extract metadata from an audio file
pub fn extract_metadata(path: &Path, cache_dir: &Path) -> Result<TrackMetadata, String> {
    let file_path = path.to_string_lossy().to_string();

    let metadata =
        std::fs::metadata(path).map_err(|e| format!("Failed to read file metadata: {}", e))?;

    let mtime = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let file_format = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_uppercase();

    let probe = Probe::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let parse_options = ParseOptions::new().parsing_mode(ParsingMode::Relaxed);
    let tagged_file_result = probe.options(parse_options).read();

    let (duration_ms, sample_rate, bit_rate, channels, tag_info) = match tagged_file_result {
        Ok(tagged_file) => {
            let properties = tagged_file.properties();
            let duration = properties.duration().as_millis() as u64;
            let sr = properties.sample_rate();
            let br = properties.audio_bitrate();
            let ch = properties.channels();

            if duration == 0 {
                warn!(
                    "Zero duration for: {} (format: {})",
                    path.display(),
                    file_format
                );
            }

            let tag = tagged_file
                .primary_tag()
                .or_else(|| tagged_file.first_tag());

            if tag.is_none() {
                warn!("No tags found in: {}", path.display());
            }

            let tag_data = if let Some(tag) = tag {
                let raw_title_opt = tag.title().map(|s| s.to_string());
                let (final_title, featured_artists) = match raw_title_opt {
                    Some(ref t) => {
                        let (c, f) = extract_features_from_title(t);
                        (Some(c), f)
                    }
                    None => (None, Vec::new()),
                };

                let artist_str = tag.artist().map(|s| s.to_string());

                if artist_str.is_none() {
                    warn!(
                        "No artist found in: {} (tag type: {:?})",
                        path.display(),
                        tag.tag_type()
                    );
                }

                let mut artists = parse_artists(artist_str.as_deref());
                artists.extend(featured_artists);

                let mut seen = std::collections::HashSet::new();
                artists.retain(|x| seen.insert(x.clone()));

                let artwork_path = tag
                    .pictures()
                    .iter()
                    .find(|p| p.pic_type() == lofty::picture::PictureType::CoverFront)
                    .or_else(|| tag.pictures().first())
                    .and_then(|pic| extract_and_cache_cover(pic, cache_dir));

                if artwork_path.is_none() && !tag.pictures().is_empty() {
                    warn!(
                        "Found {} pictures but failed to extract for: {}",
                        tag.pictures().len(),
                        path.display()
                    );
                }

                (
                    final_title,
                    artist_str,
                    artists,
                    tag.album().map(|s| s.to_string()),
                    tag.get_string(&lofty::tag::ItemKey::AlbumArtist)
                        .map(|s| s.to_string()),
                    tag.track(),
                    tag.disk(),
                    tag.year(),
                    tag.genre().map(|s| s.to_string()),
                    artwork_path,
                )
            } else {
                (
                    None,
                    None,
                    Vec::new(),
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                )
            };

            (duration, sr, br, ch, tag_data)
        }
        Err(e) => {
            warn!(
                "Strict parse failed for {}: {}. Retrying without tags...",
                path.display(),
                e
            );

            let retry_probe = match Probe::open(path) {
                Ok(p) => p,
                Err(e2) => {
                    error!("Failed to re-open file {}: {}", path.display(), e2);
                    return Err(format!("Failed to re-open file: {}", e2));
                }
            };

            let retry_options = ParseOptions::new()
                .parsing_mode(ParsingMode::Relaxed)
                .read_tags(false);

            match retry_probe.options(retry_options).read() {
                Ok(tagged_file) => {
                    info!("Successfully read properties for {}", path.display());
                    let properties = tagged_file.properties();
                    let duration = properties.duration().as_millis() as u64;
                    let sr = properties.sample_rate();
                    let br = properties.audio_bitrate();
                    let ch = properties.channels();

                    (
                        duration,
                        sr,
                        br,
                        ch,
                        (
                            None,
                            None,
                            Vec::new(),
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                        ),
                    )
                }
                Err(e2) => {
                    error!(
                        "Failed to parse file {} even without tags: {}",
                        path.display(),
                        e2
                    );
                    (
                        0,
                        None,
                        None,
                        None,
                        (
                            None,
                            None,
                            Vec::new(),
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                            None,
                        ),
                    )
                }
            }
        }
    };

    let (
        title,
        artist,
        artists,
        album,
        album_artist,
        track_number,
        disc_number,
        year,
        genre,
        artwork_path,
    ) = tag_info;

    let final_title: Option<String> = title.or_else(|| {
        path.file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
    });

    Ok(TrackMetadata {
        file_path,
        file_name,
        file_size: metadata.len(),
        file_format,
        title: final_title,
        artist,
        artists,
        album,
        album_artist,
        track_number,
        disc_number,
        year,
        genre,
        duration_ms,
        sample_rate,
        bit_rate,
        channels,
        artwork_path,
        modification_time: mtime,
    })
}
