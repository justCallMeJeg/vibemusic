import { Track } from "@/lib/api";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Play, Pause } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
import { useAudioStore, usePlayerStatus } from "@/stores/audio-store";

interface QueueItemProps {
  track: Track;
  isActive?: boolean;
}

export default function QueueItem({ track, isActive }: QueueItemProps) {
  const removeFromQueue = useAudioStore((s) => s.removeFromQueue);
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const resume = useAudioStore((s) => s.resume);
  const queue = useAudioStore((s) => s.queue);
  const status = usePlayerStatus();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      if (status === "playing") {
        pause();
      } else {
        resume();
      }
    } else {
      // Play this track from the current queue
      // We need to find the queue index, or allow play to take an index?
      // Actually play(track) will reset queue if we don't pass one.
      // But we just want to jump to it.
      // audioStore.play implementation:
      // if newQueue passed, use it. else queue=[track].
      // We should pass the *current* queue to preserve it!
      play(track, queue);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={setNodeRef}
          style={style}
          onClick={handlePlayClick}
          className={`flex items-center gap-3 p-2 rounded-md group hover:bg-white/5 cursor-pointer ${
            isActive ? "bg-white/10" : ""
          }`}
        >
          {/* Drag Handle - Always visible now */}
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white transition-opacity"
          >
            <GripVertical size={16} />
          </div>

          {/* Type/Status Indicator */}
          {
            isActive ? (
              <div className="text-purple-400">
                {status === "playing" ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </div>
            ) : // Placeholder or empty to align?
            // Maybe show nothing or music note?
            // Existing design didn't have icon.
            null
            // <div className="w-4 h-4" />
          }

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p
              className={`text-sm font-medium truncate ${
                isActive ? "text-purple-400" : "text-white"
              }`}
            >
              {track.title}
            </p>
            <p className="text-xs text-neutral-400 truncate">
              {track.artist || "Unknown Artist"}
            </p>
          </div>
          <div className="text-xs text-neutral-500 font-mono">
            {formatDuration(track.duration_ms)}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => removeFromQueue(track.id)}>
          Remove from Queue
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
