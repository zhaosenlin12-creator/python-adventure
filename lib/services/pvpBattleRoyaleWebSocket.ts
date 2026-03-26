import { getWebSocketUrl } from '@/lib/config/api';
import { useAuthStore } from '@/store/authStore';

type RoyaleMessageHandler = (message: any) => void;

interface BattleRoyaleWebSocketConfig {
  roomId: string;
  userId: number;
  onMessage?: RoyaleMessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (event: Event) => void;
}

export class BattleRoyaleWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly config: BattleRoyaleWebSocketConfig;
  private manualClose = false;

  constructor(config: BattleRoyaleWebSocketConfig) {
    this.config = config;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('Missing auth token for battle royale websocket');
    }

    const wsUrl = `${getWebSocketUrl(
      `/api/v1/pvp-br/ws/${this.config.roomId}/${this.config.userId}`,
    )}?token=${encodeURIComponent(token)}`;

    this.manualClose = false;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.startHeartbeat();
      this.config.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.config.onMessage?.(message);
      } catch (error) {
        console.error('[BattleRoyaleWebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (event) => {
      this.config.onError?.(event);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;
      this.config.onDisconnect?.();

      if (!this.manualClose) {
        this.reconnectTimer = setTimeout(() => this.connect(), 2000);
      }
    };
  }

  disconnect() {
    this.manualClose = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendRaw({ type: 'ping' });
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendRaw(payload: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify(payload));
  }

  sendInput(payload: Record<string, unknown>) {
    this.sendRaw({ type: 'br_input', payload });
  }

  sendSnapshot(payload: Record<string, unknown>) {
    this.sendRaw({ type: 'br_snapshot', payload });
  }

  sendQuizOffer(targetUserId: number, payload: Record<string, unknown>) {
    this.sendRaw({ type: 'br_quiz_offer', target_user_id: targetUserId, payload });
  }

  sendQuizResult(targetUserId: number, payload: Record<string, unknown>) {
    this.sendRaw({ type: 'br_quiz_result', target_user_id: targetUserId, payload });
  }

  sendQuizSubmit(payload: Record<string, unknown>) {
    this.sendRaw({ type: 'br_quiz_submit', payload });
  }

  sendNotice(payload: Record<string, unknown>) {
    this.sendRaw({ type: 'br_room_notice', payload });
  }

  sendMatchEnd(payload: Record<string, unknown>) {
    this.sendRaw({ type: 'br_match_end', payload });
  }
}
