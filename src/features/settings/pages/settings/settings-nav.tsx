import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
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

const SETTINGS_SECTIONS = [
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
  const navRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!useSettingsStore.getState().experimentalFeatures.keyboardNav) return;
    const nav = navRef.current;
    if (!nav) return;
    const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("button"));
    const current = buttons.findIndex((b) => b === document.activeElement);
    if (current < 0) return;

    let next = current;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        next = (current + 1) % buttons.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        next = (current - 1 + buttons.length) % buttons.length;
        break;
      case "Home":
        e.preventDefault();
        next = 0;
        break;
      case "End":
        e.preventDefault();
        next = buttons.length - 1;
        break;
      default:
        return;
    }

    buttons[next]?.focus();
  }, []);

  return (
    <nav
      ref={navRef}
      onKeyDown={handleKeyDown}
      className="sticky top-0 z-10 flex items-center gap-1 px-8 py-3 border-b border-border"
    >
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
