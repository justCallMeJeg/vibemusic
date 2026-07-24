import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
