import { create } from "zustand";
import { getCurrentWindow, currentMonitor, LogicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit, listen } from "@tauri-apps/api/event";
import { useSettingsStore } from "./settings-store";
import { useAudioStore } from "./audio-store";
import { logger } from "@/lib/logger";

// --- Types ---

export type Page =
  | "home"
  | "songs"
  | "albums"
  | "playlists"
  | "artists"
  | "settings"
  | "insights"
  | "about";

export type DetailView =
  | { type: "album"; id: number }
  | { type: "playlist"; id: number }
  | { type: "artist"; id: number }
  | null;

export interface BreadcrumbEntry {
  label: string;
  page: Page;
  detailView?: DetailView;
}

export const PAGE_LABELS: Record<Page, string> = {
  home: "Home",
  songs: "Songs",
  albums: "Albums",
  playlists: "Playlists",
  artists: "Artists",
  settings: "Settings",
  insights: "Insights",
  about: "About",
};

interface NavigationState {
  currentPage: Page;
  detailView: DetailView;
  isSearchOpen: boolean;
  isMiniPlayer: boolean;
  history: BreadcrumbEntry[];
}

interface NavigationActions {
  setPage: (page: Page) => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  openAlbumDetail: (albumId: number, title?: string) => void;
  openPlaylistDetail: (playlistId: number, title?: string) => void;
  openArtistDetail: (artistId: number, title?: string) => void;
  goBack: () => void;
  navigateToHistoryIndex: (index: number) => void;
  updateBreadcrumbLabel: (type: "album" | "artist" | "playlist", id: number, label: string) => void;
  toggleMiniPlayer: () => Promise<void>;
  resetNavigation: () => void;
}

type NavigationStore = NavigationState & NavigationActions;

// --- Store Implementation ---
/**
 * Store for managing application navigation and UI state (pages, detail views, mini player).
 */
const MAX_HISTORY = 20;

