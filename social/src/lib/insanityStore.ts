import { create } from 'zustand';

interface InsanityState {
  isInsaneMode: boolean;
  toggleInsanity: () => void;
  setInsanity: (val: boolean) => void;
}

export const useInsanityStore = create<InsanityState>((set) => ({
  isInsaneMode: false,
  toggleInsanity: () => set((state) => ({ isInsaneMode: !state.isInsaneMode })),
  setInsanity: (val) => set({ isInsaneMode: val }),
}));
