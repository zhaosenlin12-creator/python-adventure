/**
 * PVP 状态管理
 * Requirements: 1.1, 1.2, 1.4, 5.1
 */

import { create } from 'zustand';
import {
    PvpState,
    RoomInfo,
    PlayerState,
    RoundType,
    RoundScores,
    AIOpponent,
    PlayerInfo,
    generateRoomId,
    isAIOpponent,
} from '../types/pvp';
import { createAIOpponent } from '../lib/pvpAI';
import { getApiBaseUrl } from '../lib/config/api';
import { usePetStore } from './petStore';

function getActivePetInfo() {
    const currentPet = usePetStore.getState().currentPet;
    const petType = currentPet?.petType ?? 'code_kitty';
    const petStage = Math.max(1, Math.min(5, currentPet?.evolution_stage ?? 3));
    const petName = currentPet?.name ?? '伙伴';
    return { petType, petStage, petName };
}

function buildPetQuery() {
    const pet = getActivePetInfo();
    return `pet_type=${encodeURIComponent(pet.petType)}&pet_stage=${pet.petStage}&pet_name=${encodeURIComponent(pet.petName)}`;
}

// ==================== 初始状态 ====================

const initialRoundScores: RoundScores = {
    battle: null,
    quiz: null,
    coding: null,
};

const initialState: PvpState = {
    currentRoom: null,
    availableRooms: [],
    existingRoomId: null,
    currentRound: null,
    roundNumber: 0,
    localPlayer: null,
    remotePlayer: null,
    roundScores: initialRoundScores,
    wsConnected: false,
    latency: 0,
    error: null,
};

// ==================== Store Actions 接口 ====================

interface PvpActions {
    // 房间操作
    createRoom: (hostPlayer: PlayerInfo) => string;
    joinRoom: (roomId: string, player: PlayerInfo) => boolean;
    leaveRoom: () => void;
    setRoomStatus: (status: RoomInfo['status']) => void;
    
    // AI 对战
    startAIBattle: (hostPlayer: PlayerInfo, difficulty: 'easy' | 'medium' | 'hard') => void;
    
    // 对战状态
    setCurrentRound: (round: RoundType | null) => void;
    nextRound: () => void;
    
    // 玩家状态
    updateLocalPlayer: (state: Partial<PlayerState>) => void;
    updateRemotePlayer: (state: Partial<PlayerState>) => void;
    initializePlayerStates: (player1: PlayerInfo, player2: PlayerInfo | AIOpponent) => void;
    
    // 分数
    setRoundScore: (round: RoundType, player1Score: number, player2Score: number) => void;
    resetScores: () => void;
    
    // WebSocket
    setWsConnected: (connected: boolean) => void;
    setLatency: (latency: number) => void;
    
    // 房间列表
    setAvailableRooms: (rooms: RoomInfo[]) => void;
    addAvailableRoom: (room: RoomInfo) => void;
    removeAvailableRoom: (roomId: string) => void;
    
    // 错误处理
    setError: (error: string | null) => void;
    
    // 重置
    reset: () => void;
}

// ==================== Store 定义 ====================

