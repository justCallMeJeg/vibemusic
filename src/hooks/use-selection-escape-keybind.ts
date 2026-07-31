import { useEffect } from "react";
import { useKeybindsStore } from "@/stores/keybinds-store";
import { useSelectionStore } from "@/stores/selection-store";

export function useSelectionEscapeKeybind(
  goBack: () => void,
  scope: string,
  extraHandler?: () => void,
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
        } else {
          extraHandler?.();
          goBack();
        }
      },
      description: "Clear selection or return",
      preventDefault: true,
    }, scope);
    return () => clearScope(scope);
  }, [goBack, scope, extraHandler]);
}