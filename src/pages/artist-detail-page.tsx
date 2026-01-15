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
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  Users,
  Shuffle,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAudioStore } from "@/stores/audio-store";
import { Button } from "@/components/ui/button";
import MusicListItem from "@/components/shared/item/music-list";
import { ScrollingText } from "@/components/shared/scrolling-text";
import placeholderArt from "@/assets/placeholder-art.png";

export default function ArtistDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const play = useAudioStore((s) => s.play);

  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scroll ref for albums row
  const albumsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (detailView?.type === "artist" && detailView.id) {
      setIsLoading(true);
      Promise.all([
        getArtistById(detailView.id),
        getArtistAlbums(detailView.id),
        getArtistTracks(detailView.id),
      ])
        .then(([artistData, albumsData, tracksData]) => {
          setArtist(artistData);
          setAlbums(albumsData);
          setTracks(tracksData);
        })
        .finally(() => setIsLoading(false));
    }
  }, [detailView]);

  if (isLoading || !artist) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  const handleShuffleArtist = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      play(shuffled[0], shuffled);
    }
  };

  const handlePlayAlbum = async (e: React.MouseEvent, albumId: number) => {
    e.stopPropagation();
    try {
      const albumTracks = await getAlbumTracks(albumId);
      if (albumTracks.length > 0) {
        const sorted = albumTracks.sort(
          (a, b) => (a.track_number || 0) - (b.track_number || 0)
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

  const artworkSrc = artist.artwork_path
    ? convertFileSrc(artist.artwork_path)
    : undefined;

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-y-auto no-scrollbar">
      {/* Header with back button */}
      <div className="mt-8 flex items-center gap-2 mb-4 px-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={24} />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          Back to Artists
        </span>
      </div>

      {/* Artist Info Header */}
      <div className="flex gap-6 mb-8 px-8">
        <div className="w-40 h-40 rounded-full overflow-hidden bg-card shrink-0 shadow-lg">
          {artworkSrc ? (
            <img
              src={artworkSrc}
              alt={artist.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = placeholderArt;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Users className="w-20 h-20" />
            </div>
          )}
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
              {artist.track_count} {artist.track_count === 1 ? "Song" : "Songs"}
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

      <div className="px-8 pb-48 space-y-10 w-full">
        {/* Albums Section (Horizontal Row) */}
        {albums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                Albums
              </h2>
              {/* Scroll Controls */}
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
                <div
                  key={album.id}
                  className="flex flex-col w-[160px] min-w-[160px] gap-2"
                >
                  <div
                    className="relative aspect-square w-full rounded-lg overflow-hidden group cursor-pointer shadow-md"
                    onClick={(e) => handlePlayAlbum(e, album.id)}
                  >
                    <img
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      src={
                        album.artwork_path
                          ? convertFileSrc(album.artwork_path)
                          : placeholderArt
                      }
                      alt={album.title}
                      onError={(e) => {
                        e.currentTarget.src = placeholderArt;
                      }}
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-primary rounded-full p-3 text-primary-foreground transform scale-90 group-hover:scale-100 transition-transform shadow-lg">
                        <Play size={24} fill="currentColor" className="ml-1" />
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 flex flex-col gap-0.5">
                    <ScrollingText
                      onClick={() => handleAlbumClick(album.id)}
                      className="text-foreground text-sm font-bold cursor-pointer w-full text-left"
                    >
                      {album.title}
                    </ScrollingText>
                    <p className="text-muted-foreground text-xs line-clamp-1">
                      {album.year || "Unknown Year"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Songs Section (Top 5) */}
        {tracks.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              Popular Songs
            </h2>
            <div className="flex flex-col gap-1">
              {tracks.slice(0, 5).map((track, i) => (
                <div
                  key={track.id}
                  className="group flex items-center gap-2 hover:bg-accent rounded-md pr-2 transition-colors"
                >
                  <span className="text-muted-foreground text-sm w-12 text-center shrink-0 font-variant-numeric tabular-nums group-hover:text-foreground transition-colors">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <MusicListItem track={track} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
