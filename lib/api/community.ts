/**
 * 社区关卡 API 客户端
 * 用于社区关卡浏览、发布、点赞功能
 * 
 * Requirements: 2.1, 1.1, 3.3, 4.1
 */

import { getApiBaseUrl } from '@/lib/config/api';
import type {
  CommunityLevelSummary,
  CommunityLevelDetail,
  CommunityLevelListResponse,
  GetCommunityLevelsParams,
  PublishLevelResponse,
  UnpublishLevelResponse,
  LikeLevelResponse,
  UnlikeLevelResponse,
  RecordPlayResponse,
  PublishStatusResponse,
} from '@/types/community';

const getCommunityApiUrl = () => `${getApiBaseUrl()}/community`;
const getCustomLevelsApiUrl = () => `${getApiBaseUrl()}/custom-levels`;

// ==================== 辅助函数 ====================

/**
 * 解析API错误响应，返回友好的错误消息
 */
function parseErrorDetail(detail: unknown, fallback: string): string {
  if (!detail) return fallback;
  
  if (typeof detail === 'string') return detail;
  
  if (Array.isArray(detail)) {
    const messages = detail.map((e: { msg?: string; message?: string }) => 
      e.msg || e.message || JSON.stringify(e)
    );
    return messages.join('; ') || fallback;
  }
  
  if (typeof detail === 'object') {
    const obj = detail as { message?: string; msg?: string };
    return obj.message || obj.msg || JSON.stringify(detail);
  }
  
  return fallback;
}

// ==================== 社区浏览 API ====================

/**
 * 获取社区关卡列表
 * Requirements: 2.1 - 分页列表
 * 🔥 v2.4.6: 增强错误处理和超时机制
 */
export async function getCommunityLevels(
  params: GetCommunityLevelsParams = {},
  token?: string
): Promise<CommunityLevelListResponse> {
  const { page = 1, limit = 20, sort = 'newest' } = params;
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort,
  });
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 🔥 v2.4.6: 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时
  
  try {
    const response = await fetch(`${getCommunityApiUrl()}/levels?${queryParams}`, {
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 401) {
      throw new Error('LOGIN_EXPIRED');
    }
    
    if (response.status === 429) {
      throw new Error('请求过于频繁，请稍后再试');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: null }));
      throw new Error(parseErrorDetail(error.detail, '获取社区关卡失败，请刷新重试'));
    }
    
    const data = await response.json();
    
    // 🔥 v2.4.6: 验证返回数据格式
    return {
      levels: Array.isArray(data.levels) ? data.levels : [],
      total: typeof data.total === 'number' ? data.total : 0,
      page: typeof data.page === 'number' ? data.page : page,
      limit: typeof data.limit === 'number' ? data.limit : limit,
      has_more: typeof data.has_more === 'boolean' ? data.has_more : false,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('网络请求超时，请刷新页面重试');
    }
    throw err;
  }
}

/**
 * 获取社区关卡详情
 * Requirements: 3.1 - 加载关卡数据
 * 🔥 v2.4.6: 增强错误处理
 */
export async function getCommunityLevel(
  levelId: string,
  token?: string
): Promise<CommunityLevelDetail> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 🔥 v2.4.6: 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(`${getCommunityApiUrl()}/levels/${levelId}`, {
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 401) {
      throw new Error('LOGIN_EXPIRED');
    }
    
    if (response.status === 404) {
      throw new Error('关卡不存在或已被删除');
    }
    
    if (response.status === 429) {
      throw new Error('请求过于频繁，请稍后再试');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: null }));
      throw new Error(parseErrorDetail(error.detail, '获取关卡详情失败，请刷新重试'));
    }
    
    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('网络请求超时，请刷新页面重试');
    }
    throw err;
  }
}

// ==================== 发布/取消发布 API ====================

/**
 * 发布关卡到社区
 * Requirements: 1.1 - 发布关卡
 */
export async function publishLevel(
  levelId: string,
  token: string
): Promise<PublishLevelResponse> {
  const response = await fetch(`${getCustomLevelsApiUrl()}/${levelId}/publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (response.status === 403) {
    throw new Error('无权操作此关卡');
  }
  
  if (response.status === 404) {
    throw new Error('关卡不存在');
  }
  
  if (response.status === 400) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '发布失败'));
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '发布关卡失败'));
  }
  
  return response.json();
}

/**
 * 取消发布关卡
 * Requirements: 1.5 - 取消发布
 */
export async function unpublishLevel(
  levelId: string,
  token: string
): Promise<UnpublishLevelResponse> {
  const response = await fetch(`${getCustomLevelsApiUrl()}/${levelId}/unpublish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (response.status === 403) {
    throw new Error('无权操作此关卡');
  }
  
  if (response.status === 404) {
    throw new Error('关卡不存在');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '取消发布失败'));
  }
  
  return response.json();
}

// ==================== 游玩记录 API ====================

/**
 * 记录游玩
 * Requirements: 3.3 - 记录游玩次数
 */
export async function recordPlay(
  levelId: string,
  token?: string
): Promise<RecordPlayResponse> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${getCommunityApiUrl()}/levels/${levelId}/play`, {
    method: 'POST',
    headers,
  });
  
  if (response.status === 404) {
    throw new Error('关卡不存在');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '记录游玩失败'));
  }
  
  return response.json();
}

// ==================== 点赞 API ====================

/**
 * 点赞关卡
 * Requirements: 4.1 - 点赞功能
 */
export async function likeLevel(
  levelId: string,
  token: string
): Promise<LikeLevelResponse> {
  const response = await fetch(`${getCommunityApiUrl()}/levels/${levelId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (response.status === 404) {
    throw new Error('关卡不存在');
  }
  
  if (response.status === 400) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '点赞失败'));
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '点赞失败'));
  }
  
  return response.json();
}

/**
 * 取消点赞
 * Requirements: 4.3 - 取消点赞
 */
export async function unlikeLevel(
  levelId: string,
  token: string
): Promise<UnlikeLevelResponse> {
  const response = await fetch(`${getCommunityApiUrl()}/levels/${levelId}/like`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (response.status === 404) {
    throw new Error('关卡不存在或未点赞');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '取消点赞失败'));
  }
  
  return response.json();
}

// ==================== 发布状态 API ====================

/**
 * 获取用户发布状态
 * 返回已发布数量和最大限制
 */
export async function getPublishStatus(
  token: string
): Promise<PublishStatusResponse> {
  const response = await fetch(`${getCommunityApiUrl()}/publish-status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '获取发布状态失败'));
  }
  
  return response.json();
}
