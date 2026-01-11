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
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "./button";
import { Slider } from "./slider";
import {
  useAudioStore,
  useCurrentTrack,
  usePlayerStatus,
  useVolume,
  useRepeat,
  useShuffle,
  useQueueOpen,
  usePosition,
  useDuration,
} from "@/stores/audio-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

import placeholderArt from "@/assets/placeholder-art.jpg";

export default function MusicControler() {
  // Use atomic selectors for minimal re-renders
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const volume = useVolume();
  const repeat = useRepeat();
  const shuffle = useShuffle();
  const isQueueOpen = useQueueOpen();
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
  const setDraggingSlider = useAudioStore((s) => s.setDraggingSlider);

  const isPlaying = status === "playing";
  const [sliderValue, setSliderValue] = useState([0]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

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

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      if (currentTrack) {
        resume();
      }
    }
  };

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

  const handleVolume = (value: number[]) => {
    setVolume(value[0]);
  };

  if (isCompact) {
    return (
      <div className="bg-neutral-900/75 backdrop-blur-md rounded-lg outline outline-gray-850 w-94 ml-auto h-auto flex flex-col items-center gap-5 p-3 pr-4 transition-all duration-500 pointer-events-auto">
        <div id="track" className="flex items-center gap-3 w-full">
          {currentTrack ? (
            <img
              className="aspect-square h-12 rounded-md object-cover bg-neutral-800"
              src={
                currentTrack.artwork_path
                  ? convertFileSrc(currentTrack.artwork_path)
                  : placeholderArt
              }
              alt={currentTrack.title}
            />
          ) : (
            <div className="aspect-square h-12 rounded-md bg-gray-800" />
          )}

          <div className="flex flex-col w-full">
            <p className="text-white text-sm font-bold line-clamp-1">
              {currentTrack?.title || ""}
            </p>
            <p className="text-gray-400 text-xs font-normal line-clamp-1">
              {currentTrack?.artist || "Unknown Artist"}
            </p>
          </div>
        </div>
        <div className="flex items-center w-full">
          <div className="flex items-center gap-1 w-full justify-between">
            <Button
              variant="ghost"
              onClick={toggleShuffle}
              className={shuffle ? "text-purple-500 hover:text-purple-400" : ""}
            >
              <Shuffle size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => previous()}>
              <SkipBack size={18} />
            </Button>
            <Button
              size={"icon"}
              variant="ghost"
              onClick={handlePlayPause}
              className="h-9 w-9"
            >
              {isPlaying ? (
                <Pause className="fill-white h-5 w-5" />
              ) : (
                <Play className="fill-white ml-0.5 h-5 w-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => next()}>
              <SkipForward size={18} />
            </Button>
            <Button
              variant="ghost"
              onClick={toggleRepeat}
              className={
                repeat !== "off" ? "text-purple-500 hover:text-purple-400" : ""
              }
            >
              {repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </Button>
          </div>

          <div className="h-8 w-px bg-white/10 mx-1" />

          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {volume === 0 ? (
              <VolumeX size={18} className="text-gray-400" />
            ) : (
              <Volume2 size={18} />
            )}
          </Button>
          <Button
            id="queue-menu-button"
            variant="ghost"
            onClick={toggleQueue}
            className={
              isQueueOpen ? "text-purple-500 hover:text-purple-400" : ""
            }
          >
            <Logs size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCompact(false)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            <Maximize2 size={18} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/75 backdrop-blur-md rounded-lg outline outline-gray-850 w-full ml-auto h-auto grid grid-cols-3 grid-rows-1 gap-4 p-4 transition-all duration-500 pointer-events-auto">
      <div id="track" className="flex items-center gap-4">
        {currentTrack ? (
          <>
            <img
              className="aspect-square h-24 rounded-lg object-cover bg-neutral-800"
              src={
                currentTrack.artwork_path
                  ? convertFileSrc(currentTrack.artwork_path)
                  : placeholderArt
              }
              alt={currentTrack.title}
            />
            <div className="flex flex-col">
              <p className="text-white text-base font-bold line-clamp-1">
                {currentTrack.title}
              </p>
              <p className="text-gray-400 text-xs font-normal line-clamp-1">
                {currentTrack.artist || "Unknown Artist"}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="aspect-square h-24 rounded-lg bg-gray-800" />
            <div className="flex flex-col gap-1 w-24">
              <div className="h-4 bg-gray-800 rounded w-full" />
              <div className="h-3 bg-gray-800 rounded w-2/3" />
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
          <Button
            variant="ghost"
            onClick={toggleShuffle}
            className={shuffle ? "text-purple-500 hover:text-purple-400" : ""}
          >
            <Shuffle size={20} />
          </Button>
          <Button variant="ghost" onClick={() => previous()}>
            <SkipBack size={20} />
          </Button>
          <Button size={"icon-lg"} variant="ghost" onClick={handlePlayPause}>
            {isPlaying ? (
              <Pause className="fill-white" />
            ) : (
              <Play className="fill-white ml-0.5" />
            )}
          </Button>
          <Button variant="ghost" onClick={() => next()}>
            <SkipForward size={20} />
          </Button>
          <Button
            variant="ghost"
            onClick={toggleRepeat}
            className={
              repeat !== "off" ? "text-purple-500 hover:text-purple-400" : ""
            }
          >
            {repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </Button>
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
      <div id="actions" className=" flex items-center gap-2 justify-end">
        {/* Volume */}
        <div className="flex items-center gap-2 w-32">
          <Button variant="ghost" onClick={toggleMute}>
            {volume === 0 ? (
              <VolumeX size={20} className="text-gray-400" />
            ) : volume < 0.5 ? (
              <Volume1 size={20} />
            ) : (
              <Volume2 size={20} />
            )}
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolume}
          />
        </div>
        {/* Queue Menu Toggle */}
        <Button
          id="queue-menu-button"
          variant="ghost"
          onClick={toggleQueue}
          className={isQueueOpen ? "text-purple-500 hover:text-purple-400" : ""}
        >
          <Logs size={20} />
        </Button>

        {/* Compact Mode Toggle */}
        <Button
          variant="ghost"
          onClick={() => setIsCompact(true)}
          className="text-gray-400 hover:text-white"
        >
          <Minimize2 size={20} />
        </Button>
      </div>
    </div>
  );
}
