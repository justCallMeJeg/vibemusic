import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/lib/logger";

interface TopTrack {
  id: number;
  title: string;
  artist: string;
  cover_image: string | null;
  play_count: number;
  duration_ms: number;
}

interface TopArtist {
  id: number;
  name: string;
  cover_image: string | null;
  play_count: number;
}

interface TopAlbum {
  id: number;
  title: string;
  artist: string;
  cover_image: string | null;
  play_count: number;
}

interface ActivityPoint {
  date: string;
  duration_ms: number;
}

interface TopGenre {
  genre: string;
  play_count: number;
}

interface StatsData {
  top_tracks: TopTrack[];
  top_artists: TopArtist[];
  top_albums: TopAlbum[];
  activity_history: ActivityPoint[];
  top_genres: TopGenre[];
  total_listening_ms: number;
}

interface StatsState {
  isLoading: boolean;
  data: StatsData | null;
  error: string | null;

  fetchStats: () => Promise<void>;
  recordPlayback: (trackId: number, durationMs: number) => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  isLoading: false,
  data: null,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await invoke<StatsData>("get_stats");
      set({ data, isLoading: false });
    } catch (e) {
      logger.error("Failed to fetch stats", e);
      set({
        error: "Failed to load statistics",
        isLoading: false,
      });
    }
  },

  recordPlayback: async (trackId, durationMs) => {
    try {
      await invoke("record_playback", { trackId, durationMs });
    } catch (e) {
      logger.error("Failed to record playback", e);
    }
  },
}));
