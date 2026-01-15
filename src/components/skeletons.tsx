import { Skeleton } from "@/components/ui/skeleton";
import { GridSkeleton } from "@/components/shared/grid-skeleton";

export function SongsSkeleton() {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-center justify-between mb-6 px-2 gap-4">
        <Skeleton className="h-9 w-32 bg-foreground/10" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64 bg-foreground/5" />
          <Skeleton className="h-9 w-20 bg-foreground/5" />
        </div>
      </div>
      <div className="flex flex-col gap-1 px-2">
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
    </div>
  );
}

export function AlbumsSkeleton() {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-center justify-between mb-6 px-2">
        <Skeleton className="h-9 w-32 bg-foreground/10" />
      </div>
      <GridSkeleton
        renderItem={(i) => (
          <div key={i} className="flex flex-col rounded-lg p-3 gap-3">
            <Skeleton className="aspect-square w-full rounded-lg bg-foreground/5" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4 bg-foreground/10" />
              <Skeleton className="h-3 w-1/2 bg-foreground/5" />
            </div>
          </div>
        )}
      />
    </div>
  );
}

export function ArtistsSkeleton() {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-center justify-between mb-6 px-2">
        <Skeleton className="h-9 w-32 bg-foreground/10" />
      </div>
      <GridSkeleton
        renderItem={(i) => (
          <div key={i} className="flex flex-col rounded-lg p-3 gap-3">
            <Skeleton className="aspect-square w-full rounded-full bg-foreground/5" />
            <div className="space-y-2 flex flex-col items-center">
              <Skeleton className="h-4 w-3/4 bg-foreground/10" />
              <Skeleton className="h-3 w-1/2 bg-foreground/5" />
            </div>
          </div>
        )}
      />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      {/* Header Loading */}
      <div className="mt-8 mb-4 px-2">
        <Skeleton className="h-10 w-64 bg-foreground/10" />
        <Skeleton className="h-4 w-48 mt-2 bg-foreground/5" />
      </div>

      <div className="pt-4 flex-1 overflow-y-auto px-2 space-y-8">
        {/* Albums Skeleton */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24 bg-foreground/10" />
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 px-2 scrollbar-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-40 shrink-0 space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl bg-foreground/5" />
                <div>
                  <Skeleton className="h-4 w-32 bg-foreground/10 mb-1" />
                  <Skeleton className="h-3 w-20 bg-foreground/5" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Playlists Skeleton */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24 bg-foreground/10" />
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 px-2 scrollbar-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-40 shrink-0 space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl bg-foreground/5" />
                <div>
                  <Skeleton className="h-4 w-24 bg-foreground/10 mb-1" />
                  <Skeleton className="h-3 w-16 bg-foreground/5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-center gap-2 mb-4 px-2">
        <Skeleton className="h-8 w-8 rounded-md bg-foreground/5" />
        <Skeleton className="h-4 w-32 bg-foreground/10" />
      </div>
      <div className="flex gap-6 mb-6 px-2">
        <Skeleton className="w-40 h-40 rounded-lg bg-foreground/5 shrink-0" />
        <div className="flex flex-col justify-center min-w-0 flex-1 space-y-3">
          <Skeleton className="h-8 w-1/2 bg-foreground/10" />
          <Skeleton className="h-4 w-24 bg-foreground/5" />
          <Skeleton className="h-4 w-32 bg-foreground/5" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-10 w-24 rounded-full bg-foreground/10" />
            <Skeleton className="h-10 w-24 rounded-full bg-foreground/5" />
          </div>
        </div>
      </div>
      <div className="flex-1 px-2 space-y-1">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="w-8 h-8 rounded bg-foreground/5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2 bg-foreground/10" />
              <Skeleton className="h-3 w-1/3 bg-foreground/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex w-full h-full">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r h-full p-4 space-y-4 hidden md:block">
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-9 w-full rounded-md bg-foreground/5"
            />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 pt-8 pb-42 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-foreground/10" />
            <Skeleton className="h-4 w-96 bg-foreground/5" />
          </div>

          {/* Settings Section 1 */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32 bg-foreground/10" />
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 bg-foreground/10" />
                  <Skeleton className="h-3 w-64 bg-foreground/5" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full bg-foreground/5" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 bg-foreground/10" />
                  <Skeleton className="h-3 w-56 bg-foreground/5" />
                </div>
                <Skeleton className="h-8 w-32 rounded-md bg-foreground/5" />
              </div>
            </div>
          </div>

          {/* Settings Section 2 */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32 bg-foreground/10" />
            <div className="space-y-4 border rounded-lg p-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40 bg-foreground/10" />
                <Skeleton className="h-3 w-full bg-foreground/5" />
              </div>
              <Skeleton className="h-10 w-full rounded-md bg-foreground/5" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
