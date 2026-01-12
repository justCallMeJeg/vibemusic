import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Minus, Square, Copy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// import { cn } from "@/lib/utils";
import { useUpdateStore } from "@/stores/update-store";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();
  const channel = useUpdateStore((s) => s.channel);

  useEffect(() => {
    const checkMaximized = async () => {
      setIsMaximized(await appWindow.isMaximized());
    };

    checkMaximized();

    const unlistenResize = appWindow.onResized(async () => {
      checkMaximized();
    });

    return () => {
      unlistenResize.then((f) => f());
    };
  }, [appWindow]);

  const handleMaximize = async () => {
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };

  return (
    <div className="h-10 bg-background/25 backdrop-blur-md flex items-center justify-between pl-6 pr-2 select-none fixed top-0 left-0 right-0 z-50 border-b border-white/5 overflow-hidden">
      {/* Drag Region Layer */}
      <div
        className="absolute inset-0 w-full h-full z-0"
        data-tauri-drag-region
      />

      {/* Content Layer */}
      <div className="flex items-center gap-2 pointer-events-none relative z-10">
        <div className="w-3 h-3 rounded-full bg-indigo-500" />
        <span className="text-xs font-medium text-white/50">Vibe</span>
        {channel === "dev" && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded ml-1">
            DEV
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 relative z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => appWindow.minimize()}
              className="p-2 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white cursor-pointer"
            >
              <Minus size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Minimize</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleMaximize}
              className="p-2 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white cursor-pointer"
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
              onClick={() => appWindow.close()}
              className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-md transition-colors text-gray-400 cursor-pointer"
            >
              <X size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-red-900 border-red-800 text-white"
          >
            Close
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
