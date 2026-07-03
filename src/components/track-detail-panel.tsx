import { useCurrentTrack, useAudioStore } from "@/stores/audio-store";
import { useSidePanel } from "@/stores/audio-store";
import { useRef, useEffect, useState } from "react";
import { probeFile, MediaMetadata } from "@/lib/api";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { SidePanelLayout } from "@/components/shared/side-panel-layout";
import { ArtistLinks } from "@/components/shared/artist-links";
import TrackMetadata from "@/components/shared/track-metadata";
import { logger } from "@/lib/logger";

export default function TrackDetailPanel() {
  const currentTrack = useCurrentTrack();
  const sidePanel = useSidePanel();
  const setSidePanel = useAudioStore((s) => s.setSidePanel);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  const isOpen = sidePanel === "track-details";

  // Simple in-memory cache to avoid re-probing the same file
  // Using a ref to persist across re-renders without causing re-renders itself
  const metadataCache = useRef(new Map<string, MediaMetadata>());

  useEffect(() => {
    let isMounted = true;
    let debounceTimer: ReturnType<typeof setTimeout>;

    if (currentTrack && isOpen) {
      const path = currentTrack.file_path;

      // Check cache first
      if (metadataCache.current.has(path)) {
        setMetadata(metadataCache.current.get(path)!);
        return;
      }

      setMetadata(null); // Clear while loading

      // Debounce the probe call
      debounceTimer = setTimeout(() => {
        probeFile(path)
          .then((data) => {
            if (isMounted) {
              metadataCache.current.set(path, data);
              setMetadata(data);
            }
          })
          .catch((err) => {
            logger.error("Failed to probe file:", err);
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
  }, [currentTrack, isOpen]);

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

  return (
    <SidePanelLayout title="Track Details" onClose={() => setSidePanel("none")}>
      <div className="flex-1 overflow-y-auto pb-4 ">
        {/* Artwork - Compact */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-32 h-32 rounded-lg overflow-hidden shadow-xl mb-4 bg-card border border-border/50 relative group">
            <ArtworkImage
              src={currentTrack.artwork_path}
              alt={currentTrack.title}
              placeholderType="track"
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

        <TrackMetadata track={currentTrack} metadata={metadata} />
      </div>
    </SidePanelLayout>
  );
}
