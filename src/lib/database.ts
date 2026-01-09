/**
 * Database Service for VibMusic
 * 
 * Provides SQLite database operations for the music library including:
 * - Track, Artist, Album CRUD operations
 * - Playlist management
 * - Play history tracking
 * 
 * @module database
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
import { cacheService, CACHE_KEYS } from './cache';

/** Database instance singleton */
let db: Database | null = null;

/** SQLite database file path */
const DB_NAME = 'sqlite:library.db';

/**
 * Initialize the database connection and run migrations.
 * 
 * This function should be called once at app startup before any database operations.
 * It creates the database file if it doesn't exist and applies any pending migrations.
 * 
 * @returns The initialized Database instance
 * @throws Error if database connection fails
 * 
 * @example
 * ```typescript
 * await initializeDatabase();
 * const tracks = await getTracks();
 * ```
 */
export async function initializeDatabase(): Promise<Database> {
  if (db) return db;

  db = await Database.load(DB_NAME);



  return db;
}

/**
 * Get the database instance.
 * 
 * @returns The Database instance
 * @throws Error if database has not been initialized via `initializeDatabase()`
 * 
 * @example
 * ```typescript
 * const db = getDatabase();
 * const result = await db.select('SELECT * FROM tracks');
 * ```
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}



// ============================================
// Artist Operations
// ============================================

/**
 * Get all artists from the database.
 * 
 * @returns Array of Artist objects sorted by name (A-Z)
 * 
 * @example
 * ```typescript
 * const artists = await getArtists();
 * console.log(`Found ${artists.length} artists`);
 * ```
 */
export async function getArtists(): Promise<Artist[]> {
  const cached = cacheService.get<Artist[]>(CACHE_KEYS.ALL_ARTISTS);
  if (cached) return cached;

  const database = getDatabase();
  const artists = await database.select<Artist[]>('SELECT * FROM artists ORDER BY name ASC');
  cacheService.set(CACHE_KEYS.ALL_ARTISTS, artists);
  return artists;
}

/**
 * Get a single artist by ID.
 * 
 * @param id - The artist's unique identifier
 * @returns The Artist object or null if not found
 * 
 * @example
 * ```typescript
 * const artist = await getArtistById(1);
 * if (artist) console.log(artist.name);
 * ```
 */
