import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Update } from "@tauri-apps/plugin-updater";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { logger } from "@/lib/logger";

interface DownloadProgress {
  downloaded: number;
  total: number | null;
}

interface UpdateStore {
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: DownloadProgress | null;
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
      isDownloading: false,
      downloadProgress: null,
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
        const { updateManifest, channel } = get();
        if (!updateManifest) return;

        let unlisten: UnlistenFn | null = null;

        try {
          set({ isDownloading: true, downloadProgress: null, error: null });

          // Listen for download progress events from Rust
          unlisten = await listen<DownloadProgress>(
            "update-download-progress",
            (event) => {
              set({ downloadProgress: event.payload });
            }
          );

          // Start the download and install
          await invoke("install_update", { channel });

          logger.info("Update installed, relaunching...");
          await relaunch();
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          logger.error("Failed to install update:", message);
          set({ error: message });
        } finally {
          if (unlisten) {
            unlisten();
          }
          set({ isDownloading: false, downloadProgress: null });
        }
      },

      reset: () => {
        set({
          error: null,
          isChecking: false,
          isDownloading: false,
          downloadProgress: null,
        });
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
