use super::DbHelper;
use rusqlite::{params, Result};

impl DbHelper {
    pub fn record_playback(&self, track_id: i64, duration_ms: i64) -> Result<()> {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or(std::time::Duration::ZERO)
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO playback_history (track_id, timestamp, duration_ms) VALUES (?, ?, ?)",
            params![track_id, timestamp, duration_ms],
        )?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn get_playback_history(&self, after_timestamp: i64) -> Result<Vec<(i64, i64, i64)>> {
        let mut stmt = self.conn.prepare(
            "SELECT track_id, timestamp, duration_ms FROM playback_history WHERE timestamp >= ? ORDER BY timestamp DESC",
        )?;

        let rows = stmt.query_map(params![after_timestamp], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut history = Vec::new();
        for row in rows {
            history.push(row?);
        }
        Ok(history)
    }
}
