import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, RefreshCw, Trash2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { EmptyState } from "@/components/shared/empty-state";
import { useLibraryStore } from "@/stores/library-store";

export function SettingsLibrary() {
  const { libraryPaths, addLibraryPath, removeLibraryPath } =
    useSettingsStore();
  const fetchLibrary = useLibraryStore((s) => s.fetchLibrary);
  const [isRescanning, setIsRescanning] = useState(false);
  const [isPruning, setIsPruning] = useState(false);

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        // Create a toast that we'll update with progress
        const toastId = toast.loading(
          "Adding folder and discovering audio files..."
        );

        // Listen for scan progress events
        let unlisten: (() => void) | null = null;

        try {
          const { listen } = await import("@tauri-apps/api/event");

          unlisten = await listen<{
            current: number;
            total: number;
            current_file: string;
            status: string;
          }>("scan-progress", (event) => {
            const { current, total, status } = event.payload;

            if (status === "scanning" && total > 0) {
              toast.loading(`Importing tracks... (${current}/${total})`, {
                id: toastId,
              });
            }
          });

          const stats = await addLibraryPath(selected);
          await fetchLibrary();

          // Show success message
          if (stats && stats.success_count > 0) {
            toast.success(
              `Added ${stats.success_count} tracks from new folder`,
              { id: toastId }
            );
          } else if (stats && stats.scanned_count > 0) {
            toast.success(
              `Folder added. ${stats.scanned_count} files already in library.`,
              { id: toastId }
            );
          } else {
            toast.success("Folder added to library", { id: toastId });
          }
        } catch (err) {
          logger.error("Failed to add folder", err);
          toast.error(`Failed to add folder: ${err}`, { id: toastId });
        } finally {
          if (unlisten) unlisten();
        }
      }
    } catch (error) {
      logger.error("Failed to open folder dialog", error);
    }
  };

  const handleRescan = async () => {
    if (libraryPaths.length === 0) return;
    setIsRescanning(true);

    // Create a toast that we'll update with progress
    const toastId = toast.loading("Discovering audio files...");

    // Listen for scan progress events
    let unlisten: (() => void) | null = null;

    try {
      const { listen } = await import("@tauri-apps/api/event");

      unlisten = await listen<{
        current: number;
        total: number;
        current_file: string;
        status: string;
      }>("scan-progress", (event) => {
        const { current, total, status } = event.payload;

        if (status === "scanning" && total > 0) {
          toast.loading(`Importing tracks... (${current}/${total})`, {
            id: toastId,
          });
        } else if (status === "complete") {
          // Toast will be updated by the success handler below
        }
      });

      // Run the scan
      const data = await invoke<{
        scanned_count: number;
        success_count: number;
        error_count: number;
      }>("scan_music_library", { folders: libraryPaths });

      await fetchLibrary();

      // Show success message
      if (data.success_count > 0) {
        toast.success(
          `Scan complete! Found ${data.scanned_count} files, imported ${data.success_count} tracks.`,
          { id: toastId }
        );
      } else if (data.scanned_count > 0) {
        toast.success(
          `Scan complete. ${data.scanned_count} files already up to date.`,
          { id: toastId }
        );
      } else {
        toast.success("Scan complete. No audio files found.", { id: toastId });
      }
    } catch (err) {
      logger.error("Rescan failed", err);
      toast.error(`Scan failed: ${err}`, { id: toastId });
    } finally {
      if (unlisten) unlisten();
      setIsRescanning(false);
    }
  };

  const handlePrune = async () => {
    setIsPruning(true);

    const promise = (async () => {
      const data = await invoke<{ success_count: number }>("prune_library");
      await fetchLibrary();
      return data;
    })();

    toast.promise(promise, {
      loading: "Pruning library...",
      success: (data) => {
        if (data.success_count > 0) {
          return `Pruned ${data.success_count} missing tracks`;
        }
        return "Library checks out. No missing files found.";
      },
      error: "Failed to prune library",
    });

    try {
      await promise;
    } finally {
      setIsPruning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FolderOpen className="w-5 h-5 text-purple-500" />
        <h2 className="text-xl font-semibold">Library</h2>
      </div>

      <div className="grid gap-6">
        <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Music Folders</div>
              <div className="text-sm text-muted-foreground">
                Manage locations where Vibe looks for music
              </div>
            </div>
            <Button onClick={handleAddFolder} className="gap-2">
              <Plus size={16} /> Add Folder
            </Button>
          </div>

          {libraryPaths.length > 0 ? (
            <div className="space-y-2">
              {libraryPaths.map((path) => (
                <div
                  key={path}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg group"
                >
                  <span className="text-sm font-mono truncate mr-4">
                    {path}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLibraryPath(path)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="No library folders"
              description="Add a folder to start building your library."
              variant="default"
              emptyClassName="py-12 border-dashed border-border/50"
              className="h-auto"
            />
          )}

          <div className="pt-4 border-t border-border flex gap-4">
            <Button
              variant="outline"
              onClick={handleRescan}
              disabled={isRescanning || libraryPaths.length === 0}
              className="gap-2"
            >
              <RefreshCw
                size={16}
                className={isRescanning ? "animate-spin" : ""}
              />
              {isRescanning ? "Scanning..." : "Rescan Library"}
            </Button>

            <Button
              variant="outline"
              onClick={handlePrune}
              disabled={isPruning}
              className="gap-2 hover:text-red-400 hover:border-red-900/50"
            >
              <Trash2 size={16} />
              {isPruning ? "Pruning..." : "Prune Deleted Files"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
