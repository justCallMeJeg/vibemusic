import { useEffect, useState } from "react";
import { getAlbumById, getAlbumTracks, Album, Track } from "@/lib/api";
import { useNavigationStore, useDetailView } from "@/stores/navigation-store";
import { logger } from "@/lib/logger";
import { useAudioStore } from "@/stores/audio-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Music, ChevronLeft } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import placeholderArt from "@/assets/placeholder-art.png";
import { TrackListHeader } from "@/components/shared/track-list-header";
import { TrackListRow } from "@/components/shared/item/track-list-row";
import { VirtualizedList } from "@/components/shared/virtualized-list";
import { DetailPageTemplate } from "@/components/shared/templates/detail-page-template";
import { DetailHero } from "@/components/shared/detail-hero";

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
        logger.error("Failed to load album", error);
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
    <DetailPageTemplate
      title={album.title}
      subtitle={album.artist_name || undefined}
      artworkSrc={artworkSrc || undefined}
      onBack={goBack}
      onPlay={handlePlay}
    >
      {(onScroll: (e: React.UIEvent<HTMLDivElement>) => void) => (
        <VirtualizedList
          items={tracks}
          onScroll={onScroll}
          headerHeight={320} // Adjusted height for hero + track list header
          header={
            <div className="w-full min-w-0 flex flex-col">
              {/* Back button area */}
              <div className="mt-8 flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  onClick={goBack}
                  className="text-muted-foreground hover:text-foreground gap-2 pl-2"
                >
                  <ChevronLeft size={24} />
                  <span className="text-sm font-medium">Back to Albums</span>
                </Button>
              </div>

              <DetailHero
                title={album.title}
                subtitle={album.artist_name || "Unknown Artist"}
                tertiaryText={formatDuration(album.total_duration_ms)}
                artworkSrc={artworkSrc}
                onPlay={handlePlay}
                onShuffle={handleShuffle}
              />

              {/* Keep Track List Header in the scrollable content */}
              <TrackListHeader />
            </div>
          }
          renderItem={(track: Track, index: number) => (
            <TrackListRow
              key={track.id}
              track={track}
              index={index + 1}
              showArtwork={false}
            />
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
      )}
    </DetailPageTemplate>
  );
}
