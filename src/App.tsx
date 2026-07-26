import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicController from "@features/player/components/music-controller";
import { useEffect, useState, lazy, Suspense } from "react";
import { useAudioStore } from "./stores/audio-store";
import {
  useKeyboardShortcuts,
  useGlobalKeydownListener,
} from "@/hooks/use-keyboard-shortcuts";
import { useFocusRegionStore } from "@/stores/focus-region-store";
import { useSettingsStore } from "@/stores/settings-store";
import { KeyboardShortcutsOverlay } from "@/components/shared/keyboard-shortcuts-overlay";

import MainContent from "@features/shell/components/main-content";
import { BackgroundGradient } from "@features/shell/components/background-gradient";
import { SidebarSection } from "@features/shell/components/sidebar-section";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

import {
  useWindowCloseHandler,
  useRefreshInterceptor,
  useScanProgressListener,
  useAppInit,
} from "@/hooks/use-app-init";
import type { CloseAction } from "@/hooks/use-app-init";
import { useFolderImport } from "@features/settings/hooks/use-folder-import";

import { TitleBar } from "@features/shell/components/titlebar";
import { useProfileStore } from "@/stores/profile-store";
import { AppDialogs } from "@features/shell/components/app-dialogs";
import { ShellStates } from "@features/shell/components/shell-states";
import { useDialogStore } from "@/stores/dialog-store";

import { useContentStore } from "@features/library/store/content-store";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { useProfileTheme } from "@/hooks/use-profile-theme";
import { useFocusTracking } from "@/hooks/use-focus-tracking";
import { useTrackGradient } from "@/hooks/use-track-gradient";
import { useScanOnStartup } from "@/hooks/use-scan-on-startup";
import { useProfileSwitch } from "@/hooks/use-profile-switch";
import { useSelectionStore } from "@/stores/selection-store";
import { useCurrentPage, useDetailView } from "@/stores/navigation-store";
import { BatchActionsBar } from "@/components/shared/batch-actions-bar";
import { PlaylistSelectorDialog } from "@/components/dialogs/playlist-selector-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { removeTrackFromPlaylist } from "@/lib/api";

const SidePanelContent = lazy(
  () => import("@features/shell/components/side-panel-content"),
);
const GlobalSearch = lazy(() =>
  import("@features/search/components/global-search").then((m) => ({
    default: m.GlobalSearch,
  })),
);

function AppBatchBar() {
  const currentPage = useCurrentPage();
  const detailView = useDetailView();
  const isPlayerVisible = useAudioStore(
    (s) => !!(s.currentTrack && s.status !== "stopped"),
  );
  const tracks = useContentStore((s) => s.tracks);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  let entityType: "track" | "album" | "artist" | "playlist" | null = null;

  if (detailView?.type === "playlist") entityType = "track";
  else if (detailView?.type === "album") entityType = "track";
  else if (detailView?.type === "artist") entityType = "track";
  else if (currentPage === "songs") entityType = "track";
  else if (currentPage === "albums") entityType = "album";
  else if (currentPage === "artists") entityType = "artist";
  else if (currentPage === "playlists") entityType = "playlist";

  if (!entityType) return null;

  const handleAddToQueue = () => {
    const ids = useSelectionStore.getState().getSelectedIds();
    const addToQueue = useAudioStore.getState().addToQueue;
    if (entityType === "track") {
      ids.forEach((id) => {
        const track = tracks.find((t) => t.id === id);
        if (track) addToQueue(track);
      });
    }
    useSelectionStore.getState().disableCheckboxMode();
  };

  const handlePlayNext = () => {
    const ids = useSelectionStore.getState().getSelectedIds();
    const playNext = useAudioStore.getState().playNext;
    if (entityType === "track") {
      for (let i = ids.length - 1; i >= 0; i--) {
        const track = tracks.find((t) => t.id === ids[i]);
        if (track) playNext(track);
      }
    }
    useSelectionStore.getState().disableCheckboxMode();
  };

  const handleAddToPlaylist = () => {
    setPlaylistDialogOpen(true);
  };

  const handlePlaylistDialogComplete = () => {
    useSelectionStore.getState().disableCheckboxMode();
  };

  const isPlaylistDetail = detailView?.type === "playlist";
  const playlistId = isPlaylistDetail ? detailView.id : null;

  const handleRemoveFromPlaylist = () => {
    setRemoveDialogOpen(true);
  };

  const confirmRemoveFromPlaylist = async () => {
    const ids = useSelectionStore.getState().getSelectedIds();
    if (!playlistId || ids.length === 0) return;
    setIsRemoving(true);
    try {
      for (const trackId of ids) {
        await removeTrackFromPlaylist(playlistId, trackId);
      }
      useSelectionStore.getState().disableCheckboxMode();
      toast.success(`Removed ${ids.length} track${ids.length !== 1 ? "s" : ""} from playlist`);
    } catch (e) {
      logger.error("Failed to remove tracks from playlist", e);
      toast.error("Failed to remove tracks");
    } finally {
      setIsRemoving(false);
      setRemoveDialogOpen(false);
    }
  };

  return (
    <>
      <div
        className="absolute left-0 right-0 z-40"
        style={{ bottom: isPlayerVisible ? "156px" : "0" }}
      >
        <BatchActionsBar
          entityType={entityType}
          onAddToPlaylist={entityType === "track" ? handleAddToPlaylist : undefined}
          onAddToQueue={entityType === "track" ? handleAddToQueue : undefined}
          onPlayNext={entityType === "track" ? handlePlayNext : undefined}
          onRemove={isPlaylistDetail ? handleRemoveFromPlaylist : undefined}
        />
      </div>
      <PlaylistSelectorDialog
        open={playlistDialogOpen}
        onOpenChange={setPlaylistDialogOpen}
        onComplete={handlePlaylistDialogComplete}
      />
      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remove Tracks?"
        description="This will remove the selected tracks from this playlist. The tracks will remain in your library."
        confirmText="Remove"
        variant="destructive"
        onConfirm={confirmRemoveFromPlaylist}
        isLoading={isRemoving}
        loadingText="Removing..."
      />
    </>
  );
}

