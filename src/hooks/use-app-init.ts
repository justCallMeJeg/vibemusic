import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettingsStore, DownloadProgress } from "@/stores/settings-store";
import { logger } from "@/lib/logger";

/**
 * Custom hook that handles FFmpeg download progress listening.
 * Extracted from App.tsx to reduce component complexity.
 */
export function useFFmpegProgressListener() {
  const updateFFmpegDownloadProgress = useSettingsStore(
    (s) => s.updateFFmpegDownloadProgress,
  );

  useEffect(() => {
    const unlistenPromise = listen<DownloadProgress>(
      "download-progress",
      (event) => {
        updateFFmpegDownloadProgress(event.payload);
      },
    );
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [updateFFmpegDownloadProgress]);
}

/**
 * Custom hook that handles the window close behavior (close-to-tray or quit dialog).
 * @param onQuitRequested - Callback when user needs to confirm quit
 */
export function useWindowCloseHandler(onQuitRequested: () => void) {
  const hasSetup = useRef(false);

  useEffect(() => {
    if (hasSetup.current) return;
    hasSetup.current = true;

    const appWindow = getCurrentWindow();
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      // Prevent default close to handle everything manually
      event.preventDefault();

      const { closeToTray } = useSettingsStore.getState();

      if (closeToTray) {
        await appWindow.hide();
      } else {
        onQuitRequested();
      }
    });

    // Show window once App is ready to prevent white flash
    appWindow.show();

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onQuitRequested]);
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
