import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/lib/logger";

interface TopTrack {
  id: number;
  title: string;
  artist: string;
  cover_image: string | null;
  file_path: string;
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

export interface TopGenre {
  genre: string;
  play_count: number;
}

export interface HeatmapPoint {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  intensity: number; // Raw play count
  normalized: number; // Plays per day (for cross-range comparison)
}

export interface TrendsData {
  listening_time_change: number;
  play_count_change: number;
  new_artists_count: number;
}

export interface StreaksData {
  current_streak: number;
  longest_streak: number;
  week_days: WeekDayStatus[];
}

export interface WeekDayStatus {
  day: string;
  active: boolean;
  date: string;
}

export interface DayNightSplit {
  day_plays: number;
  night_plays: number;
  day_percentage: number;
  night_percentage: number;
}

export interface WeeklyWrapData {
  total_plays: number;
  total_listening_ms: number;
  unique_tracks: number;
  unique_artists: number;
  top_track: string | null;
  top_artist: string | null;
  most_active_day: string | null;
  most_active_day_plays: number;
}

export interface StatsData {
  top_tracks: TopTrack[];
  top_artists: TopArtist[];
  top_albums: TopAlbum[];
  activity_history: ActivityPoint[];
  top_genres: TopGenre[];
  heatmap: HeatmapPoint[];
  trends: TrendsData;
  total_listening_ms: number;
  streaks: StreaksData;
  day_night_split: DayNightSplit;
  weekly_wrap: WeeklyWrapData;
}

// 7 days, 30 days, 6 months, 1 year, all time
export type TimeRange = "7d" | "30d" | "6mo" | "1y" | "all";

interface StatsState {
  isLoading: boolean;
  data: StatsData | null;
  error: string | null;
  timeRange: TimeRange;

  fetchStats: (range?: TimeRange) => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  recordPlayback: (trackId: number, durationMs: number) => Promise<void>;
  resetStats: () => void;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  isLoading: false,
  data: null,
  error: null,
  timeRange: "all",

  setTimeRange: (range) => {
    set({ timeRange: range });
    get().fetchStats(range);
  },

  fetchStats: async (range) => {
    const currentRange = range || get().timeRange;
    set({ isLoading: true, error: null });
    try {
      const data = await invoke<StatsData>("get_stats", {
        timeRange: currentRange,
      });
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

  resetStats: () => set({ data: null, error: null }),
}));
