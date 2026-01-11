import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useNavigationStore } from "@/stores/navigation-store";
import { Button } from "@/components/ui/button";
import { Plus, ListMusic, Play, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLibraryStore } from "@/stores/library-store";
import { useAudioStore } from "@/stores/audio-store";
import { getPlaylistTracks, Playlist } from "@/lib/api";
import { toast } from "react-hot-toast";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { PlaylistEditDialog } from "@/components/dialogs/playlist-edit-dialog";
import { Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollMask } from "@/hooks/use-scroll-mask";

export default function PlaylistsPage() {
  const openPlaylistDetail = useNavigationStore((s) => s.openPlaylistDetail);

  // Use global store
  const playlists = useLibraryStore((s) => s.playlists);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);

  // Audio Store
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

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
      // toast is handled in store
    } catch (error) {
      console.error("Failed to delete playlist:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setPlaylistToDelete(null);
    }
  };

  const handlePlayPlaylist = async (
    playlistId: number,
    shuffle: boolean = false
  ) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) {
        toast.error("Playlist is empty");
        return;
      }

      let trackToPlay = tracks[0];
      let queue = tracks;

      if (shuffle) {
        queue = [...tracks].sort(() => Math.random() - 0.5);
        trackToPlay = queue[0];
      }

      play(trackToPlay, queue);
    } catch (e) {
      console.error("Failed to play playlist:", e);
      toast.error("Failed to play playlist");
    }
  };

  const handlePlayNext = async (playlistId: number) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) return;

      // Reverse to maintain order when inserting next
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing playlist next");
    } catch (e) {
      console.error("Failed to play playlist next:", e);
      toast.error("Failed to play next");
    }
  };

  const handleAddToQueue = async (playlistId: number) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) return;

      tracks.forEach((track) => addToQueue(track));
      toast.success("Added playlist to queue");
    } catch (e) {
      console.error("Failed to add playlist to queue:", e);
      toast.error("Failed to add to queue");
    }
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
          <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-800 text-white">
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
                      className="text-left text-neutral-400"
                    >
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600 focus-visible:ring-neutral-700"
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
                  className="bg-white text-black hover:bg-neutral-200"
                >
                  {isCreating ? "Creating..." : "Create Playlist"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Playlist?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone. This will permanently delete the
                playlist "{playlistToDelete?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 text-white border-none"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 scroll-mask-y"
      >
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-8">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-lg p-3 gap-3">
                <Skeleton className="aspect-square w-full rounded-md bg-white/5" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                  <Skeleton className="h-3 w-1/2 bg-white/5" />
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-8">
            {playlists.map((playlist) => (
              <ContextMenu key={playlist.id}>
                <ContextMenuTrigger>
                  <div
                    onClick={() => openPlaylistDetail(playlist.id)}
                    className="flex flex-col rounded-lg p-3 hover:bg-white/5 cursor-pointer transition-colors group gap-3"
                  >
                    {/* Playlist Cover Placeholder */}
                    <div className="aspect-square w-full bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 rounded-md flex items-center justify-center text-white/50 text-4xl font-bold select-none group-hover:scale-[1.02] transition-transform overflow-hidden">
                      {playlist.artwork_path ? (
                        <img
                          src={convertFileSrc(playlist.artwork_path)}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        playlist.name.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3
                        className="font-semibold text-white truncate"
                        title={playlist.name}
                      >
                        {playlist.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {playlist.track_count} tracks •{" "}
                        {formatDistanceToNow(new Date(playlist.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onSelect={() => handlePlayPlaylist(playlist.id, false)}
                  >
                    <Play className="mr-2 h-4 w-4" /> Play
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => handlePlayNext(playlist.id)}>
                    <ListMusic className="mr-2 h-4 w-4" /> Play Next
                  </ContextMenuItem>
                  <ContextMenuItem
                    onSelect={() => handleAddToQueue(playlist.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add to Queue
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onSelect={() => setEditingPlaylist(playlist)}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                    onSelect={() => {
                      setPlaylistToDelete(playlist);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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
