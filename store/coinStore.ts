import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getCoinsBalance, getCoinsHistory } from '@/lib/api/coinAPI';
import { showFriendlyErrorToast, toFriendlyMessage } from '@/lib/utils/friendlyError';

const isLocalDev =
  typeof window !== 'undefined'
    ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    : process.env.NODE_ENV === 'development';

const debugLog = isLocalDev ? console.log.bind(console) : () => {};

export interface CoinTransaction {
  id: number;
  amount: number;
  type: string;
  source: string;
  description: string | null;
  created_at: string;
}

export interface CoinState {
  balance: number;
  transactions: CoinTransaction[];
  isLoading: boolean;
  error: string | null;

  loadBalance: (token: string) => Promise<void>;
  loadHistory: (token: string, limit?: number) => Promise<void>;
  addCoins: (amount: number, type: string, source: string, description?: string) => void;
  deductCoins: (amount: number, type: string, source: string, description?: string) => void;
  canAfford: (amount: number) => boolean;
}

export const useCoinStore = create<CoinState>()(
  persist(
    (set, get) => ({
      balance: 0,
      transactions: [],
      isLoading: false,
      error: null,

      loadBalance: async (token: string) => {
        if (!token) return;
        if (get().isLoading) {
          debugLog('[CoinStore] balance load already in progress');
          return;
        }

        try {
          set({ isLoading: true, error: null });
          const newBalance = await getCoinsBalance(token);
          set({
            balance: newBalance,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes('unauthorized')) {
            set({
              balance: 0,
              isLoading: false,
              error: null,
            });
            return;
          }

          console.error('[CoinStore] failed to load balance:', error);
          showFriendlyErrorToast(error, '金币加载失败，请稍后再试');
          set({
            error: toFriendlyMessage(error, '金币加载失败，请稍后再试'),
            isLoading: false,
          });
          throw error;
        }
      },

      loadHistory: async (token: string, limit: number = 50) => {
        if (!token) return;
        try {
          const transactions = await getCoinsHistory(token, limit);
          set({ transactions, error: null });
        } catch (error) {
          console.error('[CoinStore] failed to load history:', error);
          showFriendlyErrorToast(error, '金币记录加载失败');
          set({ error: toFriendlyMessage(error, '金币记录加载失败') });
        }
      },

      addCoins: (amount: number, type: string, source: string, description?: string) => {
        set((state) => ({
          balance: state.balance + amount,
          transactions: [
            {
              id: Date.now(),
              amount,
              type,
              source,
              description: description || null,
              created_at: new Date().toISOString(),
            },
            ...state.transactions,
          ],
        }));
      },

      deductCoins: (amount: number, type: string, source: string, description?: string) => {
        const currentBalance = get().balance;
        if (currentBalance < amount) {
          console.error('[CoinStore] insufficient balance:', currentBalance, 'required:', amount);
          return;
        }

        set((state) => ({
          balance: state.balance - amount,
          transactions: [
            {
              id: Date.now(),
              amount: -amount,
              type,
              source,
              description: description || null,
              created_at: new Date().toISOString(),
            },
            ...state.transactions,
          ],
        }));
      },

      canAfford: (amount: number) => get().balance >= amount,
    }),
    {
      name: 'coin-storage',
      partialize: (state) => ({
        transactions: state.transactions.slice(0, 100),
      }),
    }
  )
);
