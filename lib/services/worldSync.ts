/**
 * 开放世界WebSocket同步服务
 * 负责管理玩家位置的实时同步
 * 🔒 安全增强：支持Token认证
 */

// 生产环境禁用调试日志
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};
const expectedOfflineLog = DEBUG ? console.debug.bind(console) : console.warn.bind(console);

interface PlayerData {
    user_id: number;
    username: string;
    x: number;
    y: number;
    direction?: string;
    level?: number;
    rank_title?: string;
    pet_id?: number;
    pet_type?: string;
    pet_name?: string;
    pet_status?: string;
    pet_is_egg?: boolean;
    pet_evolution_stage?: number;
    pet_hatch_progress?: number;
    pet_level?: number;
}

interface WebSocketMessage {
    type: 'player_join' | 'player_leave' | 'player_move' | 'players_list' | 'pong';
    data: any;
}

export type WorldSyncMode = 'websocket' | 'reconnecting' | 'polling';

// 🔒 安全：获取认证Token
function getAuthToken(): string | null {
    try {
        // 动态导入避免循环依赖
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            const parsed = JSON.parse(authStorage);
            return parsed?.state?.token || null;
        }
        return null;
    } catch {
        return null;
    }
}

export class WorldSyncService {
    private ws: WebSocket | null = null;
    private userId: number;
    private mapArea: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000;
    private isConnecting = false;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private pollingInterval: NodeJS.Timeout | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private usingHttpPolling = false;
    private manualClose = false;
    private syncMode: WorldSyncMode = 'websocket';
    private lastSentPosition = { x: 0, y: 0, time: 0 };
    private throttleMs = 100; // 100ms节流
    
    // 回调函数
    private onPlayerJoin: ((player: PlayerData) => void) | null = null;
    private onPlayerLeave: ((userId: number) => void) | null = null;
    private onPlayerMove: ((player: PlayerData) => void) | null = null;
    private onPlayersList: ((players: PlayerData[]) => void) | null = null;
    private onConnected: (() => void) | null = null;
    private onDisconnected: (() => void) | null = null;
    private onModeChange: ((mode: WorldSyncMode) => void) | null = null;
    private hasLoggedConnectionFailure = false;

    constructor(userId: number, mapArea: string = "开放世界") {
        this.userId = userId;
        this.mapArea = mapArea;
    }

    private setSyncMode(mode: WorldSyncMode) {
        if (this.syncMode === mode) {
            return;
        }
        this.syncMode = mode;
        this.onModeChange?.(mode);
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * 连接WebSocket（带HTTP轮询后备）
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                debugLog('[WorldSync] Already connected');
                resolve();
                return;
            }

            if (this.isConnecting) {
                debugLog('[WorldSync] Connection in progress');
                resolve();
                return;
            }

            this.manualClose = false;
            this.isConnecting = true;
            this.clearReconnectTimer();

