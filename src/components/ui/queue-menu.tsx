import { X } from "lucide-react";
import { Button } from "./button";
import { useAudio } from "@/context/audio-context";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import QueueItem from "./queue-item";
import { convertFileSrc } from "@tauri-apps/api/core";
import placeholderArt from "@/assets/placeholder-art.jpg";

export default function QueueMenu() {
  const { queue, currentTrack, reorderQueue, toggleQueue, isQueueOpen } =
    useAudio();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex((t) => t.id === active.id);
      const newIndex = queue.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderQueue(arrayMove(queue, oldIndex, newIndex));
      }
    }
  };

  if (!isQueueOpen) return null;

  return (
    <div
      id="queue-menu"
      className="h-full flex flex-col rounded-lg outline outline-gray-850 w-full p-4 bg-neutral-900/50 backdrop-blur-xl"
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Queue</h1>
        <Button size={"icon-sm"} variant="ghost" onClick={toggleQueue}>
          <X />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {currentTrack && (
          <div className="mb-6">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">
              Now Playing
            </h2>
            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
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
                <p className="font-bold text-white truncate text-lg">
                  {currentTrack.title}
                </p>
                <p className="text-sm text-purple-400 truncate">
                  {currentTrack.artist || "Unknown Artist"}
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-neutral-500 bg-neutral-900 px-2 py-1 rounded">
                PLAYING
              </div>
            </div>
          </div>
        )}

        <div className="mb-2">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">
            Up Next
          </h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={queue.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-1">
                {queue.length === 0 ? (
                  <p className="text-neutral-500 text-sm italic p-2">
                    Queue is empty
                  </p>
                ) : (
                  queue.map((track) => {
                    // Optional: verify if we want to show dragging for current track again?
                    // Or just list everything.
                    // If 'Now Playing' is separate, we might want to exclude it from the sortable list?
                    // If we include it, it appears twice.
                    // Let's filter out the current track from the sortable list if it's displayed above?
                    // But the user might want to drag it elsewhere to "unplay" it or move it down?
                    // Usually 'Now Playing' is special.

                    const isCurrent = currentTrack?.id === track.id;
                    // If we want to allow reordering everything, we should probably just show one list.
                    // But the design requested "Now Playing" and "Up Next".

                    // Let's hide the current track from this list to avoid duplication if we show it above.
                    if (isCurrent) return null;

                    return <QueueItem key={track.id} track={track} />;
                  })
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
