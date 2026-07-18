use super::DbHelper;
use crate::shared::types::{LibraryAlbum, LibraryTrack, Playlist, SearchResults};
use rusqlite::{params, Result};
use std::collections::HashSet;

impl DbHelper {
    pub fn search(&self, query: &str) -> Result<SearchResults> {
        const SEARCH_LIMIT: i64 = 20;

        let prefix_pattern = format!("{}%", query);
        let infix_pattern = format!("%{}%", query);

        let tracks =
            self.search_tracks_by_pattern(&prefix_pattern, &infix_pattern, SEARCH_LIMIT)?;

        let albums = self.search_albums_infix(&infix_pattern, SEARCH_LIMIT)?;

        let playlists =
            self.search_playlists_by_pattern(&prefix_pattern, &infix_pattern, SEARCH_LIMIT)?;

        Ok(SearchResults {
            tracks,
            albums,
            playlists,
        })
    }

    fn search_tracks_by_pattern(
        &self,
        prefix: &str,
        infix: &str,
        limit: i64,
    ) -> Result<Vec<LibraryTrack>> {
        let prefix_result = self.search_tracks_like(prefix, limit)?;
        if (prefix_result.len() as i64) >= limit {
            return Ok(prefix_result);
        }
        let remaining = limit - prefix_result.len() as i64;
        let infix_result = self.search_tracks_like(infix, remaining)?;
        let mut combined = prefix_result;
        let mut seen: HashSet<i64> = combined.iter().map(|t| t.id).collect();
        for track in infix_result {
            if seen.insert(track.id) {
                combined.push(track);
            }
        }
        Ok(combined)
    }

    fn search_tracks_like(&self, pattern: &str, limit: i64) -> Result<Vec<LibraryTrack>> {
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

        let tracks = stmt
            .query_map(params![pattern, limit], Self::row_to_library_track)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tracks)
    }

    fn search_albums_infix(&self, pattern: &str, limit: i64) -> Result<Vec<LibraryAlbum>> {
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

        let albums = stmt
            .query_map(params![pattern, pattern, limit], |row| {
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
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(albums)
    }

    fn search_playlists_by_pattern(
        &self,
        prefix: &str,
        infix: &str,
        limit: i64,
    ) -> Result<Vec<Playlist>> {
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

        let playlists_prefix: Vec<Playlist> = stmt
            .query_map(params![prefix, limit], |row| {
                Ok(Playlist {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    artwork_path: row.get(3)?,
                    created_at: row.get(4)?,
                    track_count: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

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

        let playlists = stmt
            .query_map(params![infix, limit], |row| {
                Ok(Playlist {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    artwork_path: row.get(3)?,
                    created_at: row.get(4)?,
                    track_count: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(playlists)
    }
}
