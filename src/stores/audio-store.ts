import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSettingsStore } from "./settings-store";
import { useLibraryStore } from "./library-store";
import { toast } from "sonner";
import { Track } from "@/lib/api";
import { logger } from "@/lib/logger";

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
  _previousVolume: number;
  _isDraggingSlider: boolean;
  _listenersInitialized: boolean;
  _lastProgressUpdate: number; // For throttling
  _lastSeekTime: number; // To ignore legacy progress events after seeking
  _isTransitioning: boolean;
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
  toggleMute: () => void;

  // Queue Actions
  toggleQueue: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (trackId: number) => void;
  reorderQueue: (newQueue: Track[]) => void;
  clearQueue: () => void;

  // Progress Actions
  setPosition: (position: number) => void;
  setDraggingSlider: (isDragging: boolean) => void;

  // Initialization
  initListeners: () => () => void;
}

type AudioStore = AudioState & AudioActions;

// --- Store Implementation ---

/**
 * Store for managing audio playback, queue, and player state.
 */
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
      logger.error("Failed to play", e);
      set({ status: "stopped" });
    }
  };

  // Internal next handler
  // Internal next handler
  const handleNext = async () => {
    const state = get();
    logger.debug("[handleNext] Start", {
      queue: state.queue.length,
      currentIndex: state.currentIndex,
      repeat: state.repeat,
      currentTrack: state.currentTrack?.title,
    });

    if (state.queue.length === 0) {
      logger.debug("[handleNext] Queue empty -> Stop");
      // Don't clear currentTrack so UI can still show last played song
      set({ status: "stopped", position: 0 });
      await invoke("audio_stop");
      return;
    }

    if (state.repeat === "one") {
      logger.debug("[handleNext] Repeat One -> Replay");
      if (state.currentTrack) {
        set({ position: 0 });
        await playInternal(state.currentTrack);
      }
      return;
    }

    // Determine next index
    let nextIndex = state.currentIndex + 1;

    // Handle end of queue
    if (nextIndex >= state.queue.length) {
      if (state.repeat === "all") {
        logger.debug("[handleNext] Repeat All -> Loop to start");
        nextIndex = 0;
      } else {
        logger.debug("[handleNext] End of queue -> Stop");
        set({ status: "stopped", position: 0 });
        await invoke("audio_stop");
        return;
      }
    }

    const nextTrack = state.queue[nextIndex];
    logger.debug(`[handleNext] Playing next: ${nextIndex} ${nextTrack.title}`);

    set({
      currentTrack: nextTrack,
      currentIndex: nextIndex,
      status: "loading",
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
    _previousVolume: 1.0,
    _isDraggingSlider: false,
    _listenersInitialized: false,
    _lastProgressUpdate: 0,
    _lastSeekTime: 0,
    _isTransitioning: false,

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
      set({ position: positionMs, _lastSeekTime: Date.now() });
      await invoke("audio_seek", { positionMs });
    },

    toggleMute: async () => {
      const state = get();
      if (state.volume > 0) {
        // Mute
        set({ _previousVolume: state.volume, volume: 0 });
        await invoke("audio_set_volume", { volume: 0 });
      } else {
        // Unmute - restore previous volume, default to 1.0 if invalid
        const vol = state._previousVolume > 0 ? state._previousVolume : 1.0;
        set({ volume: vol });
        await invoke("audio_set_volume", { volume: vol });
      }
    },

    setVolume: async (volume) => {
      // If user manually sets volume > 0, update previous volume tracking
      if (volume > 0) {
        set({ volume, _previousVolume: volume });
      } else {
        set({ volume });
      }
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

    clearQueue: () =>
      set((s) => {
        if (!s.currentTrack) return { queue: [], currentIndex: -1 };
        return {
          queue: [s.currentTrack],
          currentIndex: 0,
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

          // Ignore updates shortly after seeking to prevent jumping back
          if (now - state._lastSeekTime < 1000) return;

          const s = event.payload;
          set({
            position: s.position_ms,
            duration: s.duration_ms,
            _lastProgressUpdate: now,
          });

          // Automatic Crossfade Logic
          const crossfadeMs =
            useSettingsStore.getState().crossfadeDuration || 0;
          if (crossfadeMs > 0 && s.duration_ms > 0) {
            const threshold = s.duration_ms - crossfadeMs;

            // Check if we reached the transition point
            // Also ensure we aren't already transitioning
            if (s.position_ms >= threshold && !state._isTransitioning) {
              // Verify we have a next track
              const hasNext =
                state.queue.length > 0 &&
                (state.repeat !== "off" ||
                  state.currentIndex < state.queue.length - 1);
              if (hasNext) {
                logger.debug(
                  "Triggering automatic crossfade",
                  s.position_ms,
                  threshold
                );
                set({ _isTransitioning: true });
                get().next();
              }
            }

            // Reset transition flag if we are at the beginning of a track
            if (state._isTransitioning && s.position_ms < threshold * 0.5) {
              set({ _isTransitioning: false });
            }
          }
        }
      );

      const unlistenFinished = listen("audio-playback-finished", () => {
        handleNext();
      });

      // Media Control Events
      const unlistenMediaPlay = listen("media-play", () => {
        get().resume();
      });

      const unlistenMediaPause = listen("media-pause", () => {
        get().pause();
      });

      const unlistenMediaToggle = listen("media-toggle", () => {
        const s = get();
        if (s.status === "playing") s.pause();
        else s.resume();
      });

      const unlistenMediaNext = listen("media-next", () => {
        get().next();
      });

      const unlistenMediaPrev = listen("media-prev", () => {
        get().previous();
      });

      const unlistenMediaStop = listen("media-stop", () => {
        get().stop();
      });

      const unlistenError = listen<string>(
        "audio-playback-error",
        async (event) => {
          logger.error("Playback Error", event.payload);
          const state = get();
          const track = state.currentTrack;

          if (track) {
            // Try to auto-delete first
            try {
              await invoke("delete_track", { trackId: track.id });
              useLibraryStore.getState().fetchLibrary();

              toast("File not found", {
                description: `Removed "${track.title}" from library.`,
              });
            } catch (e) {
              logger.error("Failed to self-heal library", e);
              toast.error(`File missing: ${track.title}`, {
                description: "Run 'Prune Library' in settings to clean up.",
              });
            }

            // Stop or Next?
            get().next();
          }
        }
      );

      return () => {
        unlistenState.then((f) => f());
        unlistenProgress.then((f) => f());
        unlistenFinished.then((f) => f());
        unlistenError.then((f) => f());

        unlistenMediaPlay.then((f) => f());
        unlistenMediaPause.then((f) => f());
        unlistenMediaToggle.then((f) => f());
        unlistenMediaNext.then((f) => f());
        unlistenMediaPrev.then((f) => f());
        unlistenMediaStop.then((f) => f());

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

// Actions (static getters - never cause re-renders)
export const getPlayerActions = () => {
  const s = useAudioStore.getState();
  return {
    play: s.play,
    pause: s.pause,
    resume: s.resume,
    stop: s.stop,
    next: s.next,
    previous: s.previous,
    seek: s.seek,
    setVolume: s.setVolume,
    toggleMute: s.toggleMute,
  };
};

export const getQueueActions = () => {
  const s = useAudioStore.getState();
  return {
    addToQueue: s.addToQueue,
    playNext: s.playNext,
    removeFromQueue: s.removeFromQueue,
    reorderQueue: s.reorderQueue,
    toggleQueue: s.toggleQueue,
    toggleShuffle: s.toggleShuffle,
    toggleRepeat: s.toggleRepeat,
  };
};

export const getProgressActions = () => {
  const s = useAudioStore.getState();
  return {
    setPosition: s.setPosition,
    setDraggingSlider: s.setDraggingSlider,
  };
};
