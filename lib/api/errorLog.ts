/**
 * 错误日志上报API
 * 将前端错误上报到后端存储
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://game.codebn.cn';

export interface ErrorLogData {
  error_message: string;
  error_stack?: string;
  error_type: 'js_error' | 'promise_rejection' | 'react_error' | 'api_error';
  page_url: string;
  user_agent?: string;
  user_id?: number;
  extra_data?: Record<string, unknown>;
}

/**
 * 上报错误到后端
 * 使用 sendBeacon 确保页面关闭时也能发送
 */
export async function reportError(data: ErrorLogData): Promise<boolean> {
  try {
    const payload = {
      ...data,
      user_agent: data.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      page_url: data.page_url || (typeof window !== 'undefined' ? window.location.href : ''),
    };

    // 优先使用 sendBeacon（页面关闭时也能发送）
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const sent = navigator.sendBeacon(`${API_BASE}/api/v1/error-logs/report`, blob);
      if (sent) return true;
    }

    // 降级使用 fetch
    const response = await fetch(`${API_BASE}/api/v1/error-logs/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // 不等待响应，快速返回
      keepalive: true,
    });

    return response.ok;
  } catch {
    // 上报失败不影响用户体验，静默处理
    return false;
  }
}

/**
 * 获取当前用户ID（从localStorage）
 */
export function getCurrentUserId(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed?.state?.user?.id;
    }
  } catch {
    // 解析失败，返回undefined
  }
  return undefined;
}
