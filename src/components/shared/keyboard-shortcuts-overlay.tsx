import { useEffect, useState } from "react";
import { useKeybindsStore } from "@/stores/keybinds-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

interface ShortcutGroup {
  label: string;
  shortcuts: { keys: string; description: string }[];
}

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const setDialogOpen = useKeybindsStore((s) => s.setDialogOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.ctrlKey && e.key === "/")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

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
        { keys: "R", description: "Toggle repeat" },
        { keys: "S", description: "Toggle shuffle" },
      ],
    },
    {
      label: "System",
      shortcuts: [
        { keys: "?", description: "Show keyboard shortcuts" },
        { keys: "Ctrl+Shift+Q", description: "Quit app" },
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
                    onSelect={() => {}}
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
