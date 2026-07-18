use super::*;
use std::path::Path;

#[test]
fn test_is_audio_file_mp3() {
    assert!(discovery::is_audio_file(Path::new("song.mp3")));
}

#[test]
fn test_is_audio_file_flac() {
    assert!(discovery::is_audio_file(Path::new("song.flac")));
}

#[test]
fn test_is_audio_file_wav() {
    assert!(discovery::is_audio_file(Path::new("song.wav")));
}

#[test]
fn test_is_audio_file_ogg() {
    assert!(discovery::is_audio_file(Path::new("song.ogg")));
}

#[test]
fn test_is_audio_file_case_insensitive() {
    assert!(discovery::is_audio_file(Path::new("song.MP3")));
    assert!(discovery::is_audio_file(Path::new("song.Flac")));
}

#[test]
fn test_is_audio_file_txt_is_not_audio() {
    assert!(!discovery::is_audio_file(Path::new("readme.txt")));
}

#[test]
fn test_is_audio_file_no_extension() {
    assert!(!discovery::is_audio_file(Path::new("song")));
}

#[test]
fn test_parse_artists_none() {
    let result = metadata::parse_artists(None);
    assert!(result.is_empty());
}

#[test]
fn test_parse_artists_single() {
    let result = metadata::parse_artists(Some("John Doe"));
    assert_eq!(result, vec!["John Doe"]);
}

#[test]
fn test_parse_artists_semicolon() {
    let result = metadata::parse_artists(Some("A; B"));
    assert_eq!(result, vec!["A", "B"]);
}

#[test]
fn test_parse_artists_feat() {
    let result = metadata::parse_artists(Some("A feat. B"));
    assert_eq!(result, vec!["A", "B"]);
}

#[test]
fn test_parse_artists_ft() {
    let result = metadata::parse_artists(Some("A ft. B"));
    assert_eq!(result, vec!["A", "B"]);
}

#[test]
fn test_parse_artists_ampersand_splits() {
    let result = metadata::parse_artists(Some("Kool & The Gang"));
    assert_eq!(result, vec!["Kool", "The Gang"]);
}

#[test]
fn test_parse_artists_dedup() {
    let result = metadata::parse_artists(Some("A; A; B"));
    assert_eq!(result, vec!["A", "B"]);
}

#[test]
fn test_extract_features_from_title_no_feat() {
    let (title, features) = metadata::extract_features_from_title("Song Name");
    assert_eq!(title, "Song Name");
    assert!(features.is_empty());
}

#[test]
fn test_extract_features_from_title_with_feat() {
    let (title, features) = metadata::extract_features_from_title("Song (feat. Artist)");
    assert_eq!(title, "Song");
    assert_eq!(features, vec!["Artist"]);
}

#[test]
fn test_extract_features_from_title_with_ft_bracket() {
    let (title, features) = metadata::extract_features_from_title("Song [ft. Artist]");
    assert_eq!(title, "Song");
    assert_eq!(features, vec!["Artist"]);
}

#[test]
fn test_extract_features_from_title_multiple_features() {
    let (title, features) = metadata::extract_features_from_title("Song (feat. A & B)");
    assert_eq!(title, "Song");
    assert_eq!(features, vec!["A", "B"]);
}
