import { useEffect, useState } from "react";
import { getAlbumById, getAlbumTracks, Album, Track } from "@/lib/api";
import { useNavigationStore, useDetailView } from "@/stores/navigation-store";
import { useAudioStore } from "@/stores/audio-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ChevronLeft, Play, Shuffle, Music } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import MusicListItem from "@/components/shared/item/music-list";
import placeholderArt from "@/assets/placeholder-art.png";

import { VirtualizedList } from "@/components/shared/virtualized-list";

export default function AlbumDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const play = useAudioStore((s) => s.play);

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const albumId = detailView?.type === "album" ? detailView.id : null;

  useEffect(() => {
    if (!albumId) return;

    const loadAlbumData = async () => {
      setIsLoading(true);
      try {
        const [albumData, tracksData] = await Promise.all([
          getAlbumById(albumId),
          getAlbumTracks(albumId),
        ]);
        setAlbum(albumData);
        // Sort by track number by default
        const sortedTracks = tracksData.sort(
          (a, b) => (a.track_number || 0) - (b.track_number || 0)
        );
        setTracks(sortedTracks);
      } catch (error) {
        console.error("Failed to load album:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbumData();
  }, [albumId]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handlePlay = () => {
    if (tracks.length > 0) {
      play(tracks[0], tracks);
    }
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      play(shuffled[0], shuffled);
    }
  };

  if (!album) {
    if (isLoading) return null; // Wait for loading
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Album not found</div>
      </div>
    );
  }

  const artworkSrc = album.artwork_path
    ? convertFileSrc(album.artwork_path)
    : placeholderArt;

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <VirtualizedList
        items={tracks}
        header={
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Header with back button */}
            <div className="mt-8 flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft size={24} />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Back to Albums
              </span>
            </div>

            {/* Album info header */}
            <div className="flex gap-6 mb-6 px-2">
              <img
                className="w-40 h-40 rounded-lg object-cover bg-card shrink-0"
                src={artworkSrc}
                onError={(e) => {
                  e.currentTarget.src = placeholderArt;
                }}
                alt={album.title}
              />
              <div className="flex flex-col justify-center min-w-0">
                <h2 className="text-2xl font-bold text-foreground line-clamp-2">
                  {album.title}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {formatDuration(album.total_duration_ms)}
                </p>
                <p className="text-muted-foreground text-sm">
                  {album.artist_name || "Unknown Artist"}
                </p>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handlePlay}
                    className="gap-2 rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Play size={20} fill="currentColor" />
                    Play
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleShuffle}
                    className="gap-2 rounded-full"
                  >
                    <Shuffle size={20} />
                    Shuffle
                  </Button>
                </div>
              </div>
            </div>
          </div>
        }
        renderItem={(track, index) => (
          <div
            key={track.id}
            className="group flex items-center gap-2 hover:bg-accent rounded-md pr-2 transition-colors px-2"
          >
            <span className="text-muted-foreground text-sm w-12 text-center shrink-0 font-variant-numeric tabular-nums group-hover:text-foreground transition-colors">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <MusicListItem track={track} />
            </div>
          </div>
        )}
        emptyState={
          !isLoading ? (
            <EmptyState
              icon={Music}
              title="No tracks found"
              description="This album appears to be empty."
            />
          ) : null
        }
      />
    </div>
  );
}
