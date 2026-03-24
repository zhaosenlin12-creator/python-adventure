import { create } from 'zustand';
import { InteractionType, INTERACTION_CONFIGS } from '@/types/interaction';
import { playSound } from '@/lib/utils/soundManager';
import { getApiBaseUrl } from '@/lib/config/api';
import { toFriendlyMessage } from '@/lib/utils/friendlyError';

interface InteractionCooldown {
  interactionId: InteractionType;
  lastUsedAt: number;
  cooldownEndsAt: number;
}

interface InteractionStore {
  cooldowns: InteractionCooldown[];
  isLoading: boolean;
  error: string | null;
  lastMessage: string | null;
  setLastMessage: (message: string | null) => void;
  
  // 执行互动
  performInteraction: (petId: number, interactionId: InteractionType) => Promise<void>;
  
  // 检查冷却
  isOnCooldown: (interactionId: InteractionType) => boolean;
  getRemainingTime: (interactionId: InteractionType) => number;
  
  // 更新冷却
  updateCooldown: (interactionId: InteractionType) => void;
  
  // 清除错误
  clearError: () => void;
}

export const useInteractionStore = create<InteractionStore>((set, get) => ({
  cooldowns: [],
  isLoading: false,
  error: null,
  lastMessage: null,
  setLastMessage: (message: string | null) => set({ lastMessage: message }),
  
  performInteraction: async (petId: number, interactionId: InteractionType) => {
    const { isOnCooldown, updateCooldown } = get();
    
    // 检查冷却
    if (isOnCooldown(interactionId)) {
      set({ error: '互动冷却中，请稍后再试！' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // 🔒 从 authStore 获取 token
      const { useAuthStore } = await import('@/store/authStore');
      const { token, isAuthenticated } = useAuthStore.getState();
      
      if (!isAuthenticated || !token) {
        throw new Error('请先登录');
      }
      
      // 调用后端API应用互动效果
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/pets/${petId}/interact`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ interactionId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '互动失败');
      }
      
      const result = await response.json();
      
      // 更新冷却
      updateCooldown(interactionId);
      
      // 播放互动类型对应的音效
      const interactionConfig = INTERACTION_CONFIGS[interactionId];
      if (interactionConfig?.sound) {
        // 从配置中获取音效名称（去掉.wav后缀）
        const soundName = interactionConfig.sound.replace('.wav', '') as Parameters<typeof playSound>[0];
        try {
          playSound(soundName);
        } catch {
          // 回退到默认音效
          playSound('pet_happy');
        }
      } else {
        playSound('pet_happy');
      }
      
      // 设置成功消息
      set({ lastMessage: result.message });
      
      // ✨ 触发效果飘升动画
      const interactionCfg = INTERACTION_CONFIGS[interactionId];
      const appliedEffects = result?.effects || interactionCfg?.effects;
      if (appliedEffects) {
        const { showInteractionEffect } = await import('@/components/pet/InteractionEffectToast');
        showInteractionEffect(appliedEffects);
      }
      
      // 🎨 触发 SVG 粒子动画反馈
      try {
        const { triggerInteractionFeedback } = await import('@/components/pet/InteractionFeedback');
        triggerInteractionFeedback(interactionId);
      } catch {
        // 动画组件未加载，忽略
      }
      
      // 更新宠物状态（通过petStore）
      // 动态导入避免循环依赖
      const { usePetStore } = await import('@/store/petStore');
      const petStore = usePetStore.getState();
      
      if (result.pet) {
        // 后端返回 attributes 嵌套对象，需要映射到顶层属性
        const petUpdates: Record<string, any> = {
          ...result.pet,
        };
        // 展平 attributes 到顶层
        if (result.pet.attributes) {
          petUpdates.intelligence = result.pet.attributes.intelligence;
          petUpdates.creativity = result.pet.attributes.creativity;
          petUpdates.perseverance = result.pet.attributes.persistence; // 后端是 persistence，前端是 perseverance
        }
        petStore.updatePetLocally(petId, petUpdates);
      }
      
    } catch (error) {
      console.error('Interaction error:', error);
      set({ error: toFriendlyMessage(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  isOnCooldown: (interactionId: InteractionType) => {
    const { cooldowns } = get();
    const cooldown = cooldowns.find(c => c.interactionId === interactionId);
    if (!cooldown) return false;
    
    return Date.now() < cooldown.cooldownEndsAt;
  },
  
  getRemainingTime: (interactionId: InteractionType) => {
    const { cooldowns } = get();
    const cooldown = cooldowns.find(c => c.interactionId === interactionId);
    if (!cooldown) return 0;
    
    const remaining = Math.max(0, cooldown.cooldownEndsAt - Date.now());
    return Math.ceil(remaining / 1000);
  },
  
  updateCooldown: (interactionId: InteractionType) => {
    const interaction = INTERACTION_CONFIGS[interactionId];
    const now = Date.now();
    const cooldownEndsAt = now + interaction.cooldown * 1000;
    
    set(state => {
      const existingIndex = state.cooldowns.findIndex(c => c.interactionId === interactionId);
      
      const newCooldown: InteractionCooldown = {
        interactionId,
        lastUsedAt: now,
        cooldownEndsAt,
      };
      
      if (existingIndex >= 0) {
        // 更新现有冷却
        const newCooldowns = [...state.cooldowns];
        newCooldowns[existingIndex] = newCooldown;
        return { cooldowns: newCooldowns };
      } else {
        // 添加新冷却
        return { cooldowns: [...state.cooldowns, newCooldown] };
      }
    });
  },
  
  clearError: () => set({ error: null }),
}));
