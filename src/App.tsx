import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicControler from "./components/ui/music-controler";
import MusicCard from "./components/ui/music-card";
import { useEffect, useState, useCallback } from "react";
import { getTracks, Track } from "./lib/api";
import { useQueueOpen, useAudioStore } from "./stores/audio-store";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import NavigationMenu from "./components/ui/nagivation-menu";
import QueueMenu from "./components/ui/queue-menu";

export default function App() {
  const isQueueOpen = useQueueOpen();
  const initListeners = useAudioStore((s) => s.initListeners);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Initialize audio event listeners
  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

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
    <main
      id="app"
      className="selection:bg-white/10 dark h-dvh w-dvw p-6 overflow-hidden flex flex-col gap-4"
    >
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Sidebar */}
        <div className="flex flex-col gap-12 w-16 shrink-0 h-full">
          <div
            id="folder_input"
            onClick={handleFolderImport}
            className={`aspect-square w-full rounded-lg bg-white/5 hover:outline hover:outline-gray-850 transition-all cursor-pointer ${
              isScanning ? "animate-pulse border-blue-500 border" : ""
            }`}
            title="Import Music Folder"
          />
          <div className="flex justify-center h-full">
            <NavigationMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex gap-4">
          <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
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
                  <MusicCard key={track.id} track={track} />
                ))
              )}
            </div>
          </div>
          <div
            className={`shrink-0 h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out ${
              isQueueOpen ? "w-96 p-1" : "w-0 p-0"
            }`}
          >
            <QueueMenu />
          </div>
        </div>
      </div>

      {/* Music Controler */}
      <MusicControler />
    </main>
  );
}
