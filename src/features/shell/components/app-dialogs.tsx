import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { ManualUpdateDialog } from "@/components/dialogs/manual-update-dialog";
import { Toaster } from "@/components/ui/sonner";
import { useUpdateStore } from "@/stores/update-store";
import { useDialogStore } from "@/stores/dialog-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AppDialogsProps {
  onConfirmQuit: () => void;
  onConfirmCloseToTrayHide: () => void;
  confirmProfileSwitch: () => void;
  handleConfirmRefresh: () => void;
}

export function AppDialogs({
  onConfirmQuit,
  onConfirmCloseToTrayHide,
  confirmProfileSwitch,
  handleConfirmRefresh,
}: AppDialogsProps) {
  const isManualUpdateDialogOpen = useUpdateStore((s) => s.isManualUpdateDialogOpen);
  const setManualUpdateDialogOpen = useUpdateStore((s) => s.setManualUpdateDialogOpen);
  const isQuitDialogOpen = useDialogStore((s) => s.isQuitDialogOpen);
  const closeQuitDialog = useDialogStore((s) => s.closeQuitDialog);
  const isCloseToTrayDialogOpen = useDialogStore((s) => s.isCloseToTrayDialogOpen);
  const closeCloseToTrayDialog = useDialogStore((s) => s.closeCloseToTrayDialog);
  const showProfileSwitchWarning = useDialogStore((s) => s.showProfileSwitchWarning);
  const setShowProfileSwitchWarning = useDialogStore((s) => s.setShowProfileSwitchWarning);
  const isRefreshWarningOpen = useDialogStore((s) => s.isRefreshWarningOpen);
  const setIsRefreshWarningOpen = useDialogStore((s) => s.setIsRefreshWarningOpen);

  return (
    <>
      <ManualUpdateDialog
        open={isManualUpdateDialogOpen}
        onOpenChange={setManualUpdateDialogOpen}
      />
      <ConfirmDialog
        open={isQuitDialogOpen}
        onOpenChange={closeQuitDialog}
        title="Are you sure you want to quit?"
        description='Playback will stop. You can enable "Close to Tray" in settings to keep music playing in the background.'
        confirmText="Quit"
        variant="destructive"
        onConfirm={onConfirmQuit}
      />
      <ConfirmDialog
        open={isCloseToTrayDialogOpen}
        onOpenChange={closeCloseToTrayDialog}
        title="Keep Playing in Background?"
        description="Music is currently playing. Minimize to tray to keep playback active in the background, or stop playback and quit the app."
        confirmText="Minimize to Tray"
        cancelText="Stop & Quit"
        variant="primary"
        onConfirm={onConfirmCloseToTrayHide}
        onCancel={onConfirmQuit}
      />
      <ConfirmDialog
        open={showProfileSwitchWarning}
        onOpenChange={setShowProfileSwitchWarning}
        title="Stop Playback?"
        description="Switching profiles will stop the current playback. Do you want to continue?"
        confirmText="Switch Profile"
        onConfirm={confirmProfileSwitch}
      />
      <AlertDialog
        open={isRefreshWarningOpen}
        onOpenChange={setIsRefreshWarningOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Playback and Refresh?</AlertDialogTitle>
            <AlertDialogDescription>
              Refreshing the app will stop the current playback. Are you sure
              you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRefresh}>
              Refresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </>
  );
}
