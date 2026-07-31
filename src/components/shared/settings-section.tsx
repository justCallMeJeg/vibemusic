import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      {description ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <p className="text-sm text-muted-foreground pl-7">{description}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
      )}
      <div className="grid gap-6">{children}</div>
    </div>
  );
}
