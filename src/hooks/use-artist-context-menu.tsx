import { Play, Shuffle, ListMusic, ListPlus, Copy, Share2, Trash2 } from "lucide-react";
import type { ContextMenuItemDef, ArtistMenuActions } from "@/components/shared/context-menu-types";

export function useArtistContextMenu(options: ArtistMenuActions): ContextMenuItemDef[] {
  const { onPlay, onShuffle, onPlayNext, onAddToQueue, onCopyName, onShare, onDelete } = options;

  const items: ContextMenuItemDef[] = [];

  // Group 1: Playback
  if (onPlay) {
    items.push({
      type: "action",
      id: "play",
      icon: <Play size={16} />,
      label: "Play Top Tracks",
      onSelect: onPlay,
    });
  }
  if (onShuffle) {
    items.push({
      type: "action",
      id: "shuffle",
      icon: <Shuffle size={16} />,
      label: "Shuffle Play",
      onSelect: onShuffle,
    });
  }

  // Group 2: Queue
  const hasQueueActions = onPlayNext || onAddToQueue;
  if (hasQueueActions) {
    if (items.length > 0) items.push({ type: "separator" });
    if (onPlayNext) {
      items.push({
        type: "action",
        id: "play-next",
        icon: <ListMusic size={16} />,
        label: "Play Next",
        onSelect: onPlayNext,
      });
    }
    if (onAddToQueue) {
      items.push({
        type: "action",
        id: "add-to-queue",
        icon: <ListPlus size={16} />,
        label: "Add to Queue",
        onSelect: onAddToQueue,
      });
    }
  }

  // Group 3: Copy/Share
  const hasExportActions = onCopyName || onShare;
  if (hasExportActions) {
    items.push({ type: "separator" });
    if (onCopyName) {
      items.push({
        type: "action",
        id: "copy-name",
        icon: <Copy size={16} />,
        label: "Copy Artist Name",
        onSelect: onCopyName,
      });
    }
    if (onShare) {
      items.push({
        type: "action",
        id: "share",
        icon: <Share2 size={16} />,
        label: "Share",
        onSelect: onShare,
      });
    }
  }

  // Group 4: Delete
  if (onDelete) {
    items.push({ type: "separator" });
    items.push({
      type: "action",
      id: "delete",
      icon: <Trash2 size={16} />,
      label: "Delete Artist",
      destructive: true,
      onSelect: onDelete,
    });
  }

  return items;
}
