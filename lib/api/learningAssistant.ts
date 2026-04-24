import { getApiBaseUrl } from "@/lib/config/api";
import { RateLimitError, rateLimitedRequest } from "@/lib/utils/rateLimiter";
import type {
  LearningAssistantRequest,
  LearningAssistantResponse,
  LearningAssistantStatus,
} from "@/types/learningAssistant";

const getApiUrl = () => `${getApiBaseUrl()}/ai/learning-assistant`;

export async function sendLearningAssistantMessage(
  request: LearningAssistantRequest,
  token: string,
): Promise<LearningAssistantResponse> {
  const doRequest = async () => {
    const response = await fetch(`${getApiUrl()}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
      throw new Error(error.detail || error.message || "AI 小伴暂时无法回复，请稍后再试。");
    }

    return response.json();
  };

  try {
    return await rateLimitedRequest("ai:learning-assistant", doRequest);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new Error(`提问太快了，请等待 ${Math.ceil(error.waitTime / 1000)} 秒后再试。`);
    }
    throw error;
  }
}

export async function getLearningAssistantStatus(token: string): Promise<LearningAssistantStatus> {
  const response = await fetch(`${getApiUrl()}/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new Error(error.detail || error.message || "AI 小伴状态获取失败。");
  }

  return response.json();
}
