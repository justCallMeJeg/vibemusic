import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/stores/selection-store";
import { cn } from "@/lib/utils";
import { ListMusic, ListPlus, Minus, X, Check, SkipForward, Play, Shuffle } from "lucide-react";

interface BatchActionsBarProps {
  entityType: "track" | "album" | "artist" | "playlist";
  onAddToPlaylist?: () => void;
  onAddToQueue?: () => void;
  onPlayNext?: () => void;
  onPlay?: () => void;
  onShuffle?: () => void;
  onRemove?: () => void;
}

const entityLabel: Record<string, string> = {
  track: "tracks",
  album: "albums",
  artist: "artists",
  playlist: "playlists",
};

export function BatchActionsBar({
  entityType,
  onAddToPlaylist,
  onAddToQueue,
  onPlayNext,
  onPlay,
  onShuffle,
  onRemove,
}: BatchActionsBarProps) {
  const selectionCount = useSelectionStore((s) => s.selectedIds.length);
  const totalCount = useSelectionStore((s) => s.items.length);
  const isAllSelected = totalCount > 0 && selectionCount === totalCount;
  const isIndeterminate = selectionCount > 0 && selectionCount < totalCount;

  const handleSelectAll = useCallback(() => {
    useSelectionStore.getState().selectAll();
  }, []);

  const handleClear = useCallback(() => {
    useSelectionStore.getState().disableCheckboxMode();
  }, []);

  const isVisible = selectionCount > 0;

  if (!isVisible) return null;

  const label = entityLabel[entityType] ?? "items";

  return (
    <div
      data-batch-actions
      className={cn(
        "transition-transform duration-300 ease-out translate-y-0",
        !isVisible && "translate-y-full",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="bg-card border border-border/50 rounded-xl shadow-lg backdrop-blur-xl flex items-center gap-3 px-4 py-2.5">
          <div
            role="checkbox"
            aria-checked={
              isAllSelected ? "true" : isIndeterminate ? "mixed" : "false"
            }
            aria-label="Select all"
            className="bg-primary size-4 shrink-0 rounded-sm border border-input flex items-center justify-center cursor-pointer hover:border-foreground/30 transition-colors"
            onClick={handleSelectAll}
          >
            {isAllSelected ? (
              <Check size={12} strokeWidth={3} />
            ) : isIndeterminate ? (
              <Minus size={12} strokeWidth={3} />
            ) : null}
          </div>
          <span className="text-sm font-medium text-foreground min-w-fit">
            {selectionCount} {label} selected
          </span>

          <div className="flex items-center gap-1.5 ml-auto">
            {onPlay && (
              <Button variant="ghost" size="sm" onClick={onPlay}>
                <Play className="size-4 mr-1.5" />
                Play
              </Button>
            )}
            {onShuffle && (
              <Button variant="ghost" size="sm" onClick={onShuffle}>
                <Shuffle className="size-4 mr-1.5" />
                Shuffle
              </Button>
            )}
            {onAddToPlaylist && (
              <Button variant="ghost" size="sm" onClick={onAddToPlaylist}>
                <ListPlus className="size-4 mr-1.5" />
                Playlist
              </Button>
            )}
            {onPlayNext && (
              <Button variant="ghost" size="sm" onClick={onPlayNext}>
                <SkipForward className="size-4 mr-1.5" />
                Next
              </Button>
            )}
            {onAddToQueue && (
              <Button variant="ghost" size="sm" onClick={onAddToQueue}>
                <ListMusic className="size-4 mr-1.5" />
                Queue
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-destructive hover:text-destructive"
              >
                <Minus className="size-4 mr-1.5" />
                Remove
              </Button>
            )}
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="size-4 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
