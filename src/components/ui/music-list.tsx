import { memo } from "react";
import { Play, Pause } from "lucide-react";
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
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "./context-menu";
import { usePlaylistStore } from "@/stores/playlist-store";

import placeholderArt from "@/assets/placeholder-art.jpg";

// Pure function - hoisted outside component to avoid recreation
const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

interface MusicListItemProps {
  track: Track;
  context?: Track[];
}

const MusicListItem = memo(function MusicListItem({
  track,
}: MusicListItemProps) {
  // Use atomic selectors for minimal re-renders
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();

  // Playlist store - playlists fetched once in App.tsx
  const playlists = usePlaylistStore((s) => s.playlists);
  const addToPlaylist = usePlaylistStore((s) => s.addToPlaylist);

  // Get actions directly from store (stable references)
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const resume = useAudioStore((s) => s.resume);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const isCurrentTrack = currentTrack?.id === track.id;
  const isPlaying = isCurrentTrack && status === "playing";

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentTrack) {
      if (status === "playing") {
        pause();
      } else {
        resume();
      }
    } else {
      play(track);
    }
  };

  const handleContextMenuPlay = () => {
    if (isCurrentTrack) {
      if (status === "playing") pause();
      else resume();
    } else {
      play(track);
    }
  };

  const artworkSrc = track.artwork_path
    ? convertFileSrc(track.artwork_path)
    : placeholderArt;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={handlePlayClick}
          className={`flex w-full h-min rounded-lg px-4 py-2 hover:outline hover:outline-gray-850 hover:bg-white/3 cursor-pointer group transition-colors ${
            isCurrentTrack ? "bg-white/10 outline outline-gray-800" : ""
          }`}
        >
          <div className="flex h-min w-full gap-4">
            <div className="relative">
              <img
                className="aspect-square h-10 rounded-lg object-cover bg-neutral-800"
                src={artworkSrc}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = placeholderArt;
                }}
                alt="Album Art"
              />
              {/* Overlay: Visible if playing, paused (current), or on hover */}
              <div
                className={`absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg transition-opacity ${
                  isCurrentTrack
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {isPlaying ? (
                  <Pause size={16} className="fill-white text-white" />
                ) : (
                  <Play size={16} className="fill-white text-white" />
                )}
              </div>
            </div>

            <div className="flex w-full items-center justify-between">
              <div className="flex flex-col h-min w-full">
                <p className="text-white text-base font-bold line-clamp-1">
                  {track.title}
                </p>
                <p className="text-gray-400 text-xs font-normal line-clamp-1">
                  {track.artist || "Unknown Artist"}
                </p>
              </div>
              <div className="flex gap-1 h-min items-center shrink-0 w-16 justify-end">
                <p className="text-gray-400 text-xs font-normal tabular-nums text-right w-full">
                  {formatDuration(track.duration_ms)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={handleContextMenuPlay}>
          {isCurrentTrack && status === "playing" ? "Pause" : "Play"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => playNext(track)}>
          Play Next
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => addToQueue(track)}>
          Add to Queue
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>Add to Playlist</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {playlists.map((playlist) => (
              <ContextMenuItem
                key={playlist.id}
                onSelect={() => addToPlaylist(playlist.id, track.id)}
              >
                {playlist.name}
              </ContextMenuItem>
            ))}
            {playlists.length === 0 && (
              <div className="px-2 py-1 text-xs text-gray-500">
                No playlists
              </div>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
});

export default MusicListItem;
