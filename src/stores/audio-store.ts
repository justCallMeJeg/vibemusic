import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Track } from "@/lib/api";

// --- Types ---
type PlaybackStatus = "playing" | "paused" | "stopped" | "loading";
type RepeatMode = "off" | "all" | "one";

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

// --- Store State Interface ---
interface AudioState {
  // Player State
  status: PlaybackStatus;
  currentTrack: Track | null;
  volume: number;

  // Queue State
  queue: Track[];
  currentIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isQueueOpen: boolean;

  // Progress State (updated frequently)
  position: number;
  duration: number;

  // Internal
  _isDraggingSlider: boolean;
  _listenersInitialized: boolean;
  _lastProgressUpdate: number; // For throttling
}

// --- Store Actions Interface ---
interface AudioActions {
  // Player Actions
  play: (track: Track, newQueue?: Track[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;

  // Queue Actions
  toggleQueue: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (trackId: number) => void;
  reorderQueue: (newQueue: Track[]) => void;

  // Progress Actions
  setPosition: (position: number) => void;
  setDraggingSlider: (isDragging: boolean) => void;

  // Initialization
  initListeners: () => () => void;
}

type AudioStore = AudioState & AudioActions;

// --- Store Implementation ---
export const useAudioStore = create<AudioStore>((set, get) => {
  // Internal helper for playing a track
  const playInternal = async (track: Track) => {
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
      set({ status: "stopped" });
    }
  };

  // Internal next handler
  const handleNext = async () => {
    const state = get();
    console.log("[handleNext] Start", {
      queue: state.queue.length,
      currentIndex: state.currentIndex,
      repeat: state.repeat,
      currentTrack: state.currentTrack?.title,
    });

    if (state.queue.length === 0) {
      console.log("[handleNext] Queue empty -> Stop");
      set({ status: "stopped", currentTrack: null });
      await invoke("audio_stop");
      return;
    }

    if (state.repeat === "one") {
      console.log("[handleNext] Repeat One -> Replay");
      if (state.currentTrack) {
        set({ position: 0 });
        await playInternal(state.currentTrack);
      }
      return;
    }

    const newQueue = [...state.queue];

    if (state.repeat === "all") {
      // ... existing repeat all logic
      console.log("[handleNext] Repeat All");
      if (
        newQueue.length > 0 &&
        state.currentIndex >= 0 &&
        state.currentIndex < newQueue.length
      ) {
        const [removed] = newQueue.splice(state.currentIndex, 1);
        newQueue.push(removed);
      }
    } else {
      console.log("[handleNext] Removing current track");
      if (state.currentIndex >= 0 && state.currentIndex < newQueue.length) {
        newQueue.splice(state.currentIndex, 1);
      } else {
        console.warn(
          "[handleNext] Index out of bounds, cannot remove",
          state.currentIndex,
          newQueue.length
        );
      }
    }

    if (newQueue.length === 0) {
      console.log("[handleNext] New queue empty -> Stop");
      set({
        status: "stopped",
        queue: [],
        currentTrack: null,
        currentIndex: -1,
      });
      await invoke("audio_stop");
      return;
    }

    let nextIndex = state.currentIndex;
    // ... rest of logic
    if (nextIndex >= newQueue.length) {
      nextIndex = 0;
    }
    if (nextIndex >= newQueue.length) nextIndex = 0;

    const nextTrack = newQueue[nextIndex];
    set({
      currentTrack: nextTrack,
      currentIndex: nextIndex,
      status: "loading",
      queue: newQueue,
      position: 0,
    });

    await playInternal(nextTrack);
  };

  return {
    // Initial State
    status: "stopped",
    currentTrack: null,
    volume: 1.0,
    queue: [],
    currentIndex: -1,
    shuffle: false,
    repeat: "off",
    isQueueOpen: false,
    position: 0,
    duration: 0,
    _isDraggingSlider: false,
    _listenersInitialized: false,
    _lastProgressUpdate: 0,

    // Player Actions
    play: async (track, newQueue?) => {
      let queue: Track[];
      let index: number;

      if (newQueue) {
        queue = newQueue;
        index = newQueue.findIndex((t) => t.id === track.id);
      } else {
        queue = [track];
        index = 0;
      }

      set({
        currentTrack: track,
        status: "loading",
        queue,
        currentIndex: index,
        position: 0,
      });

      await playInternal(track);
    },

    pause: async () => {
      await invoke("audio_pause");
    },

    resume: async () => {
      await invoke("audio_resume");
    },

    stop: async () => {
      await invoke("audio_stop");
    },

    next: handleNext,

    previous: async () => {
      const state = get();
      if (state.queue.length === 0) return;

      if (state.position > 3000) {
        await invoke("audio_seek", { positionMs: 0 });
        set({ position: 0 });
        return;
      }

      let prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = state.repeat === "all" ? state.queue.length - 1 : 0;
      }

      const prevTrack = state.queue[prevIndex];
      set({
        currentTrack: prevTrack,
        currentIndex: prevIndex,
        status: "loading",
        position: 0,
      });
      await playInternal(prevTrack);
    },

    seek: async (positionMs) => {
      set({ position: positionMs });
      await invoke("audio_seek", { positionMs });
    },

    setVolume: async (volume) => {
      set({ volume });
      await invoke("audio_set_volume", { volume });
    },

    // Queue Actions
    toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
    toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
    toggleRepeat: () =>
      set((s) => ({
        repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
      })),

    addToQueue: (track) =>
      set((s) => {
        const existingIndex = s.queue.findIndex((t) => t.id === track.id);
        if (existingIndex !== -1) {
          // Track exists - move it to the end
          const newQueue = [...s.queue];
          const [removed] = newQueue.splice(existingIndex, 1);
          newQueue.push(removed);
          // Adjust currentIndex if needed
          let newIndex = s.currentIndex;
          if (existingIndex < s.currentIndex) {
            newIndex--;
          }
          return { queue: newQueue, currentIndex: newIndex };
        }
        return { queue: [...s.queue, track] };
      }),

    playNext: (track) =>
      set((s) => {
        const existingIndex = s.queue.findIndex((t) => t.id === track.id);
        const targetIndex = s.currentIndex + 1;

        if (existingIndex !== -1) {
          // Track exists - move it to play next position
          if (existingIndex === targetIndex) {
            return s; // Already in the right position
          }
          const newQueue = [...s.queue];
          const [removed] = newQueue.splice(existingIndex, 1);
          // Calculate insertion point after removal
          const insertAt =
            existingIndex < targetIndex ? targetIndex - 1 : targetIndex;
          newQueue.splice(insertAt, 0, removed);
          // Adjust currentIndex if needed
          let newIndex = s.currentIndex;
          if (existingIndex < s.currentIndex && insertAt >= s.currentIndex) {
            newIndex--;
          } else if (
            existingIndex > s.currentIndex &&
            insertAt <= s.currentIndex
          ) {
            newIndex++;
          }
          return { queue: newQueue, currentIndex: newIndex };
        }

        // Track doesn't exist - insert at play next position
        const newQueue = [...s.queue];
        newQueue.splice(targetIndex, 0, track);
        return { queue: newQueue };
      }),

    removeFromQueue: (trackId) =>
      set((s) => {
        const newQueue = s.queue.filter((t) => t.id !== trackId);
        let newIndex = s.currentIndex;
        const removedIndex = s.queue.findIndex((t) => t.id === trackId);
        if (removedIndex !== -1 && removedIndex < s.currentIndex) {
          newIndex--;
        }
        return { queue: newQueue, currentIndex: newIndex };
      }),

    reorderQueue: (newQueue) =>
      set((s) => {
        const currentTrackId = s.currentTrack?.id;
        const newIndex = newQueue.findIndex((t) => t.id === currentTrackId);
        return {
          queue: newQueue,
          currentIndex: newIndex !== -1 ? newIndex : s.currentIndex,
        };
      }),

    // Progress Actions
    setPosition: (position) => set({ position }),
    setDraggingSlider: (isDragging) => set({ _isDraggingSlider: isDragging }),

    // Initialization
    initListeners: () => {
      if (get()._listenersInitialized) {
        return () => {}; // Already initialized
      }
      set({ _listenersInitialized: true });

      const unlistenState = listen<AudioPlaybackStatePayload>(
        "audio-playback-state",
        (event) => {
          const s = event.payload;
          const newStatus: PlaybackStatus = s.is_playing
            ? "playing"
            : s.is_paused
            ? "paused"
            : "stopped";

          set((state) => {
            if (state.status === newStatus && state.volume === s.volume) {
              return state; // No change
            }
            return {
              status: newStatus,
              volume: s.volume,
              duration: s.duration_ms,
            };
          });
        }
      );

      const unlistenProgress = listen<AudioPlaybackProgressPayload>(
        "audio-playback-progress",
        (event) => {
          const state = get();
          if (state._isDraggingSlider) return;

          // Throttle: only update if at least 500ms has passed
          const now = Date.now();
          if (now - state._lastProgressUpdate < 500) return;

          const s = event.payload;
          set({
            position: s.position_ms,
            duration: s.duration_ms,
            _lastProgressUpdate: now,
          });
        }
      );

      const unlistenFinished = listen("audio-playback-finished", () => {
        handleNext();
      });

      return () => {
        unlistenState.then((f) => f());
        unlistenProgress.then((f) => f());
        unlistenFinished.then((f) => f());
        set({ _listenersInitialized: false });
      };
    },
  };
});

