import { memo } from "react";
import {
  useAudioStore,
  useCurrentTrack,
  usePosition,
  useTrackVersion,
} from "@/stores/audio-store";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { getLyrics, LyricLine, LyricsData } from "@/lib/api";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { Music2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function LyricsSkeleton() {
  const widths = [70, 40, 55, 90, 60, 45, 80, 50, 75, 65];
  return (
    <div className="flex flex-col gap-5 pt-8 px-6">
      {widths.map((width, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-[20px] rounded-sm",
            i % 2 === 0 ? "bg-foreground/10" : "bg-foreground/5",
          )}
          style={{ width: `${width}%` }}
        />
      ))}
    </div>
  );
}

const SyncedLyricLine = memo(function SyncedLyricLine({
  line,
  isActive,
  isPast,
  isSynced,
  activeLineRef,
  onSeek,
  onAutoScroll,
}: {
  line: LyricLine;
  isActive: boolean;
  isPast: boolean;
  isSynced: boolean;
  activeLineRef: React.RefObject<HTMLButtonElement | null>;
  onSeek: (ms: number) => void;
  onAutoScroll: () => void;
}) {
  if (!isSynced) {
    return (
      <div className="text-base text-muted-foreground/90 py-0.5">
        {line.text}
      </div>
    );
  }

  return (
    <button
      type="button"
      ref={isActive ? activeLineRef : null}
      onClick={() => {
        if (line.timestamp_ms !== null) {
          onSeek(line.timestamp_ms);
          onAutoScroll();
        }
      }}
      onKeyDown={(e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          line.timestamp_ms !== null
        ) {
          onSeek(line.timestamp_ms);
          onAutoScroll();
        }
      }}
      className={cn(
        "text-xl transition-all duration-300 py-2 px-4 rounded-xl origin-left w-fit max-w-full text-left",
        line.timestamp_ms !== null && "cursor-pointer hover:bg-accent/50",
        isActive
          ? "text-foreground font-black scale-105 bg-primary/10 shadow-[0_0_12px_var(--ring)/30] backdrop-blur-sm pl-6"
          : isPast
            ? "text-muted-foreground/30 blur-[0.5px] scale-90"
            : "text-muted-foreground/70 scale-100",
      )}
    >
      {line.text || "♪"}
    </button>
  );
});

export default function LyricsContent() {
  const currentTrack = useCurrentTrack();
  const position = usePosition();
  const seek = useAudioStore((s) => s.seek);
  const trackVersion = useTrackVersion();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [source, setSource] = useState<string>("");
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const handleAutoScroll = useCallback(() => setAutoScroll(true), []);

  const lyricsCacheRef = useRef<Map<string, { data: LyricsData; version: number }> | null>(null);
  if (lyricsCacheRef.current === null)
    lyricsCacheRef.current = new Map<string, { data: LyricsData; version: number }>();
  const lyricsCache = lyricsCacheRef.current;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setContainerEl(el);
  }, []);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollDeltaRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchDeltaRef = useRef(0);
  const lastTouchUpdateRef = useRef(0);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgrammaticScrollMsRef = useRef(0);
  const hasScrolledOnceRef = useRef(false);
  const firstScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  const startInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      setAutoScroll(true);
      scrollDeltaRef.current = 0;
      touchDeltaRef.current = 0;
    }, 3000);
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      scrollDeltaRef.current += Math.abs(e.deltaY);

      if (scrollDeltaRef.current > 80) {
        setAutoScroll((current) => (current === true ? false : current));
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
        setAutoScroll((current) => (current === true ? false : current));
      }

      startInactivityTimer();
    },
    [startInactivityTimer],
  );

  const handleScroll = useCallback(() => {
    if (Date.now() - lastProgrammaticScrollMsRef.current < 500) return;
    setAutoScroll((current) => (current === true ? false : current));
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
    setAutoScroll(true);
    scrollDeltaRef.current = 0;
    touchDeltaRef.current = 0;
    hasScrolledOnceRef.current = false;
  }, [currentTrack]);

  useEffect(() => {
    const path = currentTrack?.file_path;
    if (!path) return;

    const cached = lyricsCache.get(path);
    if (cached && cached.version === trackVersion) {
      setLyrics(cached.data.lines);
      setIsSynced(cached.data.is_synced);
      setSource(cached.data.source);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setLyrics([]);
    setSource("");

    getLyrics(path)
      .then((data) => {
        setLyrics(data.lines);
        setIsSynced(data.is_synced);
        setSource(data.source);
        lyricsCache.set(path, { data, version: trackVersion });
      })
      .catch((err) => {
        logger.warn("Failed to fetch lyrics:", err);
        setError("No lyrics found");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentTrack?.file_path, trackVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeIndex = useMemo(() => {
    if (!isSynced || !lyrics.length) return -1;
    const first = lyrics[0].timestamp_ms;
    const last = lyrics[lyrics.length - 1].timestamp_ms;
    if (first === null || last === null) return -1;
    if (position <= first) return -1;
    if (position >= last) return lyrics.length - 1;

    let lo = 0;
    let hi = lyrics.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      const t = lyrics[mid].timestamp_ms;
      if (t !== null && t <= position) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }, [lyrics, position, isSynced]);

  useEffect(() => {
    if (!autoScroll || activeIndex === -1 || !containerRef.current) return;

    const scrollToActive = () => {
      const element = activeLineRef.current;
      if (!element) return;

      const container = containerRef.current!;
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
      firstScrollTimerRef.current = setTimeout(scrollToActive, 200);
    } else {
      scrollToActive();
    }

    return () => {
      if (firstScrollTimerRef.current) {
        clearTimeout(firstScrollTimerRef.current);
        firstScrollTimerRef.current = null;
      }
    };
  }, [activeIndex, autoScroll]);

  const sourceLabel = useMemo(() => {
    if (!source) return "";
    const type = isSynced ? "Synced" : "Plain";
    const short = source
      .replace("Local LRC File", "LRC")
      .replace("Embedded (USLT)", "Embedded")
      .replace("LRCLIB (Synced)", "LRCLIB")
      .replace("LRCLIB (Plain)", "LRCLIB");
    return `${type} · ${short}`;
  }, [source, isSynced]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4">
        <Music2 className="w-8 h-8 opacity-50" />
        <p>No track playing</p>
      </div>
    );
  }

  if (loading) {
    return <LyricsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 px-6 text-center p-4">
        <p className="font-medium text-foreground">No lyrics available</p>
        <p className="text-sm opacity-70">
          Could not find embedded lyrics or an .lrc file for this track.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={setContainerRef}
      className="flex-1 overflow-y-auto pt-4 pb-[50%] px-6 scroll-smooth"
    >
      {source ? (
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-muted-foreground/30 select-none">
            {sourceLabel}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 min-h-0">
        {lyrics.map((line, index) => (
          <SyncedLyricLine
            key={index}
            line={line}
            isActive={index === activeIndex}
            isPast={index < activeIndex}
            isSynced={isSynced}
            activeLineRef={
              activeLineRef as React.RefObject<HTMLButtonElement | null>
            }
            onSeek={seek}
            onAutoScroll={handleAutoScroll}
          />
        ))}
      </div>

      {!autoScroll && isSynced ? (
        <div className="sticky bottom-11/12 z-10 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setAutoScroll(true);
              scrollDeltaRef.current = 0;
              touchDeltaRef.current = 0;
            }}
            className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-full transition-colors shadow-sm backdrop-blur-sm"
          >
            Resume Auto-Scroll
          </button>
        </div>
      ) : null}
    </div>
  );
}
