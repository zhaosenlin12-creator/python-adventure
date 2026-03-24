/**
 * 🚀 企业级WebSocket连接管理器
 * 支持自动重连、心跳检测、连接复用
 */

type MessageHandler = (data: any) => void;
type ConnectionStateHandler = (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

interface WSConnection {
  ws: WebSocket;
  url: string;
  handlers: Set<MessageHandler>;
  stateHandlers: Set<ConnectionStateHandler>;
  reconnectAttempts: number;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  lastPingTime: number;
  latency: number;
}

// 连接池
const connections = new Map<string, WSConnection>();

// 配置常量
const CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY_BASE: 1000,   // 基础重连延迟
  RECONNECT_DELAY_MAX: 30000,   // 最大重连延迟
  HEARTBEAT_INTERVAL: 15000,    // 心跳间隔
  PING_TIMEOUT: 5000,           // ping超时时间
};

/**
 * 获取或创建WebSocket连接
 */
export function getConnection(url: string): WSConnection {
  let conn = connections.get(url);
  
  if (!conn || conn.ws.readyState === WebSocket.CLOSED) {
    conn = createConnection(url);
    connections.set(url, conn);
  }
  
  return conn;
}

/**
 * 创建新的WebSocket连接
 */
function createConnection(url: string): WSConnection {
  const conn: WSConnection = {
    ws: new WebSocket(url),
    url,
    handlers: new Set(),
    stateHandlers: new Set(),
    reconnectAttempts: 0,
    heartbeatTimer: null,
    reconnectTimer: null,
    lastPingTime: 0,
    latency: 0,
  };
  
  setupWebSocket(conn);
  return conn;
}

/**
 * 设置WebSocket事件处理
 */
function setupWebSocket(conn: WSConnection): void {
  const { ws } = conn;
  
  ws.onopen = () => {
    console.log('[WSManager] Connected:', conn.url);
    conn.reconnectAttempts = 0;
    notifyStateChange(conn, 'connected');
    startHeartbeat(conn);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // 处理心跳响应
      if (data.type === 'pong') {
        conn.latency = Date.now() - conn.lastPingTime;
        return;
      }
      
      // 分发消息给所有处理器
      conn.handlers.forEach(handler => {
        try {
          handler(data);
        } catch (e) {
          console.error('[WSManager] Handler error:', e);
        }
      });
    } catch (e) {
      console.error('[WSManager] Message parse error:', e);
    }
  };
  
  ws.onerror = (error) => {
    console.error('[WSManager] Error:', error);
    notifyStateChange(conn, 'error');
  };
  
  ws.onclose = () => {
    console.log('[WSManager] Closed:', conn.url);
    stopHeartbeat(conn);
    notifyStateChange(conn, 'disconnected');
    scheduleReconnect(conn);
  };
}

/**
 * 启动心跳
 */
function startHeartbeat(conn: WSConnection): void {
  stopHeartbeat(conn);
  
  conn.heartbeatTimer = setInterval(() => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.lastPingTime = Date.now();
      conn.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, CONFIG.HEARTBEAT_INTERVAL);
}

/**
 * 停止心跳
 */
function stopHeartbeat(conn: WSConnection): void {
  if (conn.heartbeatTimer) {
    clearInterval(conn.heartbeatTimer);
    conn.heartbeatTimer = null;
  }
}

/**
 * 调度重连
 */
function scheduleReconnect(conn: WSConnection): void {
  if (conn.reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
    console.log('[WSManager] Max reconnect attempts reached');
    return;
  }
  
  // 指数退避算法
  const delay = Math.min(
    CONFIG.RECONNECT_DELAY_BASE * Math.pow(2, conn.reconnectAttempts),
    CONFIG.RECONNECT_DELAY_MAX
  );
  
  console.log(`[WSManager] Reconnecting in ${delay}ms (attempt ${conn.reconnectAttempts + 1})`);
  notifyStateChange(conn, 'connecting');
  
  conn.reconnectTimer = setTimeout(() => {
    conn.reconnectAttempts++;
    conn.ws = new WebSocket(conn.url);
    setupWebSocket(conn);
  }, delay);
}

/**
 * 通知状态变化
 */
function notifyStateChange(conn: WSConnection, state: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
  conn.stateHandlers.forEach(handler => {
    try {
      handler(state);
    } catch (e) {
      console.error('[WSManager] State handler error:', e);
    }
  });
}

/**
 * 订阅消息
 */
export function subscribe(url: string, handler: MessageHandler): () => void {
  const conn = getConnection(url);
  conn.handlers.add(handler);
  
  return () => {
    conn.handlers.delete(handler);
  };
}

/**
 * 订阅连接状态
 */
export function subscribeState(url: string, handler: ConnectionStateHandler): () => void {
  const conn = getConnection(url);
  conn.stateHandlers.add(handler);
  
  // 立即通知当前状态
  if (conn.ws.readyState === WebSocket.OPEN) {
    handler('connected');
  } else if (conn.ws.readyState === WebSocket.CONNECTING) {
    handler('connecting');
  } else {
    handler('disconnected');
  }
  
  return () => {
    conn.stateHandlers.delete(handler);
  };
}

/**
 * 发送消息
 */
export function send(url: string, data: any): boolean {
  const conn = connections.get(url);
  
  if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
    console.warn('[WSManager] Cannot send, connection not ready');
    return false;
  }
  
  try {
    conn.ws.send(JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('[WSManager] Send error:', e);
    return false;
  }
}

/**
 * 关闭连接
 */
export function closeConnection(url: string): void {
  const conn = connections.get(url);
  
  if (conn) {
    stopHeartbeat(conn);
    
    if (conn.reconnectTimer) {
      clearTimeout(conn.reconnectTimer);
    }
    
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.close();
    }
    
    connections.delete(url);
  }
}

/**
 * 关闭所有连接
 */
export function closeAllConnections(): void {
  connections.forEach((_, url) => closeConnection(url));
}

/**
 * 获取连接延迟
 */
export function getLatency(url: string): number {
  const conn = connections.get(url);
  return conn?.latency || 0;
}

/**
 * 获取连接状态
 */
export function getConnectionState(url: string): 'connecting' | 'connected' | 'disconnected' {
  const conn = connections.get(url);
  
  if (!conn) return 'disconnected';
  
  switch (conn.ws.readyState) {
    case WebSocket.CONNECTING:
      return 'connecting';
    case WebSocket.OPEN:
      return 'connected';
    default:
      return 'disconnected';
  }
}
