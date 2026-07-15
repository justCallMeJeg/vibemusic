import { useEffect, useState, useRef, memo, useCallback } from "react";
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
import { Shuffle, ChevronLeft, ChevronRight, Music } from "lucide-react";
import { CardItem } from "@/components/shared/card-item";
import { EmptyState } from "@/components/shared/empty-state";
import {
  useAudioStore,
  useCurrentTrack,
  usePlayerStatus,
} from "@/stores/audio-store";
import { Button } from "@/components/ui/button";
import { ListItem } from "@/components/shared/list-item";
import { ArtistLinks } from "@/components/shared/artist-links";
import { DetailPageTemplate } from "@/components/shared/templates/detail-page-template";
import { TrackList } from "@/components/shared/templates/track-list";
import { useLibraryStore } from "@/stores/library-store";
import { formatDuration } from "@/lib/format";

const ArtistTrackRow = memo(function ArtistTrackRow({
  track,
  index,
  currentTrackId,
  status,
}: {
  track: Track;
  index: number;
  currentTrackId?: number;
  status: string;
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
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();

  const [artist, setArtist] = useState<Artist | null>(() => {
    if (detailView?.type !== "artist" || !detailView.id) return null;
    return useLibraryStore.getState().artists.find((a) => a.id === detailView.id) ?? null;
  });
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scroll ref for albums row
  const albumsScrollRef = useRef<HTMLDivElement>(null);

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

  const renderItem = useCallback(
    (track: Track, index: number) => (
      <ArtistTrackRow
        key={track.id}
        track={track}
        index={index}
        currentTrackId={currentTrack?.id}
        status={status}
      />
    ),
    [currentTrack?.id, status],
  );

  if (!artist && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <span>Artist not found</span>
        <Button variant="ghost" onClick={goBack}>
          Go back
        </Button>
      </div>
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

  const scrollAlbums = (direction: "left" | "right") => {
    if (albumsScrollRef.current) {
      const scrollAmount = 300;
      albumsScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
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
              <section className="pb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    Albums
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => scrollAlbums("left")}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => scrollAlbums("right")}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div
                  ref={albumsScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
                >
                  {albums.map((album) => (
                    <div key={album.id} className="w-40 min-w-40">
                      <CardItem
                        title={album.title}
                        subtitle={
                          album.year ? String(album.year) : "Unknown Year"
                        }
                        artworkSrc={album.artwork_path || undefined}
                        artworkType="album"
                        variant="compact"
                        onClick={() => handleAlbumClick(album.id)}
                        onPlay={() => handlePlayAlbum(album.id)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tracks.length > 0 && (
              <h2 className="text-xl font-bold text-foreground mb-4">
                Songs
              </h2>
            )}

            {albums.length === 0 && tracks.length === 0 && (
              <div className="py-16">
                <EmptyState
                  icon={Music}
                  title="No content found"
                  description="This artist has no albums or tracks in your library."
                  variant="default"
                />
              </div>
            )}
          </>
        }
        renderItem={renderItem}
      />
    </DetailPageTemplate>
  );
});
