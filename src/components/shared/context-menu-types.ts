import type { ReactNode } from "react";

export type ContextMenuItemDef =
  | {
      type: "action";
      id: string;
      label: string;
      icon?: ReactNode;
      onSelect: () => void;
      disabled?: boolean;
      destructive?: boolean;
    }
  | { type: "separator" }
  | {
      type: "submenu";
      id: string;
      label: string;
      icon?: ReactNode;
      items: ContextMenuItemDef[];
    };

export interface TrackMenuActions {
  onPlay?: () => void;
  onPause?: () => void;
  onShuffle?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
  onAddToPlaylist?: (playlistId: number) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onGoToAlbum?: () => void;
  onGoToArtist?: () => void;
  onGoToArtists?: { name: string; onSelect: () => void }[];
  onShowInFolder?: () => void;
  onToggleLike?: () => void;
  isLiked?: boolean;
  onCopyTitle?: () => void;
  onCopyArtist?: () => void;
  onCopyFilePath?: () => void;
  onShare?: () => void;
  playlists?: { id: number; name: string }[];
}

export interface AlbumMenuActions {
  onPlay?: () => void;
  onShuffle?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
  onAddToPlaylist?: (playlistId: number) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onGoToArtist?: () => void;
  onCopyTitle?: () => void;
  onCopyArtist?: () => void;
  onShare?: () => void;
  playlists?: { id: number; name: string }[];
}

export interface ArtistMenuActions {
  onPlay?: () => void;
  onShuffle?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
  onCopyName?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

export interface PlaylistMenuActions {
  onPlay?: () => void;
  onShuffle?: () => void;
  onEdit?: () => void;
  onAddTracks?: () => void;
  onCopyName?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  isPinned?: boolean;
}

export interface QueueMenuActions {
  onPlayNow?: () => void;
  onMoveToTop?: () => void;
  onMoveToBottom?: () => void;
  onGoToAlbum?: () => void;
  onGoToArtist?: () => void;
  onRemoveFromQueue?: () => void;
}

export interface ProfileMenuActions {
  onEdit?: () => void;
  onDelete?: () => void;
}
