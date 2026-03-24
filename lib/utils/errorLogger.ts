/**
 * 📋 错误日志系统
 * 前端错误追踪和监控
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'api' | 'ui' | 'game' | 'auth' | 'network' | 'unknown';

interface ErrorLog {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
  userId?: string;
}

interface ErrorStats {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCategory: Record<ErrorCategory, number>;
  recentErrors: ErrorLog[];
}

// 错误日志存储
const errorLogs: ErrorLog[] = [];
const MAX_LOGS = 100;  // 最大保留日志数

// 错误回调
type ErrorCallback = (error: ErrorLog) => void;
const errorCallbacks: ErrorCallback[] = [];

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取用户上下文
 */
function getUserContext(): { userId?: string; userAgent?: string; url?: string } {
  if (typeof window === 'undefined') return {};
  
  return {
    userAgent: navigator.userAgent,
    url: window.location.href,
    // userId 可以从 auth store 获取
  };
}

/**
 * 推断错误严重程度
 */
function inferSeverity(error: Error | string, category: ErrorCategory): ErrorSeverity {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();
  
  // Critical errors
  if (
    category === 'auth' ||
    lowerMessage.includes('fatal') ||
    lowerMessage.includes('critical')
  ) {
    return 'critical';
  }
  
  // High severity
  if (
    category === 'api' ||
    lowerMessage.includes('failed') ||
    lowerMessage.includes('error')
  ) {
    return 'high';
  }
  
  // Medium severity
  if (
    lowerMessage.includes('warning') ||
    lowerMessage.includes('timeout')
  ) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * 推断错误类别
 */
function inferCategory(error: Error | string): ErrorCategory {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('fetch') || lowerMessage.includes('api') || lowerMessage.includes('request')) {
    return 'api';
  }
  if (lowerMessage.includes('auth') || lowerMessage.includes('token') || lowerMessage.includes('login')) {
    return 'auth';
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('offline') || lowerMessage.includes('connection')) {
    return 'network';
  }
  if (lowerMessage.includes('render') || lowerMessage.includes('component') || lowerMessage.includes('react')) {
    return 'ui';
  }
  if (lowerMessage.includes('game') || lowerMessage.includes('phaser') || lowerMessage.includes('scene')) {
    return 'game';
  }
  
  return 'unknown';
}

/**
 * 记录错误
 */
export function logError(
  error: Error | string,
  options?: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    context?: Record<string, any>;
    userId?: string;
  }
): ErrorLog {
  const { context, userId } = options || {};
  
  const category = options?.category || inferCategory(error);
  const severity = options?.severity || inferSeverity(error, category);
  
  const errorLog: ErrorLog = {
    id: generateId(),
    timestamp: Date.now(),
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    severity,
    category,
    context,
    userId,
    ...getUserContext(),
  };
  
  // 添加到日志
  errorLogs.unshift(errorLog);
  
  // 限制日志数量
  if (errorLogs.length > MAX_LOGS) {
    errorLogs.pop();
  }
  
  // 触发回调
  errorCallbacks.forEach(cb => {
    try {
      cb(errorLog);
    } catch (e) {
      console.error('[ErrorLogger] Callback error:', e);
    }
  });
  
  // 开发环境打印
  if (process.env.NODE_ENV === 'development') {
    const severityColors = {
      low: '#888',
      medium: '#ff9800',
      high: '#f44336',
      critical: '#9c27b0',
    };
    console.group(`%c[${severity.toUpperCase()}] ${category}`, `color: ${severityColors[severity]}`);
    console.error(errorLog.message);
    if (errorLog.stack) console.log(errorLog.stack);
    if (context) console.log('Context:', context);
    console.groupEnd();
  }
  
  return errorLog;
}

/**
 * 记录API错误
 */
export function logApiError(
  endpoint: string,
  error: Error | string,
  statusCode?: number,
  requestData?: any
): ErrorLog {
  return logError(error, {
    category: 'api',
    severity: statusCode && statusCode >= 500 ? 'critical' : 'high',
    context: {
      endpoint,
      statusCode,
      requestData,
    },
  });
}

/**
 * 记录网络错误
 */
export function logNetworkError(error: Error | string): ErrorLog {
  return logError(error, {
    category: 'network',
    severity: 'high',
  });
}

/**
 * 记录UI错误
 */
export function logUIError(
  componentName: string,
  error: Error | string,
  props?: Record<string, any>
): ErrorLog {
  return logError(error, {
    category: 'ui',
    context: {
      componentName,
      props: props ? sanitizeProps(props) : undefined,
    },
  });
}

/**
 * 记录游戏错误
 */
export function logGameError(
  sceneName: string,
  error: Error | string,
  gameState?: Record<string, any>
): ErrorLog {
  return logError(error, {
    category: 'game',
    context: {
      sceneName,
      gameState,
    },
  });
}

/**
 * 清理敏感props
 */
function sanitizeProps(props: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
  
  for (const [key, value] of Object.entries(props)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'function') {
      sanitized[key] = '[Function]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = '[Object]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * 获取错误统计
 */
export function getErrorStats(): ErrorStats {
  const stats: ErrorStats = {
    total: errorLogs.length,
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    byCategory: { api: 0, ui: 0, game: 0, auth: 0, network: 0, unknown: 0 },
    recentErrors: errorLogs.slice(0, 10),
  };
  
  for (const log of errorLogs) {
    stats.bySeverity[log.severity]++;
    stats.byCategory[log.category]++;
  }
  
  return stats;
}

/**
 * 获取所有错误日志
 */
export function getErrorLogs(): ErrorLog[] {
  return [...errorLogs];
}

/**
 * 清除错误日志
 */
export function clearErrorLogs(): void {
  errorLogs.length = 0;
}

/**
 * 订阅错误事件
 */
export function onError(callback: ErrorCallback): () => void {
  errorCallbacks.push(callback);
  return () => {
    const index = errorCallbacks.indexOf(callback);
    if (index > -1) {
      errorCallbacks.splice(index, 1);
    }
  };
}

/**
 * 导出错误日志（用于上报或调试）
 */
export function exportErrorLogs(): string {
  return JSON.stringify(errorLogs, null, 2);
}

/**
 * 设置全局错误处理
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;
  
  // 未捕获的错误
  window.addEventListener('error', (event) => {
    logError(event.error || event.message, {
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
  
  // Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    logError(
      event.reason instanceof Error ? event.reason : String(event.reason),
      { severity: 'high' }
    );
  });
  
  console.log('[ErrorLogger] Global error handlers installed');
}

/**
 * React Error Boundary 辅助
 */
export function captureReactError(
  error: Error,
  errorInfo: { componentStack: string }
): ErrorLog {
  return logError(error, {
    category: 'ui',
    severity: 'high',
    context: {
      componentStack: errorInfo.componentStack,
    },
  });
}
