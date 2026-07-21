import { Track } from "@/lib/api";
import { useCurrentTrack, useAudioStore } from "@/stores/audio-store";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListItem } from "@/components/shared/list-item";
import { ArtistLinks } from "@/components/shared/artist-links";
import { formatDuration } from "@/lib/format";

interface SortableTrackItemProps {
  track: Track;
  index: number;
  onRemove: (e: React.MouseEvent) => void;
  dataItemIndex?: number;
}

export function SortableTrackItem({ track, index, onRemove, dataItemIndex }: SortableTrackItemProps) {
  const currentTrack = useCurrentTrack();
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const isCurrentTrack = currentTrack?.id === track.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 hover:bg-accent/50 rounded-md pr-2 transition-colors ${
        isDragging ? "bg-accent shadow-xl" : ""
      } ${
        isCurrentTrack && !isDragging
          ? "bg-accent/50 outline outline-border"
          : ""
      }`}
    >
      <div
        className="w-12 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground group-hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <span className="text-sm font-variant-numeric tabular-nums group-hover:hidden">
          {index + 1}
        </span>
        <GripVertical size={16} className="hidden group-hover:block" />
      </div>

      <div className="flex-1 min-w-0">
        <ListItem
          title={track.title}
          subtitle={
            <ArtistLinks
              names={track.artist_names}
              ids={track.artist_ids}
              roles={track.artist_roles}
              fallbackName={track.artist}
              fallbackId={track.artist_id}
            />
          }
          artworkSrc={track.artwork_path || undefined}
          showArtwork
          active={isCurrentTrack}
          isPlaying={isCurrentTrack}
          trailing={
            <div className="flex items-center gap-3">
              <span className="tabular-nums text-xs">{formatDuration(track.duration_ms)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                title="Remove from playlist"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          }
          onClick={() => {
            if (isCurrentTrack) {
              pause();
            } else {
              play(track);
            }
          }}
          menuActions={{
            onPlay: () => play(track),
            onPause: isCurrentTrack ? () => pause() : undefined,
            onPlayNext: () => playNext(track),
            onAddToQueue: () => addToQueue(track),
          }}
          dataItemIndex={dataItemIndex}
        />
      </div>
    </div>
  );
}
