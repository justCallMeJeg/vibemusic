import { useState, useCallback, useEffect, useRef } from "react";
import { RotateCcw, Keyboard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useKeybindDialogStore } from "@/stores/keybind-dialog-store";
import { useSettingsStore } from "@/stores/settings-store";
import { comboToString, type KeyCombo } from "@/stores/keybinds-store";
import { cn } from "@/lib/utils";

interface ShortcutDef {
  id: string;
  keys: string;
  description: string;
}

interface ShortcutGroup {
  label: string;
  shortcuts: ShortcutDef[];
}

const KEYBIND_GROUPS: ShortcutGroup[] = [
  {
    label: "Navigation",
    shortcuts: [
      { id: "nav-1-8", keys: "Ctrl+1–8", description: "Go to page" },
      { id: "nav-search", keys: "Ctrl+K", description: "Open global search" },
      { id: "nav-queue", keys: "Ctrl+Q", description: "Toggle queue panel" },
      { id: "nav-keybinds", keys: "Ctrl+Shift+K", description: "Open keyboard shortcuts settings" },
    ],
  },
  {
    label: "Playback",
    shortcuts: [
      { id: "play-pause", keys: "Space", description: "Play / Pause" },
      { id: "next-track", keys: "Ctrl+→", description: "Next track" },
      { id: "prev-track", keys: "Ctrl+←", description: "Previous track" },
      { id: "vol-up", keys: "Ctrl+↑", description: "Volume up" },
      { id: "vol-down", keys: "Ctrl+↓", description: "Volume down" },
      { id: "like-track", keys: "L", description: "Like / Unlike track" },
      { id: "mute", keys: "M", description: "Mute / Unmute" },
      { id: "repeat", keys: "R", description: "Toggle repeat mode" },
      { id: "shuffle", keys: "S", description: "Toggle shuffle" },
    ],
  },
  {
    label: "Context Menu",
    shortcuts: [
      { id: "ctx-menu", keys: "Shift+F10", description: "Open context menu for focused item" },
      { id: "ctx-key", keys: "ContextMenu", description: "Open context menu for focused item" },
    ],
  },
  {
    label: "Focus Regions",
    shortcuts: [
      { id: "focus-next", keys: "Tab", description: "Cycle to next focus region" },
      { id: "focus-prev", keys: "Shift+Tab", description: "Cycle to previous focus region" },
      { id: "focus-content", keys: "Ctrl+L", description: "Focus main content area" },
    ],
  },
  {
    label: "System",
    shortcuts: [
      { id: "sys-overlay", keys: "?", description: "Show keyboard shortcuts overlay" },
      { id: "sys-quit", keys: "Ctrl+Shift+Q", description: "Quit app" },
    ],
  },
  {
    label: "Songs Page",
    shortcuts: [
      { id: "songs-escape", keys: "Escape", description: "Clear selection or search" },
      { id: "songs-search", keys: "Ctrl+F", description: "Focus search input" },
      { id: "songs-select-all", keys: "Ctrl+A", description: "Select all tracks" },
    ],
  },
  {
    label: "Albums Page",
    shortcuts: [
      { id: "albums-escape", keys: "Escape", description: "Clear selection or search" },
      { id: "albums-search", keys: "Ctrl+F", description: "Focus search input" },
      { id: "albums-select-all", keys: "Ctrl+A", description: "Select all albums" },
    ],
  },
  {
    label: "Artists Page",
    shortcuts: [
      { id: "artists-escape", keys: "Escape", description: "Clear selection or search" },
      { id: "artists-search", keys: "Ctrl+F", description: "Focus search input" },
      { id: "artists-select-all", keys: "Ctrl+A", description: "Select all artists" },
    ],
  },
  {
    label: "Playlists Page",
    shortcuts: [
      { id: "playlists-escape", keys: "Escape", description: "Clear selection or search" },
      { id: "playlists-search", keys: "Ctrl+F", description: "Focus search input" },
      { id: "playlists-select-all", keys: "Ctrl+A", description: "Select all playlists" },
      { id: "playlists-delete", keys: "Delete", description: "Delete selected playlists" },
    ],
  },
  {
    label: "Settings Page",
    shortcuts: [
      { id: "settings-nav", keys: "↑/↓ or ←/→", description: "Navigate between sections" },
      { id: "settings-enter", keys: "Enter", description: "Open selected section" },
      { id: "settings-home", keys: "Home / End", description: "Jump to first / last section" },
      { id: "settings-escape", keys: "Escape", description: "Return to previous page" },
    ],
  },
  {
    label: "Insights Page",
    shortcuts: [
      { id: "insights-updown", keys: "↑/↓", description: "Navigate within column" },
      { id: "insights-leftright", keys: "←/→", description: "Move between columns" },
      { id: "insights-enter", keys: "Enter", description: "Play track / Open artist or album" },
      { id: "insights-shift-enter", keys: "Shift+Enter", description: "Play artist top tracks / Play album" },
      { id: "insights-escape", keys: "Escape", description: "Return to previous page" },
    ],
  },
];

