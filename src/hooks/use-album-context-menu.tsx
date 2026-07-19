import { Play, Shuffle, ListPlus, ListMusic, Pencil, Trash2, User, Copy, Share2 } from "lucide-react";
import type { ContextMenuItemDef, AlbumMenuActions } from "@/components/shared/context-menu-types";

export function useAlbumContextMenu(options: AlbumMenuActions): ContextMenuItemDef[] {
  const {
    onPlay,
    onShuffle,
    onPlayNext,
    onAddToQueue,
    onAddToPlaylist,
    onEdit,
    onDelete,
    onGoToArtist,
    onCopyTitle,
    onCopyArtist,
    onShare,
    playlists,
  } = options;

  const items: ContextMenuItemDef[] = [];

  // Group 1: Playback
  if (onPlay) {
    items.push({
      type: "action",
      id: "play",
      icon: <Play size={16} />,
      label: "Play Album",
      onSelect: onPlay,
    });
  }
  if (onShuffle) {
    items.push({
      type: "action",
      id: "shuffle",
      icon: <Shuffle size={16} />,
      label: "Shuffle Album",
      onSelect: onShuffle,
    });
  }

  // Group 2: Queue
  const hasQueueActions = onPlayNext || onAddToQueue || (onAddToPlaylist && playlists);
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
    if (onAddToPlaylist && playlists) {
      const playlistSubmenuItems: ContextMenuItemDef[] = playlists.length > 0
        ? playlists.map((pl) => ({
            type: "action" as const,
            id: `playlist-${pl.id}`,
            label: pl.name,
            onSelect: () => onAddToPlaylist(pl.id),
          }))
        : [{ type: "action" as const, id: "no-playlists", label: "No playlists", disabled: true, onSelect: () => {} }];

      items.push({
        type: "submenu",
        id: "add-to-playlist",
        icon: <ListMusic size={16} />,
        label: "Add to Playlist",
        items: playlistSubmenuItems,
      });
    }
  }

  // Group 3: Navigate
  if (onGoToArtist) {
    items.push({ type: "separator" });
    items.push({
      type: "action",
      id: "go-to-artist",
      icon: <User size={16} />,
      label: "Go to Artist",
      onSelect: onGoToArtist,
    });
  }

  // Group 4: Edit
  if (onEdit) {
    items.push({ type: "separator" });
    items.push({
      type: "action",
      id: "edit",
      icon: <Pencil size={16} />,
      label: "Edit Metadata",
      onSelect: onEdit,
    });
  }

  // Group 5: Copy/Share
  const hasExportActions = onCopyTitle || onCopyArtist || onShare;
  if (hasExportActions) {
    items.push({ type: "separator" });
    const copyItems: ContextMenuItemDef[] = [];
    if (onCopyTitle) {
      copyItems.push({
        type: "action",
        id: "copy-title",
        icon: <Copy size={16} />,
        label: "Copy Album Title",
        onSelect: onCopyTitle,
      });
    }
    if (onCopyArtist) {
      copyItems.push({
        type: "action",
        id: "copy-artist",
        icon: <Copy size={16} />,
        label: "Copy Artist",
        onSelect: onCopyArtist,
      });
    }
    if (copyItems.length > 0) {
      items.push({
        type: "submenu",
        id: "copy",
        icon: <Copy size={16} />,
        label: "Copy",
        items: copyItems,
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

  // Group 6: Delete
  if (onDelete) {
    items.push({ type: "separator" });
    items.push({
      type: "action",
      id: "delete",
      icon: <Trash2 size={16} />,
      label: "Delete Album",
      destructive: true,
      onSelect: onDelete,
    });
  }

  return items;
}
