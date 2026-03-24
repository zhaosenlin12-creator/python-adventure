/**
 * 💰 金币系统状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getApiBaseUrl } from '@/lib/config/api';
import { toFriendlyMessage, showFriendlyErrorToast } from '@/lib/utils/friendlyError';

// 动态获取API基础URL，支持局域网访问
function getApiBase(): string {
  return getApiBaseUrl();
}
// 只在真正的本地开发环境输出调试日志
const isLocalDev = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
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
  // 金币余额
  balance: number;
  
  // 交易历史
  transactions: CoinTransaction[];
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadBalance: (token: string) => Promise<void>;
  loadHistory: (token: string, limit?: number) => Promise<void>;
  addCoins: (amount: number, type: string, source: string, description?: string) => void;
  deductCoins: (amount: number, type: string, source: string, description?: string) => void;
  
  // 辅助方法
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
        // 🔒 无token时直接返回，不发起请求
        if (!token) {
          debugLog('[CoinStore] ⚠️ No token provided, skipping balance load');
          return;
        }
        // 防止并发重复加载
        if (get().isLoading) {
          debugLog('[CoinStore] ⏳ Balance load already in progress, skipping');
          return;
        }
        
        try {
          set({ isLoading: true, error: null });
          debugLog('[CoinStore] 🔄 Loading balance from server...');
          
          const response = await fetch(`${getApiBase()}/coins/balance`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            
            // 🔒 401错误特殊处理 - 不抛出错误，只记录日志
            if (response.status === 401) {
              debugLog('[CoinStore] 🔒 Token expired or invalid, clearing state');
              set({
                balance: 0,
                isLoading: false,
                error: null
              });
              return;
            }
            
            console.error('[CoinStore] ❌ API Error:', response.status, errorText);
            // 🔒 不泄露原始 HTTP statusText，使用友好提示
            throw new Error('金币数据加载失败，请稍后再试');
          }
          
          const data = await response.json();
          const newBalance = data.coins || 0;
          
          debugLog('[CoinStore] ✅ Balance loaded from server:', newBalance);
          
          // 强制更新余额，清除所有缓存
          set({
            balance: newBalance,
            isLoading: false,
            error: null
          });
          return newBalance;
          
        } catch (error) {
          console.error('[CoinStore] ❌ Failed to load balance:', error);
          showFriendlyErrorToast(error, '金币加载失败，请稍后再试');
          set({
            error: toFriendlyMessage(error, '金币加载失败，请稍后再试'),
            isLoading: false
          });
          throw error;
        }
      },
      
      loadHistory: async (token: string, limit: number = 50) => {
        try {
          debugLog('[CoinStore] Loading history...');
          debugLog('[CoinStore] Token provided:', !!token);
          debugLog('[CoinStore] API URL:', `${getApiBase()}/coins/history?limit=${limit}`);
          
          const response = await fetch(`${getApiBase()}/coins/history?limit=${limit}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          debugLog('[CoinStore] Response status:', response.status);
          debugLog('[CoinStore] Response ok:', response.ok);
          
          if (!response.ok) {
            const errorText = await response.text();
            debugLog('[CoinStore] Error response:', errorText);
            // 🔒 不泄露原始后端错误文本
            throw new Error('金币记录加载失败，请稍后再试');
          }
          
          const text = await response.text();
          debugLog('[CoinStore] Raw response:', text);
          
          const data = JSON.parse(text);
          debugLog('[CoinStore] Parsed data:', data);
          
          set({
            transactions: data.transactions || []
          });
          
          debugLog('[CoinStore] History loaded:', data.transactions?.length || 0, 'transactions');
        } catch (error) {
          console.error('[CoinStore] Failed to load history:', error);
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
              created_at: new Date().toISOString()
            },
            ...state.transactions
          ]
        }));
        
        debugLog('[CoinStore] Coins added:', amount, 'New balance:', get().balance);
      },
      
      deductCoins: (amount: number, type: string, source: string, description?: string) => {
        const currentBalance = get().balance;
        if (currentBalance < amount) {
          console.error('[CoinStore] Insufficient balance:', currentBalance, 'Required:', amount);
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
              created_at: new Date().toISOString()
            },
            ...state.transactions
          ]
        }));
        
        debugLog('[CoinStore] Coins deducted:', amount, 'New balance:', get().balance);
      },
      
      canAfford: (amount: number) => {
        return get().balance >= amount;
      }
    }),
    {
      name: 'coin-storage',
      // 不持久化balance，每次都从服务器获取最新数据
      partialize: (state) => ({
        transactions: state.transactions.slice(0, 100) // 只保存最近100条交易记录
      })
    }
  )
);
