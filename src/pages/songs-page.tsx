import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import MusicListItem from "@/components/shared/item/music-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { ArrowUpDown, Search, Filter } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { useLibraryStore } from "@/stores/library-store";

type SortKey = "title" | "artist" | "date_added" | "duration";
type SortDirection = "asc" | "desc";

// Item height for virtualization (matches MusicListItem padding + content)
const ITEM_HEIGHT = 56;

export default function SongsPage() {
  const tracks = useLibraryStore((s) => s.tracks);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const [searchQuery, setSearchQuery] = useState("");

  // Use persistent settings
  const { songsSortKey, songsSortDirection, setSongsSort } = useSettingsStore();

  // Ref for the scrollable container
  const parentRef = useRef<HTMLDivElement>(null);

  // Apply visual scroll mask using the same ref
  useScrollMask(24, parentRef);

  // Filter and Sort Logic
  const displayedTracks = useMemo(() => {
    let result = [...tracks];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.artist && t.artist.toLowerCase().includes(query)) ||
          (t.album && t.album.toLowerCase().includes(query))
      );
    }

    // Sort
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
  }, [tracks, searchQuery, songsSortKey, songsSortDirection]);

  // Virtualizer for efficient list rendering
  const virtualizer = useVirtualizer({
    count: displayedTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-center justify-between mb-6 px-2 gap-4">
        <h1 className="text-3xl font-bold">Songs</h1>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter songs..."
              className="pl-9 bg-card border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={songsSortKey}
                onValueChange={(v) =>
                  setSongsSort(v as SortKey, songsSortDirection)
                }
              >
                <DropdownMenuRadioItem value="title">
                  Title
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="artist">
                  Artist
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date_added">
                  Date Added
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="duration">
                  Duration
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Order</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={songsSortDirection}
                onValueChange={(v) =>
                  setSongsSort(songsSortKey, v as SortDirection)
                }
              >
                <DropdownMenuRadioItem value="asc">
                  Ascending
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desc">
                  Descending
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
            {displayedTracks.length} tracks
          </div>
        </div>
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar scroll-mask-y"
      >
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-md">
                <Skeleton className="w-10 h-10 rounded-md bg-foreground/5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48 bg-foreground/10" />
                  <Skeleton className="h-3 w-24 bg-foreground/5" />
                </div>
                <Skeleton className="h-3 w-12 bg-foreground/5" />
                <Skeleton className="h-3 w-12 bg-foreground/5" />
              </div>
            ))}
          </div>
        ) : displayedTracks.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={Search}
              title="No matches found"
              description={`We couldn't find any songs matching "${searchQuery}"`}
            />
          ) : (
            <EmptyState
              icon={Filter}
              title="No songs found"
              description="Import music using the sidebar button to get started."
            />
          )
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize() + 168}px`, // +168px padding for controller
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const track = displayedTracks[virtualItem.index];
              return (
                <div
                  key={track.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <MusicListItem track={track} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
