import { create } from 'zustand';

import { getApiBaseUrl } from '@/lib/config/api';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { usePetStore } from '@/store/petStore';
import type {
  BattleRoyaleCreateRoomPayload,
  BattleRoyaleDifficulty,
  BattleRoyaleParticipantPayload,
  BattleRoyaleRoom,
  BattleRoyaleRoomListResponse,
  BattleRoyaleRoomResponse,
} from '@/types/pvp-br';

interface BattleRoyaleState {
  cap: number;
  rooms: BattleRoyaleRoom[];
  currentRoom: BattleRoyaleRoom | null;
  isLoading: boolean;
  wsConnected: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  createRoom: (roomName: string, maxPlayers: number) => Promise<BattleRoyaleRoom>;
  joinRoom: (roomId: string) => Promise<BattleRoyaleRoom>;
  refreshCurrentRoom: () => Promise<BattleRoyaleRoom | null>;
  leaveCurrentRoom: () => Promise<void>;
  addBot: (difficulty: BattleRoyaleDifficulty) => Promise<BattleRoyaleRoom>;
  removeBot: (botId: string) => Promise<BattleRoyaleRoom>;
  startCurrentRoom: () => Promise<BattleRoyaleRoom>;
  finishCurrentRoom: (winnerUserId?: number | null) => Promise<void>;
  setCurrentRoom: (room: BattleRoyaleRoom | null) => void;
  setWsConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  cap: 25,
  rooms: [] as BattleRoyaleRoom[],
  currentRoom: null as BattleRoyaleRoom | null,
  isLoading: false,
  wsConnected: false,
  error: null as string | null,
};

function translateBattleRoyaleError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('room is full')) {
    return '房间人数已满，请刷新列表或选择其他房间。';
  }
  if (normalized.includes('room not found')) {
    return '房间不存在或已经关闭，请返回大厅刷新后重试。';
  }
  if (normalized.includes('room already started')) {
    return '这个房间已经开始战斗，不能再加入或修改配置。';
  }
  if (normalized.includes('you are already in another active room')) {
    return '你已经在另一个进行中的房间里了，请先退出当前房间。';
  }
  if (normalized.includes('cannot modify bots after the match starts')) {
    return '战斗已经开始，不能再增删 AI 人机。';
  }
  if (normalized.includes('only the host can manage bots')) {
    return '只有房主可以添加或移除 AI 人机。';
  }
  if (normalized.includes('only the host can start the room')) {
    return '只有房主可以开始这一局战斗。';
  }
  if (normalized.includes('at least two fighters are required')) {
    return '至少需要 2 名参战者才能开始，请先邀请玩家或添加 AI。';
  }
  if (normalized.includes('you are not in this room')) {
    return '你已经不在这个房间里了，请返回大厅重新进入。';
  }
  if (normalized.includes('battle royale request failed')) {
    return '乱斗请求失败，请稍后重试。';
  }

  return message;
}

function requireToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('请先登录后再进入宠物乱斗。');
  }
  return token;
}

function buildParticipantPayload(): BattleRoyaleParticipantPayload {
  const authState = useAuthStore.getState();
  const petState = usePetStore.getState();
  const gameState = useGameStore.getState();

  const currentPet = petState.currentPet;

  return {
    username: authState.user?.username ?? 'Player',
    pet_type: currentPet?.petType ?? 'code_kitty',
    pet_name: currentPet?.name ?? 'Battle Pet',
    pet_stage: currentPet?.evolution_stage ?? 3,
    movement_skills: gameState.skills ?? [],
    age_group: gameState.selectedAgeGroup ?? 'primary-upper',
  };
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = requireToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(translateBattleRoyaleError(data.detail || data.message || 'Battle Royale request failed'));
  }
  return data as T;
}

