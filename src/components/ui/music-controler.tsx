import {
  Logs,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { Button } from "./button";
import { Slider } from "./slider";
import { useAudio } from "@/context/audio-context";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

import placeholderArt from "@/assets/placeholder-art.jpg";

export default function MusicControler() {
  const {
    currentTrack,
    status,
    position,
    duration,
    volume,
    shuffle,
    repeat,
    pause,
    resume,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    toggleQueue,
    isQueueOpen,
  } = useAudio();

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
    setSliderValue(value);
  };

  const handleSeekCommit = (value: number[]) => {
    seek(value[0]);
    setIsDragging(false);
  };

  const handleVolume = (value: number[]) => {
    setVolume(value[0]);
  };

  return (
    <div className="rounded-lg outline outline-gray-850 w-full h-auto grid grid-cols-3 grid-rows-1 gap-4 p-4">
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
            <Repeat size={20} />
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
          <Button variant="ghost">
            <Volume2 size={20} />
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolume}
          />
        </div>
        {/* Mute */}
        <Button
          id="queue-menu-button"
          variant="ghost"
          onClick={toggleQueue}
          className={isQueueOpen ? "text-purple-500 hover:text-purple-400" : ""}
        >
          <Logs size={20} />
        </Button>
      </div>
    </div>
  );
}
