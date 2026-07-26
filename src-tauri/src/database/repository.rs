use std::collections::HashMap;

use rusqlite::{Result as SqlResult, Transaction};

use crate::shared::error::AppError;
use crate::shared::types::{
    ActivityPoint, Artist, DayNightSplit, HeatmapPoint, LibraryAlbum, LibraryTrack, Playlist,
    SearchResults, StreaksData, TopAlbum, TopArtist, TopGenre, TopTrack,
    TrackMetadata, TrendsData, WeeklyWrapData,
};
use super::DbHelper;

pub trait TrackRepository {
    fn get_all_tracks(conn: &DbHelper) -> Result<Vec<LibraryTrack>, AppError>;
    fn get_album_tracks(conn: &DbHelper, album_id: i64) -> Result<Vec<LibraryTrack>, AppError>;
    fn get_artist_tracks(conn: &DbHelper, artist_id: i64) -> Result<Vec<LibraryTrack>, AppError>;
    fn upsert_track(conn: &mut DbHelper, metadata: TrackMetadata) -> Result<i64, AppError>;
    fn delete_track(conn: &mut DbHelper, id: i64) -> Result<(), AppError>;
    fn delete_tracks(conn: &mut DbHelper, ids: &[i64]) -> Result<(), AppError>;
    fn get_existing_metadata(
        conn: &DbHelper,
        paths: &[String],
    ) -> Result<HashMap<String, (i64, i64)>, AppError>;
    fn check_files_exist(conn: &DbHelper) -> Result<Vec<(i64, String)>, AppError>;
    fn prune_missing_tracks(conn: &mut DbHelper, ids: &[i64]) -> Result<Vec<String>, AppError>;
    /// Batch: find multiple tracks by IDs (for batch operations feature)
    fn find_by_ids(conn: &DbHelper, _ids: &[i64]) -> Result<Vec<LibraryTrack>, AppError> {
        let _ = conn;
        Err(AppError::Internal("find_by_ids not implemented yet".to_string()))
    }
    /// Batch: update multiple tracks' metadata (for batch tag editor feature)
    fn update_many(conn: &mut DbHelper, updates: &[()]) -> Result<(), AppError> {
        let _ = (conn, updates);
        Err(AppError::Internal("update_many not implemented yet".to_string()))
    }
}

impl TrackRepository for DbHelper {
    fn get_all_tracks(conn: &DbHelper) -> Result<Vec<LibraryTrack>, AppError> {
        conn.get_all_tracks().map_err(AppError::from)
    }

    fn get_album_tracks(conn: &DbHelper, album_id: i64) -> Result<Vec<LibraryTrack>, AppError> {
        conn.get_album_tracks(album_id).map_err(AppError::from)
    }

    fn get_artist_tracks(conn: &DbHelper, artist_id: i64) -> Result<Vec<LibraryTrack>, AppError> {
        conn.get_artist_tracks(artist_id).map_err(AppError::from)
    }

    fn upsert_track(conn: &mut DbHelper, metadata: TrackMetadata) -> Result<i64, AppError> {
        let tx = conn
            .get_conn_mut()
            .transaction()
            .map_err(AppError::from)?;
        DbHelper::upsert_track(&tx, &metadata).map_err(AppError::from)?;
        let id = tx.last_insert_rowid();
        tx.commit().map_err(AppError::from)?;
        Ok(id)
    }

    fn delete_track(conn: &mut DbHelper, id: i64) -> Result<(), AppError> {
        conn.delete_track(id).map_err(AppError::from)
    }

    fn delete_tracks(conn: &mut DbHelper, ids: &[i64]) -> Result<(), AppError> {
        if ids.is_empty() {
            return Ok(());
        }
        let tx = conn
            .get_conn_mut()
            .transaction()
            .map_err(AppError::from)?;
        DbHelper::delete_tracks(&tx, ids).map_err(AppError::from)?;
        tx.commit().map_err(AppError::from)?;
        Ok(())
    }

