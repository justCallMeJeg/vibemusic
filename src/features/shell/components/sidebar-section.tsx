import { convertFileSrc } from "@tauri-apps/api/core";
import { useFocusRegionStore } from "@/stores/focus-region-store";
import { Profile } from "@/stores/profile-store";
import NavigationMenu from "./navigation-menu";

interface SidebarSectionProps {
  activeProfile: Profile | undefined;
  onProfileClick: () => void;
  onImport: () => void;
  isScanning: boolean;
}

export function SidebarSection({ activeProfile, onProfileClick, onImport, isScanning }: SidebarSectionProps) {
  return (
    <div
      data-region="sidebar"
      tabIndex={-1}
      className="mt-2 pt-6 flex flex-col gap-6 w-16 shrink-0 h-full pb-32"
      onFocus={() => useFocusRegionStore.getState().setActiveRegion("sidebar")}
    >
      <div
        id="user_profile"
        role="button"
        tabIndex={0}
        onClick={onProfileClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onProfileClick();
          }
        }}
        className="aspect-square w-full shrink-0 rounded-lg overflow-hidden flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition-transform relative"
        style={!activeProfile?.avatarPath ? { backgroundColor: activeProfile?.color || "var(--muted-foreground)" } : undefined}
        title={`Current: ${
          activeProfile?.name || "User"
        } (Click to switch)`}
      >
        {activeProfile?.avatarPath ? (
          <img
            src={convertFileSrc(activeProfile.avatarPath)}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          activeProfile?.name?.[0]?.toUpperCase()
        )}
      </div>
      <div className="flex justify-center h-full">
        <NavigationMenu
          onImport={onImport}
          isScanning={isScanning}
        />
      </div>
    </div>
  );
}
