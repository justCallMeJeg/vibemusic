import { type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { CommandItem } from "@/components/ui/command";
import { ScrollingText } from "@/components/shared/scrolling-text";
import { Play, Shuffle, ListMusic, Plus, Disc } from "lucide-react";

interface SearchResultItemProps {
  id: string;
  icon: ReactNode;
  primary: string;
  secondary: string;
  onSelect: () => void;
  onPlay: () => void;
  onShuffle: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  showGoTo?: boolean;
  goToLabel?: string;
  onGoTo?: () => void;
}

export function SearchResultItem({
  id,
  icon,
  primary,
  secondary,
  onSelect,
  onPlay,
  onShuffle,
  onPlayNext,
  onAddToQueue,
  showGoTo,
  goToLabel,
  onGoTo,
}: SearchResultItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <CommandItem
          value={id}
          onSelect={onSelect}
          className="py-1.5"
        >
          {icon}
          <div className="flex flex-col min-w-0 flex-1">
            <ScrollingText className="font-medium group-data-[selected=true]:text-primary transition-colors w-full">
              {primary}
            </ScrollingText>
            <span className="text-xs text-muted-foreground truncate block">
              {secondary}
            </span>
          </div>
        </CommandItem>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={onPlay}>
          <Play className="mr-2 h-4 w-4" /> Play
        </ContextMenuItem>
        <ContextMenuItem onSelect={onShuffle}>
          <Shuffle className="mr-2 h-4 w-4" /> Shuffle
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onPlayNext}>
          <ListMusic className="mr-2 h-4 w-4" /> Play Next
        </ContextMenuItem>
        <ContextMenuItem onSelect={onAddToQueue}>
          <Plus className="mr-2 h-4 w-4" /> Add to Queue
        </ContextMenuItem>
        {showGoTo && onGoTo && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={onGoTo}>
              <Disc className="mr-2 h-4 w-4" /> Go to {goToLabel}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
