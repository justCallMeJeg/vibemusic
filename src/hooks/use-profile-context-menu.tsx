import { Pencil, Trash2 } from "lucide-react";
import type { ContextMenuItemDef, ProfileMenuActions } from "@/components/shared/context-menu-types";

export function useProfileContextMenu(options: ProfileMenuActions): ContextMenuItemDef[] {
  const { onEdit, onDelete } = options;

  const items: ContextMenuItemDef[] = [];

  if (onEdit) {
    items.push({
      type: "action",
      id: "edit",
      icon: <Pencil size={16} />,
      label: "Edit Profile",
      onSelect: onEdit,
    });
  }

  if (onDelete) {
    if (items.length > 0) items.push({ type: "separator" });
    items.push({
      type: "action",
      id: "delete",
      icon: <Trash2 size={16} />,
      label: "Delete Profile",
      destructive: true,
      onSelect: onDelete,
    });
  }

  return items;
}
