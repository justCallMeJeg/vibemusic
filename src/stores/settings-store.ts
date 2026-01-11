import { create } from "zustand";
import { load, Store } from "@tauri-apps/plugin-store";

// Lazy store initialization
let storePromise: Promise<Store> | null = null;
import { invoke } from "@tauri-apps/api/core";

const getStore = async () => {
  if (!storePromise) {
    storePromise = load("settings.json");
  }
  return storePromise;
};

export interface SidebarItem {
  id: string;
  hidden: boolean;
}

interface SettingsState {
  theme: "dark" | "light" | "system";
  dynamicGradient: boolean;
  libraryPaths: string[]; // persisted list of folders
  selectedDevice: string | null;
  audioDevices: { name: string }[];
  isLoading: boolean;
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
}

interface SettingsActions {
  setTheme: (theme: "dark" | "light" | "system") => void;
  setDynamicGradient: (enabled: boolean) => void;

  // Library Actions
  addLibraryPath: (path: string) => Promise<void>;
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

  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>(
  (set, get) => ({
    theme: "dark", // Default to dark since globals.css is dark-first
    dynamicGradient: true, // Default to on
    libraryPaths: [],
    selectedDevice: null,
    audioDevices: [],
    isLoading: true,
    crossfadeDuration: 0,
    closeToTray: false,
    scanOnStartup: false,
    autoplay: false,

    // Sidebar Defaults
    sidebarItems: [
      { id: "home", hidden: false },
      { id: "search", hidden: false },
      { id: "songs", hidden: false },
      { id: "albums", hidden: false },
      { id: "playlists", hidden: false },
      { id: "settings", hidden: false },
    ],
    defaultPage: "home",

    setTheme: async (theme) => {
      set({ theme });
      if (theme === "system") {
        document.documentElement.classList.remove("dark", "light");
      } else {
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(theme);
      }
      const store = await getStore();
      await store.set("theme", theme);
      await store.save();
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
      }
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
      // Backend likely expects seconds (float), so convert ms to s
      await invoke("audio_set_crossfade", { durationSecs: durationMs / 1000 });
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

    loadSettings: async () => {
      try {
        const store = await getStore();
        const theme = await store.get<"dark" | "light" | "system">("theme");
        const dynamicGradient = await store.get<boolean>("dynamicGradient");
        const libraryPaths = await store.get<string[]>("libraryPaths");
        const selectedDevice = await store.get<string>("selectedDevice");
        const crossfadeDuration = await store.get<number>("crossfadeDuration");

        const closeToTray = await store.get<boolean>("closeToTray");
        const scanOnStartup = await store.get<boolean>("scanOnStartup");
        const autoplay = await store.get<boolean>("autoplay");

        const sidebarItems = await store.get<{ id: string; hidden: boolean }[]>(
          "sidebarItems"
        );
        const defaultPage = await store.get<string>("defaultPage");

        const songsSortKey = await store.get<string>("songsSortKey");
        const songsSortDirection = await store.get<string>(
          "songsSortDirection"
        );

        if (theme) {
          set({ theme });
          if (theme !== "system") {
            document.documentElement.classList.add(theme);
          }
        }
        if (typeof dynamicGradient === "boolean") set({ dynamicGradient });
        if (libraryPaths) set({ libraryPaths });
        if (selectedDevice) {
          set({ selectedDevice });
          await invoke("audio_set_device", { deviceName: selectedDevice });
        }
        if (typeof crossfadeDuration === "number") {
          set({ crossfadeDuration });
          await invoke("audio_set_crossfade", {
            durationSecs: crossfadeDuration / 1000,
          });
        }

        if (typeof closeToTray === "boolean") set({ closeToTray });
        if (typeof scanOnStartup === "boolean") set({ scanOnStartup });
        if (typeof autoplay === "boolean") set({ autoplay });

        if (sidebarItems) set({ sidebarItems });
        if (defaultPage) set({ defaultPage });

        if (songsSortKey) set({ songsSortKey });
        if (songsSortDirection) set({ songsSortDirection });

        set({ isLoading: false });

        // Initial device fetch
        get().refreshAudioDevices();
      } catch (e) {
        console.error("Failed to load settings:", e);
        set({ isLoading: false });
      }
    },
  })
);
