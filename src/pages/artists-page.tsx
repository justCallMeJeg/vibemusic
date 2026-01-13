import { useLibraryStore } from "@/stores/library-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { Music2 } from "lucide-react";
import ArtistCard from "@/components/shared/item/artist-card";

export default function ArtistsPage() {
  const artists = useLibraryStore((s) => s.artists);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const scrollRef = useScrollMask();

  // Sort artists alphabetically by name
  const sortedArtists = [...artists].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (isLoading) {
    return (
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <div className="mt-8 flex items-center justify-between mb-6 px-2">
          <h1 className="text-3xl font-bold">Artists</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-lg p-3 gap-3">
              <Skeleton className="aspect-square w-full rounded-full bg-white/5" />
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
        <h1 className="text-3xl font-bold">Artists</h1>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 scroll-mask-y"
      >
        {sortedArtists.length === 0 ? (
          <EmptyState
            icon={Music2}
            title="No artists found"
            description="Import music to see your artists here."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-42">
            {sortedArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
