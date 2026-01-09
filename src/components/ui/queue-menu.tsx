import { X } from "lucide-react";
import { Button } from "./button";
import {
  useAudioStore,
  useCurrentTrack,
  useQueue,
  useQueueOpen,
} from "@/stores/audio-store";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  MouseSensor,
  TouchSensor,
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
  // Use atomic selectors
  const currentTrack = useCurrentTrack();
  const queue = useQueue();
  const isQueueOpen = useQueueOpen();

  // Get actions directly (stable references)
  const reorderQueue = useAudioStore((s) => s.reorderQueue);
  const toggleQueue = useAudioStore((s) => s.toggleQueue);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
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
      className="h-full flex flex-col rounded-lg outline outline-gray-850 w-full p-4 bg-neutral-900/50 backdrop-blur-xl overflow-hidden"
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Queue</h1>
        <Button size={"icon-sm"} variant="ghost" onClick={toggleQueue}>
          <X />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
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
                    const isCurrent = currentTrack?.id === track.id;
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
