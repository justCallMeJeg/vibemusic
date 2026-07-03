import { Button } from "@/components/ui/button";
import { useUpdateStore } from "@/stores/update-store";
import { useAudioStore } from "@/stores/audio-store";
import {
  Loader2,
  CheckCircle2,
  Download,
  Info,
  FileText,
  ClipboardCopy,
} from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import { UpdateDialog } from "@/components/dialogs/update-dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { appLogDir } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { logger } from "@/lib/logger";

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SettingsAbout() {
  const [appVersion, setAppVersion] = useState("0.0.0");
  const { check, isUpdateAvailable, install, updateManifest, fetchLatestRelease } =
    useUpdateStore();
  const isChecking = useUpdateStore((s) => s.isChecking);
  const isDownloading = useUpdateStore((s) => s.isDownloading);
  const isReadyToInstall = useUpdateStore((s) => s.isReadyToInstall);
  const downloadProgress = useUpdateStore((s) => s.downloadProgress);
  const lastChecked = useUpdateStore((s) => s.lastChecked);
  const channel = useUpdateStore((s) => s.channel);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  const handleCheck = async () => {
    if (isUpdateAvailable) {
      setDialogOpen(true);
      return;
    }
    const hasUpdate = await check();
    if (hasUpdate) {
      setDialogOpen(true);
    } else {
      await fetchLatestRelease();
      setDialogOpen(true);
    }
  };

  const handleViewChangelog = async () => {
    await fetchLatestRelease();
    setDialogOpen(true);
  };

  const handleInstall = async () => {
    // Stop audio playback before installing
    try {
      const audioStore = useAudioStore.getState();
      if (audioStore.status === "playing") {
        await audioStore.stop();
      }
    } catch (e) {
      logger.error("Failed to stop audio", e);
    }

    // Install the update
    await install();
  };

  // Calculate download percentage
  const downloadPercentage = downloadProgress?.total
    ? (downloadProgress.downloaded / downloadProgress.total) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Info className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">About</h2>
      </div>

      <div className="p-6 rounded-xl bg-secondary/50 border border-border space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">Update Channel</h3>
            <p className="text-sm text-muted-foreground">
              Choose between Stable releases or Nightly builds.
            </p>
          </div>
          <div className="flex bg-card p-1 rounded-lg border border-border">
            {(["stable", "dev"] as const).map((ch) => (
              <Tooltip key={ch}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (ch === "dev" && channel !== "dev") {
                        setWarningOpen(true);
                      } else {
                        useUpdateStore.getState().setChannel(ch);
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                      channel === ch
                        ? "bg-accent text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {ch}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Switch to{" "}
                  {ch === "stable" ? "Stable Release" : "Nightly Dev Build"}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        <ConfirmDialog
          open={warningOpen}
          onOpenChange={setWarningOpen}
          title="Switch to Dev Channel?"
          description="The Dev channel is experimental. Using it might cause the app to behave unexpectedly, break features, or cause loss of your playlists or library data. We recommend sticking to the Stable channel for daily use."
          confirmText="Switch Anyway"
          variant="destructive"
          onConfirm={() => {
            useUpdateStore.getState().setChannel("dev");
            setWarningOpen(false);
          }}
        />

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <h3 className="text-lg font-medium text-foreground">vibemusic</h3>
            <p className="text-sm text-muted-foreground">
              Version {appVersion}
            </p>
          </div>
          <div className="text-right">
            {/* Download Progress */}
            {isDownloading && downloadProgress && (
              <div className="mb-3 w-48">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Downloading...</span>
                  <span>
                    {formatBytes(downloadProgress.downloaded)}
                    {downloadProgress.total != null &&
                      ` / ${formatBytes(downloadProgress.total)}`}
                  </span>
                </div>
                <Progress value={downloadPercentage} max={100} />
                <p className="text-xs text-muted-foreground/70 mt-1 text-right">
                  {Math.round(downloadPercentage)}%
                </p>
              </div>
            )}

            {/* Ready to Install Button */}
            {isReadyToInstall && !isDownloading && (
              <Button
                onClick={handleInstall}
                className="bg-green-600 hover:bg-green-700 text-white min-w-35 mb-2"
              >
                <Download className="mr-2 h-4 w-4" />
                Install Update
              </Button>
            )}

            {/* Check/View Update Button */}
            {!isReadyToInstall && !isDownloading && (
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleCheck}
                      disabled={isChecking}
                      className="bg-secondary/50 border-border hover:bg-accent text-foreground min-w-35"
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : isUpdateAvailable ? (
                        "View Update"
                      ) : (
                        "Check for Updates"
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Check for updates on{" "}
                    {channel === "stable" ? "Stable" : "Nightly"} channel
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  onClick={handleViewChangelog}
                  className="text-muted-foreground hover:text-foreground"
                  size="sm"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Changelog
                </Button>
              </div>
            )}

            {lastChecked &&
              !isChecking &&
              !isUpdateAvailable &&
              !isDownloading &&
              !isReadyToInstall && (
                <p className="text-xs text-muted-foreground/60 mt-2 flex items-center justify-end gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Up to date
                </p>
              )}

            {isReadyToInstall && (
              <p className="text-xs text-green-400 mt-1">
                v{updateManifest?.version} ready to install
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Current Channel:{" "}
            <span className="text-foreground/70 capitalize">
              {channel === "dev" ? "Nightly (Dev)" : "Stable Release"}
            </span>
          </p>
        </div>
      </div>

      {/* Logs Section */}
      <div className="p-6 rounded-xl bg-secondary/50 border border-border space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-foreground font-medium">Troubleshooting</h3>
            <p className="text-sm text-muted-foreground">
              View application logs for debugging
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-secondary/50 border-border hover:bg-accent text-foreground gap-2"
              onClick={async () => {
                try {
                  const logDir = await appLogDir();
                  await openPath(logDir);
                } catch (error) {
                  logger.error("Failed to open logs folder", error);
                }
              }}
            >
              <FileText className="h-4 w-4" />
              Open Logs
            </Button>
            <Button
              variant="outline"
              className="bg-secondary/50 border-border hover:bg-accent text-foreground gap-2"
              onClick={async () => {
                try {
                  const logDir = await appLogDir();
                  const content = await readTextFile(`${logDir}/vibemusic.log`);
                  await navigator.clipboard.writeText(content);
                  toast.success("Logs copied to clipboard");
                } catch (error) {
                  logger.error("Failed to copy logs", error);
                  toast.error("Failed to read log file");
                }
              }}
            >
              <ClipboardCopy className="h-4 w-4" />
              Copy Logs
            </Button>
          </div>
        </div>
      </div>
      <UpdateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
