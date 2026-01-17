import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicController from "./components/music-controller";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAudioStore } from "./stores/audio-store";

import NavigationMenu from "./components/navigation-menu";
import QueueMenu from "./components/queue-menu";
import TrackDetailPanel from "./components/track-detail-panel";
import LyricsPanel from "./components/lyrics-panel";
import MainContent from "./components/main-content";
import { GlobalSearch } from "./components/dialogs/global-search";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

import { getDominantColor } from "./lib/color-utils";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useSettingsStore } from "@/stores/settings-store";
import { useNavigationStore, Page } from "@/stores/navigation-store";

import { TitleBar } from "./components/titlebar";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useProfileStore } from "@/stores/profile-store";
import ProfileSelectionPage from "@/pages/profile-selection-page";

import { useLibraryStore } from "@/stores/library-store";
import { logger } from "@/lib/logger";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useUpdateStore } from "./stores/update-store";
import { DownloadProgress } from "@/stores/settings-store";

import { FFmpegSetupDialog } from "./components/dialogs/ffmpeg-setup-dialog";
import MiniPlayer from "./components/mini-player";

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

export default function App() {
  const isMiniPlayer = useNavigationStore((s) => s.isMiniPlayer);
  const sidePanel = useAudioStore((s) => s.sidePanel);
  const initListeners = useAudioStore((s) => s.initListeners);
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const status = useAudioStore((s) => s.status); // Get status directly or use selector
  const [isScanning, setIsScanning] = useState(false);
  const [gradientColor, setGradientColor] = useState<string>("transparent");
  const [isQuitDialogOpen, setIsQuitDialogOpen] = useState(false);
  const [showProfileSwitchWarning, setShowProfileSwitchWarning] =
    useState(false);
  const [isFFmpegReady, setIsFFmpegReady] = useState(false);
  const hasCheckedForUpdate = useRef(false);
  const hasDoneInitialScan = useRef(false); // Prevent scan on profile switch
  const stop = useAudioStore((s) => s.stop);

  // Refresh Warning State
  const [isRefreshWarningOpen, setIsRefreshWarningOpen] = useState(false);
  const isPlaying = status === "playing";

  // Individual selectors for better re-render performance
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);
  const dynamicGradient = useSettingsStore((s) => s.dynamicGradient);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const isSettingsLoading = useSettingsStore((s) => s.isLoading);
  const addLibraryPath = useSettingsStore((s) => s.addLibraryPath);
  const libraryPaths = useSettingsStore((s) => s.libraryPaths);
  const initSystemThemeListener = useSettingsStore(
    (s) => s.initSystemThemeListener
  );
  const updateFFmpegDownloadProgress = useSettingsStore(
    (s) => s.updateFFmpegDownloadProgress
  );

  // Global FFmpeg download listener
  useEffect(() => {
    const unlistenPromise = listen<DownloadProgress>(
      "download-progress",
      (event) => {
        updateFFmpegDownloadProgress(event.payload);
      }
    );
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [updateFFmpegDownloadProgress]);

  // Intercept Refresh Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for F5 or Ctrl+R (Cmd+R on Mac)
      const isRefresh =
        e.key === "F5" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r");

      if (isRefresh && isPlaying) {
        e.preventDefault();
        setIsRefreshWarningOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  const handleConfirmRefresh = async () => {
    await stop();
    setIsRefreshWarningOpen(false);
    window.location.reload();
  };

  // Library Store Initialization
  // NOTE: Library is fetched in selectProfile() when a profile is selected.
  // We don't need to fetch here since that would race with profile selection.
  const fetchLibrary = useLibraryStore((s) => s.fetchLibrary);

  // Individual selectors for profile store
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const profiles = useProfileStore((s) => s.profiles);
  const loadProfiles = useProfileStore((s) => s.loadProfiles);
  const selectProfile = useProfileStore((s) => s.selectProfile);
  const isProfilesLoading = useProfileStore((s) => s.isLoading);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const isPlayerVisible = !!currentTrack && status !== "stopped";

  const handleProfileClick = () => {
    // Check if playback is active
    if (currentTrack && (status === "playing" || status === "paused")) {
      setShowProfileSwitchWarning(true);
    } else {
      selectProfile(null);
    }
  };

  const confirmProfileSwitch = async () => {
    await stop();
    setShowProfileSwitchWarning(false);
    selectProfile(null);
  };

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

      // Only run scanOnStartup on INITIAL app load, not when switching profiles
      if (
        !hasDoneInitialScan.current &&
        isFFmpegReady &&
        settings.scanOnStartup &&
        settings.libraryPaths.length > 0
      ) {
        hasDoneInitialScan.current = true;
        logger.info(
          "Auto-scanning library paths on startup:",
          settings.libraryPaths
        );
        setIsScanning(true);
        invoke("scan_music_library", { folders: settings.libraryPaths })
          .then(async () => {
            await fetchLibrary();
          })
          .catch((err) => logger.error("Startup scan failed:", err))
          .finally(() => setIsScanning(false));
      }

      // Check for updates
      if (!hasCheckedForUpdate.current) {
        hasCheckedForUpdate.current = true;
        const updateStore = useUpdateStore.getState();
        updateStore.check(true).then((hasUpdate) => {
          if (hasUpdate) {
            toast.info("Update Available", {
              description: "A new version of vibemusic is available.",
              action: {
                label: "View",
                onClick: () => {
                  useNavigationStore.getState().setPage("about"); // Navigate to settings/about
                },
              },
              duration: 10000,
            });
          }
        });
      }
    }
  }, [isSettingsLoading, activeProfileId, fetchLibrary, isFFmpegReady]);

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

    // Show window once App is ready to prevent white flash
    appWindow.show();

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Listen for global scan progress to refresh library
  useEffect(() => {
    const unlistenPromise = listen(
      "scan-progress",
      (event: { payload: { status: string } }) => {
        if (event.payload?.status === "complete") {
          logger.info("Scan complete event received, refreshing library...");
          fetchLibrary();
        }
      }
    );
    return () => {
      unlistenPromise.then((u) => u());
    };
  }, [fetchLibrary]);

  // Update gradient when track changes - only show when actually playing/paused
  useEffect(() => {
    // Only show gradient when playing or paused (not during loading/stopped)
    if (status === "loading" || status === "stopped") {
      setGradientColor("transparent");
      return;
    }

    if (currentTrack?.artwork_path) {
      const src = convertFileSrc(currentTrack.artwork_path);
      getDominantColor(src).then((color) => setGradientColor(color));
    } else {
      setGradientColor("transparent");
    }
  }, [currentTrack, status]);

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

  // Auto-close queue when empty
  const queue = useAudioStore((s) => s.queue);
  const setSidePanel = useAudioStore((s) => s.setSidePanel);

  useEffect(() => {
    if (sidePanel === "queue" && queue.length === 0) {
      setSidePanel("none");
    }
  }, [sidePanel, queue.length, setSidePanel]);

  const handleFolderImport = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        setIsScanning(true);
        const toastId = toast.loading(`Importing ${selected}...`);
        logger.info("Importing folder:", selected);

        let stats;

        if (!libraryPaths.includes(selected)) {
          // New folder: Add to settings (returns stats)
          stats = await addLibraryPath(selected);
          logger.info("Added folder to settings:", selected);
        } else {
          // Existing folder: Re-scan
          logger.info("Rescanning existing folder:", selected);
          stats = await invoke<{
            scanned_count: number;
            success_count: number;
            error_count: number;
          }>("scan_music_library", { folders: [selected] });
          await fetchLibrary();
        }

        if (stats) {
          if (stats.error_count > 0) {
            toast.warning(`Scan complete with ${stats.error_count} errors`, {
              id: toastId,
              description: `Imported ${stats.success_count} tracks. Check logs for details.`,
            });
          } else {
            toast.success(`Imported ${stats.scanned_count} tracks`, {
              id: toastId,
              description: "Library updated successfully.",
            });
          }
        } else {
          toast.success("Folder added", { id: toastId });
        }
      }
    } catch (error) {
      logger.error("Failed to import folder:", error);
      toast.error("Failed to import folder", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsScanning(false);
    }
  }, [addLibraryPath, fetchLibrary, libraryPaths]);

  const quitDialog = (
    <ConfirmDialog
      open={isQuitDialogOpen}
      onOpenChange={setIsQuitDialogOpen}
      title="Are you sure you want to quit?"
      description='Playback will stop. You can enable "Close to Tray" in settings to keep music playing in the background.'
      confirmText="Quit"
      variant="destructive"
      onConfirm={() => getCurrentWindow().destroy()}
    />
  );

  if (isProfilesLoading) {
    return (
      <div className="h-screen w-screen bg-background text-foreground relative flex flex-col">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-foreground/10" />
            <div className="w-32 h-4 rounded-full bg-foreground/10" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeProfileId) {
    return (
      <div className="h-screen w-screen bg-background text-foreground relative flex flex-col">
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
      className={`selection:bg-white/10 h-dvh w-dvw overflow-hidden flex flex-col relative ${
        !isMiniPlayer ? "px-6 gap-4" : "p-0"
      } ${resolvedTheme === "dark" ? "dark" : ""}`}
    >
      {/* Custom Title Bar */}
      {!isMiniPlayer && <TitleBar />}

      {isMiniPlayer ? (
        <MiniPlayer />
      ) : (
        <>
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
            <div className="mt-2 pt-6 flex flex-col gap-6 w-16 shrink-0 h-full pb-32">
              <div
                id="user_profile"
                onClick={handleProfileClick}
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

              {/* Queue Menu / Track Detail Panel */}
              <div
                className={`pt-6 shrink-0 h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out z-40 ${
                  sidePanel !== "none" ? "w-96 p-1" : "w-0 p-0"
                } ${isPlayerVisible ? "pb-39" : "pb-6"}`}
              >
                <QueueMenu />
                <TrackDetailPanel />
                <LyricsPanel />
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
        </>
      )}
      <GlobalSearch />

      {!isFFmpegReady && (
        <FFmpegSetupDialog onReady={() => setIsFFmpegReady(true)} />
      )}

      {quitDialog}
      <ConfirmDialog
        open={showProfileSwitchWarning}
        onOpenChange={setShowProfileSwitchWarning}
        title="Stop Playback?"
        description="Switching profiles will stop the current playback. Do you want to continue?"
        confirmText="Switch Profile"
        onConfirm={confirmProfileSwitch}
      />

      <AlertDialog
        open={isRefreshWarningOpen}
        onOpenChange={setIsRefreshWarningOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Playback and Refresh?</AlertDialogTitle>
            <AlertDialogDescription>
              Refreshing the app will stop the current playback. Are you sure
              you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRefresh}>
              Refresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </main>
  );
}
