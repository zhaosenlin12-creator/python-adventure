import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import * as progressAPI from '@/lib/api/progress';
import { TokenExpiredError } from '@/lib/api/progress';
import { getApiBaseUrl } from '@/lib/config/api';
import { balanceXP, balanceCoins } from '@/lib/rankSystem';
import { AgeGroup } from '@/types/ageGroup';
import { throttle } from '@/lib/utils/apiCache';
import { toFriendlyMessage } from '@/lib/utils/friendlyError';
import { mergeArenaRewardMarker } from '@/lib/arenaRewards';

// 生产环境禁用调试日志
// 只在真正的本地开发环境输出调试日志
const isLocalDev = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  : process.env.NODE_ENV === 'development';
const debugLog = isLocalDev ? console.log.bind(console) : () => {};

// 🚀 节流保存 - 最多每2秒保存一次
let pendingSave = false;
const throttledSaveImpl = throttle(async (saveFunc: () => Promise<void>) => {
    if (pendingSave) return;
    pendingSave = true;
    try {
        await saveFunc();
    } finally {
        pendingSave = false;
    }
}, 2000);

// 🔒 防止竞技场重复提交（同一结果短时间内只处理一次）
let lastArenaSubmissionKey: string | null = null;
let lastArenaSubmissionAt = 0;

export interface GameState {
    xp: number;
    level: number;
    coins: number;
    inventory: string[];
    completedLevels: string[];

    // Actions
    addXp: (amount: number) => void;
    addCoins: (amount: number) => void;
    setCoins: (coins: number) => void;
    spendCoins: (amount: number) => boolean;
    unlockLevel: (levelId: string) => void;
    addToInventory: (item: string) => void;

    // Key
    hasKey: boolean;
    setHasKey: (hasKey: boolean) => void;

    // Skills
    skills: string[];
    unlockSkill: (skillId: string) => void;

    // Arena
    arenaScore: number;
    arenaHighScore: number;
    completedChallenges: string[];
    addArenaScore: (points: number) => void;
    completeChallenge: (challengeId: string) => void;
    submitScore: (data: { challengeId: string; score: number; timeUsed: number; codeLength: number }) => Promise<void>;

    // Campaigns
    completedCampaigns: string[];
    completedCampaignLevels: string[];
    campaignProgress: { [campaignId: string]: number }; // 每个战役的进度
    completeCampaign: (campaignId: string) => void;
    completeCampaignLevel: (levelId: string) => void;
    setCampaignProgress: (campaignId: string, progress: number) => void;

    // Age Group (年龄段)
    selectedAgeGroup: AgeGroup | null;
    setSelectedAgeGroup: (ageGroup: AgeGroup) => void;
    // 按年龄段存储的战役进度
    ageGroupCampaignProgress: { [ageGroup: string]: { completed: string[]; levels: string[] } };
    completeAgeGroupCampaign: (ageGroup: AgeGroup, campaignId: string) => void;
    completeAgeGroupLevel: (ageGroup: AgeGroup, levelId: string) => void;

    // Cloud Sync
    loadFromCloud: () => Promise<void>;
    saveToCloud: () => Promise<void>;
    isSyncing: boolean;
    lastSyncTime: number | null;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            xp: 0,
            level: 1,
            coins: 0,
            inventory: [],
            completedLevels: [],

            addXp: (amount) => {
                // 🔥 应用奖励平衡
                const balancedAmount = balanceXP(amount);
                set((state) => {
                    const newXp = state.xp + balancedAmount;
                    const xpToNextLevel = state.level * 100;
                    let newLevel = state.level;

                    if (newXp >= xpToNextLevel) {
                        newLevel += 1;
                    }

                    return { xp: newXp, level: newLevel };
                });
                // Auto-save to cloud after XP change
                get().saveToCloud();
            },

            addCoins: (amount) => {
                // 🔥 应用奖励平衡
                const balancedAmount = balanceCoins(amount);
                set((state) => ({ coins: state.coins + balancedAmount }));
                get().saveToCloud();
            },

