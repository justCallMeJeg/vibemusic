use rusqlite::Result;

use crate::shared::types::{
    ActivityPoint, DayNightSplit, HeatmapPoint, StreaksData, TopAlbum, TopArtist, TopGenre, TopTrack,
    TrendsData, WeeklyWrapData,
};

use super::DbHelper;

impl DbHelper {
    pub fn get_top_tracks(conn: &DbHelper, start_timestamp: i64) -> Result<Vec<TopTrack>> {
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

    pub fn get_top_artists(conn: &DbHelper, start_timestamp: i64) -> Result<Vec<TopArtist>> {
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

    pub fn get_top_albums(conn: &DbHelper, start_timestamp: i64) -> Result<Vec<TopAlbum>> {
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

    pub fn get_activity_history(conn: &DbHelper, start_timestamp: i64) -> Result<Vec<ActivityPoint>> {
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

    pub fn get_top_genres(conn: &DbHelper, start_timestamp: i64) -> Result<Vec<TopGenre>> {
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

    pub fn get_total_stats(conn: &DbHelper, start_timestamp: i64) -> Result<(i64, i64)> {
        let c = conn.get_conn();
        c.query_row(
            "SELECT COALESCE(SUM(duration_ms), 0), COUNT(id) FROM playback_history WHERE timestamp >= ?",
            [start_timestamp],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
    }

    pub fn get_heatmap_data(conn: &DbHelper, start_timestamp: i64) -> Result<Vec<HeatmapPoint>> {
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

    pub fn get_trends_data(
        conn: &DbHelper,
        start_timestamp: i64,
        prev_start: i64,
    ) -> Result<TrendsData> {
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

    pub fn get_streaks_data(conn: &DbHelper, start_timestamp: i64) -> Result<StreaksData> {
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

    pub fn get_day_night_split(conn: &DbHelper, start_timestamp: i64) -> Result<DayNightSplit> {
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

    pub fn get_weekly_wrap(conn: &DbHelper, start_timestamp: i64) -> Result<WeeklyWrapData> {
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
