import { useEffect, useState, useRef } from "react";
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
import {
  ArrowLeft,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Music,
} from "lucide-react";
import { CardItem } from "@/components/shared/card-item";
import { EmptyState } from "@/components/shared/empty-state";
import { useAudioStore, useCurrentTrack, usePlayerStatus } from "@/stores/audio-store";
import { Button } from "@/components/ui/button";
import artistPlaceholderArt from "@/assets/artist-placeholder-art.png";
import { CompactPageHeader } from "@/components/shared/compact-page-header";
import { ListItem } from "@/components/shared/list-item";
import { ArtistLinks } from "@/components/shared/artist-links";
import { VirtualizedList } from "@/components/shared/virtualized-list";
import { TrackListHeader } from "@/components/shared/track-list-header";
import { PageLayout } from "@/components/shared/page-layout";
import { DetailSkeleton } from "@/components/skeletons";

export default function ArtistDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const play = useAudioStore((s) => s.play);
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const headerRef = useRef<HTMLDivElement>(null);

  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Scroll ref for albums row
  const albumsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (detailView?.type === "artist" && detailView.id) {
      setIsLoading(true);
      (async () => {
        try {
          const [artistResult, albumsResult, tracksResult] =
            await Promise.allSettled([
              getArtistById(detailView.id),
              getArtistAlbums(detailView.id),
              getArtistTracks(detailView.id),
            ]);
          if (artistResult.status === "fulfilled")
            setArtist(artistResult.value);
          else logger.error("Failed to load artist", artistResult.reason);
          if (albumsResult.status === "fulfilled")
            setAlbums(albumsResult.value);
          else logger.error("Failed to load albums", albumsResult.reason);
          if (tracksResult.status === "fulfilled")
            setTracks(tracksResult.value);
          else logger.error("Failed to load tracks", tracksResult.reason);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [detailView]);

  if (isLoading || !artist) {
    if (isLoading) return <DetailSkeleton />;
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <span>Artist not found</span>
        <Button variant="ghost" onClick={goBack}>Go back</Button>
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



  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const threshold = 300;
    const header = headerRef.current;

    if (header) {
      if (scrollTop > threshold) {
        if (header.dataset.visible !== "true") {
          header.style.opacity = "1";
          header.dataset.visible = "true";
        }
      } else {
        if (header.dataset.visible !== "false") {
          header.style.opacity = "0";
          header.dataset.visible = "false";
        }
      }
    }
  };

  return (
    <PageLayout overflowHidden className="relative">
      <CompactPageHeader
        ref={headerRef}
        title={artist.name}
        subtitle={`${artist.album_count} Albums • ${artist.track_count} Songs`}
        artworkPath={artist.artwork_path}
        onBack={goBack}
        onPlay={() => handleShuffleArtist()}
      />

      <VirtualizedList
        items={tracks}
        onScroll={handleScroll}
        header={
          <div className="w-full min-w-0 flex flex-col">
            {/* Back Button Row */}
            <div className="mt-8 flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                onClick={goBack}
                className="text-muted-foreground hover:text-foreground gap-2 pl-2"
              >
                <ArrowLeft size={24} />
                <span className="text-sm font-medium">Back to Artists</span>
              </Button>
            </div>

            {/* Artist Info Header */}
            <div className="flex gap-6 mb-8">
              <div className="w-40 h-40 rounded-full overflow-hidden bg-card shrink-0 shadow-lg">
                <ArtworkImage
                  src={artist.artwork_path}
                  fallback={artistPlaceholderArt}
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

            {/* Albums Section (Horizontal Row) */}
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
                        subtitle={album.year ? String(album.year) : "Unknown Year"}
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

            {/* Songs Header */}
            {tracks.length > 0 && (
              <div className="pb-2">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Songs
                </h2>
                <TrackListHeader />
              </div>
            )}

            {/* Empty State */}
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
          </div>
        }
        renderItem={(track, index) => {
          const isCurrentTrack = currentTrack?.id === track.id;
          return (
            <ListItem
              key={track.id}
              title={track.title}
              subtitle={
                <ArtistLinks
                  names={track.artist_names}
                  ids={track.artist_ids?.length ? track.artist_ids : track.artist_id ? [track.artist_id] : []}
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
              trailing={<span className="tabular-nums text-xs">{formatDuration(track.duration_ms)}</span>}
            />
          );
        }}
      />
    </PageLayout>
  );
}
