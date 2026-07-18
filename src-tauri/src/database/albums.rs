use super::DbHelper;
use crate::scanner::metadata::parse_artists;
use crate::shared::types::LibraryAlbum;
use rusqlite::{params, Result};

pub(crate) fn parse_album_artist_names(rows: &rusqlite::Row, col: usize) -> Vec<String> {
    let s: Option<String> = rows.get(col).unwrap_or(None);
    s.as_deref()
        .unwrap_or("")
        .split("|||")
        .filter(|n| !n.is_empty())
        .map(|n| n.to_string())
        .collect()
}

pub(crate) fn parse_raw_album_artist(rows: &rusqlite::Row, col: usize) -> Vec<String> {
    let raw: Option<String> = rows.get(col).unwrap_or(None);
    parse_artists(raw.as_deref())
}

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
                COALESCE(SUM(t.duration_ms), 0) as total_duration_ms,
                (SELECT GROUP_CONCAT(name, '|||') FROM (
                    SELECT DISTINCT ar_t.name
                    FROM tracks t_a
                    JOIN track_artists ta_a ON ta_a.track_id = t_a.id
                    JOIN artists ar_t ON ar_t.id = ta_a.artist_id
                    WHERE t_a.album_id = al.id
                )) as artist_names,
                (SELECT t.album_artist FROM tracks t WHERE t.album_id = al.id AND t.album_artist IS NOT NULL LIMIT 1) as raw_album_artist
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
                artist_names: parse_album_artist_names(row, 8),
                album_artist_names: parse_raw_album_artist(row, 9),
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
                COALESCE(SUM(t.duration_ms), 0) as total_duration_ms,
                (SELECT GROUP_CONCAT(name, '|||') FROM (
                    SELECT DISTINCT ar_t.name
                    FROM tracks t_a
                    JOIN track_artists ta_a ON ta_a.track_id = t_a.id
                    JOIN artists ar_t ON ar_t.id = ta_a.artist_id
                    WHERE t_a.album_id = al.id
                )) as artist_names,
                (SELECT t.album_artist FROM tracks t WHERE t.album_id = al.id AND t.album_artist IS NOT NULL LIMIT 1) as raw_album_artist
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
                artist_names: parse_album_artist_names(row, 8),
                album_artist_names: parse_raw_album_artist(row, 9),
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
                (SELECT COALESCE(SUM(duration_ms), 0) FROM tracks WHERE album_id = al.id) as total_duration_ms,
                (SELECT GROUP_CONCAT(name, '|||') FROM (
                    SELECT DISTINCT ar_t.name
                    FROM tracks t_a
                    JOIN track_artists ta_a ON ta_a.track_id = t_a.id
                    JOIN artists ar_t ON ar_t.id = ta_a.artist_id
                    WHERE t_a.album_id = al.id
                )) as artist_names,
                (SELECT t.album_artist FROM tracks t WHERE t.album_id = al.id AND t.album_artist IS NOT NULL LIMIT 1) as raw_album_artist
            FROM albums al
            LEFT JOIN artists ar ON al.artist_id = ar.id
            WHERE al.id IN (
                SELECT DISTINCT t.album_id FROM tracks t
                JOIN track_artists ta ON t.id = ta.track_id
                WHERE ta.artist_id = ?1
                UNION
                SELECT id FROM albums WHERE artist_id = ?1
                UNION
                SELECT DISTINCT t.album_id FROM tracks t
                WHERE t.album_artist LIKE '%' || (SELECT name FROM artists WHERE id = ?1) || '%'
            )
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
                artist_names: parse_album_artist_names(row, 8),
                album_artist_names: parse_raw_album_artist(row, 9),
            })
        })?;

        let mut albums = Vec::new();
        for album in album_iter {
            albums.push(album?);
        }
        Ok(albums)
    }
}
