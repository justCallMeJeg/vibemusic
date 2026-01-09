/**
 * Database Types for VibMusic Library
 * SQLite-backed music library storage
 */

// ============================================
// Core Entity Types
// ============================================

export interface Artist {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: number;
  title: string;
  artist_id: number | null;
  year: number | null;
  artwork_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: number;
  title: string;
  artist_id: number | null;
  album_id: number | null;
  album_artist: string | null;
  track_number: number | null;
  disc_number: number;
  duration_ms: number;
  file_path: string;
  file_size: number | null;
  file_format: string | null;
  sample_rate: number | null;
  bit_rate: number | null;
  channels: number | null;
  genre: string | null;
  year: number | null;
  created_at: string;
  updated_at: string;
}

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaylistTrack {
  id: number;
  playlist_id: number;
  track_id: number;
  position: number;
  added_at: string;
}

export interface PlayHistory {
  id: number;
  track_id: number;
  played_at: string;
  play_duration_ms: number | null;
  completed: boolean;
}

// ============================================
// Extended Types (with relations)
// ============================================

export interface TrackWithRelations extends Track {
  artist_name?: string;
  album_title?: string;
  album_artwork_path?: string;
}

export interface AlbumWithRelations extends Album {
  artist?: Artist;
  tracks?: Track[];
}

export interface PlaylistWithTracks extends Playlist {
  tracks?: TrackWithRelations[];
}

// ============================================
// Input Types (for creating/updating)
// ============================================

export interface CreateTrackInput {
  title: string;
  artist_name?: string;
  album_title?: string;
  album_artist?: string;
  track_number?: number;
  disc_number?: number;
  duration_ms: number;
  file_path: string;
  file_size?: number;
  file_format?: string;
  sample_rate?: number;
  bit_rate?: number;
  channels?: number;
  genre?: string;
  year?: number;
}

export interface CreatePlaylistInput {
  name: string;
  description?: string;
}

// ============================================
// App Settings Types (Tauri Store)
// ============================================

export interface AppSettings {
  // Audio settings
  volume: number; // 0-100
  muted: boolean;
  crossfade: number; // seconds

  // Playback settings
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  gapless: boolean;

  // UI settings
  theme: 'light' | 'dark' | 'system';
  sidebarWidth: number;
  showArtwork: boolean;

  // Library settings
  musicFolders: string[];
  watchFolders: boolean;

  // Window state
  windowWidth: number;
  windowHeight: number;
  windowMaximized: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  volume: 80,
  muted: false,
  crossfade: 0,
  shuffle: false,
  repeat: 'off',
  gapless: true,
  theme: 'system',
  sidebarWidth: 240,
  showArtwork: true,
  musicFolders: [],
  watchFolders: true,
  windowWidth: 1200,
  windowHeight: 800,
  windowMaximized: false,
};
