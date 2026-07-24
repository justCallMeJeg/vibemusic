import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { logger } from "@/lib/logger";

// Lazy store initialization
import { invoke } from "@tauri-apps/api/core";
import { useContentStore } from "@features/library/store/content-store";
import { useAudioStore } from "./audio-store";

const getStore = async () => {
  const state = useSettingsStore.getState();
  if (!state.currentProfileId) {
    throw new Error("No active profile set");
  }
  return load(`settings_${state.currentProfileId}.json`);
};

export interface SidebarItem {
  id: string;
  hidden: boolean;
}

export interface ExperimentalFeatures {
  keyboardNav: boolean;
  focusRegions: boolean;
  showFocusIndicator: boolean;
}

// Helper to get system theme preference
const getSystemTheme = (): "dark" | "light" => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark"; // Fallback to dark
};

// Apply theme class to document
const applyThemeClass = (theme: "dark" | "light" | "system") => {
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(resolvedTheme);
  return resolvedTheme;
};

interface SettingsState {
  theme: "dark" | "light" | "system";
  resolvedTheme: "dark" | "light"; // The actual applied theme
  dynamicGradient: boolean;
  libraryPaths: string[]; // persisted list of folders
  selectedDevice: string | null;
  audioDevices: { name: string }[];
  isLoading: boolean;
  currentProfileId: string | null;

  crossfadeDuration: number; // Audio
  fadeInOutEnabled: boolean;
  fadeInOutDuration: number;
  // ... (rest)
  // Behavior
  closeToTray: boolean;
  scanOnStartup: boolean;
  autoplay: boolean;

  // Sidebar
  sidebarItems: SidebarItem[];
  defaultPage: string;
  // Sorting
  songsSortKey: string;
  songsSortDirection: string;

  albumsSortKey: string;
  albumsSortDirection: string;
  artistsSortKey: string;
  artistsSortDirection: string;
  playlistsSortKey: string;
  playlistsSortDirection: string;

  // Mini Player
  miniPlayerStyle: "square" | "wide" | "bar";
  miniPlayerPosition: "bottom-right" | "bottom-left" | "top-right" | "top-left";

  // Media Keys
  enableMediaKeys: boolean;

  // Experimental Features
  experimentalFeatures: ExperimentalFeatures;
}

interface SettingsActions {
  setTheme: (theme: "dark" | "light" | "system") => void;
  initSystemThemeListener: () => () => void; // Returns cleanup function
  setDynamicGradient: (enabled: boolean) => void;

  // Library Actions
  addLibraryPath: (path: string) => Promise<{
    scanned_count: number;
    success_count: number;
    error_count: number;
  } | null>;
  removeLibraryPath: (path: string) => Promise<void>;

  // Audio Actions
  setAudioDevice: (deviceName: string) => void;
  refreshAudioDevices: () => Promise<void>;
  setCrossfadeDuration: (duration: number) => void;
  setFadeInOut: (enabled: boolean, durationMs: number) => Promise<void>;

  // Behavior Actions
  setCloseToTray: (enabled: boolean) => void;
  setScanOnStartup: (enabled: boolean) => void;
  setAutoplay: (enabled: boolean) => void;

  // Sidebar Actions
  setSidebarItems: (items: { id: string; hidden: boolean }[]) => void;
  setDefaultPage: (page: string) => void;

  // Sorting Actions
  setSongsSort: (key: string, direction: string) => void;
  setAlbumsSort: (key: string, direction: string) => void;
  setArtistsSort: (key: string, direction: string) => void;
  setPlaylistsSort: (key: string, direction: string) => void;

  setMiniPlayerStyle: (style: "square" | "wide" | "bar") => void;
  setMiniPlayerPosition: (
    position: "bottom-right" | "bottom-left" | "top-right" | "top-left",
  ) => void;
  setEnableMediaKeys: (enabled: boolean) => Promise<void>;
  setExperimentalFeature: <K extends keyof ExperimentalFeatures>(
    key: K,
    value: ExperimentalFeatures[K],
  ) => Promise<void>;

  loadSettings: (profileId?: string) => Promise<void>;
}

/**
 * Store for managing application settings (theme, library paths, audio config).
 * Settings are persisted per-profile via the Tauri store plugin.
 */
