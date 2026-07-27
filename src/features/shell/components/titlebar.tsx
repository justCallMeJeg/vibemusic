import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Minus, Square, Copy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useUpdateStore } from "@/stores/update-store";
import { UpdateStatusIcon } from "@features/shell/components/update-status-icon";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();
  const channel = useUpdateStore((s) => s.channel);
  const showUpdateIcon = useUpdateStore(
    (s) =>
      s.isChecking ||
      s.isDownloading ||
      s.isReadyToInstall ||
      s.isUpdateAvailable ||
      !!s.error,
  );

  useEffect(() => {
    const checkMaximized = async () => {
      setIsMaximized(await appWindow.isMaximized());
    };

    checkMaximized();

    const init = async () => {
      const unlisten = await appWindow.onResized(async () => {
        checkMaximized();
      });
      return unlisten;
    };
    const cleanup = init();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [appWindow]);

  const handleMinimize = () => appWindow.minimize();
  const handleClose = () => appWindow.close();

  const handleMaximize = async () => {
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };

  return (
    <div className="h-10 bg-background/25 backdrop-blur-md flex items-center justify-between pl-6 pr-2 select-none fixed top-0 left-0 right-0 z-50 border-b border-border overflow-hidden">
      {/* Drag Region Layer */}
      <div
        className="absolute inset-0 w-full h-full z-0"
        data-tauri-drag-region
      />

      {/* Content Layer */}
      <div className="flex items-center gap-2 pointer-events-none relative z-10">
        <div className="w-3 h-3 rounded-full bg-sidebar-primary" />
        <span className="text-xs font-medium text-muted-foreground">Vibe</span>
        {channel === "dev" && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 rounded ml-1">
            DEV
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 relative z-50">
        <UpdateStatusIcon />
        {showUpdateIcon && <div className="w-px h-4 bg-border mx-1" />}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleMinimize}
              className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Minus size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Minimize</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleMaximize}
              className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isMaximized ? <Copy size={14} /> : <Square size={14} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isMaximized ? "Restore Down" : "Maximize"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-destructive/20 hover:text-destructive rounded-md transition-colors text-muted-foreground cursor-pointer"
            >
              <X size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-destructive border-destructive/30 text-destructive-foreground"
            style={
              {
                "--arrow-bg": "var(--destructive)",
                "--arrow-fill": "var(--destructive)",
              } as React.CSSProperties
            }
          >
            Close
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
