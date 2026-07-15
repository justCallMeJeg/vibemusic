import { useState, useEffect, lazy, Suspense, memo } from "react";
import { SettingsSidebar } from "./settings/settings-sidebar";

import { useCurrentPage } from "@/stores/navigation-store";
import { useIsPlayerVisible } from "@/stores/audio-store";
import { cn } from "@/lib/utils";
import { SettingsContentSkeleton } from "@/components/skeletons";

const SettingsGeneral = lazy(() =>
  import("./settings/settings-general").then((m) => ({ default: m.SettingsGeneral })),
);
const SettingsAppearance = lazy(() =>
  import("./settings/settings-appearance").then((m) => ({ default: m.SettingsAppearance })),
);
const SettingsLibrary = lazy(() =>
  import("./settings/settings-library").then((m) => ({ default: m.SettingsLibrary })),
);
const SettingsAudio = lazy(() =>
  import("./settings/settings-audio").then((m) => ({ default: m.SettingsAudio })),
);
const SettingsAbout = lazy(() =>
  import("./settings/settings-about").then((m) => ({ default: m.SettingsAbout })),
);

export default memo(function SettingsPage() {
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
          <Suspense fallback={<SettingsContentSkeleton />}>
            {activeTab === "general" && <SettingsGeneral />}
            {activeTab === "appearance" && <SettingsAppearance />}
            {activeTab === "library" && <SettingsLibrary />}
            {activeTab === "audio" && <SettingsAudio />}
            {activeTab === "about" && <SettingsAbout />}
          </Suspense>
        </div>
      </main>
    </div>
  );
});