            // 尝试WebSocket连接
            this.tryWebSocketConnection()
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    this.logConnectionFailure('[WorldSync] WebSocket unavailable, using HTTP polling fallback', error);
                    this.startHttpPolling().then(resolve).catch(reject);
                });
        });
    }

    // 缓存后端URL，避免重复计算和日志输出
    private cachedBackendUrl: { httpUrl: string; wsUrl: string } | null = null;

    /**
     * 判断是否为生产环境
     */
    private isProduction(): boolean {
        const hostname = window.location.hostname;
        const productionHosts = ['game.codebn.cn', 'codebn.cn'];
        return productionHosts.some(h => hostname === h || hostname.endsWith('.' + h));
    }

    /**
     * 获取后端API基础URL（带缓存）
     */
    private getBackendUrl(): { httpUrl: string; wsUrl: string } {
        // 使用缓存
        if (this.cachedBackendUrl) {
            return this.cachedBackendUrl;
        }
        
        const protocol = window.location.protocol;
        const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        
        // 生产环境通过Nginx代理，不需要端口
        if (this.isProduction()) {
            const httpUrl = `${protocol}//${host}`;
            const wsUrl = `${wsProtocol}//${host}`;
            this.cachedBackendUrl = { httpUrl, wsUrl };
            return this.cachedBackendUrl;
        }
        
        // 开发环境直接访问后端端口
        const httpUrl = `${protocol}//${host}:8000`;
        const wsUrl = `${wsProtocol}//${host}:8000`;
        
        this.cachedBackendUrl = { httpUrl, wsUrl };
        return this.cachedBackendUrl;
    }

    /**
     * 尝试WebSocket连接
     * 🔒 安全增强：添加Token认证
     */
    private tryWebSocketConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                let opened = false;
                let settled = false;

                const resolveOnce = () => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    resolve();
                };

                const rejectOnce = (error: unknown) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    reject(error);
                };

                // 构建WebSocket URL
                const { wsUrl: baseWsUrl } = this.getBackendUrl();
                let wsUrl = `${baseWsUrl}/api/v1/world/ws/${this.userId}`;
                
                // 🔒 安全：添加Token参数（如果有）
                const token = getAuthToken();
                if (token) {
                    wsUrl += `?token=${encodeURIComponent(token)}`;
                }

                const socket = new WebSocket(wsUrl);
                this.ws = socket;

                // 设置超时 - 缩短到3秒，更快切换到HTTP轮询
                const timeout = setTimeout(() => {
                    if (socket.readyState !== WebSocket.OPEN) {
                        try {
                            socket.close();
                        } catch (e) {
                            // 忽略关闭错误
                        }
                        if (this.ws === socket) {
                            this.ws = null;
                        }
                        this.isConnecting = false;
                        rejectOnce(new Error('WebSocket connection timeout'));
                    }
                }, 3000); // 3秒超时

                socket.onopen = () => {
                    clearTimeout(timeout);
                    opened = true;
                    this.isConnecting = false;
                    this.clearReconnectTimer();
                    this.stopHttpPolling();
                    this.reconnectAttempts = 0;
                    this.hasLoggedConnectionFailure = false;
                    this.setSyncMode('websocket');
                    
                    // 启动心跳
                    this.startHeartbeat();
                    
                    // 请求当前在线玩家列表
                    this.requestPlayersList();
                    
                    if (this.onConnected) {
                        this.onConnected();
                    }
                    
                    resolveOnce();
                };

                socket.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('[WorldSync] Failed to parse message:', error);
                    }
                };

                socket.onerror = () => {
                    clearTimeout(timeout);
                    this.logConnectionFailure('[WorldSync] WebSocket connection failed');
                    this.isConnecting = false;
                    if (!opened) {
                        rejectOnce(new Error('WebSocket connection failed'));
                    }
                };

                socket.onclose = (event) => {
                    clearTimeout(timeout);
                    debugLog('[WorldSync] Connection closed, code:', event.code, 'reason:', event.reason);
                    if (this.ws === socket) {
                        this.ws = null;
                    }
                    this.isConnecting = false;
                    this.stopHeartbeat();

                    if (this.manualClose) {
                        return;
                    }

                    if (!opened) {
                        rejectOnce(new Error('WebSocket connection failed'));
                        return;
                    }

                    if (this.onDisconnected) {
                        this.onDisconnected();
                    }

                    this.setSyncMode('reconnecting');
                    this.attemptReconnect();
                };

            } catch (error) {
                this.logConnectionFailure('[WorldSync] Failed to create WebSocket', error);
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    private logConnectionFailure(message: string, error?: unknown) {
        if (!this.hasLoggedConnectionFailure) {
            expectedOfflineLog(message, error ?? '');
            this.hasLoggedConnectionFailure = true;
        }
    }

    /**
     * 处理WebSocket消息
     */
    private handleMessage(message: WebSocketMessage) {
        debugLog('[WorldSync] Received message:', message.type, message);
        
        switch (message.type) {
            case 'player_join':
                if (this.onPlayerJoin && message.data.user_id !== this.userId) {
                    debugLog('[WorldSync] Player joined:', message.data);
                    this.onPlayerJoin(message.data);
                }
                break;

            case 'player_leave':
                if (this.onPlayerLeave) {
                    debugLog('[WorldSync] Player left:', message.data.user_id);
                    this.onPlayerLeave(message.data.user_id);
                }
                break;

            case 'player_move':
                if (this.onPlayerMove && message.data.user_id !== this.userId) {
                    this.onPlayerMove(message.data);
                }
                break;

            case 'players_list':
                debugLog('[WorldSync] Received players list:', message.data);
                if (this.onPlayersList) {
                    // 过滤掉自己
                    const players = message.data.players.filter(
                        (p: PlayerData) => p.user_id !== this.userId
                    );
                    debugLog('[WorldSync] Filtered players (excluding self):', players);
                    this.onPlayersList(players);
                }
                break;

            case 'pong':
                break;

            default:
                console.warn('[WorldSync] Unknown message type:', message.type);
        }
    }

    /**
     * 发送位置更新（带节流优化）
     */
    sendPosition(
        x: number,
        y: number,
        direction: string = 'down',
        petData?: { pet_id?: number; pet_type?: string; pet_name?: string; pet_status?: string; pet_is_egg?: boolean; pet_evolution_stage?: number; pet_hatch_progress?: number; pet_level?: number; }
    ) {
        const now = Date.now();
        const timeSinceLastSend = now - this.lastSentPosition.time;
        const distanceMoved = Math.sqrt(
            Math.pow(x - this.lastSentPosition.x, 2) + 
            Math.pow(y - this.lastSentPosition.y, 2)
        );
        
        // 节流：只在时间间隔足够或移动距离足够大时才发送
        if (timeSinceLastSend < this.throttleMs && distanceMoved < 10) {
            return;
        }
        
        this.lastSentPosition = { x, y, time: now };
        
        // WebSocket模式
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: 'move',
                map_area: this.mapArea,
                data: {
                    user_id: this.userId,
                    x,
                    y,
                    direction,
                    ...(petData || {})
                }
            };
            this.ws.send(JSON.stringify(message));
            return;
        }

        // HTTP轮询模式 - 发送位置更新到后端
        if (this.usingHttpPolling) {
            this.sendPositionViaHttp(x, y, direction);
        }
    }

    /**
     * 主动广播宠物切换（无需等待移动）
     */
    sendPetChange(petData?: { pet_id?: number; pet_type?: string; pet_name?: string; pet_status?: string; pet_is_egg?: boolean; pet_evolution_stage?: number; pet_hatch_progress?: number; pet_level?: number; }) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: 'pet_change',
                map_area: this.mapArea,
                data: {
                    user_id: this.userId,
                    ...(petData || {})
                }
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * 通过HTTP发送位置更新
     * 🔒 安全增强：添加认证头
     */
    private async sendPositionViaHttp(x: number, y: number, direction: string) {
        try {
            const { httpUrl } = this.getBackendUrl();
            const apiUrl = `${httpUrl}/api/v1/world/update-location`;
            
            // 🔒 获取认证Token
            const token = getAuthToken();
            if (!token) {
                return;
            }
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };
            
            await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    x,
                    y,
                    map_area: this.mapArea,
                    direction
                })
            });
        } catch (error) {
            // 静默失败，不影响游戏体验
            console.debug('[WorldSync] HTTP position update failed (silent):', error);
        }
    }

    /**
     * 请求当前在线玩家列表
     */
    requestPlayersList() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const message = {
                type: 'request_players',
                map_area: this.mapArea
            };
            
            this.ws.send(JSON.stringify(message));
            debugLog('[WorldSync] Requested players list');
        }
    }

    /**
     * 启动心跳
     */
    private startHeartbeat() {
        this.stopHeartbeat();
        
        // 🔥 每15秒发送一次ping心跳，确保连接存活
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                // 发送ping心跳
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 15000); // 每15秒一次
    }

    /**
     * 停止心跳
     */
    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * 尝试重连
     */
    private attemptReconnect() {
        if (this.manualClose) {
            return;
        }
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            debugLog('[WorldSync] Max reconnect attempts reached, falling back to HTTP polling');
            // 🔥 达到最大重连次数后，切换到HTTP轮询而不是放弃
            void this.startHttpPolling();
            return;
        }

        this.reconnectAttempts++;
        this.setSyncMode('reconnecting');
        // 🔥 使用指数退避策略，避免频繁重连
        const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 15000);
        debugLog(`[WorldSync] Reconnecting in ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.tryWebSocketConnection().catch(error => {
                this.logConnectionFailure('[WorldSync] Reconnect failed', error);
                this.attemptReconnect();
            });
        }, delay);
    }

    /**
     * 断开连接
     */
    disconnect() {
        debugLog('[WorldSync] Disconnecting...');
        
        this.manualClose = true;
        this.clearReconnectTimer();
        this.stopHeartbeat();
        this.stopHttpPolling();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.reconnectAttempts = this.maxReconnectAttempts; // 阻止自动重连
    }

    /**
     * 设置回调函数
     */
    setCallbacks(callbacks: {
        onPlayerJoin?: (player: PlayerData) => void;
        onPlayerLeave?: (userId: number) => void;
        onPlayerMove?: (player: PlayerData) => void;
        onPlayersList?: (players: PlayerData[]) => void;
        onConnected?: () => void;
        onDisconnected?: () => void;
        onModeChange?: (mode: WorldSyncMode) => void;
    }) {
        this.onPlayerJoin = callbacks.onPlayerJoin || null;
        this.onPlayerLeave = callbacks.onPlayerLeave || null;
        this.onPlayerMove = callbacks.onPlayerMove || null;
        this.onPlayersList = callbacks.onPlayersList || null;
        this.onConnected = callbacks.onConnected || null;
        this.onDisconnected = callbacks.onDisconnected || null;
        this.onModeChange = callbacks.onModeChange || null;
    }

    /**
     * 检查连接状态
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN || this.usingHttpPolling;
    }

    /**
     * 启动HTTP轮询（WebSocket后备方案）
     */
    private async startHttpPolling() {
        debugLog('[WorldSync] Starting HTTP polling fallback');
        if (this.usingHttpPolling && this.pollingInterval) {
            return;
        }
        this.clearReconnectTimer();
        this.usingHttpPolling = true;
        this.isConnecting = false;
        this.setSyncMode('polling');

        if (this.onConnected) {
            this.onConnected();
        }

        // 立即请求一次玩家列表
        await this.pollPlayersList();

        // 启动定期轮询（降低频率以减少性能开销）
        this.pollingInterval = setInterval(async () => {
            await this.pollPlayersList();
        }, 3000); // 每3秒轮询一次
    }

    /**
     * HTTP轮询获取玩家列表
     * 🔒 安全增强：添加认证头
     */
    private async pollPlayersList() {
        try {
            const { httpUrl } = this.getBackendUrl();
            const apiUrl = `${httpUrl}/api/v1/world/nearby-players/${this.userId}?map_area=${encodeURIComponent(this.mapArea)}`;

            // 🔒 获取认证Token
            const token = getAuthToken();
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(apiUrl, { headers });
            if (response.ok) {
                const data = await response.json();
                if (this.onPlayersList && data.players) {
                    // 过滤掉自己
                    const players = data.players.filter((p: PlayerData) => p.user_id !== this.userId);
                    this.onPlayersList(players);
                }
            }
        } catch (error) {
            console.debug('[WorldSync] HTTP polling failed (will retry):', error);
        }
    }

    /**
     * 停止HTTP轮询
     */
    private stopHttpPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.usingHttpPolling = false;
    }
}

// 导出单例（可选）
let worldSyncInstance: WorldSyncService | null = null;

export function getWorldSyncInstance(userId: number, mapArea: string = "开放世界"): WorldSyncService {
    if (!worldSyncInstance || worldSyncInstance['userId'] !== userId) {
        worldSyncInstance = new WorldSyncService(userId, mapArea);
    }
    return worldSyncInstance;
}

export function destroyWorldSyncInstance() {
    if (worldSyncInstance) {
        worldSyncInstance.disconnect();
        worldSyncInstance = null;
    }
}
