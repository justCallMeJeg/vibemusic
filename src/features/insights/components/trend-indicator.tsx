import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  value: number; // Percentage change
  inverse?: boolean; // If true, positive value is bad (not used here but good practice)
  className?: string;
}

export function TrendIndicator({ value, className }: TrendIndicatorProps) {
  // If undefined or Infinity/NaN (e.g. from 0 division), don't render
  if (
    value === undefined ||
    value === null ||
    isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  // Round to 1 decimal place
  const rounded = Math.round(value * 10) / 10;
  const isPositive = rounded > 0;
  const isNeutral = rounded === 0;

  if (isNeutral) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Minus size={12} />
        <span>0%</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        isPositive ? "text-success" : "text-destructive",
        className,
      )}
    >
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      <span>{Math.abs(rounded)}%</span>
    </div>
  );
}
