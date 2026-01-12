import { Clock, Play } from "lucide-react";
import { Track } from "@/lib/api";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  useAudioStore,
  useCurrentTrack,
  usePlayerStatus,
} from "@/stores/audio-store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../ui/context-menu";

import placeholderArt from "@/assets/placeholder-art.png";

interface MusicCardProps {
  track: Track;
  context?: Track[];
}

function MusicCard({ track, context }: MusicCardProps) {
  // Use atomic selectors for minimal re-renders
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();

  // Get actions directly from store (stable references)
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const isPlaying = currentTrack?.id === track.id && status === "playing";

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const artworkSrc = track.artwork_path
    ? convertFileSrc(track.artwork_path)
    : placeholderArt;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={() => play(track, context)}
          className={`flex flex-col w-min h-min rounded-lg px-4 py-2 hover:outline hover:outline-gray-850 hover:bg-white/3 cursor-pointer group transition-colors ${
            isPlaying ? "bg-white/10 outline outline-gray-800" : ""
          }`}
        >
          <div className="flex flex-col h-min w-min gap-4">
            <div className="relative">
              <img
                className="aspect-square h-40 rounded-lg object-cover bg-neutral-800"
                src={artworkSrc}
                onError={(e) => {
                  console.error("Failed to load image:", artworkSrc);
                  e.currentTarget.src = placeholderArt;
                }}
                alt="Album Art"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                  <Play size={16} className="fill-white text-white" />
                </div>
              )}
            </div>

            <div className="flex w-min items-center justify-between">
              <div className="flex flex-col h-min w-min">
                <p className="text-white text-base font-bold line-clamp-1">
                  {track.title}
                </p>
                <p className="text-gray-400 text-xs font-normal line-clamp-1">
                  {track.artist || "Unknown Artist"}
                </p>
              </div>
              <div className="flex gap-1 h-min items-center shrink-0">
                <Clock color="gray" size={12} />
                <p className="text-gray-400 text-xs font-normal">
                  {formatDuration(track.duration_ms)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => play(track, context)}>
          Play
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => playNext(track)}>
          Play Next
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => addToQueue(track)}>
          Add to Queue
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default MusicCard;
