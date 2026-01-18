use crate::database::DbHelper;
use crate::profile::get_library_db_path; // Import helper
use serde::Serialize;
use tauri::AppHandle; // Removed State

#[derive(Serialize)]
pub struct StatsData {
    pub top_tracks: Vec<TopTrack>,
    pub top_artists: Vec<TopArtist>,
    pub top_albums: Vec<TopAlbum>,
    pub activity_history: Vec<ActivityPoint>,
    pub top_genres: Vec<TopGenre>,
    pub total_listening_ms: i64,
}

#[derive(Serialize)]
pub struct TopTrack {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub cover_image: Option<String>,
    pub play_count: i64,
    pub duration_ms: i64,
}

#[derive(Serialize)]
pub struct TopArtist {
    pub id: i64,
    pub name: String,
    pub cover_image: Option<String>,
    pub play_count: i64,
}

#[derive(Serialize)]
pub struct TopAlbum {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub cover_image: Option<String>,
    pub play_count: i64,
}

#[derive(Serialize)]
pub struct ActivityPoint {
    pub date: String, // YYYY-MM-DD
    pub duration_ms: i64,
}

#[derive(Serialize)]
pub struct TopGenre {
    pub genre: String,
    pub play_count: i64,
}

#[tauri::command]
pub async fn record_playback(
    app: AppHandle,
    track_id: i64,
    duration_ms: i64,
) -> Result<(), String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;
    db.record_playback(track_id, duration_ms)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_stats(app: AppHandle) -> Result<StatsData, String> {
    let db_path = get_library_db_path(&app)?;
    let db = DbHelper::new(&db_path).map_err(|e| e.to_string())?;
    let conn = db._get_conn();

    // 1. Calculate Top Tracks (Global)
    // We join with tracks, albums, artists to get metadata
    let mut stmt = conn.prepare(
        "SELECT 
            t.id, t.title, ar.name, al.artwork_path, 
            COUNT(ph.id) as play_count,
            t.duration_ms
         FROM playback_history ph
         JOIN tracks t ON ph.track_id = t.id
         LEFT JOIN artists ar ON t.artist_id = ar.id
         LEFT JOIN albums al ON t.album_id = al.id
         GROUP BY t.id
         ORDER BY play_count DESC
         LIMIT 10",
    ).map_err(|e| e.to_string())?;

    let top_tracks_iter = stmt.query_map([], |row| {
        Ok(TopTrack {
            id: row.get::<usize, i64>(0)?,
            title: row.get::<usize, String>(1)?,
            artist: row.get::<usize, Option<String>>(2)?.unwrap_or("Unknown".to_string()),
            cover_image: row.get::<usize, Option<String>>(3)?,
            play_count: row.get::<usize, i64>(4)?,
            duration_ms: row.get::<usize, i64>(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut top_tracks: Vec<TopTrack> = Vec::new();
    for t in top_tracks_iter {
        let t: TopTrack = t.map_err(|e| e.to_string())?;
        top_tracks.push(t);
    }

    // 2. Calculate Top Artists
    let mut stmt = conn.prepare(
        "SELECT 
            ar.id, ar.name,
            (SELECT artwork_path FROM albums WHERE artist_id = ar.id ORDER BY year DESC LIMIT 1) as artwork_path,
            COUNT(ph.id) as play_count
         FROM playback_history ph
         JOIN tracks t ON ph.track_id = t.id
         JOIN artists ar ON t.artist_id = ar.id
         GROUP BY ar.id
         ORDER BY play_count DESC
         LIMIT 10",
    ).map_err(|e| e.to_string())?;

    let top_artists_iter = stmt.query_map([], |row| {
        Ok(TopArtist {
            id: row.get::<usize, i64>(0)?,
            name: row.get::<usize, String>(1)?,
            cover_image: row.get::<usize, Option<String>>(2)?,
            play_count: row.get::<usize, i64>(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut top_artists: Vec<TopArtist> = Vec::new();
    for a in top_artists_iter {
        top_artists.push(a.map_err(|e| e.to_string())?);
    }

    // 3. Calculate Top Albums
    let mut stmt = conn.prepare(
        "SELECT 
            al.id, al.title, ar.name, al.artwork_path,
            COUNT(ph.id) as play_count
         FROM playback_history ph
         JOIN tracks t ON ph.track_id = t.id
         JOIN albums al ON t.album_id = al.id
         LEFT JOIN artists ar ON al.artist_id = ar.id
         GROUP BY al.id
         ORDER BY play_count DESC
         LIMIT 10",
    ).map_err(|e| e.to_string())?;

    let top_albums_iter = stmt.query_map([], |row| {
        Ok(TopAlbum {
            id: row.get::<usize, i64>(0)?,
            title: row.get::<usize, String>(1)?,
            artist: row.get::<usize, Option<String>>(2)?.unwrap_or("Unknown".to_string()),
            cover_image: row.get::<usize, Option<String>>(3)?,
            play_count: row.get::<usize, i64>(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut top_albums: Vec<TopAlbum> = Vec::new();
    for a in top_albums_iter {
         let a: TopAlbum = a.map_err(|e| e.to_string())?;
        top_albums.push(a);
    }

    // 4. Activity History (Last 7 Days)
    let seven_days_ago = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64 - (7 * 24 * 60 * 60);

    let mut stmt = conn.prepare(
        "SELECT 
            date(timestamp, 'unixepoch', 'localtime') as day,
            SUM(duration_ms) as total_duration
         FROM playback_history
         WHERE timestamp >= ?
         GROUP BY day
         ORDER BY day ASC",
    ).map_err(|e| e.to_string())?;

    let activity_iter = stmt.query_map([seven_days_ago], |row| {
        Ok(ActivityPoint {
            date: row.get::<usize, String>(0)?,
            duration_ms: row.get::<usize, i64>(1)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut activity_history: Vec<ActivityPoint> = Vec::new();
    for a in activity_iter {
        activity_history.push(a.map_err(|e| e.to_string())?);
    }

    // 4. Top Genres
     let mut stmt = conn.prepare(
        "SELECT 
            t.genre,
            COUNT(ph.id) as play_count
         FROM playback_history ph
         JOIN tracks t ON ph.track_id = t.id
         WHERE t.genre IS NOT NULL AND t.genre != ''
         GROUP BY t.genre
         ORDER BY play_count DESC
         LIMIT 5",
    ).map_err(|e| e.to_string())?;

    let genre_iter = stmt.query_map([], |row| {
        Ok(TopGenre {
            genre: row.get::<usize, String>(0)?,
            play_count: row.get::<usize, i64>(1)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut top_genres: Vec<TopGenre> = Vec::new();
    for g in genre_iter {
        let g: TopGenre = g.map_err(|e| e.to_string())?;
        top_genres.push(g);
    }

    // 5. Total Listening Time (Global)
    let total_listening_ms: i64 = conn.query_row(
        "SELECT COALESCE(SUM(duration_ms), 0) FROM playback_history",
        [],
        |row| row.get::<usize, i64>(0),
    ).unwrap_or(0);

    Ok(StatsData {
        top_tracks,
        top_artists,
        top_albums,
        activity_history,
        top_genres,
        total_listening_ms,
    })
}
