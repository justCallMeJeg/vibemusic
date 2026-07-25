import { memo, useEffect, useMemo } from "react";
import {
  useAudioStore,
  useCurrentTrack,
  usePosition,
  useTrackVersion,
} from "@/stores/audio-store";
import { LyricLine } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Music2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { useAutoScroll } from "@/features/player/hooks/use-auto-scroll";
import { useLyricsFetch } from "@/features/player/hooks/use-lyrics-fetch";

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

const PlainLine = memo(function PlainLine({ text }: { text: string }) {
  return (
    <div className="text-base text-muted-foreground/90 py-0.5">{text}</div>
  );
});

const SyncedLine = memo(function SyncedLine({
  line,
  isActive,
  isPast,
  activeLineRef,
  onSeek,
  onAutoScroll,
}: {
  line: LyricLine;
  isActive: boolean;
  isPast: boolean;
  activeLineRef: React.RefObject<HTMLButtonElement | null>;
  onSeek: (ms: number) => void;
  onAutoScroll: () => void;
}) {
  const handleClick = () => {
    if (line.timestamp_ms !== null) {
      onSeek(line.timestamp_ms);
      onAutoScroll();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      line.timestamp_ms !== null
    ) {
      onSeek(line.timestamp_ms);
      onAutoScroll();
    }
  };

  return (
    <button
      type="button"
      ref={isActive ? activeLineRef : null}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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

  const { lyrics, loading, error, isSynced, source } = useLyricsFetch(
    currentTrack?.file_path,
    trackVersion,
  );

  const {
    containerRef,
    activeLineRef,
    isAutoScrolling,
    scrollToIndex,
    enableAutoScroll,
    resumeAutoScroll,
    reset,
  } = useAutoScroll();

  useEffect(() => {
    reset();
  }, [currentTrack, reset]);

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
    if (!isAutoScrolling || activeIndex === -1) return;
    scrollToIndex(activeIndex);
  }, [activeIndex, isAutoScrolling, scrollToIndex]);

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
    return <EmptyPanel icon={Music2} title="No track playing" />;
  }

  if (loading) {
    return <LyricsSkeleton />;
  }

  if (error) {
    return (
      <EmptyPanel
        icon={Music2}
        title="No lyrics available"
        description="Could not find embedded lyrics or an .lrc file for this track."
      />
    );
  }

  return (
    <div
      ref={containerRef}
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
        {lyrics.map((line, index) =>
          isSynced ? (
            <SyncedLine
              key={index}
              line={line}
              isActive={index === activeIndex}
              isPast={index < activeIndex}
              activeLineRef={
                activeLineRef as React.RefObject<HTMLButtonElement | null>
              }
              onSeek={seek}
              onAutoScroll={enableAutoScroll}
            />
          ) : (
            <PlainLine key={index} text={line.text} />
          ),
        )}
      </div>

      {!isAutoScrolling && isSynced ? (
        <div className="sticky bottom-11/12 z-10 flex justify-end">
          <button
            type="button"
            onClick={resumeAutoScroll}
            className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-full transition-colors shadow-sm backdrop-blur-sm"
          >
            Resume Auto-Scroll
          </button>
        </div>
      ) : null}
    </div>
  );
}
