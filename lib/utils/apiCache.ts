/**
 * 🚀 企业级API缓存和防抖工具
 * 优化网络请求性能，减少重复请求
 */

// 缓存存储
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

// 默认缓存时间配置（毫秒）
const DEFAULT_TTL = {
  SHORT: 10 * 1000,      // 10秒 - 频繁变化的数据
  MEDIUM: 60 * 1000,     // 1分钟 - 一般数据
  LONG: 5 * 60 * 1000,   // 5分钟 - 较稳定的数据
  STATIC: 30 * 60 * 1000 // 30分钟 - 几乎不变的数据
};

/**
 * 获取缓存数据
 */
export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * 设置缓存数据
 */
export function setToCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL.MEDIUM): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

/**
 * 清除指定缓存
 */
export function clearCache(keyPattern?: string): void {
  if (!keyPattern) {
    cache.clear();
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key);
    }
  }
}

/**
 * 防抖函数 - 延迟执行，重复调用只执行最后一次
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数 - 限制执行频率
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let pendingArgs: Parameters<T> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRun >= limit) {
      lastRun = now;
      fn(...args);
    } else {
      pendingArgs = args;
      
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          if (pendingArgs) {
            lastRun = Date.now();
            fn(...pendingArgs);
            pendingArgs = null;
          }
          timeoutId = null;
        }, limit - (now - lastRun));
      }
    }
  };
}

/**
 * 带缓存的fetch请求
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl: number = DEFAULT_TTL.MEDIUM
): Promise<T> {
  const cacheKey = `fetch:${url}:${JSON.stringify(options?.body || '')}`;
  
  // 只缓存GET请求
  if (!options?.method || options.method === 'GET') {
    const cached = getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  
  // 只缓存GET请求的成功响应
  if (!options?.method || options.method === 'GET') {
    setToCache(cacheKey, data, ttl);
  }
  
  return data;
}

/**
 * 请求队列 - 防止重复请求
 */
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicatedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const key = `${options?.method || 'GET'}:${url}:${JSON.stringify(options?.body || '')}`;
  
  // 如果有相同的请求正在进行，返回相同的Promise
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }
  
  const promise = fetch(url, options)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .finally(() => {
      pendingRequests.delete(key);
    });
  
  pendingRequests.set(key, promise);
  return promise;
}

// 导出TTL常量供外部使用
export const CACHE_TTL = DEFAULT_TTL;
