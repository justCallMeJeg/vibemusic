import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAudioStore } from "@/stores/audio-store";
import { getDominantColor } from "@/lib/color-utils";

export function useTrackGradient(): string {
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const status = useAudioStore((s) => s.status);
  const [gradientColor, setGradientColor] = useState<string>("transparent");

  const isPlaybackActive = status === "playing" || status === "paused";

  useEffect(() => {
    if (!isPlaybackActive) {
      setGradientColor("transparent");
      return;
    }

    if (currentTrack?.artwork_path) {
      const src = convertFileSrc(currentTrack.artwork_path);
      let cancelled = false;
      getDominantColor(src).then((color) => {
        if (!cancelled) setGradientColor(color);
      });
      return () => {
        cancelled = true;
      };
    } else {
      setGradientColor("transparent");
    }
  }, [currentTrack, isPlaybackActive]);

  return gradientColor;
}
