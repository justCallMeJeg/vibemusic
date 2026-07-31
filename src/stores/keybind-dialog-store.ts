import { create } from "zustand";

interface KeybindDialogStore {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useKeybindDialogStore = create<KeybindDialogStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
