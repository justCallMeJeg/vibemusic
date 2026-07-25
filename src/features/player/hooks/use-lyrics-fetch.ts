import { useEffect, useRef, useState } from "react";
import { getLyrics, LyricLine, LyricsData } from "@/lib/api";
import { logger } from "@/lib/logger";

export function useLyricsFetch(
  path: string | undefined,
  trackVersion: number,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [source, setSource] = useState("");

  const lyricsCacheRef =
    useRef<Map<string, { data: LyricsData; version: number }> | null>(null);
  if (lyricsCacheRef.current === null)
    lyricsCacheRef.current = new Map<
      string,
      { data: LyricsData; version: number }
    >();
  const lyricsCache = lyricsCacheRef.current;

  useEffect(() => {
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
  }, [path, trackVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  return { lyrics, loading, error, isSynced, source };
}
