import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { logger } from "@/lib/logger";

// Lazy store initialization
import { invoke } from "@tauri-apps/api/core";
import { useContentStore } from "@features/library/store/content-store";
import { useAudioStore } from "./audio-store";
import type { KeyCombo } from "./keybinds-store";

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

interface ExperimentalFeatures {
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

  // Keybind Customization
  keybindOverrides: Record<string, KeyCombo>;

  // Integrations
  discordRpcEnabled: boolean;
  lastfmEnabled: boolean;
  lastfmSessionKey: string;
  lastfmUsername: string;
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

  // Keybind Customization
  setKeybindOverride: (id: string, combo: KeyCombo) => void;
  resetKeybindOverrides: (ids: string[]) => void;

  // Integrations
  setDiscordRpcEnabled: (enabled: boolean) => void;
  setLastfmEnabled: (enabled: boolean) => void;
  setLastfmCredentials: (sessionKey: string, username: string) => void;
  disconnectLastfm: () => void;

  loadSettings: (profileId?: string) => Promise<void>;
}

async function persistSetting(
  setter: (partial: Partial<SettingsState & SettingsActions>) => void,
  key: string,
  value: unknown,
): Promise<void> {
  setter({ [key]: value } as unknown as Partial<SettingsState & SettingsActions>);
  const store = await getStore();
  await store.set(key, value);
  await store.save();
}

async function loadThemeSettings(store: Awaited<ReturnType<typeof load>>) {
  const [theme, dynamicGradient] = await Promise.all([
    store.get<"dark" | "light" | "system">("theme"),
    store.get<boolean>("dynamicGradient"),
  ]);
  const themeValue = theme ?? "system";
  return {
    theme: themeValue,
    resolvedTheme: applyThemeClass(themeValue),
    dynamicGradient: dynamicGradient ?? true,
  };
}

async function loadAudioSettings(store: Awaited<ReturnType<typeof load>>) {
  const [selectedDevice, crossfadeDuration, fadeInOutEnabled, fadeInOutDuration] =
    await Promise.all([
      store.get<string>("selectedDevice"),
      store.get<number>("crossfadeDuration"),
      store.get<boolean>("fadeInOutEnabled"),
      store.get<number>("fadeInOutDuration"),
    ]);

  return {
    state: {
      selectedDevice: selectedDevice ?? null,
      crossfadeDuration: crossfadeDuration ?? 0,
      fadeInOutEnabled: fadeInOutEnabled ?? true,
      fadeInOutDuration: fadeInOutDuration ?? 300,
    },
    raw: { selectedDevice, crossfadeDuration, fadeInOutEnabled, fadeInOutDuration },
  };
}

async function loadUISettings(store: Awaited<ReturnType<typeof load>>) {
  const [
    libraryPaths,
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
    store.get<string[]>("libraryPaths"),
    store.get<boolean>("closeToTray"),
    store.get<boolean>("scanOnStartup"),
    store.get<boolean>("autoplay"),
    store.get<{ id: string; hidden: boolean }[]>("sidebarItems"),
    store.get<string>("defaultPage"),
    store.get<string>("songsSortKey"),
    store.get<string>("songsSortDirection"),
    store.get<string>("albumsSortKey"),
    store.get<string>("albumsSortDirection"),
    store.get<string>("artistsSortKey"),
    store.get<string>("artistsSortDirection"),
    store.get<string>("playlistsSortKey"),
    store.get<string>("playlistsSortDirection"),
    store.get<"square" | "wide" | "bar">("miniPlayerStyle"),
    store.get<"bottom-right" | "bottom-left" | "top-right" | "top-left">(
      "miniPlayerPosition",
    ),
    store.get<boolean>("enableMediaKeys"),
    store.get<ExperimentalFeatures>("experimentalFeatures"),
  ]);

  let sidebarItems = _sidebarItems;
  if (sidebarItems) {
    sidebarItems = sidebarItems.map((item) =>
      item.id === "settings" ? { ...item, hidden: false } : item,
    );
  }

  return {
    libraryPaths: libraryPaths ?? [],
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
    rawLibraryPaths: libraryPaths,
  };
}

async function loadKeybindSettings(store: Awaited<ReturnType<typeof load>>) {
  const keybindOverrides = await store.get<Record<string, KeyCombo>>("keybindOverrides");
  return { keybindOverrides: keybindOverrides ?? {} };
}

