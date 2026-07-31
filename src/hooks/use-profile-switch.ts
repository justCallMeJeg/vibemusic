import { useCallback } from "react";
import { useAudioStore } from "@/stores/audio-store";
import { useDialogStore } from "@/stores/dialog-store";
import { useProfileStore } from "@/stores/profile-store";

export function useProfileSwitch() {
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const status = useAudioStore((s) => s.status);

  const handleProfileClick = useCallback(() => {
    if (currentTrack && (status === "playing" || status === "paused")) {
      useDialogStore.getState().setShowProfileSwitchWarning(true);
    } else {
      useProfileStore.getState().selectProfile(null);
    }
  }, [currentTrack, status]);

  const confirmProfileSwitch = useCallback(async () => {
    await useAudioStore.getState().stop();
    useDialogStore.getState().setShowProfileSwitchWarning(false);
    useProfileStore.getState().selectProfile(null);
  }, []);

  return { handleProfileClick, confirmProfileSwitch };
}
