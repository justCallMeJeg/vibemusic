import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicController from "./components/music-controller";
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useAudioStore } from "./stores/audio-store";

import MainContent from "./components/main-content";
import { BackgroundGradient } from "./components/background-gradient";
import { SidebarSection } from "./components/sidebar-section";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { getDominantColor } from "./lib/color-utils";
import {
  useWindowCloseHandler,
  useRefreshInterceptor,
  useScanProgressListener,
  useAppInit,
} from "@/hooks/use-app-init";
import type { CloseAction } from "@/hooks/use-app-init";
import { useFolderImport } from "@/hooks/use-folder-import";
import { useSettingsStore } from "@/stores/settings-store";

import { TitleBar } from "./components/titlebar";
import { useProfileStore } from "@/stores/profile-store";
import { AppDialogs } from "./components/app-dialogs";
import { ShellStates } from "@/components/shell-states";
import { useDialogStore } from "@/stores/dialog-store";

import { useLibraryStore } from "@/stores/library-store";
import { logger } from "@/lib/logger";
import { useProfileTheme } from "@/hooks/use-profile-theme";



const QueueMenu = lazy(() => import("./components/queue-menu"));
const TrackDetailPanel = lazy(() => import("./components/track-detail-panel"));
const LyricsPanel = lazy(() => import("./components/lyrics-panel"));
const GlobalSearch = lazy(() =>
  import("./components/dialogs/global-search").then((m) => ({
    default: m.GlobalSearch,
  })),
);

