import { Disc } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useLibraryStore } from "@/stores/library-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import AlbumCard from "@/components/shared/item/album-card";

export default function AlbumsPage() {
  const albums = useLibraryStore((s) => s.albums);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const scrollRef = useScrollMask();

  if (isLoading) {
    return (
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <div className="mt-8 flex items-center justify-between mb-6 px-2">
          <h1 className="text-3xl font-bold">Albums</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-lg p-3 gap-3">
              <Skeleton className="aspect-square w-full rounded-lg bg-white/5" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/2 bg-white/5" />
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

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 scroll-mask-y"
      >
        {albums.length === 0 ? (
          <EmptyState
            icon={Disc}
            title="No albums found"
            description="Import music to see your albums here."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-42">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
