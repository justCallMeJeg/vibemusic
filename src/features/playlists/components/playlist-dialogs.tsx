import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { PlaylistEditDialog } from "@features/playlists/components/playlist-edit-dialog";
import { TrackSelectDialog } from "@features/playlists/components/track-select-dialog";
import type { Playlist } from "@/lib/api";

interface PlaylistDialogsProps {
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (v: boolean) => void;
  isEditOpen: boolean;
  setIsEditOpen: (v: boolean) => void;
  isAddSongOpen: boolean;
  setIsAddSongOpen: (v: boolean) => void;
  isDeleting: boolean;
  playlist: Playlist | null;
  playlistId: number | null;
  existingTrackIds: Set<number>;
  handleDelete: () => void;
  loadData: () => void;
}

export function PlaylistDialogs({
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  isEditOpen,
  setIsEditOpen,
  isAddSongOpen,
  setIsAddSongOpen,
  isDeleting,
  playlist,
  playlistId,
  existingTrackIds,
  handleDelete,
  loadData,
}: PlaylistDialogsProps) {
  return (
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
  );
}
