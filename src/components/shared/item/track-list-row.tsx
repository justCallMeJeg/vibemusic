import { memo } from "react";
import { Track } from "@/lib/api";
import { useCurrentTrack } from "@/stores/audio-store";
import { cn } from "@/lib/utils";
import MusicListItem from "./music-list";

interface TrackListRowProps {
  /** The track to display */
  track: Track;
  /** The 1-based index to show (optional, will display if provided) */
  index?: number;
  /** Whether to show the album artwork in the MusicListItem */
  showArtwork?: boolean;
  /** Additional content to render on the right side (e.g., remove button) */
  rightContent?: React.ReactNode;
  /** Additional content to render on the left side (e.g., drag handle) */
  leftContent?: React.ReactNode;
  /** Custom class names for the container */
  className?: string;
  /** Width of the index column */
  indexWidth?: string;
}

/**
 * Reusable row component for track lists.
 * Handles hover and active (currently playing) styling consistently.
 * Used in album detail, playlist detail, and artist detail pages.
 */
const TrackListRow = memo(function TrackListRow({
  track,
  index,
  showArtwork = true,
  rightContent,
  leftContent,
  className,
  indexWidth = "w-12",
}: TrackListRowProps) {
  const currentTrack = useCurrentTrack();
  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 hover:bg-accent/50 rounded-md pr-2 transition-colors px-2",
        isCurrentTrack && "bg-accent/50 outline outline-border",
        className
      )}
    >
      {/* Left content (e.g., drag handle) or index number */}
      {leftContent ? (
        leftContent
      ) : index !== undefined ? (
        <span
          className={cn(
            "text-muted-foreground text-sm text-center shrink-0 font-variant-numeric tabular-nums group-hover:text-foreground transition-colors",
            indexWidth
          )}
        >
          {index}
        </span>
      ) : null}

      {/* Main track content */}
      <div className="flex-1 min-w-0">
        <MusicListItem track={track} showArtwork={showArtwork} disableHover />
      </div>

      {/* Right content (e.g., remove button) */}
      {rightContent}
    </div>
  );
});

export { TrackListRow };
