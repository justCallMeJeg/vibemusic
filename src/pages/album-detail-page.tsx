import { useEffect, useState } from "react";
import { getAlbumById, getAlbumTracks, Album, Track } from "@/lib/api";
import { useNavigationStore, useDetailView } from "@/stores/navigation-store";
import { useAudioStore } from "@/stores/audio-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ChevronLeft, Play, Shuffle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import MusicListItem from "@/components/ui/music-list";
import placeholderArt from "@/assets/placeholder-art.jpg";

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
        setTracks(tracksData);
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading album...</div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Album not found</div>
      </div>
    );
  }

  const artworkSrc = album.artwork_path
    ? convertFileSrc(album.artwork_path)
    : placeholderArt;

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      {/* Header with back button */}
      <div className="mt-8 flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="text-gray-400 hover:text-white"
        >
          <ChevronLeft size={24} />
        </Button>
        <span className="text-sm font-medium text-gray-400">
          Back to Albums
        </span>
      </div>

      {/* Album info header */}
      <div className="flex gap-6 mb-6 px-2">
        <img
          className="w-40 h-40 rounded-lg object-cover bg-neutral-800 shrink-0"
          src={artworkSrc}
          onError={(e) => {
            e.currentTarget.src = placeholderArt;
          }}
          alt={album.title}
        />
        <div className="flex flex-col justify-center min-w-0">
          <h2 className="text-2xl font-bold text-white line-clamp-2">
            {album.title}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {formatDuration(album.total_duration_ms)}
          </p>
          <p className="text-gray-500 text-sm">
            {album.artist_name || "Unknown Artist"}
          </p>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlay}
              className="gap-2"
            >
              <Play size={14} />
              Play
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShuffle}
              className="gap-2"
            >
              <Shuffle size={14} />
              Shuffle
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus size={14} />
              Add Song
            </Button>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto scroll-mask-y">
        {tracks.length === 0 ? (
          <div className="text-gray-500 text-center p-8">
            No tracks in this album
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-1">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="group flex items-center gap-2 hover:bg-white/5 rounded-md pr-2 transition-colors"
              >
                <span className="text-gray-600 text-sm w-12 text-center shrink-0 font-variant-numeric tabular-nums group-hover:text-white transition-colors">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <MusicListItem track={track} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
