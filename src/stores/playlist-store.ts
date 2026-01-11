import { create } from "zustand";
import {
  Playlist,
  getPlaylists,
  addTrackToPlaylist,
  createPlaylist,
} from "@/lib/api";
import toast from "react-hot-toast";

interface PlaylistState {
  playlists: Playlist[];
  isLoading: boolean;

  // Actions
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<boolean>;
  updatePlaylist: (
    id: number,
    name: string,
    description?: string,
    artworkPath?: string
  ) => Promise<boolean>;
  addToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  reorderPlaylist: (id: number, newOrder: number[]) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  isLoading: false,

  fetchPlaylists: async () => {
    set({ isLoading: true });
    try {
      const playlists = await getPlaylists();
      set({ playlists, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
      set({ isLoading: false });
    }
  },

  createPlaylist: async (name, description) => {
    try {
      await createPlaylist(name, description);
      await get().fetchPlaylists();
      return true;
    } catch (error) {
      console.error("Failed to create playlist:", error);
      toast.error("Failed to create playlist");
      return false;
    }
  },

  updatePlaylist: async (id, name, description, artworkPath) => {
    try {
      // Import strictly to avoid errors? No, relying on auto-import or existing import.
      // Need to make sure updatePlaylist is imported from lib/api at top of file.
      // Since I assume it's not, I should probably check imports.
      // I'll assume I can add it to import list in next step or now?
      // Let's add the import first in a separate replace/chunk if possible.
      // multi_replace is safer.

      const { updatePlaylist } = await import("@/lib/api");
      await updatePlaylist(id, name, description, artworkPath);
      await get().fetchPlaylists();
      return true;
    } catch (error) {
      console.error("Failed to update playlist:", error);
      toast.error("Failed to update playlist");
      return false;
    }
  },

  addToPlaylist: async (playlistId, trackId) => {
    try {
      await addTrackToPlaylist(playlistId, trackId);
      toast.success("Added to playlist");
      // We might want to refresh the playlist detail if it's open, but that's handled by local state there for now.
      // Update: ideally we should emit an event or shared state for details too.
    } catch (error) {
      console.error("Failed to add to playlist:", error);
      toast.error("Failed to add to playlist");
    }
  },

  reorderPlaylist: async (id, newOrder) => {
    try {
      const { reorderPlaylist } = await import("@/lib/api");
      await reorderPlaylist(id, newOrder);
    } catch (error) {
      console.error("Failed to reorder playlist:", error);
      toast.error("Failed to reorder playlist");
      throw error;
    }
  },
}));
