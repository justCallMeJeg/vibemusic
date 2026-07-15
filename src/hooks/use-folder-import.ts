import { useCallback, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useLibraryStore } from "@/stores/library-store";
import { useSettingsStore } from "@/stores/settings-store";

export function useFolderImport() {
  const [isScanning, setIsScanning] = useState(false);
  const fetchLibrary = useLibraryStore((s) => s.fetchLibrary);
  const addLibraryPath = useSettingsStore((s) => s.addLibraryPath);

  const handleFolderImport = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        setIsScanning(true);
        const toastId = toast.loading(`Importing ${selected}...`);
        logger.info("Importing folder:", selected);

        let stats;

        const libraryPaths = useSettingsStore.getState().libraryPaths;
        if (!libraryPaths.includes(selected)) {
          stats = await addLibraryPath(selected);
          logger.info("Added folder to settings:", selected);
        } else {
          logger.info("Rescanning existing folder:", selected);
          stats = await invoke<{
            scanned_count: number;
            success_count: number;
            error_count: number;
          }>("scan_music_library", { folders: [selected] });
          await fetchLibrary();
        }

        if (stats) {
          if (stats.error_count > 0) {
            toast.warning(`Scan complete with ${stats.error_count} errors`, {
              id: toastId,
              description: `Imported ${stats.success_count} tracks. Check logs for details.`,
            });
          } else {
            toast.success(`Imported ${stats.scanned_count} tracks`, {
              id: toastId,
              description: "Library updated successfully.",
            });
          }
        } else {
          toast.success("Folder added", { id: toastId });
        }
      }
    } catch (error) {
      logger.error("Failed to import folder:", error);
      toast.error("Failed to import folder", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsScanning(false);
    }
  }, [addLibraryPath, fetchLibrary]);

  return { handleFolderImport, isScanning, setIsScanning };
}
