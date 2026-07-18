use super::*;
use crate::shared::types::TrackMetadata;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};

static TEST_COUNTER: AtomicU32 = AtomicU32::new(0);

fn create_test_db() -> (DbHelper, PathBuf) {
    let pid = std::process::id();
    let seq = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
    let dir = std::env::temp_dir().join(format!("vibemusic_test_{}_{}", pid, seq));
    let _ = std::fs::create_dir_all(&dir);
    let db_path = dir.join("test.db");
    let db = DbHelper::new(&db_path).expect("Failed to create test DB");
    (db, db_path)
}

fn create_test_tx(db: &mut DbHelper) -> rusqlite::Transaction<'_> {
    db.get_conn_mut()
        .transaction()
        .expect("Failed to start transaction")
}

fn cleanup(db_path: &Path) {
    let _ = std::fs::remove_file(db_path);
    if let Some(parent) = db_path.parent() {
        let _ = std::fs::remove_dir(parent);
    }
}

fn make_track(path: &str, title: &str, artist: &str) -> TrackMetadata {
    TrackMetadata {
        file_path: path.to_string(),
        file_name: path.rsplit('/').next().unwrap_or(path).to_string(),
        file_size: 1000,
        file_format: "mp3".to_string(),
        title: Some(title.to_string()),
        artist: Some(artist.to_string()),
        artists: vec![artist.to_string()],
        featured_artist_names: vec![],
        album: Some("Test Album".to_string()),
        album_artist: None,
        track_number: Some(1),
        disc_number: Some(1),
        year: Some(2024),
        genre: Some("Test".to_string()),
        duration_ms: 200000,
        sample_rate: Some(44100),
        bit_rate: Some(320),
        channels: Some(2),
        artwork_path: None,
        modification_time: 1704067200,
    }
}

#[test]
fn test_db_create_and_get_track() {
    let (db, db_path) = create_test_db();
    let mut db = db;
    let tx = create_test_tx(&mut db);

    let artist_id = DbHelper::get_or_create_artist(&tx, "Test Artist").unwrap();
    assert!(artist_id > 0);

    let album_id =
        DbHelper::get_or_create_album(&tx, "Test Album", Some(artist_id), Some(2024), None)
            .unwrap();
    assert!(album_id > 0);

    tx.commit().unwrap();
    cleanup(&db_path);
}

#[test]
fn test_db_upsert_and_get_tracks() {
    let (db, db_path) = create_test_db();
    let mut db = db;
    let track = make_track("/music/song.mp3", "Test Song", "Test Artist");

    let tx = create_test_tx(&mut db);
    DbHelper::upsert_track(&tx, &track).unwrap();
    tx.commit().unwrap();

    let tracks = db.get_all_track_paths().unwrap();
    assert!(!tracks.is_empty());
    assert!(tracks.iter().any(|(_, p)| p == "/music/song.mp3"));

    cleanup(&db_path);
}

#[test]
fn test_db_upsert_duplicate_is_idempotent() {
    let (db, db_path) = create_test_db();
    let mut db = db;
    let track = make_track("/music/song2.mp3", "Another Song", "Another Artist");

    let tx = create_test_tx(&mut db);
    DbHelper::upsert_track(&tx, &track).unwrap();
    tx.commit().unwrap();

    let tx = create_test_tx(&mut db);
    DbHelper::upsert_track(&tx, &track).unwrap();
    tx.commit().unwrap();

    let tracks = db.get_all_track_paths().unwrap();
    let count = tracks
        .iter()
        .filter(|(_, p)| p == "/music/song2.mp3")
        .count();
    assert_eq!(count, 1);

    cleanup(&db_path);
}

#[test]
fn test_db_get_all_tracks_returns_empty_when_no_tracks() {
    let (db, db_path) = create_test_db();
    let tracks = db.get_all_tracks().unwrap();
    assert!(tracks.is_empty());
    cleanup(&db_path);
}

#[test]
fn test_db_get_all_albums_returns_empty_when_no_albums() {
    let (db, db_path) = create_test_db();
    let albums = db.get_all_albums().unwrap();
    assert!(albums.is_empty());
    cleanup(&db_path);
}

#[test]
fn test_db_get_existing_metadata() {
    let (db, db_path) = create_test_db();
    let mut db = db;
    let track = make_track("/music/metadata_test.mp3", "Metadata Test", "M Artist");

    let tx = create_test_tx(&mut db);
    DbHelper::upsert_track(&tx, &track).unwrap();
    tx.commit().unwrap();

    let existing = db.get_existing_metadata().unwrap();
    assert!(!existing.is_empty());
    assert!(existing
        .iter()
        .any(|(p, _, _)| p == "/music/metadata_test.mp3"));

    cleanup(&db_path);
}

#[test]
fn test_db_delete_track() {
    let (db, db_path) = create_test_db();
    let mut db = db;
    let track = make_track("/music/to_delete.mp3", "Delete Me", "D Artist");

    let tx = create_test_tx(&mut db);
    DbHelper::upsert_track(&tx, &track).unwrap();
    tx.commit().unwrap();

    let all_tracks = db.get_all_track_paths().unwrap();
    let (id, _) = all_tracks
        .iter()
        .find(|(_, p)| p == "/music/to_delete.mp3")
        .unwrap();
    let id = *id;

    let tx = create_test_tx(&mut db);
    DbHelper::delete_tracks(&tx, &[id]).unwrap();
    tx.commit().unwrap();

    let remaining = db.get_all_track_paths().unwrap();
    assert!(!remaining.iter().any(|(i, _)| *i == id));

    cleanup(&db_path);
}

#[test]
fn test_db_record_playback() {
    let (db, db_path) = create_test_db();
    let mut db = db;
    let track = make_track("/music/playback_test.mp3", "Playback Test", "P Artist");

    let tx = create_test_tx(&mut db);
    DbHelper::upsert_track(&tx, &track).unwrap();
    tx.commit().unwrap();

    let all_tracks = db.get_all_track_paths().unwrap();
    let (id, _) = all_tracks
        .iter()
        .find(|(_, p)| p == "/music/playback_test.mp3")
        .unwrap();
    let id = *id;

    db.record_playback(id, 120000).unwrap();

    let history = db.get_playback_history(0).unwrap();
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].0, id);
    assert_eq!(history[0].2, 120000);

    cleanup(&db_path);
}
