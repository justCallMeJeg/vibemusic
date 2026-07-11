import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