    fn get_existing_metadata(
        conn: &DbHelper,
        _paths: &[String],
    ) -> Result<HashMap<String, (i64, i64)>, AppError> {
        let list = conn.get_existing_metadata().map_err(AppError::from)?;
        let mut map = HashMap::with_capacity(list.len());
        for (path, size, mtime) in list {
            map.insert(path, (size as i64, mtime as i64));
        }
        Ok(map)
    }

    fn check_files_exist(conn: &DbHelper) -> Result<Vec<(i64, String)>, AppError> {
        conn.get_all_track_paths().map_err(AppError::from)
    }

    fn prune_missing_tracks(conn: &mut DbHelper, ids: &[i64]) -> Result<Vec<String>, AppError> {
        let all_tracks = conn.get_all_track_paths().map_err(AppError::from)?;
        let id_set: std::collections::HashSet<i64> = ids.iter().copied().collect();
        let to_prune: Vec<(i64, String)> = all_tracks
            .into_iter()
            .filter(|(id, _)| id_set.contains(id))
            .collect();
        let deleted_paths: Vec<String> = to_prune.iter().map(|(_, p)| p.clone()).collect();

        let ids_to_delete: Vec<i64> = to_prune.into_iter().map(|(id, _)| id).collect();
        let tx = conn
            .get_conn_mut()
            .transaction()
            .map_err(AppError::from)?;
        DbHelper::delete_tracks(&tx, &ids_to_delete).map_err(AppError::from)?;
        tx.commit().map_err(AppError::from)?;
        Ok(deleted_paths)
    }
}

pub trait AlbumRepository {
    fn get_all_albums(conn: &DbHelper) -> Result<Vec<LibraryAlbum>, AppError>;
    fn get_album_by_id(conn: &DbHelper, album_id: i64) -> Result<Option<LibraryAlbum>, AppError>;
    fn get_album_tracks(conn: &DbHelper, album_id: i64) -> Result<Vec<LibraryTrack>, AppError>;
    fn get_artist_albums(conn: &DbHelper, artist_id: i64) -> Result<Vec<LibraryAlbum>, AppError>;
    fn upsert_album(conn: &mut DbHelper, metadata: &TrackMetadata) -> Result<i64, AppError>;
    /// Batch: delete multiple albums by IDs
    fn delete_many(conn: &mut DbHelper, ids: &[i64]) -> Result<(), AppError> {
        let _ = (conn, ids);
        Err(AppError::Internal("delete_many not implemented yet".to_string()))
    }
}

impl AlbumRepository for DbHelper {
    fn get_all_albums(conn: &DbHelper) -> Result<Vec<LibraryAlbum>, AppError> {
        conn.get_all_albums().map_err(AppError::from)
    }

    fn get_album_by_id(
        conn: &DbHelper,
        album_id: i64,
    ) -> Result<Option<LibraryAlbum>, AppError> {
        conn.get_album_by_id(album_id).map_err(AppError::from)
    }

    fn get_album_tracks(conn: &DbHelper, album_id: i64) -> Result<Vec<LibraryTrack>, AppError> {
        conn.get_album_tracks(album_id).map_err(AppError::from)
    }

    fn get_artist_albums(
        conn: &DbHelper,
        artist_id: i64,
    ) -> Result<Vec<LibraryAlbum>, AppError> {
        conn.get_artist_albums(artist_id).map_err(AppError::from)
    }

