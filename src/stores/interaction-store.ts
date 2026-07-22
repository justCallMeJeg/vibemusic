import { create } from "zustand";

export type FocusSource = "keyboard" | "mouse";

interface InteractionStore {
  focusSource: FocusSource;
  setFocusSource: (source: FocusSource) => void;
}

export const useInteractionStore = create<InteractionStore>((set) => ({
  focusSource: "mouse",
  setFocusSource: (source) => set({ focusSource: source }),
}));
