import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { logger } from "@/lib/logger";
import { useSettingsStore } from "@/stores/settings-store";
import { useAudioStore } from "@/stores/audio-store";
import { useProfileStore } from "@/stores/profile-store";
import { useNavigationStore, Page } from "@/stores/navigation-store";
import { useUpdateStore } from "@/stores/update-store";
import { toast } from "sonner";

export type CloseAction =
  | "show-quit-dialog"
  | "show-close-to-tray-dialog"
  | "quit-directly";

/**
 * Custom hook that handles the window close behavior (close-to-tray or quit dialog).
 * Reads playback state to decide which dialog to show (or quits silently when idle).
 * @param onClose - Callback with the action to take
 */
export function useWindowCloseHandler(onClose: (action: CloseAction) => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      event.preventDefault();

      const { closeToTray } = useSettingsStore.getState();
      const { status } = useAudioStore.getState();
      const isPlaying = status === "playing" || status === "paused";

      if (closeToTray) {
        if (isPlaying) {
          onCloseRef.current("show-close-to-tray-dialog");
        } else {
          await appWindow.hide();
        }
      } else {
        if (isPlaying) {
          onCloseRef.current("show-quit-dialog");
        } else {
          onCloseRef.current("quit-directly");
        }
      }
    });

    appWindow.show();

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);
}

/**
 * Custom hook that intercepts refresh keys (F5, Ctrl+R) when playback is active.
 * @param isPlaying - Whether audio is currently playing
 * @param onRefreshRequested - Callback when refresh is intercepted
 */
export function useRefreshInterceptor(
  isPlaying: boolean,
  onRefreshRequested: () => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for F5 or Ctrl+R (Cmd+R on Mac)
      const isRefresh =
        e.key === "F5" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r");

      if (isRefresh && isPlaying) {
        e.preventDefault();
        onRefreshRequested();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, onRefreshRequested]);
}

/**
 * Custom hook that listens for scan-progress events and refreshes library when complete.
 * @param fetchLibrary - Function to refresh the library data
 */
export function useScanProgressListener(fetchLibrary: () => Promise<void>) {
  useEffect(() => {
    const unlistenPromise = listen(
      "scan-progress",
      (event: { payload: { status: string } }) => {
        if (event.payload?.status === "complete") {
          logger.info("Scan complete event received, refreshing library...");
          fetchLibrary();
        }
      },
    );
    return () => {
      unlistenPromise.then((u) => u());
    };
  }, [fetchLibrary]);
}

export function useAppInit() {
  const loadProfiles = useProfileStore((s) => s.loadProfiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const isSettingsLoading = useSettingsStore((s) => s.isLoading);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (activeProfileId) {
      loadSettings(activeProfileId);
    }
  }, [activeProfileId, loadSettings]);

  useEffect(() => {
    if (!isSettingsLoading && activeProfileId) {
      const settings = useSettingsStore.getState();

      if (settings.defaultPage) {
        useNavigationStore.getState().setPage(settings.defaultPage as Page);
      }

      const updateStore = useUpdateStore.getState();
      updateStore.check(true).then((hasUpdate) => {
        if (hasUpdate) {
          toast.info("Update Available", {
            description: "A new version of vibemusic is available.",
            action: {
              label: "View",
              onClick: () => {
                useNavigationStore.getState().setPage("about");
              },
            },
            duration: 10000,
          });
        }
      });
    }
  }, [isSettingsLoading, activeProfileId]);
}
