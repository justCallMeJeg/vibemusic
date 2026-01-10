import { useEffect, useState } from "react";
import { getTracks, Track } from "@/lib/api";
import MusicListItem from "@/components/ui/music-list";

export default function SongsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTracks = async () => {
    try {
      const data = await getTracks();
      setTracks(data);
    } catch (error) {
      console.error("Failed to load tracks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTracks();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading songs...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-center mb-4">
        <h1 className="text-3xl font-bold ml-1">Songs</h1>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 custom-scrollbar">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="text-xl font-bold">No songs found</h2>
            <p className="text-gray-400 mt-2 mb-6 max-w-sm">
              Import music using the sidebar button to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 pb-8">
            {tracks.map((track) => (
              <MusicListItem key={track.id} track={track} context={tracks} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
