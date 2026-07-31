import { create } from "zustand";

export type TimerMode = "duration" | "end_of_track" | "end_of_album";

const DEFAULT_DURATION_MS = 30 * 60_000;

interface SleepTimerState {
  remainingMs: number;
  initialMs: number;
  lastSetMs: number;
  mode: TimerMode;
  isActive: boolean;
}

interface SleepTimerActions {
  start: (totalMs: number, mode: TimerMode) => void;
  tick: () => void;
  cancel: () => void;
}

type SleepTimerStore = SleepTimerState & SleepTimerActions;

export const useSleepTimerStore = create<SleepTimerStore>((set, get) => ({
  remainingMs: 0,
  initialMs: 0,
  lastSetMs: DEFAULT_DURATION_MS,
  mode: "duration",
  isActive: false,

  start: (totalMs, mode) => {
    set({
      remainingMs: totalMs,
      initialMs: totalMs,
      lastSetMs: totalMs,
      mode,
      isActive: true,
    });
  },

  tick: () => {
    const state = get();
    if (!state.isActive) return;
    const next = Math.max(0, state.remainingMs - 1000);
    set({ remainingMs: next });
  },

  cancel: () => {
    set({ remainingMs: 0, initialMs: 0, mode: "duration", isActive: false });
  },
}));
