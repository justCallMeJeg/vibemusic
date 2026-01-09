/**
 * Storage Services Index
 * Re-exports database and settings services for easy imports
 */

// Database service
export {
  initializeDatabase,
  getDatabase,
  // Artist operations
  getArtists,
  getArtistById,
  getOrCreateArtist,
  // Album operations
  getAlbums,
  getAlbumById,
  getOrCreateAlbum,
  // Track operations
  getTracks,
  getTrackById,
  getTrackByFilePath,
  getTracksWithRelations,
  addTrack,
  deleteTrack,
  deleteTrackByFilePath,
  getTrackCount,
  // Playlist operations
  getPlaylists,
  getPlaylistById,
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  getPlaylistTracks,
  // Play history operations
  addPlayHistory,
  getRecentlyPlayed,
  clearPlayHistory,
} from './database';

// Settings service
export {
  initializeSettings,
  getStore,
  getSettings,
  updateSettings,
  resetSettings,
  // Individual setting helpers
  getVolume,
  setVolume,
  getMuted,
  setMuted,
  getTheme,
  setTheme,
  getShuffle,
  setShuffle,
  getRepeat,
  setRepeat,
  getMusicFolders,
  addMusicFolder,
  removeMusicFolder,
  // Window state helpers
  saveWindowState,
  getWindowState,
} from './settings';

// Types
export type {
  Track,
  Artist,
  Album,
  Playlist,
  PlaylistTrack,
  PlayHistory,
  TrackWithRelations,
  AlbumWithRelations,
  PlaylistWithTracks,
  CreateTrackInput,
  CreatePlaylistInput,
  AppSettings,
} from '../types/database';

export { DEFAULT_SETTINGS } from '../types/database';
