/**
 * 💰 金币 API
 * 与服务器同步金币相关操作
 */

import { getApiBaseUrl } from '@/lib/config/api';

// 动态获取API基础URL，支持局域网访问
function getApiBase(): string {
  return getApiBaseUrl();
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
  token: string
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
      description
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
  
  const response = await fetch(`${getApiBase()}/coins/balance`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get balance: ${response.statusText}`);
  }
  
  const data = await response.json();
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
  
  const response = await fetch(`${getApiBase()}/coins/history?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get history: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.transactions || [];
}
