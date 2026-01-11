import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Update } from "@tauri-apps/plugin-updater";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { logger } from "@/lib/logger";

interface UpdateStore {
  isChecking: boolean;
  isUpdateAvailable: boolean;
  updateManifest: Update | null;
  error: string | null;
  lastChecked: Date | null;

  channel: "stable" | "dev";
  setChannel: (channel: "stable" | "dev") => void;

  check: (silent?: boolean) => Promise<boolean>;
  install: () => Promise<void>;
  reset: () => void;
}

export const useUpdateStore = create<UpdateStore>()(
  persist(
    (set, get) => ({
      channel: "stable",
      isChecking: false,
      isUpdateAvailable: false,
      updateManifest: null,
      error: null,
      lastChecked: null,

      setChannel: (channel) => set({ channel }),

      check: async (silent = false) => {
        set({ isChecking: true, error: null });
        const { channel } = get();

        try {
          // Call Rust command
          const update = await invoke<{
            version: string;
            currentVersion: string;
            body?: string;
            date?: string;
          } | null>("check_update", {
            channel,
          });

          if (update) {
            set({
              isUpdateAvailable: true,
              updateManifest: {
                ...update,
                downloadAndInstall: async () => {
                  await invoke("install_update", { channel });
                },
              } as Update,
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
          // Relaunch is handled by Rust command or we can call it here if needed
          // But our install_update command doesn't relaunch automatically?
          // Wait, let's check updater.rs. It just finishes.
          // We should explicit relaunch here for clarity or let Rust do it.
          // The JS plugin usually relaunches.
          // Let's call relaunch() here just in case, or check if Rust implementation does it.
          // My Rust implementation: update.download_and_install(...).await?
          // The tauri-plugin-updater doesn't auto-relaunch anymore in v2 I think?
          // Actually, let's keep the relaunch() call from the store.
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
    }),
    {
      name: "update-store",
      partialize: (state) => ({
        channel: state.channel,
        lastChecked: state.lastChecked,
      }),
    }
  )
);
