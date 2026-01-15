import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackListHeaderProps {
  /** Show the duration column with clock icon */
  showDuration?: boolean;
  /** Custom class names for the container */
  className?: string;
  /** Width of the index/number column */
  indexWidth?: string;
}

/**
 * Reusable header row for track lists.
 * Used in album and playlist detail pages.
 */
export function TrackListHeader({
  showDuration = true,
  className,
  indexWidth = "w-12",
}: TrackListHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-2 text-muted-foreground text-xs uppercase tracking-wider border-b border-border mb-2 font-medium",
        className
      )}
    >
      <div className={cn("text-center", indexWidth)}>#</div>
      <div className="flex-1 pl-4">Title</div>
      {showDuration && (
        <div className="w-16 text-right pr-4 flex items-center justify-end">
          <Clock size={14} />
        </div>
      )}
    </div>
  );
}
