import { useRef, useCallback } from "react";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useSettingsStore } from "@/stores/settings-store";
import { useIsPlayerVisible } from "@/stores/audio-store";
import { PLAYER_BAR_HEIGHT } from "@/lib/constants";

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
  const basePadding = paddingBottom
    ? parseInt(paddingBottom, 10)
    : isPlayerVisible
      ? PLAYER_BAR_HEIGHT
      : 24;
  const bottomPadding = basePadding + (extraBottomPadding ?? 0);

  useScrollMask(24, parentRef);

  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(() => itemHeight, [itemHeight]);

  return { parentRef, effectiveKeyboardNav, bottomPadding, getScrollElement, estimateSize, isPlayerVisible };
}