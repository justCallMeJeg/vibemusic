use super::DbHelper;
use crate::shared::types::LibraryAlbum;
use rusqlite::{params, Result};

impl DbHelper {
    pub fn get_all_albums(&self) -> Result<Vec<LibraryAlbum>> {
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
            Ok(LibraryAlbum {
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

    pub fn get_album_by_id(&self, id: i64) -> Result<Option<LibraryAlbum>> {
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
            Ok(Some(LibraryAlbum {
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

    pub fn get_artist_albums(&self, artist_id: i64) -> Result<Vec<LibraryAlbum>> {
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
            Ok(LibraryAlbum {
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
}
