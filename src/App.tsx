import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicControler from "./components/ui/music-controler";
import MusicCard from "./components/ui/music-card";
import { useEffect, useState, useCallback } from "react";
import { getTracks, Track } from "./lib/api";
import { AudioProvider } from "./context/audio-context";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const loadTracks = useCallback(async () => {
    try {
      const data = await getTracks();
      setTracks(data);
    } catch (error) {
      console.error("Failed to load tracks:", error);
    }
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const handleFolderImport = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        setIsScanning(true);
        console.log("Scanning folder:", selected);
        // scan_music_library expects 'folders' as Vec<String>
        await invoke("scan_music_library", { folders: [selected] });
        await loadTracks();
      }
    } catch (error) {
      console.error("Failed to import folder:", error);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <AudioProvider>
      <main
        id="app"
        className="selection:bg-white/10 dark h-dvh w-dvw p-6 overflow-hidden flex flex-col"
      >
        <div className="flex flex-1 gap-6 min-h-0 debug">
          {/* Sidebar */}
          <div className="flex flex-col debug gap-6 w-16 shrink-0 h-full">
            <div
              id="folder_input"
              onClick={handleFolderImport}
              className={`aspect-square w-full rounded-lg bg-white/5 hover:outline hover:outline-gray-850 transition-all cursor-pointer ${
                isScanning ? "animate-pulse border-blue-500 border" : ""
              }`}
              title="Import Music Folder"
            />
            <div className="flex-1 w-full rounded-lg bg-white/5 hover:outline hover:outline-gray-850 transition-all" />
          </div>

          {/* Main Content */}
          <div className="flex flex-1 flex-col min-h-0 debug">
            <h1 className="text-3xl font-bold ml-1">Songs</h1>

            {/* Song List */}
            <div
              id="song-list"
              className="flex flex-col flex-1 overflow-y-auto gap-2 p-2"
            >
              {tracks.length === 0 ? (
                <div className="text-gray-500 text-center p-4">
                  {isScanning
                    ? "Scanning..."
                    : "No songs found. Click the box on the left to import music."}
                </div>
              ) : (
                tracks.map((track) => (
                  <MusicCard key={track.id} track={track} context={tracks} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Music Controler */}
        <MusicControler />
      </main>
    </AudioProvider>
  );
}
