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
        // Add path
        const addPromise = async () => {
          const stats = await addLibraryPath(selected);
          await fetchLibrary(); // Ensure library state is updated after adding a folder
          return stats;
        };

        toast.promise(addPromise(), {
          loading: "Adding folder...",
          success: (stats: any) => {
            if (stats) {
              return `Added ${stats.success_count} tracks from new folder`;
            }
            return "Folder added to library";
          },
          error: "Failed to add folder",
        });
      }
    } catch (error) {
      logger.error("Failed to add folder", error);
    }
  };

  const handleRescan = async () => {
    if (libraryPaths.length === 0) return;
    setIsRescanning(true);

    // Wrap invoke + fetch in one promise for the toast
    const promise = (async () => {
      const data = await invoke<{
        scanned_count: number;
        success_count: number;
      }>("scan_music_library", { folders: libraryPaths });
      await fetchLibrary();
      return data;
    })();

    toast.promise(promise, {
      loading: "Rescanning library...",
      success: (data) =>
        `Rescan complete. Found ${data.scanned_count} files (${data.success_count} processed).`,
      error: (err) => `Failed to rescan: ${err}`,
    });

    try {
      await promise;
    } finally {
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
