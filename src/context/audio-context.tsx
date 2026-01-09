import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Track } from "@/lib/api";

interface PlaybackState {
  status: "playing" | "paused" | "stopped" | "loading";
  currentTrack: Track | null;
  queue: Track[]; // [NEW] Track list
  currentIndex: number; // [NEW] Current track index
  duration: number; // in ms
  position: number; // in ms
  volume: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  isQueueOpen: boolean;
}

interface AudioPlaybackStatePayload {
  is_playing: boolean;
  is_paused: boolean;
  volume: number;
  duration_ms: number;
}

interface AudioPlaybackProgressPayload {
  position_ms: number;
  duration_ms: number;
}

interface AudioContextType extends PlaybackState {
  play: (track: Track, newQueue?: Track[]) => Promise<void>; // [MODIFIED] Accept optional queue
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  next: () => Promise<void>; // [NEW]
  previous: () => Promise<void>; // [NEW]
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleQueue: () => void;
  reorderQueue: (newQueue: Track[]) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlaybackState>({
    status: "stopped",
    currentTrack: null,
    queue: [],
    currentIndex: -1,
    duration: 0,
    position: 0,
    volume: 1.0,
    shuffle: false,
    repeat: "off",
    isQueueOpen: false,
  });

  const isDraggingSlider = useRef(false);
  const stateRef = useRef(state);

  // Update ref whenever state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 1. Define internal helper first
  const playInternal = useCallback(async (track: Track) => {
    try {
      await invoke("audio_play", {
        path: track.file_path,
        title: track.title,
        artist: track.artist,
        album: track.album,
        cover: track.artwork_path,
      });
    } catch (e) {
      console.error("Failed to play:", e);
      setState((prev) => ({ ...prev, status: "stopped" }));
    }
  }, []);

  // 2. Define core logic that depends on playInternal
  const handleNext = useCallback(async () => {
    const s = stateRef.current;
    if (s.queue.length === 0) return;

    let nextIndex = s.currentIndex + 1;

    if (s.repeat === "one") {
      // Replay current
      nextIndex = s.currentIndex;
    } else if (nextIndex >= s.queue.length) {
      if (s.repeat === "all") {
        nextIndex = 0;
      } else {
        // Stop
        setState((prev) => ({ ...prev, status: "stopped", position: 0 }));
        return;
      }
    }

    const nextTrack = s.queue[nextIndex];
    setState((prev) => ({
      ...prev,
      currentTrack: nextTrack,
      currentIndex: nextIndex,
      status: "loading",
      position: 0,
    }));
    await playInternal(nextTrack);
  }, [playInternal]);

  const handlePrevious = useCallback(async () => {
    const s = stateRef.current;
    if (s.queue.length === 0) return;

    // If played more than 3 seconds, replay
    if (s.position > 3000) {
      await invoke("audio_seek", { positionMs: 0 });
      setState((prev) => ({ ...prev, position: 0 }));
      return;
    }

    let prevIndex = s.currentIndex - 1;
    if (prevIndex < 0) {
      if (s.repeat === "all") {
        prevIndex = s.queue.length - 1;
      } else {
        prevIndex = 0; // Stay at first
      }
    }

    const prevTrack = s.queue[prevIndex];
    setState((prev) => ({
      ...prev,
      currentTrack: prevTrack,
      currentIndex: prevIndex,
      status: "loading",
      position: 0,
    }));
    await playInternal(prevTrack);
  }, [playInternal]);

  const play = useCallback(
    async (track: Track, newQueue?: Track[]) => {
      let queue = state.queue;
      let index = -1;

      if (newQueue) {
        queue = newQueue;
        index = newQueue.findIndex((t) => t.id === track.id);
      } else {
        index = queue.findIndex((t) => t.id === track.id);
        if (index === -1) {
          queue = [track];
          index = 0;
        }
      }

      setState((prev) => ({
        ...prev,
        currentTrack: track,
        status: "loading",
        position: 0,
        queue,
        currentIndex: index,
      }));

      await playInternal(track);
    },
    [state.queue, playInternal]
  );

  // 3. Define Effects now that handlers are defined
  useEffect(() => {
    // Initial state update
    invoke<PlaybackState>("audio_get_state").then((_s) => {
      // Sync initial state if needed
    });

    const unlistenState = listen<AudioPlaybackStatePayload>(
      "audio-playback-state",
      (event) => {
        const s = event.payload;
        setState((prev) => ({
          ...prev,
          status: s.is_playing ? "playing" : s.is_paused ? "paused" : "stopped",
          volume: s.volume,
          duration: s.duration_ms,
        }));
      }
    );

    const unlistenProgress = listen<AudioPlaybackProgressPayload>(
      "audio-playback-progress",
      (event) => {
        if (isDraggingSlider.current) return;
        const s = event.payload;
        setState((prev) => ({
          ...prev,
          position: s.position_ms,
          duration: s.duration_ms,
        }));
      }
    );

    const unlistenFinished = listen("audio-playback-finished", () => {
      handleNext();
    });

    return () => {
      unlistenState.then((f) => f());
      unlistenProgress.then((f) => f());
      unlistenFinished.then((f) => f());
    };
  }, [handleNext]);

  // 4. Other handlers
  const next = useCallback(async () => handleNext(), [handleNext]);
  const previous = useCallback(async () => handlePrevious(), [handlePrevious]);

  const pause = useCallback(async () => {
    await invoke("audio_pause");
  }, []);
  const resume = useCallback(async () => {
    await invoke("audio_resume");
  }, []);
  const stop = useCallback(async () => {
    await invoke("audio_stop");
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    setState((prev) => ({ ...prev, position: positionMs }));
    await invoke("audio_seek", { positionMs });
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    setState((prev) => ({ ...prev, volume }));
    await invoke("audio_set_volume", { volume });
  }, []);

  const toggleShuffle = () =>
    setState((prev) => ({ ...prev, shuffle: !prev.shuffle }));

  const toggleRepeat = () =>
    setState((prev) => {
      const next =
        prev.repeat === "off" ? "all" : prev.repeat === "all" ? "one" : "off";
      return { ...prev, repeat: next };
    });

  const toggleQueue = () =>
    setState((prev) => ({ ...prev, isQueueOpen: !prev.isQueueOpen }));

  const reorderQueue = (newQueue: Track[]) => {
    setState((prev) => {
      // Find new index of current track
      const currentTrackId = prev.currentTrack?.id;
      const newIndex = newQueue.findIndex((t) => t.id === currentTrackId);

      return {
        ...prev,
        queue: newQueue,
        currentIndex: newIndex !== -1 ? newIndex : prev.currentIndex,
      };
    });
  };

  return (
    <AudioContext.Provider
      value={{
        ...state,
        play,
        pause,
        resume,
        stop,
        next,
        previous,
        seek,
        setVolume,
        toggleShuffle,
        toggleRepeat,
        toggleQueue,
        reorderQueue,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
