import { useSelectionStore } from "@/stores/selection-store";
import type { KeybindEntry } from "@/stores/keybinds-store";

export function registerSelectAllAndCleanup(
  register: (id: string, entry: KeybindEntry, scope: string) => void,
  clearScope: (scope: string) => void,
  scope: string,
) {
  register("ctrl+a", {
    combo: { key: "a", ctrl: true },
    handler: () => {
      useSelectionStore.getState().enableCheckboxMode();
      useSelectionStore.getState().selectAll();
    },
    description: "Select all tracks",
    preventDefault: true,
  }, scope);
  return () => clearScope(scope);
}