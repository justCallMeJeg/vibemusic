import { memo } from "react";
import { Play, Shuffle, ListPlus } from "lucide-react";
import { Artist, getArtistTracks } from "@/lib/api";
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
import { logger } from "@/lib/logger";
import { ScrollingText } from "@/components/shared/scrolling-text";

import placeholderArt from "@/assets/placeholder-art.png";

interface ArtistCardProps {
  artist: Artist;
}

const ArtistCard = memo(function ArtistCard({ artist }: ArtistCardProps) {
  const openArtistDetail = useNavigationStore((s) => s.openArtistDetail);
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const artworkSrc = artist.artwork_path
    ? convertFileSrc(artist.artwork_path)
    : placeholderArt;

  const handlePlay = async (shuffle = false) => {
    try {
      const tracks = await getArtistTracks(artist.id);
      if (tracks.length === 0) {
        toast.error("No tracks found for this artist");
        return;
      }

      let queue = tracks;
      if (shuffle) {
        queue = [...tracks].sort(() => Math.random() - 0.5);
      }

      play(queue[0], queue);
    } catch (e) {
      logger.error("Failed to play artist", e);
    }
  };

  const handlePlayNext = async () => {
    try {
      const tracks = await getArtistTracks(artist.id);
      if (tracks.length === 0) return;

      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing artist next");
    } catch (e) {
      logger.error("Failed to play artist next", e);
      toast.error("Failed to play next");
    }
  };

  const handleAddToQueue = async () => {
    try {
      const tracks = await getArtistTracks(artist.id);
      if (tracks.length === 0) return;

      tracks.forEach((track) => addToQueue(track));
      toast.success("Added artist to queue");
    } catch (e) {
      logger.error("Failed to add artist to queue", e);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handlePlay(true); // Default to shuffle for artists
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={() => openArtistDetail(artist.id)}
          className="flex flex-col rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors group gap-3"
        >
          {/* Artwork with play overlay */}
          <div className="aspect-square w-full rounded-full bg-card overflow-hidden relative">
            <img
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              src={artworkSrc}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = placeholderArt;
              }}
              alt={artist.name}
            />
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                onClick={handlePlayClick}
              >
                <Play fill="currentColor" className="ml-1" size={24} />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0">
            <ScrollingText className="font-semibold text-foreground hover:[&_span]:underline cursor-pointer w-full text-left">
              {artist.name}
            </ScrollingText>
            <p className="text-xs text-muted-foreground mt-1">
              {artist.album_count}{" "}
              {artist.album_count === 1 ? "Album" : "Albums"} •{" "}
              {artist.track_count} {artist.track_count === 1 ? "Song" : "Songs"}
            </p>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onSelect={() => handlePlay(false)}>
          <Play className="mr-2 h-4 w-4" /> Play All
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => handlePlay(true)}>
          <Shuffle className="mr-2 h-4 w-4" /> Shuffle All
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

export default ArtistCard;
