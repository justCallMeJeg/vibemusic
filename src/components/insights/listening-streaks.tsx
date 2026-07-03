import { useMemo } from "react";
import { Flame, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { StreaksData, WeekDayStatus } from "@/stores/stats-store";

interface Props {
  data: StreaksData;
  isLoading?: boolean;
}

function DayCell({ status }: { status: WeekDayStatus }) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <span className="text-[11px] font-semibold uppercase text-muted-foreground/50 tracking-wider">
        {status.day.slice(0, 2)}
      </span>
      {status.active ? (
        <Flame
          size={16}
          className="text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]"
        />
      ) : (
        <div className="w-2 h-2 rounded-full bg-muted-foreground/10" />
      )}
    </div>
  );
}

export function ListeningStreaks({ data, isLoading }: Props) {
  const activeCount = useMemo(() => data.week_days.filter((d) => d.active).length, [data.week_days]);

  if (isLoading) {
    return (
      <div className="h-full bg-card/50 border border-border rounded-xl p-4 animate-pulse flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex justify-between mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-3 w-28 mx-auto" />
      </div>
    );
  }

  const hasStreak = data.current_streak > 0;
  const isBurning = data.current_streak >= 3;

  return (
    <div className="h-full flex flex-col bg-card/50 border border-border rounded-xl p-4 relative overflow-hidden">
      <div className="flex items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Flame size={18} className={isBurning ? "text-amber-500" : ""} />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Streak
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-2xl font-bold ${isBurning ? "text-amber-500" : "text-foreground"}`}
          >
            {hasStreak ? `${data.current_streak}d` : "—"}
          </span>
          <Trophy size={15} className="text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground">
            {data.longest_streak}d
          </span>
        </div>
      </div>

      <div className="flex-1 flex justify-between items-center px-1">
        {data.week_days.map((day) => (
          <DayCell key={day.date} status={day} />
        ))}
      </div>

      <div className="text-[11px] text-muted-foreground text-center mt-auto shrink-0">
        {activeCount > 0
          ? `${activeCount}/7 days active`
          : "No activity this week"}
      </div>

      {isBurning && (
        <div className="absolute inset-0 bg-linear-to-t from-amber-500/5 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
