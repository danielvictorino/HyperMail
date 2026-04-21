import { create } from "zustand";

interface CommandPaletteState {
  open: boolean;
  query: string;
  activeIndex: number;
  openPalette: (initialQuery?: string) => void;
  closePalette: () => void;
  setQuery: (query: string) => void;
  setActiveIndex: (index: number) => void;
  moveActiveIndex: (delta: number, total: number) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  query: "",
  activeIndex: 0,
  openPalette: (initialQuery = "") =>
    set({
      open: true,
      query: initialQuery,
      activeIndex: 0
    }),
  closePalette: () =>
    set({
      open: false,
      query: "",
      activeIndex: 0
    }),
  setQuery: (query) =>
    set({
      query,
      activeIndex: 0
    }),
  setActiveIndex: (activeIndex) => set({ activeIndex }),
  moveActiveIndex: (delta, total) =>
    set((state) => {
      if (total <= 0) {
        return {
          activeIndex: 0
        };
      }

      const nextIndex = (state.activeIndex + delta + total) % total;
      return {
        activeIndex: nextIndex
      };
    })
}));
