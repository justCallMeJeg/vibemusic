import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Update } from "@tauri-apps/plugin-updater";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { logger } from "@/lib/logger";

type InstallFormat = "msi" | "exe" | "dmg" | "appImage" | "deb" | "rpm" | "unknown";

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
  latestRelease: Update | null;
  latestReleaseChannel: "stable" | "dev" | null;
  error: string | null;
  lastChecked: Date | null;
  channel: "stable" | "dev";
  installFormat: InstallFormat;
  requiresManualDownload: boolean;
  isManualUpdateDialogOpen: boolean;

  // Actions
  setChannel: (channel: "stable" | "dev") => void;
  check: (silent?: boolean) => Promise<boolean>;
  fetchLatestRelease: () => Promise<void>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  openDownloadPage: () => void;
  setManualUpdateDialogOpen: (open: boolean) => void;
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
      latestRelease: null,
      latestReleaseChannel: null,
      error: null,
      lastChecked: null,
      installFormat: "unknown" as InstallFormat,
      requiresManualDownload: false,
      isManualUpdateDialogOpen: false,

      setChannel: (channel) => {
        set((state) => {
          if (state.channel === channel) return {};
          return {
            channel,
            isUpdateAvailable: false,
            updateManifest: null,
            requiresManualDownload: false,
            isManualUpdateDialogOpen: false,
            latestRelease: null,
            latestReleaseChannel: null,
          };
        });
        // Silently check for updates on the new channel
        get().check(true);
      },

      check: async (silent = false) => {
        set({ isChecking: true, error: null });
        const { channel, installFormat } = get();

        try {
          let fmt = installFormat;
          if (fmt === "unknown") {
            fmt = await invoke<InstallFormat>("get_install_format");
            set({ installFormat: fmt });
          }

          const update = await invoke<{
            version: string;
            currentVersion: string;
            body?: string;
            date?: string;
            requiresManualDownload: boolean;
          } | null>("check_update", { channel, installFormat: fmt });

          if (update) {
            set({
              isUpdateAvailable: true,
              requiresManualDownload: update.requiresManualDownload,
              updateManifest: {
                version: update.version,
                currentVersion: update.currentVersion,
                body: update.body,
                date: update.date,
                downloadAndInstall: async () => {
                  await invoke("download_and_install_update", { channel });
                },
              } as unknown as Update,
              lastChecked: new Date(),
            });
            if (update.requiresManualDownload) {
              set({ isManualUpdateDialogOpen: true });
            }
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

      fetchLatestRelease: async () => {
        const { channel, latestRelease, latestReleaseChannel } = get();

        // Session cache: skip if we already have release data for this channel
        if (latestRelease && latestReleaseChannel === channel) return;

        try {
          const release = await invoke<{
            version: string;
            currentVersion: string;
            body?: string;
            date?: string;
          } | null>("get_latest_release", { channel });

          if (release) {
            set({
              latestRelease: {
                ...release,
                downloadAndInstall: async () => {},
              } as Update,
              latestReleaseChannel: channel,
            });
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          logger.error("Failed to fetch latest release:", message);
        }
      },

      download: async () => {
        const { updateManifest } = get();
        if (!updateManifest) return;

        let unlistenProgress: UnlistenFn | null = null;
        let unlistenComplete: UnlistenFn | null = null;

        try {
          set({ isDownloading: true, downloadProgress: null, error: null });

          // Listen for download events in parallel
          [unlistenProgress, unlistenComplete] = await Promise.all([
            listen<DownloadProgress>(
              "update-download-progress",
              (event) => {
                set({ downloadProgress: event.payload });
              }
            ),
            listen("update-download-complete", () => {
              set({
                isDownloading: false,
                isReadyToInstall: true,
                downloadProgress: null,
              });
            }),
          ]);

          // Start the download (does not install)
          await invoke("download_update");

          logger.info("Update download complete");
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          logger.error("Failed to download update:", message);
          set({ error: message, isDownloading: false });
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
        }
      },

      openDownloadPage: () => {
        const url = "https://github.com/justCallMeJeg/vibemusic/releases";
        import("@tauri-apps/plugin-opener").then(({ openUrl }) => {
          openUrl(url);
        }).catch(() => {
          window.open(url, "_blank");
        });
      },

      setManualUpdateDialogOpen: (open) => set({ isManualUpdateDialogOpen: open }),

      reset: () => {
        set({
          error: null,
          isChecking: false,
          isDownloading: false,
          isReadyToInstall: false,
          downloadProgress: null,
          requiresManualDownload: false,
          isManualUpdateDialogOpen: false,
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
