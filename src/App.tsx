import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicController from "./components/ui/music-controller";
import { useEffect } from "react";
import { useQueueOpen, useAudioStore } from "./stores/audio-store";
import NavigationMenu from "./components/ui/navigation-menu";
import QueueMenu from "./components/ui/queue-menu";
import MainContent from "./components/main-content";
import { GlobalSearch } from "./components/ui/global-search";

export default function App() {
  const isQueueOpen = useQueueOpen();
  const initListeners = useAudioStore((s) => s.initListeners);

  // Initialize audio event listeners
  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

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
            className="aspect-square w-full rounded-lg bg-white/5"
            title="User Profile"
          />
          <div className="flex justify-center h-full">
            <NavigationMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex gap-4">
          <MainContent />

          {/* Queue Menu */}
          <div
            className={`shrink-0 h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out ${
              isQueueOpen ? "w-96 p-1" : "w-0 p-0"
            }`}
          >
            <QueueMenu />
          </div>
        </div>
      </div>

      {/* Music Controller */}
      <MusicController />
      <GlobalSearch />
    </main>
  );
}
