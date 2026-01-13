import { useLibraryStore } from "@/stores/library-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Music2, Play } from "lucide-react";
import { useMemo } from "react";
import placeholderArt from "@/assets/placeholder-art.png";
import { useAudioStore } from "@/stores/audio-store";
import { getArtistTracks } from "@/lib/api";
import { ScrollingText } from "@/components/shared/scrolling-text";

export default function ArtistsPage() {
  const artists = useLibraryStore((s) => s.artists);
  const openArtistDetail = useNavigationStore((s) => s.openArtistDetail);
  const play = useAudioStore((s) => s.play);

  const sortedArtists = useMemo(() => {
    return [...artists].sort((a, b) => a.name.localeCompare(b.name));
  }, [artists]);

  const handleShufflePlay = async (e: React.MouseEvent, artistId: number) => {
    e.stopPropagation();
    try {
      const tracks = await getArtistTracks(artistId);
      if (tracks.length > 0) {
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
        play(shuffled[0], shuffled);
      }
    } catch (err) {
      console.error("Failed to play artist", err);
    }
  };

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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-32">
        {sortedArtists.map((artist) => (
          <div
            key={artist.id}
            className="flex flex-col rounded-lg p-3 hover:bg-white/5 transition-colors group gap-3"
          >
            <div
              className="relative aspect-square w-full bg-neutral-800 rounded-full flex items-center justify-center overflow-hidden group-hover:scale-[1.02] transition-transform shadow-sm cursor-pointer"
              onClick={(e) => handleShufflePlay(e, artist.id)}
            >
              <img
                className="w-full h-full object-cover"
                src={
                  artist.artwork_path
                    ? convertFileSrc(artist.artwork_path)
                    : placeholderArt
                }
                onError={(e) => {
                  e.currentTarget.src = placeholderArt;
                }}
                alt={artist.name}
              />
              {/* Shuffle Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white rounded-full p-3 text-black transform scale-90 group-hover:scale-100 transition-transform shadow-lg">
                  <Play size={24} fill="currentColor" />
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <ScrollingText
                className="font-semibold text-white hover:[&_span]:underline cursor-pointer w-full text-left"
                onClick={() => openArtistDetail(artist.id)}
              >
                {artist.name}
              </ScrollingText>
              <p className="text-xs text-gray-500 mt-1">
                {artist.album_count}{" "}
                {artist.album_count === 1 ? "Album" : "Albums"} •{" "}
                {artist.track_count}{" "}
                {artist.track_count === 1 ? "Song" : "Songs"}
              </p>
            </div>
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
