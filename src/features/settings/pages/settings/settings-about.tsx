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
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsGroup } from "@/components/shared/settings-group";
import { SettingsSection } from "@/components/shared/settings-section";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SettingsAbout() {
  const [appVersion, setAppVersion] = useState("0.0.0");
  const { check, isUpdateAvailable, install, updateManifest, latestRelease, requiresManualDownload, fetchLatestRelease } =
    useUpdateStore();
  const isChecking = useUpdateStore((s) => s.isChecking);
  const isDownloading = useUpdateStore((s) => s.isDownloading);
  const isReadyToInstall = useUpdateStore((s) => s.isReadyToInstall);
  const downloadProgress = useUpdateStore((s) => s.downloadProgress);
  const lastChecked = useUpdateStore((s) => s.lastChecked);
  const channel = useUpdateStore((s) => s.channel);
  const setManualUpdateDialogOpen = useUpdateStore((s) => s.setManualUpdateDialogOpen);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  const handleCheck = async () => {
    if (isUpdateAvailable) {
      if (requiresManualDownload) {
        setManualUpdateDialogOpen(true);
      } else {
        setDialogOpen(true);
      }
      return;
    }
    const hasUpdate = await check();
    if (hasUpdate) {
      const state = useUpdateStore.getState();
      if (!state.requiresManualDownload) {
        setDialogOpen(true);
      }
    } else {
      if (!latestRelease) {
        await fetchLatestRelease();
      }
      setDialogOpen(true);
    }
  };

  const handleInstall = async () => {
    try {
      const audioStore = useAudioStore.getState();
      if (audioStore.status === "playing") {
        await audioStore.stop();
      }
    } catch (e) {
      logger.error("Failed to stop audio", e);
    }

    await install();
  };

  const downloadPercentage = downloadProgress?.total
    ? (downloadProgress.downloaded / downloadProgress.total) * 100
    : 0;

  return (
    <>
      <SettingsSection icon={Info} title="About">
        <SettingsRow label="vibemusic" description={`Version ${appVersion}`} />

        <SettingsRow
          label="Update Channel"
          description="Choose between Stable releases or Nightly builds."
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Current:{" "}
              <span className="text-foreground/70 capitalize">
                {channel === "dev" ? "Nightly" : "Stable"}
              </span>
            </span>
            <div className="flex bg-card p-1 rounded-lg border border-border" role="tablist" aria-label="Update channel">
              {(["stable", "dev"] as const).map((ch) => (
                <Tooltip key={ch}>
                  <TooltipTrigger asChild>
                    <Button
                      role="tab"
                      aria-selected={channel === ch}
                      variant={channel === ch ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        if (ch === "dev" && channel !== "dev") {
                          setWarningOpen(true);
                        } else {
                          useUpdateStore.getState().setChannel(ch);
                        }
                      }}
                    >
                      {ch}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Switch to {ch === "stable" ? "Stable Release" : "Nightly Dev Build"}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </SettingsRow>

        <SettingsGroup title="Updates">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status</span>
            {lastChecked && !isChecking && !isDownloading && (
              <p className="text-xs text-muted-foreground">
                Last checked: {lastChecked.toLocaleDateString()}{" "}
                {lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          {isDownloading && downloadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Downloading update...</span>
                <span>
                  {formatBytes(downloadProgress.downloaded)}
                  {downloadProgress.total != null && ` / ${formatBytes(downloadProgress.total)}`}
                </span>
              </div>
              <Progress value={downloadPercentage} max={100} />
              <p className="text-xs text-muted-foreground/70 text-right">
                {Math.round(downloadPercentage)}%
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              {isReadyToInstall && !isDownloading && (
                <p className="text-sm text-foreground">
                  v{updateManifest?.version} ready to install
                </p>
              )}
              {lastChecked && !isChecking && !isUpdateAvailable && !isDownloading && !isReadyToInstall && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Up to date
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isReadyToInstall && !isDownloading && (
                <Button onClick={handleInstall}>
                  <Download className="mr-2 h-4 w-4" />
                  Install Update
                </Button>
              )}
              {!isReadyToInstall && !isDownloading && (
                <Button
                  variant="outline"
                  onClick={handleCheck}
                  disabled={isChecking}
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
              )}
            </div>
          </div>
        </SettingsGroup>

        <SettingsRow
          label="Troubleshooting"
          description="View application logs for debugging"
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
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
        </SettingsRow>
      </SettingsSection>

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
      <UpdateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
