import { memo } from "react";
import { Play } from "lucide-react";
import { Album, getAlbumTracks } from "@/lib/api";
import { useAudioStore } from "@/stores/audio-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { MediaContextMenu } from "@/components/shared/media-context-menu";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ScrollingText } from "@/components/shared/scrolling-text";
import { ArtworkImage } from "@/components/shared/artwork-image";

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
      logger.error("Failed to play album", e);
    }
  };

  const handlePlayNext = async () => {
    try {
      const tracks = await getAlbumTracks(album.id);
      if (tracks.length === 0) return;

      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing album next");
    } catch (e) {
      logger.error("Failed to play album next", e);
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
      logger.error("Failed to add album to queue", e);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handlePlay(false);
  };

  const isCompact = size === "compact";

  return (
    <MediaContextMenu
      onPlay={() => handlePlay(false)}
      onShuffle={() => handlePlay(true)}
      onPlayNext={handlePlayNext}
      onAddToQueue={handleAddToQueue}
    >
      <div
        onClick={() => openAlbumDetail(album.id)}
        className={`flex flex-col cursor-pointer transition-colors group ${
          isCompact
            ? "w-40 shrink-0 space-y-3"
            : "rounded-lg p-3 hover:bg-accent"
        }`}
      >
        {/* Artwork with play overlay */}
        <div
          className={`aspect-square w-full bg-card overflow-hidden relative ${
            isCompact ? "rounded-xl" : "rounded-lg mb-3"
          }`}
        >
          <ArtworkImage
            src={album.artwork_path || undefined}
            alt={album.title}
            className="group-hover:scale-[1.02] transition-transform duration-300"
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
          <ScrollingText className="text-foreground text-sm font-bold w-full">
            {album.title}
          </ScrollingText>
          <p className="text-muted-foreground text-xs line-clamp-1">
            {album.artist_name || "Unknown Artist"}
          </p>
          {!isCompact && (
            <p className="text-muted-foreground text-xs mt-1">
              {album.track_count} tracks •{" "}
              {formatDuration(album.total_duration_ms)}
            </p>
          )}
        </div>
      </div>
    </MediaContextMenu>
  );
});

export default AlbumCard;
