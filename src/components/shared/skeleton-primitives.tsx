import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonTextProps {
  lines?: number;
  widths?: string[];
  className?: string;
}

export function SkeletonText({ lines = 1, widths = ["60%"], className }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5 bg-foreground/10"
          style={{ width: widths[Math.min(i, widths.length - 1)] }}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  variant?: "album" | "artist";
}

export function SkeletonCard({ variant = "album" }: SkeletonCardProps) {
  return (
    <div className="flex flex-col rounded-lg p-3 gap-3">
      <div
        className={cn(
          "w-full bg-foreground/5",
          variant === "album" ? "aspect-square rounded-lg" : "aspect-square rounded-full"
        )}
      />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4 bg-foreground/10" />
        <Skeleton className="h-3 w-1/2 bg-foreground/5" />
      </div>
    </div>
  );
}

interface SkeletonRowProps {
  leading?: "square" | "circle" | "none";
}

export function SkeletonRow({ leading = "square" }: SkeletonRowProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md">
      {leading !== "none" && (
        <div
          className={cn(
            "w-10 h-10 shrink-0 bg-foreground/5",
            leading === "square" ? "rounded-md" : "rounded-full"
          )}
        />
      )}
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48 bg-foreground/10" />
        <Skeleton className="h-3 w-24 bg-foreground/5" />
      </div>
    </div>
  );
}
