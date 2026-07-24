import { create } from "zustand";

type SelectionMode = "off" | "checkbox";

interface SelectionItem {
  id: number;
  index: number;
}

interface SelectionState {
  mode: SelectionMode;
  selectedIds: number[];
  lastClickedIndex: number | null;
  items: SelectionItem[];
}

interface SelectionActions {
  toggleMode: () => void;
  enableCheckboxMode: () => void;
  disableCheckboxMode: () => void;

  select: (id: number) => void;
  deselect: (id: number) => void;
  toggle: (id: number, index: number, opts?: { shift?: boolean; ctrl?: boolean }) => void;
  selectAll: () => void;
  selectNone: () => void;
  invertSelection: () => void;
  selectRange: (fromIndex: number, toIndex: number) => void;
  clearSelection: () => void;
  setItems: (items: { id: number; index: number }[]) => void;

  isSelected: (id: number) => boolean;
  selectionCount: () => number;
  isAllSelected: () => boolean;
  isIndeterminate: () => boolean;
  getSelectedIds: () => number[];
}

type SelectionStore = SelectionState & SelectionActions;

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  mode: "off",
  selectedIds: [],
  lastClickedIndex: null,
  items: [],

  toggleMode: () => {
    set((s) => ({
      mode: s.mode === "off" ? "checkbox" : "off",
      selectedIds: s.mode === "off" ? s.selectedIds : [],
      lastClickedIndex: s.mode === "off" ? s.lastClickedIndex : null,
    }));
  },

  enableCheckboxMode: () => {
    set({ mode: "checkbox" });
  },

  disableCheckboxMode: () => {
    set({ mode: "off", selectedIds: [], lastClickedIndex: null });
  },

  select: (id: number) => {
    set((s) => {
      if (s.selectedIds.includes(id)) return s;
      return { selectedIds: [...s.selectedIds, id] };
    });
  },

  deselect: (id: number) => {
    set((s) => ({
      selectedIds: s.selectedIds.filter((i) => i !== id),
    }));
  },

  toggle: (id: number, index: number, opts?: { shift?: boolean; ctrl?: boolean }) => {
    const state = get();
    const selectedSet = new Set(state.selectedIds);

    if (opts?.shift && state.lastClickedIndex !== null) {
      state.selectRange(state.lastClickedIndex, index);
      return;
    }

    if (opts?.ctrl) {
      if (selectedSet.has(id)) {
        state.deselect(id);
      } else {
        state.select(id);
      }
      set({ lastClickedIndex: index });
      return;
    }

    if (state.mode === "checkbox") {
      if (selectedSet.has(id)) {
        state.deselect(id);
      } else {
        state.select(id);
      }
      set({ lastClickedIndex: index });
      return;
    }

    set({
      selectedIds: [id],
      lastClickedIndex: index,
    });
  },

  selectAll: () => {
    const state = get();
    if (state.items.length === 0) return;

    const selectedSet = new Set(state.selectedIds);
    const allSelected = state.items.every((item) => selectedSet.has(item.id));
    if (allSelected) {
      set({ selectedIds: [], lastClickedIndex: null });
    } else {
      set({ selectedIds: state.items.map((item) => item.id), lastClickedIndex: null });
    }
  },

  selectNone: () => {
    set({ selectedIds: [], lastClickedIndex: null });
  },

  invertSelection: () => {
    const state = get();
    const selectedSet = new Set(state.selectedIds);
    const inverted = state.items.filter((item) => !selectedSet.has(item.id)).map((item) => item.id);
    set({ selectedIds: inverted, lastClickedIndex: null });
  },

  selectRange: (fromIndex: number, toIndex: number) => {
    const state = get();
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const rangeIds = state.items
      .filter((item) => item.index >= start && item.index <= end)
      .map((item) => item.id);
    set({ selectedIds: [...new Set([...state.selectedIds, ...rangeIds])] });
    set({ lastClickedIndex: toIndex });
  },

  clearSelection: () => {
    set({ mode: "off", selectedIds: [], lastClickedIndex: null });
  },

  setItems: (items: { id: number; index: number }[]) => {
    set((s) => {
      const newIds = new Set(items.map((i) => i.id));
      const filtered = s.selectedIds.filter((id) => newIds.has(id));
      return { items: items.map((i, idx) => ({ id: i.id, index: idx })), selectedIds: filtered };
    });
  },

  isSelected: (id: number) => {
    const selectedSet = new Set(get().selectedIds);
    return selectedSet.has(id);
  },

  selectionCount: () => {
    return get().selectedIds.length;
  },

  isAllSelected: () => {
    const state = get();
    if (state.items.length === 0) return false;
    const selectedSet = new Set(state.selectedIds);
    return state.items.every((item) => selectedSet.has(item.id));
  },

  isIndeterminate: () => {
    const state = get();
    if (state.items.length === 0) return false;
    const count = state.selectedIds.length;
    return count > 0 && count < state.items.length;
  },

  getSelectedIds: () => {
    return [...get().selectedIds];
  },
}));
