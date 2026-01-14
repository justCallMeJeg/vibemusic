import { Disc } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useLibraryStore } from "@/stores/library-store";

import AlbumCard from "@/components/shared/item/album-card";
import { VirtualizedGrid } from "@/components/shared/virtualized-grid";

export default function AlbumsPage() {
  const albums = useLibraryStore((s) => s.albums);
  const isLoading = useLibraryStore((s) => s.isLoading);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-center justify-between mb-6 px-2">
        <h1 className="text-3xl font-bold">Albums</h1>
      </div>

      <VirtualizedGrid
        items={albums}
        renderItem={(album) => <AlbumCard key={album.id} album={album} />}
        itemHeight={220} // Similar height to artist cards
        emptyState={
          !isLoading ? (
            <EmptyState
              icon={Disc}
              title="No albums found"
              description="Import music to see your albums here."
            />
          ) : null
        }
      />
    </div>
  );
}
