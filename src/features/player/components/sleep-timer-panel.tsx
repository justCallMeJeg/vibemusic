import { useState } from "react";
import { Play, Square, Pencil } from "lucide-react";
import { useSleepTimerStore } from "@/stores/sleep-timer-store";
import { Button } from "@/components/ui/button";
import {
  CircularProgress,
  CircularProgressIndicator,
  CircularProgressTrack,
  CircularProgressRange,
  CircularProgressValueText,
} from "@/components/ui/circular-progress";
import { SleepTimerEditorDialog } from "./sleep-timer-editor-dialog";

function formatHms(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function SleepTimerPanel() {
  const isActive = useSleepTimerStore((s) => s.isActive);
  const remainingMs = useSleepTimerStore((s) => s.remainingMs);
  const initialMs = useSleepTimerStore((s) => s.initialMs);
  const lastSetMs = useSleepTimerStore((s) => s.lastSetMs);
  const [editorOpen, setEditorOpen] = useState(false);

  const progress =
    isActive && initialMs > 0
      ? Math.round((1 - remainingMs / initialMs) * 100)
      : 0;
  const displayTime = isActive ? formatHms(remainingMs) : formatHms(lastSetMs);

  return (
    <div className="flex flex-col items-center justify-center gap-8 h-full px-4">
      <div className="relative flex items-center justify-center">
        <CircularProgress
          value={progress}
          min={0}
          max={100}
          size={200}
          thickness={6}
          aria-label={`Sleep timer ${progress}% elapsed`}
        >
          <CircularProgressIndicator>
            <CircularProgressTrack />
            <CircularProgressRange />
          </CircularProgressIndicator>
          <CircularProgressValueText className="text-xl font-semibold tabular-nums text-foreground tracking-widest select-none">
            {displayTime}
          </CircularProgressValueText>
        </CircularProgress>
      </div>

      <div className="flex gap-2">
        {isActive ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => useSleepTimerStore.getState().cancel()}
          >
            <Square size={14} className="mr-1.5" />
            Stop
          </Button>
        ) : (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                useSleepTimerStore.getState().start(lastSetMs, "duration");
              }}
            >
              <Play size={14} className="mr-1.5" />
              Start
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditorOpen(true)}
            >
              <Pencil size={14} className="mr-1.5" />
              Edit
            </Button>
          </>
        )}
      </div>

      <SleepTimerEditorDialog open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}
