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
}

interface SettingsActions {
  setTheme: (theme: "dark" | "light" | "system") => Promise<void>;
  setDynamicGradient: (enabled: boolean) => Promise<void>;
  addLibraryPath: (path: string) => Promise<void>;
  removeLibraryPath: (path: string) => Promise<void>;
  setAudioDevice: (device: string) => Promise<void>;
  refreshAudioDevices: () => Promise<void>;
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

    setTheme: async (theme) => {
      set({ theme });
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
      const paths = get().libraryPaths;
      if (!paths.includes(path)) {
        const newPaths = [...paths, path];
        set({ libraryPaths: newPaths });
        const store = await getStore();
        await store.set("libraryPaths", newPaths);
        await store.save();
      }
    },

    setAudioDevice: async (device) => {
      set({ selectedDevice: device });
      const store = await getStore();
      await store.set("selectedDevice", device);
      await store.save();
      // Apply setting immediately
      await invoke("audio_set_device", { deviceName: device });
    },

    refreshAudioDevices: async () => {
      try {
        const devices = await invoke<{ name: string }[]>("audio_get_devices");
        set({ audioDevices: devices });
      } catch (error) {
        console.error("Failed to get audio devices:", error);
      }
    },

    removeLibraryPath: async (path) => {
      const newPaths = get().libraryPaths.filter((p) => p !== path);
      set({ libraryPaths: newPaths });
      const store = await getStore();
      await store.set("libraryPaths", newPaths);
      await store.save();
    },

    loadSettings: async () => {
      set({ isLoading: true });
      try {
        const store = await getStore();
        const theme = await store.get<"dark" | "light" | "system">("theme");
        const dynamicGradient = await store.get<boolean>("dynamicGradient");
        const libraryPaths = await store.get<string[]>("libraryPaths");
        const selectedDevice = await store.get<string>("selectedDevice");

        // Initial device fetch
        const devices = await invoke<{ name: string }[]>("audio_get_devices");

        // Apply saved device if exists
        if (selectedDevice) {
          await invoke("audio_set_device", { deviceName: selectedDevice });
        }

        set({
          theme: theme || "dark",
          dynamicGradient:
            dynamicGradient !== null ? (dynamicGradient as boolean) : true,
          libraryPaths: libraryPaths || [],
          selectedDevice: selectedDevice || null,
          audioDevices: devices || [],
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to load settings:", error);
        set({ isLoading: false });
      }
    },
  })
);
