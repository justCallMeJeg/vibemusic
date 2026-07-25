import { useEffect, useState, memo, useCallback } from "react";
import { useNavigationStore, useDetailView } from "@/stores/navigation-store";
import {
  getArtistById,
  getArtistAlbums,
  getArtistTracks,
  getAlbumTracks,
  Artist,
  Album,
  Track,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { SearchX, Shuffle, Users } from "lucide-react";
import { useAudioStore, useCurrentTrack, usePlayerStatus } from "@/stores/audio-store";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ListItem } from "@/components/shared/list-item";
import { ArtistLinks } from "@/components/shared/artist-links";
import { DetailPageTemplate } from "@/components/shared/templates/detail-page-template";
import { TrackList } from "@/components/shared/templates/track-list";
import { useContentStore } from "@features/library/store/content-store";
import { formatDuration } from "@/lib/format";
import { useTrackActivationHandlers } from "@/hooks/use-track-activation-handlers";
import { useInteractionStore } from "@/stores/interaction-store";
import { useKeybindsStore } from "@/stores/keybinds-store";
import { registerSelectAllAndCleanup } from "@/lib/keybinds";
import { useSelectionEscapeKeybind } from "@/hooks/use-selection-escape-keybind";
import { AlbumCarousel } from "@features/library/components/album-carousel";
import { useArtistKeyboardNav } from "@/hooks/use-artist-keyboard-nav";

