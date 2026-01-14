import { Button } from "@/components/ui/button";
import { useUpdateStore } from "@/stores/update-store";
import { useAudioStore } from "@/stores/audio-store";
import { Loader2, CheckCircle2, Download } from "lucide-react";
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
import { FileText } from "lucide-react";
import { toast } from "sonner";

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SettingsAbout() {
  const [appVersion, setAppVersion] = useState("0.0.0");
  const { check, isUpdateAvailable, install, updateManifest } =
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
    }
  };

  const handleInstall = async () => {
    // Stop audio playback before installing
    try {
      const audioStore = useAudioStore.getState();
      if (audioStore.status === "playing") {
        await audioStore.stop();
      }
    } catch (e) {
      console.error("Failed to stop audio:", e);
    }

    // Install the update
    await install();
  };

  // Calculate download percentage
  const downloadPercentage = downloadProgress?.total
    ? (downloadProgress.downloaded / downloadProgress.total) * 100
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          About
        </h2>
        <p className="text-muted-foreground">
          Application information and update management.
        </p>
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
                        : "text-muted-foreground hover:text-foreground"
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
                    {downloadProgress.total &&
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
                className="bg-green-600 hover:bg-green-700 text-white min-w-[140px] mb-2"
              >
                <Download className="mr-2 h-4 w-4" />
                Install Update
              </Button>
            )}

            {/* Check/View Update Button */}
            {!isReadyToInstall && !isDownloading && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleCheck}
                    disabled={isChecking}
                    className="bg-secondary/50 border-border hover:bg-accent text-foreground min-w-[140px]"
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
            <h3 className="text-foreground font-medium">Trobleshooting</h3>
            <p className="text-sm text-muted-foreground">
              View application logs for debugging
            </p>
          </div>
          <Button
            variant="outline"
            className="bg-secondary/50 border-border hover:bg-accent text-foreground gap-2"
            onClick={async () => {
              try {
                const logDir = await appLogDir();
                await openPath(logDir);
              } catch (error) {
                console.error("Failed to open logs folder:", error);
                toast.error("Failed to open logs folder", {
                  description: "Please check if the logs directory exists.",
                });
              }
            }}
          >
            <FileText className="h-4 w-4" />
            Open Logs
          </Button>
        </div>
      </div>
      <UpdateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
