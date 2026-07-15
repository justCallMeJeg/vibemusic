import { useEffect, useState, memo, useCallback } from "react";
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
import { useLibraryStore } from "@/stores/library-store";
import { formatDuration } from "@/lib/format";

const AlbumTrackRow = memo(function AlbumTrackRow({
  track,
  index,
  currentTrackId,
  status,
  tracks,
  play,
  pause,
  resume,
}: {
  track: Track;
  index: number;
  currentTrackId?: number;
  status: string;
  tracks: Track[];
  play: (track: Track, queue?: Track[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
}) {
  return (
    <ListItem
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
      active={currentTrackId === track.id}
      isPlaying={currentTrackId === track.id && status === "playing"}
      trailing={
        <span className="tabular-nums text-xs">
          {formatDuration(track.duration_ms)}
        </span>
      }
      onClick={() => {
        if (currentTrackId === track.id) {
          if (status === "playing") pause();
          else resume();
        } else {
          play(track, tracks);
        }
      }}
    />
  );
});

export default memo(function AlbumDetailPage() {
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

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const albumId = detailView?.type === "album" ? detailView.id : null;

  const [album, setAlbum] = useState<Album | null>(() => {
    if (!albumId) return null;
    return useLibraryStore.getState().albums.find((a) => a.id === albumId) ?? null;
  });

  useEffect(() => {
    if (!albumId) return;

    let cancelled = false;

    const loadAlbumData = async () => {
      setIsLoading(true);
      try {
        const [albumData, tracksData] = await Promise.all([
          getAlbumById(albumId),
          getAlbumTracks(albumId),
        ]);
        if (!cancelled) {
          if (albumData) {
            setAlbum(albumData);
            updateBreadcrumbLabel("album", albumId, albumData.title);
          }
          // Sort by track number by default
          const sortedTracks = [...tracksData].sort(
            (a, b) => (a.track_number || 0) - (b.track_number || 0),
          );
          setTracks(sortedTracks);
        }
      } catch (error) {
        if (!cancelled) {
          logger.error("Failed to load album", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAlbumData();

    return () => {
      cancelled = true;
    };
  }, [albumId, updateBreadcrumbLabel]);

  const handlePlay = () => {
    if (tracks.length === 0) return;
    play(tracks[0], tracks);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    play(shuffled[0], shuffled);
  };

  const renderItem = useCallback(
    (track: Track, index: number) => (
      <AlbumTrackRow
        key={track.id}
        track={track}
        index={index}
        currentTrackId={currentTrack?.id}
        status={status}
        tracks={tracks}
        play={play}
        pause={pause}
        resume={resume}
      />
    ),
    [currentTrack?.id, status, tracks, play, pause, resume],
  );

  if (!album && !isLoading) {
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
      title={album?.title ?? ""}
      subtitle={album?.artist_name ?? undefined}
      artworkPath={album?.artwork_path}
      onBack={goBack}
      onPlay={tracks.length > 0 ? handlePlay : undefined}
    >
      <TrackList
        tracks={tracks}
        headerHeight={320}
        headerContent={
          <DetailHero
            title={album?.title ?? ""}
            subtitle={album?.artist_name ?? "Unknown Artist"}
            tertiaryText={album ? formatDuration(album.total_duration_ms) : ""}
            artworkPath={album?.artwork_path}
            placeholderType="track"
            onPlay={handlePlay}
            onShuffle={handleShuffle}
          />
        }
        renderItem={renderItem}
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
});