    fn upsert_album(conn: &mut DbHelper, metadata: &TrackMetadata) -> Result<i64, AppError> {
        let _artist_id = if let Some(artist) = &metadata.artist {
            let parsed = crate::scanner::metadata::parse_artists(Some(artist));
            if let Some(first) = parsed.first() {
                let tx: Transaction = conn
                    .get_conn_mut()
                    .transaction()
                    .map_err(AppError::from)?;
                let id = DbHelper::get_or_create_artist(&tx, first).map_err(AppError::from)?;
                tx.commit().map_err(AppError::from)?;
                Some(id)
            } else {
                None
            }
        } else {
            None
        };

        let album_artist_id = if let Some(album_artist) = &metadata.album_artist {
            let parsed = crate::scanner::metadata::parse_artists(Some(album_artist));
            if let Some(first) = parsed.first() {
                let tx: Transaction = conn
                    .get_conn_mut()
                    .transaction()
                    .map_err(AppError::from)?;
                let id = DbHelper::get_or_create_artist(&tx, first).map_err(AppError::from)?;
                tx.commit().map_err(AppError::from)?;
                Some(id)
            } else {
                None
            }
        } else {
            None
        };

        let tx = conn
            .get_conn_mut()
            .transaction()
            .map_err(AppError::from)?;
        let album_id = DbHelper::get_or_create_album(
            &tx,
            metadata.album.as_deref().unwrap_or("Unknown"),
            album_artist_id,
            metadata.year,
            metadata.artwork_path.as_ref(),
        )
        .map_err(AppError::from)?;
        tx.commit().map_err(AppError::from)?;
        Ok(album_id)
    }
}

pub trait ArtistRepository {
    fn get_all_artists(conn: &DbHelper) -> Result<Vec<Artist>, AppError>;
    fn get_artist_by_id(conn: &DbHelper, artist_id: i64) -> Result<Option<Artist>, AppError>;
    fn upsert_artist(conn: &mut DbHelper, name: &str) -> Result<i64, AppError>;
    /// Batch: delete multiple artists by IDs
    fn delete_many(conn: &mut DbHelper, ids: &[i64]) -> Result<(), AppError> {
        let _ = (conn, ids);
        Err(AppError::Internal("delete_many not implemented yet".to_string()))
    }
}

impl ArtistRepository for DbHelper {
    fn get_all_artists(conn: &DbHelper) -> Result<Vec<Artist>, AppError> {
        conn.get_all_artists().map_err(AppError::from)
    }

    fn get_artist_by_id(
        conn: &DbHelper,
        artist_id: i64,
    ) -> Result<Option<Artist>, AppError> {
        conn.get_artist_by_id(artist_id).map_err(AppError::from)
    }

    fn upsert_artist(conn: &mut DbHelper, name: &str) -> Result<i64, AppError> {
        let tx: Transaction = conn
            .get_conn_mut()
            .transaction()
            .map_err(AppError::from)?;
        let id = DbHelper::get_or_create_artist(&tx, name).map_err(AppError::from)?;
        tx.commit().map_err(AppError::from)?;
        Ok(id)
    }
}

pub trait PlaylistDbRepository {
    fn get_playlists(conn: &DbHelper) -> Result<Vec<Playlist>, AppError>;
    fn get_playlist_tracks(
        conn: &DbHelper,
        playlist_id: i64,
    ) -> Result<Vec<LibraryTrack>, AppError>;
    fn create_playlist(
        conn: &mut DbHelper,
        name: &str,
        description: &str,
    ) -> Result<Playlist, AppError>;
    fn update_playlist(
        conn: &mut DbHelper,
        id: i64,
        name: &str,
        description: &str,
    ) -> Result<(), AppError>;
    fn delete_playlist(conn: &mut DbHelper, id: i64) -> Result<(), AppError>;
    fn add_track_to_playlist(
        conn: &mut DbHelper,
        playlist_id: i64,
        track_id: i64,
    ) -> Result<(), AppError>;
    fn remove_track_from_playlist(
        conn: &mut DbHelper,
        playlist_id: i64,
        track_id: i64,
    ) -> Result<(), AppError>;
    fn reorder_playlist(
        conn: &mut DbHelper,
        playlist_id: i64,
        track_ids: Vec<i64>,
    ) -> Result<(), AppError>;
    fn add_tracks_to_playlist(
        conn: &mut DbHelper,
        playlist_id: i64,
        track_ids: &[i64],
    ) -> Result<(), AppError>;
}

impl PlaylistDbRepository for DbHelper {
    fn get_playlists(conn: &DbHelper) -> Result<Vec<Playlist>, AppError> {
        conn.get_playlists().map_err(AppError::from)
    }

