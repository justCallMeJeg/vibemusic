import { useEffect, useState } from "react";
import { getAlbumById, getAlbumTracks, Album, Track } from "@/lib/api";
import { useNavigationStore, useDetailView } from "@/stores/navigation-store";
import { logger } from "@/lib/logger";
import {
  useAudioStore,
  usePlayerStatus,
  useCurrentTrack,
} from "@/stores/audio-store";
import { Music } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ListItem } from "@/components/shared/list-item";
import { ArtistLinks } from "@/components/shared/artist-links";
import { DetailPageTemplate } from "@/components/shared/templates/detail-page-template";
import { TrackList } from "@/components/shared/templates/track-list";
import { DetailHero } from "@/components/shared/detail-hero";
import { DetailSkeleton } from "@/components/skeletons";
import { formatDuration } from "@/lib/format";

export default function AlbumDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const updateBreadcrumbLabel = useNavigationStore(
    (s) => s.updateBreadcrumbLabel,
  );
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const resume = useAudioStore((s) => s.resume);
  const status = usePlayerStatus();
  const currentTrack = useCurrentTrack();

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
        if (albumData) {
          setAlbum(albumData);
          updateBreadcrumbLabel("album", albumId, albumData.title);
        }
        // Sort by track number by default
        const sortedTracks = [...tracksData].sort(
          (a, b) => (a.track_number || 0) - (b.track_number || 0),
        );
        setTracks(sortedTracks);
      } catch (error) {
        logger.error("Failed to load album", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbumData();
  }, [albumId, updateBreadcrumbLabel]);

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
    if (isLoading) return <DetailSkeleton />;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-muted-foreground">Album not found</div>
        <Button variant="ghost" onClick={goBack}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <DetailPageTemplate
      title={album.title}
      subtitle={album.artist_name || undefined}
      artworkPath={album.artwork_path}
      onBack={goBack}
      onPlay={handlePlay}
    >
      <TrackList
        tracks={tracks}
        headerHeight={320}
        headerContent={
          <DetailHero
            title={album.title}
            subtitle={album.artist_name || "Unknown Artist"}
            tertiaryText={formatDuration(album.total_duration_ms)}
            artworkPath={album.artwork_path}
            placeholderType="track"
            onPlay={handlePlay}
            onShuffle={handleShuffle}
          />
        }
        renderItem={(track: Track, index: number) => (
          <ListItem
            key={track.id}
            title={track.title}
            subtitle={
              <ArtistLinks
                names={track.artist_names}
                ids={
                  track.artist_ids?.length
                    ? track.artist_ids
                    : track.artist_id
                      ? [track.artist_id]
                      : []
                }
                fallbackName={track.artist}
                fallbackId={track.artist_id}
              />
            }
            index={index + 1}
            showArtwork={false}
            variant="indexed"
            active={currentTrack?.id === track.id}
            isPlaying={currentTrack?.id === track.id && status === "playing"}
            trailing={
              <span className="tabular-nums text-xs">
                {formatDuration(track.duration_ms)}
              </span>
            }
            onClick={() => {
              if (currentTrack?.id === track.id) {
                if (status === "playing") pause();
                else resume();
              } else {
                play(track, tracks);
              }
            }}
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
    </DetailPageTemplate>
  );
}
