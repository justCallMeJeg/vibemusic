import {
  useState,
  useMemo,
  memo,
  useCallback,
  useDeferredValue,
  useRef,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { Plus, ListMusic, Search } from "lucide-react";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { useAudioStore } from "@/stores/audio-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { Playlist, getPlaylistTracks } from "@/lib/api";
import { toast } from "sonner";
import { CardItem } from "@/components/shared/card-item";
import { PlaylistCreateDialog } from "@features/playlists/components/playlist-create-dialog";
import { SkeletonCard } from "@/components/shared/skeleton-primitives";
import { GridSkeleton } from "@/components/shared/grid-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PlaylistEditDialog } from "@features/playlists/components/playlist-edit-dialog";

import { useSettingsStore } from "@/stores/settings-store";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import { Input } from "@/components/ui/input";
import { VirtualizedGrid } from "@/components/shared/virtualized-grid";
import { PageLayout } from "@/components/shared/page-layout";

import { useIndexPageKeybinds } from "@/hooks/use-index-page-keybinds";
import { useSelectionStore } from "@/stores/selection-store";
import { useSelection } from "@/hooks/use-selection";

const PlaylistGridCard = memo(function PlaylistGridCard({
  playlist,
  onOpenDetail,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onEdit,
  onDelete,
  onTogglePin,
  dataItemIndex,
}: {
  playlist: Playlist;
  onOpenDetail: (id: number) => void;
  onPlay: (id: number, shuffle?: boolean) => Promise<void>;
  onPlayNext: (id: number) => Promise<void>;
  onAddToQueue: (id: number) => Promise<void>;
  onEdit: (p: Playlist) => void;
  onDelete: (p: Playlist) => void;
  onTogglePin?: (p: Playlist) => void;
  dataItemIndex?: number;
}) {
  useSelection({ itemId: playlist.id, index: dataItemIndex ?? 0 });
  const checkboxMode = useSelectionStore((s) => s.mode === "checkbox");
  const handleClick = useCallback(() => {
    onOpenDetail(playlist.id);
  }, [playlist.id, onOpenDetail]);
  const menuActions = useMemo(
    () => ({
      onPlay: () => onPlay(playlist.id),
      onShuffle: () => onPlay(playlist.id, true),
      onPlayNext: () => onPlayNext(playlist.id),
      onAddToQueue: () => onAddToQueue(playlist.id),
      onEdit: () => onEdit(playlist),
      onDelete: () => onDelete(playlist),
      onTogglePin: () => onTogglePin?.(playlist),
      isPinned: playlist.pinned,
    }),
    [playlist, onPlay, onPlayNext, onAddToQueue, onEdit, onDelete, onTogglePin],
  );

  return (
    <CardItem
      title={playlist.name}
      subtitle={`${playlist.track_count} tracks`}
      artworkSrc={playlist.artwork_path || undefined}
      artworkType="playlist"
      artworkLiked={playlist.is_liked || undefined}
      pinned={playlist.pinned}
      variant="portrait"
      onClick={handleClick}
      onPlay={() => onPlay(playlist.id)}
      menuActions={menuActions}
      dataItemIndex={dataItemIndex}
      selectable={checkboxMode}
    />
  );
});

export default memo(function PlaylistsPage() {
  // Use global store
  const playlists = usePlaylistStore((s) => s.playlists);
  const isLoading = usePlaylistStore((s) => s.isLoading);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
  const togglePin = usePlaylistStore((s) => s.togglePin);

  const playlistsSortKey = useSettingsStore((s) => s.playlistsSortKey);
  const playlistsSortDirection = useSettingsStore(
    (s) => s.playlistsSortDirection,
  );
  const setPlaylistsSort = useSettingsStore((s) => s.setPlaylistsSort);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const filteredAndSortedPlaylists = useMemo(() => {
    let result = [...playlists];

    if (deferredQuery) {
      const query = deferredQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // Sort: pinned first (by pinned_at desc), then by user's sort key
    return result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.pinned && b.pinned) {
        if (a.pinned_at && b.pinned_at)
          return b.pinned_at.localeCompare(a.pinned_at);
        if (a.pinned_at) return -1;
        if (b.pinned_at) return 1;
      }

      let valA: string | number = "";
      let valB: string | number = "";

      switch (playlistsSortKey) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "track_count":
          valA = a.track_count;
          valB = b.track_count;
          break;
        case "created_at":
          valA = a.created_at;
          valB = b.created_at;
          break;
        default:
          return 0;
      }

      if (valA < valB) return playlistsSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return playlistsSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [playlists, playlistsSortKey, playlistsSortDirection, deferredQuery]);

  useEffect(() => {
    useSelectionStore
      .getState()
      .setItems(
        filteredAndSortedPlaylists.map((p, i) => ({ id: p.id, index: i })),
      );
  }, [filteredAndSortedPlaylists]);

  // Create Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null,
  );
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openPlaylistDetail = useNavigationStore((s) => s.openPlaylistDetail);
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const SCOPE = "page:playlists";
  useIndexPageKeybinds(searchQuery, setSearchQuery, searchInputRef, SCOPE, [
    [
      "delete",
      {
        combo: { key: "Delete" },
        handler: () => {
          const sel = useSelectionStore.getState();
          if (sel.selectionCount() > 0) {
            setBatchDeleteDialogOpen(true);
          }
        },
        description: "Delete selected playlists",
        preventDefault: true,
      },
    ],
  ]);

  const handlePlayPlaylist = useCallback(
    async (playlistId: number, shuffle = false) => {
      try {
        const tracks = await getPlaylistTracks(playlistId);
        if (tracks.length === 0) {
          toast.error("Playlist is empty");
          return;
        }
        const queue = shuffle
          ? [...tracks].sort(() => Math.random() - 0.5)
          : tracks;
        play(queue[0], queue);
      } catch (e) {
        logger.error("Failed to play playlist", e);
      }
    },
    [play],
  );

  const handlePlayNext = useCallback(
    async (playlistId: number) => {
      try {
        const tracks = await getPlaylistTracks(playlistId);
        if (tracks.length === 0) return;
        [...tracks].reverse().forEach((track) => playNext(track));
        toast.success("Playing playlist next");
      } catch (e) {
        logger.error("Failed to play playlist next", e);
      }
    },
    [playNext],
  );

  const handleAddToQueue = useCallback(
    async (playlistId: number) => {
      try {
        const tracks = await getPlaylistTracks(playlistId);
        if (tracks.length === 0) return;
        tracks.forEach((track) => addToQueue(track));
        toast.success("Added playlist to queue");
      } catch (e) {
        logger.error("Failed to add playlist to queue", e);
      }
    },
    [addToQueue],
  );

  const confirmDelete = async () => {
    if (!playlistToDelete) return;
    setIsDeleting(true);
    try {
      await deletePlaylist(playlistToDelete.id);
    } catch (error) {
      logger.error("Failed to delete playlist", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setPlaylistToDelete(null);
    }
  };

  const handleDeleteRequest = (playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setIsDeleteDialogOpen(true);
  };

  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const confirmBatchDelete = useCallback(async () => {
    const ids = useSelectionStore.getState().getSelectedIds();
    setIsBatchDeleting(true);
    try {
      for (const playlistId of ids) {
        await deletePlaylist(playlistId);
      }
      useSelectionStore.getState().disableCheckboxMode();
      toast.success(
        `Deleted ${ids.length} playlist${ids.length !== 1 ? "s" : ""}`,
      );
    } catch (error) {
      logger.error("Failed to delete playlists", error);
      toast.error("Failed to delete some playlists");
    } finally {
      setIsBatchDeleting(false);
      setBatchDeleteDialogOpen(false);
    }
  }, [deletePlaylist]);

  return (
    <PageLayout>
      <PageHeader title="Playlists">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center">
            <div
              className={cn(
                "relative w-64 mr-2",
                isLoading && "pointer-events-none opacity-50",
              )}
            >
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Filter playlists..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            <div className={isLoading ? "pointer-events-none opacity-50" : ""}>
              <SortDropdown
                sortKey={playlistsSortKey}
                sortDirection={playlistsSortDirection}
                onSortChange={(k, d) => setPlaylistsSort(k, d)}
                options={[
                  { label: "Name", value: "name" },
                  { label: "Track Count", value: "track_count" },
                  { label: "Date Created", value: "created_at" },
                ]}
              />
            </div>
          </div>
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus size={16} />
            Create Playlist
          </Button>
        </div>
        <PlaylistCreateDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      </PageHeader>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Playlist?"
        description={`This action cannot be undone. This will permanently delete the playlist "${playlistToDelete?.name}".`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        loadingText="Deleting..."
      />

      {isLoading ? (
        <GridSkeleton
          className="pb-8"
          renderItem={(i) => <SkeletonCard key={i} variant="album" />}
        />
      ) : (
        <VirtualizedGrid
          items={filteredAndSortedPlaylists}
          renderItem={(playlist, index) => (
            <PlaylistGridCard
              key={playlist.id}
              playlist={playlist}
              onOpenDetail={openPlaylistDetail}
              onPlay={handlePlayPlaylist}
              onPlayNext={handlePlayNext}
              onAddToQueue={handleAddToQueue}
              onEdit={setEditingPlaylist}
              onDelete={handleDeleteRequest}
              onTogglePin={(p) => togglePin(p.id, !p.pinned)}
              dataItemIndex={index}
            />
          )}
          itemHeight={220}
          emptyState={
            searchQuery ? (
              <EmptyState
                icon={Search}
                title="No matches found"
                description={`No playlists match "${searchQuery}"`}
                action={
                  <Button variant="ghost" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ListMusic}
                title="No playlists created"
                description="Create your first playlist to organize your music."
                action={
                  <Button onClick={() => setIsDialogOpen(true)}>
                    Create Playlist
                  </Button>
                }
              />
            )
          }
          keyboardNav
          onItemActivate={(index) => {
            const playlist = filteredAndSortedPlaylists[index];
            if (playlist) handlePlayPlaylist(playlist.id);
          }}
          onItemActivateSecondary={(index) => {
            const playlist = filteredAndSortedPlaylists[index];
            if (playlist) openPlaylistDetail(playlist.id);
          }}
        />
      )}

      <ConfirmDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        title="Delete Playlists?"
        description={`This action cannot be undone. This will permanently delete the selected playlists.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmBatchDelete}
        isLoading={isBatchDeleting}
        loadingText="Deleting..."
      />

      {editingPlaylist && (
        <PlaylistEditDialog
          playlist={editingPlaylist}
          open={!!editingPlaylist}
          onOpenChange={(open) => !open && setEditingPlaylist(null)}
        />
      )}
    </PageLayout>
  );
});
