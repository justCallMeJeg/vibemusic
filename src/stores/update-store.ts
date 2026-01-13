import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Update } from "@tauri-apps/plugin-updater";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

interface DownloadProgress {
  downloaded: number;
  total: number | null;
}

interface UpdateStore {
  // State
  isChecking: boolean;
  isDownloading: boolean;
  isReadyToInstall: boolean;
  downloadProgress: DownloadProgress | null;
  isUpdateAvailable: boolean;
  updateManifest: Update | null;
  error: string | null;
  lastChecked: Date | null;
  channel: "stable" | "dev";

  // Actions
  setChannel: (channel: "stable" | "dev") => void;
  check: (silent?: boolean) => Promise<boolean>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  reset: () => void;
}

export const useUpdateStore = create<UpdateStore>()(
  persist(
    (set, get) => ({
      // Initial state
      channel: "stable",
      isChecking: false,
      isDownloading: false,
      isReadyToInstall: false,
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
          const update = await invoke<{
            version: string;
            currentVersion: string;
            body?: string;
            date?: string;
          } | null>("check_update", { channel });

          if (update) {
            set({
              isUpdateAvailable: true,
              updateManifest: {
                ...update,
                downloadAndInstall: async () => {
                  // Legacy compatibility
                  await invoke("download_and_install_update", { channel });
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

      download: async () => {
        const { updateManifest } = get();
        if (!updateManifest) return;

        let unlistenProgress: UnlistenFn | null = null;
        let unlistenComplete: UnlistenFn | null = null;

        try {
          set({ isDownloading: true, downloadProgress: null, error: null });

          // Listen for download progress events
          unlistenProgress = await listen<DownloadProgress>(
            "update-download-progress",
            (event) => {
              set({ downloadProgress: event.payload });
            }
          );

          // Listen for download complete event
          unlistenComplete = await listen("update-download-complete", () => {
            set({
              isDownloading: false,
              isReadyToInstall: true,
              downloadProgress: null,
            });
            toast.success("Update ready to install", {
              description: `Version ${updateManifest.version} has been downloaded.`,
              action: {
                label: "Install Now",
                onClick: () => {
                  useUpdateStore.getState().install();
                },
              },
              duration: 10000,
            });
          });

          // Start the download (does not install)
          await invoke("download_update");

          logger.info("Update download complete");
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          logger.error("Failed to download update:", message);
          set({ error: message, isDownloading: false });
          toast.error("Download failed", {
            description: message,
          });
        } finally {
          if (unlistenProgress) unlistenProgress();
          if (unlistenComplete) unlistenComplete();
        }
      },

      install: async () => {
        try {
          set({ error: null });

          logger.info("Installing update, app will restart...");

          // Install the update (will trigger app restart)
          await invoke("install_update");

          // Relaunch the app
          await relaunch();
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          logger.error("Failed to install update:", message);
          set({ error: message });
          toast.error("Installation failed", {
            description: message,
          });
        }
      },

      reset: () => {
        set({
          error: null,
          isChecking: false,
          isDownloading: false,
          isReadyToInstall: false,
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
