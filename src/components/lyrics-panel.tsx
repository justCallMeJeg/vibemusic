import { memo } from "react";
import {
  useAudioStore,
  useCurrentTrack,
  usePosition,
} from "@/stores/audio-store";
import { useEffect, useState, useRef, useMemo } from "react";
import { getLyrics, LyricLine, LyricsData } from "@/lib/api";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { Loader2, Music2 } from "lucide-react";

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
        line.timestamp_ms !== null &&
          "cursor-pointer hover:bg-accent/50",
        isActive
          ? "text-foreground font-black scale-105 bg-accent/50 shadow-[0_0_12px_var(--ring)/20] backdrop-blur-sm pl-6"
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [source, setSource] = useState<string>("");

  const lyricsCacheRef = useRef<Map<string, LyricsData> | null>(null);
  if (lyricsCacheRef.current === null)
    lyricsCacheRef.current = new Map<string, LyricsData>();
  const lyricsCache = lyricsCacheRef.current;

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!currentTrack) return;

    const path = currentTrack.file_path;
    if (lyricsCache.has(path)) {
      const cached = lyricsCache.get(path)!;
      setLyrics(cached.lines);
      setIsSynced(cached.is_synced);
      setSource(cached.source);
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
        lyricsCache.set(path, data);
      })
      .catch((err) => {
        logger.warn("Failed to fetch lyrics:", err);
        setError("No lyrics found");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentTrack, lyricsCache]);

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
    if (
      autoScroll &&
      activeIndex !== -1 &&
      activeLineRef.current &&
      containerRef.current
    ) {
      const container = containerRef.current;
      const element = activeLineRef.current;

      const containerHeight = container.clientHeight;
      const elementTop = element.offsetTop;
      const elementHeight = element.clientHeight;

      container.scrollTo({
        top: elementTop - containerHeight / 2 + elementHeight / 2,
        behavior: "instant",
      });
    }
  }, [activeIndex, autoScroll]);

  useEffect(() => {
    setAutoScroll(true);
  }, [currentTrack]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <Music2 className="w-8 h-8 opacity-50" />
        <p>No track playing</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p>Loading lyrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 px-6 text-center">
        <p className="font-medium text-foreground">No lyrics available</p>
        <p className="text-sm opacity-70">
          Could not find embedded lyrics or an .lrc file for this track.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto pt-4 pb-[50%] px-6 scroll-smooth"
      onWheel={() => setAutoScroll(false)}
      onTouchStart={() => setAutoScroll(false)}
    >
      <div className="flex items-center justify-end mb-4 sticky top-0">
        {!autoScroll && isSynced && (
          <button
            type="button"
            onClick={() => setAutoScroll(true)}
            className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded-full transition-colors"
          >
            Resume Auto-Scroll
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 min-h-0">
        {lyrics.map((line, index) => (
          <SyncedLyricLine
            key={index}
            line={line}
            isActive={index === activeIndex}
            isPast={index < activeIndex}
            isSynced={isSynced}
            activeLineRef={activeLineRef as React.RefObject<HTMLButtonElement | null>}
            onSeek={(ms) => seek(ms)}
            onAutoScroll={() => setAutoScroll(true)}
          />
        ))}
      </div>

      <div className="mt-8 text-center pb-4">
        <div className="text-xs text-muted-foreground/50 italic flex flex-col gap-0.5">
          <span>{isSynced ? "Synced Lyrics" : "Plain Text Lyrics"}</span>
          {source && (
            <span className="font-semibold text-primary/40">
              via {source}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
