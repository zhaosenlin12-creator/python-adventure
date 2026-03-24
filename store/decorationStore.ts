/**
 * 装饰品状态管理
 */

import { create } from 'zustand';
import { Decoration, PlacedDecoration, UserDecoration, DECORATIONS } from '@/types/decoration';
import { getApiBaseUrl } from '@/lib/config/api';
import { toFriendlyMessage, showFriendlyErrorToast } from '@/lib/utils/friendlyError';

// 动态获取API基础URL，支持局域网访问
function getApiBase(): string {
  return getApiBaseUrl();
}

// 从 zustand persist 存储中获取 token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const authData = localStorage.getItem('auth-storage');
  if (!authData) return null;
  try {
    const parsed = JSON.parse(authData);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

interface DecorationState {
  // 用户拥有的装饰品
  ownedDecorations: UserDecoration[];
  
  // 已放置的装饰品
  placedDecorations: PlacedDecoration[];
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  loadDecorations: () => Promise<void>;
  purchaseDecoration: (decorationId: string) => Promise<boolean>;
  placeDecoration: (decorationId: string, x: number, y: number, scene: 'living' | 'garden') => Promise<PlacedDecoration | null>;
  removeDecoration: (placedId: string) => Promise<boolean>;
  updateDecorationPosition: (placedId: string, x: number, y: number) => Promise<boolean>;
  
  // 辅助方法
  getOwnedQuantity: (decorationId: string) => number;
  canPurchase: (decorationId: string, userLevel: number, userCoins: number) => boolean;
}

export const useDecorationStore = create<DecorationState>((set, get) => ({
  ownedDecorations: [],
  placedDecorations: [],
  isLoading: false,
  error: null,
  
  loadDecorations: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        // 无token时不抛出错误，只是跳过加载
        console.log('[DecorationStore] No token, skipping load');
        set({ isLoading: false });
        return;
      }
      
      // 从后端加载装饰品数据
      const [ownedResponse, placedResponse] = await Promise.all([
        fetch(`${getApiBase()}/decorations/my`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${getApiBase()}/decorations/placed`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);
      
      if (!ownedResponse.ok) {
        const errorText = await ownedResponse.text();
        console.error('Failed to load owned decorations:', errorText);
        // 🔒 不向用户泄露原始后端响应
        throw new Error('装饰品数据加载失败');
      }
      
      if (!placedResponse.ok) {
        const errorText = await placedResponse.text();
        console.error('Failed to load placed decorations:', errorText);
        throw new Error('已放置装饰品加载失败');
      }
      
      const ownedData = await ownedResponse.json();
      const placedData = await placedResponse.json();
      
      // 转换数据格式
      const ownedDecorations: UserDecoration[] = ownedData.map((d: any) => ({
        userId: 0, // 从token获取
        decorationId: d.decoration_id,
        quantity: d.quantity,
        purchasedAt: new Date(d.purchased_at)
      }));
      
      const placedDecorations: PlacedDecoration[] = placedData.map((p: any) => ({
        id: p.id.toString(),
        decorationId: p.decoration_id,
        x: p.x,
        y: p.y,
        rotation: p.rotation,
        scene: p.scene as 'living' | 'garden'
      }));
      
      set({
        ownedDecorations,
        placedDecorations,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to load decorations:', error);
      showFriendlyErrorToast(error, '装饰品加载失败');
      set({ 
        isLoading: false,
        error: toFriendlyMessage(error, '装饰品加载失败')
      });
    }
  },
  
  purchaseDecoration: async (decorationId: string) => {
    const decoration = DECORATIONS[decorationId];
    if (!decoration) {
      console.error('Decoration not found:', decorationId);
      return false;
    }
    
    try {
      const token = getAuthToken();
      if (!token) {
        showFriendlyErrorToast('请先登录');
        return false;
      }
      
      // 调用后端API购买装饰品
      const response = await fetch(`${getApiBase()}/decorations/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decoration_id: decorationId })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Purchase API error:', errorText);
        // 🔒 解析后端友好消息，不直接抛出原始文本
        let msg = '购买失败';
        try {
          const parsed = JSON.parse(errorText);
          if (typeof parsed.message === 'string') msg = parsed.message;
        } catch { /* non-JSON */ }
        throw new Error(msg);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地状态
        const { ownedDecorations } = get();
        const existing = ownedDecorations.find(d => d.decorationId === decorationId);
        
        if (existing) {
          set({
            ownedDecorations: ownedDecorations.map(d =>
              d.decorationId === decorationId
                ? { ...d, quantity: d.quantity + 1 }
                : d
            )
          });
        } else {
          set({
            ownedDecorations: [
              ...ownedDecorations,
              {
                userId: 0, // 从token获取
                decorationId,
                quantity: 1,
                purchasedAt: new Date()
              }
            ]
          });
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to purchase decoration:', error);
      showFriendlyErrorToast(error, '购买失败，请稍后再试');
      return false;
    }
  },
  
  placeDecoration: async (decorationId: string, x: number, y: number, scene: 'living' | 'garden') => {
    const { ownedDecorations, placedDecorations } = get();
    const owned = ownedDecorations.find(d => d.decorationId === decorationId);
    
    if (!owned || owned.quantity <= 0) {
      console.error('Decoration not owned or out of stock');
      showFriendlyErrorToast('该装饰品数量不足');
      return null;
    }
    
    try {
      const token = getAuthToken();
      if (!token) {
        showFriendlyErrorToast('请先登录');
        return null;
      }
      
      // 调用后端API放置装饰品
      const response = await fetch(`${getApiBase()}/decorations/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          decoration_id: decorationId,
          scene,
          x,
          y,
          rotation: 0
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '放置失败');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const newPlaced: PlacedDecoration = {
          id: data.placed.id.toString(),
          decorationId,
          x,
          y,
          scene
        };
        
        set({
          placedDecorations: [...placedDecorations, newPlaced],
          ownedDecorations: ownedDecorations.map(d =>
            d.decorationId === decorationId
              ? { ...d, quantity: d.quantity - 1 }
              : d
          )
        });
        
        return newPlaced;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to place decoration:', error);
      showFriendlyErrorToast(error, '放置失败，请稍后再试');
      return null;
    }
  },
  
  removeDecoration: async (placedId: string) => {
    const { placedDecorations, ownedDecorations } = get();
    const placed = placedDecorations.find(d => d.id === placedId);
    
    if (!placed) {
      console.error('Placed decoration not found');
      return false;
    }
    
    const token = getAuthToken();
    if (!token) {
      showFriendlyErrorToast('请先登录');
      return false;
    }
    
    // 🚀 乐观更新：立即更新UI，不等待后端响应
    const previousPlaced = [...placedDecorations];
    const previousOwned = [...ownedDecorations];
    
    set({
      placedDecorations: placedDecorations.filter(d => d.id !== placedId),
      ownedDecorations: ownedDecorations.map(d =>
        d.decorationId === placed.decorationId
          ? { ...d, quantity: d.quantity + 1 }
          : d
      )
    });
    
    try {
      // 后台请求后端API
      const response = await fetch(`${getApiBase()}/decorations/placed/${placedId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '移除失败');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        // 后端失败，回滚本地状态
        throw new Error('Server returned failure');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to remove decoration:', error);
      showFriendlyErrorToast(error, '移除失败，请稍后再试');
      // ❗ 回滚到之前的状态
      set({
        placedDecorations: previousPlaced,
        ownedDecorations: previousOwned
      });
      return false;
    }
  },
  
  updateDecorationPosition: async (placedId: string, x: number, y: number) => {
    const { placedDecorations } = get();
    const placed = placedDecorations.find(d => d.id === placedId);
    
    if (!placed) {
      console.error('Placed decoration not found');
      return false;
    }
    
    try {
      const token = getAuthToken();
      if (!token) {
        showFriendlyErrorToast('请先登录');
        return false;
      }
      
      // 调用后端API更新装饰品位置
      const response = await fetch(`${getApiBase()}/decorations/placed/${placedId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ x, y })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '移动失败');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地状态
        set({
          placedDecorations: placedDecorations.map(d =>
            d.id === placedId
              ? { ...d, x, y }
              : d
          )
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update decoration position:', error);
      showFriendlyErrorToast(error, '移动失败，请稍后再试');
      return false;
    }
  },
  
  getOwnedQuantity: (decorationId: string) => {
    const { ownedDecorations } = get();
    const owned = ownedDecorations.find(d => d.decorationId === decorationId);
    return owned ? owned.quantity : 0;
  },
  
  canPurchase: (decorationId: string, userLevel: number, userCoins: number) => {
    const decoration = DECORATIONS[decorationId];
    if (!decoration) return false;
    
    return userLevel >= decoration.unlockLevel && userCoins >= decoration.price;
  }
}));
