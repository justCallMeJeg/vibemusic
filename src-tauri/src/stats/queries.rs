use crate::shared::types::WeekDayStatus;
use chrono::{Local, NaiveDate};

/// Calculates current and longest listening streaks from sorted date strings.
pub fn calculate_streaks(dates: &[String]) -> (i64, i64) {
    if dates.is_empty() {
        return (0, 0);
    }

    let today = Local::now().format("%Y-%m-%d").to_string();
    let mut longest = 1i64;
    let mut current_run = 1i64;

    let parsed: Vec<NaiveDate> = dates
        .iter()
        .filter_map(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .collect();

    if parsed.is_empty() {
        return (0, 0);
    }

    for pair in parsed.windows(2) {
        let prev = pair[0];
        let curr = pair[1];
        if prev.succ_opt() == Some(curr) {
            current_run += 1;
        } else {
            if current_run > longest {
                longest = current_run;
            }
            current_run = 1;
        }
    }
    if current_run > longest {
        longest = current_run;
    }

    let last = *parsed.last().expect("parsed should be non-empty here");
    let current_streak = if let Ok(today_date) = NaiveDate::parse_from_str(&today, "%Y-%m-%d") {
        let days_since = (today_date - last).num_days();
        if days_since <= 1 {
            let mut streak = 1i64;
            let mut expected = last;
            for date in parsed.iter().rev().skip(1) {
                let diff = (expected - *date).num_days();
                if diff == 1 {
                    streak += 1;
                    expected = *date;
                } else {
                    break;
                }
            }
            streak
        } else {
            0
        }
    } else {
        0
    };

    (current_streak, longest)
}

/// Generates week-day activity status for the last 7 days.
pub fn generate_week_days(active_dates: &[String], now: i64) -> Vec<WeekDayStatus> {
    let mut week_days = Vec::new();

    let today_secs = now - (now % 86400);

    for i in (0..7).rev() {
        let day_secs = today_secs - (i as i64 * 86400);
        if let Some(naive) = NaiveDate::from_ymd_opt(1970, 1, 1) {
            let date = naive + chrono::Duration::days(day_secs / 86400);
            let date_str = date.format("%Y-%m-%d").to_string();
            let weekday = date.format("%a").to_string();
            let active = active_dates.iter().any(|d| d == &date_str);
            week_days.push(WeekDayStatus {
                day: weekday,
                active,
                date: date_str,
            });
        }
    }

    week_days
}
