use super::DbHelper;
use crate::shared::types::{LibraryTrack, Playlist};
use rusqlite::{params, Result};

use super::tracks::TRACK_SELECT;

impl DbHelper {
    // ------------------------------------------------------------------
    // Create
    // ------------------------------------------------------------------
    pub fn create_playlist(
        &self,
        name: String,
        description: Option<String>,
    ) -> Result<Playlist> {
        self.create_playlist_extended(name, description, false, false)
    }

    pub fn create_system_playlist(
        &self,
        name: String,
        description: Option<String>,
        is_liked: bool,
    ) -> Result<Playlist> {
        self.create_playlist_extended(name, description, true, is_liked)
    }

    fn create_playlist_extended(
        &self,
        name: String,
        description: Option<String>,
        is_system: bool,
        is_liked: bool,
    ) -> Result<Playlist> {
        let mut stmt = self.conn.prepare(
            "INSERT INTO playlists (name, description, is_system, is_liked, pinned)
             VALUES (?1, ?2, ?3, ?4, 1)
             RETURNING id, name, description, artwork_path, created_at, is_liked, is_system, pinned, pinned_at",
        )?;

        let playlist = stmt.query_row(
            params![name, description, is_system as i32, is_liked as i32],
            |row| {
                Ok(Playlist {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    artwork_path: row.get(3)?,
                    created_at: row.get::<_, String>(4)?,
                    is_liked: row.get::<_, i32>(5)? != 0,
                    is_system: row.get::<_, i32>(6)? != 0,
                    pinned: row.get::<_, i32>(7)? != 0,
                    pinned_at: row.get(8)?,
                    track_count: 0,
                })
            },
        )?;

        Ok(playlist)
    }

    // ------------------------------------------------------------------
    // Delete
    // ------------------------------------------------------------------
    pub fn delete_playlist(&self, id: i64) -> Result<()> {
        let is_system: bool = self
            .conn
            .query_row(
                "SELECT is_system FROM playlists WHERE id = ?",
                params![id],
                |row| row.get::<_, i32>(0),
            )
            .map(|v| v != 0)
            .unwrap_or(false);

        if is_system {
            return Err(rusqlite::Error::InvalidParameterName(
                "Cannot delete a system playlist".into(),
            ));
        }

        self.conn
            .execute("DELETE FROM playlists WHERE id = ?", params![id])?;
        Ok(())
    }

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------
    pub fn update_playlist(
        &self,
        id: i64,
        name: String,
        description: Option<String>,
        artwork_path: Option<String>,
    ) -> Result<()> {
        let is_system: bool = self
            .conn
            .query_row(
                "SELECT is_system FROM playlists WHERE id = ?",
                params![id],
                |row| row.get::<_, i32>(0),
            )
            .map(|v| v != 0)
            .unwrap_or(false);

        if is_system {
            // System playlists can only update description (for liked date range, etc.)
            // but NOT name or artwork
            self.conn.execute(
                "UPDATE playlists SET description = ? WHERE id = ?",
                params![description, id],
            )?;
        } else {
            self.conn.execute(
                "UPDATE playlists SET name = ?, description = ?, artwork_path = ? WHERE id = ?",
                params![name, description, artwork_path, id],
            )?;
        }
        Ok(())
    }

    pub fn toggle_pin_playlist(&self, id: i64, pinned: bool) -> Result<()> {
        if pinned {
            self.conn.execute(
                "UPDATE playlists SET pinned = 1, pinned_at = datetime('now') WHERE id = ?",
                params![id],
            )?;
        } else {
            self.conn.execute(
                "UPDATE playlists SET pinned = 0, pinned_at = NULL WHERE id = ?",
                params![id],
            )?;
        }
        Ok(())
    }

    // ------------------------------------------------------------------
    // Query
    // ------------------------------------------------------------------
    fn playlist_from_row(row: &rusqlite::Row) -> rusqlite::Result<Playlist> {
        Ok(Playlist {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            artwork_path: row.get(3)?,
            created_at: row.get::<_, String>(4)?,
            track_count: row.get(5)?,
            is_liked: row.get::<_, i32>(6)? != 0,
            is_system: row.get::<_, i32>(7)? != 0,
            pinned: row.get::<_, i32>(8)? != 0,
            pinned_at: row.get(9)?,
        })
    }

