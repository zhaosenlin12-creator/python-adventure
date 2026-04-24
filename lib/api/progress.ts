/**
 * API客户端 - 游戏进度相关接口
 */

import { getApiBaseUrl } from '@/lib/config/api';
import { showErrorToast } from '@/components/ui/ErrorToast';

const getApiUrl = () => getApiBaseUrl();

// 🔒 Token 过期错误类
export class TokenExpiredError extends Error {
    constructor(message: string = 'Token已过期，请重新登录') {
        super(message);
        this.name = 'TokenExpiredError';
    }
}

// 🔒 检查响应状态，处理 401 错误
async function handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
        throw new TokenExpiredError();
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(error.detail || 'Request failed');
    }
    const data = await response.json();
    if (data?.new_achievements && data.new_achievements.length > 0) {
        data.new_achievements.forEach((a: any) => {
            showErrorToast(`🏆 成就解锁：${a.title}，快去领取奖励！`, 'info');
        });
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('achievement-refresh'));
        }
    }

    return data;
}

export interface GameProgress {
    level: number;
    experience: number;
    coins: number;
    completed_levels: string[];
    skills: string[];
    inventory: string[];
    has_key: boolean;
    arena_score: number;
    arena_high_score: number;
    completed_challenges: string[];
    // 战役进度
    completed_campaigns?: string[];
    completed_campaign_levels?: string[];
    campaign_progress?: { [campaignId: string]: number };
    // 年龄分组战役进度 (v2.2.0)
    age_group_campaign_progress?: { [ageGroup: string]: { completedLevels: string[]; completedCampaigns: string[] } };
}

export interface LevelCompletion {
    level_id: string;
    score: number;
    code: string;
    time_used?: number;
}

/**
 * 保存游戏进度到云端
 * @throws {TokenExpiredError} 当 token 过期时
 */
export async function saveProgress(progress: GameProgress, token: string): Promise<any> {
    const response = await fetch(`${getApiUrl()}/progress/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(progress),
    });
    return handleResponse<any>(response);
}

/**
 * 从云端加载游戏进度
 * @throws {TokenExpiredError} 当 token 过期时
 */
export async function loadProgress(token: string): Promise<GameProgress> {
    const response = await fetch(`${getApiUrl()}/progress/load`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    return handleResponse(response);
}

/**
 * 记录关卡完成
 */
export async function completeLevel(completion: LevelCompletion, token: string): Promise<any> {
    const response = await fetch(`${getApiUrl()}/progress/level/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(completion),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to complete level');
    }

    // 🍖 发放食物奖励
    try {
        const { onLevelComplete } = await import('@/lib/utils/foodRewardHelper');
        await onLevelComplete(completion.level_id, completion.score, completion.code);
    } catch (error) {
        console.error('[Progress] Failed to grant food reward:', error);
        // 不影响关卡完成的主流程
    }

    return response.json();
}

/**
 * 获取关卡历史记录
 */
export async function getLevelHistory(levelId?: string, token?: string): Promise<any[]> {
    const url = levelId
        ? `${getApiUrl()}/progress/level/history?level_id=${levelId}`
        : `${getApiUrl()}/progress/level/history`;

    const response = await fetch(url, {
        method: 'GET',
        headers: token ? {
            'Authorization': `Bearer ${token}`,
        } : {},
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get level history');
    }

    return response.json();
}


// ========== 年龄分组战役进度 API (v2.2.0) ==========

export type AgeGroupType = 'primary-lower' | 'primary-upper' | 'junior-high';

export interface AgeGroupProgress {
    completedLevels: string[];
    completedCampaigns: string[];
}

export interface AllAgeGroupProgress {
    'primary-lower': AgeGroupProgress;
    'primary-upper': AgeGroupProgress;
    'junior-high': AgeGroupProgress;
}

/**
 * 获取指定年龄组的战役进度
 */
export async function getAgeGroupProgress(ageGroup: AgeGroupType, token: string): Promise<AgeGroupProgress> {
    const response = await fetch(`${getApiUrl()}/progress/campaign/age-group/${ageGroup}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get age group progress');
    }

    const data = await response.json();
    return {
        completedLevels: data.completed_levels || [],
        completedCampaigns: data.completed_campaigns || [],
    };
}

/**
 * 获取所有年龄组的战役进度
 */
export async function getAllAgeGroupProgress(token: string): Promise<AllAgeGroupProgress> {
    const response = await fetch(`${getApiUrl()}/progress/campaign/age-group`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get all age group progress');
    }

    const data = await response.json();
    return {
        'primary-lower': {
            completedLevels: data.primary_lower?.completedLevels || [],
            completedCampaigns: data.primary_lower?.completedCampaigns || [],
        },
        'primary-upper': {
            completedLevels: data.primary_upper?.completedLevels || [],
            completedCampaigns: data.primary_upper?.completedCampaigns || [],
        },
        'junior-high': {
            completedLevels: data.junior_high?.completedLevels || [],
            completedCampaigns: data.junior_high?.completedCampaigns || [],
        },
    };
}

/**
 * 保存指定年龄组的战役进度
 */
export async function saveAgeGroupProgress(
    ageGroup: AgeGroupType,
    progress: AgeGroupProgress,
    token: string
): Promise<AgeGroupProgress> {
    const response = await fetch(`${getApiUrl()}/progress/campaign/age-group/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            age_group: ageGroup,
            completed_levels: progress.completedLevels,
            completed_campaigns: progress.completedCampaigns,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save age group progress');
    }

    const data = await response.json();
    return {
        completedLevels: data.completed_levels || [],
        completedCampaigns: data.completed_campaigns || [],
    };
}

/**
 * 完成战役关卡
 */
export async function completeCampaignLevel(
    ageGroup: AgeGroupType,
    campaignId: string,
    levelId: string,
    token: string
): Promise<{ success: boolean; levelKey: string; completedLevels: string[] }> {
    const response = await fetch(`${getApiUrl()}/progress/campaign/age-group/complete-level`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            age_group: ageGroup,
            campaign_id: campaignId,
            level_id: levelId,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to complete campaign level');
    }

    const data = await response.json();
    return {
        success: data.success,
        levelKey: data.level_key,
        completedLevels: data.completed_levels,
    };
}

/**
 * 完成战役
 */
export async function completeCampaign(
    ageGroup: AgeGroupType,
    campaignId: string,
    token: string
): Promise<{ success: boolean; campaignId: string; completedCampaigns: string[] }> {
    const response = await fetch(`${getApiUrl()}/progress/campaign/age-group/complete-campaign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            age_group: ageGroup,
            campaign_id: campaignId,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to complete campaign');
    }

    const data = await response.json();
    return {
        success: data.success,
        campaignId: data.campaign_id,
        completedCampaigns: data.completed_campaigns,
    };
}
