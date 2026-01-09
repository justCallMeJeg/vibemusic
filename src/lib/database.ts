/**
 * Database Service for VibMusic
 * Handles SQLite operations for the music library
 */

import Database from '@tauri-apps/plugin-sql';
import type {
  Track,
  Artist,
  Album,
  Playlist,
  PlaylistTrack,
  PlayHistory,
  TrackWithRelations,
  CreateTrackInput,
  CreatePlaylistInput,
} from '../types/database';

// Database instance singleton
let db: Database | null = null;

const DB_NAME = 'sqlite:library.db';

/**
 * Initialize the database connection and run migrations
 */
export async function initializeDatabase(): Promise<Database> {
  if (db) return db;

  db = await Database.load(DB_NAME);

  // Run initial schema migration
  await runMigrations(db);

  return db;
}

/**
 * Get the database instance (must call initializeDatabase first)
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Run database migrations
 */
async function runMigrations(database: Database): Promise<void> {
  // Create migration tracking table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if initial schema has been applied
  const applied = await database.select<{ name: string }[]>(
    'SELECT name FROM migrations WHERE name = ?',
    ['001_initial_schema']
  );

  if (applied.length === 0) {
    // Apply initial schema
    await applyInitialSchema(database);
    await database.execute(
      'INSERT INTO migrations (name) VALUES (?)',
      ['001_initial_schema']
    );
  }
}

/**
 * Apply the initial database schema
 */
async function applyInitialSchema(database: Database): Promise<void> {
  // Artists table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Albums table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist_id INTEGER,
      year INTEGER,
      artwork_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL,
      UNIQUE(title, artist_id)
    )
  `);

  // Tracks table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist_id INTEGER,
      album_id INTEGER,
      album_artist TEXT,
      track_number INTEGER,
      disc_number INTEGER DEFAULT 1,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      file_path TEXT NOT NULL UNIQUE,
      file_size INTEGER,
      file_format TEXT,
      sample_rate INTEGER,
      bit_rate INTEGER,
      channels INTEGER,
      genre TEXT,
      year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL,
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
    )
  `);

  // Playlists table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Playlist tracks junction table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
      UNIQUE(playlist_id, track_id)
    )
  `);

  // Play history table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id INTEGER NOT NULL,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      play_duration_ms INTEGER,
      completed BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    )
  `);

  // Indexes
  await database.execute('CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_tracks_file_path ON tracks(file_path)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_play_history_track ON play_history(track_id)');
  await database.execute('CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at)');
}

// ============================================
// Artist Operations
// ============================================

export async function getArtists(): Promise<Artist[]> {
  const database = getDatabase();
  return database.select('SELECT * FROM artists ORDER BY name ASC');
}