    pub fn get_playlists(&self) -> Result<Vec<Playlist>> {
        // Ensure the Liked Music system playlist exists for this profile
        let _ = self.ensure_liked_playlist();

        let mut stmt = self.conn.prepare(
            "SELECT
                p.id,
                p.name,
                p.description,
                p.artwork_path,
                p.created_at,
                COUNT(pt.id) as track_count,
                p.is_liked,
                p.is_system,
                p.pinned,
                p.pinned_at
            FROM playlists p
            LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
            GROUP BY p.id
            ORDER BY p.pinned DESC, p.pinned_at DESC, p.name ASC",
        )?;

        let playlist_iter = stmt.query_map([], Self::playlist_from_row)?;

        let mut playlists = Vec::new();
        for playlist in playlist_iter {
            playlists.push(playlist?);
        }

        Ok(playlists)
    }

    pub fn get_playlist_tracks(&self, playlist_id: i64) -> Result<Vec<LibraryTrack>> {
        let query = format!(
            "{} JOIN playlist_tracks pt ON t.id = pt.track_id WHERE pt.playlist_id = ? GROUP BY t.id, pt.position ORDER BY pt.position ASC",
            TRACK_SELECT
        );
        let mut stmt = self.conn.prepare(&query)?;

        let tracks = stmt
            .query_map(params![playlist_id], Self::row_to_library_track)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tracks)
    }

    // ------------------------------------------------------------------
    // Liked playlist management
    // ------------------------------------------------------------------
    /// Returns the liked playlist for this profile, creating it if needed.
    pub fn ensure_liked_playlist(&self) -> Result<Playlist> {
        // Try to find existing liked playlist
        let existing: std::result::Result<Playlist, _> = self.conn.query_row(
            "SELECT
                p.id, p.name, p.description, p.artwork_path, p.created_at,
                COUNT(pt.id),
                p.is_liked, p.is_system, p.pinned, p.pinned_at
             FROM playlists p
             LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
             WHERE p.is_liked = 1 AND p.is_system = 1
             GROUP BY p.id
             LIMIT 1",
            [],
            Self::playlist_from_row,
        );

        if let Ok(playlist) = existing {
            return Ok(playlist);
        }

        // Create the liked playlist
        self.create_system_playlist("Liked Music".into(), Some("Tracks you've liked".into()), true)
    }

    /// Toggle a track's liked status. Returns true if now liked, false if unliked.
    pub fn toggle_liked_track(&self, track_id: i64) -> Result<bool> {
        let liked = self.ensure_liked_playlist()?;

        let exists: bool = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?",
                params![liked.id, track_id],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .unwrap_or(false);

        if exists {
            self.conn.execute(
                "DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?",
                params![liked.id, track_id],
            )?;
            Ok(false)
        } else {
            let count: i64 = self.conn.query_row(
                "SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ?",
                params![liked.id],
                |row| row.get(0),
            )?;
            self.conn.execute(
                "INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)",
                params![liked.id, track_id, count],
            )?;
            Ok(true)
        }
    }

    /// Returns all track IDs in the liked playlist.
    pub fn get_liked_track_ids(&self) -> Result<Vec<i64>> {
        let liked = self.ensure_liked_playlist()?;

        let mut stmt = self.conn.prepare(
            "SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC",
        )?;

        let ids = stmt
            .query_map(params![liked.id], |row| row.get::<_, i64>(0))?
            .collect::<Result<Vec<_>>>()?;

        Ok(ids)
    }

    // ------------------------------------------------------------------
    // Track-level operations (delegated for liked)
    // ------------------------------------------------------------------
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
        if new_order.is_empty() {
            return Ok(());
        }

        let tx = self.conn.transaction()?;

        let cases: Vec<String> = new_order
            .iter()
            .map(|_| "WHEN ? THEN ?".to_string())
            .collect();
        let in_placeholders: Vec<&str> = vec!["?"; new_order.len()];
        let sql = format!(
            "UPDATE playlist_tracks SET position = CASE track_id {} END WHERE playlist_id = ? AND track_id IN ({})",
            cases.join(" "),
            in_placeholders.join(",")
        );

        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        for (index, track_id) in new_order.iter().enumerate() {
            params.push(Box::new(*track_id));
            params.push(Box::new(index as i64));
        }
        params.push(Box::new(playlist_id));
        for track_id in &new_order {
            params.push(Box::new(*track_id));
        }

        tx.execute(&sql, rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())))?;
        tx.commit()?;
        Ok(())
    }
}
