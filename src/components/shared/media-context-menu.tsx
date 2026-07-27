import { type ReactNode } from "react";
import { Play, Shuffle, ListPlus, Pencil, Trash2, Pin, PinOff } from "lucide-react";
import { UnifiedContextMenu } from "@/components/shared/unified-context-menu";
import type { ContextMenuItemDef } from "@/components/shared/context-menu-types";

interface MediaContextMenuProps {
  children: ReactNode;
  onPlay?: () => void;
  onShuffle?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  isPinned?: boolean;
}

export function MediaContextMenu({
  children,
  onPlay,
  onShuffle,
  onPlayNext,
  onAddToQueue,
  onEdit,
  onDelete,
  onTogglePin,
  isPinned,
}: MediaContextMenuProps) {
  const items: ContextMenuItemDef[] = [];

  if (onPlay) {
    items.push({
      type: "action",
      id: "play",
      icon: <Play size={16} />,
      label: "Play",
      onSelect: onPlay,
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
  if (onPlayNext) {
    items.push({
      type: "action",
      id: "play-next",
      icon: <ListPlus size={16} />,
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
  if (onTogglePin) {
    if (items.length > 0) items.push({ type: "separator" });
    items.push({
      type: "action",
      id: "toggle-pin",
      icon: isPinned ? <PinOff size={16} /> : <Pin size={16} />,
      label: isPinned ? "Unpin" : "Pin",
      onSelect: onTogglePin,
    });
  }
  if (onEdit) {
    if (items.length > 0) items.push({ type: "separator" });
    items.push({
      type: "action",
      id: "edit",
      icon: <Pencil size={16} />,
      label: "Edit",
      onSelect: onEdit,
    });
  }
  if (onDelete) {
    if (items.length > 0 && items[items.length - 1]?.type !== "separator") {
      items.push({ type: "separator" });
    }
    items.push({
      type: "action",
      id: "delete",
      icon: <Trash2 size={16} />,
      label: "Delete",
      destructive: true,
      onSelect: onDelete,
    });
  }

  return (
    <UnifiedContextMenu items={items}>
      {children}
    </UnifiedContextMenu>
  );
}
