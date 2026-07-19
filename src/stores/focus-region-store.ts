import { create } from "zustand";
import { useSettingsStore } from "./settings-store";

export type FocusRegion = "sidebar" | "main" | "player" | "sidepanel";

const REGION_ORDER: FocusRegion[] = ["sidebar", "main", "player", "sidepanel"];
const ALL_REGIONS = REGION_ORDER;

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

function getVisibleRegions(): FocusRegion[] {
  return REGION_ORDER.filter((r) => {
    const el = document.querySelector<HTMLElement>(`[data-region="${r}"]`);
    return el !== null && el.dataset.regionVisible !== "false";
  });
}

function focusElement(region: FocusRegion): void {
  const el = document.querySelector<HTMLElement>(`[data-region="${region}"]`);
  if (el) {
    el.focus({ preventScroll: true });
  }
}

function setRegionActiveAttribute(region: FocusRegion | null): void {
  const showIndicator =
    useSettingsStore.getState().experimentalFeatures.showFocusIndicator;
  for (const r of ALL_REGIONS) {
    const el = document.querySelector<HTMLElement>(`[data-region="${r}"]`);
    if (el) {
      if (r === region && showIndicator) {
        el.dataset.regionActive = "true";
        el.classList.add("region-active");
      } else {
        delete el.dataset.regionActive;
        el.classList.remove("region-active");
      }
    }
  }
}

export const useFocusRegionStore = create<FocusRegionStore>((set, get) => ({
  activeRegion: null,

  setActiveRegion: (region) => {
    set({ activeRegion: region });
    setRegionActiveAttribute(region);
  },

  focusRegion: (region) => {
    focusElement(region);
    set({ activeRegion: region });
    setRegionActiveAttribute(region);
  },

  cycleForward: () => {
    const visible = getVisibleRegions();
    if (visible.length === 0) return;

    const { activeRegion } = get();
    const currentIndex = activeRegion ? visible.indexOf(activeRegion) : -1;
    const nextIndex = (currentIndex + 1) % visible.length;
    const next = visible[nextIndex];

    focusElement(next);
    set({ activeRegion: next });
    setRegionActiveAttribute(next);
  },

  cycleBackward: () => {
    const visible = getVisibleRegions();
    if (visible.length === 0) return;

    const { activeRegion } = get();
    const currentIndex = activeRegion ? visible.indexOf(activeRegion) : -1;
    const prevIndex =
      currentIndex <= 0 ? visible.length - 1 : currentIndex - 1;
    const prev = visible[prevIndex];

    focusElement(prev);
    set({ activeRegion: prev });
    setRegionActiveAttribute(prev);
  },
}));