export const useNavigationStore = create<NavigationStore>((set) => ({
  // Initial State
  currentPage: "home",
  detailView: null,
  isSearchOpen: false,
  isMiniPlayer: false,
  history: [{ label: PAGE_LABELS.home, page: "home" }],

  // Actions
  resetNavigation: () =>
    set({
      currentPage: "home",
      detailView: null,
      isSearchOpen: false,
      isMiniPlayer: false,
      history: [{ label: PAGE_LABELS.home, page: "home" }],
    }),

  setPage: (page) =>
    set({
      currentPage: page,
      detailView: null,
      history: [{ label: PAGE_LABELS[page], page }],
    }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  openAlbumDetail: (albumId, title) =>
    set((state) => {
      const newHistory = [...state.history];
      newHistory.push({
        label: title || "Album",
        page: "albums",
        detailView: { type: "album", id: albumId },
      });
      if (newHistory.length > MAX_HISTORY) newHistory.splice(0, 1);
      return {
        history: newHistory,
        currentPage: "albums",
        detailView: { type: "album", id: albumId },
      };
    }),

  openPlaylistDetail: (playlistId, title) =>
    set((state) => {
      const newHistory = [...state.history];
      newHistory.push({
        label: title || "Playlist",
        page: "playlists",
        detailView: { type: "playlist", id: playlistId },
      });
      if (newHistory.length > MAX_HISTORY) newHistory.splice(0, 1);
      return {
        history: newHistory,
        currentPage: "playlists",
        detailView: { type: "playlist", id: playlistId },
      };
    }),

  openArtistDetail: (artistId, title) =>
    set((state) => {
      const newHistory = [...state.history];
      newHistory.push({
        label: title || "Artist",
        page: "artists",
        detailView: { type: "artist", id: artistId },
      });
      if (newHistory.length > MAX_HISTORY) newHistory.splice(0, 1);
      return {
        history: newHistory,
        currentPage: "artists",
        detailView: { type: "artist", id: artistId },
      };
    }),

  goBack: () =>
    set((state) => {
      if (state.history.length <= 1) {
        return { detailView: null };
      }
      const newHistory = state.history.slice(0, -1);
      const lastEntry = newHistory[newHistory.length - 1];
      return {
        history: newHistory,
        currentPage: lastEntry.page,
        detailView: lastEntry.detailView || null,
      };
    }),

  navigateToHistoryIndex: (index) =>
    set((state) => {
      if (index < 0 || index >= state.history.length) return state;
      const newHistory = state.history.slice(0, index + 1);
      const entry = newHistory[index];
      return {
        history: newHistory,
        currentPage: entry.page,
        detailView: entry.detailView || null,
      };
    }),

  updateBreadcrumbLabel: (type, id, label) =>
    set((state) => ({
      history: state.history.map((entry) =>
        entry.detailView?.type === type && entry.detailView?.id === id
          ? { ...entry, label }
          : entry,
      ),
    })),

  toggleMiniPlayer: async () => {
    const cleanup: (() => void)[] = [];
    const addCleanup = (fn: () => void) => { cleanup.push(fn); };
    const runCleanup = () => { cleanup.forEach((fn) => { try { fn(); } catch { /* ignore */ } }); cleanup.length = 0; };

    try {
      const state = useNavigationStore.getState();
      const appWindow = getCurrentWindow();
      const settings = useSettingsStore.getState();
      const audioState = useAudioStore.getState();

      if (state.isMiniPlayer) {
        // EXITING - fallback if close listener didn't fire
        logger.debug("Exiting Mini Player via main window...");
        const miniplayer = await WebviewWindow.getByLabel("miniplayer");
        if (miniplayer) {
          try { await miniplayer.hide(); } catch { /* window may already be gone */ }
        }
        await appWindow.show();
        set({ isMiniPlayer: false, isSearchOpen: false });
        return;
      }

      // ENTERING MINI PLAYER
      logger.debug("Entering Mini Player...");

      let width = 300;
      let height = 360;

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

      // Calculate position on current monitor
      const [factor, monitor] = await Promise.all([
        appWindow.scaleFactor(),
        currentMonitor(),
      ]);
      let x = 0;
      let y = 0;

      if (monitor) {
        const padding = 20 * factor;
        const taskbarPadding = 60 * factor;
        const windowWidthPhysical = width * factor;
        const windowHeightPhysical = height * factor;

        const pos = settings.miniPlayerPosition || "bottom-right";

        if (pos.includes("right")) {
          x = Math.round(monitor.size.width - windowWidthPhysical - padding);
        } else {
          x = Math.round(padding);
        }

        if (pos.includes("bottom")) {
          y = Math.round(monitor.size.height - windowHeightPhysical - taskbarPadding);
        } else {
          y = Math.round(padding);
        }
      }

      // Get the pre-configured miniplayer window from tauri.conf.json
      const miniplayer = await WebviewWindow.getByLabel("miniplayer");
      if (!miniplayer) {
        logger.error("Miniplayer window not found in config");
        return;
      }

      // Set size and position
      await Promise.all([
        miniplayer.setSize(new LogicalSize(width, height)),
        miniplayer.setPosition(new PhysicalPosition(x, y)),
      ]);

      // Emit current state
      await emit("miniplayer:init", {
        currentTrack: audioState.currentTrack,
        position: audioState.position,
        duration: audioState.duration,
        volume: audioState.volume,
        shuffle: audioState.shuffle,
        repeat: audioState.repeat,
        miniPlayerStyle: settings.miniPlayerStyle,
        miniPlayerPosition: settings.miniPlayerPosition,
      });

      // Register all listeners in parallel
      const [unlistenClose, unlistenNext, unlistenPrev, unlistenShuffle, unlistenRepeat, unlistenFocus] =
        await Promise.all([
          listen("miniplayer:close", async () => {
            runCleanup();
            const mp = await WebviewWindow.getByLabel("miniplayer");
            if (mp) {
              try { await mp.hide(); } catch { /* already hidden */ }
            }
            await appWindow.show();
            set({ isMiniPlayer: false, isSearchOpen: false });
          }),
          listen("miniplayer:next", () => {
            useAudioStore.getState().next();
          }),
          listen("miniplayer:previous", () => {
            useAudioStore.getState().previous();
          }),
          listen<{ shuffle: boolean }>(
            "miniplayer:toggle-shuffle",
            (e) => { useAudioStore.setState({ shuffle: e.payload.shuffle }); },
          ),
          listen<{ repeat: string }>(
            "miniplayer:toggle-repeat",
            (e) => { useAudioStore.setState({ repeat: e.payload.repeat as "off" | "all" | "one" }); },
          ),
          appWindow.listen("tauri://focus", async () => {
            if (useNavigationStore.getState().isMiniPlayer) {
              runCleanup();
              const mp = await WebviewWindow.getByLabel("miniplayer");
              if (mp) {
                try { await mp.hide(); } catch { /* already hidden */ }
              }
              set({ isMiniPlayer: false, isSearchOpen: false });
            }
          }),
        ]);
      addCleanup(unlistenClose);
      addCleanup(unlistenNext);
      addCleanup(unlistenPrev);
      addCleanup(unlistenShuffle);
      addCleanup(unlistenRepeat);
      addCleanup(unlistenFocus);

      // All setup done — now switch to miniplayer state
      set({ isMiniPlayer: true });

      // Show miniplayer, then hide main (sequential to avoid race)
      await miniplayer.show();
      await appWindow.hide();
    } catch (e) {
      logger.error("Failed to toggle Mini Player", e);
      runCleanup();
      try {
        await getCurrentWindow().show();
      } catch { /* window may already be visible */ }
      set({ isMiniPlayer: false });
    }
  },
}));

// --- Selectors ---
export const useCurrentPage = () => useNavigationStore((s) => s.currentPage);
export const useDetailView = () => useNavigationStore((s) => s.detailView);
export const useBreadcrumbs = () => useNavigationStore((s) => s.history);
export const useHistoryIndex = () =>
  useNavigationStore((s) => s.history.length - 1);
export const useGoBack = () => useNavigationStore((s) => s.goBack);
export const useNavigateToHistoryIndex = () =>
  useNavigationStore((s) => s.navigateToHistoryIndex);
export const useUpdateBreadcrumbLabel = () =>
  useNavigationStore((s) => s.updateBreadcrumbLabel);


