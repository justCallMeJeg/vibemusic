import { useCallback } from "react";
import { useAudioStore } from "@/stores/audio-store";
import type { Track } from "@/lib/api";

export function useTrackActivationHandlers(tracks: Track[]) {
  const play = useAudioStore((s) => s.play);
  const playNext = useAudioStore((s) => s.playNext);

  return {
    keyboardNav: true,
    onItemActivate: useCallback((index: number) => {
      const track = tracks[index];
      if (track) play(track, tracks);
    }, [tracks, play]),
    onItemActivateSecondary: useCallback((index: number) => {
      const track = tracks[index];
      if (track) playNext(track);
    }, [tracks, playNext]),
  };
}