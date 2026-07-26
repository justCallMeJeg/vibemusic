import { useEffect, useState, memo, useCallback, useMemo } from "react";
import { getAlbumById, getAlbumTracks, Album, Track } from "@/lib/api";
import { useNavigationStore, useDetailView } from "@/stores/navigation-store";
import { logger } from "@/lib/logger";
import {
  useAudioStore,
  usePlayerStatus,
  useCurrentTrack,
} from "@/stores/audio-store";
import { SearchX, Music } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ListItem } from "@/components/shared/list-item";
import { ArtistLinks } from "@/components/shared/artist-links";
import { DetailPageTemplate } from "@/components/shared/templates/detail-page-template";
import { TrackList } from "@/components/shared/templates/track-list";
import { DetailHero } from "@features/library/components/detail-hero";
import { useContentStore } from "@features/library/store/content-store";
import { formatDuration } from "@/lib/format";
import { useSelectionEscapeKeybind } from "@/hooks/use-selection-escape-keybind";
import { useTrackActivationHandlers } from "@/hooks/use-track-activation-handlers";
import { registerSelectAllAndCleanup } from "@/lib/keybinds";
import { useKeybindsStore } from "@/stores/keybinds-store";
import { useInteractionStore } from "@/stores/interaction-store";
import { useSelectionStore } from "@/stores/selection-store";

const AlbumTrackRow = memo(function AlbumTrackRow({
  track,
  index,
  tracks,
  dataItemIndex,
}: {
  track: Track;
  index: number;
  tracks: Track[];
  dataItemIndex?: number;
}) {
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const resume = useAudioStore((s) => s.resume);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const openArtistDetail = useNavigationStore((s) => s.openArtistDetail);
  const menuActions = useMemo(() => ({
    onPlay: () => play(track, tracks),
    onPause:
      currentTrack?.id === track.id && status === "playing"
        ? () => pause()
        : undefined,
    onShuffle: () => {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      play(shuffled[0], shuffled);
    },
    onPlayNext: () => playNext(track),
    onAddToQueue: () => addToQueue(track),
    onGoToArtist:
      track.artist_ids?.[0] || track.artist_id
        ? () => openArtistDetail(track.artist_ids?.[0] ?? track.artist_id!)
        : undefined,
    onGoToAlbum:
      track.album_id != null ? () => openAlbumDetail(track.album_id!) : undefined,
    onCopyTitle: () => navigator.clipboard.writeText(track.title),
    onCopyArtist: () => navigator.clipboard.writeText(track.artist ?? ""),
    onCopyFilePath: track.file_path ? () => navigator.clipboard.writeText(track.file_path) : undefined,
  }), [track, tracks, currentTrack?.id, status, play, pause, resume, addToQueue, playNext, openArtistDetail, openAlbumDetail]);

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
          roles={track.artist_roles}
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
      onClick={(_e: React.MouseEvent) => {
        if (currentTrack?.id === track.id) {
          if (status === "playing") pause();
          else resume();
        } else {
          play(track, tracks);
        }
      }}
      menuActions={menuActions}
      dataItemIndex={dataItemIndex}
      itemId={track.id}
      selectable
    />
  );
});

export default memo(function AlbumDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const updateBreadcrumbLabel = useNavigationStore(
    (s) => s.updateBreadcrumbLabel,
  );

  const SCOPE = "page:album-detail";
  useEffect(() => {
    const { register, clearScope } = useKeybindsStore.getState();

    const navKeys = [
      { id: "escape", key: "Escape" },
      { id: "backspace", key: "Backspace" },
    ];

    for (const { id, key } of navKeys) {
      register(id, {
        combo: { key },
        handler: () => goBack(),
        description: "Return to albums",
        preventDefault: true,
      }, SCOPE);
    }

    registerSelectAllAndCleanup(register, clearScope, SCOPE);

    return () => clearScope(SCOPE);
  }, [goBack]);
  useSelectionEscapeKeybind(goBack, SCOPE);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const albumId = detailView?.type === "album" ? detailView.id : null;

  const [album, setAlbum] = useState<Album | null>(() => {
    if (!albumId) return null;
    return (
      useContentStore.getState().albums.find((a) => a.id === albumId) ?? null
    );
  });

  useEffect(() => {
    if (!albumId) return;

    const abortController = new AbortController();

    const loadAlbumData = async () => {
      setIsLoading(true);
      try {
        const [albumData, tracksData] = await Promise.all([
          getAlbumById(albumId),
          getAlbumTracks(albumId),
        ]);
        if (abortController.signal.aborted) return;
        if (albumData) {
          setAlbum(albumData);
          updateBreadcrumbLabel("album", albumId, albumData.title);
        }
        const sortedTracks = [...tracksData].sort(
          (a, b) => (a.track_number || 0) - (b.track_number || 0),
        );
        setTracks(sortedTracks);
      } catch (error) {
        if (abortController.signal.aborted) return;
        logger.error("Failed to load album", error);
      }
      setIsLoading(false);
    };

    loadAlbumData();

    return () => {
      abortController.abort();
    };
  }, [albumId, updateBreadcrumbLabel]);

  useEffect(() => {
    if (!isLoading && tracks.length > 0 && useInteractionStore.getState().focusSource === "keyboard") {
      requestAnimationFrame(() => {
        const firstItem = document.querySelector<HTMLElement>(
          '[data-item-index="0"]',
        );
        if (firstItem && document.activeElement !== firstItem) {
          firstItem.focus();
        }
      });
    }
  }, [isLoading, tracks.length]);

  useEffect(() => {
    useSelectionStore.getState().setItems(
      tracks.map((t, i) => ({ id: t.id, index: i })),
    );
  }, [tracks]);

  const activationHandlers = useTrackActivationHandlers(tracks);

  const handlePlay = () => {
    if (tracks.length === 0) return;
    const play = useAudioStore.getState().play;
    play(tracks[0], tracks);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const play = useAudioStore.getState().play;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    play(shuffled[0], shuffled);
  };

  const renderItem = useCallback(
    (track: Track, index: number) => (
      <AlbumTrackRow
        key={track.id}
        track={track}
        index={index}
        tracks={tracks}
        dataItemIndex={index}
      />
    ),
    [tracks],
  );

  if (!album && !isLoading) {
    return (
      <EmptyState
        icon={SearchX}
        title="Album not found"
        description="The album you're looking for doesn't exist or has been removed."
        action={
          <Button variant="ghost" onClick={goBack}>
            Go back
          </Button>
        }
      />
    );
  }

  return (
    <>
    <DetailPageTemplate
      title={album?.title ?? ""}
      subtitle={
        album?.album_artist_names?.length
          ? album.album_artist_names.join(", ")
          : (album?.artist_name ?? undefined)
      }
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
            subtitle={
              album?.album_artist_names?.length
                ? album.album_artist_names.join(", ")
                : (album?.artist_name ?? "Unknown Artist")
            }
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
        {...activationHandlers}
      />
    </DetailPageTemplate>
    </>
  );
});
