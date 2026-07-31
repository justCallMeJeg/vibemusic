import { forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface RankedListCardProps {
  title: string;
  isLoading: boolean;
  hasData: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

const ITEMS_VISIBLE = 3;

export const RankedListCard = forwardRef<HTMLDivElement, RankedListCardProps>(
  ({ title, isLoading, hasData, emptyMessage = "No data yet", children }, ref) => {
    return (
      <div ref={ref} className="bg-card/30 border border-border/50 rounded-xl p-3">
        <h3 className="text-sm font-bold mb-2 px-1">{title}</h3>
        <div className="flex flex-col gap-0.5">
          {isLoading
            ? Array.from({ length: ITEMS_VISIBLE }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5 px-1 animate-pulse">
                  <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-3 w-3/4 mb-1" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                  <Skeleton className="h-3 w-6 shrink-0" />
                </div>
              ))
            : !hasData
              ? <div className="text-xs text-muted-foreground px-2 py-4 text-center">{emptyMessage}</div>
              : children}
        </div>
      </div>
    );
  },
);

RankedListCard.displayName = "RankedListCard";