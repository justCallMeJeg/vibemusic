import { Play, Pause, Shuffle, ListPlus, ListMusic, Pencil, Trash2, Disc3, User, FolderOpen, Copy, Share2, Heart } from "lucide-react";
import type { ContextMenuItemDef, TrackMenuActions } from "@/components/shared/context-menu-types";
interface UseTrackContextMenuOptions extends TrackMenuActions {
  isCurrentTrack?: boolean;
  isPlaying?: boolean;
}

function addSeparator(items: ContextMenuItemDef[], group: ContextMenuItemDef[]): void {
  if (group.length > 0 && items.length > 0) {
    items.push({ type: "separator" });
  }
  items.push(...group);
}

function buildPlaybackGroup(
  onPlay?: () => void,
  onPause?: () => void,
  onShuffle?: () => void,
): ContextMenuItemDef[] {
  const items: ContextMenuItemDef[] = [];
  if (onPlay || onPause) {
    items.push({
      type: "action",
      id: "play",
      icon: onPause ? <Pause size={16} /> : <Play size={16} />,
      label: onPause ? "Pause" : "Play",
      onSelect: onPlay || onPause!,
    });
  }
  if (onShuffle) {
    items.push({
      type: "action",
      id: "shuffle",
      icon: <Shuffle size={16} />,
      label: "Shuffle",
      onSelect: onShuffle,
    });
  }
  return items;
}

function buildQueueGroup(
  onPlayNext?: () => void,
  onAddToQueue?: () => void,
  onAddToPlaylist?: (playlistId: number) => void,
  playlists?: { id: number; name: string }[],
): ContextMenuItemDef[] {
  const items: ContextMenuItemDef[] = [];
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
  return items;
}

function buildNavGroup(
  onGoToAlbum?: () => void,
  onGoToArtist?: () => void,
  onGoToArtists?: { name: string; onSelect: () => void }[],
): ContextMenuItemDef[] {
  const items: ContextMenuItemDef[] = [];
  if (onGoToAlbum) {
    items.push({
      type: "action",
      id: "go-to-album",
      icon: <Disc3 size={16} />,
      label: "Go to Album",
      onSelect: onGoToAlbum,
    });
  }
  if (onGoToArtists && onGoToArtists.length > 1) {
    const artistItems: ContextMenuItemDef[] = onGoToArtists.map((a) => ({
      type: "action",
      id: `go-to-artist-${a.name}`,
      icon: <User size={16} />,
      label: a.name,
      onSelect: a.onSelect,
    }));
    items.push({
      type: "submenu",
      id: "go-to-artist",
      icon: <User size={16} />,
      label: "Go to Artist",
      items: artistItems,
    });
  } else if (onGoToArtist) {
    items.push({
      type: "action",
      id: "go-to-artist",
      icon: <User size={16} />,
      label: "Go to Artist",
      onSelect: onGoToArtist,
    });
  }
  return items;
}

function buildEditGroup(
  onEdit?: () => void,
  onShowInFolder?: () => void,
): ContextMenuItemDef[] {
  const items: ContextMenuItemDef[] = [];
  if (onEdit) {
    items.push({
      type: "action",
      id: "edit",
      icon: <Pencil size={16} />,
      label: "Edit Metadata",
      onSelect: onEdit,
    });
  }
  if (onShowInFolder) {
    items.push({
      type: "action",
      id: "show-in-folder",
      icon: <FolderOpen size={16} />,
      label: "Show in Folder",
      onSelect: onShowInFolder,
    });
  }
  return items;
}

function buildExportGroup(
  onCopyTitle?: () => void,
  onCopyArtist?: () => void,
  onCopyFilePath?: () => void,
  onShare?: () => void,
): ContextMenuItemDef[] {
  const items: ContextMenuItemDef[] = [];
  const copyItems: ContextMenuItemDef[] = [];
  if (onCopyTitle) {
    copyItems.push({
      type: "action",
      id: "copy-title",
      icon: <Copy size={16} />,
      label: "Copy Title",
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
  if (onCopyFilePath) {
    copyItems.push({
      type: "action",
      id: "copy-file-path",
      icon: <Copy size={16} />,
      label: "Copy File Path",
      onSelect: onCopyFilePath,
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
  return items;
}

function buildLikeGroup(onToggleLike?: () => void, isLiked?: boolean): ContextMenuItemDef[] {
  if (!onToggleLike) return [];
  return [
    {
      type: "action",
      id: "toggle-like",
      icon: <Heart size={16} className={isLiked ? "fill-red-500 text-red-500" : ""} />,
      label: isLiked ? "Remove from Liked" : "Add to Liked",
      onSelect: onToggleLike,
    },
  ];
}

function buildDeleteGroup(onDelete?: () => void): ContextMenuItemDef[] {
  if (!onDelete) return [];
  return [
    {
      type: "action",
      id: "delete",
      icon: <Trash2 size={16} />,
      label: "Delete from Library",
      destructive: true,
      onSelect: onDelete,
    },
  ];
}

export function useTrackContextMenu(options: UseTrackContextMenuOptions): ContextMenuItemDef[] {
  const {
    onPlay,
    onPause,
    onShuffle,
    onPlayNext,
    onAddToQueue,
    onAddToPlaylist,
    onEdit,
    onDelete,
    onGoToAlbum,
    onGoToArtist,
    onGoToArtists,
    onShowInFolder,
    onCopyTitle,
    onCopyArtist,
    onCopyFilePath,
    onShare,
    onToggleLike,
    isLiked,
    playlists,
  } = options;

  const items: ContextMenuItemDef[] = [];

  addSeparator(items, buildLikeGroup(onToggleLike, isLiked));
  addSeparator(items, buildPlaybackGroup(onPlay, onPause, onShuffle));
  addSeparator(items, buildQueueGroup(onPlayNext, onAddToQueue, onAddToPlaylist, playlists));
  addSeparator(items, buildNavGroup(onGoToAlbum, onGoToArtist, onGoToArtists));
  addSeparator(items, buildEditGroup(onEdit, onShowInFolder));
  addSeparator(items, buildExportGroup(onCopyTitle, onCopyArtist, onCopyFilePath, onShare));
  addSeparator(items, buildDeleteGroup(onDelete));

  return items;
}
