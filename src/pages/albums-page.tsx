import { useMemo, useState } from "react";
import { Disc, Search } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useLibraryStore } from "@/stores/library-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Input } from "@/components/ui/input";

import AlbumCard from "@/components/shared/item/album-card";
import { VirtualizedGrid } from "@/components/shared/virtualized-grid";
import { PageHeader } from "@/components/shared/page-header";
import { SortDropdown } from "@/components/shared/sort-dropdown";

export default function AlbumsPage() {
  const albums = useLibraryStore((s) => s.albums);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const { albumsSortKey, albumsSortDirection, setAlbumsSort } =
    useSettingsStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedAlbums = useMemo(() => {
    let result = [...albums];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          (a.artist_name && a.artist_name.toLowerCase().includes(query))
      );
    }

    // Sort
    return result.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      switch (albumsSortKey) {
        case "title":
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case "artist":
          valA = (a.artist_name || "").toLowerCase();
          valB = (b.artist_name || "").toLowerCase();
          break;
        case "year":
          valA = a.year || 0;
          valB = b.year || 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return albumsSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return albumsSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [albums, albumsSortKey, albumsSortDirection, searchQuery]);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <PageHeader title="Albums">
        <div className="relative w-64 mr-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter albums..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <SortDropdown
          sortKey={albumsSortKey}
          sortDirection={albumsSortDirection}
          onSortChange={(k, d) => setAlbumsSort(k, d)}
          options={[
            { label: "Title", value: "title" },
            { label: "Artist", value: "artist" },
            { label: "Year", value: "year" },
          ]}
        />
      </PageHeader>

      <VirtualizedGrid
        items={filteredAndSortedAlbums}
        renderItem={(album) => <AlbumCard key={album.id} album={album} />}
        itemHeight={220} // Similar height to artist cards
        emptyState={
          !isLoading ? (
            searchQuery ? (
              <EmptyState
                icon={Search}
                title="No matches found"
                description={`We couldn't find any albums matching "${searchQuery}"`}
              />
            ) : (
              <EmptyState
                icon={Disc}
                title="No albums found"
                description="Import music to see your albums here."
              />
            )
          ) : null
        }
      />
    </div>
  );
}