export const usePvpBattleRoyaleStore = create<BattleRoyaleState>()((set, get) => ({
  ...initialState,

  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<BattleRoyaleRoomListResponse>('/pvp-br/rooms');
      set({ rooms: data.rooms, cap: data.cap, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '无法获取乱斗房间列表',
        isLoading: false,
      });
    }
  },

  createRoom: async (roomName: string, maxPlayers: number) => {
    set({ isLoading: true, error: null });
    try {
      const payload: BattleRoyaleCreateRoomPayload = {
        ...buildParticipantPayload(),
        room_name: roomName,
        max_players: maxPlayers,
      };
      const data = await apiRequest<BattleRoyaleRoomResponse>('/pvp-br/rooms/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      set((state) => ({
        currentRoom: data.room,
        cap: data.cap ?? state.cap,
        isLoading: false,
      }));
      return data.room;
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建乱斗房间失败';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  joinRoom: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<BattleRoyaleRoomResponse>(`/pvp-br/rooms/${roomId}/join`, {
        method: 'POST',
        body: JSON.stringify(buildParticipantPayload()),
      });
      set({ currentRoom: data.room, isLoading: false });
      return data.room;
    } catch (error) {
      const message = error instanceof Error ? error.message : '加入乱斗房间失败';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  refreshCurrentRoom: async () => {
    const roomId = get().currentRoom?.id;
    if (!roomId) return null;

    try {
      const data = await apiRequest<BattleRoyaleRoomResponse>(`/pvp-br/rooms/${roomId}`);
      set({ currentRoom: data.room, error: null });
      return data.room;
    } catch (error) {
      const message = error instanceof Error ? error.message : '刷新乱斗房间失败';
      set({ error: message });
      if (message.toLowerCase().includes('not found')) {
        set({ currentRoom: null });
      }
      return null;
    }
  },

  leaveCurrentRoom: async () => {
    const roomId = get().currentRoom?.id;
    if (!roomId) {
      set({ currentRoom: null });
      return;
    }

    try {
      await apiRequest(`/pvp-br/rooms/${roomId}/leave`, { method: 'POST' });
    } finally {
      set({ currentRoom: null, wsConnected: false });
    }
  },

  addBot: async (difficulty: BattleRoyaleDifficulty) => {
    const roomId = get().currentRoom?.id;
    if (!roomId) {
      throw new Error('当前没有可编辑的乱斗房间');
    }

    const data = await apiRequest<BattleRoyaleRoomResponse>(`/pvp-br/rooms/${roomId}/bots`, {
      method: 'POST',
      body: JSON.stringify({ difficulty }),
    });
    set({ currentRoom: data.room, error: null });
    return data.room;
  },

  removeBot: async (botId: string) => {
    const roomId = get().currentRoom?.id;
    if (!roomId) {
      throw new Error('当前没有可编辑的乱斗房间');
    }

    const data = await apiRequest<BattleRoyaleRoomResponse>(`/pvp-br/rooms/${roomId}/bots/${botId}`, {
      method: 'DELETE',
    });
    set({ currentRoom: data.room, error: null });
    return data.room;
  },

  startCurrentRoom: async () => {
    const roomId = get().currentRoom?.id;
    if (!roomId) {
      throw new Error('当前没有可开始的乱斗房间');
    }

    const data = await apiRequest<BattleRoyaleRoomResponse>(`/pvp-br/rooms/${roomId}/start`, {
      method: 'POST',
    });
    set({ currentRoom: data.room, error: null });
    return data.room;
  },

  finishCurrentRoom: async (winnerUserId?: number | null) => {
    const roomId = get().currentRoom?.id;
    if (!roomId) return;

    const suffix =
      typeof winnerUserId === 'number'
        ? `?winner_user_id=${encodeURIComponent(String(winnerUserId))}`
        : '';
    await apiRequest(`/pvp-br/rooms/${roomId}/finish${suffix}`, { method: 'POST' });
  },

  setCurrentRoom: (room) => set({ currentRoom: room }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
