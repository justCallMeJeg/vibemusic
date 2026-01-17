import { SidePanelLayout } from "./shared/side-panel-layout";
import {
  useSidePanel,
  useAudioStore,
  useCurrentTrack,
  usePosition,
} from "@/stores/audio-store";
import { useEffect, useState, useRef, useMemo } from "react";
import { getLyrics, LyricLine, LyricsData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Loader2, Music2 } from "lucide-react";

export default function LyricsPanel() {
  const sidePanel = useSidePanel();
  const setSidePanel = useAudioStore((s) => s.setSidePanel);
  const currentTrack = useCurrentTrack();
  const position = usePosition();
  const seek = useAudioStore((s) => s.seek);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [source, setSource] = useState<string>("");

  // Cache lyrics data
  const lyricsCache = useMemo(() => new Map<string, LyricsData>(), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!currentTrack || sidePanel !== "lyrics") return;

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
        console.warn("Failed to fetch lyrics:", err);
        setError("No lyrics found");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentTrack, sidePanel, lyricsCache]);

  // Determine active line index
  const activeIndex = useMemo(() => {
    if (!isSynced || !lyrics.length) return -1;
    // Find the last line that has a timestamp <= current position
    // We iterate backwards for efficiency or just typical findLastIndex equivalent
    for (let i = lyrics.length - 1; i >= 0; i--) {
      const lineTime = lyrics[i].timestamp_ms;
      if (lineTime !== null && lineTime <= position) {
        return i;
      }
    }
    return -1;
  }, [lyrics, position, isSynced]);

  // Auto-scroll logic
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

      // Scroll to center the element
      container.scrollTo({
        top: elementTop - containerHeight / 2 + elementHeight / 2,
        behavior: "smooth",
      });
    }
  }, [activeIndex, autoScroll]);

  // Re-enable auto-scroll after user interaction stops (optional simplistic approach)
  // For now, we'll just keep auto-scroll always on unless we want to detect scroll events.
  // A simple way is to disable auto-scroll on wheel/touch, and re-enable on button or track change.
  // Let's reset auto-scroll on track change.
  useEffect(() => {
    setAutoScroll(true);
  }, [currentTrack]);

  if (sidePanel !== "lyrics") return null;

  return (
    <SidePanelLayout
      title="Lyrics"
      onClose={() => setSidePanel("none")}
      className="p-0"
    >
      {!currentTrack ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
          <Music2 className="w-8 h-8 opacity-50" />
          <p>No track playing</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p>Loading lyrics...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 px-6 text-center">
          <p className="font-medium text-foreground">No lyrics available</p>
          <p className="text-sm opacity-70">
            Could not find embedded lyrics or an .lrc file for this track.
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto pt-4 pb-[50%] px-6 custom-scrollbar scroll-smooth"
          onWheel={() => setAutoScroll(false)}
          onTouchStart={() => setAutoScroll(false)}
        >
          <div className="flex items-center justify-end mb-4 sticky top-0">
            {!autoScroll && isSynced && (
              <button
                onClick={() => setAutoScroll(true)}
                className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded-full transition-colors"
              >
                Resume Auto-Scroll
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            {lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;

              if (!isSynced) {
                // UN-SYNCED STYLE (Compact)
                return (
                  <div
                    key={index}
                    className="text-base text-muted-foreground/90 py-0.5"
                  >
                    {line.text}
                  </div>
                );
              }

              // SYNCED STYLE (Karaoke)
              return (
                <div
                  key={index}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => {
                    if (line.timestamp_ms !== null) {
                      seek(line.timestamp_ms);
                      setAutoScroll(true);
                    }
                  }}
                  className={cn(
                    "text-xl transition-all duration-300 py-2 px-4 rounded-xl origin-left w-fit max-w-full",
                    line.timestamp_ms !== null &&
                      "cursor-pointer hover:bg-white/5",
                    isActive
                      ? "text-white font-black scale-105 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-sm border-l-4 border-primary pl-6"
                      : isPast
                      ? "text-muted-foreground/30 blur-[0.5px] scale-95"
                      : "text-muted-foreground/70 scale-100"
                  )}
                >
                  {line.text || "♪"}
                </div>
              );
            })}
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
      )}
    </SidePanelLayout>
  );
}
