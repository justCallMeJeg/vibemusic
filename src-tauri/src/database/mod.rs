//! Database feature — SQLite-backed persistence for all domain entities.
//!
//! Provides [`DbHelper`] and its supporting methods for CRUD operations on
//! tracks, albums, artists, playlists, search, and playback history.

pub mod albums;
pub mod artists;
pub mod history;
pub mod playlists_db;
pub mod search;
#[cfg(test)]
mod tests;
pub mod tracks;

use log::warn;
use rusqlite::{params, Connection, Result, Transaction};
use std::path::Path;

/// Helper for interacting with the SQLite database.
pub struct DbHelper {
    pub(crate) conn: Connection,
}

impl DbHelper {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| {
                    rusqlite::Error::InvalidParameterName(format!("Failed to create DB dir: {}", e))
                })?;
            }
        }
        let conn = Connection::open(path)?;

        conn.execute_batch(
            "PRAGMA journal_mode=WAL;\
             PRAGMA synchronous=NORMAL;\
             PRAGMA cache_size = -8000;\
             PRAGMA mmap_size = 268435456;\
             PRAGMA temp_store = MEMORY;",
        )?;

        let table_exists: bool = conn
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='artists'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0)
            > 0;

        if !table_exists {
            warn!(
                "Database tables missing in {:?}. Applying initial schema...",
                path
            );
            conn.execute_batch(include_str!("../../migrations/001_initial_schema.sql"))?;
        } else {
            let has_artwork: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('playlists') WHERE name='artwork_path'",
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            if has_artwork == 0 {
                warn!("Applying missing column artwork_path to playlists...");
                let _ = conn.execute("ALTER TABLE playlists ADD COLUMN artwork_path TEXT", []);
            }

            let has_mtime: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('tracks') WHERE name='modification_time'",
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            if has_mtime == 0 {
                warn!("Applying missing column modification_time to tracks...");
                let _ = conn.execute(
                    "ALTER TABLE tracks ADD COLUMN modification_time INTEGER DEFAULT 0",
                    [],
                );
            }
        }

        conn.execute(
            "CREATE TABLE IF NOT EXISTS playback_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                duration_ms INTEGER NOT NULL,
                FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
            )",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_playback_history_timestamp ON playback_history(timestamp)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_playback_history_track_id ON playback_history(track_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_track_artists_artist ON track_artists(artist_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre) WHERE genre IS NOT NULL AND genre != ''",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_albums_artist_year ON albums(artist_id, year DESC)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title COLLATE NOCASE)",
            [],
        )?;

        Ok(Self { conn })
    }

    pub fn get_conn(&self) -> &Connection {
        &self.conn
    }

    pub fn get_conn_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }

    pub fn get_or_create_artist(tx: &Transaction, name: &str) -> Result<i64> {
        let name = name.trim();
        if name.is_empty() {
            return Err(rusqlite::Error::InvalidParameterName("artist name is empty".into()));
        }
        if let Ok(id) = tx.query_row(
            "SELECT id FROM artists WHERE name = ?1 COLLATE NOCASE",
            params![name],
            |row| row.get(0),
        ) {
            return Ok(id);
        }
        let id = tx.query_row(
            "INSERT INTO artists (name) VALUES (?1) ON CONFLICT(name) DO NOTHING RETURNING id",
            params![name],
            |row| row.get(0),
        );
        match id {
            Ok(id) => Ok(id),
            Err(_) => tx.query_row(
                "SELECT id FROM artists WHERE name = ?1 COLLATE NOCASE",
                params![name],
                |row| row.get(0),
            ),
        }
    }

    pub fn get_or_create_album(
        tx: &Transaction,
        title: &str,
        artist_id: Option<i64>,
        year: Option<u32>,
        artwork_path: Option<&String>,
    ) -> Result<i64> {
        {
            let sql = "SELECT id, artist_id, artwork_path FROM albums WHERE title = ? AND (artist_id = ? OR (artist_id IS NULL AND ? IS NULL))";
            let mut stmt = tx.prepare(sql)?;
            let mut rows = stmt.query(params![title, artist_id, artist_id])?;

            if let Some(row) = rows.next()? {
                let id: i64 = row.get(0)?;
                let current_artwork: Option<String> = row.get(2)?;

                drop(rows);
                drop(stmt);

                let should_update = current_artwork.is_none() && artwork_path.is_some();
                if should_update {
                    tx.execute(
                        "UPDATE albums SET artwork_path = ? WHERE id = ?",
                        params![artwork_path, id],
                    )?;
                }

                return Ok(id);
            }
            drop(rows);
            drop(stmt);
        }

        // artist attribution may have changed due to splitting — match by title alone
        {
            let sql = "SELECT id, artist_id, artwork_path FROM albums WHERE title = ? ORDER BY id LIMIT 1";
            let mut stmt = tx.prepare(sql)?;
            let mut rows = stmt.query(params![title])?;

            if let Some(row) = rows.next()? {
                let id: i64 = row.get(0)?;
                let existing_artist_id: Option<i64> = row.get(1)?;
                let current_artwork: Option<String> = row.get(2)?;

                drop(rows);
                drop(stmt);

                if existing_artist_id != artist_id {
                    let artwork =
                        current_artwork.or_else(|| artwork_path.cloned());
                    tx.execute(
                        "UPDATE albums SET artist_id = ?, year = COALESCE(?, year), artwork_path = COALESCE(?, artwork_path), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        params![artist_id, year, artwork, id],
                    )?;
                } else if current_artwork.is_none() && artwork_path.is_some() {
                    tx.execute(
                        "UPDATE albums SET artwork_path = ? WHERE id = ?",
                        params![artwork_path, id],
                    )?;
                }

                return Ok(id);
            }
        }

        tx.execute(
            "INSERT INTO albums (title, artist_id, year, artwork_path) VALUES (?, ?, ?, ?)",
            params![title, artist_id, year, artwork_path],
        )?;
        Ok(tx.last_insert_rowid())
    }

    pub fn delete_tracks(tx: &Transaction, ids: &[i64]) -> Result<()> {
        if ids.is_empty() {
            return Ok(());
        }

        let placeholders = vec!["?"; ids.len()].join(",");
        let sql = format!("DELETE FROM tracks WHERE id IN ({})", placeholders);
        tx.execute(&sql, rusqlite::params_from_iter(ids.iter()))?;

        Ok(())
    }

    pub fn delete_empty_albums(tx: &Transaction) -> Result<usize> {
        let count = tx.execute(
            "DELETE FROM albums WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks WHERE album_id IS NOT NULL)",
            [],
        )?;
        Ok(count)
    }

    pub fn delete_empty_artists(tx: &Transaction) -> Result<usize> {
        let count = tx.execute(
            "DELETE FROM artists WHERE id NOT IN (
                SELECT DISTINCT artist_id FROM tracks WHERE artist_id IS NOT NULL
                UNION
                SELECT DISTINCT artist_id FROM albums WHERE artist_id IS NOT NULL
                UNION
                SELECT DISTINCT artist_id FROM track_artists
            )",
            [],
        )?;
        Ok(count)
    }
}
