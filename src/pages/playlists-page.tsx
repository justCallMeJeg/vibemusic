import { useEffect, useState } from "react";
import { useNavigationStore } from "@/stores/navigation-store";
import { Button } from "@/components/ui/button";
import { Plus, ListMusic, Play, Shuffle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePlaylistStore } from "@/stores/playlist-store";
import { useAudioStore } from "@/stores/audio-store";
import { deletePlaylist, getPlaylistTracks, Playlist } from "@/lib/api";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function PlaylistsPage() {
  const openPlaylistDetail = useNavigationStore((s) => s.openPlaylistDetail);

  // Use global store
  const { playlists, isLoading, fetchPlaylists, createPlaylist } =
    usePlaylistStore();

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
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

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
      toast.success("Playlist deleted");
      await fetchPlaylists();
    } catch (error) {
      console.error("Failed to delete playlist:", error);
      toast.error("Failed to delete playlist");
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
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
            <DialogHeader>
              <DialogTitle>Delete Playlist?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the
                playlist "{playlistToDelete?.name}".
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="text-gray-500 text-center py-8">Loading...</div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
            <ListMusic size={48} className="opacity-50" />
            <p>No playlists yet</p>
          </div>
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
                    <div className="aspect-square w-full bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 rounded-md flex items-center justify-center text-white/50 text-4xl font-bold select-none group-hover:scale-[1.02] transition-transform">
                      {playlist.name.slice(0, 2).toUpperCase()}
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
                  <ContextMenuItem
                    onSelect={() => handlePlayPlaylist(playlist.id, true)}
                  >
                    <Shuffle className="mr-2 h-4 w-4" /> Shuffle
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
    </div>
  );
}
