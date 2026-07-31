use crate::artwork::extract_and_cache_cover;
use crate::shared::types::TrackMetadata;
use lofty::config::{ParseOptions, ParsingMode};
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::Accessor;
use log::{error, info, warn};
use regex::Regex;
use std::collections::HashSet;
use std::path::Path;
use std::sync::OnceLock;

/// Band names containing `,` or `&` that should NOT be split into separate artists.
static KNOWN_BAND_NAMES: OnceLock<HashSet<&'static str>> = OnceLock::new();

fn is_known_band(name: &str) -> bool {
    let bands = KNOWN_BAND_NAMES.get_or_init(|| {
        HashSet::from([
            "earth, wind & fire",
            "kool & the gang",
            "simon & garfunkel",
            "hall & oates",
            "tyler, the creator",
            "crosby, stills, nash & young",
            "crosby, stills & nash",
            "emerson, lake & palmer",
            "peter, paul & mary",
            "ike & tina turner",
            "sam & dave",
            "loggins & messina",
            "captain & tennille",
            "chad & jeremy",
            "jan & dean",
            "martha & the vandellas",
            "gladys knight & the pips",
            "smokey robinson & the miracles",
            "diana ross & the supremes",
            "booker t. & the m.g.'s",
            "huey lewis & the news",
            "peaches & herb",
            "mel & kim",
            "johnny & the hurricanes",
            "tommy james & the shondells",
            "roland kirk & his orchestra",
            "mumford & sons",
            "florence + the machine",
            "peter, bjorn and john",
            "bob & earl",
            "the captain & tennille",
            "bill medley & jennifer warnes",
            "paul mccartney & wings",
            "frankie valli & the four seasons",
            "ac/dc",
            "k/da",
        ])
    });
    bands.contains(&name.to_lowercase().as_str())
}

/// Parse an artist string into individual artists.
///
/// Splits on `;`, `/`, and feature/versus delimiters. Also splits on `,` and `&`
/// unless the full string matches a known band name (e.g. "Earth, Wind & Fire").
pub fn parse_artists(artist_str: Option<&str>) -> Vec<String> {
    match artist_str {
        None => Vec::new(),
        Some(s) => {
            static PRIMARY_SPLIT_RE: OnceLock<Regex> = OnceLock::new();
            static SECONDARY_SPLIT_RE: OnceLock<Regex> = OnceLock::new();

            let primary_re = PRIMARY_SPLIT_RE.get_or_init(|| {
                Regex::new(r"(?i)\s*(?:;|\s+/\s*|\s*/\s+|[\(\[]\s*(?:feat\.?|ft\.?|featuring|with|vs\.?)\s+|(?:\s+)(?:feat\.?|ft\.?|featuring|with|vs\.?)(?:\s+))\s*").expect("invalid primary artist-split regex")
            });

            let secondary_re = SECONDARY_SPLIT_RE.get_or_init(|| {
                Regex::new(r"\s*(?:,\s+|\s+&\s+)\s*").expect("invalid secondary artist-split regex")
            });

            let mut artists = Vec::new();
            let mut seen = HashSet::new();

            for part in primary_re.split(s) {
                let trimmed = part
                    .trim_matches(|c| c == '(' || c == ')' || c == '[' || c == ']' || c == ' ')
                    .trim();
                if trimmed.is_empty() {
                    continue;
                }

                if trimmed.contains(',') || trimmed.contains('&') {
                    if is_known_band(trimmed) {
                        if seen.insert(trimmed.to_lowercase()) {
                            artists.push(trimmed.to_string());
                        }
                    } else {
                        for sub in secondary_re.split(trimmed) {
                            let sub_trimmed = sub.trim();
                            if !sub_trimmed.is_empty() && seen.insert(sub_trimmed.to_lowercase()) {
                                artists.push(sub_trimmed.to_string());
                            }
                        }
                    }
                } else if seen.insert(trimmed.to_lowercase()) {
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
        Regex::new(
            r"(?i)(?:\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|with|vs\.?)\s+)(.+?)\s*[\)\]]",
        )
        .expect("invalid feature extraction regex")
    });

    if let Some(caps) = feat_re.captures_iter(title).last() {
        let full_match = caps.get(0).unwrap();
        let feat_text = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let features = parse_artists(Some(feat_text));

        let clean_title = format!(
            "{}{}",
            &title[..full_match.start()],
            &title[full_match.end()..]
        );
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
                let album_artist_str = tag
                    .get_string(&lofty::tag::ItemKey::AlbumArtist)
                    .map(|s| s.to_string());

                if artist_str.is_none() {
                    warn!(
                        "No artist found in: {} (tag type: {:?})",
                        path.display(),
                        tag.tag_type()
                    );
                }

                let mut main_artists = parse_artists(artist_str.as_deref());
                if main_artists.is_empty() {
                    if let Some(ref aas) = album_artist_str {
                        main_artists = parse_artists(Some(aas));
                    }
                }
                let main_set: std::collections::HashSet<&str> =
                    main_artists.iter().map(|s| s.as_str()).collect();
                let deduped_features: Vec<String> = featured_artists
                    .into_iter()
                    .filter(|f| !main_set.contains(f.as_str()))
                    .collect();

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
                    main_artists,
                    deduped_features,
                    tag.album().map(|s| s.to_string()),
                    album_artist_str,
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
        featured_artist_names,
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
        featured_artist_names,
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
