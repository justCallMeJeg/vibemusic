import { create } from "zustand";
import {
  getCurrentWindow,
  LogicalSize,
  currentMonitor,
  PhysicalPosition,
} from "@tauri-apps/api/window";
import { useSettingsStore } from "./settings-store";
import { logger } from "@/lib/logger";

// --- Types ---

export type Page =
  | "home"
  | "songs"
  | "albums"
  | "playlists"
  | "artists"
  | "settings"
  | "about";

export type DetailView =
  | { type: "album"; id: number }
  | { type: "playlist"; id: number }
  | { type: "artist"; id: number }
  | null;

interface NavigationState {
  currentPage: Page;
  detailView: DetailView;
  isSearchOpen: boolean;
  isMiniPlayer: boolean;
  previousWindowSize: { width: number; height: number } | null;
  previousWindowPosition: { x: number; y: number } | null;
  wasMaximized: boolean;
}

interface NavigationActions {
  setPage: (page: Page) => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  openAlbumDetail: (albumId: number) => void;
  openPlaylistDetail: (playlistId: number) => void;

  openArtistDetail: (artistId: number) => void;
  goBack: () => void;
  toggleMiniPlayer: () => Promise<void>;
}

type NavigationStore = NavigationState & NavigationActions;

// --- Store Implementation ---
/**
 * Store for managing application navigation and UI state (pages, detail views, mini player).
 */
export const useNavigationStore = create<NavigationStore>((set) => ({
  // Initial State
  currentPage: "home",
  detailView: null,
  isSearchOpen: false,
  isMiniPlayer: false,
  previousWindowSize: null,
  previousWindowPosition: null,
  wasMaximized: false,

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

  openArtistDetail: (artistId) =>
    set({
      currentPage: "artists",
      detailView: { type: "artist", id: artistId },
    }),

  goBack: () => set({ detailView: null }),

  toggleMiniPlayer: async () => {
    try {
      const state = useNavigationStore.getState();
      const appWindow = getCurrentWindow();
      const settings = useSettingsStore.getState();

      if (state.isMiniPlayer) {
        // EXITING MINI PLAYER
        logger.debug("Exiting Mini Player...");
        await appWindow.setAlwaysOnTop(false);

        // Restore min size constraints for main app
        await appWindow.setMinSize(new LogicalSize(1280, 720));
        await appWindow.setMaxSize(null); // Unset max size

        // If window was maximized before, restore to maximized state
        if (state.wasMaximized) {
          await appWindow.maximize();
        } else {
          // Restore Size
          if (state.previousWindowSize) {
            await appWindow.setSize(
              new LogicalSize(
                state.previousWindowSize.width,
                state.previousWindowSize.height
              )
            );
          } else {
            await appWindow.setSize(new LogicalSize(1280, 720));
          }

          // Restore Position
          if (state.previousWindowPosition) {
            await appWindow.setPosition(
              new PhysicalPosition(
                state.previousWindowPosition.x,
                state.previousWindowPosition.y
              )
            );
          } else {
            // Default to top-left if no previous position
            await appWindow.setPosition(new PhysicalPosition(50, 50));
          }
        }

        set({
          isMiniPlayer: false,
          previousWindowSize: null,
          previousWindowPosition: null,
          wasMaximized: false,
        });
      } else {
        // ENTERING MINI PLAYER
        logger.debug("Entering Mini Player...");

        // Check if currently maximized before switching
        const isCurrentlyMaximized = await appWindow.isMaximized();

        const factor = await appWindow.scaleFactor();
        const size = await appWindow.innerSize();
        const logicalSize = size.toLogical(factor);
        const position = await appWindow.outerPosition();

        set({
          previousWindowSize: {
            width: logicalSize.width,
            height: logicalSize.height,
          },
          previousWindowPosition: {
            x: position.x,
            y: position.y,
          },
          wasMaximized: isCurrentlyMaximized,
        });

        await appWindow.setAlwaysOnTop(true);

        let width = 300;
        let height = 350;

        // "square" | "wide" | "bar"
        switch (settings.miniPlayerStyle) {
          case "wide":
            width = 400;
            height = 240;
            break;
          case "bar":
            width = 300;
            height = 90;
            break;
          case "square":
          default:
            width = 300;
            height = 360;
            break;
        }

        // Lock window size
        await appWindow.setMinSize(new LogicalSize(width, height));
        await appWindow.setMaxSize(new LogicalSize(width, height));
        await appWindow.setSize(new LogicalSize(width, height));

        // Position based on user preference
        const monitor = await currentMonitor();
        if (monitor) {
          const padding = 20 * factor; // 20px padding from edges
          const taskbarPadding = 60 * factor; // ~60px estimated taskbar spacing
          const windowWidthPhysical = width * factor;
          const windowHeightPhysical = height * factor;

          let x: number;
          let y: number;

          const position = settings.miniPlayerPosition || "bottom-right";

          // Calculate X position
          if (position.includes("right")) {
            x = Math.round(monitor.size.width - windowWidthPhysical - padding);
          } else {
            x = Math.round(padding);
          }

          // Calculate Y position
          if (position.includes("bottom")) {
            y = Math.round(
              monitor.size.height - windowHeightPhysical - taskbarPadding
            );
          } else {
            y = Math.round(padding);
          }

          await appWindow.setPosition(new PhysicalPosition(x, y));
        }

        set({ isMiniPlayer: true });
      }
    } catch (e) {
      logger.error("Failed to toggle Mini Player", e);
    }
  },
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
    openArtistDetail: s.openArtistDetail,
    goBack: s.goBack,
  };
};
