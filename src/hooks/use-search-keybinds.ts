import { useEffect, type RefObject } from "react";
import { useKeybindsStore } from "@/stores/keybinds-store";

export function useSearchKeybinds(
  searchQuery: string,
  setSearchQuery: (q: string) => void,
  searchInputRef: RefObject<HTMLInputElement | null>,
  scope: string,
) {
  useEffect(() => {
    const { register, clearScope } = useKeybindsStore.getState();
    register("escape", {
      combo: { key: "Escape" },
      handler: () => { if (searchQuery) setSearchQuery(""); },
      description: "Clear search",
    }, scope);
    register("ctrl+f", {
      combo: { key: "f", ctrl: true },
      handler: () => searchInputRef.current?.focus(),
      description: "Focus search",
      preventDefault: true,
    }, scope);
    return () => clearScope(scope);
  }, [searchQuery, setSearchQuery, searchInputRef, scope]);
}