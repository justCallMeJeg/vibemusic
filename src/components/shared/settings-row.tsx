import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsRowProps {
  label: string;
  description?: string;
  layout?: "center" | "start";
  variant?: "card" | "nested";
  children?: ReactNode;
}

export function SettingsRow({
  label,
  description,
  layout = "center",
  variant = "card",
  children,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        variant === "card" &&
          "p-4 rounded-xl bg-secondary/50 border border-border",
        "flex gap-4",
        children
          ? layout === "start"
            ? "items-start justify-between"
            : "items-center justify-between"
          : "items-center",
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              variant === "nested"
                ? "text-sm font-medium"
                : "font-medium",
            )}
          >
            {label}
          </span>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
