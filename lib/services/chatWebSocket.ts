/**
 * 聊天 WebSocket 服务
 */

import { ChatWsMessage, SendMessageRequest } from '@/types/chat';
import { getWebSocketUrl } from '@/lib/config/api';

type MessageHandler = (message: ChatWsMessage) => void;

interface ChatWebSocketConfig {
  userId: number;
  onMessage?: MessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private config: ChatWebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isManualClose = false;
  private hasLoggedConnectionFailure = false;

  constructor(config: ChatWebSocketConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.isManualClose = false;

    try {
      // 使用 getWebSocketUrl 获取正确的 WebSocket URL
      const wsUrl = getWebSocketUrl(`/api/v1/chat/ws/${this.config.userId}`);
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.logConnectionFailure('[ChatWebSocket] Connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.hasLoggedConnectionFailure = false;
      this.startHeartbeat();
      this.config.onConnect?.();
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.stopHeartbeat();
      this.config.onDisconnect?.();
      
      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.logConnectionFailure('[ChatWebSocket] 连接失败，将自动重试');
      this.config.onError?.(error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ChatWsMessage = JSON.parse(event.data);
        this.config.onMessage?.(message);
      } catch (error) {
        console.error('[ChatWebSocket] Failed to parse message:', error);
      }
    };
  }

  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logConnectionFailure('[ChatWebSocket] 已停止重连，请确认后端服务已启动');
      return;
    }

    this.clearReconnectTimer();
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, 3000);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    // 🔥 心跳间隔改为15秒，确保在服务器20秒超时前发送
    this.heartbeatTimer = setInterval(() => {
      this.sendPing();
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendPing(): void {
    this.send({ type: 'ping' });
  }

  private logConnectionFailure(message: string, error?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      if (!this.hasLoggedConnectionFailure) {
        console.debug(message, error ?? '');
        this.hasLoggedConnectionFailure = true;
      }
      return;
    }

    console.warn(message, error ?? '');
  }

  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[ChatWebSocket] Cannot send: not connected');
      return;
    }
    this.ws.send(JSON.stringify(data));
  }

  sendMessage(content: string, receiverId?: number | null): void {
    const request: SendMessageRequest = {
      type: 'send_message',
      content,
      receiver_id: receiverId,
    };
    this.send(request);
  }

  requestOnlineUsers(): void {
    this.send({ type: 'get_online_users' });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 单例管理
let chatClient: ChatWebSocketClient | null = null;

export function createChatWebSocket(config: ChatWebSocketConfig): ChatWebSocketClient {
  if (chatClient) {
    chatClient.disconnect();
  }
  chatClient = new ChatWebSocketClient(config);
  return chatClient;
}

export function getChatWebSocket(): ChatWebSocketClient | null {
  return chatClient;
}

export function disconnectChatWebSocket(): void {
  if (chatClient) {
    chatClient.disconnect();
    chatClient = null;
  }
}
