import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { HeatmapPoint } from "@/stores/stats-store";

interface ListeningHeatmapProps {
  data: HeatmapPoint[];
  isLoading?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_NAMES: Record<string, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

interface TimeBlock {
  label: string;
  color: string;
  hours: number[];
}

const TIME_BLOCKS: TimeBlock[] = [
  { label: "Morning", color: "bg-primary/25", hours: [6, 7, 8, 9, 10, 11] },
  { label: "Afternoon", color: "bg-primary/45", hours: [12, 13, 14, 15, 16, 17] },
  { label: "Evening", color: "bg-primary/75", hours: [18, 19, 20, 21, 22, 23] },
  { label: "Night", color: "bg-primary", hours: [0, 1, 2, 3, 4, 5] },
];

function formatHour(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

function formatHourRange(start: number, end: number): string {
  return `${formatHour(start)}–${formatHour(end)}`;
}

export function ListeningHeatmap({ data, isLoading }: ListeningHeatmapProps) {
  const dailyBlocks = useMemo(() => {
    const pointMap = new Map<string, HeatmapPoint>();
    for (const p of data) {
      pointMap.set(`${p.day}-${p.hour}`, p);
    }

    return DAYS.map((_, dayIndex) => {
      return TIME_BLOCKS.map((block) => {
        let total = 0;
        for (const hour of block.hours) {
          total += pointMap.get(`${dayIndex}-${hour}`)?.intensity ?? 0;
        }
        return total;
      });
    });
  }, [data]);

  const dailyTotals = useMemo(
    () => dailyBlocks.map((blocks) => blocks.reduce((sum, v) => sum + v, 0)),
    [dailyBlocks],
  );

  const maxDayTotal = Math.max(...dailyTotals, 1);

  const peak = useMemo(() => {
    if (data.length === 0) return null;
    const best = data.reduce((a, b) =>
      a.intensity > b.intensity ? a : b,
    );
    return {
      dayName: DAY_NAMES[DAYS[best.day]],
      hour: best.hour,
      count: best.intensity,
    };
  }, [data]);

  const hasData = data.length > 0;

  if (isLoading) {
    return (
      <div className="bg-card/50 border border-border rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-3 w-56 mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-7" />
              <Skeleton className="h-5 flex-1 rounded-sm" />
              <Skeleton className="h-3 w-5" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-2.5 w-14 rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-card/50 border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1 shrink-0">
        <Clock size={16} />
        <span className="text-xs font-semibold uppercase tracking-wide">
          When You Listen
        </span>
      </div>

      {peak ? (
        <p className="text-[11px] text-muted-foreground mb-3">
          Most active{" "}
          <span className="text-foreground/80 font-medium">
            {peak.dayName}s {formatHour(peak.hour)}
            &ndash;{formatHour((peak.hour + 1) % 24)}
          </span>
          {peak.count > 0 && (
            <span>
              , {peak.count} play{peak.count !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      ) : null}

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center min-h-[120px]">
          <p className="text-xs text-muted-foreground">No listening data yet</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {DAYS.map((day, dayIndex) => {
              const dayTotal = dailyTotals[dayIndex];
              const widthPercent = (dayTotal / maxDayTotal) * 100;

              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider w-7 text-right shrink-0">
                    {day}
                  </span>
                  <div className="flex-1 h-4">
                    {dayTotal > 0 ? (
                      <div
                        className="h-full rounded-[2px] overflow-hidden flex"
                        style={{ width: `${Math.max(widthPercent, 4)}%` }}
                      >
                        {dailyBlocks[dayIndex].map((blockTotal, blockIndex) => {
                          const block = TIME_BLOCKS[blockIndex];
                          const blockPercent =
                            (blockTotal / dayTotal) * 100;
                          if (blockPercent <= 0) return null;
                          const hourRange = formatHourRange(
                            block.hours[0],
                            block.hours[block.hours.length - 1] + 1,
                          );
                          return (
                            <div
                              key={block.label}
                              className={block.color}
                              style={{ width: `${blockPercent}%` }}
                              title={`${DAY_NAMES[day]} ${block.label} (${hourRange}): ${blockTotal} play${blockTotal !== 1 ? "s" : ""}`}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-full w-1 rounded-[2px] bg-muted/20" />
                    )}
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-5 shrink-0 text-right">
                    {dayTotal || "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-2.5 shrink-0">
            {TIME_BLOCKS.map((block) => (
              <div key={block.label} className="flex items-center gap-1">
                <div
                  className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${block.color}`}
                />
                <span className="text-[9px] text-muted-foreground leading-none">
                  {block.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
