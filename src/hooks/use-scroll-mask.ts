import { useEffect, useRef } from "react";

/**
 * Applies a CSS mask to an element based on its scroll position to create a fade effect at the top.
 * @param {number} threshold - The scroll threshold in pixels for the fade effect.
 * @param {React.RefObject<HTMLDivElement | null>} [externalRef] - Optional external ref.
 * @returns {React.RefObject<HTMLDivElement>} The ref to attach to the scrollable element.
 */
export function useScrollMask(
  threshold = 24,
  externalRef?: React.RefObject<HTMLDivElement | null>
) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = externalRef || internalRef;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      // Calculate opacity: 1 at 0px, 0 at threshold px.
      const scrollTop = element.scrollTop;
      let opacity = 1 - scrollTop / threshold;

      // Clamp between 0 and 1
      if (opacity < 0) opacity = 0;
      if (opacity > 1) opacity = 1;

      element.style.setProperty("--scroll-mask-top", opacity.toString());
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    // Initialize
    handleScroll();

    return () => element.removeEventListener("scroll", handleScroll);
  }, [threshold, ref]);

  return ref;
}
