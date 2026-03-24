/**
 * PVP 三轮制对战系统类型定义
 * Requirements: 1.1, 1.2, 1.3
 */

// ==================== 基础类型 ====================

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Position {
    x: number;
    y: number;
}

export interface PlayerInfo {
    id: string;
    username: string;
    avatar: string;
    level: number;
    skills: string[];
}

// ==================== 房间系统类型 ====================

export type RoomStatus = 'waiting' | 'ready' | 'in_progress' | 'finished';

export interface RoomInfo {
    id: string;
    hostPlayer: PlayerInfo;
    guestPlayer: PlayerInfo | AIOpponent | null;
    status: RoomStatus;
    createdAt: number;
    mapId?: string;
}

export interface AIOpponent {
    type: 'ai';
    id: string;
    difficulty: Difficulty;
    name: string;
    avatar: string;
}

// ==================== 玩家状态类型 ====================

export interface PlayerState {
    id: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    velocityX: number;
    velocityY: number;
    isAttacking: boolean;
    facingRight: boolean;
    skills: string[];
    isInvincible: boolean;
    damageDealt: number;
}

// ==================== 对战轮类型 ====================

export interface BattleRoundConfig {
    mapId: string;
    player1: PlayerInfo;
    player2: PlayerInfo | AIOpponent;
    timeLimit: number; // 3 minutes = 180000ms
}


export interface BattleRoundResult {
    winnerId: string | null; // null = draw
    player1Score: number;
    player2Score: number;
    player1HP: number;
    player2HP: number;
    damageDealt: { player1: number; player2: number };
    timeElapsed: number;
}

// ==================== 答题轮类型 ====================

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    difficulty: Difficulty;
    subject: string;
}

export interface QuizAnswer {
    playerId: string;
    questionId: string;
    answer: string;
    timeUsed: number; // milliseconds
    isCorrect: boolean;
}

export interface QuizRoundResult {
    player1Score: number;
    player2Score: number;
    player1Correct: number;
    player2Correct: number;
    player1AvgTime: number;
    player2AvgTime: number;
}

// ==================== 编程轮类型 ====================

export interface TestCase {
    input: string;
    expectedOutput: string;
}

export interface CodingTask {
    id: string;
    title: string;
    description: string;
    codeTemplate: string;
    expectedOutput: string;
    testCases: TestCase[];
    difficulty: Difficulty;
    timeLimit: number; // 5 minutes = 300000ms
}

export interface CodingSubmission {
    playerId: string;
    code: string;
    output: string;
    isCorrect: boolean;
    timeUsed: number;
    codeLength: number;
}

export interface CodingRoundResult {
    player1Score: number;
    player2Score: number;
    player1Completed: boolean;
    player2Completed: boolean;
    player1Time: number;
    player2Time: number;
}

// ==================== WebSocket 消息类型 ====================

export type WsMessageType =
    | 'room_create'
    | 'room_join'
    | 'room_leave'
    | 'player_ready'
    | 'player_joined'
    | 'player_left'
    | 'player_disconnected'
    | 'room_closed'
    | 'connected'
    | 'battle_start'
    | 'player_state'
    | 'player_attack'
    | 'player_damage'
    | 'projectile'
    | 'round_end'
    | 'quiz_answer'
    | 'code_submit'
    | 'game_end'
    | 'ping'
    | 'pong'
    | 'reconnect'
    | 'guest_ws_connected'  // 🔥 客人 WebSocket 已连接
    | 'player_replaced_by_ai'  // 🤖 玩家断线，AI接管
    | 'reconnect_rejected'     // 🤖 断线玩家重连被拒绝
    | 'error';              // 🔥 错误消息

export interface WsMessage<T = unknown> {
    type: WsMessageType;
    roomId: string;
    playerId: string;
    payload: T;
    timestamp: number;
    sequence?: number; // 用于检测丢包
}

// ==================== 评分相关类型 ====================

export type RoundType = 'battle' | 'quiz' | 'coding';

export interface RoundScores {
    battle: { player1: number; player2: number } | null;
    quiz: { player1: number; player2: number } | null;
    coding: { player1: number; player2: number } | null;
}

export interface TotalScoreResult {
    player1Total: number;
    player2Total: number;
    winnerId: string | null; // null = draw
    breakdown: {
        battle: { player1: number; player2: number; weight: number };
        quiz: { player1: number; player2: number; weight: number };
        coding: { player1: number; player2: number; weight: number };
    };
}

// 评分权重常量
export const SCORE_WEIGHTS = {
    battle: 0.3,
    quiz: 0.3,
    coding: 0.4,
} as const;

// ==================== PVP Store 状态类型 ====================

export interface PvpState {
    // 房间状态
    currentRoom: RoomInfo | null;
    availableRooms: RoomInfo[];
    
    // 🔥 已存在的房间ID（当创建失败时返回）
    existingRoomId: string | null;

    // 对战状态
    currentRound: RoundType | null;
    roundNumber: number; // 1, 2, 3

    // 玩家状态
    localPlayer: PlayerState | null;
    remotePlayer: PlayerState | null;

    // 分数
    roundScores: RoundScores;

    // WebSocket
    wsConnected: boolean;
    latency: number;

    // 错误状态
    error: string | null;
}

// ==================== 工具函数类型 ====================

/**
 * 生成唯一房间 ID
 * 格式: 6位大写字母数字组合
 */
export function generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 验证房间 ID 格式
 */
export function isValidRoomId(roomId: string): boolean {
    return /^[A-Z0-9]{6}$/.test(roomId);
}

/**
 * 判断是否为 AI 对手
 */
export function isAIOpponent(player: PlayerInfo | AIOpponent | null): player is AIOpponent {
    return player !== null && 'type' in player && player.type === 'ai';
}
