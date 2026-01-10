import { useEffect, useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getTracks, Track } from "@/lib/api";
import MusicListItem from "@/components/ui/music-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Search, Filter } from "lucide-react";

type SortKey = "title" | "artist" | "date_added" | "duration";
type SortDirection = "asc" | "desc";

// Item height for virtualization (matches MusicListItem padding + content)
const ITEM_HEIGHT = 56;

export default function SongsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_added");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Ref for the scrollable container
  const parentRef = useRef<HTMLDivElement>(null);

  const loadTracks = async () => {
    try {
      const data = await getTracks();
      setTracks(data);
    } catch (error) {
      console.error("Failed to load tracks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTracks();
  }, []);

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

      switch (sortKey) {
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
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [tracks, searchQuery, sortKey, sortDirection]);

  // Virtualizer for efficient list rendering
  const virtualizer = useVirtualizer({
    count: displayedTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading songs...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-end justify-between mb-4 px-1 gap-4">
        <h1 className="text-3xl font-bold ml-1">Songs</h1>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Filter songs..."
              className="pl-9 bg-neutral-900 border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                value={sortKey}
                onValueChange={(v) => setSortKey(v as SortKey)}
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
                value={sortDirection}
                onValueChange={(v) => setSortDirection(v as SortDirection)}
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

          <div className="text-xs text-gray-500 ml-2 whitespace-nowrap">
            {displayedTracks.length} tracks
          </div>
        </div>
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-1 custom-scrollbar scroll-mask-y"
      >
        {displayedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {searchQuery ? (
              <>
                <Filter className="h-10 w-10 text-gray-600 mb-4" />
                <h2 className="text-xl font-bold">No matches found</h2>
                <p className="text-gray-400 mt-2">
                  Try adjusting your filters.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">No songs found</h2>
                <p className="text-gray-400 mt-2 mb-6 max-w-sm">
                  Import music using the sidebar button to get started.
                </p>
              </>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize() + 96}px`, // +96px for bottom padding (scroll past player)
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
                  <MusicListItem track={track} context={displayedTracks} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
