import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Pet, PetType, PetMood, PetStyle } from '@/types/pet';
import { useAuthStore } from './authStore';
import * as petAPI from '@/lib/api/petAPI';
import { canEvolve } from '@/lib/petEvolution';
import { showErrorToast } from '@/components/ui/ErrorToast';
import { PetMoodSystem } from '@/lib/pet/moodSystem';

// 只在真正的本地开发环境输出调试日志
const isLocalDev = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  : process.env.NODE_ENV === 'development';
const debugLog = isLocalDev ? console.log.bind(console) : () => {};

// 🎭 全局情绪系统单例
let globalMoodSystem: PetMoodSystem | null = null;

function getGlobalMoodSystem(onMoodChange: (mood: PetMood) => void): PetMoodSystem {
  if (!globalMoodSystem) {
    globalMoodSystem = new PetMoodSystem(onMoodChange);
  }
  return globalMoodSystem;
}

/** 🔒 销毁全局情绪系统单例（登出/清理时调用，防止定时器泄漏） */
export function destroyGlobalMoodSystem() {
  if (globalMoodSystem) {
    globalMoodSystem.destroy();
    globalMoodSystem = null;
  }
}

export interface PetState {
  // 当前宠物
  currentPet: Pet | null;
  
  // 宠物列表（支持多宠物）
  pets: Pet[];
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
  
  // 同步状态
  isSyncing: boolean;
  lastSyncTime: number | null;
  
  // 🎭 情绪状态
  currentMood: PetMood;
  
  // Actions
  loadPets: () => Promise<void>;
  createPet: (name: string, type: PetType) => Promise<Pet | null>;
  feedPet: (petId: number, options?: { effects?: Record<string, number>; foodId?: string; quantity?: number }) => Promise<void>;
  rescuePet: (petId: number) => Promise<void>;
  updatePetAttributes: (petId: number, attributes: { attack?: number; defense?: number; speed?: number }) => Promise<void>;
  updatePetName: (petId: number, name: string) => Promise<void>;
  setCurrentPet: (pet: Pet | null) => void;
  
  // 字化系统
  hatchPet: (petId: number, petType: PetType, petStyle: PetStyle, name: string) => Promise<void>;
  updateHatchProgress: (petId: number) => Promise<void>;
  
  // 进化系统
  evolvePet: (petId: number) => Promise<void>;
  checkEvolution: (petId: number) => boolean;
  
  // 本地状态更新
  updatePetLocally: (petId: number, updates: Partial<Pet>) => void;
  
  // 云端同步
  syncWithCloud: () => Promise<void>;
  
