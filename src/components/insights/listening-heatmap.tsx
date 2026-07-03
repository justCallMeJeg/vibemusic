
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { HeatmapPoint } from "@/stores/stats-store";

interface ListeningHeatmapProps {
  data: HeatmapPoint[];
  isLoading?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ListeningHeatmap({ data, isLoading }: ListeningHeatmapProps) {
  const pointMap = new Map(data.map((p) => [`${p.day}-${p.hour}`, p]));

  const maxIntensity = data.reduce(
    (max, p) => Math.max(max, p.normalized),
    1,
  );

  const getIntensity = (day: number, hour: number) => {
    return pointMap.get(`${day}-${hour}`)?.intensity ?? 0;
  };

  const getCellColor = (value: number) => {
    if (value === 0) return "bg-sidebar-accent/50";
    const percent = value / maxIntensity;
    if (percent < 0.25) return "bg-primary/30";
    if (percent < 0.5) return "bg-primary/50";
    if (percent < 0.75) return "bg-primary/80";
    return "bg-primary";
  };

  const formatNormalized = (value: number) => value.toFixed(1);

  if (isLoading) {
    return (
      <div className="h-full w-full overflow-x-auto pb-4">
        <div className="min-w-112.5 grid grid-cols-[auto_repeat(24,1fr)] gap-0.5">
          <div className="col-span-1" />
          <Skeleton className="h-3 w-full rounded-sm col-span-24" />
          {DAYS.map((day) => (
            <div key={day} className="contents">
              <Skeleton className="h-4 w-8" />
              {Array.from({ length: 24 }).map((_, h) => (
                <Skeleton key={h} className="h-4 w-full rounded-sm" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-card/30 border border-border/50 rounded-xl p-3 w-full overflow-x-auto">
      <div className="min-w-112.5 flex flex-col gap-1">
        <div className="grid grid-cols-[32px_repeat(24,1fr)] gap-0.5">
          <div />
          {Array.from({ length: 24 }).map((_, h) => (
            <div
              key={h}
              className="text-[9px] text-muted-foreground text-center font-medium"
            >
              {h === 0 || h === 6 || h === 12 || h === 18 ? `${h}` : ""}
            </div>
          ))}
        </div>

        {DAYS.map((day, dayIndex) => (
          <div
            key={day}
            className="grid grid-cols-[32px_repeat(24,1fr)] gap-0.5 items-center"
          >
            <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider text-right pr-1">
              {day}
            </div>
            {Array.from({ length: 24 }).map((_, hour) => {
              const raw = getIntensity(dayIndex, hour);
              const normalized =
                pointMap.get(`${dayIndex}-${hour}`)?.normalized ?? 0;
              return (
                <div
                  key={hour}
                  className={cn(
                    "h-3 rounded-[2px] transition-all duration-200",
                    raw > 0
                      ? "hover:scale-125 hover:ring-1 hover:ring-ring cursor-help"
                      : "",
                    getCellColor(normalized),
                  )}
                  title={`${day} ${hour}:00 - ${raw} play${raw !== 1 ? "s" : ""} (${formatNormalized(normalized)}/day)`}
                />
              );
            })}
          </div>
        ))}

        <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-sidebar-accent/50" />
            <div className="w-2.5 h-2.5 rounded-sm bg-primary/30" />
            <div className="w-2.5 h-2.5 rounded-sm bg-primary/50" />
            <div className="w-2.5 h-2.5 rounded-sm bg-primary/80" />
            <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
