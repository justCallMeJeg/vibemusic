import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Plus, ListMusic } from "lucide-react";
import { useLibraryStore } from "@/stores/library-store";
import { Playlist } from "@/lib/api";
import { PlaylistCreateDialog } from "@/components/dialogs/playlist-create-dialog";
import { GridSkeleton } from "@/components/shared/grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import PlaylistCard from "@/components/shared/item/playlist-card";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PlaylistEditDialog } from "@/components/dialogs/playlist-edit-dialog";
import { useIsPlayerVisible } from "@/stores/audio-store";

export default function PlaylistsPage() {
  // Use global store
  const playlists = useLibraryStore((s) => s.playlists);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);

  // Create Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null
  );
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const scrollRef = useScrollMask();

  // Dynamic padding based on player visibility
  const isPlayerVisible = useIsPlayerVisible();

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
    <div className="flex-1 min-w-0 h-full flex flex-col">
      <PageHeader title="Playlists">
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus size={16} />
          Create Playlist
        </Button>
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

      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-2 scroll-mask-y ${
          !isLoading && playlists.length === 0 ? "flex flex-col" : ""
        }`}
      >
        {isLoading ? (
          <GridSkeleton
            className="pb-8"
            renderItem={(i) => (
              <div key={i} className="flex flex-col rounded-lg p-3 gap-3">
                <Skeleton className="aspect-square w-full rounded-md bg-foreground/5" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-foreground/10" />
                  <Skeleton className="h-3 w-1/2 bg-foreground/5" />
                </div>
              </div>
            )}
          />
        ) : playlists.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="No playlists created"
            description="Create your first playlist to organize your music."
          />
        ) : (
          <div
            className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${
              isPlayerVisible ? "pb-39" : "pb-8"
            }`}
          >
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onEdit={setEditingPlaylist}
                onDelete={handleDeleteRequest}
              />
            ))}
          </div>
        )}
      </div>

      {editingPlaylist && (
        <PlaylistEditDialog
          playlist={editingPlaylist}
          open={!!editingPlaylist}
          onOpenChange={(open) => !open && setEditingPlaylist(null)}
        />
      )}
    </div>
  );
}
