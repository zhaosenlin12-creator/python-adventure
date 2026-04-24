import { getWebSocketUrl } from '@/lib/config/api';
import { useAuthStore } from '@/store/authStore';

type RoyaleMessageHandler = (message: any) => void;

interface BattleRoyaleWebSocketConfig {
  roomId: string;
  userId: number;
  onMessage?: RoyaleMessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnectAttempt?: (attempt: number, delayMs: number) => void;
  onLatencyUpdate?: (latencyMs: number) => void;
  onError?: (event: Event) => void;
  disconnectGraceMs?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
}

const SNAPSHOT_BUFFER_LIMIT_BYTES = 256_000;
const INPUT_BUFFER_LIMIT_BYTES = 128_000;
const HEARTBEAT_INTERVAL_MS = 5000;
const INITIAL_HEARTBEAT_DELAY_MS = 600;

export class BattleRoyaleWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatKickoffTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly config: BattleRoyaleWebSocketConfig;
  private manualClose = false;
  private reconnectAttempts = 0;
  private lastPingAt = 0;
  private smoothedLatencyMs = 0;
  private latencySampleCount = 0;

  constructor(config: BattleRoyaleWebSocketConfig) {
    this.config = config;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.clearReconnectTimer();

    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('Missing auth token for battle royale websocket');
    }

    const wsUrl = `${getWebSocketUrl(
      `/api/v1/pvp-br/ws/${this.config.roomId}/${this.config.userId}`,
    )}?token=${encodeURIComponent(token)}`;

    this.manualClose = false;
    const socket = new WebSocket(wsUrl);
    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket) {
        return;
      }
      this.clearDisconnectTimer();
      this.clearReconnectTimer();
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.config.onConnect?.();
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message?.type === 'pong') {
          this.handlePong();
        }
        this.config.onMessage?.(message);
      } catch (error) {
        console.error('[BattleRoyaleWebSocket] Failed to parse message:', error);
      }
    };

    socket.onerror = (event) => {
      this.config.onError?.(event);
    };

    socket.onclose = () => {
      if (this.ws !== socket) {
        return;
      }
      this.stopHeartbeat();
      this.ws = null;

      if (this.manualClose) {
        this.clearDisconnectTimer();
        return;
      }

      this.scheduleDisconnectNotice();
      this.scheduleReconnect();
    };
  }

  disconnect() {
    this.manualClose = true;
    this.stopHeartbeat();
    this.clearDisconnectTimer();
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatKickoffTimer = setTimeout(() => {
      this.heartbeatKickoffTimer = null;
      this.sendPing();
      this.heartbeatTimer = setInterval(() => {
        this.sendPing();
      }, HEARTBEAT_INTERVAL_MS);
    }, INITIAL_HEARTBEAT_DELAY_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatKickoffTimer) {
      clearTimeout(this.heartbeatKickoffTimer);
      this.heartbeatKickoffTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();
    const attempt = this.reconnectAttempts + 1;
    const baseDelay = this.config.reconnectBaseDelayMs ?? 900;
    const maxDelay = this.config.reconnectMaxDelayMs ?? 8000;
    const delayMs = Math.min(Math.round(baseDelay * Math.pow(1.8, this.reconnectAttempts)), maxDelay);
    this.reconnectAttempts = attempt;
    this.config.onReconnectAttempt?.(attempt, delayMs);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  private scheduleDisconnectNotice() {
    if (this.disconnectTimer) {
      return;
    }
    const delayMs = this.config.disconnectGraceMs ?? 1800;
    this.disconnectTimer = setTimeout(() => {
      this.disconnectTimer = null;
      if (!this.manualClose && !this.ws) {
        this.config.onDisconnect?.();
      }
    }, delayMs);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearDisconnectTimer() {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }

  private sendRaw(payload: Record<string, unknown>, maxBufferedAmount?: number): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    if (typeof maxBufferedAmount === 'number' && this.ws.bufferedAmount > maxBufferedAmount) {
      return false;
    }
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  private sendPing() {
    this.lastPingAt = Date.now();
    this.sendRaw({ type: 'ping' });
  }

  private handlePong() {
    if (!this.lastPingAt) {
      return;
    }
    const latencyMs = Math.max(0, (Date.now() - this.lastPingAt) * 0.5);
    this.latencySampleCount += 1;
    this.smoothedLatencyMs =
      this.latencySampleCount === 1 ? latencyMs : this.smoothedLatencyMs * 0.65 + latencyMs * 0.35;
    this.config.onLatencyUpdate?.(Math.round(this.smoothedLatencyMs));
  }

  sendInput(payload: Record<string, unknown>) {
    return this.sendRaw({ type: 'br_input', payload }, INPUT_BUFFER_LIMIT_BYTES);
  }

  sendSnapshot(payload: Record<string, unknown>) {
    return this.sendRaw({ type: 'br_snapshot', payload }, SNAPSHOT_BUFFER_LIMIT_BYTES);
  }

  sendPresenceState(payload: Record<string, unknown>) {
    return this.sendRaw({ type: 'br_presence_state', payload }, INPUT_BUFFER_LIMIT_BYTES);
  }

  sendBotDamage(payload: Record<string, unknown>) {
    return this.sendRaw({ type: 'br_bot_damage', payload }, INPUT_BUFFER_LIMIT_BYTES);
  }

  sendQuizOffer(targetUserId: number, payload: Record<string, unknown>) {
    return this.sendRaw({ type: 'br_quiz_offer', target_user_id: targetUserId, payload });
  }

  sendQuizResult(targetUserId: number, payload: Record<string, unknown>) {
    return this.sendRaw({ type: 'br_quiz_result', target_user_id: targetUserId, payload });
  }

  sendQuizSubmit(payload: Record<string, unknown>) {
    return this.sendRaw({ type: 'br_quiz_submit', payload });
  }

  sendNotice(payload: Record<string, unknown>) {
    return this.sendRaw({ type: 'br_room_notice', payload });
  }

  sendMatchEnd(payload: Record<string, unknown>) {
    return this.sendRaw({ type: 'br_match_end', payload });
  }
}
