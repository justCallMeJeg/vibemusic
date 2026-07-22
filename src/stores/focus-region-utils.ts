import type { FocusRegion } from "./focus-region-store";

const ALL_REGIONS: FocusRegion[] = ["sidebar", "main", "player", "sidepanel"];

export function getVisibleRegions(): FocusRegion[] {
  const REGION_ORDER: FocusRegion[] = ["sidebar", "main", "player", "sidepanel"];
  return REGION_ORDER.filter((r) => {
    const el = document.querySelector<HTMLElement>(`[data-region="${r}"]`);
    return el !== null && el.dataset.regionVisible !== "false";
  });
}

export function focusElement(region: FocusRegion): void {
  const el = document.querySelector<HTMLElement>(`[data-region="${region}"]`);
  el?.focus({ preventScroll: true });
}

export function setRegionActive(region: FocusRegion | null, showIndicator: boolean): void {
  for (const r of ALL_REGIONS) {
    const el = document.querySelector<HTMLElement>(`[data-region="${r}"]`);
    if (!el) continue;
    delete el.dataset.regionActive;
    el.classList.remove("region-active");
    if (r === region && showIndicator) {
      el.dataset.regionActive = "true";
      el.classList.add("region-active");
    }
  }
}
