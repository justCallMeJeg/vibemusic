import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlaybackControlsProps {
  isPlaying: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  onToggleShuffle: () => void;
  onPrevious: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onToggleRepeat: () => void;
}

export const PlaybackControls = memo(function PlaybackControls({
  isPlaying,
  shuffle,
  repeat,
  onToggleShuffle,
  onPrevious,
  onPlayPause,
  onNext,
  onToggleRepeat,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={onToggleShuffle}
            className={shuffle ? "text-primary" : ""}
            aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
          >
            <Shuffle size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Shuffle {shuffle ? "On" : "Off"}</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={onPrevious}
            aria-label="Previous track"
          >
            <SkipBack size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Previous</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button
            size="icon-lg"
            variant="ghost"
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause /> : <Play />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={onNext} aria-label="Next track">
            <SkipForward size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Next</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={onToggleRepeat}
            className={repeat !== "off" ? "text-primary" : ""}
            aria-label={
              repeat === "off"
                ? "Repeat off"
                : repeat === "all"
                  ? "Repeat all"
                  : "Repeat one"
            }
          >
            {repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Repeat {repeat === "off" ? "Off" : repeat === "all" ? "All" : "One"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
});
