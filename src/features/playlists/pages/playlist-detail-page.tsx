import { useEffect, useState, useCallback, useMemo, memo } from "react";
import {
  getPlaylistTracks,
  deletePlaylist,
  removeTrackFromPlaylist,
  Track,
  getPlaylists,
  Playlist,
} from "@/lib/api";
import { useNavigationStore, useDetailView } from "@/stores/navigation-store";
import { useAudioStore } from "@/stores/audio-store";
import { useKeybindsStore } from "@/stores/keybinds-store";
import { useSelectionEscapeKeybind } from "@/hooks/use-selection-escape-keybind";
import { useTrackActivationHandlers } from "@/hooks/use-track-activation-handlers";
import { registerSelectAllAndCleanup } from "@/lib/keybinds";
import { useInteractionStore } from "@/stores/interaction-store";
import { SearchX, Plus, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { EmptyState } from "@/components/shared/empty-state";
import { PlaylistEditDialog } from "@features/playlists/components/playlist-edit-dialog";
import { arrayMove } from "@dnd-kit/sortable";
import { TrackSelectDialog } from "@features/playlists/components/track-select-dialog";
import { DetailPageTemplate } from "@/components/shared/templates/detail-page-template";
import { TrackList } from "@/components/shared/templates/track-list";
import { PlaylistHero } from "@features/playlists/components/playlist-hero";

import { SortableTrackItem } from "@features/playlists/components/sortable-track-item";

export default memo(function PlaylistDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const updateBreadcrumbLabel = useNavigationStore(
    (s) => s.updateBreadcrumbLabel,
  );
  const play = useAudioStore((s) => s.play);
  const reorderPlaylist = usePlaylistStore((s) => s.reorderPlaylist);
  const refreshPlaylists = usePlaylistStore((s) => s.refreshPlaylists);
  const [playlist, setPlaylist] = useState<Playlist | null>(() => {
    const id = detailView?.type === "playlist" ? detailView.id : null;
    if (!id) return null;
    return (
      usePlaylistStore.getState().playlists.find((p) => p.id === id) ?? null
    );
  });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const playlistId = detailView?.type === "playlist" ? detailView.id : null;

  const SCOPE = "page:playlist-detail";
  useEffect(() => {
    const { register, clearScope } = useKeybindsStore.getState();
    register("escape", {
      combo: { key: "Escape" },
      handler: () => goBack(),
      description: "Return to playlists",
      preventDefault: true,
    }, SCOPE);
    register("backspace", {
      combo: { key: "Backspace" },
      handler: () => goBack(),
      description: "Return to playlists",
      preventDefault: true,
    }, SCOPE);
    registerSelectAllAndCleanup(register, clearScope, SCOPE);
    return () => clearScope(SCOPE);
  }, [goBack]);
  useSelectionEscapeKeybind(goBack, SCOPE);

  const loadData = useCallback(async () => {
    if (!playlistId) return;
    setIsLoading(true);
    try {
      const [allPlaylists, tracksData] = await Promise.all([
        getPlaylists(),
        getPlaylistTracks(playlistId),
      ]);

      const found = allPlaylists.find((p) => p.id === playlistId);
      if (found) {
        setPlaylist(found);
        updateBreadcrumbLabel("playlist", playlistId, found.name);
      }
      setTracks(tracksData);
    } catch (error) {
      logger.error("Failed to load playlist", error);
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, updateBreadcrumbLabel]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isLoading && tracks.length > 0 && useInteractionStore.getState().focusSource === "keyboard") {
      requestAnimationFrame(() => {
        const firstItem = document.querySelector<HTMLElement>(
          '[data-item-index="0"]',
        );
        if (firstItem && document.activeElement !== firstItem) {
          firstItem.focus();
        }
      });
    }
  }, [isLoading, tracks.length]);

  const handlePlay = () => {
    if (tracks.length > 0) {
      play(tracks[0], tracks);
    }
  };

  const handleShuffle = useCallback(() => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      play(shuffled[0], shuffled);
    }
  }, [tracks, play]);

  const handleDelete = async () => {
    if (!playlistId) return;
    setIsDeleting(true);
    try {
      await deletePlaylist(playlistId);
      toast.success("Playlist deleted");
      await refreshPlaylists();
      goBack();
    } catch (e) {
      logger.error("Failed to delete playlist", e);
      toast.error("Failed to delete playlist");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleRemoveTrack = useCallback(
    async (trackId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!playlistId) return;

      try {
        await removeTrackFromPlaylist(playlistId, trackId);
        toast.success("Track removed");
        const newTracks = tracks.filter((t) => t.id !== trackId);
        setTracks(newTracks);
      } catch (e) {
        logger.error("Failed to remove track", e);
        toast.error("Failed to remove track");
      }
    },
    [playlistId, tracks],
  );

  const totalDurationMs = useMemo(
    () => tracks.reduce((acc, t) => acc + t.duration_ms, 0),
    [tracks],
  );
  const existingTrackIds = useMemo(
    () => new Set(tracks.map((t) => t.id)),
    [tracks],
  );

  const handleReorder = useCallback(
    async (activeId: string | number, overId: string | number) => {
      let oldIdx = -1,
        newIdx = -1;
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].id === activeId) oldIdx = i;
        if (tracks[i].id === overId) newIdx = i;
      }
      if (oldIdx === -1 || newIdx === -1) return;
      const newOrder = arrayMove(tracks, oldIdx, newIdx);
      setTracks(newOrder);
      const trackIds = newOrder.map((t) => t.id);
      if (playlistId) {
        try {
          await reorderPlaylist(playlistId, trackIds);
        } catch {
          loadData();
        }
      }
    },
    [tracks, playlistId, reorderPlaylist, loadData],
  );

  const handleRenderItem = useCallback(
    (track: Track, index: number) => (
      <SortableTrackItem
        key={track.id}
        track={track}
        index={index}
        dataItemIndex={index}
        onRemove={(e: React.MouseEvent) => handleRemoveTrack(track.id, e)}
      />
    ),
    [handleRemoveTrack],
  );

  const activationHandlers = useTrackActivationHandlers(tracks);

  if (!playlist && !isLoading) {
    return (
      <EmptyState
        icon={SearchX}
        title="Playlist not found"
        description="The playlist you're looking for doesn't exist or has been removed."
        action={
          <Button variant="ghost" onClick={goBack}>
            Go back
          </Button>
        }
      />
    );
  }

  return (
    <DetailPageTemplate
      title={playlist?.name ?? ""}
      subtitle={playlist ? `${tracks.length} songs` : undefined}
      artworkPath={playlist?.artwork_path ?? undefined}
      onBack={goBack}
      onPlay={tracks.length > 0 ? handlePlay : undefined}
    >
      <TrackList
        tracks={tracks}
        sortable
        getItemId={(item: Track) => item.id}
        onReorder={handleReorder}
        renderItem={handleRenderItem}
        {...activationHandlers}
        trackListHeaderProps={{
          showDuration: true,
          indexWidth: "w-8",
          className: "gap-4 px-2",
        }}
        headerContent={
          <PlaylistHero
            coverUrl={playlist?.artwork_path ?? undefined}
            title={playlist?.name ?? ""}
            description={playlist?.description ?? undefined}
            trackCount={tracks.length}
            totalDurationMs={totalDurationMs}
            lastModified={playlist?.created_at ?? ""}
            onEdit={() => setIsEditOpen(true)}
            onDelete={() => setIsDeleteDialogOpen(true)}
            onPlayAll={handlePlay}
            onShuffle={handleShuffle}
          >
            <Button
              variant="outline"
              size="lg"
              className="gap-2 rounded-full"
              onClick={() => setIsAddSongOpen(true)}
            >
              <Plus size={20} />
              Add Songs
            </Button>
          </PlaylistHero>
        }
        headerExtras={
          <>
            <ConfirmDialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              title="Delete Playlist?"
              description={`This action cannot be undone. This will permanently delete the playlist "${playlist?.name ?? ""}".`}
              confirmText="Delete"
              variant="destructive"
              onConfirm={handleDelete}
              isLoading={isDeleting}
              loadingText="Deleting..."
            />

            {playlist && (
              <PlaylistEditDialog
                playlist={playlist}
                open={isEditOpen}
                onOpenChange={(open) => {
                  setIsEditOpen(open);
                  if (!open) loadData();
                }}
              />
            )}

            {playlistId && (
              <TrackSelectDialog
                open={isAddSongOpen}
                onOpenChange={(open) => {
                  setIsAddSongOpen(open);
                  if (!open) loadData();
                }}
                playlistId={playlistId}
                existingTrackIds={existingTrackIds}
              />
            )}
          </>
        }
        emptyState={
          !isLoading ? (
            <EmptyState
              icon={Music}
              title="This playlist is empty"
              description="Add songs from your library to build this playlist."
              action={
                <Button
                  variant="outline"
                  onClick={() => setIsAddSongOpen(true)}
                >
                  Add Songs
                </Button>
              }
            />
          ) : null
        }
      />
    </DetailPageTemplate>
  );
});
