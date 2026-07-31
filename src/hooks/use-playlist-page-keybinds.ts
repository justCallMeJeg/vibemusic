import { useEffect } from "react";
import { useKeybindsStore } from "@/stores/keybinds-store";
import { useSelectionEscapeKeybind } from "@/hooks/use-selection-escape-keybind";
import { registerSelectAllAndCleanup } from "@/lib/keybinds";

const SCOPE = "page:playlist-detail";

export function usePlaylistPageKeybinds(goBack: () => void) {
  useEffect(() => {
    const { register, clearScope } = useKeybindsStore.getState();
    register("escape", {
      combo: { key: "Escape" },
      handler: () => goBack(),
      description: "Return to playlists",
      preventDefault: true,
    }, SCOPE);
    register("backspace", {
      combo: { key: "Backspace" },
      handler: () => goBack(),
      description: "Return to playlists",
      preventDefault: true,
    }, SCOPE);
    registerSelectAllAndCleanup(register, clearScope, SCOPE);
    return () => clearScope(SCOPE);
  }, [goBack]);
  useSelectionEscapeKeybind(goBack, SCOPE);
}
