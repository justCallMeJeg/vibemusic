import { useEffect, useState } from "react";
import { getAlbums, Album } from "@/lib/api";
import { useNavigationStore } from "@/stores/navigation-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import placeholderArt from "@/assets/placeholder-art.jpg";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);

  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const data = await getAlbums();
        setAlbums(data);
      } catch (error) {
        console.error("Failed to load albums:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbums();
  }, []);

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading albums...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <h1 className="text-3xl font-bold ml-1 mb-4">Albums</h1>

      <div className="flex-1 overflow-y-auto">
        {albums.length === 0 ? (
          <div className="text-gray-500 text-center p-8">
            No albums found. Import some music to see albums here.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 p-2">
            {albums.map((album) => {
              const artworkSrc = album.artwork_path
                ? convertFileSrc(album.artwork_path)
                : placeholderArt;

              return (
                <div
                  key={album.id}
                  onClick={() => openAlbumDetail(album.id)}
                  className="flex flex-col rounded-lg p-3 hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <img
                    className="aspect-square w-full rounded-lg object-cover bg-neutral-800 mb-3"
                    src={artworkSrc}
                    onError={(e) => {
                      e.currentTarget.src = placeholderArt;
                    }}
                    alt={album.title}
                  />
                  <p className="text-white text-sm font-bold line-clamp-1">
                    {album.title}
                  </p>
                  <p className="text-gray-400 text-xs line-clamp-1">
                    {album.artist_name || "Unknown Artist"}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {album.track_count} tracks •{" "}
                    {formatDuration(album.total_duration_ms)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
