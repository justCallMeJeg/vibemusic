import { Slider } from "./ui/slider";
import {
  useAudioStore,
  useCurrentTrack,
  usePlayerStatus,
  useVolume,
  useRepeat,
  useShuffle,
  useSidePanel,
  usePosition,
  useDuration,
} from "@/stores/audio-store";

import { useNavigationStore } from "@/stores/navigation-store";
import { useEffect, useState, useCallback, useRef } from "react";
import { formatDuration } from "@/lib/format";
import { ArtworkImage } from "./shared/artwork-image";
import { ScrollingText } from "./shared/scrolling-text";
import { ArtistLinks } from "./shared/artist-links";
import { VolumeControl } from "./shared/volume-control";
import { PlaybackControls } from "./shared/playback-controls";
import { SidePanelActions } from "./shared/side-panel-actions";

export default function MusicControler() {
  // Use atomic selectors for minimal re-renders
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const volume = useVolume();

  const repeat = useRepeat();
  const shuffle = useShuffle();
  const sidePanel = useSidePanel();
  const position = usePosition();
  const duration = useDuration();

  const isPlaying = status === "playing";
  const [sliderValue, setSliderValue] = useState([0]);
  const isDraggingRef = useRef(false);

  // Sync slider with audio position when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setSliderValue([position]);
    }
  }, [position]);

  const handlePlayPause = useCallback(() => {
    const s = useAudioStore.getState();
    if (s.status === "playing") {
      s.pause();
    } else {
      if (s.currentTrack) s.resume();
    }
  }, []);

  const handleSeekChange = useCallback(
    (value: number[]) => {
      isDraggingRef.current = true;
      useAudioStore.getState().setDraggingSlider(true);
      setSliderValue(value);
    },
    [],
  );

  const handleSeekCommit = useCallback(
    (value: number[]) => {
      const s = useAudioStore.getState();
      s.seek(value[0]);
      isDraggingRef.current = false;
      s.setDraggingSlider(false);
    },
    [],
  );

  const handleVolume = useCallback(
    (value: number[]) => {
      useAudioStore.getState().setVolume(value[0]);
    },
    [],
  );

  const onToggleShuffle = useCallback(() => useAudioStore.getState().toggleShuffle(), []);
  const onPrevious = useCallback(() => useAudioStore.getState().previous(), []);
  const onNext = useCallback(() => useAudioStore.getState().next(), []);
  const onToggleRepeat = useCallback(() => useAudioStore.getState().toggleRepeat(), []);
  const onToggleMute = useCallback(() => useAudioStore.getState().toggleMute(), []);
  const onToggleQueue = useCallback(() => useAudioStore.getState().toggleQueue(), []);
  const onSetSidePanel = useCallback((view: "none" | "queue" | "track-details" | "lyrics") => useAudioStore.getState().setSidePanel(view), []);
  const onToggleMiniPlayer = useCallback(() => useNavigationStore.getState().toggleMiniPlayer(), []);

  return (
    <div className="bg-popover/75 backdrop-blur-md rounded-lg outline outline-border w-full ml-auto h-auto grid grid-cols-3 grid-rows-1 gap-4 p-4 transition-all duration-500 pointer-events-auto">
      <div id="track" className="flex items-center gap-4">
        {currentTrack ? (
          <>
            <ArtworkImage
              src={currentTrack.artwork_path}
              alt={currentTrack.title}
              placeholderType="track"
              className="aspect-square h-24 w-fit rounded-lg"
              width={96}
              height={96}
            />
            <div className="flex flex-col min-w-0 w-full">
              <ScrollingText
                className="text-foreground text-base font-bold w-full"
                trigger="always"
              >
                {currentTrack.title}
              </ScrollingText>
              <div className="text-muted-foreground text-xs font-normal line-clamp-1">
                <ArtistLinks
                  names={currentTrack.artist_names}
                  ids={currentTrack.artist_ids}
                  roles={currentTrack.artist_roles}
                  fallbackName={currentTrack.artist}
                  fallbackId={currentTrack.artist_id}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="aspect-square h-24 rounded-lg bg-card" />
            <div className="flex flex-col gap-1 w-24">
              <div className="h-4 bg-card rounded w-full" />
              <div className="h-3 bg-card rounded w-2/3" />
            </div>
          </>
        )}
      </div>
      <div
        id="controls"
        className=" flex flex-col items-center justify-center gap-2"
      >
        <PlaybackControls
          isPlaying={isPlaying}
          shuffle={shuffle}
          repeat={repeat}
          onToggleShuffle={onToggleShuffle}
          onPrevious={onPrevious}
          onPlayPause={handlePlayPause}
          onNext={onNext}
          onToggleRepeat={onToggleRepeat}
        />
        {/* Seeker */}
        <div className=" flex items-center gap-4 w-full">
          <p className="text-foreground text-xs font-normal w-10 text-right">
            {formatDuration(sliderValue[0])}
          </p>
          <Slider
            aria-label="Seek position"
            value={sliderValue}
            max={duration || 100}
            step={100}
            onValueChange={handleSeekChange}
            onValueCommit={handleSeekCommit}
          />
          <p className="text-foreground text-xs font-normal w-10">
            {formatDuration(duration)}
          </p>
        </div>
      </div>
      <div id="actions" className="flex items-center gap-2 justify-end">
        <VolumeControl
          volume={volume}
          onVolumeChange={handleVolume}
          onToggleMute={onToggleMute}
        />
        <SidePanelActions
          sidePanel={sidePanel}
          onToggleQueue={onToggleQueue}
          onSetSidePanel={onSetSidePanel}
          onToggleMiniPlayer={onToggleMiniPlayer}
        />
      </div>
    </div>
  );
}
