import { create } from "zustand";

// --- Types ---
export type Page = "songs" | "albums" | "playlists" | "settings";

export type DetailView =
  | { type: "album"; id: number }
  | { type: "playlist"; id: number }
  | null;

interface NavigationState {
  currentPage: Page;
  detailView: DetailView;
}

interface NavigationActions {
  setPage: (page: Page) => void;
  openAlbumDetail: (albumId: number) => void;
  openPlaylistDetail: (playlistId: number) => void;
  goBack: () => void;
}

type NavigationStore = NavigationState & NavigationActions;

// --- Store Implementation ---
export const useNavigationStore = create<NavigationStore>((set) => ({
  // Initial State
  currentPage: "songs",
  detailView: null,

  // Actions
  setPage: (page) => set({ currentPage: page, detailView: null }),

  openAlbumDetail: (albumId) =>
    set({ currentPage: "albums", detailView: { type: "album", id: albumId } }),

  openPlaylistDetail: (playlistId) =>
    set({
      currentPage: "playlists",
      detailView: { type: "playlist", id: playlistId },
    }),

  goBack: () => set({ detailView: null }),
}));

// --- Selectors ---
export const useCurrentPage = () => useNavigationStore((s) => s.currentPage);
export const useDetailView = () => useNavigationStore((s) => s.detailView);

// --- Static action getters ---
export const getNavigationActions = () => {
  const s = useNavigationStore.getState();
  return {
    setPage: s.setPage,
    openAlbumDetail: s.openAlbumDetail,
    openPlaylistDetail: s.openPlaylistDetail,
    goBack: s.goBack,
  };
};