export const usePvpStore = create<PvpState & PvpActions>()((set, get) => ({
    ...initialState,

    // ==================== 房间操作 ====================
    
    createRoom: (hostPlayer: PlayerInfo) => {
        const activePet = getActivePetInfo();
        // 🔥 修复：先设置一个临时状态，等后端返回真正的房间ID后再更新
        // 不再使用本地生成的 roomId，避免 ID 不一致问题
        const tempRoomId = 'CREATING...';
        const room: RoomInfo = {
            id: tempRoomId,
            hostPlayer: {
                ...hostPlayer,
                petType: hostPlayer.petType ?? activePet.petType,
                petStage: hostPlayer.petStage ?? activePet.petStage,
                petName: hostPlayer.petName ?? activePet.petName,
            },
            guestPlayer: null,
            status: 'waiting',
            createdAt: Date.now(),
        };
        
        set({ currentRoom: room, error: null });
        
        // 调用后端API创建房间
        const baseUrl = getApiBaseUrl();
        fetch(`${baseUrl}/pvp/rooms/create?user_id=${hostPlayer.id}&username=${encodeURIComponent(hostPlayer.username)}&${buildPetQuery()}`, {
            method: 'POST',
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.room_id) {
                // 🔥 使用后端返回的房间ID（这是唯一正确的ID）
                const updatedRoom: RoomInfo = {
                    ...room,
                    id: data.room_id,
                };
                set({ currentRoom: updatedRoom });
            } else {
                // 🔥🔥🔥 优化：显示后端返回的详细错误信息，包括已存在的房间号
                const errorMsg = data.message || '创建房间失败';
                const existingRoomId = data.room_id || null;
                
                // 如果有已存在的房间，设置到 currentRoom 中方便用户操作
                if (existingRoomId) {
                    const existingRoom: RoomInfo = {
                        id: existingRoomId,
                        hostPlayer,
                        guestPlayer: null,
                        status: 'waiting',
                        createdAt: Date.now(),
                    };
                    set({ 
                        error: errorMsg, 
                        currentRoom: existingRoom,
                        // 🔥 标记这是已存在的房间
                        existingRoomId: existingRoomId
                    });
                } else {
                    set({ error: errorMsg, currentRoom: null });
                }
            }
        })
        .catch(err => {
            console.error('[PvpStore] 创建房间失败:', err);
            set({ error: '创建房间失败，请重试', currentRoom: null });
        });
        
        return tempRoomId; // 返回临时ID，实际ID会通过 store 更新
    },
    
    joinRoom: (roomId: string, player: PlayerInfo) => {
        const activePet = getActivePetInfo();
        // 调用后端API加入房间
        const baseUrl = getApiBaseUrl();
        // 🔥 确保 user_id 是数字
        const userId = parseInt(player.id, 10) || 0;
        const url = `${baseUrl}/pvp/rooms/${roomId}/join?user_id=${userId}&username=${encodeURIComponent(player.username)}&${buildPetQuery()}`;
        
        // 🔥 添加超时控制器
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        fetch(url, {
            method: 'POST',
            signal: controller.signal,
        })
        .then(res => {
            clearTimeout(timeoutId);
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(data.detail || '加入房间失败');
                });
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                // 客人加入房间成功，设置房间信息
                const room: RoomInfo = {
                    id: roomId,
                    hostPlayer: { 
                        id: data.host_id?.toString() || 'host', 
                        username: data.host_name || '房主', 
                        avatar: '🎮', 
                        level: 1, 
                        skills: [],
                        petType: data.host_pet_type || 'code_kitty',
                        petStage: data.host_pet_stage || 3,
                        petName: data.host_pet_name || '房主伙伴',
                    },
                    guestPlayer: {
                        ...player,
                        petType: player.petType ?? activePet.petType,
                        petStage: player.petStage ?? activePet.petStage,
                        petName: player.petName ?? activePet.petName,
                    }, // 自己是客人
                    status: 'ready',
                    createdAt: Date.now(),
                };
                set({ currentRoom: room, error: null });
            }
        })
        .catch(err => {
            clearTimeout(timeoutId);
            // 🔥 区分超时和其他错误
            if (err.name === 'AbortError') {
                console.error('[PvpStore] 加入房间超时');
                set({ error: '服务器响应超时，请重试' });
            } else {
                console.error('[PvpStore] 加入房间失败:', err);
                set({ error: err.message || '加入房间失败' });
            }
        });
        
        // 返回true表示请求已发送（实际结果异步处理）
        return true;
    },
    
    leaveRoom: () => {
        const { currentRoom, availableRooms } = get();
        
        if (currentRoom) {
            set({
                currentRoom: null,
                availableRooms: availableRooms.filter(r => r.id !== currentRoom.id),
                localPlayer: null,
                remotePlayer: null,
                currentRound: null,
                roundNumber: 0,
            });
        }
    },
    
    setRoomStatus: (status: RoomInfo['status']) => {
        const { currentRoom } = get();
        if (currentRoom) {
            set({
                currentRoom: { ...currentRoom, status },
            });
        }
    },
    
    // ==================== AI 对战 ====================
    
    startAIBattle: (hostPlayer: PlayerInfo, difficulty: 'easy' | 'medium' | 'hard') => {
        const aiOpponent = createAIOpponent(difficulty);
        const roomId = generateRoomId();
        
        const room: RoomInfo = {
            id: roomId,
            hostPlayer,
            guestPlayer: aiOpponent,
            status: 'ready',
            createdAt: Date.now(),
        };
        
        set({
            currentRoom: room,
            error: null,
        });
        
        // 初始化玩家状态
        get().initializePlayerStates(hostPlayer, aiOpponent);
    },
    
    // ==================== 对战状态 ====================
    
    setCurrentRound: (round: RoundType | null) => {
        set({ currentRound: round });
    },
    
    nextRound: () => {
        const { roundNumber } = get();
        const rounds: RoundType[] = ['battle', 'quiz', 'coding'];
        
        if (roundNumber < 3) {
            const nextRoundNumber = roundNumber + 1;
            set({
                roundNumber: nextRoundNumber,
                currentRound: rounds[nextRoundNumber - 1],
            });
        } else {
            // 所有轮次完成
            set({
                currentRound: null,
            });
        }
    },
    
    // ==================== 玩家状态 ====================
    
    updateLocalPlayer: (state: Partial<PlayerState>) => {
        const { localPlayer } = get();
        if (localPlayer) {
            set({
                localPlayer: { ...localPlayer, ...state },
            });
        }
    },
    
    updateRemotePlayer: (state: Partial<PlayerState>) => {
        const { remotePlayer } = get();
        if (remotePlayer) {
            set({
                remotePlayer: { ...remotePlayer, ...state },
            });
        }
    },
    
    initializePlayerStates: (player1: PlayerInfo, player2: PlayerInfo | AIOpponent) => {
        const localPlayerState: PlayerState = {
            id: player1.id,
            x: 100,
            y: 500,
            hp: 100,
            maxHp: 100,
            velocityX: 0,
            velocityY: 0,
            isAttacking: false,
            facingRight: true,
            skills: player1.skills,
            isInvincible: false,
            damageDealt: 0,
        };
        
        const remotePlayerState: PlayerState = {
            id: isAIOpponent(player2) ? player2.id : player2.id,
            x: 1500,
            y: 500,
            hp: 100,
            maxHp: 100,
            velocityX: 0,
            velocityY: 0,
            isAttacking: false,
            facingRight: false,
            skills: isAIOpponent(player2) ? [] : player2.skills,
            isInvincible: false,
            damageDealt: 0,
        };
        
        set({
            localPlayer: localPlayerState,
            remotePlayer: remotePlayerState,
        });
    },
    
    // ==================== 分数 ====================
    
    setRoundScore: (round: RoundType, player1Score: number, player2Score: number) => {
        const { roundScores } = get();
        set({
            roundScores: {
                ...roundScores,
                [round]: { player1: player1Score, player2: player2Score },
            },
        });
    },
    
    resetScores: () => {
        set({ roundScores: initialRoundScores });
    },
    
    // ==================== WebSocket ====================
    
    setWsConnected: (connected: boolean) => {
        set({ wsConnected: connected });
    },
    
    setLatency: (latency: number) => {
        set({ latency });
    },
    
    // ==================== 房间列表 ====================
    
    setAvailableRooms: (rooms: RoomInfo[]) => {
        set({ availableRooms: rooms });
    },
    
    addAvailableRoom: (room: RoomInfo) => {
        const { availableRooms } = get();
        if (!availableRooms.find(r => r.id === room.id)) {
            set({ availableRooms: [...availableRooms, room] });
        }
    },
    
    removeAvailableRoom: (roomId: string) => {
        const { availableRooms } = get();
        set({ availableRooms: availableRooms.filter(r => r.id !== roomId) });
    },
    
    // ==================== 错误处理 ====================
    
    setError: (error: string | null) => {
        set({ error });
    },
    
    // ==================== 重置 ====================
    
    reset: () => {
        set(initialState);
    },
}));

// ==================== 辅助函数 ====================

/**
 * 检查是否可以开始对战
 * 两个玩家都在房间中且房间状态为 ready
 */
export function canStartBattle(room: RoomInfo | null): boolean {
    if (!room) return false;
    if (!room.hostPlayer) return false;
    if (!room.guestPlayer) return false;
    if (room.status !== 'ready') return false;
    return true;
}

/**
 * 检查房间是否可以加入
 */
export function canJoinRoom(room: RoomInfo): boolean {
    return room.status === 'waiting' && room.guestPlayer === null;
}