export async function getArtistById(id: number): Promise<Artist | null> {
  const database = getDatabase();
  const results = await database.select<Artist[]>(
    'SELECT * FROM artists WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

/**
 * Get an existing artist by name or create a new one.
 * 
 * This is useful when importing tracks - it ensures no duplicate artists are created.
 * 
 * @param name - The artist's name (case-sensitive)
 * @returns The existing or newly created Artist object
 * 
 * @example
 * ```typescript
 * const artist = await getOrCreateArtist('Taylor Swift');
 * console.log(`Artist ID: ${artist.id}`);
 * ```
 */
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

/**
 * Get all albums from the database.
 * 
 * @returns Array of Album objects sorted by title (A-Z)
 */
export async function getAlbums(): Promise<Album[]> {
  const cached = cacheService.get<Album[]>(CACHE_KEYS.ALL_ALBUMS);
  if (cached) return cached;

  const database = getDatabase();
  const albums = await database.select<Album[]>('SELECT * FROM albums ORDER BY title ASC');
  cacheService.set(CACHE_KEYS.ALL_ALBUMS, albums);
  return albums;
}

/**
 * Get a single album by ID.
 * 
 * @param id - The album's unique identifier
 * @returns The Album object or null if not found
 */
export async function getAlbumById(id: number): Promise<Album | null> {
  const database = getDatabase();
  const results = await database.select<Album[]>(
    'SELECT * FROM albums WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

/**
 * Get an existing album by title and artist, or create a new one.
 * 
 * Albums are uniquely identified by their title + artist combination.
 * This prevents duplicate albums when importing tracks.
 * 
 * @param title - The album title
 * @param artistId - The artist's ID (null for compilations/unknown)
 * @param year - Optional release year
 * @returns The existing or newly created Album object
 */
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

/**
 * Get all tracks from the database.
 * 
 * @returns Array of Track objects sorted by title (A-Z)
 */
export async function getTracks(): Promise<Track[]> {
  const cached = cacheService.get<Track[]>(CACHE_KEYS.ALL_TRACKS);
  if (cached) return cached;

  const database = getDatabase();
  const tracks = await database.select<Track[]>('SELECT * FROM tracks ORDER BY title ASC');
  cacheService.set(CACHE_KEYS.ALL_TRACKS, tracks);
  return tracks;
}

/**
 * Get a single track by ID.
 * 
 * @param id - The track's unique identifier
 * @returns The Track object or null if not found
 */
export async function getTrackById(id: number): Promise<Track | null> {
  const database = getDatabase();
  const results = await database.select<Track[]>(
    'SELECT * FROM tracks WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

/**
 * Get a track by its file path.
 * 
 * File paths are unique in the database, making this useful for
 * checking if a file has already been indexed.
 * 
 * @param filePath - The absolute path to the audio file
 * @returns The Track object or null if not found
 */
export async function getTrackByFilePath(filePath: string): Promise<Track | null> {
  const database = getDatabase();
  const results = await database.select<Track[]>(
    'SELECT * FROM tracks WHERE file_path = ?',
    [filePath]
  );
  return results[0] || null;
}

/**
 * Get all tracks with their related artist and album information.
 * 
 * This performs JOINs to include artist name, album title, and artwork path
 * in a single query for display purposes.
 * 
 * @returns Array of TrackWithRelations objects
 */
export async function getTracksWithRelations(): Promise<TrackWithRelations[]> {
  const cached = cacheService.get<TrackWithRelations[]>(CACHE_KEYS.TRACKS_WITH_RELATIONS);
  if (cached) return cached;

  const database = getDatabase();
  const tracks = await database.select<TrackWithRelations[]>(`
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
  cacheService.set(CACHE_KEYS.TRACKS_WITH_RELATIONS, tracks);
  return tracks;
}

/**
 * Get all track IDs and file paths.
 * 
 * Used for library synchronization to identify missing files.
 * 
 * @returns Array of object with id and file_path
 */
export async function getAllTrackPaths(): Promise<{ id: number; file_path: string }[]> {
  const database = getDatabase();
  return database.select('SELECT id, file_path FROM tracks');
}

/**
 * Add a new track to the database.
 * 
 * This function automatically creates artist and album records if they don't exist.
 * Use `upsertTrack` instead if you want to update existing tracks.
 * 
 * @param input - The track metadata to insert
 * @returns The newly created Track object
 * @throws Error if a track with the same file_path already exists
 * 
 * @example
 * ```typescript
 * const track = await addTrack({
 *   title: 'Song Name',
 *   artist_name: 'Artist Name',
 *   album_title: 'Album Name',
 *   duration_ms: 180000,
 *   file_path: '/path/to/song.mp3',
 * });
 * ```
 */
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

  cacheService.clear(); // Invalidate on write
  return created;
}

/**
 * Delete a track by ID.
 * 
 * This also removes the track from any playlists and play history
 * due to CASCADE delete constraints.
 * 
 * @param id - The track's unique identifier
 */
export async function deleteTrack(id: number): Promise<void> {
  const database = getDatabase();
  await database.execute('DELETE FROM tracks WHERE id = ?', [id]);
  cacheService.clear(); // Invalidate on delete
}

/**
 * Delete a track by its file path.
 * 
 * Useful when a file is moved/deleted from the file system.
 * 
 * @param filePath - The absolute path to the audio file
 */
export async function deleteTrackByFilePath(filePath: string): Promise<void> {
  const database = getDatabase();
  await database.execute('DELETE FROM tracks WHERE file_path = ?', [filePath]);
  cacheService.clear(); // Invalidate on delete
}

/**
 * Get the total number of tracks in the database.
 * 
 * @returns The total track count
 */
export async function getTrackCount(): Promise<number> {
  const database = getDatabase();
  const result = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM tracks'
  );
  return result[0]?.count || 0;
}

/**
 * Insert a new track or update an existing one (upsert).
 * 
 * This function checks if a track with the same file_path exists:
 * - If it exists: Updates all metadata fields
 * - If it doesn't exist: Creates a new track
 * 
 * This is the preferred method for library scanning as it handles
 * both new files and metadata updates for existing files.
 * 
 * @param input - The track metadata to insert/update
 * @returns Object containing the track and whether it was newly created
 * 
 * @example
 * ```typescript
 * const { track, isNew } = await upsertTrack({
 *   title: 'Song Name',
 *   file_path: '/path/to/song.mp3',
 *   duration_ms: 180000,
 * });
 * console.log(isNew ? 'New track added' : 'Track updated');
 * ```
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

    cacheService.clear(); // Invalidate on update
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

    cacheService.clear(); // Invalidate on insert
    return { track: created, isNew: true };
  }
}

// ============================================
// Playlist Operations
// ============================================

/**
 * Get all playlists.
 * 
 * @returns Array of Playlist objects sorted by name (A-Z)
 */
export async function getPlaylists(): Promise<Playlist[]> {
  const database = getDatabase();
  return database.select('SELECT * FROM playlists ORDER BY name ASC');
}

/**
 * Get a single playlist by ID.
 * 
 * @param id - The playlist's unique identifier
 * @returns The Playlist object or null if not found
 */
export async function getPlaylistById(id: number): Promise<Playlist | null> {
  const database = getDatabase();
  const results = await database.select<Playlist[]>(
    'SELECT * FROM playlists WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

/**
 * Create a new playlist.
 * 
 * @param input - The playlist creation data (name and optional description)
 * @returns The newly created Playlist object
 */
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

/**
 * Delete a playlist by ID.
 * 
 * This will also delete all associations in the playlist_tracks table
 * due to CASCADE delete constraints.
 * 
 * @param id - The playlist's unique identifier
 */
export async function deletePlaylist(id: number): Promise<void> {
  const database = getDatabase();
  await database.execute('DELETE FROM playlists WHERE id = ?', [id]);
}

/**
 * Add a track to a playlist.
 * 
 * Appends the track to the end of the playlist.
 * 
 * @param playlistId - The target playlist ID
 * @param trackId - The track ID to add
 */
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

/**
 * Remove a track from a playlist.
 * 
 * @param playlistId - The target playlist ID
 * @param trackId - The track ID to remove
 */
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

/**
 * Get all tracks in a playlist.
 * 
 * @param playlistId - The playlist ID
 * @returns Array of PlaylistTrack objects sorted by position
 */
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

/**
 * Record a track play in history.
 * 
 * @param trackId - The played track ID
 * @param durationMs - How long the track was played (ms)
 * @param completed - Whether the track was played to completion
 */
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

/**
 * Get recently played tracks history.
 * 
 * @param limit - Maximum number of history items to return (default: 50)
 * @returns Array of PlayHistory objects sorted by played_at (newest first)
 */
export async function getRecentlyPlayed(limit = 50): Promise<PlayHistory[]> {
  const database = getDatabase();
  return database.select(
    'SELECT * FROM play_history ORDER BY played_at DESC LIMIT ?',
    [limit]
  );
}

/**
 * Clear the entire play history.
 */
export async function clearPlayHistory(): Promise<void> {
  const database = getDatabase();
  await database.execute('DELETE FROM play_history');
}
