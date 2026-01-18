import { useMemo, useState } from "react";
import { useLibraryStore } from "@/stores/library-store";

import { EmptyState } from "@/components/shared/empty-state";
import { Music2, Search } from "lucide-react";
import ArtistCard from "@/components/shared/item/artist-card";
import { VirtualizedGrid } from "@/components/shared/virtualized-grid";
import { PageHeader } from "@/components/shared/page-header";

import { useSettingsStore } from "@/stores/settings-store";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import { Input } from "@/components/ui/input";

export default function ArtistsPage() {
  const artists = useLibraryStore((s) => s.artists);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const { artistsSortKey, artistsSortDirection, setArtistsSort } =
    useSettingsStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedArtists = useMemo(() => {
    let result = [...artists];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(query));
    }

    // Sort
    return result.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      switch (artistsSortKey) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "album_count":
          valA = a.album_count;
          valB = b.album_count;
          break;
        case "track_count":
          valA = a.track_count;
          valB = b.track_count;
          break;
        default:
          return 0;
      }

      if (valA < valB) return artistsSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return artistsSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [artists, artistsSortKey, artistsSortDirection, searchQuery]);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <PageHeader title="Artists">
        <div className="relative w-64 mr-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter artists..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <SortDropdown
          sortKey={artistsSortKey}
          sortDirection={artistsSortDirection}
          onSortChange={(k, d) => setArtistsSort(k, d)}
          options={[
            { label: "Name", value: "name" },
            { label: "Album Count", value: "album_count" },
            { label: "Track Count", value: "track_count" },
          ]}
        />
      </PageHeader>

      <VirtualizedGrid
        items={filteredAndSortedArtists}
        renderItem={(artist) => <ArtistCard key={artist.id} artist={artist} />}
        itemHeight={220}
        emptyState={
          !isLoading ? (
            searchQuery ? (
              <EmptyState
                icon={Search}
                title="No matches found"
                description={`We couldn't find any artists matching "${searchQuery}"`}
              />
            ) : (
              <EmptyState
                icon={Music2}
                title="No artists found"
                description="Import music to see your artists here."
              />
            )
          ) : null
        }
      />
    </div>
  );
}
