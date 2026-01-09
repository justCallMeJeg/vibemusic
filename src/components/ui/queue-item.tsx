import { Track } from "@/lib/api";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
import { useAudioStore } from "@/stores/audio-store";

interface QueueItemProps {
  track: Track;
  isActive?: boolean;
}

export default function QueueItem({ track, isActive }: QueueItemProps) {
  const removeFromQueue = useAudioStore((s) => s.removeFromQueue);
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
          className={`flex items-center gap-3 p-2 rounded-md group hover:bg-white/5 ${
            isActive ? "bg-white/10" : ""
          }`}
        >
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical size={16} />
          </div>
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