const getGroupIds = (group: ShortcutGroup) => group.shortcuts.map((s) => s.id);

export function KeyboardShortcutsDialog() {
  const open = useKeybindDialogStore((s) => s.open);
  const setOpen = useKeybindDialogStore((s) => s.setOpen);
  const keybindOverrides = useSettingsStore((s) => s.keybindOverrides);

  const [rebindingId, setRebindingId] = useState<string | null>(null);
  const [customKeys, setCustomKeys] = useState<Record<string, string>>({});

  const allShortcuts = KEYBIND_GROUPS.flatMap((group) =>
    group.shortcuts.map((s) => ({ ...s, groupLabel: group.label })),
  );

  const [focusedIndex, setFocusedIndex] = useState(0);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (rebindingId) return;
    const shortcut = allShortcuts[focusedIndex];
    if (shortcut) {
      rowRefs.current[shortcut.id]?.focus();
    }
  }, [focusedIndex, rebindingId, allShortcuts]);

  useEffect(() => {
    if (!open) return;
    const converted: Record<string, string> = {};
    for (const [id, combo] of Object.entries(keybindOverrides)) {
      converted[id] = comboToString(combo);
    }
    setCustomKeys(converted);
  }, [open, keybindOverrides]);

  const hasCustom = (groupId: string) =>
    getGroupIds(KEYBIND_GROUPS.find((g) => g.label === groupId)!).some((id) => id in customKeys);

  const handleResetGroup = useCallback((groupId: string) => {
    const ids = getGroupIds(KEYBIND_GROUPS.find((g) => g.label === groupId)!);
    setCustomKeys((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    useSettingsStore.getState().resetKeybindOverrides(ids);
  }, []);

  const handleStartRebind = (id: string) => {
    const idx = allShortcuts.findIndex((s) => s.id === id);
    if (idx !== -1) setFocusedIndex(idx);
    setRebindingId(id);
  };

  const captureCombo = (e: React.KeyboardEvent) => {
    if (!rebindingId) return;
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    const key = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
      parts.push(key);
      const displayStr = parts.join("+");
      setCustomKeys((prev) => ({ ...prev, [rebindingId]: displayStr }));

      const combo: KeyCombo = {
        key: e.key,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      };
      useSettingsStore.getState().setKeybindOverride(rebindingId, combo);

      setRebindingId(null);
    }
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (rebindingId) {
      if (e.key === "Escape") {
        e.preventDefault();
        setRebindingId(null);
        return;
      }
      captureCombo(e);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % allShortcuts.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + allShortcuts.length) % allShortcuts.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const shortcut = allShortcuts[focusedIndex];
      if (shortcut) {
        handleStartRebind(shortcut.id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Click a shortcut to rebind it, or use arrow keys to navigate. Enter to start rebinding, Escape to cancel or close. Reset a category to restore defaults.
        </p>
        <div
          className="flex-1 overflow-y-auto -mx-6 px-6 py-2 space-y-4"
          onKeyDown={handleContainerKeyDown}
        >
          {KEYBIND_GROUPS.map((group) => {
            const hasCustomInGroup = hasCustom(group.label);
            return (
              <div key={group.label}>
                <div className="flex items-center justify-between px-1 pt-1 pb-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </h3>
                  {hasCustomInGroup && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleResetGroup(group.label)}
                    >
                      <RotateCcw className="size-3" />
                      Reset
                    </Button>
                  )}
                </div>
                <div className="grid gap-px">
                  {group.shortcuts.map((shortcut) => {
                    const globalIndex = allShortcuts.findIndex((s) => s.id === shortcut.id);
                    const isFocused = globalIndex === focusedIndex;
                    const isRebinding = rebindingId === shortcut.id;
                    const displayKeys = customKeys[shortcut.id] ?? shortcut.keys;
                    return (
                      <div
                        key={shortcut.id}
                        ref={(el) => { rowRefs.current[shortcut.id] = el; }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg transition-colors outline-none",
                          isRebinding
                            ? "bg-primary/10 ring-1 ring-primary cursor-default"
                            : isFocused && !rebindingId
                              ? "bg-secondary/50 ring-1 ring-ring cursor-pointer"
                              : "hover:bg-secondary/50 cursor-pointer",
                        )}
                        onClick={() => !isRebinding && handleStartRebind(shortcut.id)}
                        tabIndex={isFocused ? 0 : -1}
                        role="button"
                        aria-label={`${shortcut.description}: ${displayKeys}. Click to rebind.`}
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <kbd
                          className={cn(
                            "ml-auto text-xs tracking-widest px-2 py-0.5 rounded font-mono transition-colors",
                            isRebinding
                              ? "bg-primary/20 text-primary border border-primary/40"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {isRebinding ? "Press shortcut…" : displayKeys}
                        </kbd>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
