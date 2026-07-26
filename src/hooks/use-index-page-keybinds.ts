import { useEffect, type RefObject } from "react";
import { useKeybindsStore, type KeybindEntry } from "@/stores/keybinds-store";
import { useSelectionStore } from "@/stores/selection-store";

export function useIndexPageKeybinds(
  searchQuery: string,
  setSearchQuery: (q: string) => void,
  searchInputRef: RefObject<HTMLInputElement | null>,
  scope: string,
  extraEntries?: [string, KeybindEntry][],
) {
  useEffect(() => {
    const { register, clearScope } = useKeybindsStore.getState();

    register("escape", {
      combo: { key: "Escape" },
      handler: () => {
        const sel = useSelectionStore.getState();
        if (sel.mode === "checkbox" || sel.selectionCount() > 0) {
          sel.clearSelection();
          sel.disableCheckboxMode();
        } else if (searchQuery) {
          setSearchQuery("");
        }
      },
      description: "Clear selection or search",
      preventDefault: true,
    }, scope);

    register("ctrl+f", {
      combo: { key: "f", ctrl: true },
      handler: () => searchInputRef.current?.focus(),
      description: "Focus search",
      preventDefault: true,
    }, scope);

    register("ctrl+a", {
      combo: { key: "a", ctrl: true },
      handler: () => {
        useSelectionStore.getState().enableCheckboxMode();
        useSelectionStore.getState().selectAll();
      },
      description: "Select all",
      preventDefault: true,
    }, scope);

    if (extraEntries) {
      for (const [id, entry] of extraEntries) {
        register(id, entry, scope);
      }
    }

    return () => clearScope(scope);
  }, [searchQuery, setSearchQuery, searchInputRef, scope, extraEntries]);
}
