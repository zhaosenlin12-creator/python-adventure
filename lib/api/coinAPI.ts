/**
 * 💰 金币 API
 * 与服务器同步金币相关操作
 */

import { getApiBaseUrl } from '@/lib/config/api';

// 动态获取API基础URL，支持局域网访问
function getApiBase(): string {
  return getApiBaseUrl();
}

const TRANSIENT_HTTP_STATUS = new Set([429, 502, 503, 504]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ReadApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'ReadApiError';
  }
}

async function fetchReadWithRetry<T>(
  url: string,
  token: string,
  errorPrefix: string,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 401) {
        throw new ReadApiError(`${errorPrefix}: unauthorized`, 401);
      }

      if (TRANSIENT_HTTP_STATUS.has(response.status) && attempt < maxAttempts - 1) {
        const backoffMs = 180 * (attempt + 1) + Math.floor(Math.random() * 80);
        await wait(backoffMs);
        continue;
      }

      const errorText = await response.text();
      throw new ReadApiError(
        `${errorPrefix}: ${response.status} ${errorText || response.statusText}`,
        response.status
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof ReadApiError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      if (attempt < maxAttempts - 1) {
        const backoffMs = 180 * (attempt + 1) + Math.floor(Math.random() * 80);
        await wait(backoffMs);
        continue;
      }
    }
  }

  throw lastError ?? new Error(`${errorPrefix}: unknown error`);
}

/**
 * 向服务器添加金币
 * @param amount 金币数量
 * @param source 来源 (如 'level_complete', 'daily_login', 'arena')
 * @param description 描述信息
 * @param token 用户认证token
 */
export async function addCoinsToServer(
  amount: number,
  source: string,
  description: string,
  token: string,
  transactionId?: string
): Promise<{ success: boolean; balance: number; coins_earned: number }> {
  if (!token) {
    throw new Error('No token provided');
  }
  
  const response = await fetch(`${getApiBase()}/coins/add`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount,
      type: 'earn',
      source,
      description,
      ...(transactionId ? { transaction_id: transactionId } : {})
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add coins: ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  return {
    success: true,
    balance: data.balance || data.coins || 0,
    coins_earned: amount
  };
}

/**
 * 获取用户金币余额
 * @param token 用户认证token
 */
export async function getCoinsBalance(token: string): Promise<number> {
  if (!token) {
    return 0;
  }

  const data = await fetchReadWithRetry<{ coins?: number }>(
    `${getApiBase()}/coins/balance`,
    token,
    'Failed to get balance'
  );
  return data.coins || 0;
}

/**
 * 获取金币交易历史
 * @param token 用户认证token
 * @param limit 限制数量
 */
export async function getCoinsHistory(
  token: string,
  limit: number = 50
): Promise<Array<{
  id: number;
  amount: number;
  type: string;
  source: string;
  description: string | null;
  created_at: string;
}>> {
  if (!token) {
    return [];
  }

  const data = await fetchReadWithRetry<{ transactions?: Array<{
    id: number;
    amount: number;
    type: string;
    source: string;
    description: string | null;
    created_at: string;
  }> }>(
    `${getApiBase()}/coins/history?limit=${limit}`,
    token,
    'Failed to get history'
  );
  return data.transactions || [];
}
