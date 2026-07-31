import { Track, MediaMetadata } from "@/lib/api";
import { formatDuration } from "@/lib/format";

interface TrackMetadataProps {
  track: Track;
  metadata: MediaMetadata | null;
}

function formatYear(dateStr?: string) {
  if (!dateStr) return null;
  const match = dateStr.match(/\d{4}/);
  return match ? match[0] : dateStr;
}

function MetadataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 min-h-[1.25em]">
      <span className="text-xs text-muted-foreground shrink-0 mt-px">{label}</span>
      <span className="text-xs font-medium text-right text-foreground max-w-[60%] truncate">
        {children}
      </span>
    </div>
  );
}

export default function TrackMetadata({ track, metadata }: TrackMetadataProps) {
  return (
    <div className="space-y-1.5">
      <MetadataRow label="Album">
        {track.album || "Unknown Album"}
      </MetadataRow>

      {metadata?.album_artist && (
        <MetadataRow label="Album Artist">{metadata.album_artist}</MetadataRow>
      )}

      {metadata?.composer && (
        <MetadataRow label="Composer">{metadata.composer}</MetadataRow>
      )}

      {metadata?.genre && (
        <MetadataRow label="Genre">{metadata.genre}</MetadataRow>
      )}

      {metadata?.date && formatYear(metadata.date) && (
        <MetadataRow label="Year">{formatYear(metadata.date)!}</MetadataRow>
      )}

      {track.track_number != null && track.track_number > 0 && (
        <MetadataRow label="Track No.">{track.track_number}</MetadataRow>
      )}

      {metadata?.copyright && (
        <MetadataRow label="Copyright">{metadata.copyright}</MetadataRow>
      )}

      <MetadataRow label="Duration">
        {formatDuration(track.duration_ms)}
      </MetadataRow>

      {metadata && (
        <MetadataRow label="Format">
          <span className="uppercase">{metadata.format_name}</span>
        </MetadataRow>
      )}

      {metadata && (
        <MetadataRow label="Audio">
          {metadata.sample_rate}Hz / {metadata.channels}ch
        </MetadataRow>
      )}
    </div>
  );
}
