import { getApiBaseUrl } from '@/lib/config/api';
import { rateLimitedRequest, RateLimitError } from '@/lib/utils/rateLimiter';
import type { PetChatRequest, PetChatResponse } from '@/types/petChat';

const getApiUrl = () => `${getApiBaseUrl()}/ai/pet-chat`;

export async function sendPetChat(
  request: PetChatRequest,
  token: string
): Promise<PetChatResponse> {
  const doRequest = async () => {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
      throw new Error(error.detail || '宠物暂时无法回复，请稍后再试');
    }

    return response.json();
  };

  try {
    return await rateLimitedRequest('pet:chat', doRequest);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new Error(`请求过于频繁，请等待 ${Math.ceil(error.waitTime / 1000)} 秒后再试`);
    }
    throw error;
  }
}
