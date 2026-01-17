import { Clock, FileType } from "lucide-react";
import { useCurrentTrack, useAudioStore } from "@/stores/audio-store";
import { useSidePanel } from "@/stores/audio-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import placeholderArt from "@/assets/placeholder-art.png";
import { useMemo, useEffect, useState } from "react";
import { probeFile, MediaMetadata } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { SidePanelLayout } from "@/components/shared/side-panel-layout";
import { ArtistLinks } from "@/components/shared/artist-links";

export default function TrackDetailPanel() {
  const currentTrack = useCurrentTrack();
  const sidePanel = useSidePanel();
  const setSidePanel = useAudioStore((s) => s.setSidePanel);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  const isOpen = sidePanel === "track-details";

  const artworkSrc = useMemo(() => {
    if (!currentTrack?.artwork_path) return placeholderArt;
    return convertFileSrc(currentTrack.artwork_path);
  }, [currentTrack?.artwork_path]);

  // Simple in-memory cache to avoid re-probing the same file
  // Using a ref to persist across re-renders without causing re-renders itself
  const metadataCache = useMemo(() => new Map<string, MediaMetadata>(), []);

  useEffect(() => {
    let isMounted = true;
    let debounceTimer: NodeJS.Timeout;

    if (currentTrack && isOpen) {
      const path = currentTrack.file_path;

      // Check cache first
      if (metadataCache.has(path)) {
        setMetadata(metadataCache.get(path)!);
        return;
      }

      setMetadata(null); // Clear while loading

      // Debounce the probe call
      debounceTimer = setTimeout(() => {
        probeFile(path)
          .then((data) => {
            if (isMounted) {
              metadataCache.set(path, data);
              setMetadata(data);
            }
          })
          .catch((err) => {
            console.error("Failed to probe file:", err);
            if (isMounted) setMetadata(null);
          });
      }, 300); // 300ms debounce
    } else {
      setMetadata(null);
    }

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [currentTrack, isOpen, metadataCache]);

  if (!isOpen) return null;

  if (!currentTrack) {
    return (
      <SidePanelLayout
        title="Track Details"
        onClose={() => setSidePanel("none")}
      >
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p>No track playing</p>
        </div>
      </SidePanelLayout>
    );
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatYear = (dateStr?: string) => {
    if (!dateStr) return null;
    const match = dateStr.match(/\d{4}/);
    return match ? match[0] : dateStr;
  };

  return (
    <SidePanelLayout title="Track Details" onClose={() => setSidePanel("none")}>
      <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
        {/* Artwork - Compact */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-32 h-32 rounded-lg overflow-hidden shadow-xl mb-4 bg-card border border-border/50 relative group">
            <img
              src={artworkSrc}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title & Artist - Compact */}
          <div className="text-center w-full px-2">
            <h2 className="text-base font-bold text-foreground mb-1 leading-tight wrap-break-word">
              {currentTrack.title}
            </h2>
            <div className="text-sm text-primary font-medium wrap-break-word">
              <ArtistLinks
                names={currentTrack.artist_names}
                ids={currentTrack.artist_ids}
                fallbackName={currentTrack.artist}
                fallbackId={currentTrack.artist_id}
                className="justify-center whitespace-normal"
              />
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid gap-3">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
            Properties
          </h3>

          <div className="bg-card/30 rounded-lg p-3 space-y-3 border border-border/50">
            {/* Album */}
            <div className="flex items-start justify-between min-h-[1.5em] gap-4">
              <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                <span className="text-xs">Album</span>
              </div>
              <span className="text-xs font-medium text-right sm:text-left wrap-break-word leading-tight max-w-[70%]">
                {currentTrack.album || "Unknown Album"}
              </span>
            </div>

            {/* Album Artist */}
            {metadata ? (
              metadata.album_artist && (
                <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                    <span className="text-xs">Album Artist</span>
                  </div>
                  <span className="text-xs font-medium text-right sm:text-left wrap-break-word leading-tight max-w-[70%]">
                    {metadata.album_artist}
                  </span>
                </div>
              )
            ) : (
              // Skeleton for Album Artist
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <span className="text-xs">Album Artist</span>
                </div>
                <Skeleton className="h-4 w-[50%] bg-muted/50" />
              </div>
            )}

            {/* Composer */}
            {metadata ? (
              metadata.composer && (
                <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                    <span className="text-xs">Composer</span>
                  </div>
                  <span className="text-xs font-medium text-right sm:text-left wrap-break-word leading-tight max-w-[70%]">
                    {metadata.composer}
                  </span>
                </div>
              )
            ) : (
              // Skeleton for Composer
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <span className="text-xs">Composer</span>
                </div>
                <Skeleton className="h-4 w-[60%] bg-muted/50" />
              </div>
            )}

            {/* Geometry / Genre */}
            {metadata ? (
              metadata.genre && (
                <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                    <span className="text-xs">Genre</span>
                  </div>
                  <span className="text-xs font-medium text-right sm:text-left wrap-break-word leading-tight max-w-[70%]">
                    {metadata.genre}
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <span className="text-xs">Genre</span>
                </div>
                <Skeleton className="h-4 w-[40%] bg-muted/50" />
              </div>
            )}

            {/* Year (Date) */}
            {metadata ? (
              metadata.date && (
                <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                    <span className="text-xs">Year</span>
                  </div>
                  <span className="text-xs font-medium text-right sm:text-left wrap-break-word leading-tight max-w-[70%]">
                    {formatYear(metadata.date)}
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <span className="text-xs">Year</span>
                </div>
                <Skeleton className="h-4 w-[30%] bg-muted/50" />
              </div>
            )}

            {/* Track Number */}
            {currentTrack.track_number && (
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <span className="text-xs">Track No.</span>
                </div>
                <span className="text-xs font-medium text-right">
                  {currentTrack.track_number}
                </span>
              </div>
            )}

            {/* Copyright */}
            {metadata ? (
              metadata.copyright && (
                <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                    <span className="text-xs">Copyright</span>
                  </div>
                  <span className="text-xs font-medium text-right sm:text-left wrap-break-word leading-tight max-w-[70%]">
                    {metadata.copyright}
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <span className="text-xs">Copyright</span>
                </div>
                <Skeleton className="h-4 w-[65%] bg-muted/50" />
              </div>
            )}

            {/* Duration */}
            <div className="flex items-start justify-between min-h-[1.5em] gap-4">
              <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">Duration</span>
              </div>
              <span className="text-xs font-medium tabular-nums text-right">
                {formatDuration(currentTrack.duration_ms)}
              </span>
            </div>

            {/* Format from Probe */}
            {metadata ? (
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <FileType className="w-3.5 h-3.5" />
                  <span className="text-xs">Format</span>
                </div>
                <span className="text-xs font-medium text-right uppercase">
                  {metadata.format_name}
                </span>
              </div>
            ) : (
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <FileType className="w-3.5 h-3.5" />
                  <span className="text-xs">Format</span>
                </div>
                <Skeleton className="h-4 w-12 bg-muted/50" />
              </div>
            )}

            {/* Channels/Sample Rate from Probe */}
            {metadata ? (
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <span className="text-[10px] bg-primary/10 px-1 rounded text-primary">
                    HZ
                  </span>
                  <span className="text-xs">Audio</span>
                </div>
                <span className="text-xs font-medium text-right">
                  {metadata.sample_rate}Hz / {metadata.channels}ch
                </span>
              </div>
            ) : (
              <div className="flex items-start justify-between min-h-[1.5em] gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
                  <span className="text-[10px] bg-primary/10 px-1 rounded text-primary">
                    HZ
                  </span>
                  <span className="text-xs">Audio</span>
                </div>
                <Skeleton className="h-4 w-24 bg-muted/50" />
              </div>
            )}
          </div>
        </div>
      </div>
    </SidePanelLayout>
  );
}
