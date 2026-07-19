import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, RefreshCw, Trash2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { EmptyState } from "@/components/shared/empty-state";
import { useContentStore } from "@features/library/store/content-store";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { SettingsGroup } from "@/components/shared/settings-group";
import { SettingsSection } from "@/components/shared/settings-section";

export function SettingsLibrary() {
  const libraryPaths = useSettingsStore((s) => s.libraryPaths);
  const addLibraryPath = useSettingsStore((s) => s.addLibraryPath);
  const removeLibraryPath = useSettingsStore((s) => s.removeLibraryPath);
  const fetchLibrary = useContentStore((s) => s.fetchContent);
  const [isRescanning, setIsRescanning] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneDialogOpen, setPruneDialogOpen] = useState(false);

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        const toastId = toast.loading(
          "Adding folder and discovering audio files...",
        );

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

          if (stats && stats.success_count > 0) {
            toast.success(
              `Added ${stats.success_count} tracks from new folder`,
              { id: toastId },
            );
          } else if (stats && stats.scanned_count > 0) {
            toast.success(
              `Folder added. ${stats.scanned_count} files already in library.`,
              { id: toastId },
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

    const toastId = toast.loading("Discovering audio files...");

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

      const data = await invoke<{
        scanned_count: number;
        success_count: number;
        error_count: number;
      }>("scan_music_library", { folders: libraryPaths });

      await fetchLibrary();

      if (data.success_count > 0) {
        toast.success(
          `Scan complete! Found ${data.scanned_count} files, imported ${data.success_count} tracks.`,
          { id: toastId },
        );
      } else if (data.scanned_count > 0) {
        toast.success(
          `Scan complete. ${data.scanned_count} files already up to date.`,
          { id: toastId },
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

  const handlePruneConfirm = async () => {
    setPruneDialogOpen(false);
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
    <>
      <SettingsSection icon={FolderOpen} title="Library">
        <SettingsGroup
          title="Music Folders"
          description="Manage locations where Vibe looks for music"
          headerAction={
            <Button onClick={handleAddFolder} size="sm">
              <Plus size={16} className="mr-1.5" />
              Add Folder
            </Button>
          }
        >
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/30"
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
              className="h-auto"
            />
          )}

          <div className="pt-4 border-t border-border flex gap-4">
            <Button
              variant="outline"
              onClick={handleRescan}
              disabled={isRescanning || libraryPaths.length === 0}
              size="sm"
            >
              <RefreshCw
                size={16}
                className={isRescanning ? "animate-spin" : ""}
              />
              Rescan Library
            </Button>

            <Button
              variant="outline"
              onClick={() => setPruneDialogOpen(true)}
              disabled={isPruning}
              size="sm"
              className="hover:text-destructive hover:border-destructive/50"
            >
              <Trash2 size={16} />
              {isPruning ? "Pruning..." : "Prune Deleted Files"}
            </Button>
          </div>
        </SettingsGroup>
      </SettingsSection>

      <ConfirmDialog
        open={pruneDialogOpen}
        onOpenChange={setPruneDialogOpen}
        title="Prune Library?"
        description="This will remove all tracks whose files no longer exist on disk from your library. This cannot be undone."
        confirmText="Prune Library"
        variant="destructive"
        onConfirm={handlePruneConfirm}
      />
    </>
  );
}
