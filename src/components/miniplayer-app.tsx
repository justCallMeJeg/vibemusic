import { useEffect, useRef, useState } from "react";
import { listen, emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Loader2 } from "lucide-react";
import { useAudioStore } from "@/stores/audio-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Track } from "@/lib/api";
import MiniPlayer from "./mini-player";
import { logger } from "@/lib/logger";

export default function MiniPlayerApp() {
  const [ready, setReady] = useState(false);
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    cleanupRef.current = cleanups;
    let cancelled = false;

    const init = async () => {
      try {
        useAudioStore.setState({
          next: async () => {
            await emit("miniplayer:next");
          },
          previous: async () => {
            await emit("miniplayer:previous");
          },
          toggleShuffle: () => {
            const s = useAudioStore.getState();
            const next = !s.shuffle;
            useAudioStore.setState({ shuffle: next });
            emit("miniplayer:toggle-shuffle", { shuffle: next });
          },
          toggleRepeat: () => {
            const s = useAudioStore.getState();
            const modes: Array<"off" | "all" | "one"> = ["off", "all", "one"];
            const nextIdx = (modes.indexOf(s.repeat) + 1) % modes.length;
            const next = modes[nextIdx];
            useAudioStore.setState({ repeat: next });
            emit("miniplayer:toggle-repeat", { repeat: next });
          },
        });

        const unlistenInit = await listen<{
          currentTrack: unknown;
          position: number;
          duration: number;
          volume: number;
          shuffle: boolean;
          repeat: string;
          miniPlayerStyle: string;
          miniPlayerPosition: string;
        }>("miniplayer:init", (event) => {
          const p = event.payload;
          useAudioStore.setState({
            currentTrack: p.currentTrack as Track | null,
            position: p.position,
            duration: p.duration,
            volume: p.volume,
            shuffle: p.shuffle,
            repeat: p.repeat as "off" | "all" | "one",
            status: "playing",
          });
          useSettingsStore.setState({
            miniPlayerStyle: p.miniPlayerStyle as "square" | "wide" | "bar",
            miniPlayerPosition: p.miniPlayerPosition as
              | "bottom-right"
              | "bottom-left"
              | "top-right"
              | "top-left",
          });
          if (!cancelled) setReady(true);
        });
        cleanups.push(unlistenInit);

        const unlistenState = await listen<{
          is_playing: boolean;
          is_paused: boolean;
          volume: number;
          duration_ms: number;
        }>("audio-playback-state", (event) => {
          const s = event.payload;
          const status = s.is_playing ? "playing" : s.is_paused ? "paused" : "stopped";
          useAudioStore.setState({
            status,
            volume: s.volume,
            duration: s.duration_ms,
          });
        });
        cleanups.push(unlistenState);

        const unlistenProgress = await listen<{
          position_ms: number;
          duration_ms: number;
        }>("audio-playback-progress", (event) => {
          useAudioStore.setState({
            position: event.payload.position_ms,
            duration: event.payload.duration_ms,
          });
        });
        cleanups.push(unlistenProgress);

        const unlistenTrack = await listen<{ track: unknown }>(
          "miniplayer:track-change",
          (event) => {
            useAudioStore.setState({ currentTrack: event.payload.track as Track | null });
          },
        );
        cleanups.push(unlistenTrack);

        try {
          const rustState = await invoke<{
            is_playing: boolean;
            is_paused: boolean;
            current_file: string | null;
            position_ms: number;
            duration_ms: number;
            volume: number;
          }>("audio_get_state");
          if (!cancelled) {
            useAudioStore.setState({
              status: rustState.is_playing
                ? "playing"
                : rustState.is_paused
                  ? "paused"
                  : "stopped",
              position: rustState.position_ms,
              duration: rustState.duration_ms,
              volume: rustState.volume,
            });
          }
        } catch {
          // audio_get_state may fail if nothing is playing
        }

        setTimeout(() => {
          if (!cancelled) setReady(true);
        }, 2000);
      } catch (e) {
        logger.error("MiniPlayerApp init failed", e);
        if (!cancelled) setReady(true);
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  if (!ready) {
    return (
      <div className="w-dvw h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-dvw h-dvh overflow-hidden bg-background">
      <MiniPlayer />
    </div>
  );
}
