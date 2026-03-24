/**
 * 前端错误监控服务
 * 自动捕获JS错误、Promise rejection，上报到后端
 */

import { reportError, getCurrentUserId, type ErrorLogData } from '@/lib/api/errorLog';

// 防止重复上报同一错误
const reportedErrors = new Set<string>();
const MAX_REPORTED_ERRORS = 100;

// 错误上报节流：同一错误5分钟内只上报一次
const ERROR_THROTTLE_MS = 5 * 60 * 1000;

/**
 * 生成错误指纹（用于去重）
 */
function getErrorFingerprint(message: string, stack?: string): string {
  const stackFirstLine = stack?.split('\n')[1]?.trim() || '';
  return `${message}|${stackFirstLine}`;
}

/**
 * 检查是否应该上报此错误
 */
function shouldReport(fingerprint: string): boolean {
  if (reportedErrors.has(fingerprint)) {
    return false;
  }
  
  // 清理过多的记录
  if (reportedErrors.size >= MAX_REPORTED_ERRORS) {
    reportedErrors.clear();
  }
  
  reportedErrors.add(fingerprint);
  
  // 5分钟后允许再次上报
  setTimeout(() => {
    reportedErrors.delete(fingerprint);
  }, ERROR_THROTTLE_MS);
  
  return true;
}

/**
 * 过滤不需要上报的错误
 */
function shouldIgnoreError(message: string): boolean {
  const ignorePatterns = [
    // 浏览器扩展错误
    /extension/i,
    /chrome-extension/i,
    /moz-extension/i,
    // 第三方脚本错误
    /Script error/i,
    // 网络错误（通常是用户网络问题）
    /Failed to fetch/i,
    /NetworkError/i,
    /Load failed/i,
    // ResizeObserver 错误（无害）
    /ResizeObserver loop/i,
    // 取消的请求
    /AbortError/i,
    /The operation was aborted/i,
  ];
  
  return ignorePatterns.some(pattern => pattern.test(message));
}

/**
 * 上报错误（带去重和过滤）
 */
async function reportErrorWithFilter(data: Omit<ErrorLogData, 'user_agent' | 'page_url'> & { page_url?: string }): Promise<void> {
  // 过滤不需要上报的错误
  if (shouldIgnoreError(data.error_message)) {
    return;
  }
  
  // 去重检查
  const fingerprint = getErrorFingerprint(data.error_message, data.error_stack);
  if (!shouldReport(fingerprint)) {
    return;
  }
  
  // 添加用户ID
  const userId = getCurrentUserId();
  
  await reportError({
    ...data,
    page_url: data.page_url || (typeof window !== 'undefined' ? window.location.href : ''),
    user_id: userId,
  });
}

/**
 * 初始化错误监控
 * 在应用启动时调用一次
 */
export function initErrorMonitor(): void {
  if (typeof window === 'undefined') return;
  
  // 检测是否为生产环境
  const isProduction = 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1' &&
    !window.location.hostname.startsWith('192.168.');
  
  // 只在生产环境启用错误上报
  if (!isProduction) {
    return;
  }
  
  // 捕获未处理的JS错误
  window.addEventListener('error', (event) => {
    const { message, filename, lineno, colno, error } = event;
    
    reportErrorWithFilter({
      error_message: message || 'Unknown error',
      error_stack: error?.stack || `at ${filename}:${lineno}:${colno}`,
      error_type: 'js_error',
      extra_data: {
        filename,
        lineno,
        colno,
      },
    });
  });
  
  // 捕获未处理的Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    let message = 'Unhandled Promise Rejection';
    let stack: string | undefined;
    
    if (reason instanceof Error) {
      message = reason.message;
      stack = reason.stack;
    } else if (typeof reason === 'string') {
      message = reason;
    } else if (reason && typeof reason === 'object') {
      message = JSON.stringify(reason).slice(0, 500);
    }
    
    reportErrorWithFilter({
      error_message: message,
      error_stack: stack,
      error_type: 'promise_rejection',
    });
  });
  
}

/**
 * 手动上报React组件错误
 * 供ErrorBoundary调用
 */
export function reportReactError(
  error: Error,
  errorInfo: { componentStack?: string },
  componentName?: string
): void {
  reportErrorWithFilter({
    error_message: error.message,
    error_stack: error.stack,
    error_type: 'react_error',
    extra_data: {
      componentStack: errorInfo.componentStack?.slice(0, 2000),
      componentName,
    },
  });
}

/**
 * 手动上报API错误
 */
export function reportApiError(
  url: string,
  status: number,
  message: string,
  extra?: Record<string, unknown>
): void {
  reportErrorWithFilter({
    error_message: `API Error: ${status} - ${message}`,
    error_type: 'api_error',
    extra_data: {
      url,
      status,
      ...extra,
    },
  });
}

export default {
  init: initErrorMonitor,
  reportReactError,
  reportApiError,
};
