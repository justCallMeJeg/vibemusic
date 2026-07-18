import { create } from "zustand";
import {
  Track,
  Album,
  Artist,
  getTracks,
  getAlbums,
  getArtists,
} from "@/lib/api";
import { logger } from "@/lib/logger";

interface ContentState {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  isLoading: boolean;
  isInitialized: boolean;

  fetchContent: () => Promise<void>;

  refreshTracks: () => Promise<void>;
  refreshAlbums: () => Promise<void>;
  refreshArtists: () => Promise<void>;

  resetContent: (isLoading?: boolean) => void;
}

export const useContentStore = create<ContentState>((set) => ({
  tracks: [],
  albums: [],
  artists: [],
  isLoading: false,
  isInitialized: false,

  resetContent: (isLoading = false) => {
    set({
      tracks: [],
      albums: [],
      artists: [],
      isLoading,
      isInitialized: false,
    });
  },

  fetchContent: async () => {
    set({ isLoading: true });
    try {
      const [tracks, albums, artists] = await Promise.all([
        getTracks(),
        getAlbums(),
        getArtists(),
      ]);
      set({
        tracks,
        albums,
        artists,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      logger.error("Failed to fetch library content", error);
      set({ isLoading: false });
    }
  },

  refreshTracks: async () => {
    try {
      const tracks = await getTracks();
      set({ tracks });
    } catch (error) {
      logger.error("Failed to refresh tracks", error);
    }
  },

  refreshAlbums: async () => {
    try {
      const albums = await getAlbums();
      set({ albums });
    } catch (error) {
      logger.error("Failed to refresh albums", error);
    }
  },

  refreshArtists: async () => {
    try {
      const artists = await getArtists();
      set({ artists });
    } catch (error) {
      logger.error("Failed to refresh artists", error);
    }
  },
}));
