/**
 * AI智能题目生成 - API客户端
 */

import { getApiBaseUrl } from '@/lib/config/api';
import type { 
  GenerateQuestionsRequest, 
  GenerateQuestionsResponse,
  GeneratedQuestion 
} from '@/types/aiQuestion';

const getApiUrl = () => `${getApiBaseUrl()}/ai/questions`;

/**
 * 生成AI题目
 */
export async function generateQuestions(
  request: GenerateQuestionsRequest,
  token: string
): Promise<GenerateQuestionsResponse> {
  const response = await fetch(`${getApiUrl()}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      grade: request.grade,
      subjects: request.subjects,
      difficulty: request.difficulty,
      count: request.count,
      extra_prompt: request.extraPrompt || '',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new Error(error.detail || '生成题目失败');
  }

  return response.json();
}

/**
 * 检查AI服务状态
 */
export async function checkAIStatus(): Promise<{ available: boolean; model: string | null }> {
  try {
    const response = await fetch(`${getApiUrl()}/status`);
    if (!response.ok) {
      return { available: false, model: null };
    }
    return response.json();
  } catch {
    return { available: false, model: null };
  }
}

/**
 * 将AI生成的题目转换为编辑器题目格式
 */
export function convertToEditorQuestion(
  question: GeneratedQuestion,
  index: number
): {
  id: string;
  type: 'choice' | 'fill';
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: 1 | 2 | 3;
} {
  return {
    id: `ai-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    type: question.type,
    question: question.question,
    options: question.options,
    answer: question.answer,
    explanation: question.explanation || undefined,
    difficulty: question.difficulty as 1 | 2 | 3,
  };
}
