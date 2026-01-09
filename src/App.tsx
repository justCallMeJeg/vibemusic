import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicControler from "./components/ui/music-controler";
import MusicCard from "./components/ui/music-card";
import { useEffect, useState } from "react";
import { getTracks, Track } from "./lib/api";
import { AudioProvider } from "./context/audio-context";

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    async function loadTracks() {
      try {
        const data = await getTracks();
        setTracks(data);
      } catch (error) {
        console.error("Failed to load tracks:", error);
      }
    }
    loadTracks();
  }, []);

  return (
    <AudioProvider>
      <main
        id="app"
        className="selection:bg-white/10 dark h-dvh w-dvw p-6 overflow-hidden flex flex-col"
      >
        <div className="flex flex-1 gap-6 min-h-0 debug">
          <div className="flex flex-col debug gap-6 w-16 shrink-0 h-full">
            <div className="aspect-square w-full rounded-lg bg-white/5 hover:outline hover:outline-gray-850 transition-all" />
            <div className="flex-1 w-full rounded-lg bg-white/5 hover:outline hover:outline-gray-850 transition-all" />
          </div>
          <div className="flex flex-1 flex-col min-h-0 debug">
            <h1 className="text-3xl font-bold ml-1">Songs</h1>

            {/* Main Song List */}
            <div
              id="song-list"
              className="flex flex-col flex-1 overflow-y-auto gap-2 p-2"
            >
              {tracks.length === 0 ? (
                <div className="text-gray-500 text-center p-4">
                  No songs found.
                </div>
              ) : (
                tracks.map((track) => (
                  <MusicCard key={track.id} track={track} context={tracks} />
                ))
              )}
            </div>
          </div>
        </div>

        <MusicControler />
      </main>
    </AudioProvider>
  );
}
