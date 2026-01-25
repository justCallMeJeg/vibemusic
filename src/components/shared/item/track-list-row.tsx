import { memo } from "react";
import { Track } from "@/lib/api";
import { useCurrentTrack, usePlayerStatus } from "@/stores/audio-store";
import { EntityRow } from "@/components/shared/entity-row";
import { ArtistLinks } from "@/components/shared/artist-links";

interface TrackListRowProps extends React.HTMLAttributes<HTMLDivElement> {
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
  ...props
}: TrackListRowProps) {
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <EntityRow
      title={track.title}
      subtitle={
        <ArtistLinks
          names={track.artist_names}
          ids={
            track.artist_ids?.length
              ? track.artist_ids
              : track.artist_id
                ? [track.artist_id]
                : []
          }
          fallbackName={track.artist}
          fallbackId={track.artist_id}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        />
      }
      artworkSrc={track.artwork_path || undefined}
      showArtwork={showArtwork}
      index={index}
      active={isCurrentTrack}
      playing={isCurrentTrack && status === "playing"}
      leading={leftContent}
      trailing={rightContent}
      className={className}
      variant="default"
      {...props}
    />
  );
});

export { TrackListRow };
