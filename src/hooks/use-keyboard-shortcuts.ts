import { useEffect } from "react";
import { useKeybindsStore, type KeybindEntry } from "@/stores/keybinds-store";
import { useNavigationStore, type Page, PAGE_LABELS } from "@/stores/navigation-store";
import { useAudioStore } from "@/stores/audio-store";
import { useFocusRegionStore } from "@/stores/focus-region-store";
import { useSettingsStore } from "@/stores/settings-store";

const SCOPE = "app";

const PAGE_KEYS: Record<string, Page> = {
  "1": "home",
  "2": "songs",
  "3": "albums",
  "4": "playlists",
  "5": "artists",
  "6": "insights",
  "7": "settings",
  "8": "about",
};

export function useKeyboardShortcuts() {
  const register = useKeybindsStore((s) => s.register);
  const unregister = useKeybindsStore((s) => s.unregister);

  useEffect(() => {
    const setPage = useNavigationStore.getState().setPage;
    const audio = useAudioStore.getState;

    const entries: [string, KeybindEntry][] = [];

    // Page navigation: Ctrl+1-8
    for (const [key, page] of Object.entries(PAGE_KEYS)) {
      entries.push([
        `nav-${page}`,
        {
          combo: { key, ctrl: true },
          handler: () => setPage(page as Page),
          description: `Go to ${PAGE_LABELS[page as Page]}`,
          preventDefault: true,
        },
      ]);
    }

    // Playback: Space
    entries.push([
      "play-pause",
      {
        combo: { key: " " },
        handler: () => {
          const state = audio();
          if (state.status === "playing") {
            state.pause();
          } else if (state.status === "paused") {
            state.resume();
          }
        },
        description: "Play / Pause",
        preventDefault: true,
        skipWhenDialogOpen: true,
      },
    ]);

    // Playback: Next / Previous
    entries.push([
      "next",
      {
        combo: { key: "ArrowRight", ctrl: true },
        handler: () => audio().next(),
        description: "Next track",
        preventDefault: true,
      },
    ]);
    entries.push([
      "previous",
      {
        combo: { key: "ArrowLeft", ctrl: true },
        handler: () => audio().previous(),
        description: "Previous track",
        preventDefault: true,
      },
    ]);

    // Playback: Volume
    entries.push([
      "volume-up",
      {
        combo: { key: "ArrowUp", ctrl: true },
        handler: () => {
          const state = audio();
          state.setVolume(Math.min(1, state.volume + 0.05));
        },
        description: "Volume up",
        preventDefault: true,
      },
    ]);
    entries.push([
      "volume-down",
      {
        combo: { key: "ArrowDown", ctrl: true },
        handler: () => {
          const state = audio();
          state.setVolume(Math.max(0, state.volume - 0.05));
        },
        description: "Volume down",
        preventDefault: true,
      },
    ]);

    // Mute
    entries.push([
      "mute",
      {
        combo: { key: "m" },
        handler: () => audio().toggleMute(),
        description: "Mute / Unmute",
        preventDefault: true,
      },
    ]);

    // Repeat / Shuffle
    entries.push([
      "repeat",
      {
        combo: { key: "r" },
        handler: () => audio().toggleRepeat(),
        description: "Toggle repeat mode",
        preventDefault: true,
      },
    ]);
    entries.push([
      "shuffle",
      {
        combo: { key: "s" },
        handler: () => audio().toggleShuffle(),
        description: "Toggle shuffle",
        preventDefault: true,
      },
    ]);

    // Search
    entries.push([
      "search",
      {
        combo: { key: "k", ctrl: true },
        handler: () => {
          useNavigationStore.getState().setSearchOpen(true);
        },
        description: "Open global search",
        preventDefault: true,
        skipWhenDialogOpen: true,
      },
    ]);

    // Queue panel
    entries.push([
      "toggle-queue",
      {
        combo: { key: "q", ctrl: true },
        handler: () => audio().toggleQueue(),
        description: "Toggle queue panel",
        preventDefault: true,
      },
    ]);

    // System: Quit
    entries.push([
      "quit",
      {
        combo: { key: "q", ctrl: true, shift: true },
        handler: () => {
          import("@tauri-apps/api/core").then(({ invoke }) => invoke("quit_app"));
        },
        description: "Quit app",
        preventDefault: true,
      },
    ]);

    for (const [id, entry] of entries) {
      register(id, entry, SCOPE);
    }

    return () => {
      for (const [id] of entries) {
        unregister(id, SCOPE);
      }
    };
  }, [register, unregister]);

  // Focus region shortcuts — only registered when feature is enabled
  const focusRegionsOn = useSettingsStore((s) => s.experimentalFeatures.focusRegions);

  useEffect(() => {
    if (!focusRegionsOn) return;

    const focusEntries: [string, KeybindEntry][] = [
      [
        "focus-next",
        {
          combo: { key: "Tab" },
          handler: () => useFocusRegionStore.getState().cycleForward(),
          description: "Cycle to next focus region",
          preventDefault: true,
          skipWhenDialogOpen: true,
        },
      ],
      [
        "focus-prev",
        {
          combo: { key: "Tab", shift: true },
          handler: () => useFocusRegionStore.getState().cycleBackward(),
          description: "Cycle to previous focus region",
          preventDefault: true,
          skipWhenDialogOpen: true,
        },
      ],
      [
        "focus-content",
        {
          combo: { key: "l", ctrl: true },
          handler: () => {
            useFocusRegionStore.getState().focusRegion("main");
            setTimeout(() => {
              const firstItem = document.querySelector<HTMLElement>('[data-region="main"] [data-item-index="0"]');
              firstItem?.focus();
            }, 0);
          },
          description: "Focus main content area",
          preventDefault: true,
          skipWhenDialogOpen: true,
        },
      ],
    ];

    for (const [id, entry] of focusEntries) {
      register(id, entry, SCOPE);
    }

    return () => {
      for (const [id] of focusEntries) {
        unregister(id, SCOPE);
      }
    };
  }, [focusRegionsOn, register, unregister]);
}

// Global keydown listener
export function useGlobalKeydownListener() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      const bindings = useKeybindsStore.getState().bindings;
      const dialogOpen = useKeybindsStore.getState().dialogOpen;

      // Build combo string from event
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      parts.push(e.key.toLowerCase());
      const comboStr = parts.join("+");

      for (const [, entry] of bindings) {
        // Build entry combo string
        const entryParts: string[] = [];
        if (entry.combo.ctrl || entry.combo.meta) entryParts.push("Ctrl");
        if (entry.combo.shift) entryParts.push("Shift");
        if (entry.combo.alt) entryParts.push("Alt");
        entryParts.push(entry.combo.key.toLowerCase());
        const entryComboStr = entryParts.join("+");

        if (entryComboStr === comboStr) {
          if (entry.skipWhenDialogOpen && dialogOpen) continue;
          if (entry.preventDefault) e.preventDefault();
          entry.handler(e);
          return;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
