import { useMemo } from "react";
import { useLibraryStore } from "@/stores/library-store";

import { EmptyState } from "@/components/shared/empty-state";
import { Music2 } from "lucide-react";
import ArtistCard from "@/components/shared/item/artist-card";
import { VirtualizedGrid } from "@/components/shared/virtualized-grid";

export default function ArtistsPage() {
  const artists = useLibraryStore((s) => s.artists);
  const isLoading = useLibraryStore((s) => s.isLoading);

  // Sort artists alphabetically by name
  const sortedArtists = useMemo(
    () => [...artists].sort((a, b) => a.name.localeCompare(b.name)),
    [artists]
  );

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-center justify-between mb-6 px-2">
        <h1 className="text-3xl font-bold">Artists</h1>
      </div>

      <VirtualizedGrid
        items={sortedArtists}
        renderItem={(artist) => <ArtistCard key={artist.id} artist={artist} />}
        itemHeight={220}
        emptyState={
          !isLoading ? (
            <EmptyState
              icon={Music2}
              title="No artists found"
              description="Import music to see your artists here."
            />
          ) : null
        }
      />
    </div>
  );
}
