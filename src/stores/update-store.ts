import { create } from "zustand";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { logger } from "@/lib/logger";

interface UpdateStore {
  isChecking: boolean;
  isUpdateAvailable: boolean;
  updateManifest: Update | null;
  error: string | null;
  lastChecked: Date | null;

  check: (silent?: boolean) => Promise<boolean>;
  install: () => Promise<void>;
  reset: () => void;
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  isChecking: false,
  isUpdateAvailable: false,
  updateManifest: null,
  error: null,
  lastChecked: null,

  check: async (silent = false) => {
    set({ isChecking: true, error: null });
    try {
      const update = await check();

      if (update) {
        set({
          isUpdateAvailable: true,
          updateManifest: update,
          lastChecked: new Date(),
        });
        return true;
      } else {
        logger.info("No update available");
        set({
          isUpdateAvailable: false,
          updateManifest: null,
          lastChecked: new Date(),
        });
        return false;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error("Failed to check for updates:", message);
      if (!silent) {
        set({ error: message });
      }
      return false;
    } finally {
      set({ isChecking: false });
    }
  },

  install: async () => {
    const { updateManifest } = get();
    if (!updateManifest) return;

    try {
      set({ isChecking: true }); // Use isChecking to show spinner
      await updateManifest.downloadAndInstall();
      logger.info("Update installed, relaunching...");
      await relaunch();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error("Failed to install update:", message);
      set({ error: message, isChecking: false });
    }
  },

  reset: () => {
    set({ error: null, isChecking: false });
  },
}));
