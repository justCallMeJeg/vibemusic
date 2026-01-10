import { useState } from "react";
import { SettingsSidebar } from "./settings/settings-sidebar";
import { SettingsGeneral } from "./settings/settings-general";
import { SettingsAppearance } from "./settings/settings-appearance";
import { SettingsLibrary } from "./settings/settings-library";
import { SettingsAudio } from "./settings/settings-audio";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="flex w-full h-full">
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          {activeTab === "general" && <SettingsGeneral />}
          {activeTab === "appearance" && <SettingsAppearance />}
          {activeTab === "library" && <SettingsLibrary />}
          {activeTab === "audio" && <SettingsAudio />}
        </div>
      </main>
    </div>
  );
}
