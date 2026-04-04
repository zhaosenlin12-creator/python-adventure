import { create } from 'zustand';

interface GlobalUiState {
  battleRoyaleActive: boolean;
  petHomeActive: boolean;
  setBattleRoyaleActive: (active: boolean) => void;
  setPetHomeActive: (active: boolean) => void;
}

export const useGlobalUiStore = create<GlobalUiState>((set) => ({
  battleRoyaleActive: false,
  petHomeActive: false,
  setBattleRoyaleActive: (active) => set({ battleRoyaleActive: active }),
  setPetHomeActive: (active) => set({ petHomeActive: active }),
}));
