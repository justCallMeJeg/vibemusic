use crate::scanner::TrackMetadata;
use rusqlite::{params, Connection, Result, Transaction};
use std::path::Path;

pub struct DbHelper {
    conn: Connection,
}

impl DbHelper {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
            }
        }
        let conn = Connection::open(path)?;

        // Robustness check: Ensure schema exists
        // This handles race conditions where this thread might create the DB file
        // before the main plugin runs migrations, or if path resolution differs.
        let table_exists: bool = conn
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='artists'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0)
            > 0;

        if !table_exists {
            eprintln!("Database tables missing. Applying initial schema to ensure robustness...");
            conn.execute_batch(include_str!("../migrations/001_initial_schema.sql"))?;
        } else {
            // Manual migration check for artwork_path to ensure it exists even if plugin migration is skipped
            let has_artwork: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('playlists') WHERE name='artwork_path'",
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            if has_artwork == 0 {
                eprintln!("Applying missing column artwork_path to playlists...");
                // We ignore error here just in case, but usually it should work
                let _ = conn.execute("ALTER TABLE playlists ADD COLUMN artwork_path TEXT", []);
            }
        }

        Ok(Self { conn })
    }

    pub fn get_or_create_artist(tx: &Transaction, name: &str) -> Result<i64> {
        {
            let mut stmt = tx.prepare("SELECT id FROM artists WHERE name = ?")?;
            let mut rows = stmt.query(params![name])?;

            if let Some(row) = rows.next()? {
                return row.get(0);
            }
        }

        tx.execute("INSERT INTO artists (name) VALUES (?)", params![name])?;
        Ok(tx.last_insert_rowid())
    }

    pub fn get_or_create_album(
        tx: &Transaction,
        title: &str,
        artist_id: Option<i64>,
        year: Option<u32>,
        artwork_path: Option<&String>,
    ) -> Result<i64> {
        {
            let sql = "SELECT id, artwork_path FROM albums WHERE title = ? AND (artist_id = ? OR (artist_id IS NULL AND ? IS NULL))";
            let mut stmt = tx.prepare(sql)?;
            let mut rows = stmt.query(params![title, artist_id, artist_id])?;

            if let Some(row) = rows.next()? {
                let id: i64 = row.get(0)?;
                let current_artwork: Option<String> = row.get(1)?;

                // If we found new artwork and the album has none, we should update it
                let should_update = current_artwork.is_none() && artwork_path.is_some();

                // Explicitly drop borrows to free tx for use
                drop(rows);
                drop(stmt);

                if should_update {
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

    pub fn upsert_track(tx: &Transaction, metadata: &TrackMetadata) -> Result<()> {
        // Track artist (used for the track itself)
        let artist_id = if let Some(artist) = &metadata.artist {
            Some(Self::get_or_create_artist(tx, artist)?)
        } else {
            None
        };

        // Album artist (used for album grouping - prefer album_artist, fallback to track artist)
        let album_artist_id = if let Some(album_artist) = &metadata.album_artist {
            Some(Self::get_or_create_artist(tx, album_artist)?)
        } else {
            // Don't use track artist for albums - this causes duplicate albums
            // when different tracks have different artists
            None
        };

        let album_id = if let Some(album) = &metadata.album {
            Some(Self::get_or_create_album(
                tx,
                album,
                album_artist_id, // Use album artist, not track artist
                metadata.year,
                metadata.artwork_path.as_ref(),
            )?)
        } else {
            None
        };

        // Check if track exists
        let exists = {
            let mut stmt = tx.prepare("SELECT id FROM tracks WHERE file_path = ?")?;
            stmt.exists(params![metadata.file_path])?
        };

        let track_id = if exists {
            let mut stmt = tx.prepare("SELECT id FROM tracks WHERE file_path = ?")?;
            let id: i64 = stmt.query_row(params![metadata.file_path], |row| row.get(0))?;

            tx.execute(
                "UPDATE tracks SET 
                    title = ?, artist_id = ?, album_id = ?, album_artist = ?, 
                    track_number = ?, disc_number = ?, duration_ms = ?, 
                    file_size = ?, file_format = ?, sample_rate = ?, 
                    bit_rate = ?, channels = ?, genre = ?, year = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?",
                params![
                    metadata.title.as_deref().unwrap_or(&metadata.file_name), // Fallback to filename if title is None
                    artist_id,
                    album_id,
                    metadata.album_artist,
                    metadata.track_number,
                    metadata.disc_number.unwrap_or(1),
                    metadata.duration_ms,
                    metadata.file_size,
                    metadata.file_format,
                    metadata.sample_rate,
                    metadata.bit_rate,
                    metadata.channels,
                    metadata.genre,
                    metadata.year,
                    id
                ],
            )?;
            id
        } else {
            tx.execute(
                "INSERT INTO tracks (
                    title, artist_id, album_id, album_artist, 
                    track_number, disc_number, duration_ms, 
                    file_path, file_size, file_format, sample_rate, 
                    bit_rate, channels, genre, year
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    metadata.title.as_deref().unwrap_or(&metadata.file_name),
                    artist_id,
                    album_id,
                    metadata.album_artist,
                    metadata.track_number,
                    metadata.disc_number.unwrap_or(1),
                    metadata.duration_ms,
                    metadata.file_path,
                    metadata.file_size,
                    metadata.file_format,
                    metadata.sample_rate,
                    metadata.bit_rate,
                    metadata.channels,
                    metadata.genre,
                    metadata.year
                ],
            )?;
            tx.last_insert_rowid()
        };

        // Handle multiple artists (track_artists junction table)
        // First, clear existing associations for this track (simplest update strategy)
        tx.execute(
            "DELETE FROM track_artists WHERE track_id = ?",
            params![track_id],
        )?;

        // Insert new associations
        for artist_name in &metadata.artists {
            let artist_id = Self::get_or_create_artist(tx, artist_name)?;
            // Ignore duplicate insertions if any (schema has UNIQUE constraint, but we cleaned up first)
            // Use INSERT OR IGNORE just in case
            tx.execute(
                "INSERT OR IGNORE INTO track_artists (track_id, artist_id) VALUES (?, ?)",
                params![track_id, artist_id],
            )?;
        }

        Ok(())
    }

    pub fn _get_conn(&self) -> &Connection {
        &self.conn
    }

    pub fn get_conn_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }

    pub fn get_all_track_paths(&self) -> Result<Vec<(i64, String)>> {
        let mut stmt = self.conn.prepare("SELECT id, file_path FROM tracks")?;
        let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;

        let mut paths = Vec::new();
        for row in rows {
            paths.push(row?);
        }
        Ok(paths)
    }

    pub fn delete_tracks(tx: &Transaction, ids: &[i64]) -> Result<()> {
        // SQLite doesn't have a clean WHERE IN (?) for array binding in rusqlite readily available without dynamic SQL construction
        // or using a series of statements.
        // For pruning, batched calls are fine.

        // We could also do "DELETE FROM tracks WHERE id IN (1, 2, 3...)" dynamically
        if ids.is_empty() {
            return Ok(());
        }

        let mut stmt = tx.prepare("DELETE FROM tracks WHERE id = ?")?;
        for id in ids {
            stmt.execute(params![id])?;
        }

        Ok(())
    }

    pub fn delete_empty_albums(tx: &Transaction) -> Result<usize> {
        let count = tx.execute(
            "DELETE FROM albums WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks WHERE album_id IS NOT NULL)",
            [],
        )?;
        Ok(count)
    }

    pub fn delete_track(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM tracks WHERE id = ?", params![id])?;
        Ok(())
    }

    pub fn get_all_tracks(&self) -> Result<Vec<crate::library::LibraryTrack>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                t.id, 
                t.title, 
                ar.name as artist, 
                al.title as album, 
                t.duration_ms, 
                t.file_path, 
                al.artwork_path 
            FROM tracks t
            LEFT JOIN artists ar ON t.artist_id = ar.id
            LEFT JOIN albums al ON t.album_id = al.id
            ORDER BY t.created_at DESC",
        )?;

        let track_iter = stmt.query_map([], |row| {
            Ok(crate::library::LibraryTrack {
                id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                duration_ms: row.get(4)?,
                file_path: row.get(5)?,
                artwork_path: row.get(6)?,
            })
        })?;

        let mut tracks = Vec::new();
        for track in track_iter {
            tracks.push(track?);
        }

        Ok(tracks)
    }

    pub fn get_all_albums(&self) -> Result<Vec<crate::library::LibraryAlbum>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                al.id,
                al.title,
                al.artist_id,
                ar.name as artist_name,
                al.year,
                al.artwork_path,
                COUNT(t.id) as track_count,
                COALESCE(SUM(t.duration_ms), 0) as total_duration_ms
            FROM albums al
            LEFT JOIN artists ar ON al.artist_id = ar.id
            LEFT JOIN tracks t ON t.album_id = al.id
            GROUP BY al.id
            ORDER BY al.title ASC",
        )?;

        let album_iter = stmt.query_map([], |row| {
            Ok(crate::library::LibraryAlbum {
                id: row.get(0)?,
                title: row.get(1)?,
                artist_id: row.get(2)?,
                artist_name: row.get(3)?,
                year: row.get(4)?,
                artwork_path: row.get(5)?,
                track_count: row.get(6)?,
                total_duration_ms: row.get(7)?,
            })
        })?;

        let mut albums = Vec::new();
        for album in album_iter {
            albums.push(album?);
        }

        Ok(albums)
    }

    pub fn get_album_by_id(&self, id: i64) -> Result<Option<crate::library::LibraryAlbum>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                al.id,
                al.title,
                al.artist_id,
                ar.name as artist_name,
                al.year,
                al.artwork_path,
                COUNT(t.id) as track_count,
                COALESCE(SUM(t.duration_ms), 0) as total_duration_ms
            FROM albums al
            LEFT JOIN artists ar ON al.artist_id = ar.id
            LEFT JOIN tracks t ON t.album_id = al.id
            WHERE al.id = ?
            GROUP BY al.id",
        )?;

        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(crate::library::LibraryAlbum {
                id: row.get(0)?,
                title: row.get(1)?,
                artist_id: row.get(2)?,
                artist_name: row.get(3)?,
                year: row.get(4)?,
                artwork_path: row.get(5)?,
                track_count: row.get(6)?,
                total_duration_ms: row.get(7)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_album_tracks(&self, album_id: i64) -> Result<Vec<crate::library::LibraryTrack>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                t.id, 
                t.title, 
                ar.name as artist, 
                al.title as album, 
                t.duration_ms, 
                t.file_path, 
                al.artwork_path 
            FROM tracks t
            LEFT JOIN artists ar ON t.artist_id = ar.id
            LEFT JOIN albums al ON t.album_id = al.id
            WHERE t.album_id = ?
            ORDER BY t.disc_number ASC, t.track_number ASC, t.title ASC",
        )?;

        let track_iter = stmt.query_map(params![album_id], |row| {
            Ok(crate::library::LibraryTrack {
                id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                duration_ms: row.get(4)?,
                file_path: row.get(5)?,
                artwork_path: row.get(6)?,
            })
        })?;

        let mut tracks = Vec::new();
        for track in track_iter {
            tracks.push(track?);
        }

        Ok(tracks)
    }

    pub fn create_playlist(
        &self,
        name: String,
        description: Option<String>,
    ) -> Result<crate::playlists::Playlist> {
        let mut stmt = self.conn.prepare(
            "INSERT INTO playlists (name, description) VALUES (?, ?) RETURNING id, name, description, created_at",
        )?;

        // Use query_row with returning clause (SQLite 3.35+)
        let playlist = stmt.query_row(params![name, description], |row| {
            Ok(crate::playlists::Playlist {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                artwork_path: None, // New playlists have no artwork
                track_count: 0,
                created_at: row.get::<_, String>(3)?,
            })
        })?;

        Ok(playlist)
    }

    pub fn delete_playlist(&self, id: i64) -> Result<()> {
        self.conn
            .execute("DELETE FROM playlists WHERE id = ?", params![id])?;
        Ok(())
    }

    pub fn update_playlist(
        &self,
        id: i64,
        name: String,
        description: Option<String>,
        artwork_path: Option<String>,
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE playlists SET name = ?, description = ?, artwork_path = ? WHERE id = ?",
            params![name, description, artwork_path, id],
        )?;
        Ok(())
    }

    pub fn get_playlists(&self) -> Result<Vec<crate::playlists::Playlist>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                p.id, 
                p.name, 
                p.description, 
                p.artwork_path,
                p.created_at,
                COUNT(pt.id) as track_count
            FROM playlists p
            LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
            GROUP BY p.id
            ORDER BY p.name ASC",
        )?;

        let playlist_iter = stmt.query_map([], |row| {
            Ok(crate::playlists::Playlist {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                artwork_path: row.get(3)?,
                created_at: row.get(4)?,
                track_count: row.get(5)?,
            })
        })?;

        let mut playlists = Vec::new();
        for playlist in playlist_iter {
            playlists.push(playlist?);
        }

        Ok(playlists)
    }

    pub fn get_playlist_tracks(
        &self,
        playlist_id: i64,
    ) -> Result<Vec<crate::library::LibraryTrack>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                t.id, 
                t.title, 
                ar.name as artist, 
                al.title as album, 
                t.duration_ms, 
                t.file_path, 
                al.artwork_path 
            FROM tracks t
            JOIN playlist_tracks pt ON t.id = pt.track_id
            LEFT JOIN artists ar ON t.artist_id = ar.id
            LEFT JOIN albums al ON t.album_id = al.id
            WHERE pt.playlist_id = ?
            ORDER BY pt.position ASC",
        )?;

        let track_iter = stmt.query_map(params![playlist_id], |row| {
            Ok(crate::library::LibraryTrack {
                id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                duration_ms: row.get(4)?,
                file_path: row.get(5)?,
                artwork_path: row.get(6)?,
            })
        })?;

        let mut tracks = Vec::new();
        for track in track_iter {
            tracks.push(track?);
        }

        Ok(tracks)
    }

    pub fn add_track_to_playlist(&self, playlist_id: i64, track_id: i64) -> Result<()> {
        // Get current max position
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ?",
            params![playlist_id],
            |row| row.get(0),
        )?;

        self.conn.execute(
            "INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)",
            params![playlist_id, track_id, count],
        )?;

        Ok(())
    }

    pub fn remove_track_from_playlist(&self, playlist_id: i64, track_id: i64) -> Result<()> {
        self.conn.execute(
            "DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?",
            params![playlist_id, track_id],
        )?;
        // Optional: Reorder positions? Not strictly necessary for basic functionality.
        Ok(())
    }
}
