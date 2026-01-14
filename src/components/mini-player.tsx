import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Maximize2,
  Volume2,
  VolumeX,
  GripHorizontal,
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  useAudioStore,
  useCurrentTrack,
  usePlayerStatus,
  useVolume,
  useRepeat,
  useShuffle,
  usePosition,
  useDuration,
} from "@/stores/audio-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import placeholderArt from "@/assets/placeholder-art.png";
import { useSettingsStore } from "@/stores/settings-store";
import { useNavigationStore } from "@/stores/navigation-store";

// --- HELPER COMPONENTS ---

function MiniPlayerProgressBar({
  sliderValue,
  duration,
  onSeekChange,
  onSeekCommit,
}: {
  sliderValue: number[];
  duration: number;
  onSeekChange: (val: number[]) => void;
  onSeekCommit: (val: number[]) => void;
}) {
  return (
    <div className="w-full px-1">
      <Slider
        value={sliderValue}
        max={duration || 100}
        step={100}
        onValueChange={onSeekChange}
        onValueCommit={onSeekCommit}
        className="h-2 cursor-pointer"
      />
    </div>
  );
}

function MiniPlayerControls({
  size = "normal",
  showVolume = true,
  showMaximize = true,
  className = "justify-center gap-2",
}: {
  size?: "small" | "normal";
  showVolume?: boolean;
  showMaximize?: boolean;
  className?: string;
}) {
  const status = usePlayerStatus();
  const repeat = useRepeat();
  const shuffle = useShuffle();
  const volume = useVolume();

  // Static actions don't need to be reactive
  const {
    pause,
    resume,
    next,
    previous,
    toggleShuffle,
    toggleRepeat,
    setVolume,
    toggleMute,
  } = useAudioStore.getState();

  const toggleMiniPlayer = useNavigationStore((s) => s.toggleMiniPlayer);
  const isPlaying = status === "playing";

  const handlePlayPause = () => {
    if (isPlaying) pause();
    else resume();
  };

  return (
    <div className={`flex items-center w-full ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleShuffle}
        className={shuffle ? "text-primary" : "text-muted-foreground"}
      >
        <Shuffle size={size === "small" ? 16 : 20} />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => previous()}>
        <SkipBack size={size === "small" ? 16 : 20} />
      </Button>
      <Button variant="ghost" size="icon" onClick={handlePlayPause}>
        {isPlaying ? (
          <Pause
            size={size === "small" ? 20 : 24}
            className="fill-foreground"
          />
        ) : (
          <Play
            size={size === "small" ? 20 : 24}
            className="fill-foreground ml-1"
          />
        )}
      </Button>
      <Button variant="ghost" size="icon" onClick={() => next()}>
        <SkipForward size={size === "small" ? 16 : 20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleRepeat}
        className={repeat !== "off" ? "text-primary" : "text-muted-foreground"}
      >
        {repeat === "one" ? (
          <Repeat1 size={size === "small" ? 16 : 20} />
        ) : (
          <Repeat size={size === "small" ? 16 : 20} />
        )}
      </Button>

      {showVolume && (
        <div className="group relative flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground"
          >
            {volume === 0 ? (
              <VolumeX size={size === "small" ? 16 : 20} />
            ) : (
              <Volume2 size={size === "small" ? 16 : 20} />
            )}
          </Button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover p-2 rounded-lg border border-border w-8 h-24">
            <Slider
              orientation="vertical"
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={(v) => setVolume(v[0])}
              className="h-full"
            />
          </div>
        </div>
      )}

      {showMaximize && (
        <Button variant="ghost" size="icon" onClick={() => toggleMiniPlayer()}>
          <Maximize2
            size={size === "small" ? 16 : 20}
            className="text-muted-foreground hover:text-foreground"
          />
        </Button>
      )}
    </div>
  );
}

export default function MiniPlayer() {
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const position = usePosition();
  const duration = useDuration();
  const { miniPlayerStyle } = useSettingsStore();
  const toggleMiniPlayer = useNavigationStore((s) => s.toggleMiniPlayer);

  // Use hook for actions to ensure stability
  const { seek, setDraggingSlider, pause, resume } = useAudioStore.getState();

  const isPlaying = status === "playing";
  const [sliderValue, setSliderValue] = useState([0]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setSliderValue([position]);
    }
  }, [position, isDragging]);

  const handleSeekChange = (value: number[]) => {
    setIsDragging(true);
    setDraggingSlider(true);
    setSliderValue(value);
  };

  const handleSeekCommit = (value: number[]) => {
    seek(value[0]);
    setIsDragging(false);
    setDraggingSlider(false);
  };

  const handlePlayPause = () => {
    if (isPlaying) pause();
    else resume();
  };

  // Shared Art Component
  const Art = ({ className }: { className: string }) => (
    <img
      src={
        currentTrack?.artwork_path
          ? convertFileSrc(currentTrack.artwork_path)
          : placeholderArt
      }
      className={className}
      alt="Art"
    />
  );

  // Drag Handle Component
  const DragHandle = ({
    className,
    iconSize = 16,
  }: {
    className?: string;
    iconSize?: number;
  }) => (
    <div
      data-tauri-drag-region
      className={`absolute z-50 flex items-center justify-center p-1 cursor-grab active:cursor-grabbing hover:bg-accent rounded-full transition-colors ${className}`}
    >
      <GripHorizontal
        size={iconSize}
        className="text-muted-foreground pointer-events-none"
      />
    </div>
  );

  if (miniPlayerStyle === "bar") {
    return (
      <div className="w-full h-full bg-background flex items-center px-3 gap-3 overflow-hidden border border-border select-none relative group">
        <DragHandle className="top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100" />
        <Art className="h-12 w-12 rounded-sm object-cover bg-muted shrink-0" />

        <div className="flex flex-col flex-1 min-w-0 justify-center">
          <p className="text-foreground font-bold truncate text-sm leading-tight">
            {currentTrack?.title || "No Track"}
          </p>
          <p className="text-muted-foreground text-xs truncate leading-tight">
            {currentTrack?.artist || "Unknown Artist"}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause size={18} className="fill-foreground" />
            ) : (
              <Play size={18} className="fill-foreground ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleMiniPlayer()}
          >
            <Maximize2
              size={16}
              className="text-muted-foreground hover:text-foreground"
            />
          </Button>
        </div>
      </div>
    );
  }

  if (miniPlayerStyle === "wide") {
    return (
      <div className="w-full h-full bg-background flex flex-col px-4 py-3 gap-6 overflow-hidden border border-border select-none relative group">
        <DragHandle
          className="top-2 right-12 opacity-0 group-hover:opacity-100 h-8 w-8"
          iconSize={18}
        />

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => toggleMiniPlayer()}
        >
          <Maximize2 size={18} />
        </Button>

        {/* Top: Art + Info */}
        <div className="flex items-center gap-3 min-h-0 h-full">
          <Art className="aspect-square h-full rounded-md object-cover bg-muted shrink-0" />
          <div className="flex flex-col min-w-0 justify-center">
            <p className="text-foreground font-bold text-md leading-tight truncate">
              {currentTrack?.title || "No Playing Track"}
            </p>
            <p className="text-muted-foreground text-sm truncate">
              {currentTrack?.artist || "Unknown Artist"}
            </p>
          </div>
        </div>

        {/* Bottom: Progress + Controls */}
        <div className="flex flex-col gap-1 shrink-0 ">
          <MiniPlayerProgressBar
            sliderValue={sliderValue}
            duration={duration}
            onSeekChange={handleSeekChange}
            onSeekCommit={handleSeekCommit}
          />
          <MiniPlayerControls
            size="small"
            showVolume={false}
            showMaximize={false}
          />
        </div>
      </div>
    );
  }

  // DEFAULT: Square
  return (
    <div className="w-full h-full bg-background flex flex-col p-3 gap-3 overflow-hidden border border-border select-none relative group">
      <DragHandle className="top-2 right-2 opacity-0 group-hover:opacity-100 bg-background/50" />
      <div className="flex-1 w-full min-h-0 relative rounded-lg overflow-hidden bg-muted group/art">
        <Art className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-110" />

        {/* Hover Controls Overlay */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] opacity-0 group-hover/art:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-4">
          <div className="w-full pb-6">
            <MiniPlayerControls
              showMaximize={false}
              showVolume={false}
              size="normal"
            />
          </div>
          <div className="absolute bottom-0 left-0 w-full p-3">
            <MiniPlayerProgressBar
              sliderValue={sliderValue}
              duration={duration}
              onSeekChange={handleSeekChange}
              onSeekCommit={handleSeekCommit}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-foreground font-bold text-base truncate leading-tight">
            {currentTrack?.title || "No Track"}
          </p>
          <p className="text-muted-foreground text-sm truncate leading-tight">
            {currentTrack?.artist || "Unknown Artist"}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => toggleMiniPlayer()}
        >
          <Maximize2 size={20} />
        </Button>
      </div>
    </div>
  );
}
