import { useEffect, useRef, useState, useCallback } from "react";

export function useAutoScroll() {
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setContainerEl(el);
  }, []);

  const activeLineRef = useRef<HTMLButtonElement>(null);

  const scrollDeltaRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchDeltaRef = useRef(0);
  const lastTouchUpdateRef = useRef(0);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgrammaticScrollMsRef = useRef(0);
  const hasScrolledOnceRef = useRef(false);
  const firstScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (firstScrollTimerRef.current) clearTimeout(firstScrollTimerRef.current);
    };
  }, []);

  const startInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      setIsAutoScrolling(true);
      scrollDeltaRef.current = 0;
      touchDeltaRef.current = 0;
    }, 3000);
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      scrollDeltaRef.current += Math.abs(e.deltaY);
      if (scrollDeltaRef.current > 80) {
        setIsAutoScrolling(false);
      }
      startInactivityTimer();
    },
    [startInactivityTimer],
  );

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchUpdateRef.current < 100) return;
      lastTouchUpdateRef.current = now;

      const delta = Math.abs(e.touches[0].clientY - touchStartYRef.current);
      touchDeltaRef.current = Math.max(touchDeltaRef.current, delta);

      if (touchDeltaRef.current > 40) {
        setIsAutoScrolling(false);
      }
      startInactivityTimer();
    },
    [startInactivityTimer],
  );

  const handleScroll = useCallback(() => {
    if (Date.now() - lastProgrammaticScrollMsRef.current < 500) return;
    setIsAutoScrolling(false);
    startInactivityTimer();
  }, [startInactivityTimer]);

  useEffect(() => {
    if (!containerEl) return;

    containerEl.addEventListener("wheel", handleWheel, { passive: true });
    containerEl.addEventListener("touchstart", handleTouchStart, { passive: true });
    containerEl.addEventListener("touchmove", handleTouchMove, { passive: true });
    containerEl.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      containerEl.removeEventListener("wheel", handleWheel);
      containerEl.removeEventListener("touchstart", handleTouchStart);
      containerEl.removeEventListener("touchmove", handleTouchMove);
      containerEl.removeEventListener("scroll", handleScroll);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleScroll, containerEl]);

  useEffect(() => {
    if (isAutoScrolling) return;
    if (firstScrollTimerRef.current) {
      clearTimeout(firstScrollTimerRef.current);
      firstScrollTimerRef.current = null;
    }
  }, [isAutoScrolling]);

  const scrollToIndex = useCallback((_index: number) => {
    if (firstScrollTimerRef.current) {
      clearTimeout(firstScrollTimerRef.current);
      firstScrollTimerRef.current = null;
    }

    const doScroll = () => {
      const element = activeLineRef.current;
      if (!element) return;

      const container = containerRef.current;
      if (!container) return;

      const containerHeight = container.clientHeight;
      const elementTop = element.offsetTop;
      const elementHeight = element.clientHeight;

      lastProgrammaticScrollMsRef.current = Date.now();

      container.scrollTo({
        top: elementTop - containerHeight / 2 + elementHeight / 2,
        behavior: hasScrolledOnceRef.current ? "smooth" : "instant",
      });
      hasScrolledOnceRef.current = true;
    };

    if (!hasScrolledOnceRef.current) {
      firstScrollTimerRef.current = setTimeout(doScroll, 200);
    } else {
      doScroll();
    }
  }, []);

  const enableAutoScroll = useCallback(() => {
    setIsAutoScrolling(true);
  }, []);

  const resumeAutoScroll = useCallback(() => {
    setIsAutoScrolling(true);
    scrollDeltaRef.current = 0;
    touchDeltaRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    setIsAutoScrolling(true);
    scrollDeltaRef.current = 0;
    touchDeltaRef.current = 0;
    hasScrolledOnceRef.current = false;
  }, []);

  return {
    containerRef: setContainerRef,
    activeLineRef,
    isAutoScrolling,
    scrollToIndex,
    enableAutoScroll,
    resumeAutoScroll,
    reset,
  };
}
