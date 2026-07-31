import { create } from "zustand";

interface DialogState {
  isQuitDialogOpen: boolean;
  isCloseToTrayDialogOpen: boolean;
  showProfileSwitchWarning: boolean;
  isRefreshWarningOpen: boolean;
}

interface DialogActions {
  openQuitDialog: () => void;
  closeQuitDialog: () => void;
  openCloseToTrayDialog: () => void;
  closeCloseToTrayDialog: () => void;
  setShowProfileSwitchWarning: (open: boolean) => void;
  setIsRefreshWarningOpen: (open: boolean) => void;
}

type DialogStore = DialogState & DialogActions;

export const useDialogStore = create<DialogStore>((set) => ({
  isQuitDialogOpen: false,
  isCloseToTrayDialogOpen: false,
  showProfileSwitchWarning: false,
  isRefreshWarningOpen: false,

  openQuitDialog: () => set({ isQuitDialogOpen: true }),
  closeQuitDialog: () => set({ isQuitDialogOpen: false }),
  openCloseToTrayDialog: () => set({ isCloseToTrayDialogOpen: true }),
  closeCloseToTrayDialog: () => set({ isCloseToTrayDialogOpen: false }),
  setShowProfileSwitchWarning: (open) => set({ showProfileSwitchWarning: open }),
  setIsRefreshWarningOpen: (open) => set({ isRefreshWarningOpen: open }),
}));
