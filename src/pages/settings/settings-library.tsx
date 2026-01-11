import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, RefreshCw, Trash2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { EmptyState } from "@/components/empty-state";

export function SettingsLibrary() {
  const { libraryPaths, addLibraryPath, removeLibraryPath } =
    useSettingsStore();
  const [isRescanning, setIsRescanning] = useState(false);
  const [isPruning, setIsPruning] = useState(false);

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        await addLibraryPath(selected);
        toast.success("Folder added to library");
        await invoke("scan_music_library", { folders: [selected] });
        toast.success("Scan complete");
      }
    } catch (error) {
      console.error("Failed to add folder:", error);
      toast.error("Failed to add folder");
    }
  };

  const handleRescan = async () => {
    if (libraryPaths.length === 0) return;
    setIsRescanning(true);
    try {
      await invoke("scan_music_library", { folders: libraryPaths });
      toast.success("Library rescanned");
    } catch (error) {
      console.error("Failed to rescan:", error);
      toast.error("Failed to rescan library");
    } finally {
      setIsRescanning(false);
    }
  };

  const handlePrune = async () => {
    setIsPruning(true);
    try {
      await invoke("prune_library");
      toast.success("Library pruned");
    } catch (error) {
      console.error("Failed to prune:", error);
      toast.error("Failed to prune library");
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
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Music Folders</div>
              <div className="text-sm text-gray-400">
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
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg group"
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
              description="No folders added yet."
              variant="default"
              emptyClassName="py-8 bg-white/5 border-dashed"
              className="h-auto"
            />
          )}

          <div className="pt-4 border-t border-white/10 flex gap-4">
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
