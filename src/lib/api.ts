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

export async function getTracks(): Promise<Track[]> {
  return await invoke("get_all_tracks");
}
