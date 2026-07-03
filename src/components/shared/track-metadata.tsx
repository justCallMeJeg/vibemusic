import { Clock, FileType } from "lucide-react";
import { Track, MediaMetadata } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
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
  icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between min-h-[1.5em] gap-4">
      <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      {children}
    </div>
  );
}

function MetadataSkeleton({ width }: { width: string }) {
  return <Skeleton className={`h-4 ${width} bg-muted/50`} />;
}

function MetadataValue({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-xs font-medium text-right sm:text-left wrap-break-word leading-tight max-w-[70%] ${className}`}>
      {children}
    </span>
  );
}

export default function TrackMetadata({ track, metadata }: TrackMetadataProps) {
  return (
    <div className="grid gap-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
        Properties
      </h3>

      <div className="bg-card/30 rounded-lg p-3 space-y-3 border border-border/50">
        {/* Album */}
        <MetadataRow label="Album">
          <MetadataValue>{track.album || "Unknown Album"}</MetadataValue>
        </MetadataRow>

        {/* Album Artist */}
        {metadata ? (
          metadata.album_artist && (
            <MetadataRow label="Album Artist">
              <MetadataValue>{metadata.album_artist}</MetadataValue>
            </MetadataRow>
          )
        ) : (
          <MetadataRow label="Album Artist">
            <MetadataSkeleton width="w-[50%]" />
          </MetadataRow>
        )}

        {/* Composer */}
        {metadata ? (
          metadata.composer && (
            <MetadataRow label="Composer">
              <MetadataValue>{metadata.composer}</MetadataValue>
            </MetadataRow>
          )
        ) : (
          <MetadataRow label="Composer">
            <MetadataSkeleton width="w-[60%]" />
          </MetadataRow>
        )}

        {/* Genre */}
        {metadata ? (
          metadata.genre && (
            <MetadataRow label="Genre">
              <MetadataValue>{metadata.genre}</MetadataValue>
            </MetadataRow>
          )
        ) : (
          <MetadataRow label="Genre">
            <MetadataSkeleton width="w-[40%]" />
          </MetadataRow>
        )}

        {/* Year */}
        {metadata ? (
          metadata.date && (
            <MetadataRow label="Year">
              <MetadataValue>{formatYear(metadata.date)}</MetadataValue>
            </MetadataRow>
          )
        ) : (
          <MetadataRow label="Year">
            <MetadataSkeleton width="w-[30%]" />
          </MetadataRow>
        )}

        {/* Track Number */}
        {track.track_number != null && track.track_number > 0 && (
          <MetadataRow label="Track No.">
            <span className="text-xs font-medium text-right">
              {track.track_number}
            </span>
          </MetadataRow>
        )}

        {/* Copyright */}
        {metadata ? (
          metadata.copyright && (
            <MetadataRow label="Copyright">
              <MetadataValue>{metadata.copyright}</MetadataValue>
            </MetadataRow>
          )
        ) : (
          <MetadataRow label="Copyright">
            <MetadataSkeleton width="w-[65%]" />
          </MetadataRow>
        )}

        {/* Duration */}
        <MetadataRow label="Duration" icon={<Clock className="w-3.5 h-3.5" />}>
          <span className="text-xs font-medium tabular-nums text-right">
            {formatDuration(track.duration_ms)}
          </span>
        </MetadataRow>

        {/* Format */}
        {metadata ? (
          <MetadataRow label="Format" icon={<FileType className="w-3.5 h-3.5" />}>
            <span className="text-xs font-medium text-right uppercase">
              {metadata.format_name}
            </span>
          </MetadataRow>
        ) : (
          <MetadataRow label="Format" icon={<FileType className="w-3.5 h-3.5" />}>
            <MetadataSkeleton width="w-12" />
          </MetadataRow>
        )}

        {/* Audio (Sample Rate / Channels) */}
        {metadata ? (
          <MetadataRow
            label="Audio"
            icon={
              <span className="text-[10px] bg-primary/10 px-1 rounded text-primary">
                HZ
              </span>
            }
          >
            <span className="text-xs font-medium text-right">
              {metadata.sample_rate}Hz / {metadata.channels}ch
            </span>
          </MetadataRow>
        ) : (
          <MetadataRow
            label="Audio"
            icon={
              <span className="text-[10px] bg-primary/10 px-1 rounded text-primary">
                HZ
              </span>
            }
          >
            <MetadataSkeleton width="w-24" />
          </MetadataRow>
        )}
      </div>
    </div>
  );
}
