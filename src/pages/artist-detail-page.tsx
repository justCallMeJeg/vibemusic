import { useEffect, useState, useRef } from "react";
import { useNavigationStore, useDetailView } from "@/stores/navigation-store";
import {
  getArtistById,
  getArtistAlbums,
  getArtistTracks,
  Artist,
  Album,
  Track,
} from "@/lib/api";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  Users,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAudioStore } from "@/stores/audio-store";
import { Button } from "@/components/ui/button";
import MusicListItem from "@/components/shared/item/music-list";
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
      <div className="h-full flex items-center justify-center text-neutral-500">
        Loading...
      </div>
    );
  }

  const handlePlayArtist = () => {
    if (tracks.length > 0) {
      play(tracks[0], tracks);
    }
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
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft size={24} />
        </Button>
        <span className="text-sm font-medium text-gray-400">
          Back to Artists
        </span>
      </div>

      {/* Artist Info Header */}
      <div className="flex gap-6 mb-8 px-8">
        <div className="w-40 h-40 rounded-lg overflow-hidden bg-neutral-800 shrink-0 shadow-lg">
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
            <div className="w-full h-full flex items-center justify-center text-neutral-600">
              <Users className="w-20 h-20" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            {artist.name}
          </h1>
          <div className="flex items-center gap-4 text-neutral-400 font-medium text-sm">
            <span>
              {artist.album_count}{" "}
              {artist.album_count === 1 ? "Album" : "Albums"}
            </span>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span>
              {artist.track_count} {artist.track_count === 1 ? "Song" : "Songs"}
            </span>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayArtist}
              className="gap-2"
            >
              <Play size={14} />
              Play Artist
            </Button>
          </div>
        </div>
      </div>

      <div className="px-8 pb-32 space-y-10 w-full">
        {/* Albums Section (Horizontal Row) */}
        {albums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
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
                  onClick={() => openAlbumDetail(album.id)}
                  className="flex flex-col rounded-lg p-3 hover:bg-white/5 cursor-pointer transition-colors group min-w-[160px] w-[160px]"
                >
                  <img
                    className="aspect-square w-full rounded-lg object-cover bg-neutral-800 mb-3 group-hover:scale-[1.02] transition-transform shadow-md"
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
                  <p className="text-white text-sm font-bold line-clamp-1">
                    {album.title}
                  </p>
                  <p className="text-gray-400 text-xs line-clamp-1">
                    {album.year || "Unknown Year"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Songs Section (Top 5) */}
        {tracks.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              Popular Songs
            </h2>
            <div className="flex flex-col gap-1">
              {tracks.slice(0, 5).map((track, i) => (
                <div
                  key={track.id}
                  className="group flex items-center gap-2 hover:bg-white/5 rounded-md pr-2 transition-colors"
                >
                  <span className="text-gray-600 text-sm w-12 text-center shrink-0 font-variant-numeric tabular-nums group-hover:text-white transition-colors">
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
