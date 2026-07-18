import { useUpdateStore } from "@/stores/update-store";
import { useNavigationStore } from "@/stores/navigation-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Loader, ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";

function ProgressRing({ progress }: { progress: number }) {
  const size = 16;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="opacity-20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  );
}

export function UpdateStatusIcon() {
  const isChecking = useUpdateStore((s) => s.isChecking);
  const isDownloading = useUpdateStore((s) => s.isDownloading);
  const isReadyToInstall = useUpdateStore((s) => s.isReadyToInstall);
  const isUpdateAvailable = useUpdateStore((s) => s.isUpdateAvailable);
  const requiresManualDownload = useUpdateStore((s) => s.requiresManualDownload);
  const downloadProgress = useUpdateStore((s) => s.downloadProgress);
  const updateManifest = useUpdateStore((s) => s.updateManifest);
  const error = useUpdateStore((s) => s.error);
  const install = useUpdateStore((s) => s.install);
  const check = useUpdateStore((s) => s.check);
  const setManualUpdateDialogOpen = useUpdateStore((s) => s.setManualUpdateDialogOpen);

  const showIcon =
    isChecking || isDownloading || isReadyToInstall || isUpdateAvailable || error;

  if (!showIcon) return null;

  const progress = downloadProgress?.total
    ? Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)
    : 0;

  let icon: React.ReactNode;
  let tooltip: string;
  let colorClass: string;
  let onClick: (() => void) | undefined;

  if (error) {
    icon = <TriangleAlert size={14} />;
    tooltip = "Update check failed — click to retry";
    colorClass = "text-destructive hover:text-destructive";
    onClick = () => check(true);
  } else if (isReadyToInstall) {
    icon = <RefreshCw size={14} />;
    tooltip = "Ready to install — click to restart";
    colorClass = "text-success";
    onClick = install;
  } else if (isDownloading) {
    icon = <ProgressRing progress={progress} />;
    tooltip = `Downloading\u2026 ${progress}%`;
    colorClass = "text-sidebar-primary";
    onClick = () => useNavigationStore.getState().setPage("about");
  } else if (requiresManualDownload && isUpdateAvailable) {
    icon = <ExternalLink size={14} />;
    tooltip = updateManifest
      ? `Download v${updateManifest.version} from GitHub`
      : "Download update from GitHub";
    colorClass = "text-sidebar-primary";
    onClick = () => setManualUpdateDialogOpen(true);
  } else if (isUpdateAvailable) {
    icon = <Download size={14} />;
    tooltip = updateManifest
      ? `Update available \u2014 v${updateManifest.version}`
      : "Update available";
    colorClass = "text-sidebar-primary";
    onClick = () => useNavigationStore.getState().setPage("about");
  } else {
    icon = <Loader size={14} className="animate-spin" />;
    tooltip = "Checking for updates\u2026";
    colorClass = "text-muted-foreground";
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`p-2 hover:bg-accent rounded-md transition-colors cursor-pointer ${colorClass}`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
