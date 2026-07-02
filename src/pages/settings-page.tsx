import { useState, useEffect } from "react";
import { SettingsSidebar } from "./settings/settings-sidebar";
import { SettingsGeneral } from "./settings/settings-general";
import { SettingsAppearance } from "./settings/settings-appearance";
import { SettingsLibrary } from "./settings/settings-library";
import { SettingsAudio } from "./settings/settings-audio";
import { SettingsAbout } from "./settings/settings-about";

import { useCurrentPage } from "@/stores/navigation-store";
import { useIsPlayerVisible } from "@/stores/audio-store";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const currentPage = useCurrentPage();
  const isPlayerVisible = useIsPlayerVisible();
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (currentPage === "about") {
      setActiveTab("about");
    }
  }, [currentPage]);

  return (
    <div className="flex w-full h-full">
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto">
        <div className={cn("max-w-3xl mx-auto px-8 pt-8", isPlayerVisible ? "pb-player-bar" : "pb-8")}>
          {activeTab === "general" && <SettingsGeneral />}
          {activeTab === "appearance" && <SettingsAppearance />}
          {activeTab === "library" && <SettingsLibrary />}
          {activeTab === "audio" && <SettingsAudio />}
          {activeTab === "about" && <SettingsAbout />}
        </div>
      </main>
    </div>
  );
}
