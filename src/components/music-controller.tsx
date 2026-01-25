import {
  Logs,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  SquareArrowOutUpRight,
  Info,
  Mic2,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "./ui/slider";
import {
  useAudioStore,
  useCurrentTrack,
  usePlayerStatus,
  useVolume,
  useRepeat,
  useShuffle,
  useSidePanel,
  usePosition,
  useDuration,
} from "@/stores/audio-store";

import { useNavigationStore } from "@/stores/navigation-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useState, useCallback } from "react";
import { logger } from "@/lib/logger";

import placeholderArt from "@/assets/placeholder-art.png";
import { ScrollingText } from "./shared/scrolling-text";
import { ArtistLinks } from "./shared/artist-links";

export default function MusicControler() {
  // Use atomic selectors for minimal re-renders
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const volume = useVolume();

  const repeat = useRepeat();
  const shuffle = useShuffle();
  const sidePanel = useSidePanel();
  const position = usePosition();
  const duration = useDuration();

  // Get actions directly (stable references)
  const pause = useAudioStore((s) => s.pause);
  const resume = useAudioStore((s) => s.resume);
  const next = useAudioStore((s) => s.next);
  const previous = useAudioStore((s) => s.previous);
  const seek = useAudioStore((s) => s.seek);
  const setVolume = useAudioStore((s) => s.setVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const toggleShuffle = useAudioStore((s) => s.toggleShuffle);
  const toggleRepeat = useAudioStore((s) => s.toggleRepeat);
  const toggleQueue = useAudioStore((s) => s.toggleQueue);
  const setSidePanel = useAudioStore((s) => s.setSidePanel);
  const setDraggingSlider = useAudioStore((s) => s.setDraggingSlider);
  const toggleMiniPlayer = useNavigationStore((s) => s.toggleMiniPlayer);

  const isPlaying = status === "playing";
  const [sliderValue, setSliderValue] = useState([0]);
  const [isDragging, setIsDragging] = useState(false);

  // Sync slider with audio position when not dragging
  useEffect(() => {
    if (!isDragging) {
      setSliderValue([position]);
    }
  }, [position, isDragging]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      if (currentTrack) {
        resume();
      }
    }
  }, [isPlaying, pause, currentTrack, resume]);

  const handleSeekChange = useCallback(
    (value: number[]) => {
      setIsDragging(true);
      setDraggingSlider(true);
      setSliderValue(value);
    },
    [setDraggingSlider],
  );

  const handleSeekCommit = useCallback(
    (value: number[]) => {
      seek(value[0]);
      setIsDragging(false);
      setDraggingSlider(false);
    },
    [seek, setDraggingSlider],
  );

  const handleVolume = useCallback(
    (value: number[]) => {
      setVolume(value[0]);
    },
    [setVolume],
  );

  return (
    <div className="bg-popover/75 backdrop-blur-md rounded-lg outline outline-border w-full ml-auto h-auto grid grid-cols-3 grid-rows-1 gap-4 p-4 transition-all duration-500 pointer-events-auto">
      <div id="track" className="flex items-center gap-4">
        {currentTrack ? (
          <>
            <img
              className="aspect-square h-24 rounded-lg object-cover bg-card"
              src={
                currentTrack.artwork_path
                  ? convertFileSrc(currentTrack.artwork_path)
                  : placeholderArt
              }
              alt={currentTrack.title}
              width={96}
              height={96}
              decoding="async"
            />
            <div className="flex flex-col min-w-0 w-full pr-4">
              <ScrollingText className="text-foreground text-base font-bold w-full">
                {currentTrack.title}
              </ScrollingText>
              <div className="text-muted-foreground text-xs font-normal line-clamp-1">
                <ArtistLinks
                  names={currentTrack.artist_names}
                  ids={currentTrack.artist_ids}
                  fallbackName={currentTrack.artist}
                  fallbackId={currentTrack.artist_id}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="aspect-square h-24 rounded-lg bg-card" />
            <div className="flex flex-col gap-1 w-24">
              <div className="h-4 bg-card rounded w-full" />
              <div className="h-3 bg-card rounded w-2/3" />
            </div>
          </>
        )}
      </div>
      <div
        id="controls"
        className=" flex flex-col items-center justify-center gap-2"
      >
        {/* Controls */}
        <div className=" flex items-center gap-2">
          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={toggleShuffle}
                className={
                  shuffle ? "text-purple-500 hover:text-purple-400" : ""
                }
              >
                <Shuffle size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Shuffle {shuffle ? "On" : "Off"}</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={() => previous()}>
                <SkipBack size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Button
                size={"icon-lg"}
                variant="ghost"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="fill-white" />
                ) : (
                  <Play className="fill-white ml-0.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={() => next()}>
                <SkipForward size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={toggleRepeat}
                className={
                  repeat !== "off"
                    ? "text-purple-500 hover:text-purple-400"
                    : ""
                }
              >
                {repeat === "one" ? (
                  <Repeat1 size={20} />
                ) : (
                  <Repeat size={20} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Repeat{" "}
              {repeat === "off" ? "Off" : repeat === "all" ? "All" : "One"}
            </TooltipContent>
          </Tooltip>
        </div>
        {/* Seeker */}
        <div className=" flex items-center gap-4 w-full">
          <p className="text-white text-xs font-normal w-10 text-right">
            {formatDuration(sliderValue[0])}
          </p>
          <Slider
            value={sliderValue}
            max={duration || 100}
            step={100}
            onValueChange={handleSeekChange}
            onValueCommit={handleSeekCommit}
          />
          <p className="text-white text-xs font-normal w-10">
            {formatDuration(duration)}
          </p>
        </div>
      </div>
      <div id="actions" className="flex items-center gap-2 justify-end">
        {/* Volume */}
        <div className="flex items-center gap-2 w-36">
          {/* Mute Button */}
          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={toggleMute}>
                {volume === 0 ? (
                  <VolumeX size={20} className="text-gray-400" />
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
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolume}
          />
        </div>

        <div className="flex items-center">
          {/* Queue Menu Toggle */}
          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Button
                id="queue-menu-button"
                variant="ghost"
                onClick={toggleQueue}
                className={
                  sidePanel === "queue"
                    ? "text-purple-500 hover:text-purple-400"
                    : ""
                }
              >
                <Logs size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Queue</TooltipContent>
          </Tooltip>

          {/* Lyrics Menu Toggle */}
          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Button
                id="lyrics-button"
                variant="ghost"
                onClick={() =>
                  setSidePanel(sidePanel === "lyrics" ? "none" : "lyrics")
                }
                className={
                  sidePanel === "lyrics"
                    ? "text-purple-500 hover:text-purple-400"
                    : ""
                }
              >
                <Mic2 size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lyrics</TooltipContent>
          </Tooltip>

          {/* Info Toggle */}
          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Button
                id="info-button"
                variant="ghost"
                onClick={() =>
                  setSidePanel(
                    sidePanel === "track-details" ? "none" : "track-details",
                  )
                }
                className={
                  sidePanel === "track-details"
                    ? "text-purple-500 hover:text-purple-400"
                    : ""
                }
              >
                <Info size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Track Details</TooltipContent>
          </Tooltip>
        </div>

        {/* Compact Mode Toggle */}
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => {
                logger.debug("Toggle Mini Player Clicked");
                toggleMiniPlayer();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <SquareArrowOutUpRight size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mini Player</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
