import { X } from "lucide-react";
import { Button } from "./ui/button";
import { VirtualizedSortableList } from "@/components/shared/virtualized-sortable-list";
import { arrayMove } from "@dnd-kit/sortable";
import {
  useAudioStore,
  useCurrentTrack,
  useQueue,
  useQueueOpen,
  usePlayerStatus,
} from "@/stores/audio-store";
import QueueItem from "./shared/item/queue-item";
import { convertFileSrc } from "@tauri-apps/api/core";
import placeholderArt from "@/assets/placeholder-art.png";

export default function QueueMenu() {
  // Use atomic selectors
  const currentTrack = useCurrentTrack();
  const queue = useQueue();
  const isQueueOpen = useQueueOpen();
  const status = usePlayerStatus();

  // Get actions directly (stable references)
  const reorderQueue = useAudioStore((s) => s.reorderQueue);
  const toggleQueue = useAudioStore((s) => s.toggleQueue);

  if (!isQueueOpen) return null;

  return (
    <div
      id="queue-menu"
      className="h-full flex flex-col rounded-lg outline outline-border w-full p-4 bg-popover/50 backdrop-blur-xl overflow-hidden"
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Queue</h1>
        <Button size={"icon-sm"} variant="ghost" onClick={toggleQueue}>
          <X />
        </Button>
      </div>

      {currentTrack && (
        <div className="mb-6 shrink-0">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Now Playing
          </h2>
          <div className="flex items-center gap-4 bg-secondary/50 p-3 rounded-lg border border-border">
            <img
              src={
                currentTrack.artwork_path
                  ? convertFileSrc(currentTrack.artwork_path)
                  : placeholderArt
              }
              alt={currentTrack.title}
              className="w-12 h-12 rounded object-cover shadow-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground truncate text-lg">
                {currentTrack.title}
              </p>
              <p className="text-sm text-purple-400 truncate">
                {currentTrack.artist || "Unknown Artist"}
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-muted-foreground bg-card px-2 py-1 rounded">
              {status === "playing"
                ? "PLAYING"
                : status === "paused"
                ? "PAUSED"
                : "STOPPED"}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden h-full">
        <div className="h-full flex flex-col">
          {/* Tracks list header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Tracks
            </h2>
            {queue.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2 text-muted-foreground hover:text-red-400"
                onClick={useAudioStore.getState().clearQueue}
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
            renderItem={(track) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <QueueItem key={track.id} track={track} isActive={isCurrent} />
              );
            }}
            paddingBottom="0px"
            emptyState={
              <p className="text-muted-foreground text-sm italic p-2">
                Queue is empty
              </p>
            }
          />
        </div>
      </div>
    </div>
  );
}