// --- Selectors for optimized subscriptions ---
export const usePlayerStatus = () => useAudioStore((s) => s.status);
export const useCurrentTrack = () => useAudioStore((s) => s.currentTrack);
export const useVolume = () => useAudioStore((s) => s.volume);
export const useQueue = () => useAudioStore((s) => s.queue);
export const useQueueOpen = () => useAudioStore((s) => s.isQueueOpen);
export const useRepeat = () => useAudioStore((s) => s.repeat);
export const useShuffle = () => useAudioStore((s) => s.shuffle);
export const usePosition = () => useAudioStore((s) => s.position);
export const useDuration = () => useAudioStore((s) => s.duration);

// Actions (stable references)
export const usePlayerActions = () =>
  useAudioStore((s) => ({
    play: s.play,
    pause: s.pause,
    resume: s.resume,
    stop: s.stop,
    next: s.next,
    previous: s.previous,
    seek: s.seek,
    setVolume: s.setVolume,
  }));

export const useQueueActions = () =>
  useAudioStore((s) => ({
    addToQueue: s.addToQueue,
    playNext: s.playNext,
    removeFromQueue: s.removeFromQueue,
    reorderQueue: s.reorderQueue,
    toggleQueue: s.toggleQueue,
    toggleShuffle: s.toggleShuffle,
    toggleRepeat: s.toggleRepeat,
  }));

export const useProgressActions = () =>
  useAudioStore((s) => ({
    setPosition: s.setPosition,
    setDraggingSlider: s.setDraggingSlider,
  }));
