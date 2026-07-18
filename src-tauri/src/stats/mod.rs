//! Stats feature — playback analytics, trends, streaks, and listening patterns.
//!
//! Sub-modules:
//! - [`types`]: Re-exports from the shared type registry
//! - [`queries`]: Helper functions for streak calculation and week-day generation

pub mod queries;
#[cfg(test)]
mod tests;
pub mod types;

use crate::profile::with_db;
use crate::shared::types::{
    ActivityPoint, DayNightSplit, HeatmapPoint, StatsData, StreaksData, TopAlbum, TopArtist,
    TopGenre, TopTrack, TrendsData, WeeklyWrapData,
};
use tauri::AppHandle;

/// Records a playback event in the history table.
#[tauri::command]
pub async fn record_playback(
    app: AppHandle,
    track_id: i64,
    duration_ms: i64,
) -> Result<(), String> {
    with_db(&app, |db| db.record_playback(track_id, duration_ms))
}

/// Returns aggregated listening statistics for the given time range.
#[tauri::command]
pub async fn get_stats(app: AppHandle, time_range: Option<String>) -> Result<StatsData, String> {
    with_db(&app, |db| {
        let conn = db.get_conn();

        let range = time_range.as_deref().unwrap_or("all");
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or(std::time::Duration::ZERO)
            .as_secs() as i64;

        let start_timestamp = match range {
            "7d" => now - (7 * 24 * 60 * 60),
            "30d" => now - (30 * 24 * 60 * 60),
            "6mo" => now - (6 * 30 * 24 * 60 * 60),
            "1y" => now - (365 * 24 * 60 * 60),
            _ => 0,
        };

        let days_in_range = ((now - start_timestamp).max(86400) / 86400).max(1) as f64;

        // 1. Top Tracks
        let mut stmt = conn.prepare(
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

        let top_tracks_iter = stmt.query_map([start_timestamp], |row| {
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

        let top_tracks: Vec<TopTrack> = top_tracks_iter.collect::<Result<Vec<_>, _>>()?;

        // 2. Top Artists
        let mut stmt = conn.prepare(
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

        let top_artists_iter = stmt.query_map([start_timestamp], |row| {
            Ok(TopArtist {
                id: row.get::<usize, i64>(0)?,
                name: row.get::<usize, String>(1)?,
                cover_image: row.get::<usize, Option<String>>(2)?,
                play_count: row.get::<usize, i64>(3)?,
            })
        })?;

        let top_artists: Vec<TopArtist> = top_artists_iter.collect::<Result<Vec<_>, _>>()?;

        // 3. Top Albums
        let mut stmt = conn.prepare(
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

        let top_albums_iter = stmt.query_map([start_timestamp], |row| {
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

        let top_albums: Vec<TopAlbum> = top_albums_iter.collect::<Result<Vec<_>, _>>()?;

        // 4. Activity History (Last 7 Days)
        let seven_days_ago = now - (7 * 24 * 60 * 60);

        let mut stmt = conn.prepare(
            "SELECT
                date(timestamp, 'unixepoch', 'localtime') as day,
                SUM(duration_ms) as total_duration
             FROM playback_history
             WHERE timestamp >= ?
             GROUP BY day
             ORDER BY day ASC",
        )?;

        let activity_iter = stmt.query_map([seven_days_ago], |row| {
            Ok(ActivityPoint {
                date: row.get::<usize, String>(0)?,
                duration_ms: row.get::<usize, i64>(1)?,
            })
        })?;

        let activity_history: Vec<ActivityPoint> = activity_iter.collect::<Result<Vec<_>, _>>()?;

        // 5. Top Genres
        let mut stmt = conn.prepare(
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

        let genre_iter = stmt.query_map([start_timestamp], |row| {
            Ok(TopGenre {
                genre: row.get::<usize, String>(0)?,
                play_count: row.get::<usize, i64>(1)?,
            })
        })?;

        let top_genres: Vec<TopGenre> = genre_iter.collect::<Result<Vec<_>, _>>()?;

        // 6. Total listening + play count (combined)
        let (total_listening_ms, current_play_count): (i64, i64) = conn.query_row(
            "SELECT COALESCE(SUM(duration_ms), 0), COUNT(id) FROM playback_history WHERE timestamp >= ?",
            [start_timestamp],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap_or((0, 0));

        // 7. Heatmap
        let mut stmt = conn.prepare(
            "SELECT
                CAST(strftime('%w', timestamp, 'unixepoch', 'localtime') AS INTEGER) as day_of_week,
                CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) as hour_of_day,
                COUNT(*) as frequency
             FROM playback_history
             WHERE timestamp >= ?
             GROUP BY day_of_week, hour_of_day
             ORDER BY day_of_week ASC, hour_of_day ASC",
        )?;

        let heatmap_iter = stmt.query_map([start_timestamp], |row| {
            let intensity: u32 = row.get::<usize, u32>(2)?;
            Ok(HeatmapPoint {
                day: row.get::<usize, u8>(0)?,
                hour: row.get::<usize, u8>(1)?,
                intensity,
                normalized: intensity as f64 / days_in_range,
            })
        })?;

        let heatmap: Vec<HeatmapPoint> = heatmap_iter.collect::<Result<Vec<_>, _>>()?;

        // 8. Trends & Discovery
        let period_duration = now - start_timestamp;
        let prev_start = start_timestamp - period_duration;
        let has_trends = period_duration < (365 * 24 * 60 * 60 * 10);

        let (prev_total_time, prev_play_count): (i64, i64) = if has_trends {
            conn.query_row(
                "SELECT
                    COALESCE(SUM(duration_ms), 0),
                    COUNT(id)
                 FROM playback_history
                 WHERE timestamp >= ? AND timestamp < ?",
                [prev_start, start_timestamp],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap_or((0, 0))
        } else {
            (0, 0)
        };

        let calc_change = |current: i64, prev: i64| -> f64 {
            if prev == 0 {
                if current > 0 {
                    100.0
                } else {
                    0.0
                }
            } else {
                ((current as f64 - prev as f64) / prev as f64) * 100.0
            }
        };

        let listening_time_change = calc_change(total_listening_ms, prev_total_time);
        let play_count_change = calc_change(current_play_count, prev_play_count);

        let new_artists_count: i64 = if has_trends {
            conn.query_row(
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
            .unwrap_or(0)
        } else {
            0
        };

        // 9. Streaks
        let mut streak_stmt = conn.prepare(
            "SELECT DISTINCT date(timestamp, 'unixepoch', 'localtime') as play_date
             FROM playback_history
             ORDER BY play_date ASC",
        )?;

        let streak_dates: Vec<String> = streak_stmt
            .query_map([], |row| row.get::<usize, String>(0))?
            .filter_map(|r| r.ok())
            .collect();

        let (current_streak, longest_streak) = queries::calculate_streaks(&streak_dates);

        let week_days = queries::generate_week_days(&streak_dates, now);

        // 10. Day/Night Split (combined)
        let (day_count, night_count): (i64, i64) = conn.query_row(
            "SELECT
                COUNT(*) FILTER (WHERE CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) BETWEEN 6 AND 17),
                COUNT(*) FILTER (WHERE CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) >= 18 OR CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) < 6)
             FROM playback_history
             WHERE timestamp >= ?",
            [start_timestamp],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap_or((0, 0));

        let total_dn = (day_count + night_count) as f64;
        let (day_percentage, night_percentage) = if total_dn > 0.0 {
            (
                (day_count as f64 / total_dn) * 100.0,
                (night_count as f64 / total_dn) * 100.0,
            )
        } else {
            (0.0, 0.0)
        };

        // 11. Weekly Wrap (4 values in one query)
        let (ww_total_plays, ww_total_time, ww_unique_tracks, ww_unique_artists): (
            i64,
            i64,
            i64,
            i64,
        ) = conn
            .query_row(
                "SELECT
                COUNT(*),
                COALESCE(SUM(duration_ms), 0),
                COUNT(DISTINCT track_id),
                COUNT(DISTINCT t.artist_id)
             FROM playback_history ph
             JOIN tracks t ON ph.track_id = t.id
             WHERE ph.timestamp >= ?",
                [start_timestamp],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .unwrap_or((0, 0, 0, 0));

        let ww_top_track: Option<String> = conn
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

        let ww_top_artist: Option<String> = conn
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

        let (ww_most_active_day, ww_most_active_plays): (Option<String>, i64) = conn
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

        Ok(StatsData {
            top_tracks,
            top_artists,
            top_albums,
            activity_history,
            top_genres,
            heatmap,
            trends: TrendsData {
                listening_time_change,
                play_count_change,
                new_artists_count,
            },
            total_listening_ms,
            streaks: StreaksData {
                current_streak,
                longest_streak,
                week_days,
            },
            day_night_split: DayNightSplit {
                day_plays: day_count,
                night_plays: night_count,
                day_percentage,
                night_percentage,
            },
            weekly_wrap: WeeklyWrapData {
                total_plays: ww_total_plays,
                total_listening_ms: ww_total_time,
                unique_tracks: ww_unique_tracks,
                unique_artists: ww_unique_artists,
                top_track: ww_top_track,
                top_artist: ww_top_artist,
                most_active_day: ww_most_active_day,
                most_active_day_plays: ww_most_active_plays,
            },
        })
    })
}