export default function App() {
  const sidePanel = useAudioStore((s) => s.sidePanel);
  const initListeners = useAudioStore((s) => s.initListeners);
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const status = useAudioStore((s) => s.status);

  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);
  const isPlaying = status === "playing";

  useRefreshInterceptor(isPlaying, () =>
    useDialogStore.getState().setIsRefreshWarningOpen(true),
  );

  const handleConfirmRefresh = async () => {
    await useAudioStore.getState().stop();
    useDialogStore.getState().setIsRefreshWarningOpen(false);
    window.location.reload();
  };

  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const isProfilesLoading = useProfileStore((s) => s.isLoading);
  const profilesMap = useProfileStore((s) => s.profilesMap);
  const activeProfile = activeProfileId
    ? profilesMap.get(activeProfileId)
    : undefined;

  useProfileTheme();
  useKeyboardShortcuts();
  useGlobalKeydownListener();
  useFocusTracking();

  const isPlayerVisible = !!currentTrack && status !== "stopped";

  const { handleProfileClick, confirmProfileSwitch } = useProfileSwitch();

  useAppInit();

  const { handleFolderImport, isScanning, setIsScanning } = useFolderImport();
  useScanOnStartup(activeProfileId, setIsScanning);

  const gradientColor = useTrackGradient();

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

  useScanProgressListener(async () => {
    await useContentStore.getState().fetchContent();
    await usePlaylistStore.getState().fetchPlaylists();
  });

  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  useEffect(() => {
    const cleanup = useSettingsStore.getState().initSystemThemeListener();
    return cleanup;
  }, []);

  const queue = useAudioStore((s) => s.queue);

  useEffect(() => {
    if (sidePanel === "queue" && queue.length === 0) {
      useAudioStore.getState().setSidePanel("none");
    }
  }, [sidePanel, queue.length]);

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

        <div className="flex-1 min-w-0 min-h-0 flex">
          <div
            data-region="main"
            tabIndex={-1}
            className="flex-1 min-w-0 min-h-0 flex flex-col relative"
            onFocus={() =>
              useFocusRegionStore.getState().setActiveRegion("main")
            }
          >
            <div className="flex-1 min-h-0">
              <MainContent />
            </div>
            <AppBatchBar />
          </div>

          <div
            data-region="sidepanel"
            data-region-visible={sidePanel !== "none" ? "true" : "false"}
            tabIndex={-1}
            className={`pt-6 shrink-0 h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out z-40 ${
              sidePanel !== "none" ? "w-96 p-px" : "w-0 p-0"
            } ${isPlayerVisible ? "pb-player-bar" : "pb-6"}`}
            onFocus={() =>
              useFocusRegionStore.getState().setActiveRegion("sidepanel")
            }
          >
            <Suspense fallback={null}>
              <SidePanelContent />
            </Suspense>
          </div>
        </div>
      </div>

      <div
        data-region="player"
        data-region-visible={isPlayerVisible ? "true" : "false"}
        tabIndex={-1}
        className={`fixed bottom-0 left-0 right-0 p-6 transition-all duration-300 ease-in-out z-50 pointer-events-none ${
          isPlayerVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        }`}
        onFocus={() => useFocusRegionStore.getState().setActiveRegion("player")}
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
      <KeyboardShortcutsOverlay />
    </main>
  );
}
