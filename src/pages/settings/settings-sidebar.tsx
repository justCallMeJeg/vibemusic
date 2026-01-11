import { cn } from "@/lib/utils";
import { Settings, Palette, Speaker, Info, FolderOpen } from "lucide-react";

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "library", label: "Library", icon: FolderOpen },
    { id: "audio", label: "Audio", icon: Speaker },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <nav className="w-64 border-r border-white/5 p-4 flex flex-col gap-2">
      <h2 className="pt-6 text-xl font-bold px-4 mb-4">Settings</h2>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
              isActive
                ? "bg-purple-500/10 text-purple-400"
                : "text-gray-400 hover:text-white hover:bg-white/5"
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
