use super::*;

#[test]
fn test_calculate_streaks_empty() {
    let (current, longest) = queries::calculate_streaks(&[]);
    assert_eq!(current, 0);
    assert_eq!(longest, 0);
}

#[test]
fn test_calculate_streaks_single_day() {
    let dates = vec!["2024-01-15".to_string()];
    let (_current, longest) = queries::calculate_streaks(&dates);
    assert_eq!(longest, 1);
}

#[test]
fn test_calculate_streaks_consecutive_days() {
    let dates = vec![
        "2024-01-01".to_string(),
        "2024-01-02".to_string(),
        "2024-01-03".to_string(),
    ];
    let (_, longest) = queries::calculate_streaks(&dates);
    assert_eq!(longest, 3);
}

#[test]
fn test_calculate_streaks_with_gap() {
    let dates = vec![
        "2024-01-01".to_string(),
        "2024-01-02".to_string(),
        "2024-01-05".to_string(),
        "2024-01-06".to_string(),
        "2024-01-07".to_string(),
    ];
    let (_, longest) = queries::calculate_streaks(&dates);
    assert_eq!(longest, 3);
}

#[test]
fn test_calculate_streaks_consecutive_in_order() {
    let dates = vec![
        "2024-01-01".to_string(),
        "2024-01-02".to_string(),
        "2024-01-03".to_string(),
    ];
    let (_, longest) = queries::calculate_streaks(&dates);
    assert_eq!(longest, 3);
}

#[test]
fn test_calculate_streaks_invalid_dates_filtered() {
    let dates = vec![
        "2024-01-01".to_string(),
        "not-a-date".to_string(),
        "2024-01-02".to_string(),
    ];
    let (_, longest) = queries::calculate_streaks(&dates);
    assert_eq!(longest, 2);
}

#[test]
fn test_generate_week_days_current_day_active() {
    let now = 1704067200; // 2024-01-01 00:00:00 UTC
    let active = vec!["2024-01-01".to_string()];
    let result = queries::generate_week_days(&active, now);
    assert_eq!(result.len(), 7);
    let today = result.iter().find(|d| d.date == "2024-01-01");
    assert!(today.is_some());
    assert!(today.unwrap().active);
}
