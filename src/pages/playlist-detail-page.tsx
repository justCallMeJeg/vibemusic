import { useEffect, useState } from "react";
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
import { ChevronLeft, Play, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MusicListItem from "@/components/ui/music-list";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
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
import { usePlaylistStore } from "@/stores/playlist-store";

export default function PlaylistDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const play = useAudioStore((s) => s.play);
  const { fetchPlaylists } = usePlaylistStore();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const playlistId = detailView?.type === "playlist" ? detailView.id : null;

  const loadData = async () => {
    if (!playlistId) return;
    setIsLoading(true);
    try {
      // Parallel fetch could be better but we need to find the playlist from the list or add a getPlaylistById
      // Since we don't have getPlaylistById, we'll fetch all playlists and find it.
      // Optimization for later: add getPlaylistById
      const [allPlaylists, tracksData] = await Promise.all([
        getPlaylists(),
        getPlaylistTracks(playlistId),
      ]);

      const found = allPlaylists.find((p) => p.id === playlistId);
      setPlaylist(found || null);
      setTracks(tracksData);
    } catch (error) {
      console.error("Failed to load playlist:", error);
      toast.error("Failed to load playlist");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [playlistId]);

  const handlePlay = () => {
    if (tracks.length > 0) {
      play(tracks[0], tracks);
    }
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      play(shuffled[0], shuffled);
    }
  };

  const handleDelete = async () => {
    if (!playlistId) return;
    setIsDeleting(true);
    try {
      await deletePlaylist(playlistId);
      toast.success("Playlist deleted");
      await fetchPlaylists(); // Update store
      goBack();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete playlist");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleRemoveTrack = async (trackId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playlistId) return;

    try {
      await removeTrackFromPlaylist(playlistId, trackId);
      toast.success("Track removed");
      loadData(); // Refresh list
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove track");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading playlist...</div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Playlist not found</div>
      </div>
    );
  }

  const totalDurationMs = tracks.reduce((acc, t) => acc + t.duration_ms, 0);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="text-gray-400 hover:text-white"
        >
          <ChevronLeft size={24} />
        </Button>
        <span className="text-sm font-medium text-gray-400">
          Back to Playlists
        </span>
      </div>

      {/* Album info header */}
      <div className="flex gap-6 mb-6 px-2">
        {/* Placeholder Cover */}
        <div className="w-40 h-40 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-white/50 text-6xl font-bold select-none shrink-0">
          {playlist.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex flex-col justify-center min-w-0">
          <h2 className="text-4xl font-bold text-white line-clamp-2 mb-2">
            {playlist.name}
          </h2>
          <p className="text-gray-400 text-sm">
            {playlist.description || "No description"}
          </p>
          <div className="text-gray-500 text-sm flex gap-2 items-center mt-2">
            <span>{tracks.length} songs</span>
            <span>•</span>
            <span>{formatDuration(totalDurationMs)}</span>
            <span>•</span>
            <span>
              Created{" "}
              {formatDistanceToNow(new Date(playlist.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-6">
            <Button
              variant="default" // Primary style
              size="lg" // Larger play button
              onClick={handlePlay}
              className="gap-2 rounded-full px-8 bg-white text-black hover:bg-white/90"
            >
              <Play size={20} fill="currentColor" />
              Play
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={handleShuffle}
              title="Shuffle"
            >
              <Shuffle size={20} />
            </Button>

            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="text-red-400 hover:text-red-300 hover:border-red-900/50"
                  title="Delete Playlist"
                >
                  <Trash2 size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
                <DialogHeader>
                  <DialogTitle>Delete Playlist?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete
                    the playlist "{playlist.name}".
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="text-gray-500 text-center p-8">
            This playlist is empty. Add songs from your library!
          </div>
        ) : (
          <div className="flex flex-col gap-1 pb-8">
            {/* Header Row */}
            <div className="flex items-center gap-4 px-4 py-2 text-gray-500 text-xs uppercase tracking-wider border-b border-white/5 mb-2">
              <div className="w-8 text-center">#</div>
              <div className="flex-1">Title</div>
              <div className="p-2">
                {" "}
                <div className="w-4" />{" "}
              </div>
            </div>

            {tracks.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className="group flex items-center gap-2 hover:bg-white/5 rounded-md pr-2 transition-colors"
              >
                <span className="text-gray-600 text-sm w-12 text-center shrink-0 font-variant-numeric tabular-nums group-hover:text-white transition-colors">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <MusicListItem track={track} context={tracks} />
                </div>

                {/* Remove Action */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                  onClick={(e) => handleRemoveTrack(track.id, e)}
                  title="Remove from playlist"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
