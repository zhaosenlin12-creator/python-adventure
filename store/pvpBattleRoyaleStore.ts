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
  fetchMyActiveRoom: () => Promise<BattleRoyaleRoom | null>;
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

const NETWORK_ERROR_PATTERNS = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'load failed',
  'fetch failed',
];

function translateBattleRoyaleError(message: string): string {
  const normalized = message.toLowerCase().trim();

  if (NETWORK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return '无法连接生存乱斗服务，请确认前后端都已启动，并检查当前设备是否能访问局域网地址后再重试。';
  }
  if (normalized.includes('room is full')) {
    return '房间人数已满，请刷新列表或选择其他房间。';
  }
  if (normalized.includes('room not found')) {
    return '房间不存在或已关闭，请返回大厅刷新后重试。';
  }
  if (normalized.includes('room already started')) {
    return '这个房间已经开战，不能再加入或修改配置。';
  }
  if (normalized.includes('you are already in another active room')) {
    return '你已经在另一个进行中的房间里了，请先退出当前房间。';
  }
  if (normalized.includes('cannot modify bots after the match starts')) {
    return '战斗已经开始，不能再调整人机数量。';
  }
  if (normalized.includes('only the host can manage bots')) {
    return '只有房主可以添加或移除人机。';
  }
  if (normalized.includes('only the host can start the room')) {
    return '只有房主可以开始这局战斗。';
  }
  if (normalized.includes('only the host can finish the room')) {
    return '只有房主可以提交这局的最终结果。';
  }
  if (normalized.includes('at least two fighters are required')) {
    return '至少需要 2 名参战者才能开始，请先邀请玩家或添加人机。';
  }
  if (normalized.includes('you are not in this room')) {
    return '你已经不在这个房间里了，请返回大厅后重新进入。';
  }
  if (normalized.includes('no active room')) {
    return '你当前没有正在进行中的乱斗房间。';
  }
  if (normalized.includes('battle royale request failed')) {
    return '生存乱斗请求失败，请稍后重试。';
  }

  return message;
}

function toBattleRoyaleUiError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return translateBattleRoyaleError(error.message.trim());
  }
  return fallback;
}

function requireToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('请先登录后再进入宠物生存乱斗。');
  }
  return token;
}

function buildParticipantPayload(): BattleRoyaleParticipantPayload {
  const authState = useAuthStore.getState();
  const petState = usePetStore.getState();
  const gameState = useGameStore.getState();
  const currentPet = petState.currentPet;

  return {
    username: (authState.user?.username ?? 'Player').trim().slice(0, 24) || 'Player',
    pet_type: currentPet?.petType ?? 'code_kitty',
    pet_name: currentPet?.name ?? 'Battle Pet',
    pet_stage: Math.max(1, currentPet?.evolution_stage ?? 3),
    movement_skills: gameState.skills ?? [],
    age_group: gameState.selectedAgeGroup ?? 'primary-upper',
  };
}

async function authorizedFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = requireToken();

  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new Error(
      toBattleRoyaleUiError(error, '无法连接生存乱斗服务，请确认后端已启动后再重试。'),
    );
  }
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authorizedFetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(translateBattleRoyaleError(String(data.detail || data.message || 'Battle Royale request failed')));
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
        error: toBattleRoyaleUiError(error, '无法获取乱斗房间列表，请稍后刷新重试。'),
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
        error: null,
      }));
      return data.room;
    } catch (error) {
      const message = toBattleRoyaleUiError(error, '创建生存乱斗房间失败，请稍后重试。');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  joinRoom: async (roomId: string) => {
    set({ isLoading: true, error: null });

    try {
      const data = await apiRequest<BattleRoyaleRoomResponse>(`/pvp-br/rooms/${roomId}/join`, {
        method: 'POST',
        body: JSON.stringify(buildParticipantPayload()),
      });
      set({ currentRoom: data.room, isLoading: false, error: null });
      return data.room;
    } catch (error) {
      const message = toBattleRoyaleUiError(error, '加入生存乱斗房间失败，请稍后重试。');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  fetchMyActiveRoom: async () => {
    try {
      const response = await authorizedFetch('/pvp-br/rooms/my-active');
      if (response.status === 404) {
        return null;
      }

      const data = (await response.json().catch(() => ({}))) as Partial<BattleRoyaleRoomResponse>;
      if (!response.ok || !data.room) {
        throw new Error(
          translateBattleRoyaleError(String((data as { detail?: string }).detail || 'Battle Royale request failed')),
        );
      }

      set((state) => ({
        cap: data.cap ?? state.cap,
        error: null,
      }));
      return data.room as BattleRoyaleRoom;
    } catch (error) {
      const message = toBattleRoyaleUiError(error, '恢复进行中的乱斗房间失败，请稍后重试。');
      set({ error: message });
      return null;
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
      const message = toBattleRoyaleUiError(error, '刷新乱斗房间失败，请稍后重试。');
      set({ error: message });
      if (message.includes('房间不存在') || message.includes('已关闭')) {
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
      throw new Error('当前没有可编辑的生存乱斗房间。');
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
      throw new Error('当前没有可编辑的生存乱斗房间。');
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
      throw new Error('当前没有可以开始的生存乱斗房间。');
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
