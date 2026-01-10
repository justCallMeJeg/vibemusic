import { create } from "zustand";

// --- Types ---
// --- Types ---
export type Page = "home" | "songs" | "albums" | "playlists" | "settings";

export type DetailView =
  | { type: "album"; id: number }
  | { type: "playlist"; id: number }
  | null;

interface NavigationState {
  currentPage: Page;
  detailView: DetailView;
  isSearchOpen: boolean;
}

interface NavigationActions {
  setPage: (page: Page) => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  openAlbumDetail: (albumId: number) => void;
  openPlaylistDetail: (playlistId: number) => void;
  goBack: () => void;
}

type NavigationStore = NavigationState & NavigationActions;

// --- Store Implementation ---
export const useNavigationStore = create<NavigationStore>((set) => ({
  // Initial State
  currentPage: "home",
  detailView: null,
  isSearchOpen: false,

  // Actions
  setPage: (page) => set({ currentPage: page, detailView: null }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

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
