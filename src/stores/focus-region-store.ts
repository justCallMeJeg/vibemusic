import { create } from "zustand";
import { useSettingsStore } from "./settings-store";
import {
  getVisibleRegions,
  focusElement,
  setRegionActive,
} from "./focus-region-utils";

export type FocusRegion = "sidebar" | "main" | "player" | "sidepanel";

interface FocusRegionState {
  activeRegion: FocusRegion | null;
}

interface FocusRegionActions {
  setActiveRegion: (region: FocusRegion | null) => void;
  focusRegion: (region: FocusRegion) => void;
  cycleForward: () => void;
  cycleBackward: () => void;
}

type FocusRegionStore = FocusRegionState & FocusRegionActions;

export const useFocusRegionStore = create<FocusRegionStore>((set, get) => ({
  activeRegion: null,

  setActiveRegion: (region) => {
    const showIndicator =
      useSettingsStore.getState().experimentalFeatures.showFocusIndicator;
    set({ activeRegion: region });
    setRegionActive(region, showIndicator);
  },

  focusRegion: (region) => {
    const showIndicator =
      useSettingsStore.getState().experimentalFeatures.showFocusIndicator;
    focusElement(region);
    set({ activeRegion: region });
    setRegionActive(region, showIndicator);
  },

  cycleForward: () => {
    const visible = getVisibleRegions();
    if (visible.length === 0) return;

    const { activeRegion } = get();
    const currentIndex = activeRegion ? visible.indexOf(activeRegion) : -1;
    const nextIndex = (currentIndex + 1) % visible.length;
    const next = visible[nextIndex];
    const showIndicator =
      useSettingsStore.getState().experimentalFeatures.showFocusIndicator;

    focusElement(next);
    set({ activeRegion: next });
    setRegionActive(next, showIndicator);
  },

  cycleBackward: () => {
    const visible = getVisibleRegions();
    if (visible.length === 0) return;

    const { activeRegion } = get();
    const currentIndex = activeRegion ? visible.indexOf(activeRegion) : -1;
    const prevIndex =
      currentIndex <= 0 ? visible.length - 1 : currentIndex - 1;
    const prev = visible[prevIndex];
    const showIndicator =
      useSettingsStore.getState().experimentalFeatures.showFocusIndicator;

    focusElement(prev);
    set({ activeRegion: prev });
    setRegionActive(prev, showIndicator);
  },
}));
