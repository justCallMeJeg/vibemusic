import { Suspense, memo } from "react";
import { useSidePanel, useAudioStore } from "@/stores/audio-store";
import { SidePanelLayout } from "@features/shell/components/side-panel-layout";
import QueueContent from "@features/player/components/queue-menu";
import TrackDetailContent from "@features/player/components/track-detail-panel";
import LyricsContent from "@features/player/components/lyrics-panel";
import SleepTimerPanel from "@features/player/components/sleep-timer-panel";

interface PanelConfig {
  title: string;
  Component: React.ComponentType;
  noContentPadding?: boolean;
}

const panelMap: Record<string, PanelConfig> = {
  queue: { title: "Queue", Component: QueueContent },
  "track-details": { title: "Track Details", Component: TrackDetailContent },
  lyrics: { title: "Lyrics", Component: LyricsContent, noContentPadding: true },
  "sleep-timer": { title: "Sleep Timer", Component: SleepTimerPanel },
};

function SidePanelContent() {
  const sidePanel = useSidePanel();
  const setSidePanel = useAudioStore((s) => s.setSidePanel);

  const config = sidePanel !== "none" ? panelMap[sidePanel] : undefined;

  if (!config) return null;

  const { title, Component } = config;

  return (
    <SidePanelLayout
      title={title}
      onClose={() => setSidePanel("none")}
      noContentPadding={config.noContentPadding}
    >
      <Suspense fallback={null}>
        <Component />
      </Suspense>
    </SidePanelLayout>
  );
}

export default memo(SidePanelContent);
