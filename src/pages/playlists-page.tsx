import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ListMusic } from "lucide-react";
import { useLibraryStore } from "@/stores/library-store";
import { Playlist } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaylistEditDialog } from "@/components/dialogs/playlist-edit-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import PlaylistCard from "@/components/shared/item/playlist-card";

export default function PlaylistsPage() {
  // Use global store
  const playlists = useLibraryStore((s) => s.playlists);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);

  // Create Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null
  );
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const scrollRef = useScrollMask();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setIsCreating(true);
    const success = await createPlaylist(newPlaylistName);
    setIsCreating(false);

    if (success) {
      setNewPlaylistName("");
      setIsDialogOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (!playlistToDelete) return;
    setIsDeleting(true);
    try {
      await deletePlaylist(playlistToDelete.id);
    } catch (error) {
      console.error("Failed to delete playlist:", error);
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
      <div className="mt-8 flex items-center justify-between mb-6 px-2">
        <h1 className="text-3xl font-bold">Playlists</h1>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-popover border-border text-popover-foreground">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Playlist</DialogTitle>
                <DialogDescription>
                  Give your playlist a name to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="name"
                      className="text-left text-muted-foreground"
                    >
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                      placeholder="My awesome playlist"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isCreating || !newPlaylistName.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isCreating ? "Creating..." : "Create Playlist"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
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
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 scroll-mask-y"
      >
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-8">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-lg p-3 gap-3">
                <Skeleton className="aspect-square w-full rounded-md bg-foreground/5" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-foreground/10" />
                  <Skeleton className="h-3 w-1/2 bg-foreground/5" />
                </div>
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="No playlists created"
            description="Create your first playlist to organize your music."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-42">
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
