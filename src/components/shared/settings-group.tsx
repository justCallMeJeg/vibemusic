import { type ReactNode } from "react";

interface SettingsGroupProps {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}

export function SettingsGroup({
  title,
  description,
  headerAction,
  children,
}: SettingsGroupProps) {
  return (
    <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{title}</span>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {headerAction}
      </div>
      {children}
    </div>
  );
}
