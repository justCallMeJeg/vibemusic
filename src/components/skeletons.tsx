import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GridSkeleton } from "@/components/shared/grid-skeleton";
import { SkeletonCard, SkeletonRow } from "@/components/shared/skeleton-primitives";
import { PageLayout } from "@/components/shared/page-layout";

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
      <div className="flex flex-col gap-1 px-2" style={{ contentVisibility: "auto", containIntrinsicSize: "300px" }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <SkeletonRow key={i} leading="square" />
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
        renderItem={(i) => <SkeletonCard key={i} variant="album" />}
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
        renderItem={(i) => <SkeletonCard key={i} variant="artist" />}
      />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 mb-4 px-2">
        <Skeleton className="h-10 w-64 bg-foreground/10" />
        <Skeleton className="h-4 w-48 mt-2 bg-foreground/5" />
      </div>
      <div className="pt-4 flex-1 overflow-y-auto px-2 space-y-8" style={{ contentVisibility: "auto", containIntrinsicSize: "500px" }}>
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24 bg-foreground/10" />
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 px-2 scrollbar-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-40 shrink-0">
                <SkeletonCard variant="album" />
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24 bg-foreground/10" />
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 px-2 scrollbar-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-40 shrink-0">
                <SkeletonCard variant="album" />
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
      <div className="flex-1 px-2 space-y-1" style={{ contentVisibility: "auto", containIntrinsicSize: "300px" }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <SkeletonRow key={i} leading="square" />
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex w-full h-full">
      <div className="w-64 border-r h-full p-4 space-y-4 hidden md:block">
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md bg-foreground/5" />
          ))}
        </div>
      </div>
      <main className="flex-1 overflow-y-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "400px" }}>
        <div className="max-w-3xl mx-auto px-8 pt-8 pb-42 space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-foreground/10" />
            <Skeleton className="h-4 w-96 bg-foreground/5" />
          </div>
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

export const SongsContentSkeleton = memo(function SongsContentSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-2" style={{ contentVisibility: "auto", containIntrinsicSize: "300px" }}>
      {Array.from({ length: 15 }).map((_, i) => (
        <SkeletonRow key={i} leading="square" />
      ))}
    </div>
  );
});

export const AlbumsContentSkeleton = memo(function AlbumsContentSkeleton() {
  return (
    <GridSkeleton
      renderItem={(i) => <SkeletonCard key={i} variant="album" />}
    />
  );
});

export const ArtistsContentSkeleton = memo(function ArtistsContentSkeleton() {
  return (
    <GridSkeleton
      renderItem={(i) => <SkeletonCard key={i} variant="artist" />}
    />
  );
});

export const SettingsContentSkeleton = memo(function SettingsContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-5 w-5 rounded-md bg-foreground/10" />
        <Skeleton className="h-7 w-32 bg-foreground/10" />
      </div>
      <div className="grid gap-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded bg-foreground/10" />
              <Skeleton className="h-5 w-28 bg-foreground/10" />
            </div>
            <Skeleton className="h-3 w-72 bg-foreground/5 ml-6" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full bg-foreground/5 shrink-0" />
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded bg-foreground/10" />
              <Skeleton className="h-5 w-32 bg-foreground/10" />
            </div>
            <Skeleton className="h-3 w-64 bg-foreground/5 ml-6" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full bg-foreground/5 shrink-0" />
        </div>
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36 bg-foreground/10" />
              <Skeleton className="h-3 w-56 bg-foreground/5" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md bg-foreground/5" />
          </div>
        </div>
      </div>
    </div>
  );
});

export const InsightsSkeleton = memo(function InsightsSkeleton() {
  return (
    <PageLayout overflowHidden className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32 bg-foreground/10" />
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-md bg-foreground/5" />
          ))}
        </div>
      </div>
      <Skeleton className="h-36 w-full rounded-xl bg-foreground/5" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-foreground/5" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl bg-foreground/5" />
        <Skeleton className="h-48 rounded-xl bg-foreground/5" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl bg-foreground/5" />
        ))}
      </div>
    </PageLayout>
  );
});
