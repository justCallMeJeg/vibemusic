import { useSettingsStore } from "@/stores/settings-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Speaker,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Download,
  FolderOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
// import { listen } from "@tauri-apps/api/event"; // Removed unused import
// import { DownloadProgress } from "@/stores/settings-store"; // Removed unused import
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

export function SettingsAudio() {
  const {
    selectedDevice,
    audioDevices,
    setAudioDevice,
    refreshAudioDevices,
    crossfadeDuration,
    setCrossfadeDuration,

    // FFmpeg
    currentFFmpegStatus,
    checkFFmpegStatus,
    downloadFFmpeg,
    setFFmpegPath,
    availableFFmpegVersions,
    fetchFFmpegVersions,

    // Global Download State
    isFFmpegDownloading,
    ffmpegDownloadProgress,
    ffmpegDownloadError,
  } = useSettingsStore();

  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  // Removed local download state
  const [selectedVersion, setSelectedVersion] = useState("latest");

  const [warningType, setWarningType] = useState<
    "downgrade" | "redownload" | null
  >(null);
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  useEffect(() => {
    checkFFmpegStatus();
    fetchFFmpegVersions();
    // Global listener is now in App.tsx
  }, [checkFFmpegStatus, fetchFFmpegVersions]);

  const handleRefreshDevices = async () => {
    setIsRefreshingDevices(true);
    await refreshAudioDevices();
    setIsRefreshingDevices(false);
  };

  const compareVersions = (v1: string, v2: string) => {
    if (v1 === "latest" && v2 === "latest") return 0;
    if (v1 === "latest") return 1; // v1 is newer
    if (v2 === "latest") return -1; // v2 is newer

    const p1 = v1
      .replace(/[^0-9.]/g, "")
      .split(".")
      .map(Number);
    const p2 = v2
      .replace(/[^0-9.]/g, "")
      .split(".")
      .map(Number);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  };

  const handleDownloadClick = () => {
    if (currentFFmpegStatus?.status === "Ready") {
      const currentVerStr = currentFFmpegStatus.version || "";
      let cmp = compareVersions(selectedVersion, currentVerStr);

      // Heuristic: If the current version doesn't match any of the explicit legacy versions,
      // and we are selecting "latest", assume the current one IS the latest version.
      if (selectedVersion === "latest") {
        const isKnownLegacy = availableFFmpegVersions.some(
          (v) => v.id !== "latest" && currentVerStr.includes(v.id)
        );
        if (!isKnownLegacy) {
          cmp = 0; // Treat as same version
        }
      }

      logger.debug("FFmpeg Check", {
        selected: selectedVersion,
        current: currentVerStr,
        comparison: cmp,
      });

      if (cmp < 0) {
        setWarningType("downgrade");
        setIsWarningOpen(true);
        return;
      }

      if (cmp === 0) {
        setWarningType("redownload");
        setIsWarningOpen(true);
        return;
      }
    }

    confirmDownload();
  };

  const confirmDownload = async () => {
    setIsWarningOpen(false);
    try {
      await downloadFFmpeg(selectedVersion);
      // Success toast is handled in the store
    } catch {
      // Error toast is handled in the store
    }
  };

  const handleManualLocate = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [
          {
            name: "FFmpeg Binary",
            extensions: navigator.userAgent.includes("Windows") ? ["exe"] : [],
          },
        ],
      });

      if (file && typeof file === "string") {
        await toast.promise(setFFmpegPath(file), {
          loading: "Validating and copying FFmpeg binary...",
          success: "FFmpeg location updated successfully!",
          error:
            "Failed to update FFmpeg location. Ensure the binary is valid.",
        });
      }
    } catch (err) {
      logger.error("Failed to open file dialog", err);
      // toast.error("Failed to open file dialog"); // Optional: prevent toast spam if user just cancelled
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-2 mb-6">
        <Speaker className="w-5 h-5 text-purple-500" />
        <h2 className="text-xl font-semibold">Audio</h2>
      </div>

      <div className="grid gap-6">
        {/* Output Device */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="space-y-1">
            <div className="font-medium">Output Device</div>
            <div className="text-sm text-muted-foreground">
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
        <div className="flex items-start justify-between p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="space-y-1">
            <div className="font-medium">Crossfade</div>
            <div className="text-sm text-muted-foreground">
              Overlap songs by specifying duration in milliseconds.
            </div>
          </div>
          <div className="w-48 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={crossfadeDuration}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) {
                    setCrossfadeDuration(Number(val));
                  }
                }}
                className="bg-card border-border text-right font-mono"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground font-medium">
                ms
              </span>
            </div>
          </div>
        </div>

        {/* FFmpeg Settings */}
        <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-2">
                FFmpeg Configuration
                {currentFFmpegStatus?.status === "Ready" ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Required for audio decoding.
                {currentFFmpegStatus?.status === "Ready" && (
                  <div className="mt-1 font-mono text-xs opacity-70">
                    {currentFFmpegStatus.version}
                  </div>
                )}
              </div>
            </div>
            {/* <div className="flex gap-2">
               Check Status button removed as per request
            </div> */}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            {isFFmpegDownloading ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Downloading...</span>
                  <span>
                    {ffmpegDownloadProgress
                      ? `${(
                          ffmpegDownloadProgress.progress /
                          1024 /
                          1024
                        ).toFixed(1)} MB / ${(
                          ffmpegDownloadProgress.total /
                          1024 /
                          1024
                        ).toFixed(1)} MB (${Math.round(
                          (ffmpegDownloadProgress.progress /
                            ffmpegDownloadProgress.total) *
                            100
                        )}%)`
                      : "Starting..."}
                  </span>
                </div>
                <Progress
                  value={
                    ffmpegDownloadProgress
                      ? (ffmpegDownloadProgress.progress /
                          ffmpegDownloadProgress.total) *
                        100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                {/* Version Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[140px] justify-between"
                    >
                      {availableFFmpegVersions.find(
                        (v) => v.id === selectedVersion
                      )?.name || "Latest Stable"}
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuRadioGroup
                      value={selectedVersion}
                      onValueChange={setSelectedVersion}
                    >
                      {availableFFmpegVersions.map((v) => (
                        <DropdownMenuRadioItem key={v.id} value={v.id}>
                          <div className="flex flex-col">
                            <span>{v.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {v.description}
                            </span>
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  onClick={handleDownloadClick}
                  disabled={isFFmpegDownloading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {currentFFmpegStatus?.status === "Ready"
                    ? "Re-download"
                    : "Download"}
                </Button>
                <Button variant="secondary" onClick={handleManualLocate}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Locate...
                </Button>
              </div>
            )}
            {ffmpegDownloadError && (
              <div className="text-sm text-red-500">
                Error: {ffmpegDownloadError}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {warningType === "downgrade"
                ? "Downgrade FFmpeg Version?"
                : "Re-download FFmpeg?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {warningType === "downgrade"
                ? "You are about to install an older version of FFmpeg. This may cause compatibility issues with some audio files. Are you sure you want to proceed?"
                : "You already have this version installed. Do you want to re-download and overwrite the existing binary?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDownload}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
