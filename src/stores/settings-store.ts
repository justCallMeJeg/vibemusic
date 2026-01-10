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

    setCrossfadeDuration: async (duration) => {
      set({ crossfadeDuration: duration });
      await invoke("audio_set_crossfade", { durationSecs: duration });
      const store = await getStore();
      await store.set("crossfadeDuration", duration);
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
            durationSecs: crossfadeDuration,
          });
        }

        if (typeof closeToTray === "boolean") set({ closeToTray });
        if (typeof scanOnStartup === "boolean") set({ scanOnStartup });
        if (typeof autoplay === "boolean") set({ autoplay });

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
