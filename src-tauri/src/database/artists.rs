use super::DbHelper;
use crate::shared::types::Artist;
use rusqlite::{params, Result};

impl DbHelper {
    pub fn get_all_artists(&self) -> Result<Vec<Artist>> {
        let mut stmt = self.conn.prepare(
            "WITH ranked_artwork AS (
                SELECT artist_id, artwork_path, year,
                       ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY year DESC) as rn
                FROM (
                    SELECT ta.artist_id, al.artwork_path, al.year
                    FROM track_artists ta
                    JOIN tracks t ON t.id = ta.track_id
                    JOIN albums al ON al.id = t.album_id
                    WHERE al.artwork_path IS NOT NULL
                    UNION
                    SELECT artist_id, artwork_path, year
                    FROM albums
                    WHERE artwork_path IS NOT NULL AND artist_id IS NOT NULL
                )
            )
            SELECT
                a.id,
                a.name,
                (SELECT COUNT(*) FROM (
                    SELECT t.album_id FROM track_artists ta2
                    JOIN tracks t ON t.id = ta2.track_id
                    WHERE ta2.artist_id = a.id
                    UNION
                    SELECT id FROM albums WHERE artist_id = a.id
                    UNION
                    SELECT DISTINCT t.album_id FROM tracks t
                    WHERE t.album_artist LIKE '%' || a.name || '%'
                )) as album_count,
                COUNT(DISTINCT ta.track_id) as track_count,
                art.artwork_path
            FROM artists a
            LEFT JOIN track_artists ta ON ta.artist_id = a.id
            LEFT JOIN ranked_artwork art ON art.artist_id = a.id AND art.rn = 1
            GROUP BY a.id
            ORDER BY a.name ASC",
        )?;

        let artist_iter = stmt.query_map([], |row| {
            Ok(Artist {
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
            if a.track_count > 0 {
                artists.push(a);
            }
        }
        Ok(artists)
    }

    pub fn get_artist_by_id(&self, id: i64) -> Result<Option<Artist>> {
        let mut stmt = self.conn.prepare(
            "SELECT
                a.id,
                a.name,
                (SELECT COUNT(*) FROM (
                    SELECT t.album_id FROM track_artists ta
                    JOIN tracks t ON t.id = ta.track_id
                    WHERE ta.artist_id = a.id
                    UNION
                    SELECT id FROM albums WHERE artist_id = a.id
                    UNION
                    SELECT DISTINCT t.album_id FROM tracks t
                    WHERE t.album_artist LIKE '%' || a.name || '%'
                )) as album_count,
                (SELECT COUNT(*) FROM track_artists WHERE artist_id = a.id) as track_count,
                (SELECT artwork_path FROM (
                    SELECT al.artwork_path, al.year
                    FROM track_artists ta
                    JOIN tracks t ON t.id = ta.track_id
                    JOIN albums al ON al.id = t.album_id
                    WHERE ta.artist_id = a.id AND al.artwork_path IS NOT NULL
                    UNION
                    SELECT artwork_path, year
                    FROM albums WHERE artist_id = a.id AND artwork_path IS NOT NULL
                    UNION
                    SELECT DISTINCT al.artwork_path, al.year
                    FROM tracks t
                    JOIN albums al ON al.id = t.album_id
                    WHERE t.album_artist LIKE '%' || a.name || '%' AND al.artwork_path IS NOT NULL
                ) ORDER BY year DESC LIMIT 1) as artwork_path
            FROM artists a
            WHERE a.id = ?",
        )?;

        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Artist {
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
}