            setCoins: (coins) => {
                set({ coins });
                get().saveToCloud();
            },

            spendCoins: (amount) => {
                if (amount <= 0) return true;

                let spent = false;
                set((state) => {
                    if (state.coins < amount) {
                        return state;
                    }
                    spent = true;
                    return { coins: state.coins - amount };
                });

                if (spent) {
                    get().saveToCloud();
                }

                return spent;
            },

            unlockLevel: (levelId) => {
                set((state) => ({
                    completedLevels: [...state.completedLevels, levelId]
                }));
                get().saveToCloud();
            },

            addToInventory: (item) => {
                set((state) => ({
                    inventory: [...state.inventory, item]
                }));
                get().saveToCloud();
            },

            // Key
            hasKey: false,
            setHasKey: (hasKey) => {
                set({ hasKey });
                get().saveToCloud();
            },

            skills: [],
            unlockSkill: (skillId) => {
                set((state) => {
                    if (state.skills.includes(skillId)) return state;
                    return { skills: [...state.skills, skillId] };
                });
                get().saveToCloud();
            },

            // Arena state
            arenaScore: 0,
            arenaHighScore: 0,
            completedChallenges: [],

            // Campaign state
            completedCampaigns: [],
            completedCampaignLevels: [],
            campaignProgress: {},

            // Age Group state
            selectedAgeGroup: null,
            ageGroupCampaignProgress: {},

            addArenaScore: (points) => {
                set((state) => {
                    const newScore = state.arenaScore + points;
                    const newHighScore = Math.max(newScore, state.arenaHighScore);
                    return {
                        arenaScore: newScore,
                        arenaHighScore: newHighScore
                    };
                });
                get().saveToCloud();
            },

            completeChallenge: (challengeId) => {
                set((state) => {
                    if (state.completedChallenges.includes(challengeId)) return state;
                    return {
                        completedChallenges: [...state.completedChallenges, challengeId]
                    };
                });
                get().saveToCloud();
            },

