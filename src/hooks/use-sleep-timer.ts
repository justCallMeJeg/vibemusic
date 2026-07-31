import { useEffect, useRef } from "react";
import { useAudioStore, usePlayerStatus, useTrackVersion } from "@/stores/audio-store";
import { useSleepTimerStore } from "@/stores/sleep-timer-store";
import { logger } from "@/lib/logger";

export function useSleepTimer() {
  const isActive = useSleepTimerStore((s) => s.isActive);
  const remainingMs = useSleepTimerStore((s) => s.remainingMs);
  const mode = useSleepTimerStore((s) => s.mode);
  const status = usePlayerStatus();
  const trackVersion = useTrackVersion();

  const startedTrackIdRef = useRef<number | null>(null);
  const startedAlbumIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    if (mode !== "duration") {
      startedTrackIdRef.current = useAudioStore.getState().currentTrack?.id ?? null;
      startedAlbumIdRef.current = useAudioStore.getState().currentTrack?.album_id ?? null;
    }
  }, [isActive, mode]);

  useEffect(() => {
    if (!isActive || mode !== "duration" || remainingMs <= 0) return;

    const interval = setInterval(() => {
      useSleepTimerStore.getState().tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, mode, remainingMs]);

  useEffect(() => {
    if (!isActive) return;
    if (remainingMs > 0) return;
    if (mode !== "duration") return;

    logger.info("[sleep-timer] Duration expired, pausing playback");
    useAudioStore.getState().pause();
    useSleepTimerStore.getState().cancel();
  }, [isActive, remainingMs, mode]);

  useEffect(() => {
    if (!isActive || mode === "duration") return;
    if (startedTrackIdRef.current === null) return;

    const audioState = useAudioStore.getState();
    const currentId = audioState.currentTrack?.id ?? null;
    if (currentId === null) return;
    if (currentId === startedTrackIdRef.current) return;

    if (mode === "end_of_track") {
      logger.info("[sleep-timer] Track changed, pausing playback (end_of_track)");
      useAudioStore.getState().pause();
      useSleepTimerStore.getState().cancel();
      return;
    }

    if (mode === "end_of_album" && startedAlbumIdRef.current !== null) {
      const currentAlbumId = audioState.currentTrack?.album_id ?? null;
      if (currentAlbumId !== startedAlbumIdRef.current) {
        logger.info("[sleep-timer] Album changed, pausing playback (end_of_album)");
        useAudioStore.getState().pause();
        useSleepTimerStore.getState().cancel();
      }
    }
  }, [isActive, mode, trackVersion]);

  useEffect(() => {
    if (status === "stopped" && isActive) {
      useSleepTimerStore.getState().cancel();
    }
  }, [status, isActive]);
}
