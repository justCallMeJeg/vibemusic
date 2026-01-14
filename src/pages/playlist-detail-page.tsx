import { useEffect, useState, useCallback } from "react";
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
import { ChevronLeft, Play, Trash2, Plus, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import MusicListItem from "@/components/shared/item/music-list";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";

import { useLibraryStore } from "@/stores/library-store";
import { EmptyState } from "@/components/shared/empty-state";
import { PlaylistEditDialog } from "@/components/dialogs/playlist-edit-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Pencil, GripVertical } from "lucide-react";
import { arrayMove } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TrackSelectDialog } from "@/components/dialogs/track-select-dialog";
import { VirtualizedSortableList } from "@/components/shared/virtualized-sortable-list";

interface SortableTrackItemProps {
  track: Track;
  index: number;
  onRemove: (e: React.MouseEvent) => void;
}

function SortableTrackItem({ track, index, onRemove }: SortableTrackItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 hover:bg-accent rounded-md pr-2 transition-colors ${
        isDragging ? "bg-accent shadow-xl" : ""
      }`}
    >
      <div
        className="w-12 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground group-hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <span className="text-sm font-variant-numeric tabular-nums group-hover:hidden">
          {index + 1}
        </span>
        <GripVertical size={16} className="hidden group-hover:block" />
      </div>

      <div className="flex-1 min-w-0">
        <MusicListItem track={track} />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
        onClick={onRemove}
        title="Remove from playlist"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

export default function PlaylistDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const play = useAudioStore((s) => s.play);
  const reorderPlaylist = useLibraryStore((s) => s.reorderPlaylist);
  const refreshPlaylists = useLibraryStore((s) => s.refreshPlaylists);

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const playlistId = detailView?.type === "playlist" ? detailView.id : null;

  const loadData = useCallback(async () => {
    if (!playlistId) return;
    setIsLoading(true);
    try {
      const [allPlaylists, tracksData] = await Promise.all([
        getPlaylists(),
        getPlaylistTracks(playlistId),
      ]);

      const found = allPlaylists.find((p) => p.id === playlistId);
      if (found) setPlaylist(found);
      setImageError(false);
      setTracks(tracksData);
    } catch (error) {
      console.error("Failed to load playlist:", error);
      toast.error("Failed to load playlist");
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePlay = () => {
    if (tracks.length > 0) {
      play(tracks[0], tracks);
    }
  };

  const handleDelete = async () => {
    if (!playlistId) return;
    setIsDeleting(true);
    try {
      await deletePlaylist(playlistId);
      toast.success("Playlist deleted");
      await refreshPlaylists();
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
      const newTracks = tracks.filter((t) => t.id !== trackId);
      setTracks(newTracks);
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove track");
    }
  };

  if (!playlist) {
    if (isLoading) return null;
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Playlist not found</div>
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
      <VirtualizedSortableList
        items={tracks}
        getItemId={(item) => item.id}
        onReorder={async (activeId, overId) => {
          const oldIndex = tracks.findIndex((t) => t.id === activeId);
          const newIndex = tracks.findIndex((t) => t.id === overId);
          const newOrder = arrayMove(tracks, oldIndex, newIndex);

          setTracks(newOrder);

          // Optimistic update
          const trackIds = newOrder.map((t) => t.id);
          if (playlistId) {
            try {
              await reorderPlaylist(playlistId, trackIds);
            } catch {
              loadData();
            }
          }
        }}
        renderItem={(track, index) => (
          <SortableTrackItem
            key={track.id}
            track={track}
            index={index}
            onRemove={(e) => handleRemoveTrack(track.id, e)}
          />
        )}
        header={
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Header with back button */}
            <div className="mt-8 flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft size={24} />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Back to Playlists
              </span>
            </div>

            {/* Playlist info header */}
            <div className="flex gap-6 mb-6 px-2">
              <div className="w-40 h-40 rounded-lg bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-muted-foreground text-6xl font-bold select-none shrink-0 overflow-hidden">
                {playlist.artwork_path && !imageError ? (
                  <img
                    src={convertFileSrc(playlist.artwork_path)}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                    onError={(_e) => {
                      setImageError(true);
                    }}
                  />
                ) : (
                  playlist.name.slice(0, 2).toUpperCase()
                )}
              </div>

              <div className="flex flex-col justify-center min-w-0">
                <h2 className="text-4xl font-bold text-foreground line-clamp-2 mb-2">
                  {playlist.name}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {playlist.description || "No description"}
                </p>
                <div className="text-muted-foreground text-sm flex gap-2 items-center mt-2">
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
                    variant="default"
                    size="lg"
                    onClick={handlePlay}
                    className="gap-2 rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Play size={20} fill="currentColor" />
                    Play
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 rounded-full"
                    onClick={() => setIsAddSongOpen(true)}
                  >
                    <Plus size={20} />
                    Add Songs
                  </Button>

                  <Button
                    variant="outline"
                    size="icon-lg"
                    onClick={() => setIsEditOpen(true)}
                    title="Edit Playlist"
                  >
                    <Pencil size={20} />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon-lg"
                    className="text-red-400 hover:text-red-300 hover:border-red-900/50"
                    title="Delete Playlist"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 size={20} />
                  </Button>

                  <ConfirmDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    title="Delete Playlist?"
                    description={`This action cannot be undone. This will permanently delete the playlist "${playlist.name}".`}
                    confirmText="Delete"
                    variant="destructive"
                    onConfirm={handleDelete}
                    isLoading={isDeleting}
                    loadingText="Deleting..."
                  />

                  <PlaylistEditDialog
                    playlist={playlist}
                    open={isEditOpen}
                    onOpenChange={(open) => {
                      setIsEditOpen(open);
                      if (!open) loadData();
                    }}
                  />

                  {playlistId && (
                    <TrackSelectDialog
                      open={isAddSongOpen}
                      onOpenChange={(open) => {
                        setIsAddSongOpen(open);
                        if (!open) loadData();
                      }}
                      playlistId={playlistId}
                      existingTrackIds={new Set(tracks.map((t) => t.id))}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Header Row */}
            <div className="flex items-center gap-4 px-4 py-2 text-muted-foreground text-xs uppercase tracking-wider border-b border-border mb-2">
              <div className="w-8 text-center">#</div>
              <div className="flex-1">Title</div>
              <div className="p-2">
                <div className="w-4" />
              </div>
            </div>
          </div>
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
    </div>
  );
}
