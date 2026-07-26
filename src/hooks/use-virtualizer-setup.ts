import { useRef, useCallback } from "react";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useSettingsStore } from "@/stores/settings-store";
import { useIsPlayerVisible } from "@/stores/audio-store";
import { useSelectionStore } from "@/stores/selection-store";
import { PLAYER_BAR_HEIGHT, BATCH_BAR_HEIGHT } from "@/lib/constants";

export function useVirtualizerSetup(
  itemHeight: number,
  paddingBottom?: string,
  keyboardNav?: boolean,
  extraBottomPadding?: number,
) {
  const parentRef = useRef<HTMLDivElement>(null);

  const keyboardNavSetting = useSettingsStore(
    (s) => s.experimentalFeatures.keyboardNav,
  );
  const effectiveKeyboardNav = keyboardNav && keyboardNavSetting;

  const isPlayerVisible = useIsPlayerVisible();
  const batchBarVisible = useSelectionStore((s) => s.selectedIds.length > 0);
  const basePadding = paddingBottom
    ? parseInt(paddingBottom, 10)
    : 0;
  const playerPadding = isPlayerVisible && !paddingBottom ? PLAYER_BAR_HEIGHT : 0;
  const batchPadding = batchBarVisible ? BATCH_BAR_HEIGHT : 0;
  const bottomPadding = basePadding + playerPadding + batchPadding + (extraBottomPadding ?? 0);

  useScrollMask(24, parentRef);

  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(() => itemHeight, [itemHeight]);

  return { parentRef, effectiveKeyboardNav, bottomPadding, getScrollElement, estimateSize, isPlayerVisible };
}