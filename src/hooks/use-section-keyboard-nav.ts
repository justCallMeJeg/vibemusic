import { useCallback, useEffect, useRef, useState } from "react";

const SECTION_ITEM_ATTR = "data-section-item";

interface SectionNavSection {
  id: string;
  itemCount: number;
  orientation: "horizontal" | "vertical";
  onActivate: (itemIndex: number) => void;
  onActivateSecondary?: (itemIndex: number) => void;
}

interface UseSectionKeyboardNavOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  sections: SectionNavSection[];
  enabled?: boolean;
  onFocusChange?: (sectionIndex: number, itemIndex: number) => void;
}

interface UseSectionKeyboardNavResult {
  activeSection: number;
  activeItemIndex: number;
  getTabIndex: (sectionIndex: number, itemIndex: number) => 0 | -1 | undefined;
  focusItem: (sectionIndex: number, itemIndex: number) => void;
}

function getSectionItemElement(
  container: HTMLElement,
  sectionIndex: number,
  itemIndex: number,
): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    `[${SECTION_ITEM_ATTR}="${sectionIndex}:${itemIndex}"]`,
  );
}

function getItemIndexFromTarget(
  target: HTMLElement,
  container: HTMLElement,
): { sectionIndex: number; itemIndex: number } | null {
  let el: HTMLElement | null = target;
  while (el && el !== container) {
    const sectionItem = el.getAttribute(SECTION_ITEM_ATTR);
    if (sectionItem) {
      const [sectionStr, itemStr] = sectionItem.split(":");
      return {
        sectionIndex: parseInt(sectionStr, 10),
        itemIndex: parseInt(itemStr, 10),
      };
    }
    el = el.parentElement;
  }
  return null;
}

export function useSectionKeyboardNav({
  containerRef,
  sections,
  enabled = true,
  onFocusChange,
}: UseSectionKeyboardNavOptions): UseSectionKeyboardNavResult {
  const [activeSection, setActiveSection] = useState(-1);
  const [activeItemIndex, setActiveItemIndex] = useState(-1);

  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;
  const activeItemIndexRef = useRef(activeItemIndex);
  activeItemIndexRef.current = activeItemIndex;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;

  const focusItem = useCallback(
    (sectionIndex: number, itemIndex: number) => {
      setActiveSection(sectionIndex);
      setActiveItemIndex(itemIndex);
      requestAnimationFrame(() => {
        if (containerRef.current) {
          onFocusChangeRef.current?.(sectionIndex, itemIndex);
          const el = getSectionItemElement(containerRef.current, sectionIndex, itemIndex);
          el?.focus({ preventScroll: true });
        }
      });
    },
    [containerRef],
  );

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      if (!container.contains(e.target as Node)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.defaultPrevented) return;

      const s = sectionsRef.current;
      if (s.length === 0) return;

      let sectionIdx = activeSectionRef.current;
      let itemIdx = activeItemIndexRef.current;

      if (sectionIdx < 0 || itemIdx < 0) {
        const info = getItemIndexFromTarget(e.target as HTMLElement, container);
        if (info) {
          sectionIdx = info.sectionIndex;
          itemIdx = info.itemIndex;
        } else {
          sectionIdx = 0;
          itemIdx = 0;
        }
      }

      const section = s[sectionIdx];
      if (!section) return;

      const getBoundaries = () => {
        const prevSectionIdx = sectionIdx > 0 ? sectionIdx - 1 : -1;
        const nextSectionIdx = sectionIdx < s.length - 1 ? sectionIdx + 1 : -1;
        return { prevSectionIdx, nextSectionIdx };
      };

      let newSectionIdx = sectionIdx;
      let newItemIdx = itemIdx;

      switch (e.key) {
        case "ArrowRight": {
          if (section.orientation !== "horizontal") return;
          e.preventDefault();
          e.stopPropagation();
          if (itemIdx < section.itemCount - 1) {
            newItemIdx = itemIdx + 1;
          } else {
            const { nextSectionIdx } = getBoundaries();
            if (nextSectionIdx >= 0) {
              newSectionIdx = nextSectionIdx;
              newItemIdx = 0;
            }
          }
          break;
        }
        case "ArrowLeft": {
          if (section.orientation !== "horizontal") return;
          e.preventDefault();
          e.stopPropagation();
          if (itemIdx > 0) {
            newItemIdx = itemIdx - 1;
          } else {
            const { prevSectionIdx } = getBoundaries();
            if (prevSectionIdx >= 0) {
              newSectionIdx = prevSectionIdx;
              newItemIdx = s[prevSectionIdx].orientation === "horizontal" ? 0 : s[prevSectionIdx].itemCount - 1;
            }
          }
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          e.stopPropagation();
          if (section.orientation === "vertical" && itemIdx < section.itemCount - 1) {
            newItemIdx = itemIdx + 1;
          } else {
            const { nextSectionIdx } = getBoundaries();
            if (nextSectionIdx >= 0) {
              newSectionIdx = nextSectionIdx;
              newItemIdx = 0;
            }
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          e.stopPropagation();
          if (section.orientation === "vertical" && itemIdx > 0) {
            newItemIdx = itemIdx - 1;
          } else {
            const { prevSectionIdx } = getBoundaries();
            if (prevSectionIdx >= 0) {
              newSectionIdx = prevSectionIdx;
              newItemIdx = s[prevSectionIdx].orientation === "horizontal" ? 0 : s[prevSectionIdx].itemCount - 1;
            }
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          e.stopPropagation();
          newSectionIdx = 0;
          newItemIdx = 0;
          break;
        }
        case "End": {
          e.preventDefault();
          e.stopPropagation();
          newSectionIdx = s.length - 1;
          newItemIdx = s[newSectionIdx].itemCount - 1;
          break;
        }
        case "Enter": {
          if (sectionIdx >= 0 && itemIdx >= 0) {
            e.preventDefault();
            e.stopPropagation();
            if (e.shiftKey) {
              s[sectionIdx].onActivateSecondary?.(itemIdx);
            } else {
              s[sectionIdx].onActivate(itemIdx);
            }
          }
          return;
        }
        default:
          return;
      }

      if (newSectionIdx !== sectionIdx || newItemIdx !== itemIdx) {
        focusItem(newSectionIdx, newItemIdx);
      }
    };

    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [enabled, containerRef, focusItem]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: FocusEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const info = getItemIndexFromTarget(e.target as HTMLElement, container);
      if (info) {
        if (info.sectionIndex !== activeSectionRef.current || info.itemIndex !== activeItemIndexRef.current) {
          setActiveSection(info.sectionIndex);
          setActiveItemIndex(info.itemIndex);
        }
      }
    };

    document.addEventListener("focusin", handler, { capture: true });
    return () => document.removeEventListener("focusin", handler, { capture: true });
  }, [enabled, containerRef]);

  useEffect(() => {
    if (sections.length === 0) {
      setActiveSection(-1);
      setActiveItemIndex(-1);
    }
  }, [sections.length]);

  useEffect(() => {
    if (enabled && sections.length > 0 && activeSection < 0) {
      setActiveSection(0);
      setActiveItemIndex(0);
    }
  }, [enabled, sections.length, activeSection]);

  const getTabIndex = useCallback(
    (sectionIndex: number, itemIndex: number): 0 | -1 | undefined => {
      if (!enabled) return undefined;
      return sectionIndex === activeSection && itemIndex === activeItemIndex ? 0 : -1;
    },
    [enabled, activeSection, activeItemIndex],
  );

  return {
    activeSection,
    activeItemIndex,
    getTabIndex,
    focusItem,
  };
}
