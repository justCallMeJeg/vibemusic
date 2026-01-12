import { useEffect, useRef } from "react";

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
