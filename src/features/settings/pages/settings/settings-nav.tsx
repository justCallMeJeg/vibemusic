import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Palette,
  FolderOpen,
  Speaker,
  Info,
  PanelLeft,
  FlaskConical,
} from "lucide-react";

export const SETTINGS_SECTIONS = [
  { id: "general", label: "General", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "navigation", label: "Navigation", icon: PanelLeft },
  { id: "library", label: "Library", icon: FolderOpen },
  { id: "audio", label: "Audio", icon: Speaker },
  { id: "experimental", label: "Experimental", icon: FlaskConical },
  { id: "about", label: "About", icon: Info },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

interface SettingsNavProps {
  activeSection: SettingsSectionId;
  onNavigate: (id: SettingsSectionId) => void;
}

export function SettingsNav({ activeSection, onNavigate }: SettingsNavProps) {
  return (
    <nav className="sticky top-0 z-10 flex items-center gap-1 px-8 py-3 border-b border-border">
      <h2 className="text-lg font-semibold mr-4 shrink-0">Settings</h2>
      {SETTINGS_SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <Button
            key={section.id}
            variant="ghost"
            onClick={() => onNavigate(section.id)}
            className={cn(
              "px-3.5 h-auto py-2 rounded-lg text-sm font-medium whitespace-nowrap",
              isActive
                ? "bg-primary/15 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/15",
            )}
          >
            <Icon className="size-4" />
            {section.label}
          </Button>
        );
      })}
    </nav>
  );
}
