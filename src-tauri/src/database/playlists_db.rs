use super::DbHelper;
use crate::shared::types::{LibraryTrack, Playlist};
use rusqlite::{params, Result};

impl DbHelper {
    pub fn create_playlist(&self, name: String, description: Option<String>) -> Result<Playlist> {
        let mut stmt = self.conn.prepare(
            "INSERT INTO playlists (name, description) VALUES (?, ?) RETURNING id, name, description, created_at",
        )?;

        let playlist = stmt.query_row(params![name, description], |row| {
            Ok(Playlist {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                artwork_path: None,
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

    pub fn get_playlists(&self) -> Result<Vec<Playlist>> {
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
            Ok(Playlist {
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

    pub fn get_playlist_tracks(&self, playlist_id: i64) -> Result<Vec<LibraryTrack>> {
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
                al.artwork_path,
                GROUP_CONCAT(ta.role, '|||') as artist_roles
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

        let tracks = stmt
            .query_map(params![playlist_id], Self::row_to_library_track)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tracks)
    }

    pub fn add_track_to_playlist(&self, playlist_id: i64, track_id: i64) -> Result<()> {
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
}