  // 🎭 情绪系统
  triggerMood: (eventName: string) => void;
  getMoodSystem: () => PetMoodSystem;
}

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => ({
      currentPet: null,
      pets: [],
      isLoading: false,
      error: null,
      isSyncing: false,
      lastSyncTime: null,
      currentMood: 'normal' as PetMood,
      
      loadPets: async () => {
        try {
          const { token, isAuthenticated, handleTokenExpired } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            debugLog('[PetStore] Not authenticated, clearing local pet data');
            // 🔒 未登录时清理本地缓存的宠物数据
            set({
              pets: [],
              currentPet: null,
              isLoading: false,
              error: null
            });
            return;
          }
          
          set({ isLoading: true, error: null });
          debugLog('[PetStore] Loading pets from server...');
          
          const { pets, currentPetId } = await petAPI.getMyPets(token);
          const prevCurrent = get().currentPet;
          const nextCurrent = pets.length > 0
            ? (() => {
                if (typeof currentPetId === 'number') {
                  const serverCurrent = pets.find(p => p.id === currentPetId);
                  if (serverCurrent) return serverCurrent;
                }
                if (prevCurrent) {
                  return pets.find(p => p.id === prevCurrent.id) || pets[0];
                }
                return pets[0];
              })()
            : null;
          
          set({
            pets,
            currentPet: nextCurrent,
            isLoading: false,
            lastSyncTime: Date.now()
          });
          
          debugLog('[PetStore] Loaded pets:', pets);

          // 通知开放世界宠物跟随系统更新
          if (nextCurrent && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pet-status-changed', { detail: { pet: nextCurrent } }));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load pets';
          if (errorMessage.includes('网络连接失败') || errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('网络异常')) {
            const toastMessage = isLocalDev ? '后端服务不可用，请先启动后端服务' : '网络异常，请稍后重试';
            showErrorToast(toastMessage, 'warning');
            set({
              error: errorMessage,
              isLoading: false
            });
            return;
          }
          console.error('[PetStore] Failed to load pets:', error);
          
          // 🔒 检测401错误，清理本地数据并触发token过期处理
          if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
            debugLog('[PetStore] Token expired, clearing local data');
            set({
              pets: [],
              currentPet: null,
              isLoading: false,
              error: null
            });
            // 触发全局token过期处理
            const { handleTokenExpired } = useAuthStore.getState();
            handleTokenExpired();
            return;
          }
          
          set({
            error: errorMessage,
            isLoading: false
          });
        }
      },
      
      createPet: async (name: string, type: PetType) => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            throw new Error('Not authenticated');
          }
          
          set({ isLoading: true, error: null });
          debugLog('[PetStore] Creating pet:', { name, type });
          
          const newPet = await petAPI.createPet(name, type, token);
          
          set((state) => ({
            pets: [...state.pets, newPet],
            currentPet: state.currentPet || newPet,
            isLoading: false,
            lastSyncTime: Date.now()
          }));
          
          debugLog('[PetStore] Pet created:', newPet);
          return newPet;
        } catch (error) {
          console.error('[PetStore] Failed to create pet:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create pet',
            isLoading: false
          });
          return null;
        }
      },
      
      feedPet: async (petId: number, options?: { effects?: Record<string, number>; foodId?: string; quantity?: number }) => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            throw new Error('Not authenticated');
          }
          
          debugLog('[PetStore] Feeding pet:', petId, 'with options:', options);
          
          // 确保传递食物效果到后端
          const updatedPet = await petAPI.feedPet(petId, token, options || {});
          
          set((state) => ({
            pets: state.pets.map(p => p.id === petId ? updatedPet : p),
            currentPet: state.currentPet?.id === petId ? updatedPet : state.currentPet,
            lastSyncTime: Date.now()
          }));
          
          // 🎭 触发喂食情绪
          get().triggerMood('pet_feed');
          
          debugLog('[PetStore] Pet fed:', updatedPet);
        } catch (error) {
          console.error('[PetStore] Failed to feed pet:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to feed pet' });
          throw error;
        }
      },
      
      rescuePet: async (petId: number) => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            throw new Error('Not authenticated');
          }
          
          debugLog('[PetStore] Rescuing pet:', petId);
          
          const updatedPet = await petAPI.rescuePet(petId, token);
          
          set((state) => ({
            pets: state.pets.map(p => p.id === petId ? updatedPet : p),
            currentPet: state.currentPet?.id === petId ? updatedPet : state.currentPet,
            lastSyncTime: Date.now()
          }));
          
          // 🎭 触发营救情绪
          get().triggerMood('pet_rescued');
          
          debugLog('[PetStore] Pet rescued:', updatedPet);
        } catch (error) {
          console.error('[PetStore] Failed to rescue pet:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to rescue pet' });
        }
      },
      
      updatePetAttributes: async (petId: number, attributes: { attack?: number; defense?: number; speed?: number }) => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            throw new Error('Not authenticated');
          }
          
          debugLog('[PetStore] Updating pet attributes:', { petId, attributes });
          
          const updatedPet = await petAPI.updatePetAttributes(petId, attributes, token);
          
          set((state) => ({
            pets: state.pets.map(p => p.id === petId ? updatedPet : p),
            currentPet: state.currentPet?.id === petId ? updatedPet : state.currentPet,
            lastSyncTime: Date.now()
          }));
          
          debugLog('[PetStore] Pet attributes updated:', updatedPet);
        } catch (error) {
          console.error('[PetStore] Failed to update pet attributes:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update attributes' });
        }
      },
      
      updatePetName: async (petId: number, name: string) => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            throw new Error('Not authenticated');
          }
          
          debugLog('[PetStore] Updating pet name:', { petId, name });
          
          const updatedPet = await petAPI.updatePetName(petId, name, token);
          
          set((state) => ({
            pets: state.pets.map(p => p.id === petId ? updatedPet : p),
            currentPet: state.currentPet?.id === petId ? updatedPet : state.currentPet,
            lastSyncTime: Date.now()
          }));
          
          debugLog('[PetStore] Pet name updated:', updatedPet);
        } catch (error) {
          console.error('[PetStore] Failed to update pet name:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update pet name' });
          throw error;
        }
      },
      
      setCurrentPet: (pet: Pet | null) => {
        set({ currentPet: pet });
        // 通知开放世界宠物跟随系统更新
        if (pet && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pet-status-changed', { detail: { pet } }));
        }
        
        // 同步到后端，作为多人场景权威“当前跟随宠物”
        if (pet) {
          const selectedPetId = pet.id;
          const { token, isAuthenticated } = useAuthStore.getState();
          if (isAuthenticated && token) {
            petAPI.setActivePet(selectedPetId, token)
              .then((serverPet) => {
                set((state) => ({
                  pets: state.pets.map(p => p.id === selectedPetId ? serverPet : p),
                  currentPet: state.currentPet?.id === selectedPetId ? serverPet : state.currentPet,
                  lastSyncTime: Date.now()
                }));
              })
              .catch((error) => {
                console.warn('[PetStore] Failed to sync active pet to backend:', error);
              });
          }
        }
      },
      
      hatchPet: async (petId: number, petType: PetType, petStyle: PetStyle, name: string) => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            throw new Error('Not authenticated');
          }
          
          debugLog('[PetStore] Hatching pet:', { petId, petType, petStyle, name });
          
          const updatedPet = await petAPI.hatchPet(petId, petType, petStyle, name, token);
          
          set((state) => ({
            pets: state.pets.map(p => p.id === petId ? updatedPet : p),
            currentPet: state.currentPet?.id === petId ? updatedPet : state.currentPet,
            lastSyncTime: Date.now()
          }));
          
          debugLog('[PetStore] Pet hatched:', updatedPet);
        } catch (error) {
          console.error('[PetStore] Failed to hatch pet:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to hatch pet' });
          throw error;
        }
      },
      
      updateHatchProgress: async (petId: number) => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            throw new Error('Not authenticated');
          }
          
          debugLog('[PetStore] Updating hatch progress:', petId);
          
          const updatedPet = await petAPI.updateHatchProgress(petId, token);
          
          set((state) => ({
            pets: state.pets.map(p => p.id === petId ? updatedPet : p),
            currentPet: state.currentPet?.id === petId ? updatedPet : state.currentPet,
            lastSyncTime: Date.now()
          }));
          
          debugLog('[PetStore] Hatch progress updated:', updatedPet);
        } catch (error) {
          console.error('[PetStore] Failed to update hatch progress:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update hatch progress' });
        }
      },
      
      evolvePet: async (petId: number) => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            throw new Error('Not authenticated');
          }
          
          debugLog('[PetStore] Evolving pet:', petId);
          
          const updatedPet = await petAPI.evolvePet(petId, token);
          
          set((state) => ({
            pets: state.pets.map(p => p.id === petId ? updatedPet : p),
            currentPet: state.currentPet?.id === petId ? updatedPet : state.currentPet,
            lastSyncTime: Date.now()
          }));
          
          // 🎭 触发进化情绪
          get().triggerMood('evolution_complete');
          
          debugLog('[PetStore] Pet evolved:', updatedPet);
        } catch (error) {
          console.error('[PetStore] Failed to evolve pet:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to evolve pet' });
          throw error;
        }
      },
      
      checkEvolution: (petId: number) => {
        const state = get();
        const pet = state.pets.find(p => p.id === petId);
        if (!pet) return false;
        
        const intelligence = pet.attributes?.intelligence ?? pet.intelligence ?? 0;
        const creativity = pet.attributes?.creativity ?? pet.creativity ?? 0;
        const persistence = pet.attributes?.persistence ?? pet.persistence ?? pet.perseverance ?? 0;
        const evolutionStage = pet.evolution_stage ?? (pet.isEgg ? 0 : 1);
        const result = canEvolve({
          level: pet.level,
          evolution_stage: evolutionStage,
          intimacy: pet.intimacy || 0,
          intelligence,
          creativity,
          persistence,
          perseverance: pet.perseverance
        });
        
        return result.canEvolve;
      },
      
      updatePetLocally: (petId: number, updates: Partial<Pet>) => {
        set((state) => ({
          pets: state.pets.map(p => p.id === petId ? { ...p, ...updates } : p),
          currentPet: state.currentPet?.id === petId ? { ...state.currentPet, ...updates } : state.currentPet
        }));
      },
      
      syncWithCloud: async () => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !token) {
            return;
          }
          
          const state = get();
          if (state.isSyncing) {
            return; // Skip if already syncing
          }
          
          set({ isSyncing: true });
          debugLog('[PetStore] Syncing with cloud...');
          
          await get().loadPets();
          
          set({ isSyncing: false });
          debugLog('[PetStore] Sync complete');
        } catch (error) {
          console.error('[PetStore] Failed to sync with cloud:', error);
          set({ isSyncing: false });
        }
      },
      
      // 🎭 情绪系统 Actions
      triggerMood: (eventName: string) => {
        const moodSystem = get().getMoodSystem();
        moodSystem.triggerMood(eventName);
        debugLog('[PetStore] Mood triggered:', eventName);
      },
      
      getMoodSystem: () => {
        return getGlobalMoodSystem((mood: PetMood) => {
          set({ currentMood: mood });
          // 通知开放世界宠物跟随系统更新情绪
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pet-mood-changed', { detail: { mood } }));
          }
        });
      }
    }),
    {
      name: 'pet-storage',
      partialize: (state) => ({
        currentPet: state.currentPet,
        pets: state.pets,
        lastSyncTime: state.lastSyncTime
      })
    }
  )
);
