import { memo } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
}

export const VolumeControl = memo(function VolumeControl({ volume, onVolumeChange, onToggleMute }: VolumeControlProps) {
  return (
    <div className="flex items-center gap-2 w-36">
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={onToggleMute} aria-label={volume === 0 ? "Unmute" : "Mute"}>
            {volume === 0 ? (
              <VolumeX size={20} className="text-muted-foreground" />
            ) : volume < 0.5 ? (
              <Volume1 size={20} />
            ) : (
              <Volume2 size={20} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{volume === 0 ? "Unmute" : "Mute"}</TooltipContent>
      </Tooltip>
      <Slider
        aria-label="Volume"
        value={[volume]}
        max={1}
        step={0.01}
        onValueChange={onVolumeChange}
      />
    </div>
  );
});
