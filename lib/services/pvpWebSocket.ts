/**
 * PVP WebSocket 客户端
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * 🔒 安全增强：支持Token认证
 */

import { WsMessage, WsMessageType, PlayerState } from '../../types/pvp';
import { usePvpStore } from '../../store/pvpStore';
import { getWebSocketUrl } from '../config/api';
import { useAuthStore } from '../../store/authStore';

// ==================== 配置常量 ====================

const RECONNECT_INTERVAL = 3000; // 重连间隔 3 秒
const RECONNECT_MAX_ATTEMPTS = 10; // 最大重连次数
const HEARTBEAT_INTERVAL = 15000; // 🔧 优化：心跳间隔从5秒改为15秒，减少服务器负载
const SYNC_INTERVAL = 50; // 🔧 优化：同步间隔从16ms改为50ms（20fps），配合插值平滑显示
const LATENCY_WARNING_THRESHOLD = 200; // 延迟警告阈值 200ms
const RECONNECT_TIMEOUT = 30000; // 断线重连超时 30 秒

// ==================== 类型定义 ====================

type MessageHandler = (message: WsMessage) => void;

interface PvpWebSocketConfig {
    roomId: string;
    playerId: string;
    onMessage?: MessageHandler;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
    onLatencyWarning?: (latency: number) => void;
}

// ==================== 🔒 安全：获取认证Token ====================

function getAuthToken(): string | null {
    try {
        const authState = useAuthStore.getState();
        return authState.token || null;
    } catch {
        return null;
    }
}

// ==================== WebSocket 客户端类 ====================

export class PvpWebSocketClient {
    private ws: WebSocket | null = null;
    private config: PvpWebSocketConfig;
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private syncTimer: NodeJS.Timeout | null = null;
    private lastPingTime = 0;
    private sequence = 0;
    private isConnecting = false;
    private isManualClose = false;

    constructor(config: PvpWebSocketConfig) {
        this.config = config;
    }

    // ==================== 连接管理 ====================

    connect(): void {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.isConnecting = true;
        this.isManualClose = false;

        try {
            // 🔒 安全：构建带Token的WebSocket URL
            let wsUrl = getWebSocketUrl(`/api/v1/pvp/ws/${this.config.roomId}/${this.config.playerId}`);
            
            // 添加Token参数（如果有）
            const token = getAuthToken();
            if (token) {
                wsUrl += `?token=${encodeURIComponent(token)}`;
            }
            
            this.ws = new WebSocket(wsUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('[PvpWebSocket] Connection error:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }


    private setupEventHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            
            usePvpStore.getState().setWsConnected(true);
            this.startHeartbeat();
            
            this.config.onConnect?.();
        };

        this.ws.onclose = () => {
            this.isConnecting = false;
            
            usePvpStore.getState().setWsConnected(false);
            this.stopHeartbeat();
            this.stopSync();
            
            this.config.onDisconnect?.();
            
            if (!this.isManualClose) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('[PvpWebSocket] Error:', error);
            this.config.onError?.(error);
        };

        this.ws.onmessage = (event) => {
            try {
                const message: WsMessage = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('[PvpWebSocket] Failed to parse message:', error);
            }
        };
    }

    disconnect(): void {
        this.isManualClose = true;
        this.stopHeartbeat();
        this.stopSync();
        this.clearReconnectTimer();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        usePvpStore.getState().setWsConnected(false);
    }

    // ==================== 重连逻辑 ====================

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
            console.error('[PvpWebSocket] Max reconnect attempts reached');
            usePvpStore.getState().setError('连接失败，请重试');
            return;
        }

        this.clearReconnectTimer();
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, RECONNECT_INTERVAL);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // ==================== 心跳检测 ====================

