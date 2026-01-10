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
