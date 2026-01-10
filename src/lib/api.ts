import { invoke } from "@tauri-apps/api/core";

export interface Track {
  id: number;
  title: string;
  artist: string | null;
  album: string | null;
  duration_ms: number;
  file_path: string;
  artwork_path: string | null;
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

export async function getTracks(): Promise<Track[]> {
  return await invoke("get_all_tracks");
}

export async function getAlbums(): Promise<Album[]> {
  return await invoke("get_all_albums");
}

export async function getAlbumById(id: number): Promise<Album | null> {
  return await invoke("get_album_by_id", { id });
}

export async function getAlbumTracks(albumId: number): Promise<Track[]> {
  return await invoke("get_album_tracks", { albumId });
}

export async function createPlaylist(
  name: string,
  description?: string
): Promise<Playlist> {
  return await invoke("create_playlist", { name, description });
}

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
