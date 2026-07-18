import { useState, useMemo, memo, useCallback, useDeferredValue } from "react";
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

const PlaylistGridCard = memo(function PlaylistGridCard({
  playlist,
  onOpenDetail,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onEdit,
  onDelete,
}: {
  playlist: Playlist;
  onOpenDetail: (id: number) => void;
  onPlay: (id: number, shuffle?: boolean) => Promise<void>;
  onPlayNext: (id: number) => Promise<void>;
  onAddToQueue: (id: number) => Promise<void>;
  onEdit: (p: Playlist) => void;
  onDelete: (p: Playlist) => void;
}) {
  const menuActions = useMemo(
    () => ({
      onPlay: () => onPlay(playlist.id),
      onShuffle: () => onPlay(playlist.id, true),
      onPlayNext: () => onPlayNext(playlist.id),
      onAddToQueue: () => onAddToQueue(playlist.id),
      onEdit: () => onEdit(playlist),
      onDelete: () => onDelete(playlist),
    }),
    [playlist, onPlay, onPlayNext, onAddToQueue, onEdit, onDelete],
  );

  return (
    <CardItem
      title={playlist.name}
      subtitle={`${playlist.track_count} tracks`}
      artworkSrc={playlist.artwork_path || undefined}
      artworkType="playlist"
      variant="portrait"
      onClick={() => onOpenDetail(playlist.id)}
      onPlay={() => onPlay(playlist.id)}
      menuActions={menuActions}
    />
  );
});

export default memo(function PlaylistsPage() {
  // Use global store
  const playlists = usePlaylistStore((s) => s.playlists);
  const isLoading = usePlaylistStore((s) => s.isLoading);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);

  const playlistsSortKey = useSettingsStore((s) => s.playlistsSortKey);
  const playlistsSortDirection = useSettingsStore((s) => s.playlistsSortDirection);
  const setPlaylistsSort = useSettingsStore((s) => s.setPlaylistsSort);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const filteredAndSortedPlaylists = useMemo(() => {
    let result = [...playlists];

    // Filter
    if (deferredQuery) {
      const query = deferredQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // Sort
    return result.sort((a, b) => {
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
          valA = a.created_at; // ISO string comparison works for dates
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

  // Create Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null
  );
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openPlaylistDetail = useNavigationStore((s) => s.openPlaylistDetail);
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const handlePlayPlaylist = useCallback(async (playlistId: number, shuffle = false) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) { toast.error("Playlist is empty"); return; }
      const queue = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
      play(queue[0], queue);
    } catch (e) { logger.error("Failed to play playlist", e); }
  }, [play]);

  const handlePlayNext = useCallback(async (playlistId: number) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) return;
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing playlist next");
    } catch (e) { logger.error("Failed to play playlist next", e); }
  }, [playNext]);

  const handleAddToQueue = useCallback(async (playlistId: number) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) return;
      tracks.forEach((track) => addToQueue(track));
      toast.success("Added playlist to queue");
    } catch (e) { logger.error("Failed to add playlist to queue", e); }
  }, [addToQueue]);


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

  return (
    <PageLayout>
      <PageHeader title="Playlists">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center">
            <div className={cn("relative w-64 mr-2", isLoading && "pointer-events-none opacity-50")}>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter playlists..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          renderItem={(playlist) => (
            <PlaylistGridCard
              key={playlist.id}
              playlist={playlist}
              onOpenDetail={openPlaylistDetail}
              onPlay={handlePlayPlaylist}
              onPlayNext={handlePlayNext}
              onAddToQueue={handleAddToQueue}
              onEdit={setEditingPlaylist}
              onDelete={handleDeleteRequest}
            />
          )}
          itemHeight={220}
          emptyState={
            searchQuery ? (
              <EmptyState
                icon={Search}
                title="No matches found"
                description={`We couldn't find any playlists matching "${deferredQuery}"`}
              />
            ) : (
              <EmptyState
                icon={ListMusic}
                title="No playlists created"
                description="Create your first playlist to organize your music."
              />
            )
          }
        />
      )}

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