const ArtistTrackRow = memo(function ArtistTrackRow({
  track,
  index,
  currentTrackId,
  status,
  tracks,
  play,
  pause,
  resume,
  menuActions,
  dataItemIndex,
}: {
  track: Track;
  index: number;
  currentTrackId?: number;
  status: string;
  tracks: Track[];
  play: (track: Track, queue?: Track[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  menuActions?: {
    onPlay?: () => void;
    onPause?: () => void;
    onShuffle?: () => void;
    onPlayNext?: () => void;
    onAddToQueue?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onGoToAlbum?: () => void;
    onGoToArtist?: () => void;
    onAddToPlaylist?: (playlistId: number) => void;
    playlists?: { id: number; name: string }[];
  };
  dataItemIndex?: number;
}) {
  const isCurrentTrack = currentTrackId === track.id;
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
      artworkSrc={track.artwork_path || undefined}
      index={index + 1}
      variant="indexed"
      showArtwork
      active={isCurrentTrack}
      isPlaying={isCurrentTrack && status === "playing"}
      trailing={
        <span className="tabular-nums text-xs">
          {formatDuration(track.duration_ms)}
        </span>
      }
      onClick={() => {
        if (isCurrentTrack) {
          if (status === "playing") pause();
          else resume();
        } else {
          play(track, tracks);
        }
      }}
      menuActions={menuActions}
      dataItemIndex={dataItemIndex}
    />
  );
});

export default memo(function ArtistDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const updateBreadcrumbLabel = useNavigationStore(
    (s) => s.updateBreadcrumbLabel,
  );
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const resume = useAudioStore((s) => s.resume);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();

  const SCOPE = "page:artist-detail";
  useEffect(() => {
    const { register, clearScope } = useKeybindsStore.getState();
    register("escape", {
      combo: { key: "Escape" },
      handler: () => goBack(),
      description: "Return to artists",
      preventDefault: true,
    }, SCOPE);
    register("backspace", {
      combo: { key: "Backspace" },
      handler: () => goBack(),
      description: "Return to artists",
      preventDefault: true,
    }, SCOPE);
    registerSelectAllAndCleanup(register, clearScope, SCOPE);
    return () => clearScope(SCOPE);
  }, [goBack]);
  useSelectionEscapeKeybind(goBack, SCOPE);

  const [artist, setArtist] = useState<Artist | null>(() => {
    if (detailView?.type !== "artist" || !detailView.id) return null;
    return useContentStore.getState().artists.find((a) => a.id === detailView.id) ?? null;
  });
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (detailView?.type !== "artist" || !detailView.id) return;

    let cancelled = false;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const [artistResult, albumsResult, tracksResult] =
          await Promise.allSettled([
            getArtistById(detailView.id),
            getArtistAlbums(detailView.id),
            getArtistTracks(detailView.id),
          ]);
        if (!cancelled) {
          if (artistResult.status === "fulfilled" && artistResult.value) {
            setArtist(artistResult.value);
            updateBreadcrumbLabel(
              "artist",
              detailView.id,
              artistResult.value.name,
            );
          } else if (artistResult.status === "rejected") {
            logger.error("Failed to load artist", artistResult.reason);
          }
          if (albumsResult.status === "fulfilled")
            setAlbums(albumsResult.value);
          else logger.error("Failed to load albums", albumsResult.reason);
          if (tracksResult.status === "fulfilled")
            setTracks(tracksResult.value);
          else logger.error("Failed to load tracks", tracksResult.reason);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [detailView, updateBreadcrumbLabel]);

  useEffect(() => {
    if (isLoading) return;
    if (useInteractionStore.getState().focusSource !== "keyboard") return;
    if (tracks.length === 0 && albums.length === 0) return;
    requestAnimationFrame(() => {
      if (albums.length > 0) {
        const firstAlbumBtn = document.querySelector<HTMLElement>('[data-album-index="0"] button');
        firstAlbumBtn?.focus({ preventScroll: true });
      } else {
        const el = document.querySelector<HTMLElement>('[data-item-index="0"]');
        el?.focus({ preventScroll: true });
      }
    });
  }, [isLoading, tracks.length, albums.length]);

  useArtistKeyboardNav(albums.length, tracks.length);

  const renderItem = useCallback(
    (track: Track, index: number) => {
      const isCurrent = currentTrack?.id === track.id;
      const isPlayingStatus = status === "playing";

      const menuActions = {
        onPlay: () => play(track, tracks),
        onPause: isCurrent && isPlayingStatus ? () => pause() : undefined,
        onShuffle: () => {
          const shuffled = [...tracks].sort(() => Math.random() - 0.5);
          play(shuffled[0], shuffled);
        },
        onPlayNext: () => playNext(track),
        onAddToQueue: () => addToQueue(track),
        onGoToAlbum: track.album_id != null ? () => openAlbumDetail(track.album_id!) : undefined,
      };

      return (
        <ArtistTrackRow
          key={track.id}
          track={track}
          index={index}
          currentTrackId={currentTrack?.id}
          status={status}
          tracks={tracks}
          play={play}
          pause={pause}
          resume={resume}
          menuActions={menuActions}
          dataItemIndex={index}
        />
      );
    },
    [currentTrack?.id, status, tracks, play, pause, resume, addToQueue, playNext, openAlbumDetail],
  );

  const activationHandlers = useTrackActivationHandlers(tracks);

  if (!artist && !isLoading) {
    return (
      <EmptyState
        icon={SearchX}
        title="Artist not found"
        description="The artist you're looking for doesn't exist or has been removed."
        action={<Button variant="ghost" onClick={goBack}>Go back</Button>}
      />
    );
  }

  const handleShuffleArtist = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      play(shuffled[0], shuffled);
    }
  };

  const handlePlayAlbum = async (albumId: number) => {
    try {
      const albumTracks = await getAlbumTracks(albumId);
      if (albumTracks.length > 0) {
        const sorted = albumTracks.sort(
          (a, b) => (a.track_number || 0) - (b.track_number || 0),
        );
        play(sorted[0], sorted);
      }
    } catch (err) {
      logger.error("Failed to play album", err);
    }
  };

  const handleAlbumClick = (albumId: number) => {
    openAlbumDetail(albumId);
  };

  return (
    <DetailPageTemplate
      title={artist?.name ?? ""}
      subtitle={artist ? `${artist.album_count} Albums • ${artist.track_count} Songs` : undefined}
      artworkPath={artist?.artwork_path}
      onBack={goBack}
      onPlay={tracks.length > 0 ? () => handleShuffleArtist() : undefined}
    >
      <TrackList
        tracks={tracks}
        autoFocus={false}
        headerContent={
          artist ? (
          <div className="flex gap-6 mb-8">
            <div className="w-40 h-40 rounded-full overflow-hidden bg-card shrink-0 shadow-lg">
              <ArtworkImage
                src={artist.artwork_path}
                placeholderType="artist"
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
                {artist.name}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground font-medium text-sm">
                <span>
                  {artist.album_count}{" "}
                  {artist.album_count === 1 ? "Album" : "Albums"}
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span>
                  {artist.track_count}{" "}
                  {artist.track_count === 1 ? "Song" : "Songs"}
                </span>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShuffleArtist}
                  className="gap-2"
                >
                  <Shuffle size={14} />
                  Shuffle
                </Button>
              </div>
            </div>
          </div>
          ) : null
        }
        headerExtras={
          <>
            {albums.length > 0 && (
              <AlbumCarousel
                albums={albums}
                onAlbumClick={handleAlbumClick}
                onPlayAlbum={handlePlayAlbum}
              />
            )}

            {tracks.length > 0 && (
              <h2 className="text-xl font-bold text-foreground mb-4">
                Songs
              </h2>
            )}

            {albums.length === 0 && tracks.length === 0 && (
              <EmptyState
                icon={Users}
                title="No content found"
                description="This artist has no albums or tracks in your library."
              />
            )}
          </>
        }
        renderItem={renderItem}
        {...activationHandlers}
      />
    </DetailPageTemplate>
  );
});
