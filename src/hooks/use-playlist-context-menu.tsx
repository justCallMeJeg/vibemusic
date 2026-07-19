import { Play, Shuffle, Pencil, ListMusic, Copy, Share2, Trash2 } from "lucide-react";
import type { ContextMenuItemDef, PlaylistMenuActions } from "@/components/shared/context-menu-types";

export function usePlaylistContextMenu(options: PlaylistMenuActions): ContextMenuItemDef[] {
  const { onPlay, onShuffle, onEdit, onAddTracks, onCopyName, onShare, onDelete } = options;

  const items: ContextMenuItemDef[] = [];

  // Group 1: Playback
  if (onPlay) {
    items.push({
      type: "action",
      id: "play",
      icon: <Play size={16} />,
      label: "Play Playlist",
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

  // Group 2: Manage
  const hasManageActions = onEdit || onAddTracks;
  if (hasManageActions) {
    if (items.length > 0) items.push({ type: "separator" });
    if (onEdit) {
      items.push({
        type: "action",
        id: "edit",
        icon: <Pencil size={16} />,
        label: "Edit Playlist",
        onSelect: onEdit,
      });
    }
    if (onAddTracks) {
      items.push({
        type: "action",
        id: "add-tracks",
        icon: <ListMusic size={16} />,
        label: "Add Tracks",
        onSelect: onAddTracks,
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
        label: "Copy Playlist Name",
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
      label: "Delete Playlist",
      destructive: true,
      onSelect: onDelete,
    });
  }

  return items;
}
