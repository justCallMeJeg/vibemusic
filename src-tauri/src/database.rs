use crate::scanner::TrackMetadata;
use rusqlite::{params, Connection, Result, Transaction};
use std::path::Path;
use log::warn;

/// Helper for interacting with the SQLite database.
pub struct DbHelper {
    conn: Connection,
}

impl DbHelper {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| rusqlite::Error::InvalidParameterName(format!("Failed to create DB dir: {}", e)))?;
            }
        }
        let conn = Connection::open(path)?;

        // Enable WAL mode for better concurrent read performance during scans
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")?;

        // Robustness check: Ensure schema exists
        // Critical for profile-specific databases which aren't covered by the main plugin migrations
        let table_exists: bool = conn
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='artists'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0)
            > 0;

        if !table_exists {
            warn!("Database tables missing in {:?}. Applying initial schema...", path);
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
                warn!("Applying missing column artwork_path to playlists...");
                // We ignore error here just in case, but usually it should work
                let _ = conn.execute("ALTER TABLE playlists ADD COLUMN artwork_path TEXT", []);
            }

            // Check for modification_time in tracks
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

            // Ensure performance indexes exist (idempotent)
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

            // Playback History Table
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


        Ok(Self { conn })
    }

    pub fn get_or_create_artist(tx: &Transaction, name: &str) -> Result<i64> {
        let id = tx.query_row(
            "INSERT INTO artists (name) VALUES (?1) ON CONFLICT(name) DO NOTHING RETURNING id",
            params![name],
            |row| row.get(0),
        );
        match id {
            Ok(id) => Ok(id),
            Err(_) => {
                tx.query_row(
                    "SELECT id FROM artists WHERE name = ?1",
                    params![name],
                    |row| row.get(0),
                )
            }
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

    /// Inserts or updates a track in the database.
    /// Handles artist and album creation/updates automatically.
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
                    modification_time = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?",
                params![
                    metadata.title.as_deref().unwrap_or(&metadata.file_name),
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
                    metadata.modification_time,
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
                    bit_rate, channels, genre, year, modification_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
                    metadata.year,
                    metadata.modification_time
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

    pub fn get_conn(&self) -> &Connection {
        &self.conn
    }

    pub fn get_conn_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }

    /// Maps a SQL row into a LibraryTrack. Shared by all track-query methods.
    fn row_to_library_track(row: &rusqlite::Row) -> Result<crate::library::LibraryTrack> {
        let names_str: Option<String> = row.get(4)?;
        let ids_str: Option<String> = row.get(5)?;

        let artist_names = names_str
            .as_deref()
            .unwrap_or("")
            .split("|||")
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();

        let artist_ids = ids_str
            .as_deref()
            .unwrap_or("")
            .split("|||")
            .filter_map(|s| s.parse::<i64>().ok())
            .collect();

        Ok(crate::library::LibraryTrack {
            id: row.get(0)?,
            title: row.get(1)?,
            artist: row.get(2)?,
            artist_id: row.get(3)?,
            artist_names,
            artist_ids,
            album: row.get(6)?,
            album_id: row.get(7)?,
            duration_ms: row.get(8)?,
            file_path: row.get(9)?,
            artwork_path: row.get(10)?,
        })
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

    pub fn get_existing_metadata(&self) -> Result<Vec<(String, u64, u64)>> {
        let mut stmt = self
            .conn
            .prepare("SELECT file_path, file_size, modification_time FROM tracks")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get::<_, Option<u64>>(1)?.unwrap_or(0),
                row.get::<_, Option<u64>>(2)?.unwrap_or(0),
            ))
        })?;

        let mut data = Vec::new();
        for row in rows {
            data.push(row?);
        }
        Ok(data)
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

    pub fn remove_folder(&mut self, folder: &str) -> Result<usize> {
        // Prepare pattern: folder + separator wildcard?
        // If folder is "C:\Music", match "C:\Music\%" or "C:\Music%"
        // To be safe, ensure folder ends with separator or checking strictly.
        // Assuming simple prefix match for now.
        // Note: Make sure to handle backslashes if needed, but usually exact string prefix is fine.
        let pattern = format!("{}%", folder); 
        
        let tx = self.conn.transaction()?;
        
        let count = tx.execute("DELETE FROM tracks WHERE file_path LIKE ?", params![pattern])?;
        
        if count > 0 {
             Self::delete_empty_albums(&tx)?;
             Self::delete_empty_artists(&tx)?;
        }
        
        tx.commit()?;
        Ok(count)
    }

    pub fn delete_track(&self, id: i64) -> Result<()> {
        self.conn
            .execute("DELETE FROM tracks WHERE id = ?", params![id])?;
        Ok(())
    }

    pub fn get_all_tracks(&self) -> Result<Vec<crate::library::LibraryTrack>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                t.id, 
                t.title, 
                ar.name as artist, 
                t.artist_id,
                GROUP_CONCAT(ar_join.name, '|||') as artist_names,
                GROUP_CONCAT(ar_join.id, '|||') as artist_ids,
                al.title as album, 
                t.album_id,
                t.duration_ms, 
                t.file_path, 
                al.artwork_path 
            FROM tracks t
            LEFT JOIN artists ar ON t.artist_id = ar.id
            LEFT JOIN track_artists ta ON t.id = ta.track_id
            LEFT JOIN artists ar_join ON ta.artist_id = ar_join.id
            LEFT JOIN albums al ON t.album_id = al.id
            GROUP BY t.id
            ORDER BY t.created_at DESC",
        )?;

        let tracks = stmt.query_map([], Self::row_to_library_track)?
            .collect::<Result<Vec<_>, _>>()?;

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
                t.artist_id,
                GROUP_CONCAT(ar_join.name, '|||') as artist_names,
                GROUP_CONCAT(ar_join.id, '|||') as artist_ids,
                al.title as album, 
                t.album_id,
                t.duration_ms, 
                t.file_path, 
                al.artwork_path 
            FROM tracks t
            LEFT JOIN artists ar ON t.artist_id = ar.id
            LEFT JOIN track_artists ta ON t.id = ta.track_id
            LEFT JOIN artists ar_join ON ta.artist_id = ar_join.id
            LEFT JOIN albums al ON t.album_id = al.id
            WHERE t.album_id = ?
            GROUP BY t.id
            ORDER BY t.disc_number ASC, t.track_number ASC, t.title ASC",
        )?;

        let tracks = stmt.query_map(params![album_id], Self::row_to_library_track)?
            .collect::<Result<Vec<_>, _>>()?;

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
                t.artist_id,
                GROUP_CONCAT(ar_join.name, '|||') as artist_names,
                GROUP_CONCAT(ar_join.id, '|||') as artist_ids,
                al.title as album, 
                t.album_id,
                t.duration_ms, 
                t.file_path, 
                al.artwork_path 
            FROM tracks t
            JOIN playlist_tracks pt ON t.id = pt.track_id
            LEFT JOIN artists ar ON t.artist_id = ar.id
            LEFT JOIN track_artists ta ON t.id = ta.track_id
            LEFT JOIN artists ar_join ON ta.artist_id = ar_join.id
            LEFT JOIN albums al ON t.album_id = al.id
            WHERE pt.playlist_id = ?
            GROUP BY t.id, pt.position
            ORDER BY pt.position ASC",
        )?;

        let tracks = stmt.query_map(params![playlist_id], Self::row_to_library_track)?
            .collect::<Result<Vec<_>, _>>()?;

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
        Ok(())
    }

    pub fn reorder_playlist(&mut self, playlist_id: i64, new_order: Vec<i64>) -> Result<()> {
        let tx = self.conn.transaction()?;

        // Prepare the update statement once
        {
            let mut stmt = tx.prepare(
                "UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?",
            )?;

            for (index, track_id) in new_order.iter().enumerate() {
                stmt.execute(params![index as i64, playlist_id, track_id])?;
            }
        }

        tx.commit()?;
        Ok(())
    }
    pub fn get_all_artists(&self) -> Result<Vec<crate::library::Artist>> {
        // Window function: pick the most recent album's artwork per artist
        // Uses ROW_NUMBER() which requires SQLite 3.25+ (bundled version is 3.43)
        let mut stmt = self.conn.prepare(
            "WITH ranked_artwork AS (
                SELECT artist_id, artwork_path,
                       ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY year DESC) as rn
                FROM albums WHERE artwork_path IS NOT NULL
            )
            SELECT 
                a.id, 
                a.name, 
                COUNT(DISTINCT al.id) as album_count,
                COUNT(DISTINCT ta.track_id) as track_count,
                art.artwork_path
            FROM artists a
            LEFT JOIN albums al ON al.artist_id = a.id
            LEFT JOIN track_artists ta ON ta.artist_id = a.id
            LEFT JOIN ranked_artwork art ON art.artist_id = a.id AND art.rn = 1
            GROUP BY a.id
            ORDER BY a.name ASC",
        )?;

        let artist_iter = stmt.query_map([], |row| {
            Ok(crate::library::Artist {
                id: row.get(0)?,
                name: row.get(1)?,
                album_count: row.get(2)?,
                track_count: row.get(3)?,
                artwork_path: row.get(4)?,
            })
        })?;

        let mut artists = Vec::new();
        for artist in artist_iter {
            let a = artist?;
            if a.album_count > 0 || a.track_count > 0 {
                artists.push(a);
            }
        }
        Ok(artists)
    }

    pub fn get_artist_by_id(&self, id: i64) -> Result<Option<crate::library::Artist>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                a.id, 
                a.name, 
                (SELECT COUNT(*) FROM albums WHERE artist_id = a.id) as album_count,
                (SELECT COUNT(*) FROM track_artists WHERE artist_id = a.id) as track_count,
                (SELECT artwork_path FROM albums WHERE artist_id = a.id ORDER BY year DESC LIMIT 1) as artwork_path
            FROM artists a
            WHERE a.id = ?",
        )?;

        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(crate::library::Artist {
                id: row.get(0)?,
                name: row.get(1)?,
                album_count: row.get(2)?,
                track_count: row.get(3)?,
                artwork_path: row.get(4)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_artist_albums(&self, artist_id: i64) -> Result<Vec<crate::library::LibraryAlbum>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                al.id,
                al.title,
                al.artist_id,
                ar.name as artist_name,
                al.year,
                al.artwork_path,
                (SELECT COUNT(*) FROM tracks WHERE album_id = al.id) as track_count,
                (SELECT COALESCE(SUM(duration_ms), 0) FROM tracks WHERE album_id = al.id) as total_duration_ms
            FROM albums al
            LEFT JOIN artists ar ON al.artist_id = ar.id
            WHERE al.artist_id = ?
            ORDER BY al.year DESC, al.title ASC",
        )?;

        let album_iter = stmt.query_map(params![artist_id], |row| {
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

    pub fn get_artist_tracks(&self, artist_id: i64) -> Result<Vec<crate::library::LibraryTrack>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                t.id, 
                t.title, 
                ar.name as artist, 
                t.artist_id,
                GROUP_CONCAT(ar_join.name, '|||') as artist_names,
                GROUP_CONCAT(ar_join.id, '|||') as artist_ids,
                al.title as album, 
                t.album_id,
                t.duration_ms, 
                t.file_path, 
                al.artwork_path 
            FROM tracks t
            LEFT JOIN track_artists ta_filter ON t.id = ta_filter.track_id
            LEFT JOIN artists ar ON t.artist_id = ar.id
            LEFT JOIN track_artists ta ON t.id = ta.track_id
            LEFT JOIN artists ar_join ON ta.artist_id = ar_join.id
            LEFT JOIN albums al ON t.album_id = al.id
            WHERE ta_filter.artist_id = ?
            GROUP BY t.id
            ORDER BY t.created_at DESC",
        )?;

        let track_iter = stmt.query_map(params![artist_id], |row| {
             let names_str: Option<String> = row.get(4)?;
            let ids_str: Option<String> = row.get(5)?;

            let artist_names = names_str
                .as_deref()
                .unwrap_or("")
                .split("|||")
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect();

            let artist_ids = ids_str
                .as_deref()
                .unwrap_or("")
                .split("|||")
                .filter_map(|s| s.parse::<i64>().ok())
                .collect();

            Ok(crate::library::LibraryTrack {
                id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                artist_id: row.get(3)?,
                artist_names,
                artist_ids,
                album: row.get(6)?,
                album_id: row.get(7)?,
                duration_ms: row.get(8)?,
                file_path: row.get(9)?,
                artwork_path: row.get(10)?,
            })
        })?;

        let mut tracks = Vec::new();
        for track in track_iter {
            tracks.push(track?);
        }
        Ok(tracks)
    }

    pub fn search(&self, query: &str) -> Result<crate::library::SearchResults> {
        const SEARCH_LIMIT: i64 = 20;

        // Prefix pattern uses the idx_tracks_title index (COLLATE NOCASE).
        // Infix fallback scans the table but catches mid-word matches.
        let prefix_pattern = format!("{}%", query);
        let infix_pattern = format!("%{}%", query);

        // Search Tracks — try indexed prefix first, fall back to infix
        let tracks = self.search_tracks_by_pattern(&prefix_pattern, &infix_pattern, SEARCH_LIMIT)?;

        // Search Albums — infix only (album count is typically small)
        let albums = self.search_albums_infix(&infix_pattern, SEARCH_LIMIT)?;

        // Search Playlists — prefix preferred
        let playlists = self.search_playlists_by_pattern(&prefix_pattern, &infix_pattern, SEARCH_LIMIT)?;

        Ok(crate::library::SearchResults { tracks, albums, playlists })
    }

    fn search_tracks_by_pattern(&self, prefix: &str, infix: &str, limit: i64) -> Result<Vec<crate::library::LibraryTrack>> {
        let prefix_result = self.search_tracks_like(prefix, limit)?;
        if (prefix_result.len() as i64) >= limit {
            return Ok(prefix_result);
        }
        let remaining = limit - prefix_result.len() as i64;
        let infix_result = self.search_tracks_like(infix, remaining)?;
        let mut combined = prefix_result;
        let mut seen: std::collections::HashSet<i64> = combined.iter().map(|t| t.id).collect();
        for track in infix_result {
            if seen.insert(track.id) {
                combined.push(track);
            }
        }
        Ok(combined)
    }

    fn search_tracks_like(&self, pattern: &str, limit: i64) -> Result<Vec<crate::library::LibraryTrack>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                t.id, 
                t.title, 
                ar.name as artist, 
                t.artist_id,
                GROUP_CONCAT(ar_join.name, '|||') as artist_names,
                GROUP_CONCAT(ar_join.id, '|||') as artist_ids,
                al.title as album, 
                t.album_id,
                t.duration_ms, 
                t.file_path, 
                al.artwork_path 
            FROM tracks t
            LEFT JOIN artists ar ON t.artist_id = ar.id
            LEFT JOIN track_artists ta ON t.id = ta.track_id
            LEFT JOIN artists ar_join ON ta.artist_id = ar_join.id
            LEFT JOIN albums al ON t.album_id = al.id
            WHERE t.title LIKE ?1 OR ar.name LIKE ?1
            GROUP BY t.id
            ORDER BY t.created_at DESC
            LIMIT ?2",
        )?;

        let tracks = stmt.query_map(params![pattern, limit], Self::row_to_library_track)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tracks)
    }

    fn search_albums_infix(&self, pattern: &str, limit: i64) -> Result<Vec<crate::library::LibraryAlbum>> {
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
            WHERE al.title LIKE ? OR ar.name LIKE ?
            GROUP BY al.id
            ORDER BY al.title ASC
            LIMIT ?",
        )?;

        let albums = stmt.query_map(params![pattern, pattern, limit], |row| {
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
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(albums)
    }

    fn search_playlists_by_pattern(&self, prefix: &str, infix: &str, limit: i64) -> Result<Vec<crate::playlists::Playlist>> {
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
            WHERE p.name LIKE ?
            GROUP BY p.id
            ORDER BY p.name ASC
            LIMIT ?",
        )?;

        let playlists_prefix: Vec<crate::playlists::Playlist> = stmt.query_map(params![prefix, limit], |row| {
            Ok(crate::playlists::Playlist {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                artwork_path: row.get(3)?,
                created_at: row.get(4)?,
                track_count: row.get(5)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        if !playlists_prefix.is_empty() {
            return Ok(playlists_prefix);
        }

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
            WHERE p.name LIKE ?
            GROUP BY p.id
            ORDER BY p.name ASC
            LIMIT ?",
        )?;

        let playlists = stmt.query_map(params![infix, limit], |row| {
            Ok(crate::playlists::Playlist {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                artwork_path: row.get(3)?,
                created_at: row.get(4)?,
                track_count: row.get(5)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(playlists)
    }

    pub fn record_playback(&self, track_id: i64, duration_ms: i64) -> Result<()> {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or(std::time::Duration::ZERO)
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO playback_history (track_id, timestamp, duration_ms) VALUES (?, ?, ?)",
            params![track_id, timestamp, duration_ms],
        )?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn get_playback_history(&self, after_timestamp: i64) -> Result<Vec<(i64, i64, i64)>> {
        let mut stmt = self.conn.prepare(
            "SELECT track_id, timestamp, duration_ms FROM playback_history WHERE timestamp >= ? ORDER BY timestamp DESC",
        )?;

        let rows = stmt.query_map(params![after_timestamp], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut history = Vec::new();
        for row in rows {
            history.push(row?);
        }
        Ok(history)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scanner::TrackMetadata;
    use std::path::PathBuf;
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
        db.get_conn_mut().transaction().expect("Failed to start transaction")
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

        let album_id = DbHelper::get_or_create_album(&tx, "Test Album", Some(artist_id), Some(2024), None).unwrap();
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

        // Second upsert should succeed (UPSERT logic)
        let tx = create_test_tx(&mut db);
        DbHelper::upsert_track(&tx, &track).unwrap();
        tx.commit().unwrap();

        let tracks = db.get_all_track_paths().unwrap();
        let count = tracks.iter().filter(|(_, p)| p == "/music/song2.mp3").count();
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
        assert!(existing.iter().any(|(p, _, _)| p == "/music/metadata_test.mp3"));

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
        let (id, _) = all_tracks.iter().find(|(_, p)| p == "/music/to_delete.mp3").unwrap();
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
        let (id, _) = all_tracks.iter().find(|(_, p)| p == "/music/playback_test.mp3").unwrap();
        let id = *id;

        db.record_playback(id, 120000).unwrap();

        let history = db.get_playback_history(0).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].0, id);
        assert_eq!(history[0].2, 120000);

        cleanup(&db_path);
    }
}
