import { useEffect } from "react";
import { useInteractionStore } from "@/stores/interaction-store";

export function useFocusTracking() {
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  useEffect(() => {
    const onMouseDown = () => useInteractionStore.getState().setFocusSource("mouse");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      const navKeys = ["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " ", "Home", "End"];
      if (navKeys.includes(e.key)) {
        useInteractionStore.getState().setFocusSource("keyboard");
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}
