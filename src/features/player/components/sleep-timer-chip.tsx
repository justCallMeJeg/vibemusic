import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSleepTimerStore } from "@/stores/sleep-timer-store";
import { useAudioStore, useSidePanel } from "@/stores/audio-store";
import { cn } from "@/lib/utils";

export function SleepTimerChip() {
  const isActive = useSleepTimerStore((s) => s.isActive);
  const remainingMs = useSleepTimerStore((s) => s.remainingMs);
  const sidePanel = useSidePanel();

  const isOpen = sidePanel === "sleep-timer";

  const handleClick = () => {
    useAudioStore.getState().setSidePanel(isOpen ? "none" : "sleep-timer");
  };

  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const label = isActive
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : "Timer";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      title="Sleep timer"
      className={cn(
        "gap-1.5 text-xs",
        isOpen
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Timer size={14} />
      {isActive && label}
    </Button>
  );
}