export async function getArtistById(id: number): Promise<Artist | null> {
  const database = getDatabase();
  const results = await database.select<Artist[]>(
    'SELECT * FROM artists WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

export async function getOrCreateArtist(name: string): Promise<Artist> {
  const database = getDatabase();

  // Try to find existing artist
  const existing = await database.select<Artist[]>(
    'SELECT * FROM artists WHERE name = ?',
    [name]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new artist
  await database.execute(
    'INSERT INTO artists (name) VALUES (?)',
    [name]
  );

  const created = await database.select<Artist[]>(
    'SELECT * FROM artists WHERE name = ?',
    [name]
  );

  return created[0];
}

// ============================================
// Album Operations
// ============================================

export async function getAlbums(): Promise<Album[]> {
  const database = getDatabase();
  return database.select('SELECT * FROM albums ORDER BY title ASC');
}

export async function getAlbumById(id: number): Promise<Album | null> {
  const database = getDatabase();
  const results = await database.select<Album[]>(
    'SELECT * FROM albums WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

export async function getOrCreateAlbum(
  title: string,
  artistId: number | null,
  year?: number
): Promise<Album> {
  const database = getDatabase();

  // Try to find existing album
  const existing = await database.select<Album[]>(
    'SELECT * FROM albums WHERE title = ? AND (artist_id = ? OR (artist_id IS NULL AND ? IS NULL))',
    [title, artistId, artistId]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new album
  await database.execute(
    'INSERT INTO albums (title, artist_id, year) VALUES (?, ?, ?)',
    [title, artistId, year || null]
  );

  const created = await database.select<Album[]>(
    'SELECT * FROM albums WHERE title = ? AND (artist_id = ? OR (artist_id IS NULL AND ? IS NULL))',
    [title, artistId, artistId]
  );

  return created[0];
}

// ============================================
// Track Operations
// ============================================

export async function getTracks(): Promise<Track[]> {
  const database = getDatabase();
  return database.select('SELECT * FROM tracks ORDER BY title ASC');
}

export async function getTrackById(id: number): Promise<Track | null> {
  const database = getDatabase();
  const results = await database.select<Track[]>(
    'SELECT * FROM tracks WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

export async function getTrackByFilePath(filePath: string): Promise<Track | null> {
  const database = getDatabase();
  const results = await database.select<Track[]>(
    'SELECT * FROM tracks WHERE file_path = ?',
    [filePath]
  );
  return results[0] || null;
}

export async function getTracksWithRelations(): Promise<TrackWithRelations[]> {
  const database = getDatabase();
  return database.select(`
    SELECT
      t.*,
      a.name as artist_name,
      al.title as album_title,
      al.artwork_path as album_artwork_path
    FROM tracks t
    LEFT JOIN artists a ON t.artist_id = a.id
    LEFT JOIN albums al ON t.album_id = al.id
    ORDER BY t.title ASC
  `);
}

export async function addTrack(input: CreateTrackInput): Promise<Track> {
  const database = getDatabase();

  let artistId: number | null = null;
  let albumId: number | null = null;

  // Get or create artist
  if (input.artist_name) {
    const artist = await getOrCreateArtist(input.artist_name);
    artistId = artist.id;
  }

  // Get or create album
  if (input.album_title) {
    const album = await getOrCreateAlbum(input.album_title, artistId, input.year);
    albumId = album.id;
  }

  // Insert track
  await database.execute(
    `INSERT INTO tracks (
      title, artist_id, album_id, album_artist, track_number, disc_number,
      duration_ms, file_path, file_size, file_format, sample_rate, bit_rate,
      channels, genre, year
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      artistId,
      albumId,
      input.album_artist || null,
      input.track_number || null,
      input.disc_number || 1,
      input.duration_ms,
      input.file_path,
      input.file_size || null,
      input.file_format || null,
      input.sample_rate || null,
      input.bit_rate || null,
      input.channels || null,
      input.genre || null,
      input.year || null,
    ]
  );

  const created = await getTrackByFilePath(input.file_path);
  if (!created) {
    throw new Error('Failed to create track');
  }

  return created;
}

export async function deleteTrack(id: number): Promise<void> {
  const database = getDatabase();
  await database.execute('DELETE FROM tracks WHERE id = ?', [id]);
}

export async function deleteTrackByFilePath(filePath: string): Promise<void> {
  const database = getDatabase();
  await database.execute('DELETE FROM tracks WHERE file_path = ?', [filePath]);
}

export async function getTrackCount(): Promise<number> {
  const database = getDatabase();
  const result = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM tracks'
  );
  return result[0]?.count || 0;
}

/**
 * Insert or update a track based on file_path (upsert)
 * Returns { track, isNew } where isNew indicates if this was an insert
 */
export async function upsertTrack(input: CreateTrackInput): Promise<{ track: Track; isNew: boolean }> {
  const database = getDatabase();

  // Check if track already exists
  const existing = await getTrackByFilePath(input.file_path);

  let artistId: number | null = null;
  let albumId: number | null = null;

  // Get or create artist
  if (input.artist_name) {
    const artist = await getOrCreateArtist(input.artist_name);
    artistId = artist.id;
  }

  // Get or create album
  if (input.album_title) {
    const album = await getOrCreateAlbum(input.album_title, artistId, input.year);
    albumId = album.id;
  }

  if (existing) {
    // Update existing track
    await database.execute(
      `UPDATE tracks SET
        title = ?,
        artist_id = ?,
        album_id = ?,
        album_artist = ?,
        track_number = ?,
        disc_number = ?,
        duration_ms = ?,
        file_size = ?,
        file_format = ?,
        sample_rate = ?,
        bit_rate = ?,
        channels = ?,
        genre = ?,
        year = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE file_path = ?`,
      [
        input.title,
        artistId,
        albumId,
        input.album_artist || null,
        input.track_number || null,
        input.disc_number || 1,
        input.duration_ms,
        input.file_size || null,
        input.file_format || null,
        input.sample_rate || null,
        input.bit_rate || null,
        input.channels || null,
        input.genre || null,
        input.year || null,
        input.file_path,
      ]
    );

    const updated = await getTrackByFilePath(input.file_path);
    if (!updated) {
      throw new Error('Failed to update track');
    }

    return { track: updated, isNew: false };
  } else {
    // Insert new track
    await database.execute(
      `INSERT INTO tracks (
        title, artist_id, album_id, album_artist, track_number, disc_number,
        duration_ms, file_path, file_size, file_format, sample_rate, bit_rate,
        channels, genre, year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.title,
        artistId,
        albumId,
        input.album_artist || null,
        input.track_number || null,
        input.disc_number || 1,
        input.duration_ms,
        input.file_path,
        input.file_size || null,
        input.file_format || null,
        input.sample_rate || null,
        input.bit_rate || null,
        input.channels || null,
        input.genre || null,
        input.year || null,
      ]
    );

    const created = await getTrackByFilePath(input.file_path);
    if (!created) {
      throw new Error('Failed to create track');
    }

    return { track: created, isNew: true };
  }
}

// ============================================
// Playlist Operations
// ============================================

export async function getPlaylists(): Promise<Playlist[]> {
  const database = getDatabase();
  return database.select('SELECT * FROM playlists ORDER BY name ASC');
}

export async function getPlaylistById(id: number): Promise<Playlist | null> {
  const database = getDatabase();
  const results = await database.select<Playlist[]>(
    'SELECT * FROM playlists WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

export async function createPlaylist(input: CreatePlaylistInput): Promise<Playlist> {
  const database = getDatabase();

  await database.execute(
    'INSERT INTO playlists (name, description) VALUES (?, ?)',
    [input.name, input.description || null]
  );

  const created = await database.select<Playlist[]>(
    'SELECT * FROM playlists WHERE name = ?',
    [input.name]
  );

  return created[0];
}

export async function deletePlaylist(id: number): Promise<void> {
  const database = getDatabase();
  await database.execute('DELETE FROM playlists WHERE id = ?', [id]);
}

export async function addTrackToPlaylist(
  playlistId: number,
  trackId: number
): Promise<void> {
  const database = getDatabase();

  // Get current max position
  const maxPos = await database.select<{ max_pos: number | null }[]>(
    'SELECT MAX(position) as max_pos FROM playlist_tracks WHERE playlist_id = ?',
    [playlistId]
  );

  const nextPosition = (maxPos[0]?.max_pos || 0) + 1;

  await database.execute(
    'INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)',
    [playlistId, trackId, nextPosition]
  );
}

export async function removeTrackFromPlaylist(
  playlistId: number,
  trackId: number
): Promise<void> {
  const database = getDatabase();
  await database.execute(
    'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?',
    [playlistId, trackId]
  );
}

export async function getPlaylistTracks(playlistId: number): Promise<PlaylistTrack[]> {
  const database = getDatabase();
  return database.select(
    'SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
    [playlistId]
  );
}

// ============================================
// Play History Operations
// ============================================

export async function addPlayHistory(
  trackId: number,
  durationMs?: number,
  completed = false
): Promise<void> {
  const database = getDatabase();
  await database.execute(
    'INSERT INTO play_history (track_id, play_duration_ms, completed) VALUES (?, ?, ?)',
    [trackId, durationMs || null, completed]
  );
}

export async function getRecentlyPlayed(limit = 50): Promise<PlayHistory[]> {
  const database = getDatabase();
  return database.select(
    'SELECT * FROM play_history ORDER BY played_at DESC LIMIT ?',
    [limit]
  );
}

export async function clearPlayHistory(): Promise<void> {
  const database = getDatabase();
  await database.execute('DELETE FROM play_history');
}
