import { invoke } from "@tauri-apps/api/core";

export interface Track {
  id: number;
  title: string;
  artist: string | null;
  artist_id: number | null;
  album: string | null;
  album_id: number | null;
  duration_ms: number;
  file_path: string;
  artwork_path: string | null;
  track_number: number | null;
}

export interface Album {
  id: number;
  title: string;
  artist_id: number | null;
  artist_name: string | null;
  year: number | null;
  artwork_path: string | null;
  track_count: number;
  total_duration_ms: number;
}

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  artwork_path: string | null;
  track_count: number;
  created_at: string;
}

export interface Artist {
  id: number;
  name: string;
  album_count: number;
  track_count: number;
  artwork_path: string | null;
}

/**
 * Retrieves all tracks from the library.
 * @returns {Promise<Track[]>} List of all tracks.
 */
export async function getTracks(): Promise<Track[]> {
  return await invoke("get_all_tracks");
}

/**
 * Retrieves all albums from the library.
 * @returns {Promise<Album[]>} List of all albums.
 */
export async function getAlbums(): Promise<Album[]> {
  return await invoke("get_all_albums");
}

/**
 * Retrieves all artists from the library.
 * @returns {Promise<Artist[]>} List of all artists.
 */
export async function getArtists(): Promise<Artist[]> {
  return await invoke("get_all_artists");
}

/**
 * Retrieves a specific artist by ID.
 * @param {number} id - The artist ID.
 * @returns {Promise<Artist | null>} The artist object or null if not found.
 */
export async function getArtistById(id: number): Promise<Artist | null> {
  return await invoke("get_artist_by_id", { id });
}

/**
 * Retrieves all albums by a specific artist.
 * @param {number} id - The artist ID.
 * @returns {Promise<Album[]>} List of albums by the artist.
 */
export async function getArtistAlbums(id: number): Promise<Album[]> {
  return await invoke("get_artist_albums", { id });
}

/**
 * Retrieves all tracks by a specific artist.
 * @param {number} id - The artist ID.
 * @returns {Promise<Track[]>} List of tracks by the artist.
 */
export async function getArtistTracks(id: number): Promise<Track[]> {
  return await invoke("get_artist_tracks", { id });
}

/**
 * Retrieves a specific album by ID.
 * @param {number} id - The album ID.
 * @returns {Promise<Album | null>} The album object or null if not found.
 */
export async function getAlbumById(id: number): Promise<Album | null> {
  return await invoke("get_album_by_id", { id });
}

/**
 * Retrieves all tracks in a specific album.
 * @param {number} albumId - The album ID.
 * @returns {Promise<Track[]>} List of tracks in the album.
 */
export async function getAlbumTracks(albumId: number): Promise<Track[]> {
  return await invoke("get_album_tracks", { albumId });
}

/**
 * Creates a new playlist.
 * @param {string} name - The name of the playlist.
 * @param {string} [description] - Optional description of the playlist.
 * @returns {Promise<Playlist>} The created playlist object.
 */
export async function createPlaylist(
  name: string,
  description?: string
): Promise<Playlist> {
  return await invoke("create_playlist", { name, description });
}

/**
 * Updates an existing playlist.
 * @param {number} id - The playlist ID.
 * @param {string} name - The new name.
 * @param {string} [description] - The new description.
 * @param {string} [artwork_path] - The new artwork path.
 * @returns {Promise<void>}
 */
export async function updatePlaylist(
  id: number,
  name: string,
  description?: string,
  artwork_path?: string
): Promise<void> {
  return await invoke("update_playlist", {
    id,
    name,
    description,
    artworkPath: artwork_path,
  });
}

/**
 * Deletes a playlist by ID.
 * @param {number} id - The playlist ID.
 * @returns {Promise<void>}
 */
export async function deletePlaylist(id: number): Promise<void> {
  return await invoke("delete_playlist", { id });
}

export async function getPlaylists(): Promise<Playlist[]> {
  return await invoke("get_playlists");
}

export async function getPlaylistTracks(id: number): Promise<Track[]> {
  return await invoke("get_playlist_tracks", { id });
}

export async function addTrackToPlaylist(
  playlistId: number,
  trackId: number
): Promise<void> {
  return await invoke("add_track_to_playlist", { playlistId, trackId });
}

export async function removeTrackFromPlaylist(
  playlistId: number,
  trackId: number
): Promise<void> {
  return await invoke("remove_track_from_playlist", { playlistId, trackId });
}

export async function reorderPlaylist(
  id: number,
  newOrder: number[]
): Promise<void> {
  return await invoke("reorder_playlist", { id, newOrder });
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  playlists: Playlist[];
}

export async function search(query: string): Promise<SearchResults> {
  return await invoke("search", { query });
}

export interface MediaMetadata {
  duration_ms: number;
  sample_rate: number;
  channels: number;
  format_name: string;
  album_artist?: string;
  composer?: string;
  copyright?: string;
  date?: string;
  genre?: string;
}

export async function probeFile(path: string): Promise<MediaMetadata> {
  return await invoke("probe_file", { path });
}
