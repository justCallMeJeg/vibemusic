import { useEffect, useRef, useState } from "react";
import { useKeybindsStore } from "@/stores/keybinds-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

interface ShortcutGroup {
  label: string;
  shortcuts: { keys: string; description: string }[];
}

const noop = () => {};

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;
  const setDialogOpen = useKeybindsStore((s) => s.setDialogOpen);
  const keyboardNavOn = useSettingsStore(
    (s) => s.experimentalFeatures.keyboardNav,
  );

  useEffect(() => {
    if (!keyboardNavOn) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.ctrlKey && e.key === "/")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && openRef.current) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [keyboardNavOn]);

  useEffect(() => {
    setDialogOpen(open);
  }, [open, setDialogOpen]);

  const groups: ShortcutGroup[] = [
    {
      label: "Navigation",
      shortcuts: [
        { keys: "Ctrl+1-8", description: "Go to page" },
        { keys: "Ctrl+K", description: "Open search" },
        { keys: "Ctrl+Q", description: "Toggle queue panel" },
      ],
    },
    {
      label: "Focus Regions",
      shortcuts: [
        { keys: "Tab", description: "Cycle to next focus region" },
        { keys: "Shift+Tab", description: "Cycle to previous focus region" },
        { keys: "Ctrl+L", description: "Focus main content area" },
      ],
    },
    {
      label: "Playback",
      shortcuts: [
        { keys: "Space", description: "Play / Pause" },
        { keys: "Ctrl+→", description: "Next track" },
        { keys: "Ctrl+←", description: "Previous track" },
        { keys: "Ctrl+↑", description: "Volume up" },
        { keys: "Ctrl+↓", description: "Volume down" },
        { keys: "M", description: "Mute / Unmute" },
        { keys: "L", description: "Like / Unlike track" },
        { keys: "R", description: "Toggle repeat" },
        { keys: "S", description: "Toggle shuffle" },
      ],
    },
    {
      label: "Context Menu",
      shortcuts: [
        { keys: "Shift+F10", description: "Open context menu for focused item" },
        { keys: "ContextMenu", description: "Open context menu for focused item" },
      ],
    },
    {
      label: "System",
      shortcuts: [
        { keys: "?", description: "Show keyboard shortcuts" },
        { keys: "Ctrl+Shift+K", description: "Open keyboard shortcuts settings" },
        { keys: "Ctrl+Shift+Q", description: "Quit app" },
      ],
    },
    {
      label: "Songs Page",
      shortcuts: [
        { keys: "Escape", description: "Clear selection or search" },
        { keys: "Ctrl+F", description: "Focus search input" },
        { keys: "Ctrl+A", description: "Select all tracks" },
      ],
    },
    {
      label: "Albums Page",
      shortcuts: [
        { keys: "Escape", description: "Clear selection or search" },
        { keys: "Ctrl+F", description: "Focus search input" },
        { keys: "Ctrl+A", description: "Select all albums" },
      ],
    },
    {
      label: "Artists Page",
      shortcuts: [
        { keys: "Escape", description: "Clear selection or search" },
        { keys: "Ctrl+F", description: "Focus search input" },
        { keys: "Ctrl+A", description: "Select all artists" },
      ],
    },
    {
      label: "Playlists Page",
      shortcuts: [
        { keys: "Escape", description: "Clear selection or search" },
        { keys: "Ctrl+F", description: "Focus search input" },
        { keys: "Ctrl+A", description: "Select all playlists" },
        { keys: "Delete", description: "Delete selected playlists" },
      ],
    },
    {
      label: "Settings Page",
      shortcuts: [
        { keys: "↑/↓ or ←/→", description: "Navigate between sections" },
        { keys: "Enter", description: "Open selected section" },
        { keys: "Home / End", description: "Jump to first / last section" },
        { keys: "Escape", description: "Return to previous page" },
      ],
    },
    {
      label: "Insights Page",
      shortcuts: [
        { keys: "↑/↓", description: "Navigate within column" },
        { keys: "←/→", description: "Move between columns" },
        { keys: "Enter", description: "Play track / Open artist or album" },
        { keys: "Shift+Enter", description: "Play artist top tracks / Play album" },
        { keys: "Escape", description: "Return to previous page" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandList>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.shortcuts.map((shortcut) => (
                  <CommandItem
                    key={shortcut.keys}
                    className="flex items-center justify-between"
                    onSelect={noop}
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="ml-auto text-xs tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {shortcut.keys}
                    </kbd>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
