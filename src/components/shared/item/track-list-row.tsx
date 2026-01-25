import { memo } from "react";
import { Track } from "@/lib/api";
import { useCurrentTrack } from "@/stores/audio-store";
import { EntityRow } from "@/components/shared/entity-row";

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
  /** Width of the index column - unused in new implementation but kept for compat */
  indexWidth?: string;
}

/**
 * Reusable row component for track lists.
 * Handles hover and active (currently playing) styling consistently.
 * Now wraps EntityRow for consistency.
 */
const TrackListRow = memo(function TrackListRow({
  track,
  index,
  showArtwork = true,
  rightContent,
  leftContent,
  className,
}: TrackListRowProps) {
  const currentTrack = useCurrentTrack();
  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <EntityRow
      title={track.title}
      subtitle={track.artist || "Unknown Artist"}
      artworkSrc={track.artwork_path || undefined}
      showArtwork={showArtwork}
      index={index}
      active={isCurrentTrack}
      leading={leftContent}
      trailing={rightContent}
      className={className}
      variant="default"
    />
  );
});

export { TrackListRow };