async function loadIntegrationSettings(store: Awaited<ReturnType<typeof load>>) {
  const [discordRpcEnabled, lastfmEnabled, lastfmSessionKey, lastfmUsername] =
    await Promise.all([
      store.get<boolean>("discordRpcEnabled"),
      store.get<boolean>("lastfmEnabled"),
      store.get<string>("lastfmSessionKey"),
      store.get<string>("lastfmUsername"),
    ]);
  return {
    discordRpcEnabled: discordRpcEnabled ?? false,
    lastfmEnabled: lastfmEnabled ?? false,
    lastfmSessionKey: lastfmSessionKey ?? "",
    lastfmUsername: lastfmUsername ?? "",
  };
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
    keybindOverrides: {},
    discordRpcEnabled: false,
    lastfmEnabled: false,
    lastfmSessionKey: "",
    lastfmUsername: "",
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
      await persistSetting(set, "dynamicGradient", enabled);
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
      await persistSetting(set, "closeToTray", enabled);
    },

    setScanOnStartup: async (enabled) => {
      await persistSetting(set, "scanOnStartup", enabled);
    },

    setAutoplay: async (enabled) => {
      await persistSetting(set, "autoplay", enabled);
    },

    setSidebarItems: async (items) => {
      await persistSetting(set, "sidebarItems", items);
    },

    setDefaultPage: async (page) => {
      await persistSetting(set, "defaultPage", page);
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
      await persistSetting(set, "miniPlayerStyle", style);
    },

    setMiniPlayerPosition: async (position) => {
      await persistSetting(set, "miniPlayerPosition", position);
    },
    setEnableMediaKeys: async (enabled) => {
      await persistSetting(set, "enableMediaKeys", enabled);
    },
    setExperimentalFeature: async (key, value) => {
      const current = get().experimentalFeatures;
      const next = { ...current, [key]: value };
      set({ experimentalFeatures: next });
      const store = await getStore();
      await store.set("experimentalFeatures", next);
      await store.save();
    },

    setKeybindOverride: async (id, combo) => {
      const next = { ...get().keybindOverrides, [id]: combo };
      set({ keybindOverrides: next });
      const store = await getStore();
      await store.set("keybindOverrides", next);
      await store.save();
    },

    resetKeybindOverrides: async (ids) => {
      const next = { ...get().keybindOverrides };
      for (const id of ids) delete next[id];
      set({ keybindOverrides: next });
      const store = await getStore();
      await store.set("keybindOverrides", next);
      await store.save();
    },

    setDiscordRpcEnabled: async (enabled) => {
      await persistSetting(set, "discordRpcEnabled", enabled);
      if (enabled) {
        invoke("discord_rpc_enable").catch(() => {});
      } else {
        invoke("discord_rpc_disable").catch(() => {});
      }
    },

    setLastfmEnabled: async (enabled) => {
      await persistSetting(set, "lastfmEnabled", enabled);
      if (!enabled) {
        set({ lastfmSessionKey: "", lastfmUsername: "" });
        const store = await getStore();
        await store.set("lastfmSessionKey", "");
        await store.set("lastfmUsername", "");
        await store.save();
        invoke("lastfm_disconnect").catch(() => {});
      }
    },

    setLastfmCredentials: async (sessionKey, username) => {
      const encoded = btoa(sessionKey);
      set({ lastfmSessionKey: encoded, lastfmUsername: username });
      const store = await getStore();
      await store.set("lastfmSessionKey", encoded);
      await store.set("lastfmUsername", username);
      await store.save();
      invoke("lastfm_connect", {
        sessionKey: atob(encoded),
      }).catch(() => {});
    },

    disconnectLastfm: async () => {
      set({ lastfmEnabled: false, lastfmSessionKey: "", lastfmUsername: "" });
      const store = await getStore();
      await store.set("lastfmEnabled", false);
      await store.set("lastfmSessionKey", "");
      await store.set("lastfmUsername", "");
      await store.save();
      invoke("lastfm_disconnect").catch(() => {});
    },

    loadSettings: async (profileId?: string) => {
      if (!profileId) {
        return;
      }

      set({ isLoading: true });

      try {
        const store = await load(`settings_${profileId}.json`);

        const [keybindSettings, integrationSettings, themeSettings, audioResult, uiSettings] =
          await Promise.all([
            loadKeybindSettings(store),
            loadIntegrationSettings(store),
            loadThemeSettings(store),
            loadAudioSettings(store),
            loadUISettings(store),
          ]);

        set({
          currentProfileId: profileId,
          ...keybindSettings,
          ...integrationSettings,
          ...themeSettings,
          ...audioResult.state,
          ...uiSettings,
          isLoading: false,
        });

        const { selectedDevice, crossfadeDuration, fadeInOutEnabled, fadeInOutDuration } =
          audioResult.raw;

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

        const { discordRpcEnabled: rpcEnabled } = integrationSettings;
        if (rpcEnabled) {
          invoke("discord_rpc_enable").catch(() => {});
        }

        invoke("watch_paths", { folders: uiSettings.rawLibraryPaths ?? [] }).catch((e) =>
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