    fn get_playlist_tracks(
        conn: &DbHelper,
        playlist_id: i64,
    ) -> Result<Vec<LibraryTrack>, AppError> {
        conn.get_playlist_tracks(playlist_id).map_err(AppError::from)
    }

    fn create_playlist(
        conn: &mut DbHelper,
        name: &str,
        description: &str,
    ) -> Result<Playlist, AppError> {
        conn.create_playlist(name.to_string(), Some(description.to_string()))
            .map_err(AppError::from)
    }

    fn update_playlist(
        conn: &mut DbHelper,
        id: i64,
        name: &str,
        description: &str,
    ) -> Result<(), AppError> {
        conn.update_playlist(id, name.to_string(), Some(description.to_string()), None)
            .map_err(AppError::from)
    }

    fn delete_playlist(conn: &mut DbHelper, id: i64) -> Result<(), AppError> {
        conn.delete_playlist(id).map_err(AppError::from)
    }

    fn add_track_to_playlist(
        conn: &mut DbHelper,
        playlist_id: i64,
        track_id: i64,
    ) -> Result<(), AppError> {
        conn.add_track_to_playlist(playlist_id, track_id)
            .map_err(AppError::from)
    }

    fn remove_track_from_playlist(
        conn: &mut DbHelper,
        playlist_id: i64,
        track_id: i64,
    ) -> Result<(), AppError> {
        conn.remove_track_from_playlist(playlist_id, track_id)
            .map_err(AppError::from)
    }

    fn reorder_playlist(
        conn: &mut DbHelper,
        playlist_id: i64,
        track_ids: Vec<i64>,
    ) -> Result<(), AppError> {
        conn.reorder_playlist(playlist_id, track_ids)
            .map_err(AppError::from)
    }

    fn add_tracks_to_playlist(
        conn: &mut DbHelper,
        playlist_id: i64,
        track_ids: &[i64],
    ) -> Result<(), AppError> {
        for track_id in track_ids {
            conn.add_track_to_playlist(playlist_id, *track_id)
                .map_err(AppError::from)?;
        }
        Ok(())
    }
}

pub trait SearchRepository {
    fn search(conn: &DbHelper, query: &str) -> Result<SearchResults, AppError>;
}

impl SearchRepository for DbHelper {
    fn search(conn: &DbHelper, query: &str) -> Result<SearchResults, AppError> {
        conn.search(query).map_err(AppError::from)
    }
}