    private startHeartbeat(): void {
        this.stopHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            this.sendPing();
        }, HEARTBEAT_INTERVAL);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private sendPing(): void {
        this.lastPingTime = Date.now();
        this.send('ping', {});
    }

    private handlePong(): void {
        const latency = Date.now() - this.lastPingTime;
        usePvpStore.getState().setLatency(latency);
        
        if (latency > LATENCY_WARNING_THRESHOLD) {
            console.warn(`[PvpWebSocket] High latency: ${latency}ms`);
            this.config.onLatencyWarning?.(latency);
        }
    }

    // ==================== 消息处理 ====================

    private handleMessage(message: WsMessage): void {
        // 🔥 所有消息都传递给外部处理器（PvpBattleRound 需要处理 player_state, player_damage, projectile）
        this.config.onMessage?.(message);
        
        // 内部处理特定消息
        switch (message.type) {
            case 'pong':
                this.handlePong();
                break;
            
            case 'player_state':
                this.handlePlayerState(message.payload as PlayerState);
                break;
            
            case 'player_damage':
                this.handlePlayerDamage(message.payload as { targetId: string; damage: number });
                break;
        }
    }

    private handlePlayerState(state: PlayerState): void {
        const { localPlayer } = usePvpStore.getState();
        
        // 更新远程玩家状态（不是本地玩家）
        if (localPlayer && state.id !== localPlayer.id) {
            usePvpStore.getState().updateRemotePlayer(state);
        }
    }

    private handlePlayerDamage(payload: { targetId: string; damage: number }): void {
        const { localPlayer, remotePlayer } = usePvpStore.getState();
        
        if (localPlayer && payload.targetId === localPlayer.id) {
            const newHp = Math.max(0, localPlayer.hp - payload.damage);
            usePvpStore.getState().updateLocalPlayer({ hp: newHp });
        } else if (remotePlayer && payload.targetId === remotePlayer.id) {
            const newHp = Math.max(0, remotePlayer.hp - payload.damage);
            usePvpStore.getState().updateRemotePlayer({ hp: newHp });
        }
    }

    // ==================== 发送消息 ====================

    send<T>(type: WsMessageType, payload: T): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[PvpWebSocket] Cannot send message: not connected');
            return;
        }

        const message: WsMessage<T> = {
            type,
            roomId: this.config.roomId,
            playerId: this.config.playerId,
            payload,
            timestamp: Date.now(),
            sequence: this.sequence++,
        };

        this.ws.send(JSON.stringify(message));
    }

    // ==================== 状态同步 ====================

    startSync(): void {
        this.stopSync();
        
        this.syncTimer = setInterval(() => {
            const { localPlayer } = usePvpStore.getState();
            if (localPlayer) {
                this.send('player_state', localPlayer);
            }
        }, SYNC_INTERVAL);
    }

    stopSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    // ==================== 便捷方法 ====================

    sendPlayerState(state: PlayerState): void {
        this.send('player_state', state);
    }

    sendAttack(): void {
        this.send('player_attack', { timestamp: Date.now() });
    }

    sendDamage(targetId: string, damage: number): void {
        this.send('player_damage', { targetId, damage });
    }

    sendQuizAnswer(questionId: string, answer: string, timeUsed: number): void {
        this.send('quiz_answer', { questionId, answer, timeUsed });
    }

    sendCodeSubmit(code: string, output: string, isCorrect: boolean): void {
        this.send('code_submit', { code, output, isCorrect, timestamp: Date.now() });
    }

    sendRoundEnd(round: string, scores: { player1: number; player2: number }): void {
        this.send('round_end', { round, scores });
    }

    sendGameEnd(winnerId: string | null, totalScores: { player1: number; player2: number }): void {
        this.send('game_end', { winnerId, totalScores });
    }

    // ==================== 状态查询 ====================

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    getLatency(): number {
        return usePvpStore.getState().latency;
    }
    
    // 🔥 更新消息处理器（用于连接复用时更新回调）
    updateMessageHandler(handler: MessageHandler): void {
        this.config.onMessage = handler;
    }
    
    // 🔥 更新连接回调
    updateCallbacks(callbacks: {
        onMessage?: MessageHandler;
        onConnect?: () => void;
        onDisconnect?: () => void;
    }): void {
        if (callbacks.onMessage) this.config.onMessage = callbacks.onMessage;
        if (callbacks.onConnect) this.config.onConnect = callbacks.onConnect;
        if (callbacks.onDisconnect) this.config.onDisconnect = callbacks.onDisconnect;
    }
}

// ==================== 单例管理 ====================

let wsClient: PvpWebSocketClient | null = null;

// 🔥 记录当前连接的房间和玩家
let currentRoomId: string | null = null;
let currentPlayerId: string | null = null;

export function createPvpWebSocket(config: PvpWebSocketConfig): PvpWebSocketClient {
    // 🔥 如果已经连接到同一个房间，复用现有连接但更新回调
    if (wsClient && currentRoomId === config.roomId && currentPlayerId === config.playerId && wsClient.isConnected()) {
        // 🔥 关键：更新消息处理器，让新组件能收到消息
        wsClient.updateCallbacks({
            onMessage: config.onMessage,
            onConnect: config.onConnect,
            onDisconnect: config.onDisconnect,
        });
        return wsClient;
    }
    
    // 🔥 如果连接到不同房间，断开旧连接
    if (wsClient && (currentRoomId !== config.roomId || currentPlayerId !== config.playerId)) {
        wsClient.disconnect();
    }
    
    currentRoomId = config.roomId;
    currentPlayerId = config.playerId;
    wsClient = new PvpWebSocketClient(config);
    return wsClient;
}

export function getPvpWebSocket(): PvpWebSocketClient | null {
    return wsClient;
}

export function disconnectPvpWebSocket(): void {
    if (wsClient) {
        wsClient.disconnect();
        wsClient = null;
        currentRoomId = null;
        currentPlayerId = null;
    }
}

// ==================== 常量导出 ====================

export const WS_CONFIG = {
    RECONNECT_INTERVAL,
    RECONNECT_MAX_ATTEMPTS,
    HEARTBEAT_INTERVAL,
    SYNC_INTERVAL,
    LATENCY_WARNING_THRESHOLD,
    RECONNECT_TIMEOUT,
} as const;
