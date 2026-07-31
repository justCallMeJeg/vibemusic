import { Play, ArrowUpToLine, ArrowDownToLine, Disc3, User, X } from "lucide-react";
import type { ContextMenuItemDef, QueueMenuActions } from "@/components/shared/context-menu-types";

export function useQueueContextMenu(options: QueueMenuActions): ContextMenuItemDef[] {
  const { onPlayNow, onMoveToTop, onMoveToBottom, onGoToAlbum, onGoToArtist, onRemoveFromQueue } = options;

  const items: ContextMenuItemDef[] = [];

  // Group 1: Playback
  if (onPlayNow) {
    items.push({
      type: "action",
      id: "play-now",
      icon: <Play size={16} />,
      label: "Play Now",
      onSelect: onPlayNow,
    });
  }

  // Group 2: Reorder
  const hasReorderActions = onMoveToTop || onMoveToBottom;
  if (hasReorderActions) {
    if (items.length > 0) items.push({ type: "separator" });
    if (onMoveToTop) {
      items.push({
        type: "action",
        id: "move-to-top",
        icon: <ArrowUpToLine size={16} />,
        label: "Move to Top",
        onSelect: onMoveToTop,
      });
    }
    if (onMoveToBottom) {
      items.push({
        type: "action",
        id: "move-to-bottom",
        icon: <ArrowDownToLine size={16} />,
        label: "Move to Bottom",
        onSelect: onMoveToBottom,
      });
    }
  }

  // Group 3: Navigate
  const hasNavActions = onGoToAlbum || onGoToArtist;
  if (hasNavActions) {
    items.push({ type: "separator" });
    if (onGoToAlbum) {
      items.push({
        type: "action",
        id: "go-to-album",
        icon: <Disc3 size={16} />,
        label: "Go to Album",
        onSelect: onGoToAlbum,
      });
    }
    if (onGoToArtist) {
      items.push({
        type: "action",
        id: "go-to-artist",
        icon: <User size={16} />,
        label: "Go to Artist",
        onSelect: onGoToArtist,
      });
    }
  }

  // Group 4: Remove
  if (onRemoveFromQueue) {
    if (items.length > 0) items.push({ type: "separator" });
    items.push({
      type: "action",
      id: "remove-from-queue",
      icon: <X size={16} />,
      label: "Remove from Queue",
      destructive: true,
      onSelect: onRemoveFromQueue,
    });
  }

  return items;
}
