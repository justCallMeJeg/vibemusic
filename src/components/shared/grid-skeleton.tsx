import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GridSkeletonProps {
  /** Component to render for each item */
  renderItem: (key: number) => ReactNode;
  /** Number of items to render. Default: 15 */
  count?: number;
  /** Optional custom grid container className */
  className?: string;
  /** Whether to include the default padding (px-2) */
  px?: boolean;
}

export function GridSkeleton({
  renderItem,
  count = 15,
  className,
  px = true,
}: GridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
        px && "px-2",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => renderItem(i))}
    </div>
  );
}
