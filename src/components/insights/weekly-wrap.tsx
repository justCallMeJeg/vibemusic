import { useMemo } from "react";
import {
  Music,
  Headphones,
  Disc,
  CalendarDays,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatListeningTime } from "@/lib/format";
import type { WeeklyWrapData, TimeRange } from "@/stores/stats-store";

interface WeeklyWrapProps {
  data: WeeklyWrapData;
  timeRange: TimeRange;
  isLoading?: boolean;
}

const RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "7-Day Overview",
  "30d": "30-Day Overview",
  "6mo": "6-Month Overview",
  "1y": "Year Overview",
  all: "All Time Overview",
};

function formatDay(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return dateStr;
  }
}

export function WeeklyWrap({ data, timeRange, isLoading }: WeeklyWrapProps) {
  const hasData = data.total_plays > 0;

  const insights = useMemo(() => {
    if (!hasData) return [];
    const items = [];
    if (data.unique_artists >= 5) items.push("Wide range — you explored a lot");
    if (data.total_plays >= 50) items.push("Heavy rotation");
    if (data.total_listening_ms >= 3_600_000 * 5)
      items.push("Deep listening — over 5 hours");
    if (data.unique_tracks > data.unique_artists * 2)
      items.push("Variety seeker");
    return items;
  }, [hasData, data]);

  if (isLoading) {
    return (
      <div className="bg-linear-to-br from-card/50 to-card/30 border border-border rounded-xl p-5 animate-pulse">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-56" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="bg-linear-to-br from-card/50 to-card/30 border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Sparkles size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            {RANGE_LABELS[timeRange]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          No activity in this period.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br from-card/50 via-card/30 to-card/10 border border-border rounded-xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/2 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-warning/3 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Sparkles size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            {RANGE_LABELS[timeRange]}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatTile icon={Headphones} label="Plays" value={data.total_plays} />
          <StatTile
            icon={Music}
            label="Time Listened"
            value={formatListeningTime(data.total_listening_ms)}
          />
          <StatTile
            icon={Disc}
            label="Unique Tracks"
            value={data.unique_tracks}
          />
          <StatTile
            icon={TrendingUp}
            label="Artists"
            value={data.unique_artists}
          />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          {data.top_track && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Music size={12} className="text-foreground/60 shrink-0" />
              <span className="text-foreground/80 font-medium">Top Track:</span>
              <span className="truncate max-w-40">{data.top_track}</span>
            </div>
          )}
          {data.top_artist && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Headphones size={12} className="text-foreground/60 shrink-0" />
              <span className="text-foreground/80 font-medium">
                Top Artist:
              </span>
              <span className="truncate max-w-35">{data.top_artist}</span>
            </div>
          )}
          {data.most_active_day && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays size={12} className="text-foreground/60 shrink-0" />
              <span className="text-foreground/80 font-medium">
                Most Active:
              </span>
              <span>
                {formatDay(data.most_active_day)} ({data.most_active_day_plays}{" "}
                plays)
              </span>
            </div>
          )}
        </div>

        {insights.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
            {insights.map((insight) => (
              <span
                key={insight}
                className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full"
              >
                {insight}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 bg-background/40 rounded-lg p-3 border border-border/30">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/50 shrink-0">
        <Icon size={14} className="text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground truncate">
          {value}
        </div>
      </div>
    </div>
  );
}
