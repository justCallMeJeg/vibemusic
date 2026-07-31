import { create } from "zustand";
import {
  Playlist,
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  addTrackToPlaylist,
  reorderPlaylist,
  deletePlaylist,
  toggleLikeTrack,
  getLikedTrackIds,
  togglePinPlaylist,
} from "@/lib/api";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface PlaylistState {
  playlists: Playlist[];
  isLoading: boolean;
  likedTrackIds: Set<number>;

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

  toggleLike: (trackId: number) => Promise<boolean>;
  fetchLikedTrackIds: () => Promise<void>;

  togglePin: (playlistId: number, pinned: boolean) => Promise<void>;

  resetPlaylists: () => void;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  isLoading: false,
  likedTrackIds: new Set<number>(),

  resetPlaylists: () => {
    set({ playlists: [], isLoading: false, likedTrackIds: new Set() });
  },

  fetchPlaylists: async () => {
    set({ isLoading: true });
    try {
      const [playlists, likedIds] = await Promise.all([
        getPlaylists(),
        getLikedTrackIds(),
      ]);
      set({ playlists, likedTrackIds: new Set(likedIds), isLoading: false });
    } catch (error) {
      logger.error("Failed to fetch playlists", error);
      set({ isLoading: false });
    }
  },

  refreshPlaylists: async () => {
    try {
      const [playlists, likedIds] = await Promise.all([
        getPlaylists(),
        getLikedTrackIds(),
      ]);
      set({ playlists, likedTrackIds: new Set(likedIds) });
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
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("UNIQUE constraint")) {
        toast.error("A playlist with this name already exists");
      } else {
        logger.error("Failed to create playlist", error);
      }
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
    const playlist = get().playlists.find((p) => p.id === id);
    if (playlist?.is_system) {
      toast.error("Cannot delete a system playlist");
      return false;
    }
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

  toggleLike: async (trackId) => {
    const prev = get().likedTrackIds;
    const optimistic = new Set(prev);
    const wasLiked = prev.has(trackId);
    if (wasLiked) {
      optimistic.delete(trackId);
    } else {
      optimistic.add(trackId);
    }
    set({ likedTrackIds: optimistic });
    try {
      const nowLiked = await toggleLikeTrack(trackId);
      if (nowLiked !== !wasLiked) {
        const corrected = new Set(optimistic);
        if (nowLiked) {
          corrected.add(trackId);
        } else {
          corrected.delete(trackId);
        }
        set({ likedTrackIds: corrected });
      }
      return nowLiked;
    } catch (error) {
      set({ likedTrackIds: prev });
      logger.error("Failed to toggle like", error);
      toast.error("Failed to update like");
      return false;
    }
  },

  fetchLikedTrackIds: async () => {
    try {
      const ids = await getLikedTrackIds();
      set({ likedTrackIds: new Set(ids) });
    } catch (error) {
      logger.error("Failed to fetch liked track IDs", error);
    }
  },

  togglePin: async (playlistId, pinned) => {
    try {
      await togglePinPlaylist(playlistId, pinned);
      await get().refreshPlaylists();
      if (pinned) {
        toast.success("Playlist pinned");
      } else {
        toast.success("Playlist unpinned");
      }
    } catch (error) {
      logger.error("Failed to toggle pin", error);
    }
  },
}));

export const useLikedTrackIds = () => usePlaylistStore((s) => s.likedTrackIds);
export const useToggleLike = () => usePlaylistStore((s) => s.toggleLike);
