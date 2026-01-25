import { memo } from "react";
import { Album, getAlbumTracks } from "@/lib/api";
import { useAudioStore } from "@/stores/audio-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { EntityCard } from "@/components/shared/entity-card";

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

  return (
    <EntityCard
      title={album.title}
      subtitle={album.artist_name || "Unknown Artist"}
      tertiaryText={
        size === "default"
          ? `${album.track_count} tracks • ${formatDuration(
              album.total_duration_ms,
            )}`
          : undefined
      }
      artworkSrc={album.artwork_path || undefined}
      variant={size === "compact" ? "compact" : "portrait"}
      onClick={() => openAlbumDetail(album.id)}
      onPlay={() => handlePlay(false)}
      menuActions={{
        onPlay: () => handlePlay(false),
        onShuffle: () => handlePlay(true),
        onPlayNext: handlePlayNext,
        onAddToQueue: handleAddToQueue,
      }}
    />
  );
});

export default AlbumCard;
