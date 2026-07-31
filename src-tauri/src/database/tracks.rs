use super::DbHelper;
use crate::scanner::metadata::parse_artists;
use crate::shared::types::{LibraryTrack, TrackMetadata};
use rusqlite::{params, Result, Transaction};

pub(crate) const TRACK_SELECT: &str = "\
SELECT
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
    al.artwork_path,
    GROUP_CONCAT(ta.role, '|||') as artist_roles
FROM tracks t
LEFT JOIN artists ar ON t.artist_id = ar.id
LEFT JOIN track_artists ta ON t.id = ta.track_id
LEFT JOIN artists ar_join ON ta.artist_id = ar_join.id
LEFT JOIN albums al ON t.album_id = al.id";

impl DbHelper {
    pub(crate) fn row_to_library_track(row: &rusqlite::Row) -> Result<LibraryTrack> {
        let names_str: Option<String> = row.get(4)?;
        let ids_str: Option<String> = row.get(5)?;
        let roles_str: Option<String> = row.get(11)?;

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

        let artist_roles = roles_str
            .as_deref()
            .unwrap_or("")
            .split("|||")
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();

        Ok(LibraryTrack {
            id: row.get(0)?,
            title: row.get(1)?,
            artist: row.get(2)?,
            artist_id: row.get(3)?,
            artist_names,
            artist_ids,
            artist_roles,
            album: row.get(6)?,
            album_id: row.get(7)?,
            duration_ms: row.get(8)?,
            file_path: row.get(9)?,
            artwork_path: row.get(10)?,
        })
    }

    pub fn upsert_track(tx: &Transaction, metadata: &TrackMetadata) -> Result<()> {
        let artist_id = if let Some(artist) = &metadata.artist {
            Some(Self::get_or_create_artist(tx, artist)?)
        } else {
            None
        };

        let album_artist_id = if let Some(album_artist) = &metadata.album_artist {
            let parsed = parse_artists(Some(album_artist));
            if let Some(first) = parsed.first() {
                Some(Self::get_or_create_artist(tx, first)?)
            } else {
                None
            }
        } else {
            None
        };

        let album_id = if let Some(album) = &metadata.album {
            Some(Self::get_or_create_album(
                tx,
                album,
                album_artist_id,
                metadata.year,
                metadata.artwork_path.as_ref(),
            )?)
        } else {
            None
        };

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

        tx.execute(
            "DELETE FROM track_artists WHERE track_id = ?",
            params![track_id],
        )?;

        for artist_name in &metadata.artists {
            let artist_id = Self::get_or_create_artist(tx, artist_name)?;
            tx.execute(
                "INSERT OR IGNORE INTO track_artists (track_id, artist_id, role) VALUES (?, ?, 'main')",
                params![track_id, artist_id],
            )?;
        }

        for artist_name in &metadata.featured_artist_names {
            let artist_id = Self::get_or_create_artist(tx, artist_name)?;
            tx.execute(
                "INSERT OR IGNORE INTO track_artists (track_id, artist_id, role) VALUES (?, ?, 'featured')",
                params![track_id, artist_id],
            )?;
        }

        Ok(())
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

    pub fn remove_folder(&mut self, folder: &str) -> Result<usize> {
        let pattern = format!("{}%", folder);

        let tx = self.conn.transaction()?;

        let count = tx.execute(
            "DELETE FROM tracks WHERE file_path LIKE ?",
            params![pattern],
        )?;

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

    pub fn get_all_tracks(&self) -> Result<Vec<LibraryTrack>> {
        let query = format!(
            "{} GROUP BY t.id ORDER BY t.created_at DESC",
            TRACK_SELECT
        );
        let mut stmt = self.conn.prepare(&query)?;

        let tracks = stmt
            .query_map([], Self::row_to_library_track)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tracks)
    }

    pub fn get_album_tracks(&self, album_id: i64) -> Result<Vec<LibraryTrack>> {
        let query = format!(
            "{} WHERE t.album_id = ? GROUP BY t.id ORDER BY t.disc_number ASC, t.track_number ASC, t.title ASC",
            TRACK_SELECT
        );
        let mut stmt = self.conn.prepare(&query)?;

        let tracks = stmt
            .query_map(params![album_id], Self::row_to_library_track)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tracks)
    }

    pub fn get_artist_tracks(&self, artist_id: i64) -> Result<Vec<LibraryTrack>> {
        let query = format!(
            "{} LEFT JOIN track_artists ta_filter ON t.id = ta_filter.track_id WHERE ta_filter.artist_id = ? GROUP BY t.id ORDER BY t.created_at DESC",
            TRACK_SELECT
        );
        let mut stmt = self.conn.prepare(&query)?;

        let track_iter = stmt.query_map(params![artist_id], |row| {
            let names_str: Option<String> = row.get(4)?;
            let ids_str: Option<String> = row.get(5)?;
            let roles_str: Option<String> = row.get(11)?;

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

            let artist_roles = roles_str
                .as_deref()
                .unwrap_or("")
                .split("|||")
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect();

            Ok(LibraryTrack {
                id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                artist_id: row.get(3)?,
                artist_names,
                artist_ids,
                artist_roles,
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
}
