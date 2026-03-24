/**
 * 用户全局题库 API 客户端
 * 所有创意工坊关卡共享的题库
 */

import { getApiBaseUrl } from '@/lib/config/api';

const getApiUrl = () => `${getApiBaseUrl()}/user-questions`;

// ==================== 辅助函数 ====================

/**
 * 🔥 解析API错误响应，返回友好的错误消息
 */
function parseErrorDetail(detail: unknown, fallback: string): string {
  if (!detail) return fallback;
  
  // 字符串直接返回
  if (typeof detail === 'string') return detail;
  
  // Pydantic验证错误格式: [{loc: [...], msg: '...', type: '...'}]
  if (Array.isArray(detail)) {
    const messages = detail.map((e: { msg?: string; message?: string }) => 
      e.msg || e.message || JSON.stringify(e)
    );
    return messages.join('; ') || fallback;
  }
  
  // 对象格式
  if (typeof detail === 'object') {
    const obj = detail as { message?: string; msg?: string };
    return obj.message || obj.msg || JSON.stringify(detail);
  }
  
  return fallback;
}

// ==================== 类型定义 ====================

export interface UserQuestion {
  id: number;
  type: 'choice' | 'fill';
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: 1 | 2 | 3;
  created_at: string;
  updated_at: string;
}

export interface QuestionBankResponse {
  questions: UserQuestion[];
  total: number;
  limit: number;
}

export interface CreateQuestionRequest {
  type: 'choice' | 'fill';
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: 1 | 2 | 3;
}

export interface BatchImportResponse {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  message: string;
  current_total: number;
  limit: number;
}

// ==================== API 函数 ====================

/**
 * 获取用户题库
 */
export async function getQuestionBank(token: string): Promise<QuestionBankResponse> {
  const response = await fetch(getApiUrl(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '获取题库失败'));
  }
  
  return response.json();
}

/**
 * 随机获取题目（用于测试关卡）
 */
export async function getRandomQuestions(
  token: string,
  count: number = 10,
  difficulty?: number
): Promise<UserQuestion[]> {
  const params = new URLSearchParams({ count: count.toString() });
  if (difficulty) {
    params.append('difficulty', difficulty.toString());
  }
  
  const response = await fetch(`${getApiUrl()}/random?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '获取题目失败'));
  }
  
  return response.json();
}

/**
 * 添加题目
 */
export async function createQuestion(
  token: string,
  question: CreateQuestionRequest
): Promise<UserQuestion> {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(question),
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '添加题目失败'));
  }
  
  return response.json();
}

/**
 * 更新题目
 */
export async function updateQuestion(
  token: string,
  questionId: number,
  updates: Partial<CreateQuestionRequest>
): Promise<UserQuestion> {
  const response = await fetch(`${getApiUrl()}/${questionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '更新题目失败'));
  }
  
  return response.json();
}

/**
 * 删除单个题目
 */
export async function deleteQuestion(token: string, questionId: number): Promise<void> {
  const response = await fetch(`${getApiUrl()}/${questionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '删除题目失败'));
  }
}

/**
 * 批量删除题目
 */
export async function batchDeleteQuestions(
  token: string,
  ids: number[]
): Promise<{ success: boolean; deleted_count: number }> {
  const response = await fetch(`${getApiUrl()}/batch-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ ids }),
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '批量删除失败'));
  }
  
  return response.json();
}

/**
 * 批量导入题目（AI生成）
 */
export async function batchImportQuestions(
  token: string,
  questions: CreateQuestionRequest[]
): Promise<BatchImportResponse> {
  const response = await fetch(`${getApiUrl()}/batch-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ questions }),
  });
  
  if (response.status === 401) {
    throw new Error('LOGIN_EXPIRED');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: null }));
    throw new Error(parseErrorDetail(error.detail, '导入题目失败'));
  }
  
  return response.json();
}
