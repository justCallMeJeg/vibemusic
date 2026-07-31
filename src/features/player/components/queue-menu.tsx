import { useCallback } from "react";
import { VirtualizedSortableList } from "@/components/shared/virtualized-sortable-list";
import { arrayMove } from "@dnd-kit/sortable";
import {
  useCurrentTrack,
  useQueue,
  usePlayerStatus,
  getQueueActions,
} from "@/stores/audio-store";
import type { Track } from "@/lib/api";
import QueueItem from "./queue-item";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { Button } from "@/components/ui/button";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { ListMusic } from "lucide-react";

export default function QueueContent() {
  const currentTrack = useCurrentTrack();
  const queue = useQueue();
  const status = usePlayerStatus();
  const { reorderQueue, clearQueue } = getQueueActions();

  const renderItem = useCallback(
    (track: Track, index: number) => {
      const isCurrent = currentTrack?.id === track.id;
      return <QueueItem key={track.id} track={track} index={index} isActive={isCurrent} />;
    },
    [currentTrack?.id],
  );

  return (
    <>
      {currentTrack && (
        <div className="mb-6 shrink-0">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Now Playing
          </h2>
          <div className="flex items-center gap-4 bg-secondary/50 p-3 rounded-lg border border-border">
            <ArtworkImage
              src={currentTrack.artwork_path}
              alt={currentTrack.title}
              placeholderType="track"
              className="w-12 h-12 rounded shadow-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground truncate text-lg">
                {currentTrack.title}
              </p>
              <p className="text-sm text-foreground truncate">
                {currentTrack.artist || "Unknown Artist"}
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-primary bg-card px-2 py-1 rounded">
              {status === "playing"
                ? "PLAYING"
                : status === "paused"
                  ? "PAUSED"
                  : "STOPPED"}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden h-full flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Tracks
          </h2>
          {queue.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2 text-muted-foreground hover:text-destructive"
              onClick={clearQueue}
            >
              Clear
            </Button>
          )}
        </div>
        <VirtualizedSortableList
          items={queue}
          getItemId={(track) => track.id}
          onReorder={(activeId, overId) => {
            const oldIndex = queue.findIndex((t) => t.id === activeId);
            const newIndex = queue.findIndex((t) => t.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
              reorderQueue(arrayMove(queue, oldIndex, newIndex));
            }
          }}
          renderItem={renderItem}
          paddingBottom="0px"
          emptyState={
            <EmptyPanel icon={ListMusic} title="Queue is empty" />
          }
        />
      </div>
    </>
  );
}
