import { useLibraryStore } from "@/stores/library-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Music2 } from "lucide-react";
import { useMemo } from "react";

export default function ArtistsPage() {
  const artists = useLibraryStore((s) => s.artists);
  const openArtistDetail = useNavigationStore((s) => s.openArtistDetail);

  const sortedArtists = useMemo(() => {
    return [...artists].sort((a, b) => a.name.localeCompare(b.name));
  }, [artists]);

  return (
    <div className="h-full flex flex-col pt-8 px-8 pb-4 overflow-y-auto no-scrollbar">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Artists</h1>
          <p className="text-neutral-400">
            {artists.length} {artists.length === 1 ? "artist" : "artists"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-32">
        {sortedArtists.map((artist) => (
          <div
            key={artist.id}
            onClick={() => openArtistDetail(artist.id)}
            className="flex flex-col rounded-lg p-3 hover:bg-white/5 cursor-pointer transition-colors group"
          >
            <img
              className="aspect-square w-full rounded-lg object-cover bg-neutral-800 mb-3 group-hover:scale-[1.02] transition-transform"
              src={
                artist.artwork_path
                  ? convertFileSrc(artist.artwork_path)
                  : undefined
              } // Fallback handled by onError typically or conditional rendering
              alt={artist.name}
            />
            <p className="text-white text-sm font-bold line-clamp-1">
              {artist.name}
            </p>
            <p className="text-gray-400 text-xs line-clamp-1">
              {artist.album_count}{" "}
              {artist.album_count === 1 ? "Album" : "Albums"}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {artist.track_count}{" "}
              {artist.track_count === 1 ? "track" : "tracks"}
            </p>
          </div>
        ))}

        {artists.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-neutral-500">
            <Music2 className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">No artists found</p>
          </div>
        )}
      </div>
    </div>
  );
}
