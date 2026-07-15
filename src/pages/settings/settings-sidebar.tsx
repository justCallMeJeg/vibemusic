import { cn } from "@/lib/utils";
import { Settings, Palette, Speaker, Info, FolderOpen } from "lucide-react";

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "library", label: "Library", icon: FolderOpen },
  { id: "audio", label: "Audio", icon: Speaker },
  { id: "about", label: "About", icon: Info },
] as const;

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  return (
    <nav className="w-64 border-r border-border p-4 flex flex-col gap-2">
      <h2 className="pt-6 text-xl font-bold px-4 mb-4">Settings</h2>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/15",
            )}
          >
            <Icon className="w-5 h-5" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