export default function App() {
  const sidePanel = useAudioStore((s) => s.sidePanel);
  const initListeners = useAudioStore((s) => s.initListeners);
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const status = useAudioStore((s) => s.status);
  const [gradientColor, setGradientColor] = useState<string>("transparent");

  const stop = useAudioStore((s) => s.stop);

  // Refresh Warning State
  const isPlaying = status === "playing";

  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);
  const initSystemThemeListener = useSettingsStore(
    (s) => s.initSystemThemeListener,
  );


  useRefreshInterceptor(isPlaying, () => useDialogStore.getState().setIsRefreshWarningOpen(true));

  const handleConfirmRefresh = async () => {
    await stop();
    useDialogStore.getState().setIsRefreshWarningOpen(false);
    window.location.reload();
  };

  const fetchLibrary = useLibraryStore((s) => s.fetchLibrary);

  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const selectProfile = useProfileStore((s) => s.selectProfile);
  const isProfilesLoading = useProfileStore((s) => s.isLoading);
  const profilesMap = useProfileStore((s) => s.profilesMap);
  const activeProfile = activeProfileId ? profilesMap.get(activeProfileId) : undefined;

  useProfileTheme();

  const isPlayerVisible = !!currentTrack && status !== "stopped";

  const handleProfileClick = () => {
    // Check if playback is active
    if (currentTrack && (status === "playing" || status === "paused")) {
      useDialogStore.getState().setShowProfileSwitchWarning(true);
    } else {
      selectProfile(null);
    }
  };

  const confirmProfileSwitch = async () => {
    await stop();
    useDialogStore.getState().setShowProfileSwitchWarning(false);
    selectProfile(null);
  };

  useAppInit();


  const hasDoneInitialScan = useRef(false);

  useEffect(() => {
    if (activeProfileId) {
      const settings = useSettingsStore.getState();
      if (
        !hasDoneInitialScan.current &&
        settings.scanOnStartup &&
        settings.libraryPaths.length > 0
      ) {
        hasDoneInitialScan.current = true;
        setIsScanning(true);
        invoke("scan_music_library", { folders: settings.libraryPaths })
          .then(() => fetchLibrary())
          .catch((err) => logger.error("Startup scan failed:", err))
          .finally(() => setIsScanning(false));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId, fetchLibrary]);

  const handleQuitApp = async () => {
    useDialogStore.getState().closeQuitDialog();
    useDialogStore.getState().closeCloseToTrayDialog();
    await invoke("quit_app");
  };

  const handleCloseToTrayHide = async () => {
    useDialogStore.getState().closeCloseToTrayDialog();
    await getCurrentWindow().hide();
  };

  useWindowCloseHandler((action: CloseAction) => {
    switch (action) {
      case "show-quit-dialog":
        useDialogStore.getState().openQuitDialog();
        break;
      case "show-close-to-tray-dialog":
        useDialogStore.getState().openCloseToTrayDialog();
        break;
      case "quit-directly":
        handleQuitApp();
        break;
    }
  });

  // Listen for global scan progress to refresh library - extracted to custom hook
  useScanProgressListener(fetchLibrary);

  const isPlaybackActive = status === "playing" || status === "paused";

  // Update gradient when track changes - only show when actually playing/paused
  useEffect(() => {
    if (!isPlaybackActive) {
      setGradientColor("transparent");
      return;
    }

    if (currentTrack?.artwork_path) {
      const src = convertFileSrc(currentTrack.artwork_path);
      let cancelled = false;
      getDominantColor(src).then((color) => {
        if (!cancelled) setGradientColor(color);
      });
      return () => { cancelled = true; };
    } else {
      setGradientColor("transparent");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, isPlaybackActive]);

  // Initialize audio event listeners
  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  // Initialize system theme listener
  useEffect(() => {
    const cleanup = initSystemThemeListener();
    return cleanup;
  }, [initSystemThemeListener]);

  const { handleFolderImport, isScanning, setIsScanning } = useFolderImport();

  // Auto-close queue when empty
  const queue = useAudioStore((s) => s.queue);
  const setSidePanel = useAudioStore((s) => s.setSidePanel);

  useEffect(() => {
    if (sidePanel === "queue" && queue.length === 0) {
      setSidePanel("none");
    }
  }, [sidePanel, queue.length, setSidePanel]);

  if (isProfilesLoading || !activeProfileId) {
    return (
      <ShellStates
        isProfilesLoading={isProfilesLoading}
        activeProfileId={activeProfileId}
        onConfirmQuit={handleQuitApp}
        onConfirmCloseToTrayHide={handleCloseToTrayHide}
        confirmProfileSwitch={confirmProfileSwitch}
        handleConfirmRefresh={handleConfirmRefresh}
      />
    );
  }

  return (
    <main
      id="app"
      className={`selection:bg-white/10 h-dvh w-dvw overflow-hidden flex flex-col relative px-6 gap-4 ${
        resolvedTheme === "dark" ? "dark" : ""
      }`}
    >
      <TitleBar />

      <BackgroundGradient gradientColor={gradientColor} />

      <div className="flex flex-1 gap-6 min-h-0 relative z-10 pt-10">
        <SidebarSection
          activeProfile={activeProfile}
          onProfileClick={handleProfileClick}
          onImport={handleFolderImport}
          isScanning={isScanning}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 min-h-0 flex">
          <MainContent />

          {/* Queue Menu / Track Detail Panel */}
          <div
            className={`pt-6 shrink-0 h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out z-40 ${
              sidePanel !== "none" ? "w-96 p-1" : "w-0 p-0"
            } ${isPlayerVisible ? "pb-player-bar" : "pb-6"}`}
          >
            <Suspense fallback={null}>
              <QueueMenu />
              <TrackDetailPanel />
              <LyricsPanel />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Music Controller */}
      <div
        className={`fixed bottom-0 left-0 right-0 p-6 transition-all duration-300 ease-in-out z-50 pointer-events-none ${
          isPlayerVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        }`}
      >
        <MusicController />
      </div>
      <Suspense fallback={null}>
        <GlobalSearch />
      </Suspense>

      <AppDialogs
        onConfirmQuit={handleQuitApp}
        onConfirmCloseToTrayHide={handleCloseToTrayHide}
        confirmProfileSwitch={confirmProfileSwitch}
        handleConfirmRefresh={handleConfirmRefresh}
      />
    </main>
  );
}
