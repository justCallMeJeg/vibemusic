import { create } from "zustand";
import {
  Track,
  Album,
  Playlist,
  Artist,
  getTracks,
  getAlbums,
  getPlaylists,
  getArtists,
  createPlaylist,
  updatePlaylist,
  addTrackToPlaylist,
  reorderPlaylist,
  deletePlaylist,
} from "@/lib/api";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface LibraryState {
  tracks: Track[];
  albums: Album[];
  playlists: Playlist[];
  artists: Artist[];
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  fetchLibrary: () => Promise<void>;

  // Granular refreshes
  refreshTracks: () => Promise<void>;
  refreshAlbums: () => Promise<void>;
  refreshPlaylists: () => Promise<void>;
  refreshArtists: () => Promise<void>;

  // Playlist Management
  createPlaylist: (name: string, description?: string) => Promise<boolean>;
  updatePlaylist: (
    id: number,
    name: string,
    description?: string,
    artworkPath?: string
  ) => Promise<boolean>;
  deletePlaylist: (id: number) => Promise<boolean>;
  addToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  reorderPlaylist: (id: number, newOrder: number[]) => Promise<void>;

  // Reset
  resetLibrary: (isLoading?: boolean) => void;
}

/**
 * Store for managing the music library (tracks, albums, playlists, artists).
 */
export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  albums: [],
  playlists: [],
  artists: [],
  isLoading: false,
  isInitialized: false,

  resetLibrary: (isLoading = false) => {
    set({
      tracks: [],
      albums: [],
      playlists: [],
      artists: [],
      isLoading,
      isInitialized: false,
    });
  },

  fetchLibrary: async () => {
    set({ isLoading: true });
    try {
      const [tracks, albums, playlists, artists] = await Promise.all([
        getTracks(),
        getAlbums(),
        getPlaylists(),
        getArtists(),
      ]);
      set({
        tracks,
        albums,
        playlists,
        artists,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      logger.error("Failed to fetch library", error);
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

  refreshPlaylists: async () => {
    try {
      const playlists = await getPlaylists();
      set({ playlists });
    } catch (error) {
      logger.error("Failed to refresh playlists", error);
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

  createPlaylist: async (name, description) => {
    try {
      await createPlaylist(name, description);
      await get().refreshPlaylists();
      toast.success("Playlist created");
      return true;
    } catch (error) {
      logger.error("Failed to create playlist", error);
      return false;
    }
  },

  updatePlaylist: async (id, name, description, artworkPath) => {
    try {
      await updatePlaylist(id, name, description, artworkPath);
      await get().refreshPlaylists();
      toast.success("Playlist updated");
      return true;
    } catch (error) {
      logger.error("Failed to update playlist", error);
      return false;
    }
  },

  deletePlaylist: async (id) => {
    try {
      await deletePlaylist(id);
      await get().refreshPlaylists();
      toast.success("Playlist deleted");
      return true;
    } catch (error) {
      logger.error("Failed to delete playlist", error);
      return false;
    }
  },

  addToPlaylist: async (playlistId, trackId) => {
    try {
      await addTrackToPlaylist(playlistId, trackId);
      toast.success("Added to playlist");
      // Note: We don't necessarily need to refresh the global playlist list here
      // unless we want to update track counts immediately.
      // Let's do it to be safe and consistent.
      await get().refreshPlaylists();
    } catch (error) {
      logger.error("Failed to add to playlist", error);
    }
  },

  reorderPlaylist: async (id, newOrder) => {
    try {
      await reorderPlaylist(id, newOrder);
      // No need to refresh global list for reordering tracks inside a playlist
    } catch (error) {
      logger.error("Failed to reorder playlist", error);
      throw error;
    }
  },
}));