            submitScore: async (data) => {
                try {
                    const submissionKey = `${data.challengeId}:${data.score}:${data.timeUsed}:${data.codeLength}`;
                    const now = Date.now();
                    if (lastArenaSubmissionKey === submissionKey && now - lastArenaSubmissionAt < 3000) {
                        debugLog('[GameStore] Duplicate arena submission ignored:', submissionKey);
                        return;
                    }
                    lastArenaSubmissionKey = submissionKey;
                    lastArenaSubmissionAt = now;
                    const { user, token } = useAuthStore.getState();
                    if (!user || !token) return;

                    const response = await fetch(`${getApiBaseUrl()}/leaderboard/submit`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            user_id: user.id,
                            username: user.username,
                            challenge_id: data.challengeId,
                            score: data.score,
                            time_used: data.timeUsed,
                            code_length: data.codeLength
                        })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        debugLog('[GameStore] Arena score submitted:', result);

                        if (result.diamonds_earned || result.reward_marker) {
                            set((state) => ({
                                coins: state.coins + (result.diamonds_earned || 0),
                                completedChallenges: mergeArenaRewardMarker(
                                    state.completedChallenges,
                                    result.reward_marker
                                ),
                            }));
                            get().saveToCloud();
                        }

                        if (result.diamonds_earned > 0 && typeof window !== 'undefined') {
                            const { showDiamondRewardToast } = await import('@/components/ui/CoinRewardToast');
                            const rewardTip =
                                result.daily_reward_remaining > 0
                                    ? `竞技场通关 · 今日还可领 ${result.daily_reward_remaining} 次`
                                    : '竞技场通关 · 今日钻石已领满';
                            showDiamondRewardToast(result.diamonds_earned, rewardTip, 'reward');
                        }
                    } else {
                        const errorPayload = await response.json().catch(() => null);
                        console.error('[GameStore] Failed to submit arena score:', errorPayload ?? response.statusText);
                    }
                } catch (error) {
                    console.error('Failed to submit score:', error);
                }
            },

            // Campaign methods
            completeCampaign: (campaignId) => {
                set((state) => {
                    if (state.completedCampaigns.includes(campaignId)) return state;
                    return {
                        completedCampaigns: [...state.completedCampaigns, campaignId]
                    };
                });
                get().saveToCloud();
            },

            completeCampaignLevel: (levelId) => {
                set((state) => {
                    if (state.completedCampaignLevels.includes(levelId)) return state;
                    return {
                        completedCampaignLevels: [...state.completedCampaignLevels, levelId]
                    };
                });
                get().saveToCloud();
            },

            setCampaignProgress: (campaignId, progress) => {
                set((state) => ({
                    campaignProgress: {
                        ...state.campaignProgress,
                        [campaignId]: progress
                    }
                }));
                get().saveToCloud();
            },

            // Age Group methods
            setSelectedAgeGroup: (ageGroup) => {
                set({ selectedAgeGroup: ageGroup });
            },

            completeAgeGroupCampaign: (ageGroup, campaignId) => {
                set((state) => {
                    const current = state.ageGroupCampaignProgress[ageGroup] || { completed: [], levels: [] };
                    if (current.completed.includes(campaignId)) return state;
                    return {
                        ageGroupCampaignProgress: {
                            ...state.ageGroupCampaignProgress,
                            [ageGroup]: {
                                ...current,
                                completed: [...current.completed, campaignId]
                            }
                        },
                        // 同时更新旧格式以保持兼容
                        completedCampaigns: [...state.completedCampaigns, `${ageGroup}:${campaignId}`]
                    };
                });
                get().saveToCloud();
            },

            completeAgeGroupLevel: (ageGroup, levelId) => {
                set((state) => {
                    const current = state.ageGroupCampaignProgress[ageGroup] || { completed: [], levels: [] };
                    if (current.levels.includes(levelId)) return state;
                    return {
                        ageGroupCampaignProgress: {
                            ...state.ageGroupCampaignProgress,
                            [ageGroup]: {
                                ...current,
                                levels: [...current.levels, levelId]
                            }
                        },
                        // 同时更新旧格式以保持兼容
                        completedCampaignLevels: [...state.completedCampaignLevels, `${ageGroup}:${levelId}`]
                    };
                });
                get().saveToCloud();
            },

            // Cloud Sync
            isSyncing: false,
            lastSyncTime: null,

            loadFromCloud: async () => {
                try {
                    const { token, isAuthenticated, user, setSyncStatus } = useAuthStore.getState();
                    if (!isAuthenticated || !token) {
                        debugLog('[GameStore] Not authenticated, skipping cloud load');
                        return;
                    }

                    debugLog('[GameStore] Loading progress from cloud for user:', user?.id);
                    set({ isSyncing: true });
                    setSyncStatus('pending');

                    const progress = await progressAPI.loadProgress(token);

                    // 转换年龄分组进度格式 (后端 -> 前端)
                    const ageGroupProgress: { [key: string]: { completed: string[]; levels: string[] } } = {};
                    const backendAgeProgress = (progress as progressAPI.GameProgress & { age_group_campaign_progress?: Record<string, { completedLevels?: string[]; completedCampaigns?: string[] }> }).age_group_campaign_progress;
                    if (backendAgeProgress) {
                        for (const [ageGroup, data] of Object.entries(backendAgeProgress)) {
                            ageGroupProgress[ageGroup] = {
                                completed: data?.completedCampaigns || [],
                                levels: data?.completedLevels || []
                            };
                        }
                    }

                    set({
                        level: progress.level,
                        xp: progress.experience,
                        coins: progress.coins,
                        completedLevels: progress.completed_levels,
                        skills: progress.skills,
                        inventory: progress.inventory,
                        hasKey: progress.has_key,
                        arenaScore: progress.arena_score,
                        arenaHighScore: progress.arena_high_score,
                        completedChallenges: progress.completed_challenges,
                        // 加载战役进度
                        completedCampaigns: progress.completed_campaigns || [],
                        completedCampaignLevels: progress.completed_campaign_levels || [],
                        campaignProgress: progress.campaign_progress || {},
                        // 加载年龄分组战役进度
                        ageGroupCampaignProgress: ageGroupProgress,
                        isSyncing: false,
                        lastSyncTime: Date.now()
                    });

                    setSyncStatus('synced');
                    debugLog('[GameStore] Progress loaded from cloud successfully');
                } catch (error) {
                    // 🔒 检测 token 过期
                    if (error instanceof TokenExpiredError) {
                        console.warn('[GameStore] Token expired during load');
                        useAuthStore.getState().handleTokenExpired();
                    } else {
                        console.error('[GameStore] Failed to load progress from cloud:', error);
                        useAuthStore.getState().setSyncStatus(
                            'failed',
                            toFriendlyMessage(error, '云端进度暂时没有同步成功，本地进度还在。')
                        );
                    }
                    set({ isSyncing: false });
                }
            },

            saveToCloud: async () => {
                // 🚀 使用节流保存，避免频繁API调用
                throttledSaveImpl(async () => {
                    try {
                        const { token, isAuthenticated, setSyncStatus } = useAuthStore.getState();
                        if (!isAuthenticated || !token) {
                            return;
                        }

                        const state = get();
                        if (state.isSyncing) {
                            return; // Skip if already syncing
                        }

                        setSyncStatus('pending');

                    // 转换年龄分组进度格式 (前端 -> 后端)
                    const ageGroupProgressForBackend: Record<string, { completedLevels: string[]; completedCampaigns: string[] }> = {};
                    for (const [ageGroup, data] of Object.entries(state.ageGroupCampaignProgress)) {
                        ageGroupProgressForBackend[ageGroup] = {
                            completedLevels: data?.levels || [],
                            completedCampaigns: data?.completed || []
                        };
                    }

                    const progress: progressAPI.GameProgress & { age_group_campaign_progress?: Record<string, { completedLevels: string[]; completedCampaigns: string[] }> } = {
                        level: state.level,
                        experience: state.xp,
                        coins: state.coins,
                        completed_levels: state.completedLevels,
                        skills: state.skills,
                        inventory: state.inventory,
                        has_key: state.hasKey,
                        arena_score: state.arenaScore,
                        arena_high_score: state.arenaHighScore,
                        completed_challenges: state.completedChallenges,
                        // 保存战役进度
                        completed_campaigns: state.completedCampaigns,
                        completed_campaign_levels: state.completedCampaignLevels,
                        campaign_progress: state.campaignProgress,
                        // 保存年龄分组战役进度
                        age_group_campaign_progress: ageGroupProgressForBackend
                    };

                    await progressAPI.saveProgress(progress as progressAPI.GameProgress, token);
                    set({ lastSyncTime: Date.now() });
                    setSyncStatus('synced');
                    debugLog('[GameStore] Progress saved to cloud');
                    } catch (error) {
                        // 🔒 检测 token 过期
                        if (error instanceof TokenExpiredError) {
                            console.warn('[GameStore] Token expired during save - progress saved locally only');
                            useAuthStore.getState().handleTokenExpired();
                        } else {
                            console.error('[GameStore] Failed to save progress to cloud:', error);
                            useAuthStore.getState().setSyncStatus(
                                'failed',
                                toFriendlyMessage(error, '云端进度暂时没有同步成功，本地进度还在。')
                            );
                        }
                    }
                });
            }
        }),
        {
            name: 'game-storage',
            partialize: (state) => ({
                arenaScore: state.arenaScore,
                skills: state.skills,
                arenaHighScore: state.arenaHighScore,
                completedChallenges: state.completedChallenges,
                hasKey: state.hasKey,
                xp: state.xp,
                level: state.level,
                coins: state.coins,
                inventory: state.inventory,
                completedLevels: state.completedLevels,
                completedCampaigns: state.completedCampaigns,
                completedCampaignLevels: state.completedCampaignLevels,
                campaignProgress: state.campaignProgress,
                selectedAgeGroup: state.selectedAgeGroup,
                ageGroupCampaignProgress: state.ageGroupCampaignProgress
            }),
        }
    )
);
