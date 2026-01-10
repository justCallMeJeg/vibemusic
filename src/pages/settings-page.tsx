import { useSettingsStore } from "@/stores/settings-store";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Moon,
  Sun,
  Monitor,
  Palette,
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2,
  Speaker,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  const {
    theme,
    setTheme,
    dynamicGradient,
    setDynamicGradient,
    libraryPaths,
    addLibraryPath,
    removeLibraryPath,
    selectedDevice,
    audioDevices,
    setAudioDevice,
    refreshAudioDevices,
    crossfadeDuration,
    setCrossfadeDuration,
  } = useSettingsStore();

  const [isRescanning, setIsRescanning] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  const handleRefreshDevices = async () => {
    setIsRefreshingDevices(true);
    await refreshAudioDevices();
    setIsRefreshingDevices(false);
  };

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        await addLibraryPath(selected);
        toast.success("Folder added to library");
        // Trigger scan for the new folder
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
    <div className="flex-1 min-w-0 h-full flex flex-col p-8 overflow-y-auto w-full max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-12">
        {/* Appearance Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Appearance</h2>
          </div>

          <div className="grid gap-6">
            {/* Theme Setting */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-1">
                <div className="font-medium">Theme</div>
                <div className="text-sm text-gray-400">
                  Choose your preferred visual theme
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-32 justify-between">
                    <span className="capitalize">{theme}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(v) =>
                      setTheme(v as "dark" | "light" | "system")
                    }
                  >
                    <DropdownMenuRadioItem value="light">
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      <Monitor className="w-4 h-4 mr-2" />
                      System
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Dynamic Gradient Setting */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-1">
                <div className="font-medium">Dynamic Background</div>
                <div className="text-sm text-gray-400">
                  Ambient gradient based on current album art
                </div>
              </div>
              <Switch
                checked={dynamicGradient}
                onCheckedChange={setDynamicGradient}
              />
            </div>
          </div>
        </section>

        {/* Library Section */}
        <section className="space-y-6">
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
                <div className="text-center py-8 text-gray-500 bg-white/5 rounded-lg border border-dashed border-white/10">
                  No folders added yet.
                </div>
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
        </section>

        {/* Audio Section */}
        <section className="space-y-6 pb-10">
          <div className="flex items-center gap-2 mb-6">
            <Speaker className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Audio</h2>
          </div>

          <div className="grid gap-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-1">
                <div className="font-medium">Output Device</div>
                <div className="text-sm text-gray-400">
                  Select where audio should be played
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshDevices}
                  className={isRefreshingDevices ? "animate-spin" : ""}
                >
                  <RefreshCw size={16} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-48 justify-between truncate"
                    >
                      <span className="truncate">
                        {selectedDevice || "Default System Device"}
                      </span>
                      <ChevronDown className="w-4 h-4 opacity-50 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuRadioGroup
                      value={selectedDevice || ""}
                      onValueChange={(v) => setAudioDevice(v)}
                    >
                      <DropdownMenuRadioItem value="">
                        Default System Device
                      </DropdownMenuRadioItem>
                      {audioDevices.map((device) => (
                        <DropdownMenuRadioItem
                          key={device.name}
                          value={device.name}
                        >
                          {device.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Crossfade Setting */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-1">
                <div className="font-medium">Crossfade</div>
                <div className="text-sm text-gray-400">
                  Overlap songs by {crossfadeDuration}s
                </div>
              </div>
              <div className="w-48">
                <Slider
                  value={[crossfadeDuration]}
                  min={0}
                  max={12}
                  step={1}
                  onValueChange={(vals) => setCrossfadeDuration(vals[0])}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
