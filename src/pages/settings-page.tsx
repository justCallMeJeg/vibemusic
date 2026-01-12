import { useState } from "react";
import { SettingsSidebar } from "./settings/settings-sidebar";
import { SettingsGeneral } from "./settings/settings-general";
import { SettingsAppearance } from "./settings/settings-appearance";
import { SettingsLibrary } from "./settings/settings-library";
import { SettingsAudio } from "./settings/settings-audio";
import { SettingsAbout } from "./settings/settings-about";
import { useEffect } from "react";

import { useCurrentPage } from "@/stores/navigation-store";

export default function SettingsPage() {
  const currentPage = useCurrentPage();
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
        <div className="max-w-3xl mx-auto px-8 pt-8 pb-42">
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
