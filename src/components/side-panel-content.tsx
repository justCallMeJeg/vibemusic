import { lazy, Suspense, memo } from "react";
import { useSidePanel, useAudioStore } from "@/stores/audio-store";
import { SidePanelLayout } from "@/components/shared/side-panel-layout";

const QueueContent = lazy(() => import("./queue-menu"));
const TrackDetailContent = lazy(() => import("./track-detail-panel"));
const LyricsContent = lazy(() => import("./lyrics-panel"));

interface PanelConfig {
  title: string;
  Component: React.LazyExoticComponent<React.ComponentType>;
}

const panelMap: Record<string, PanelConfig> = {
  queue: { title: "Queue", Component: QueueContent },
  "track-details": { title: "Track Details", Component: TrackDetailContent },
  lyrics: { title: "Lyrics", Component: LyricsContent },
};

function SidePanelContent() {
  const sidePanel = useSidePanel();
  const setSidePanel = useAudioStore((s) => s.setSidePanel);

  const config = sidePanel !== "none" ? panelMap[sidePanel] : undefined;

  if (!config) return null;

  const { title, Component } = config;

  return (
    <SidePanelLayout title={title} onClose={() => setSidePanel("none")}>
      <Suspense fallback={null}>
        <Component />
      </Suspense>
    </SidePanelLayout>
  );
}

export default memo(SidePanelContent);