pub trait StatsRepository {
    fn record_playback(conn: &mut DbHelper, track_id: i64, duration_ms: i64) -> SqlResult<()>;
    fn get_top_tracks(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<TopTrack>>;
    fn get_top_artists(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<TopArtist>>;
    fn get_top_albums(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<TopAlbum>>;
    fn get_activity_history(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<ActivityPoint>>;
    fn get_top_genres(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<TopGenre>>;
    fn get_total_stats(conn: &DbHelper, start_timestamp: i64) -> SqlResult<(i64, i64)>;
    fn get_heatmap_data(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<HeatmapPoint>>;
    fn get_trends_data(conn: &DbHelper, start_timestamp: i64, prev_start: i64) -> SqlResult<TrendsData>;
    fn get_streaks_data(conn: &DbHelper, start_timestamp: i64) -> SqlResult<StreaksData>;
    fn get_day_night_split(conn: &DbHelper, start_timestamp: i64) -> SqlResult<DayNightSplit>;
    fn get_weekly_wrap(conn: &DbHelper, start_timestamp: i64) -> SqlResult<WeeklyWrapData>;
}

impl StatsRepository for DbHelper {
    fn record_playback(conn: &mut DbHelper, track_id: i64, duration_ms: i64) -> SqlResult<()> {
        conn.record_playback(track_id, duration_ms)
    }

    fn get_top_tracks(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<TopTrack>> {
        let c = conn.get_conn();
        let mut stmt = c.prepare(
            "SELECT
                t.id, t.title, ar.name, al.artwork_path, t.file_path,
                COUNT(ph.id) as play_count,
                t.duration_ms
             FROM playback_history ph
             JOIN tracks t ON ph.track_id = t.id
             LEFT JOIN artists ar ON t.artist_id = ar.id
             LEFT JOIN albums al ON t.album_id = al.id
             WHERE ph.timestamp >= ?
             GROUP BY t.id
             ORDER BY play_count DESC
             LIMIT 10",
        )?;
        let iter = stmt.query_map([start_timestamp], |row| {
            Ok(TopTrack {
                id: row.get::<usize, i64>(0)?,
                title: row.get::<usize, String>(1)?,
                artist: row
                    .get::<usize, Option<String>>(2)?
                    .unwrap_or("Unknown".to_string()),
                cover_image: row.get::<usize, Option<String>>(3)?,
                file_path: row.get::<usize, String>(4)?,
                play_count: row.get::<usize, i64>(5)?,
                duration_ms: row.get::<usize, i64>(6)?,
            })
        })?;
        iter.collect::<Result<Vec<_>, _>>()
    }

    fn get_top_artists(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<TopArtist>> {
        let c = conn.get_conn();
        let mut stmt = c.prepare(
            "SELECT
                ar.id, ar.name,
                (SELECT artwork_path FROM albums WHERE artist_id = ar.id ORDER BY year DESC LIMIT 1) as artwork_path,
                COUNT(ph.id) as play_count
             FROM playback_history ph
             JOIN tracks t ON ph.track_id = t.id
             JOIN artists ar ON t.artist_id = ar.id
             WHERE ph.timestamp >= ?
             GROUP BY ar.id
             ORDER BY play_count DESC
             LIMIT 10",
        )?;
        let iter = stmt.query_map([start_timestamp], |row| {
            Ok(TopArtist {
                id: row.get::<usize, i64>(0)?,
                name: row.get::<usize, String>(1)?,
                cover_image: row.get::<usize, Option<String>>(2)?,
                play_count: row.get::<usize, i64>(3)?,
            })
        })?;
        iter.collect::<Result<Vec<_>, _>>()
    }

    fn get_top_albums(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<TopAlbum>> {
        let c = conn.get_conn();
        let mut stmt = c.prepare(
            "SELECT
                al.id, al.title, ar.name, al.artwork_path,
                COUNT(ph.id) as play_count
             FROM playback_history ph
             JOIN tracks t ON ph.track_id = t.id
             JOIN albums al ON t.album_id = al.id
             LEFT JOIN artists ar ON al.artist_id = ar.id
             WHERE ph.timestamp >= ?
             GROUP BY al.id
             ORDER BY play_count DESC
             LIMIT 10",
        )?;
        let iter = stmt.query_map([start_timestamp], |row| {
            Ok(TopAlbum {
                id: row.get::<usize, i64>(0)?,
                title: row.get::<usize, String>(1)?,
                artist: row
                    .get::<usize, Option<String>>(2)?
                    .unwrap_or("Unknown".to_string()),
                cover_image: row.get::<usize, Option<String>>(3)?,
                play_count: row.get::<usize, i64>(4)?,
            })
        })?;
        iter.collect::<Result<Vec<_>, _>>()
    }

    fn get_activity_history(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<ActivityPoint>> {
        let c = conn.get_conn();
        let mut stmt = c.prepare(
            "SELECT
                date(timestamp, 'unixepoch', 'localtime') as day,
                SUM(duration_ms) as total_duration
             FROM playback_history
             WHERE timestamp >= ?
             GROUP BY day
             ORDER BY day ASC",
        )?;
        let iter = stmt.query_map([start_timestamp], |row| {
            Ok(ActivityPoint {
                date: row.get::<usize, String>(0)?,
                duration_ms: row.get::<usize, i64>(1)?,
            })
        })?;
        iter.collect::<Result<Vec<_>, _>>()
    }

    fn get_top_genres(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<TopGenre>> {
        let c = conn.get_conn();
        let mut stmt = c.prepare(
            "SELECT
                t.genre,
                COUNT(ph.id) as play_count
             FROM playback_history ph
             JOIN tracks t ON ph.track_id = t.id
             WHERE t.genre IS NOT NULL AND t.genre != '' AND ph.timestamp >= ?
             GROUP BY t.genre
             ORDER BY play_count DESC
             LIMIT 5",
        )?;
        let iter = stmt.query_map([start_timestamp], |row| {
            Ok(TopGenre {
                genre: row.get::<usize, String>(0)?,
                play_count: row.get::<usize, i64>(1)?,
            })
        })?;
        iter.collect::<Result<Vec<_>, _>>()
    }

    fn get_total_stats(conn: &DbHelper, start_timestamp: i64) -> SqlResult<(i64, i64)> {
        let c = conn.get_conn();
        c.query_row(
            "SELECT COALESCE(SUM(duration_ms), 0), COUNT(id) FROM playback_history WHERE timestamp >= ?",
            [start_timestamp],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
    }

    fn get_heatmap_data(conn: &DbHelper, start_timestamp: i64) -> SqlResult<Vec<HeatmapPoint>> {
        let c = conn.get_conn();
        let mut stmt = c.prepare(
            "SELECT
                CAST(strftime('%w', timestamp, 'unixepoch', 'localtime') AS INTEGER) as day_of_week,
                CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) as hour_of_day,
                COUNT(*) as frequency
             FROM playback_history
             WHERE timestamp >= ?
             GROUP BY day_of_week, hour_of_day
             ORDER BY day_of_week ASC, hour_of_day ASC",
        )?;
        let iter = stmt.query_map([start_timestamp], |row| {
            let intensity: u32 = row.get::<usize, u32>(2)?;
            Ok(HeatmapPoint {
                day: row.get::<usize, u8>(0)?,
                hour: row.get::<usize, u8>(1)?,
                intensity,
                normalized: 0.0,
            })
        })?;
        iter.collect::<Result<Vec<_>, _>>()
    }

    fn get_trends_data(
        conn: &DbHelper,
        start_timestamp: i64,
        prev_start: i64,
    ) -> SqlResult<TrendsData> {
        let c = conn.get_conn();

        let (current_total_time, current_play_count): (i64, i64) = c.query_row(
            "SELECT COALESCE(SUM(duration_ms), 0), COUNT(id) FROM playback_history WHERE timestamp >= ?",
            [start_timestamp],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        let (prev_total_time, prev_play_count): (i64, i64) = c
            .query_row(
                "SELECT
                COALESCE(SUM(ph.duration_ms), 0),
                    COUNT(id)
                 FROM playback_history
                 WHERE timestamp >= ? AND timestamp < ?",
                [prev_start, start_timestamp],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap_or((0, 0));

        let calc_change = |current: i64, prev: i64| -> f64 {
            if prev == 0 {
                if current > 0 { 100.0 } else { 0.0 }
            } else {
                ((current as f64 - prev as f64) / prev as f64) * 100.0
            }
        };

        let listening_time_change = calc_change(current_total_time, prev_total_time);
        let play_count_change = calc_change(current_play_count, prev_play_count);

        let new_artists_count: i64 = c
            .query_row(
                "SELECT COUNT(DISTINCT t.artist_id)
                 FROM playback_history ph
                 JOIN tracks t ON ph.track_id = t.id
                 WHERE ph.timestamp >= ?
                 AND t.artist_id NOT IN (
                    SELECT DISTINCT t2.artist_id
                    FROM playback_history ph2
                    JOIN tracks t2 ON ph2.track_id = t2.id
                    WHERE ph2.timestamp < ?
                 )",
                [start_timestamp, start_timestamp],
                |row| row.get(0),
            )
            .unwrap_or(0);

        Ok(TrendsData {
            listening_time_change,
            play_count_change,
            new_artists_count,
        })
    }

    fn get_streaks_data(conn: &DbHelper, start_timestamp: i64) -> SqlResult<StreaksData> {
        let c = conn.get_conn();
        let mut stmt = c.prepare(
            "SELECT DISTINCT date(timestamp, 'unixepoch', 'localtime') as play_date
             FROM playback_history
             WHERE timestamp >= ?
             ORDER BY play_date ASC",
        )?;
        let streak_dates: Vec<String> = stmt
            .query_map([start_timestamp], |row| row.get::<usize, String>(0))?
            .filter_map(|r| r.ok())
            .collect();

        let (current_streak, longest_streak) =
            crate::stats::queries::calculate_streaks(&streak_dates);
        let week_days = crate::stats::queries::generate_week_days(
            &streak_dates,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or(std::time::Duration::ZERO)
                .as_secs() as i64,
        );

        Ok(StreaksData {
            current_streak,
            longest_streak,
            week_days,
        })
    }

    fn get_day_night_split(conn: &DbHelper, start_timestamp: i64) -> SqlResult<DayNightSplit> {
        let c = conn.get_conn();
        let (day_count, night_count): (i64, i64) = c
            .query_row(
                "SELECT
                COUNT(*) FILTER (WHERE CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) BETWEEN 6 AND 17),
                COUNT(*) FILTER (WHERE CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) >= 18 OR CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) < 6)
             FROM playback_history
             WHERE timestamp >= ?",
                [start_timestamp],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap_or((0, 0));

        let total_dn = (day_count + night_count) as f64;
        let (day_percentage, night_percentage) = if total_dn > 0.0 {
            (
                (day_count as f64 / total_dn) * 100.0,
                (night_count as f64 / total_dn) * 100.0,
            )
        } else {
            (0.0, 0.0)
        };

        Ok(DayNightSplit {
            day_plays: day_count,
            night_plays: night_count,
            day_percentage,
            night_percentage,
        })
    }

    fn get_weekly_wrap(conn: &DbHelper, start_timestamp: i64) -> SqlResult<WeeklyWrapData> {
        let c = conn.get_conn();
        let (ww_total_plays, ww_total_time, ww_unique_tracks, ww_unique_artists): (
            i64,
            i64,
            i64,
            i64,
        ) = c.query_row(
            "SELECT
                COUNT(*),
                COALESCE(SUM(ph.duration_ms), 0),
                COUNT(DISTINCT track_id),
                COUNT(DISTINCT t.artist_id)
             FROM playback_history ph
             JOIN tracks t ON ph.track_id = t.id
             WHERE ph.timestamp >= ?",
            [start_timestamp],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )?;

        let ww_top_track: Option<String> = c
            .query_row(
                "SELECT t.title
             FROM playback_history ph
             JOIN tracks t ON ph.track_id = t.id
             WHERE ph.timestamp >= ?
             GROUP BY t.id
             ORDER BY COUNT(ph.id) DESC
             LIMIT 1",
                [start_timestamp],
                |row| row.get(0),
            )
            .ok();

        let ww_top_artist: Option<String> = c
            .query_row(
                "SELECT ar.name
             FROM playback_history ph
             JOIN tracks t ON ph.track_id = t.id
             JOIN artists ar ON t.artist_id = ar.id
             WHERE ph.timestamp >= ?
             GROUP BY ar.id
             ORDER BY COUNT(ph.id) DESC
             LIMIT 1",
                [start_timestamp],
                |row| row.get(0),
            )
            .ok();

        let (ww_most_active_day, ww_most_active_plays): (Option<String>, i64) = c
            .query_row(
                "SELECT date(timestamp, 'unixepoch', 'localtime') as day, COUNT(*) as cnt
             FROM playback_history
             WHERE timestamp >= ?
             GROUP BY day
             ORDER BY cnt DESC
             LIMIT 1",
                [start_timestamp],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap_or((None, 0));

        Ok(WeeklyWrapData {
            total_plays: ww_total_plays,
            total_listening_ms: ww_total_time,
            unique_tracks: ww_unique_tracks,
            unique_artists: ww_unique_artists,
            top_track: ww_top_track,
            top_artist: ww_top_artist,
            most_active_day: ww_most_active_day,
            most_active_day_plays: ww_most_active_plays,
        })
    }
}
