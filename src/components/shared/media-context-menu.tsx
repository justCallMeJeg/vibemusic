import { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Play, Shuffle, ListPlus } from "lucide-react";

interface MediaContextMenuProps {
  children: ReactNode;
  onPlay?: () => void;
  onShuffle?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
  /** Custom menu items to append */
  extraItems?: ReactNode;
}

export function MediaContextMenu({
  children,
  onPlay,
  onShuffle,
  onPlayNext,
  onAddToQueue,
  extraItems,
}: MediaContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {onPlay && (
          <ContextMenuItem onSelect={onPlay}>
            <Play className="mr-2 h-4 w-4" /> Play
          </ContextMenuItem>
        )}
        {onShuffle && (
          <ContextMenuItem onSelect={onShuffle}>
            <Shuffle className="mr-2 h-4 w-4" /> Shuffle
          </ContextMenuItem>
        )}
        {onPlayNext && (
          <ContextMenuItem onSelect={onPlayNext}>
            <ListPlus className="mr-2 h-4 w-4" /> Play Next
          </ContextMenuItem>
        )}
        {onAddToQueue && (
          <ContextMenuItem onSelect={onAddToQueue}>
            <ListPlus className="mr-2 h-4 w-4" /> Add to Queue
          </ContextMenuItem>
        )}
        {extraItems}
      </ContextMenuContent>
    </ContextMenu>
  );
}
