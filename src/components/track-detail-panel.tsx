import { useCurrentTrack } from "@/stores/audio-store";
import { useRef, useEffect, useState } from "react";
import { probeFile, MediaMetadata } from "@/lib/api";
import { TrackDetailHero } from "@/components/shared/track-detail-hero";
import TrackMetadata from "@/components/shared/track-metadata";
import { logger } from "@/lib/logger";

export default function TrackDetailContent() {
  const currentTrack = useCurrentTrack();
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  const metadataCache = useRef(new Map<string, MediaMetadata>());

  useEffect(() => {
    if (!currentTrack) return;

    const path = currentTrack.file_path;

    if (metadataCache.current.has(path)) {
      setMetadata(metadataCache.current.get(path)!);
      return;
    }

    probeFile(path)
      .then((data) => {
        metadataCache.current.set(path, data);
        setMetadata(data);
      })
      .catch((err) => {
        logger.error("Failed to probe file:", err);
      });
  }, [currentTrack]);

  if (!currentTrack) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No track playing</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-mask-y">
      <TrackDetailHero
        title={currentTrack.title}
        artistNames={currentTrack.artist_names}
        artistIds={currentTrack.artist_ids}
        fallbackArtist={currentTrack.artist}
        fallbackArtistId={currentTrack.artist_id}
        artworkPath={currentTrack.artwork_path}
      />

      <TrackMetadata track={currentTrack} metadata={metadata} />
    </div>
  );
}
