/**
 * 🔒 客户端频率限制器
 * 防止API滥用和重复请求
 */

interface RateLimitConfig {
  maxRequests: number;  // 最大请求数
  windowMs: number;     // 时间窗口（毫秒）
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// 不同操作类型的限制配置
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // 认证相关
  'auth:login': { maxRequests: 5, windowMs: 60000 },       // 每分钟5次
  'auth:register': { maxRequests: 3, windowMs: 300000 },   // 每5分钟3次
  'auth:reset': { maxRequests: 2, windowMs: 600000 },      // 每10分钟2次
  
  // 游戏进度
  'game:save': { maxRequests: 30, windowMs: 60000 },       // 每分钟30次
  'game:load': { maxRequests: 20, windowMs: 60000 },       // 每分钟20次
  
  // 排行榜
  'leaderboard:submit': { maxRequests: 10, windowMs: 60000 }, // 每分钟10次
  'leaderboard:fetch': { maxRequests: 30, windowMs: 60000 },  // 每分钟30次
  
  // PvP
  'pvp:create': { maxRequests: 5, windowMs: 60000 },       // 每分钟5次
  'pvp:join': { maxRequests: 10, windowMs: 60000 },        // 每分钟10次
  
  // 宠物系统
  'pet:interact': { maxRequests: 60, windowMs: 60000 },    // 每分钟60次
  'pet:feed': { maxRequests: 20, windowMs: 60000 },        // 每分钟20次
  'pet:chat': { maxRequests: 6, windowMs: 60000 },         // 每分钟6次
  'ai:learning-assistant': { maxRequests: 8, windowMs: 60000 }, // 每分钟8次

  // 聊天
  'chat:send': { maxRequests: 20, windowMs: 60000 },       // 每分钟20次
  
  // 默认
  'default': { maxRequests: 60, windowMs: 60000 },         // 每分钟60次
};

// 请求记录存储
const requestRecords = new Map<string, RequestRecord>();

/**
 * 检查是否超过频率限制
 * @returns true 如果允许请求，false 如果被限制
 */
export function checkRateLimit(action: string, identifier?: string): boolean {
  const key = identifier ? `${action}:${identifier}` : action;
  const config = RATE_LIMITS[action] || RATE_LIMITS['default'];
  const now = Date.now();
  
  let record = requestRecords.get(key);
  
  // 如果没有记录或时间窗口已过期，重置
  if (!record || now >= record.resetTime) {
    record = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    requestRecords.set(key, record);
    return true;
  }
  
  // 检查是否超限
  if (record.count >= config.maxRequests) {
    return false;
  }
  
  // 增加计数
  record.count++;
  return true;
}

/**
 * 获取剩余等待时间（毫秒）
 */
export function getRateLimitWaitTime(action: string, identifier?: string): number {
  const key = identifier ? `${action}:${identifier}` : action;
  const record = requestRecords.get(key);
  
  if (!record) return 0;
  
  const now = Date.now();
  if (now >= record.resetTime) return 0;
  
  return record.resetTime - now;
}

/**
 * 获取剩余可用请求数
 */
export function getRemainingRequests(action: string, identifier?: string): number {
  const key = identifier ? `${action}:${identifier}` : action;
  const config = RATE_LIMITS[action] || RATE_LIMITS['default'];
  const record = requestRecords.get(key);
  
  if (!record || Date.now() >= record.resetTime) {
    return config.maxRequests;
  }
  
  return Math.max(0, config.maxRequests - record.count);
}

/**
 * 重置特定操作的限制
 */
export function resetRateLimit(action: string, identifier?: string): void {
  const key = identifier ? `${action}:${identifier}` : action;
  requestRecords.delete(key);
}

/**
 * 带频率限制的请求包装器
 */
export async function rateLimitedRequest<T>(
  action: string,
  requestFn: () => Promise<T>,
  options?: {
    identifier?: string;
    onLimited?: (waitTime: number) => void;
  }
): Promise<T> {
  const { identifier, onLimited } = options || {};
  
  if (!checkRateLimit(action, identifier)) {
    const waitTime = getRateLimitWaitTime(action, identifier);
    
    if (onLimited) {
      onLimited(waitTime);
    }
    
    throw new RateLimitError(action, waitTime);
  }
  
  return requestFn();
}

/**
 * 频率限制错误
 */
export class RateLimitError extends Error {
  public readonly action: string;
  public readonly waitTime: number;
  public readonly retryAfter: Date;
  
  constructor(action: string, waitTime: number) {
    super(`Rate limit exceeded for ${action}. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    this.name = 'RateLimitError';
    this.action = action;
    this.waitTime = waitTime;
    this.retryAfter = new Date(Date.now() + waitTime);
  }
}

/**
 * 获取格式化的等待时间
 */
export function formatWaitTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}分钟`;
}

/**
 * 清理过期的记录（内存管理）
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of requestRecords) {
    if (now >= record.resetTime) {
      requestRecords.delete(key);
    }
  }
}

// 定期清理（每5分钟）
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredRecords, 5 * 60 * 1000);
}
