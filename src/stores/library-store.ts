import { create } from "zustand";
import {
  Track,
  Album,
  Playlist,
  getTracks,
  getAlbums,
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  addTrackToPlaylist,
  reorderPlaylist,
  deletePlaylist,
} from "@/lib/api";
import { toast } from "sonner";

interface LibraryState {
  tracks: Track[];
  albums: Album[];
  playlists: Playlist[];
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  fetchLibrary: () => Promise<void>;

  // Granular refreshes
  refreshTracks: () => Promise<void>;
  refreshAlbums: () => Promise<void>;
  refreshPlaylists: () => Promise<void>;

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
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  albums: [],
  playlists: [],
  isLoading: false,
  isInitialized: false,

  fetchLibrary: async () => {
    set({ isLoading: true });
    try {
      const [tracks, albums, playlists] = await Promise.all([
        getTracks(),
        getAlbums(),
        getPlaylists(),
      ]);
      set({ tracks, albums, playlists, isLoading: false, isInitialized: true });
    } catch (error) {
      console.error("Failed to fetch library:", error);
      set({ isLoading: false });
      toast.error("Failed to load library");
    }
  },

  refreshTracks: async () => {
    try {
      const tracks = await getTracks();
      set({ tracks });
    } catch (error) {
      console.error("Failed to refresh tracks:", error);
    }
  },

  refreshAlbums: async () => {
    try {
      const albums = await getAlbums();
      set({ albums });
    } catch (error) {
      console.error("Failed to refresh albums:", error);
    }
  },

  refreshPlaylists: async () => {
    try {
      const playlists = await getPlaylists();
      set({ playlists });
    } catch (error) {
      console.error("Failed to refresh playlists:", error);
    }
  },

  createPlaylist: async (name, description) => {
    try {
      await createPlaylist(name, description);
      await get().refreshPlaylists();
      toast.success("Playlist created");
      return true;
    } catch (error) {
      console.error("Failed to create playlist:", error);
      toast.error("Failed to create playlist");
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
      console.error("Failed to update playlist:", error);
      toast.error("Failed to update playlist");
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
      console.error("Failed to delete playlist:", error);
      toast.error("Failed to delete playlist");
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
      console.error("Failed to add to playlist:", error);
      toast.error("Failed to add to playlist");
    }
  },

  reorderPlaylist: async (id, newOrder) => {
    try {
      await reorderPlaylist(id, newOrder);
      // No need to refresh global list for reordering tracks inside a playlist
    } catch (error) {
      console.error("Failed to reorder playlist:", error);
      toast.error("Failed to reorder playlist");
      throw error;
    }
  },
}));
