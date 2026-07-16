import { Suspense, memo } from "react";
import { useSidePanel, useAudioStore } from "@/stores/audio-store";
import { SidePanelLayout } from "@/components/shared/side-panel-layout";
import QueueContent from "./queue-menu";
import TrackDetailContent from "./track-detail-panel";
import LyricsContent from "./lyrics-panel";

interface PanelConfig {
  title: string;
  Component: React.ComponentType;
  noContentPadding?: boolean;
}

const panelMap: Record<string, PanelConfig> = {
  queue: { title: "Queue", Component: QueueContent },
  "track-details": { title: "Track Details", Component: TrackDetailContent },
  lyrics: { title: "Lyrics", Component: LyricsContent, noContentPadding: true },
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
