use crate::scanner::TrackMetadata;
use rusqlite::{params, Connection, Result};
use std::path::Path;

pub struct DbHelper {
    conn: Connection,
}

impl DbHelper {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        Ok(Self { conn })
    }

    pub fn get_or_create_artist(&mut self, name: &str) -> Result<i64> {
        let tx = self.conn.transaction()?;

        {
            let mut stmt = tx.prepare("SELECT id FROM artists WHERE name = ?")?;
            let mut rows = stmt.query(params![name])?;

            if let Some(row) = rows.next()? {
                return row.get(0);
            }
        }

        tx.execute("INSERT INTO artists (name) VALUES (?)", params![name])?;
        let id = tx.last_insert_rowid();
        tx.commit()?;

        Ok(id)
    }

    pub fn get_or_create_album(
        &mut self,
        title: &str,
        artist_id: Option<i64>,
        year: Option<u32>,
        artwork_path: Option<&String>,
    ) -> Result<i64> {
        let tx = self.conn.transaction()?;

        {
            let sql = "SELECT id, artwork_path FROM albums WHERE title = ? AND (artist_id = ? OR (artist_id IS NULL AND ? IS NULL))";
            let mut stmt = tx.prepare(sql)?;
            let mut rows = stmt.query(params![title, artist_id, artist_id])?;

            if let Some(row) = rows.next()? {
                let id: i64 = row.get(0)?;
                let current_artwork: Option<String> = row.get(1)?;

                // If we found new artwork and the album has none, update it
                if current_artwork.is_none() && artwork_path.is_some() {
                    drop(row); // Release borrow
                    drop(rows); // Release borrow
                    drop(stmt); // Release borrow

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
        let id = tx.last_insert_rowid();
        tx.commit()?;

        Ok(id)
    }

    pub fn upsert_track(&mut self, metadata: &TrackMetadata) -> Result<()> {
        let artist_id = if let Some(artist) = &metadata.artist {
            Some(self.get_or_create_artist(artist)?)
        } else {
            None
        };

        let album_id = if let Some(album) = &metadata.album {
            Some(self.get_or_create_album(
                album,
                artist_id,
                metadata.year,
                metadata.artwork_path.as_ref(),
            )?)
        } else {
            None
        };

        // Check if track exists
        let exists = {
            let mut stmt = self
                .conn
                .prepare("SELECT id FROM tracks WHERE file_path = ?")?;
            stmt.exists(params![metadata.file_path])?
        };

        if exists {
            self.conn.execute(
                "UPDATE tracks SET 
                    title = ?, artist_id = ?, album_id = ?, album_artist = ?, 
                    track_number = ?, disc_number = ?, duration_ms = ?, 
                    file_size = ?, file_format = ?, sample_rate = ?, 
                    bit_rate = ?, channels = ?, genre = ?, year = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE file_path = ?",
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
                    metadata.file_path
                ],
            )?;
        } else {
            self.conn.execute(
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
        }

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
            ORDER BY t.created_at DESC"
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
}
