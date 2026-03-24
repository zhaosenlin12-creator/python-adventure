/**
 * API请求工具 - 带并发控制和错误处理
 */

import { getApiBaseUrl } from '@/lib/config/api';

// 使用统一的API基础URL获取函数（已包含 /api/v1）
function getApiBase(): string {
  return getApiBaseUrl();
}

// 请求队列，防止并发购买
const requestQueue = new Map<string, Promise<any>>();

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string;
  timeout?: number;
  /** 自动重试次数（默认0不重试） */
  retries?: number;
  /** 重试延迟（毫秒，默认1000） */
  retryDelay?: number;
}

/**
 * 带并发控制的API请求
 * 同一个key的请求会被合并，防止重复提交
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {},
  dedupeKey?: string
): Promise<T> {
  const {
    method = 'GET',
    body,
    token,
    timeout = 30000,
    retries = 0,
    retryDelay = 1000
  } = options;
  
  // 如果提供了dedupeKey，检查是否有正在进行的相同请求
  if (dedupeKey && requestQueue.has(dedupeKey)) {
    console.log(`[ApiRequest] Deduplicating request: ${dedupeKey}`);
    return requestQueue.get(dedupeKey)!;
  }
  
  const requestPromise = (async () => {
    let lastError: ApiError | null = null;
    
    try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const apiBase = getApiBase();
        
        if (attempt > 0) {
          console.log(`[ApiRequest] Retry ${attempt}/${retries} for ${endpoint}`);
        }
        
        const response = await fetch(`${apiBase}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { detail: errorText };
          }
          
          // 🔒 优先使用后端返回的友好 message 字段，避免 detail 包含技术细节
          const friendlyMsg =
            (typeof errorData.message === 'string' && errorData.message)
              ? errorData.message
              : (typeof errorData.detail === 'string' && errorData.detail)
                ? errorData.detail
                : `请求失败 (${response.status})`;
          const error = new ApiError(
            friendlyMsg,
            response.status,
            errorData
          );
          
          // 客户端错误(4xx)不重试
          if (error.isClientError()) {
            throw error;
          }
          
          lastError = error;
          
          // 服务器错误可以重试
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
            continue;
          }
          
          throw error;
        }
        
        return await response.json();
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof ApiError) {
          // 客户端错误不重试
          if (error.isClientError()) {
            throw error;
          }
          lastError = error;
        } else if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = new ApiError('请求超时，请稍后重试', 408);
          } else if (error.message.includes('Failed to fetch')) {
            lastError = new ApiError('网络连接失败\n请检查后端服务是否运行', 0);
          } else {
            lastError = new ApiError('未知错误', 500, error);
          }
        } else {
          lastError = new ApiError('未知错误', 500, error);
        }
        
        // 如果还有重试机会，等待后重试
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
          continue;
        }
      }
    }
    
    throw lastError || new ApiError('请求失败', 500);
    } finally {
      // 确保清理dedupe key
      if (dedupeKey) {
        requestQueue.delete(dedupeKey);
      }
    }
  })();
  
  if (dedupeKey) {
    requestQueue.set(dedupeKey, requestPromise);
  }
  
  return requestPromise;
}

/**
 * API错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
  
  isNetworkError(): boolean {
    return this.statusCode === 0;
  }
  
  isTimeout(): boolean {
    return this.statusCode === 408;
  }
  
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }
  
  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

/**
 * 重试请求
 */
export async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // 如果是客户端错误（4xx），不重试
      if (error instanceof ApiError && error.isClientError()) {
        throw error;
      }
      
      // 最后一次尝试失败，直接抛出错误
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw lastError;
}
