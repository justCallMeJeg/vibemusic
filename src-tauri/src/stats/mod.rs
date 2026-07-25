//! Stats feature — playback analytics, trends, streaks, and listening patterns.
//!
//! Sub-modules:
//! - [`types`]: Re-exports from the shared type registry
//! - [`queries`]: Helper functions for streak calculation and week-day generation

pub mod queries;
#[cfg(test)]
mod tests;

use crate::database::repository::StatsRepository;
use crate::database::DbHelper;
use crate::profile::with_db;
use crate::shared::error::AppError;
use crate::shared::types::StatsData;
use tauri::AppHandle;

/// Records a playback event in the history table.
#[tauri::command]
pub async fn record_playback(
    app: AppHandle,
    track_id: i64,
    duration_ms: i64,
) -> Result<(), AppError> {
    with_db(&app, |db| db.record_playback(track_id, duration_ms))
}

/// Returns aggregated listening statistics for the given time range.
#[tauri::command]
pub async fn get_stats(app: AppHandle, time_range: Option<String>) -> Result<StatsData, AppError> {
    with_db(&app, |db| {
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

        let top_tracks = DbHelper::get_top_tracks(db, start_timestamp)?;
        let top_artists = DbHelper::get_top_artists(db, start_timestamp)?;
        let top_albums = DbHelper::get_top_albums(db, start_timestamp)?;
        let activity_history = DbHelper::get_activity_history(db, start_timestamp)?;
        let top_genres = DbHelper::get_top_genres(db, start_timestamp)?;
        let (total_listening_ms, _current_play_count) =
            DbHelper::get_total_stats(db, start_timestamp)?;

        let mut heatmap = DbHelper::get_heatmap_data(db, start_timestamp)?;
        for point in &mut heatmap {
            point.normalized = point.intensity as f64 / days_in_range;
        }

        let period_duration = now - start_timestamp;
        let prev_start = start_timestamp - period_duration;
        let has_trends = period_duration < (365 * 24 * 60 * 60 * 10);
        let trends = if has_trends {
            DbHelper::get_trends_data(db, start_timestamp, prev_start)?
        } else {
            crate::shared::types::TrendsData {
                listening_time_change: 0.0,
                play_count_change: 0.0,
                new_artists_count: 0,
            }
        };

        let streaks = DbHelper::get_streaks_data(db, start_timestamp)?;
        let day_night_split = DbHelper::get_day_night_split(db, start_timestamp)?;
        let weekly_wrap = DbHelper::get_weekly_wrap(db, start_timestamp)?;

        Ok(StatsData {
            top_tracks,
            top_artists,
            top_albums,
            activity_history,
            top_genres,
            heatmap,
            trends,
            total_listening_ms,
            streaks,
            day_night_split,
            weekly_wrap,
        })
    })
}
