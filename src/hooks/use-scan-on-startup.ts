import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settings-store";
import { useContentStore } from "@features/library/store/content-store";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { logger } from "@/lib/logger";

export function useScanOnStartup(activeProfileId: string | null, setIsScanning: (v: boolean) => void) {
  const hasDoneInitialScan = useRef(false);

  useEffect(() => {
    if (activeProfileId) {
      const settings = useSettingsStore.getState();
      if (
        !hasDoneInitialScan.current &&
        settings.scanOnStartup &&
        settings.libraryPaths.length > 0
      ) {
        hasDoneInitialScan.current = true;
        setIsScanning(true);
        invoke("scan_music_library", { folders: settings.libraryPaths })
          .then(() => {
            useContentStore.getState().fetchContent();
            usePlaylistStore.getState().fetchPlaylists();
          })
          .catch((err) => logger.error("Startup scan failed:", err))
          .finally(() => setIsScanning(false));
      }
    }
  }, [activeProfileId, setIsScanning]);
}
