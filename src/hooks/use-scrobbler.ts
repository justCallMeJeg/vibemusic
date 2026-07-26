import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAudioStore, useTrackVersion } from "@/stores/audio-store";
import { logger } from "@/lib/logger";

export function useScrobbler() {
  const trackVersion = useTrackVersion();
  const startedTrackIdRef = useRef<number | null>(null);

  useEffect(() => {
    const audioState = useAudioStore.getState();
    const track = audioState.currentTrack;
    if (!track) return;
    if (track.id === startedTrackIdRef.current) return;
    startedTrackIdRef.current = track.id;

    const artist = track.artist ?? "Unknown";
    const album = track.album ?? "Unknown";
    const durationSecs = Math.round(audioState.duration / 1000);

    invoke("update_now_playing", {
      artist,
      track: track.title,
      album,
      durationSecs,
    }).catch((e) => logger.warn("[scrobbler] update_now_playing failed:", e));

    logger.debug("[scrobbler] Now Playing:", track.title, "by", artist);
  }, [trackVersion]);
}
