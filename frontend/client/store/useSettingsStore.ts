import { create } from 'zustand';

interface SettingsState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
}));
