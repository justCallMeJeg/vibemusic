import { create } from "zustand";

export type KeyCombo = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface KeybindEntry {
  combo: KeyCombo;
  handler: ShortcutHandler;
  description: string;
  /** When true, prevents default behavior for this key combo */
  preventDefault?: boolean;
  /** Only fire when no dialog/modal is open */
  skipWhenDialogOpen?: boolean;
}

interface KeybindsState {
  bindings: Map<string, KeybindEntry>;
  dialogOpen: boolean;
}

interface KeybindsActions {
  register: (id: string, entry: KeybindEntry, scope?: string) => void;
  unregister: (id: string, scope?: string) => void;
  getHandler: (combo: KeyCombo, scope?: string) => ShortcutHandler | undefined;
  setDialogOpen: (open: boolean) => void;
  clearScope: (scope: string) => void;
}

type KeybindsStore = KeybindsState & KeybindsActions;

function comboToString(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.ctrl || combo.meta) parts.push("Ctrl");
  if (combo.shift) parts.push("Shift");
  if (combo.alt) parts.push("Alt");
  parts.push(combo.key.toLowerCase());
  return parts.join("+");
}

function eventToCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  parts.push(e.key.toLowerCase());
  return parts.join("+");
}

export const useKeybindsStore = create<KeybindsStore>((set, get) => ({
  bindings: new Map(),
  dialogOpen: false,

  register: (id: string, entry: KeybindEntry, scope?: string) => {
    const key = scope ? `${scope}:${id}` : id;
    set((state) => {
      const next = new Map(state.bindings);
      next.set(key, entry);
      return { bindings: next };
    });
  },

  unregister: (id: string, scope?: string) => {
    const key = scope ? `${scope}:${id}` : id;
    set((state) => {
      const next = new Map(state.bindings);
      next.delete(key);
      return { bindings: next };
    });
  },

  getHandler: (combo: KeyCombo) => {
    const comboStr = comboToString(combo);
    const state = get();
    for (const [, entry] of state.bindings) {
      if (comboToString(entry.combo) === comboStr) {
        return entry.handler;
      }
    }
    return undefined;
  },

  setDialogOpen: (open: boolean) => {
    set({ dialogOpen: open });
  },

  clearScope: (scope: string) => {
    set((state) => {
      const next = new Map(state.bindings);
      for (const key of next.keys()) {
        if (key.startsWith(`${scope}:`)) {
          next.delete(key);
        }
      }
      return { bindings: next };
    });
  },
}));

export { comboToString, eventToCombo };
