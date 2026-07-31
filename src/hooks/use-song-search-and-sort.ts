import { useMemo, useState, useDeferredValue } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useContentStore } from "@features/library/store/content-store";
import type { Track } from "@/lib/api";

type SortKey = "title" | "artist" | "date_added" | "duration";
type SortDirection = "asc" | "desc";

interface UseSongSearchAndSortReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  deferredQuery: string;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  sortDirection: SortDirection;
  setSortDirection: (direction: SortDirection) => void;
  filteredItems: Track[];
}

export function useSongSearchAndSort(): UseSongSearchAndSortReturn {
  const tracks = useContentStore((s) => s.tracks);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const songsSortKey = useSettingsStore((s) => s.songsSortKey);
  const songsSortDirection = useSettingsStore((s) => s.songsSortDirection);
  const setSongsSort = useSettingsStore((s) => s.setSongsSort);

  const filteredItems = useMemo(() => {
    let result = [...tracks];

    if (deferredQuery) {
      const query = deferredQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.artist && t.artist.toLowerCase().includes(query)) ||
          (t.album && t.album.toLowerCase().includes(query)),
      );
    }

    result.sort((a, b) => {
      let valA: string | number | undefined;
      let valB: string | number | undefined;

      switch (songsSortKey) {
        case "title":
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case "artist":
          valA = (a.artist || "").toLowerCase();
          valB = (b.artist || "").toLowerCase();
          break;
        case "duration":
          valA = a.duration_ms;
          valB = b.duration_ms;
          break;
        case "date_added":
        default:
          valA = a.id;
          valB = b.id;
          break;
      }

      if (valA === undefined || valB === undefined) return 0;
      if (valA < valB) return songsSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return songsSortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [tracks, deferredQuery, songsSortKey, songsSortDirection]);

  return {
    searchQuery,
    setSearchQuery,
    deferredQuery,
    sortKey: songsSortKey as SortKey,
    setSortKey: (key: SortKey) => setSongsSort(key, songsSortDirection),
    sortDirection: songsSortDirection as SortDirection,
    setSortDirection: (direction: SortDirection) => setSongsSort(songsSortKey, direction),
    filteredItems,
  };
}
