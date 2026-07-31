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
fn test_parse_artists_ampersand_preserves_band_names() {
    let result = metadata::parse_artists(Some("Kool & The Gang"));
    assert_eq!(result, vec!["Kool & The Gang"]);
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

#[test]
fn test_parse_artists_collaboration_splits_on_ampersand() {
    let result = metadata::parse_artists(Some("Arcane & League of Legends"));
    assert_eq!(result, vec!["Arcane", "League of Legends"]);
}

#[test]
fn test_parse_artists_comma_and_ampersand_splits() {
    let result = metadata::parse_artists(Some("BloodPop®, Arcane & League of Legends"));
    assert_eq!(result, vec!["BloodPop®", "Arcane", "League of Legends"]);
}

#[test]
fn test_parse_artists_known_band_with_ampersand_not_split() {
    let result = metadata::parse_artists(Some("Mumford & Sons"));
    assert_eq!(result, vec!["Mumford & Sons"]);
}

#[test]
fn test_parse_artists_a_b_and_c_splits() {
    let result = metadata::parse_artists(Some("A, B & C"));
    assert_eq!(result, vec!["A", "B", "C"]);
}

#[test]
fn test_parse_artists_comma_does_not_split() {
    let result = metadata::parse_artists(Some("Tyler, The Creator"));
    assert_eq!(result, vec!["Tyler, The Creator"]);
}

#[test]
fn test_parse_artists_slash_splits() {
    let result = metadata::parse_artists(Some("A / B"));
    assert_eq!(result, vec!["A", "B"]);
}

#[test]
fn test_parse_artists_earth_wind_and_fire_is_single_artist() {
    let result = metadata::parse_artists(Some("Earth, Wind & Fire"));
    assert_eq!(result, vec!["Earth, Wind & Fire"]);
}

#[test]
fn test_extract_features_from_title_with_trailing_bracket() {
    let (title, features) =
        metadata::extract_features_from_title("Song (feat. Artist) [Remix]");
    assert_eq!(title, "Song [Remix]");
    assert_eq!(features, vec!["Artist"]);
}

#[test]
fn test_extract_features_from_title_with_trailing_paren() {
    let (title, features) =
        metadata::extract_features_from_title("Song (ft. X) (Radio Edit)");
    assert_eq!(title, "Song (Radio Edit)");
    assert_eq!(features, vec!["X"]);
}

#[test]
fn test_parse_artists_unicode_handling() {
    let result = metadata::parse_artists(Some("Café & Résumé"));
    assert_eq!(result, vec!["Café", "Résumé"]);
}

#[test]
fn test_parse_artists_whitespace_only_returns_empty() {
    let result = metadata::parse_artists(Some("   "));
    assert!(result.is_empty());
}

#[test]
fn test_parse_artists_with_featuring_is_split() {
    let result = metadata::parse_artists(Some("Artist A featuring Artist B"));
    assert_eq!(result, vec!["Artist A", "Artist B"]);
}

#[test]
fn test_parse_artists_with_vs_split() {
    let result = metadata::parse_artists(Some("Artist A vs. Artist B"));
    assert_eq!(result, vec!["Artist A", "Artist B"]);
}

#[test]
fn test_parse_artists_repeated_entires_deduplicated() {
    let result = metadata::parse_artists(Some("A / A; B; B"));
    assert_eq!(result, vec!["A", "B"]);
}

#[test]
fn test_parse_artists_pipe_is_not_split() {
    let result = metadata::parse_artists(Some("AC/DC"));
    assert_eq!(result, vec!["AC/DC"]);
}

#[test]
fn test_parse_artists_kda_not_split() {
    let result = metadata::parse_artists(Some("K/DA"));
    assert_eq!(result, vec!["K/DA"]);
}

#[test]
fn test_parse_artists_florence_plus_machine_not_split() {
    let result = metadata::parse_artists(Some("Florence + The Machine"));
    assert_eq!(result, vec!["Florence + The Machine"]);
}

#[test]
fn test_extract_features_from_title_brackets_with_feat() {
    let (title, features) =
        metadata::extract_features_from_title("Song [feat. Artist]");
    assert_eq!(title, "Song");
    assert_eq!(features, vec!["Artist"]);
}

#[test]
fn test_extract_features_from_title_with_featuring() {
    let (title, features) =
        metadata::extract_features_from_title("Song (featuring Artist)");
    assert_eq!(title, "Song");
    assert_eq!(features, vec!["Artist"]);
}

#[test]
fn test_extract_features_from_title_with_vs() {
    let (title, features) =
        metadata::extract_features_from_title("Battle (vs. Opponent)");
    assert_eq!(title, "Battle");
    assert_eq!(features, vec!["Opponent"]);
}

#[test]
fn test_extract_features_from_title_multiple_feat_uses_last() {
    let (title, features) =
        metadata::extract_features_from_title("Song (feat. X) (feat. Y)");
    assert_eq!(title, "Song (feat. X)");
    assert_eq!(features, vec!["Y"]);
}

#[test]
fn test_extract_features_from_title_nested_brackets() {
    let (title, features) =
        metadata::extract_features_from_title("Song (feat. Artist [Remix])");
    assert_eq!(title, "Song)");
    assert_eq!(features, vec!["Artist [Remix"]);
}

#[test]
fn test_is_audio_file_m4a() {
    assert!(discovery::is_audio_file(Path::new("song.m4a")));
}

#[test]
fn test_is_audio_file_aac() {
    assert!(discovery::is_audio_file(Path::new("song.aac")));
}

#[test]
fn test_is_audio_file_aiff() {
    assert!(discovery::is_audio_file(Path::new("song.aiff")));
}

#[test]
fn test_is_audio_file_empty_extension() {
    assert!(!discovery::is_audio_file(Path::new("song.")));
}

#[test]
fn test_is_audio_file_hidden_mp3() {
    assert!(discovery::is_audio_file(Path::new(".song.mp3")));
}

#[test]
fn test_scan_folder_nonexistent_directory() {
    let result = discovery::scan_folder("C:\\nonexistent_vibemusic_test_dir".into());
    assert!(result.is_err());
}

#[test]
fn test_scan_folder_file_path_not_directory() {
    let temp = std::env::temp_dir();
    let test_file = temp.join("vibemusic_scan_test_file.tmp");
    let _ = std::fs::write(&test_file, b"test");
    let result = discovery::scan_folder(test_file.to_string_lossy().to_string());
    assert!(result.is_err());
    let _ = std::fs::remove_file(&test_file);
}

#[test]
fn test_scan_folder_empty_directory() {
    let dir = std::env::temp_dir().join("vibemusic_scan_empty");
    let _ = std::fs::create_dir_all(&dir);
    let result = discovery::scan_folder(dir.to_string_lossy().to_string());
    assert!(result.is_ok());
    assert!(result.unwrap().is_empty());
    let _ = std::fs::remove_dir(&dir);
}

#[test]
fn test_scan_folder_with_audio_file() {
    let dir = std::env::temp_dir().join("vibemusic_scan_with_file");
    let _ = std::fs::create_dir_all(&dir);
    let test_file = dir.join("test_song.mp3");
    let _ = std::fs::write(&test_file, b"fake audio content");
    let result = discovery::scan_folder(dir.to_string_lossy().to_string());
    assert!(result.is_ok());
    let files = result.unwrap();
    assert_eq!(files.len(), 1);
    assert!(files[0].ends_with("test_song.mp3"));
    let _ = std::fs::remove_file(&test_file);
    let _ = std::fs::remove_dir(&dir);
}

#[test]
fn test_scan_folder_skips_non_audio_files() {
    let dir = std::env::temp_dir().join("vibemusic_scan_skip_non_audio");
    let _ = std::fs::create_dir_all(&dir);
    let _ = std::fs::write(dir.join("readme.txt"), b"hello");
    let _ = std::fs::write(dir.join("song.mp3"), b"fake audio");
    let result = discovery::scan_folder(dir.to_string_lossy().to_string());
    assert!(result.is_ok());
    let files = result.unwrap();
    assert_eq!(files.len(), 1);
    assert!(files[0].ends_with("song.mp3"));
    let _ = std::fs::remove_file(dir.join("readme.txt"));
    let _ = std::fs::remove_file(dir.join("song.mp3"));
    let _ = std::fs::remove_dir(&dir);
}
