import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicController from "./components/music-controller";
import { useEffect, useState } from "react";
import { useAudioStore } from "./stores/audio-store";

import NavigationMenu from "./components/navigation-menu";
import QueueMenu from "./components/queue-menu";
import MainContent from "./components/main-content";
import { GlobalSearch } from "./components/dialogs/global-search";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
// import type { Track } from "@/lib/api";

import { getDominantColor } from "./lib/color-utils";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettingsStore } from "@/stores/settings-store";
import { useNavigationStore, Page } from "@/stores/navigation-store";

import { TitleBar } from "./components/titlebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProfileStore } from "@/stores/profile-store";
import ProfileSelectionPage from "@/pages/profile-selection-page";

import { useLibraryStore } from "@/stores/library-store";
import { logger } from "@/lib/logger";

// ... (imports)

export default function App() {
  const isQueueOpen = useAudioStore((s) => s.isQueueOpen);
  const initListeners = useAudioStore((s) => s.initListeners);
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const status = useAudioStore((s) => s.status); // Get status directly or use selector
  const [isScanning, setIsScanning] = useState(false);
  const [gradientColor, setGradientColor] = useState<string>("transparent");
  const [isQuitDialogOpen, setIsQuitDialogOpen] = useState(false);

  const {
    theme,
    dynamicGradient,
    loadSettings,
    isLoading: isSettingsLoading,
  } = useSettingsStore();

  // Library Store Initialization
  const fetchLibrary = useLibraryStore((s) => s.fetchLibrary);
  useEffect(() => {
    fetchLibrary();

    // Listen for scan completion to refresh library
    // We can assume scan_music_library invokes might trigger an event,
    // or we just manually refresh after the import action below.
    // For now, let's just fetch on mount.
  }, [fetchLibrary]);

  const {
    activeProfileId,
    profiles,
    loadProfiles,
    selectProfile,
    isLoading: isProfilesLoading,
  } = useProfileStore();

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const isPlayerVisible = !!currentTrack && status !== "stopped";

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Load settings when profile changes
  useEffect(() => {
    if (activeProfileId) {
      loadSettings(activeProfileId);
    }
  }, [activeProfileId, loadSettings]);

  // Handle defaults after settings load
  useEffect(() => {
    if (!isSettingsLoading && activeProfileId) {
      // Apply settings logic
      const settings = useSettingsStore.getState();
      if (settings.defaultPage) {
        useNavigationStore.getState().setPage(settings.defaultPage as Page);
      }
    }
  }, [isSettingsLoading, activeProfileId]);

  // Handle Close-to-Tray and Quit Confirmation
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      // Prevent default close to handle everything manually
      event.preventDefault();

      const { closeToTray } = useSettingsStore.getState();

      if (closeToTray) {
        await appWindow.hide();
      } else {
        setIsQuitDialogOpen(true);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

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
        logger.info("Scanning folder:", selected);
        await invoke("scan_music_library", { folders: [selected] });

        // Refresh library after scan
        await fetchLibrary();
      }
    } catch (error) {
      logger.error("Failed to import folder:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const quitDialog = (
    <AlertDialog open={isQuitDialogOpen} onOpenChange={setIsQuitDialogOpen}>
      <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to quit?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Playback will stop. You can enable "Close to Tray" in settings to
            keep music playing in the background.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-none"
            onClick={() => getCurrentWindow().destroy()}
          >
            Quit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isProfilesLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
        {/* Loading state can be improved with skeleton or splash */}
      </div>
    );
  }

  if (!activeProfileId) {
    return (
      <div className="h-screen w-screen bg-black text-white relative flex flex-col">
        <TitleBar />
        <div className="flex-1 overflow-hidden">
          <ProfileSelectionPage />
        </div>
        {quitDialog}
      </div>
    );
  }

  return (
    <main
      id="app"
      className={`selection:bg-white/10 h-dvh w-dvw px-6 overflow-hidden flex flex-col gap-4 relative ${
        theme === "dark" || theme === "system" ? "dark" : ""
      }`}
    >
      {/* Custom Title Bar */}
      <TitleBar />

      {/* Background Gradient */}
      <div
        className="fixed top-0 left-0 right-0 h-96 pointer-events-none transition-colors duration-1000 ease-in-out z-0 opacity-25"
        style={{
          backgroundColor: dynamicGradient ? gradientColor : "transparent",
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <div className="flex flex-1 gap-6 min-h-0 relative z-10 pt-10">
        {/* Sidebar */}
        <div className="mt-2 pt-6 flex flex-col gap-10 w-16 shrink-0 h-full pb-32">
          <div
            id="user_profile"
            onClick={() => selectProfile(null)} // Click to switch profile
            className={`aspect-square w-full shrink-0 rounded-lg overflow-hidden ${
              !activeProfile?.avatarPath &&
              (activeProfile?.color || "bg-gray-600")
            } flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition-transform relative`}
            title={`Current: ${
              activeProfile?.name || "User"
            } (Click to switch)`}
          >
            {activeProfile?.avatarPath ? (
              <img
                src={convertFileSrc(activeProfile.avatarPath)}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              activeProfile?.name?.[0]?.toUpperCase()
            )}

            {/* Hover overlay hint? Optional */}
          </div>
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
            className={`pt-6 shrink-0 h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out z-40 ${
              isQueueOpen ? "w-96 p-1" : "w-0 p-0"
            } ${isPlayerVisible ? "pb-42" : "pb-6"}`}
          >
            <QueueMenu />
          </div>
        </div>
      </div>

      {/* Music Controller */}
      <div
        className={`fixed bottom-0 left-0 right-0 p-7 transition-all duration-300 ease-in-out z-50 pointer-events-none ${
          isPlayerVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        }`}
      >
        <MusicController />
      </div>
      <GlobalSearch />

      {quitDialog}
    </main>
  );
}
