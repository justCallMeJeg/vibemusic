import { memo } from "react";
import { Play, Shuffle, ListPlus } from "lucide-react";
import { Album, getAlbumTracks } from "@/lib/api";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAudioStore } from "@/stores/audio-store";
import { useNavigationStore } from "@/stores/navigation-store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";

import placeholderArt from "@/assets/placeholder-art.png";

interface AlbumCardProps {
  album: Album;
  /** Optional: different card sizes */
  size?: "default" | "compact";
}

const formatDuration = (ms: number) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};

const AlbumCard = memo(function AlbumCard({
  album,
  size = "default",
}: AlbumCardProps) {
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const artworkSrc = album.artwork_path
    ? convertFileSrc(album.artwork_path)
    : placeholderArt;

  const handlePlay = async (shuffle = false) => {
    try {
      const tracks = await getAlbumTracks(album.id);
      if (tracks.length === 0) {
        toast.error("Album is empty");
        return;
      }

      let queue = tracks;
      if (shuffle) {
        queue = [...tracks].sort(() => Math.random() - 0.5);
      }

      play(queue[0], queue);
    } catch (e) {
      console.error("Failed to play album:", e);
      toast.error("Failed to play album");
    }
  };

  const handlePlayNext = async () => {
    try {
      const tracks = await getAlbumTracks(album.id);
      if (tracks.length === 0) return;

      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing album next");
    } catch (e) {
      console.error("Failed to play album next:", e);
      toast.error("Failed to play next");
    }
  };

  const handleAddToQueue = async () => {
    try {
      const tracks = await getAlbumTracks(album.id);
      if (tracks.length === 0) return;

      tracks.forEach((track) => addToQueue(track));
      toast.success("Added album to queue");
    } catch (e) {
      console.error("Failed to add album to queue:", e);
      toast.error("Failed to add to queue");
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handlePlay(false);
  };

  const isCompact = size === "compact";

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={() => openAlbumDetail(album.id)}
          className={`flex flex-col cursor-pointer transition-colors group ${
            isCompact
              ? "w-40 shrink-0 space-y-3"
              : "rounded-lg p-3 hover:bg-white/5"
          }`}
        >
          {/* Artwork with play overlay */}
          <div
            className={`aspect-square w-full bg-neutral-800 overflow-hidden relative ${
              isCompact ? "rounded-xl" : "rounded-lg mb-3"
            }`}
          >
            <img
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              src={artworkSrc}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = placeholderArt;
              }}
              alt={album.title}
            />
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                onClick={handlePlayClick}
              >
                <Play fill="currentColor" className="ml-1" size={24} />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0">
            <p
              className="text-white text-sm font-bold line-clamp-1"
              title={album.title}
            >
              {album.title}
            </p>
            <p className="text-gray-400 text-xs line-clamp-1">
              {album.artist_name || "Unknown Artist"}
            </p>
            {!isCompact && (
              <p className="text-gray-500 text-xs mt-1">
                {album.track_count} tracks •{" "}
                {formatDuration(album.total_duration_ms)}
              </p>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onSelect={() => handlePlay(false)}>
          <Play className="mr-2 h-4 w-4" /> Play
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => handlePlay(true)}>
          <Shuffle className="mr-2 h-4 w-4" /> Shuffle
        </ContextMenuItem>
        <ContextMenuItem onSelect={handlePlayNext}>
          <ListPlus className="mr-2 h-4 w-4" /> Play Next
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleAddToQueue}>
          <ListPlus className="mr-2 h-4 w-4" /> Add to Queue
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

export default AlbumCard;
