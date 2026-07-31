import { type ReactNode } from "react";
import { CommandItem } from "@/components/ui/command";
import { ScrollingText } from "@/components/shared/scrolling-text";
import { UnifiedContextMenu } from "@/components/shared/unified-context-menu";
import { useTrackContextMenu } from "@/hooks/use-track-context-menu";

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
  const trackMenuItems = useTrackContextMenu({
    onPlay,
    onShuffle,
    onPlayNext,
    onAddToQueue,
    onGoToAlbum: showGoTo && goToLabel === "Album" ? onGoTo : undefined,
    onGoToArtist: showGoTo && goToLabel === "Artist" ? onGoTo : undefined,
  });

  return (
    <UnifiedContextMenu items={trackMenuItems}>
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
    </UnifiedContextMenu>
  );
}