export const useSettingsStore = create<SettingsState & SettingsActions>(
  (set, get) => ({
    theme: "system", // Default to system preference
    resolvedTheme: getSystemTheme(), // Initialize with current system theme
    dynamicGradient: true, // Default to on
    libraryPaths: [],
    selectedDevice: null,
    audioDevices: [],
    isLoading: true,
    currentProfileId: null,
    crossfadeDuration: 1500,
    fadeInOutEnabled: true,
    fadeInOutDuration: 300,
    closeToTray: false,
    scanOnStartup: false,
    autoplay: false,
    miniPlayerStyle: "square",
    miniPlayerPosition: "bottom-right",
    enableMediaKeys: true,
    experimentalFeatures: {
      keyboardNav: false,
      focusRegions: false,
      showFocusIndicator: false,
    },

    // Sidebar Defaults
    sidebarItems: [
      { id: "home", hidden: false },
      { id: "search", hidden: false },
      { id: "songs", hidden: false },
      { id: "albums", hidden: false },
      { id: "playlists", hidden: false },
      { id: "artists", hidden: false },
      { id: "insights", hidden: false },
      { id: "settings", hidden: false },
    ],
    defaultPage: "home",

    setTheme: async (theme) => {
      const resolvedTheme = applyThemeClass(theme);
      set({ theme, resolvedTheme });
      const store = await getStore();
      await store.set("theme", theme);
      await store.save();
    },

    initSystemThemeListener: () => {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const { theme } = get();
        if (theme === "system") {
          const resolvedTheme = applyThemeClass("system");
          set({ resolvedTheme });
        }
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    },

    setDynamicGradient: async (enabled) => {
      set({ dynamicGradient: enabled });
      const store = await getStore();
      await store.set("dynamicGradient", enabled);
      await store.save();
    },

    addLibraryPath: async (path) => {
      const { libraryPaths } = get();
      if (!libraryPaths.includes(path)) {
        const newPaths = [...libraryPaths, path];
        set({ libraryPaths: newPaths });
        const store = await getStore();
        await store.set("libraryPaths", newPaths);
        await store.save();
        invoke("watch_paths", { folders: newPaths }).catch((e) =>
          logger.error("Failed to watch paths", e),
        );

        // Auto-scan the new path
        try {
          const stats = await invoke<{
            scanned_count: number;
            success_count: number;
            error_count: number;
          }>("scan_music_library", { folders: [path] });
          await useContentStore.getState().fetchContent();
          return stats;
        } catch (e) {
          logger.error("Failed to scan new library path", e);
          throw e; // Re-throw to allow caller to handle error toast
        }
      }
      return null;
    },

    removeLibraryPath: async (path) => {
      // Remove from Database first
      try {
        await invoke("remove_location", { path });
      } catch (e) {
        logger.error("Failed to remove location from DB", e);
      }

      const { libraryPaths } = get();
      const newPaths = libraryPaths.filter((p) => p !== path);
      set({ libraryPaths: newPaths });

      const store = await getStore();
      await store.set("libraryPaths", newPaths);
      await store.save();

      // Update watcher
      invoke("watch_paths", { folders: newPaths }).catch((e) =>
        logger.error("Failed to watch paths", e),
      );

      // Refresh UI to reflect removal
      useContentStore.getState().fetchContent();
    },

    setAudioDevice: async (device) => {
      set({ selectedDevice: device });
      await invoke("audio_set_device", { deviceName: device });
      const store = await getStore();
      await store.set("selectedDevice", device);
      await store.save();
    },

    refreshAudioDevices: async () => {
      try {
        const devices = await invoke<{ name: string }[]>("audio_get_devices");
        set({ audioDevices: devices });
      } catch (e) {
        logger.error("Failed to refresh devices", e);
      }
    },

    setCrossfadeDuration: async (durationMs) => {
      set({ crossfadeDuration: durationMs });
      useAudioStore.getState().setCrossfadeDuration(durationMs);
      // Send milliseconds directly to backend
      await invoke("audio_set_crossfade", { durationMs });
      const store = await getStore();
      await store.set("crossfadeDuration", durationMs);
      await store.save();
    },

    setFadeInOut: async (enabled, durationMs) => {
      set({ fadeInOutEnabled: enabled, fadeInOutDuration: durationMs });
      useAudioStore.getState().setFadeInOut(enabled, durationMs);
      await invoke("audio_set_fade_in_out", { enabled, durationMs });
      const store = await getStore();
      await store.set("fadeInOutEnabled", enabled);
      await store.set("fadeInOutDuration", durationMs);
      await store.save();
    },

    setCloseToTray: async (enabled) => {
      set({ closeToTray: enabled });
      const store = await getStore();
      await store.set("closeToTray", enabled);
      await store.save();
    },

    setScanOnStartup: async (enabled) => {
      set({ scanOnStartup: enabled });
      const store = await getStore();
      await store.set("scanOnStartup", enabled);
      await store.save();
    },

    setAutoplay: async (enabled) => {
      set({ autoplay: enabled });
      const store = await getStore();
      await store.set("autoplay", enabled);
      await store.save();
    },

    setSidebarItems: async (items) => {
      set({ sidebarItems: items });
      const store = await getStore();
      await store.set("sidebarItems", items);
      await store.save();
    },

    setDefaultPage: async (page) => {
      set({ defaultPage: page });
      const store = await getStore();
      await store.set("defaultPage", page);
      await store.save();
    },

    // Sorting
    songsSortKey: "date_added",
    songsSortDirection: "desc",
    albumsSortKey: "title",
    albumsSortDirection: "asc",
    artistsSortKey: "name",
    artistsSortDirection: "asc",
    playlistsSortKey: "name",
    playlistsSortDirection: "asc",

    setSongsSort: async (key, direction) => {
      set({ songsSortKey: key, songsSortDirection: direction });
      const store = await getStore();
      await store.set("songsSortKey", key);
      await store.set("songsSortDirection", direction);
      await store.save();
    },

    setAlbumsSort: async (key, direction) => {
      set({ albumsSortKey: key, albumsSortDirection: direction });
      const store = await getStore();
      await store.set("albumsSortKey", key);
      await store.set("albumsSortDirection", direction);
      await store.save();
    },

    setArtistsSort: async (key, direction) => {
      set({ artistsSortKey: key, artistsSortDirection: direction });
      const store = await getStore();
      await store.set("artistsSortKey", key);
      await store.set("artistsSortDirection", direction);
      await store.save();
    },

    setPlaylistsSort: async (key, direction) => {
      set({ playlistsSortKey: key, playlistsSortDirection: direction });
      const store = await getStore();
      await store.set("playlistsSortKey", key);
      await store.set("playlistsSortDirection", direction);
      await store.save();
    },

    setMiniPlayerStyle: async (style) => {
      set({ miniPlayerStyle: style });
      const store = await getStore();
      await store.set("miniPlayerStyle", style);
      await store.save();
    },

    setMiniPlayerPosition: async (position) => {
      set({ miniPlayerPosition: position });
      const store = await getStore();
      await store.set("miniPlayerPosition", position);
      await store.save();
    },
    setEnableMediaKeys: async (enabled) => {
      set({ enableMediaKeys: enabled });
      const store = await getStore();
      await store.set("enableMediaKeys", enabled);
      await store.save();
    },
    setExperimentalFeature: async (key, value) => {
      const current = get().experimentalFeatures;
      const next = { ...current, [key]: value };
      set({ experimentalFeatures: next });
      const store = await getStore();
      await store.set("experimentalFeatures", next);
      await store.save();
    },

    loadSettings: async (profileId?: string) => {
      if (!profileId) {
        return;
      }

      set({ isLoading: true });

      try {
        const store = await load(`settings_${profileId}.json`);

        const getVal = async <T>(
          key: string,
        ): Promise<T | null | undefined> => {
          return await store.get<T>(key);
        };

        const [
          theme,
          dynamicGradient,
          libraryPaths,
          selectedDevice,
          crossfadeDuration,
          fadeInOutEnabled,
          fadeInOutDuration,
          closeToTray,
          scanOnStartup,
          autoplay,
          _sidebarItems,
          defaultPage,
          songsSortKey,
          songsSortDirection,
          albumsSortKey,
          albumsSortDirection,
          artistsSortKey,
          artistsSortDirection,
          playlistsSortKey,
          playlistsSortDirection,
          miniPlayerStyle,
          miniPlayerPosition,
          enableMediaKeys,
          experimentalFeatures,
        ] = await Promise.all([
          getVal<"dark" | "light" | "system">("theme"),
          getVal<boolean>("dynamicGradient"),
          getVal<string[]>("libraryPaths"),
          getVal<string>("selectedDevice"),
          getVal<number>("crossfadeDuration"),
          getVal<boolean>("fadeInOutEnabled"),
          getVal<number>("fadeInOutDuration"),
          getVal<boolean>("closeToTray"),
          getVal<boolean>("scanOnStartup"),
          getVal<boolean>("autoplay"),
          getVal<{ id: string; hidden: boolean }[]>("sidebarItems"),
          getVal<string>("defaultPage"),
          getVal<string>("songsSortKey"),
          getVal<string>("songsSortDirection"),
          getVal<string>("albumsSortKey"),
          getVal<string>("albumsSortDirection"),
          getVal<string>("artistsSortKey"),
          getVal<string>("artistsSortDirection"),
          getVal<string>("playlistsSortKey"),
          getVal<string>("playlistsSortDirection"),
          getVal<"square" | "wide" | "bar">("miniPlayerStyle"),
          getVal<"bottom-right" | "bottom-left" | "top-right" | "top-left">(
            "miniPlayerPosition",
          ),
          getVal<boolean>("enableMediaKeys"),
          getVal<ExperimentalFeatures>("experimentalFeatures"),
        ]);

        let sidebarItems = _sidebarItems;
        if (sidebarItems) {
          sidebarItems = sidebarItems.map((item) =>
            item.id === "settings" ? { ...item, hidden: false } : item,
          );
        }

        const themeValue = theme ?? "system";
        const resolvedTheme = applyThemeClass(themeValue);
        set({
          currentProfileId: profileId,
          theme: themeValue,
          resolvedTheme,
          dynamicGradient: dynamicGradient ?? true,
          libraryPaths: libraryPaths ?? [],
          selectedDevice: selectedDevice ?? null,
          crossfadeDuration: crossfadeDuration ?? 0,
          fadeInOutEnabled: fadeInOutEnabled ?? true,
          fadeInOutDuration: fadeInOutDuration ?? 300,
          closeToTray: closeToTray ?? false,
          scanOnStartup: scanOnStartup ?? false,
          autoplay: autoplay ?? false,
          sidebarItems: sidebarItems ?? [
            { id: "home", hidden: false },
            { id: "search", hidden: false },
            { id: "songs", hidden: false },
            { id: "albums", hidden: false },
            { id: "playlists", hidden: false },
            { id: "artists", hidden: false },
            { id: "insights", hidden: false },
            { id: "settings", hidden: false },
          ],
          defaultPage: defaultPage ?? "home",
          songsSortKey: songsSortKey ?? "date_added",
          songsSortDirection: songsSortDirection ?? "desc",
          albumsSortKey: albumsSortKey ?? "title",
          albumsSortDirection: albumsSortDirection ?? "asc",
          artistsSortKey: artistsSortKey ?? "name",
          artistsSortDirection: artistsSortDirection ?? "asc",
          playlistsSortKey: playlistsSortKey ?? "name",
          playlistsSortDirection: playlistsSortDirection ?? "asc",
          miniPlayerStyle: miniPlayerStyle ?? "square",
          miniPlayerPosition: miniPlayerPosition ?? "bottom-right",
          enableMediaKeys: enableMediaKeys ?? true,
          experimentalFeatures: experimentalFeatures ?? {
            keyboardNav: false,
            focusRegions: false,
            showFocusIndicator: false,
          },
          isLoading: false,
        });

        await Promise.all([
          selectedDevice
            ? invoke("audio_set_device", { deviceName: selectedDevice })
            : Promise.resolve(),
          typeof crossfadeDuration === "number"
            ? (() => {
                useAudioStore
                  .getState()
                  .setCrossfadeDuration(crossfadeDuration);
                return invoke("audio_set_crossfade", {
                  durationMs: crossfadeDuration,
                });
              })()
            : Promise.resolve(),
          typeof fadeInOutDuration === "number" &&
          typeof fadeInOutEnabled === "boolean"
            ? (() => {
                useAudioStore
                  .getState()
                  .setFadeInOut(fadeInOutEnabled, fadeInOutDuration);
                return invoke("audio_set_fade_in_out", {
                  enabled: fadeInOutEnabled,
                  durationMs: fadeInOutDuration,
                });
              })()
            : Promise.resolve(),
        ]);

        invoke("watch_paths", { folders: libraryPaths ?? [] }).catch((e) =>
          logger.error("Failed to watch paths on settings load", e),
        );

        get().refreshAudioDevices();
      } catch (e) {
        logger.error("Failed to load settings", e);
        set({ isLoading: false });
      }
    },
  }),
);
