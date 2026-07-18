import { create } from "zustand";
import {
  Playlist,
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  addTrackToPlaylist,
  reorderPlaylist,
  deletePlaylist,
} from "@/lib/api";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface PlaylistState {
  playlists: Playlist[];
  isLoading: boolean;

  fetchPlaylists: () => Promise<void>;
  refreshPlaylists: () => Promise<void>;

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

  resetPlaylists: () => void;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  isLoading: false,

  resetPlaylists: () => {
    set({ playlists: [], isLoading: false });
  },

  fetchPlaylists: async () => {
    set({ isLoading: true });
    try {
      const playlists = await getPlaylists();
      set({ playlists, isLoading: false });
    } catch (error) {
      logger.error("Failed to fetch playlists", error);
      set({ isLoading: false });
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
      await get().refreshPlaylists();
    } catch (error) {
      logger.error("Failed to add to playlist", error);
    }
  },

  reorderPlaylist: async (id, newOrder) => {
    try {
      await reorderPlaylist(id, newOrder);
    } catch (error) {
      logger.error("Failed to reorder playlist", error);
    }
  },
}));
