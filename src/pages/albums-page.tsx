import { Disc } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useLibraryStore } from "@/stores/library-store";
import { Skeleton } from "@/components/ui/skeleton";
import AlbumCard from "@/components/shared/item/album-card";
import { VirtualizedGrid } from "@/components/shared/virtualized-grid";

export default function AlbumsPage() {
  const albums = useLibraryStore((s) => s.albums);
  const isLoading = useLibraryStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <div className="mt-8 flex items-center justify-between mb-6 px-2">
          <h1 className="text-3xl font-bold">Albums</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-lg p-3 gap-3">
              <Skeleton className="aspect-square w-full rounded-lg bg-foreground/5" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4 bg-foreground/10" />
                <Skeleton className="h-3 w-1/2 bg-foreground/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
          <EmptyState
            icon={Disc}
            title="No albums found"
            description="Import music to see your albums here."
          />
        }
      />
    </div>
  );
}
