import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";

// Lazy store initialization
// const storePromise: Promise<Store> | null = null;
import { invoke } from "@tauri-apps/api/core";
import { useLibraryStore } from "./library-store";

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

  // Mini Player
  miniPlayerStyle: "square" | "wide" | "bar";
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

  // Behavior Actions
  setCloseToTray: (enabled: boolean) => void;
  setScanOnStartup: (enabled: boolean) => void;
  setAutoplay: (enabled: boolean) => void;

  // Sidebar Actions
  setSidebarItems: (items: { id: string; hidden: boolean }[]) => void;
  setDefaultPage: (page: string) => void;

  // Sorting Actions
  setSongsSort: (key: string, direction: string) => void;

  setMiniPlayerStyle: (style: "square" | "wide" | "bar") => void;

  loadSettings: (profileId?: string) => Promise<void>;
}

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
    crossfadeDuration: 0,
    closeToTray: false,
    scanOnStartup: false,
    autoplay: false,
    miniPlayerStyle: "square",

    // Sidebar Defaults
    sidebarItems: [
      { id: "home", hidden: false },
      { id: "search", hidden: false },
      { id: "songs", hidden: false },
      { id: "albums", hidden: false },
      { id: "playlists", hidden: false },
      { id: "artists", hidden: false },
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

        // Auto-scan the new path
        try {
          // Define ScanStats locally or treat as any/unknown if interface not available globally
          // But better to just return it.
          const stats = await invoke<{
            scanned_count: number;
            success_count: number;
            error_count: number;
          }>("scan_music_library", { folders: [path] });
          await useLibraryStore.getState().fetchLibrary();
          return stats;
        } catch (e) {
          console.error("Failed to scan new library path:", e);
          throw e; // Re-throw to allow caller to handle error toast
        }
      }
      return null;
    },

    removeLibraryPath: async (path) => {
      const { libraryPaths } = get();
      const newPaths = libraryPaths.filter((p) => p !== path);
      set({ libraryPaths: newPaths });
      const store = await getStore();
      await store.set("libraryPaths", newPaths);
      await store.save();
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
        console.error("Failed to refresh devices:", e);
      }
    },

    setCrossfadeDuration: async (durationMs) => {
      set({ crossfadeDuration: durationMs });
      // Send milliseconds directly to backend
      await invoke("audio_set_crossfade", { durationMs });
      const store = await getStore();
      await store.set("crossfadeDuration", durationMs);
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

    setSongsSort: async (key, direction) => {
      set({ songsSortKey: key, songsSortDirection: direction });
      const store = await getStore();
      await store.set("songsSortKey", key);
      await store.set("songsSortDirection", direction);
      await store.save();
    },

    setMiniPlayerStyle: async (style) => {
      set({ miniPlayerStyle: style });
      const store = await getStore();
      await store.set("miniPlayerStyle", style);
      await store.save();
    },

    loadSettings: async (profileId?: string) => {
      // If no profileId provided, verify if we already have one loaded or just stop?
      // Actually, we should REQUIRE profileId now, or use a default.

      if (!profileId) {
        // If called without ID (legacy/init), maybe do nothing until selectProfile is called?
        // Or load "default" if we want a fallback.
        return;
      }

      set({ isLoading: true });

      try {
        // Dynamic load
        // Note: checking if load() creates a new instance or reuses.
        // tauri-plugin-store manages instances by path.
        const store = await load(`settings_${profileId}.json`);

        // Helper to get with default
        const getVal = async <T>(
          key: string
        ): Promise<T | null | undefined> => {
          return await store.get<T>(key);
        };

        const theme = await getVal<"dark" | "light" | "system">("theme");
        const dynamicGradient = await getVal<boolean>("dynamicGradient");
        const libraryPaths = await getVal<string[]>("libraryPaths");
        const selectedDevice = await getVal<string>("selectedDevice");
        const crossfadeDuration = await getVal<number>("crossfadeDuration");

        const closeToTray = await getVal<boolean>("closeToTray");
        const scanOnStartup = await getVal<boolean>("scanOnStartup");
        const autoplay = await getVal<boolean>("autoplay");

        let sidebarItems = await getVal<{ id: string; hidden: boolean }[]>(
          "sidebarItems"
        );

        // Enforce settings visibility
        if (sidebarItems) {
          sidebarItems = sidebarItems.map((item) =>
            item.id === "settings" ? { ...item, hidden: false } : item
          );
        }
        const defaultPage = await getVal<string>("defaultPage");

        const songsSortKey = await getVal<string>("songsSortKey");
        const songsSortDirection = await getVal<string>("songsSortDirection");
        const miniPlayerStyle = await getVal<"square" | "wide" | "bar">(
          "miniPlayerStyle"
        );

        // Update Store State
        const themeValue = theme ?? "system";
        const resolvedTheme = applyThemeClass(themeValue);
        set({
          currentProfileId: profileId, // <--- FIX: valid profile ID set here
          theme: themeValue,
          resolvedTheme,
          dynamicGradient: dynamicGradient ?? true,
          libraryPaths: libraryPaths ?? [],
          selectedDevice: selectedDevice ?? null,
          crossfadeDuration: crossfadeDuration ?? 0,
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
            { id: "settings", hidden: false },
          ],
          defaultPage: defaultPage ?? "home",
          songsSortKey: songsSortKey ?? "date_added",
          songsSortDirection: songsSortDirection ?? "desc",
          miniPlayerStyle: miniPlayerStyle ?? "square",
          isLoading: false,
        });

        // Note: Theme is already applied above via applyThemeClass

        if (selectedDevice) {
          await invoke("audio_set_device", { deviceName: selectedDevice });
        }
        if (typeof crossfadeDuration === "number") {
          await invoke("audio_set_crossfade", {
            durationMs: crossfadeDuration,
          });
        }

        get().refreshAudioDevices();

        // Update global store reference for future saves
        // Warning: 'storePromise' global var in this file needs to be updated or removed.
        // We should attach the current store instance to the state or a closure variable.
        // Let's update the global `getStore` function implementation below.
      } catch (e) {
        console.error("Failed to load settings:", e);
        set({ isLoading: false });
      }
    },
  })
);

// Helper to get the CURRENT active store file.
// We need to track which file is active.
// Ideally, we pass the profileId to every action, OR we store `activeStore` in the state.
// Since actions are closures, we can store it in the state.
