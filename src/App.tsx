import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicController from "./components/ui/music-controller";
import { useEffect, useState } from "react";
import { useAudioStore } from "./stores/audio-store";
import { usePlaylistStore } from "./stores/playlist-store";
import NavigationMenu from "./components/ui/navigation-menu";
import QueueMenu from "./components/ui/queue-menu";
import MainContent from "./components/main-content";
import { GlobalSearch } from "./components/ui/global-search";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
// import type { Track } from "@/lib/api";

import { getDominantColor } from "./lib/color-utils";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settings-store";

export default function App() {
  const isQueueOpen = useAudioStore((s) => s.isQueueOpen);
  const initListeners = useAudioStore((s) => s.initListeners);
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const [isScanning, setIsScanning] = useState(false);
  const [gradientColor, setGradientColor] = useState<string>("transparent");

  const { theme, dynamicGradient, loadSettings } = useSettingsStore();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update gradient when track changes
  useEffect(() => {
    if (currentTrack?.artwork_path) {
      const src = convertFileSrc(currentTrack.artwork_path);
      getDominantColor(src).then((color) => setGradientColor(color));
    } else {
      setGradientColor("transparent");
    }
  }, [currentTrack]);

  // Initialize audio event listeners
  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  // Load playlists once on app startup (centralized fetch)
  const fetchPlaylists = usePlaylistStore((s) => s.fetchPlaylists);
  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // Auto-close queue when empty
  const queue = useAudioStore((s) => s.queue);
  const toggleQueue = useAudioStore((s) => s.toggleQueue);

  useEffect(() => {
    if (isQueueOpen && queue.length === 0) {
      toggleQueue();
    }
  }, [isQueueOpen, queue.length, toggleQueue]);

  const handleFolderImport = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        setIsScanning(true);
        console.log("Scanning folder:", selected);
        await invoke("scan_music_library", { folders: [selected] });
        // Optional: trigger a global event or store action to refresh views
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
      className={`selection:bg-white/10 h-dvh w-dvw px-6 overflow-hidden flex flex-col gap-4 relative ${
        theme === "dark" || theme === "system" ? "dark" : ""
      }`}
    >
      {/* Background Gradient */}
      <div
        className="fixed top-0 left-0 right-0 h-96 pointer-events-none transition-colors duration-1000 ease-in-out z-0 opacity-25"
        style={{
          backgroundColor: dynamicGradient ? gradientColor : "transparent",
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <div className="flex flex-1 gap-6 min-h-0 relative z-10">
        {/* Sidebar */}
        <div className="mt-2 pt-6 flex flex-col gap-10 w-16 shrink-0 h-full pb-32">
          <div
            id="folder_input"
            className="aspect-square w-full rounded-lg bg-white/5"
            title="User Profile"
          />
          <div className="flex justify-center h-full">
            <NavigationMenu
              onImport={handleFolderImport}
              isScanning={isScanning}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 min-h-0 flex">
          <MainContent />

          {/* Queue Menu */}
          <div
            className={`pb-42 pt-6 shrink-0 h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out z-40 ${
              isQueueOpen ? "w-96 p-1" : "w-0 p-0"
            }`}
          >
            <QueueMenu />
          </div>
        </div>
      </div>

      {/* Music Controller */}
      <div
        className={`fixed bottom-0 left-0 right-0 p-7 transition-all duration-300 ease-in-out z-50 pointer-events-none ${
          currentTrack
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        }`}
      >
        <MusicController />
      </div>
      <GlobalSearch />
    </main>
  );
}
