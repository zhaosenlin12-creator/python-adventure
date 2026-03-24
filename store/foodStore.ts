/**
 * 🍖 食物背包状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FoodInventoryItem, FoodType, FoodReward } from '@/types/food';
import { getApiBaseUrl } from '@/lib/config/api';

// 动态获取API基础URL，支持局域网访问
function getApiBase(): string {
  return getApiBaseUrl();
}
// 只在真正的本地开发环境输出调试日志
const isLocalDev = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  : process.env.NODE_ENV === 'development';
const debugLog = isLocalDev ? console.log.bind(console) : () => {};

// 缓存有效期（5分钟）
const CACHE_TTL = 5 * 60 * 1000;

export interface FoodState {
  // 食物背包
  inventory: FoodInventoryItem[];
  
  // 所有食物类型
  foodTypes: FoodType[];
  
  // 缓存时间戳
  lastFetchTime: number | null;
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadInventory: (token: string, forceRefresh?: boolean) => Promise<void>;
  loadFoodTypes: () => Promise<void>;
  addFood: (foodId: string, quantity: number, token: string) => Promise<void>;
  consumeFood: (foodId: string, quantity: number, token: string) => Promise<{ effects: any }>;
  grantReward: (rewardType: string, token: string) => Promise<FoodReward[]>;
  
  // 辅助方法
  getFoodQuantity: (foodId: string) => number;
  hasFood: (foodId: string, quantity?: number) => boolean;
}

export const useFoodStore = create<FoodState>()(
  persist(
    (set, get) => ({
      inventory: [],
      foodTypes: [],
      lastFetchTime: null,
      isLoading: false,
      error: null,
      
      loadInventory: async (token: string, forceRefresh = false) => {
        // 🔒 无token时直接返回
        if (!token) {
          debugLog('[FoodStore] ⚠️ No token provided, skipping inventory load');
          return;
        }
        
        // 检查缓存是否有效
        const { lastFetchTime, inventory } = get();
        const now = Date.now();
        if (!forceRefresh && lastFetchTime && inventory.length > 0 && (now - lastFetchTime) < CACHE_TTL) {
          debugLog('[FoodStore] Using cached inventory, age:', Math.round((now - lastFetchTime) / 1000), 'seconds');
          return;
        }
        
        try {
          set({ isLoading: true, error: null });
          debugLog('[FoodStore] Loading inventory...');
          debugLog('[FoodStore] Token:', token ? `${token.substring(0, 20)}...` : 'missing');
          debugLog('[FoodStore] API URL:', `${getApiBase()}/food/inventory`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          let response: Response;
          try {
            response = await fetch(`${getApiBase()}/food/inventory`, {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              signal: controller.signal
            });
          } finally {
            clearTimeout(timeoutId);
          }
          
          debugLog('[FoodStore] Response status:', response.status);
          debugLog('[FoodStore] Response ok:', response.ok);
          
          if (!response.ok) {
            // 🔒 401错误特殊处理
            if (response.status === 401) {
              debugLog('[FoodStore] 🔒 Token expired or invalid, clearing state');
              set({
                inventory: [],
                isLoading: false,
                error: null
              });
              return;
            }
            
            const errorText = await response.text();
            debugLog('[FoodStore] Error response:', errorText);
            throw new Error(`Failed to load inventory: ${response.statusText}`);
          }
          
          const text = await response.text();
          debugLog('[FoodStore] Raw response:', text);
          
          const data = JSON.parse(text);
          debugLog('[FoodStore] Parsed data:', data);
          
          set({
            inventory: data.inventory || [],
            lastFetchTime: Date.now(),
            isLoading: false
          });
          
          debugLog('[FoodStore] Inventory loaded:', data.inventory?.length || 0, 'items');
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            const timeoutError = new Error('请求超时，请稍后重试');
            set({ error: timeoutError.message, isLoading: false });
            return;
          }
          console.error('[FoodStore] Failed to load inventory:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load inventory',
            isLoading: false
          });
        }
      },
      
      loadFoodTypes: async () => {
        // 检查是否已有缓存
        const { foodTypes } = get();
        if (foodTypes.length > 0) {
          debugLog('[FoodStore] Using cached food types');
          return;
        }
        
        try {
          debugLog('[FoodStore] Loading food types...');
          
          const response = await fetch(`${getApiBase()}/food/types`);
          
          if (!response.ok) {
            throw new Error(`Failed to load food types: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          set({
            foodTypes: data.food_types || []
          });
          
          debugLog('[FoodStore] Food types loaded:', data.food_types);
        } catch (error) {
          console.error('[FoodStore] Failed to load food types:', error);
        }
      },
      
      addFood: async (foodId: string, quantity: number, token: string) => {
        try {
          set({ isLoading: true, error: null });
          debugLog('[FoodStore] Adding food:', foodId, quantity);
          
          const response = await fetch(`${getApiBase()}/food/add`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ food_id: foodId, quantity })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to add food: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // 强制刷新背包
          await get().loadInventory(token, true);
          
          set({ isLoading: false });
          
          debugLog('[FoodStore] Food added:', data);
        } catch (error) {
          console.error('[FoodStore] Failed to add food:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to add food',
            isLoading: false
          });
        }
      },
      
      consumeFood: async (foodId: string, quantity: number, token: string) => {
        try {
          set({ isLoading: true, error: null });
          debugLog('[FoodStore] Consuming food:', foodId, quantity);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          let response: Response;
          try {
            response = await fetch(`${getApiBase()}/food/consume`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ food_id: foodId, quantity }),
              signal: controller.signal
            });
          } finally {
            clearTimeout(timeoutId);
          }
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to consume food: ${response.statusText}`);
          }
          
          const data = await response.json();

          // ✅ 先本地更新背包，避免等待刷新导致卡顿
          set((state) => {
            const next = state.inventory
              .map(item => {
                if (item.food_id !== foodId) return item;
                return { ...item, quantity: Math.max(0, item.quantity - quantity) };
              })
              .filter(item => item.quantity > 0);
            return { inventory: next, isLoading: false };
          });

          // 后台刷新（不阻塞UI）
          get().loadInventory(token, true).catch(() => {});
          debugLog('[FoodStore] Food consumed:', data);
          
          return { effects: data.effects };
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            const timeoutError = new Error('请求超时，请稍后重试');
            set({ error: timeoutError.message, isLoading: false });
            throw timeoutError;
          }
          console.error('[FoodStore] Failed to consume food:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to consume food',
            isLoading: false
          });
          throw error;
        }
      },
      
      grantReward: async (rewardType: string, token: string) => {
        try {
          debugLog('[FoodStore] Granting reward:', rewardType);
          
          const response = await fetch(`${getApiBase()}/food/reward`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reward_type: rewardType })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to grant reward: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // 强制刷新背包
          await get().loadInventory(token, true);
          
          debugLog('[FoodStore] Reward granted:', data);
          
          return data.items || [];
        } catch (error) {
          console.error('[FoodStore] Failed to grant reward:', error);
          throw error;
        }
      },
      
      getFoodQuantity: (foodId: string) => {
        const item = get().inventory.find(i => i.food_id === foodId);
        return item ? item.quantity : 0;
      },
      
      hasFood: (foodId: string, quantity: number = 1) => {
        return get().getFoodQuantity(foodId) >= quantity;
      }
    }),
    {
      name: 'food-storage',
      partialize: (state) => ({
        inventory: state.inventory,
        foodTypes: state.foodTypes,
        lastFetchTime: state.lastFetchTime
      })
    }
  )
);
