import { memo } from "react";
import { Play, Shuffle, ListPlus, Pencil, Trash2 } from "lucide-react";
import { Playlist, getPlaylistTracks } from "@/lib/api";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAudioStore } from "@/stores/audio-store";
import { useNavigationStore } from "@/stores/navigation-store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { formatDistanceToNow } from "date-fns";
import { ScrollingText } from "@/components/shared/scrolling-text";

interface PlaylistCardProps {
  playlist: Playlist;
  /** Optional: different card sizes */
  size?: "default" | "compact";
  /** Called when Edit is selected from context menu */
  onEdit?: (playlist: Playlist) => void;
  /** Called when Delete is selected from context menu */
  onDelete?: (playlist: Playlist) => void;
}

const PlaylistCard = memo(function PlaylistCard({
  playlist,
  size = "default",
  onEdit,
  onDelete,
}: PlaylistCardProps) {
  const openPlaylistDetail = useNavigationStore((s) => s.openPlaylistDetail);
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const handlePlay = async (shuffle = false) => {
    try {
      const tracks = await getPlaylistTracks(playlist.id);
      if (tracks.length === 0) {
        toast.error("Playlist is empty");
        return;
      }

      let queue = tracks;
      if (shuffle) {
        queue = [...tracks].sort(() => Math.random() - 0.5);
      }

      play(queue[0], queue);
    } catch (e) {
      logger.error("Failed to play playlist", e);
    }
  };

  const handlePlayNext = async () => {
    try {
      const tracks = await getPlaylistTracks(playlist.id);
      if (tracks.length === 0) return;

      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing playlist next");
    } catch (e) {
      logger.error("Failed to play playlist next", e);
      toast.error("Failed to play next");
    }
  };

  const handleAddToQueue = async () => {
    try {
      const tracks = await getPlaylistTracks(playlist.id);
      if (tracks.length === 0) return;

      tracks.forEach((track) => addToQueue(track));
      toast.success("Added playlist to queue");
    } catch (e) {
      logger.error("Failed to add playlist to queue", e);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handlePlay(false);
  };

  const isCompact = size === "compact";

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={() => openPlaylistDetail(playlist.id)}
          className={`flex flex-col cursor-pointer transition-colors group ${
            isCompact
              ? "w-40 shrink-0 space-y-3"
              : "rounded-lg p-3 hover:bg-accent gap-3"
          }`}
        >
          {/* Artwork with play overlay */}
          <div
            className={`aspect-square w-full bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center overflow-hidden relative ${
              isCompact ? "rounded-xl" : "rounded-md"
            }`}
          >
            {playlist.artwork_path ? (
              <img
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                src={convertFileSrc(playlist.artwork_path)}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                alt={playlist.name}
              />
            ) : (
              <span className="text-4xl font-bold text-muted-foreground select-none group-hover:scale-[1.02] transition-transform">
                {playlist.name.slice(0, 2).toUpperCase()}
              </span>
            )}

            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-lg cursor-pointer"
                onClick={handlePlayClick}
              >
                <Play fill="currentColor" className="ml-1" size={24} />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0">
            <ScrollingText className="font-semibold text-foreground w-full">
              {playlist.name}
            </ScrollingText>
            <p className="text-xs text-muted-foreground mt-1">
              {playlist.track_count} tracks
              {!isCompact && (
                <>
                  {" "}
                  •{" "}
                  {formatDistanceToNow(new Date(playlist.created_at), {
                    addSuffix: true,
                  })}
                </>
              )}
            </p>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onSelect={() => handlePlay(false)}>
          <Play className="mr-2 h-4 w-4" /> Play
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => handlePlay(true)}>
          <Shuffle className="mr-2 h-4 w-4" /> Shuffle
        </ContextMenuItem>
        <ContextMenuItem onSelect={handlePlayNext}>
          <ListPlus className="mr-2 h-4 w-4" /> Play Next
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleAddToQueue}>
          <ListPlus className="mr-2 h-4 w-4" /> Add to Queue
        </ContextMenuItem>

        {(onEdit || onDelete) && <ContextMenuSeparator />}

        {onEdit && (
          <ContextMenuItem onSelect={() => onEdit(playlist)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </ContextMenuItem>
        )}

        {onDelete && (
          <ContextMenuItem
            className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
            onSelect={() => onDelete(playlist)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});

export default PlaylistCard;
