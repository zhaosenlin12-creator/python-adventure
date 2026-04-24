'use client';

import type { ElementType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
    ArrowUp,
    CheckCircle2,
    ChevronRight,
    ChevronsUp,
    Clock3,
    Gem,
    Shield,
    Sparkles,
    Wind,
    X,
    Zap,
} from 'lucide-react';
import { TRAINING_CURRENCY_LABEL } from '@/lib/gameEconomy';
import { useGameStore } from '@/store/gameStore';
import { SKILL_SHORT_INSTRUCTIONS } from '@/lib/gameplayText';
import {
    getSkillDisplayName,
    getSkillShopRule,
    isShopSkill,
} from '@/lib/skills';

type SkillTab = 'shop' | 'campaign';

interface ShopSkillCard {
    skillId: string;
    icon: ElementType;
    summary: string;
    effect: string;
    prerequisiteSkills: string[];
}

interface CampaignBadge {
    skillId: string;
    title: string;
    description: string;
    unlockHint: string;
}

const SHOP_SKILL_CARDS: ShopSkillCard[] = [
    {
        skillId: 'double_jump',
        icon: ChevronsUp,
        summary: '先把纵向路线打开，平台课和世界探索都会立刻顺手很多。',
        effect: '空中再跳一次，补足容错并解锁更高的平台路线。',
        prerequisiteSkills: [],
    },
    {
        skillId: 'dash',
        icon: Zap,
        summary: '短距离爆发位移，过缝隙、抢时机、躲危险都更稳。',
        effect: '按 H 冲刺，SPACE 也能兼容触发。',
        prerequisiteSkills: ['double_jump'],
    },
    {
        skillId: 'wall_jump',
        icon: ArrowUp,
        summary: '贴墙反弹，开始真正利用墙面做解题和攀爬。',
        effect: '贴墙时继续起跳，可反弹到更高位置。',
        prerequisiteSkills: ['double_jump'],
    },
    {
        skillId: 'glide',
        icon: Wind,
        summary: '降低下坠速度，让高空路段更像规划而不是碰运气。',
        effect: '长按跳跃时缓慢下落，更容易修正落点。',
        prerequisiteSkills: ['wall_jump'],
    },
    {
        skillId: 'time_slow',
        icon: Clock3,
        summary: '高压平台和 Boss 节奏点给自己争取思考窗口。',
        effect: '按 J 暂时减速周围节奏，用来过难点或抓时机。',
        prerequisiteSkills: ['dash'],
    },
    {
        skillId: 'chemical_shield',
        icon: Shield,
        summary: '面对酸液、毒气和弹幕时，多一层主动容错。',
        effect: '按 K 展开护盾，短时间抵挡伤害并稳住推进。',
        prerequisiteSkills: ['glide', 'time_slow'],
    },
];

const CAMPAIGN_BADGES: CampaignBadge[] = [
    {
        skillId: 'ancient_wisdom',
        title: '古老智慧',
        description: '经验获取 +10%。',
        unlockHint: '完成战役 1 自动获得。',
    },
    {
        skillId: 'school_star',
        title: '校园之星',
        description: '钻石获取 +10%。',
        unlockHint: '完成战役 2 自动获得。',
    },
    {
        skillId: 'science_master',
        title: '科学大师',
        description: '主动技能冷却更短，连招节奏更顺。',
        unlockHint: '完成战役 3 自动获得。',
    },
    {
        skillId: 'academic_master',
        title: '学霸护符',
        description: '战役开局多 1 条命，容错更高。',
        unlockHint: '完成战役 4 自动获得。',
    },
    {
        skillId: 'time_mastery',
        title: '时空掌控',
        description: '时间减速持续更久、压制更明显。',
        unlockHint: '完成战役 5 自动获得。',
    },
    {
        skillId: 'windControl',
        title: '驭风术',
        description: '强风区域对你的干扰明显减弱。',
        unlockHint: '完成战役 6 自动获得。',
    },
    {
        skillId: 'shield',
        title: '守护骨架',
        description: '最大生命更高，硬扛失误的空间更大。',
        unlockHint: '完成战役 6 自动获得。',
    },
    {
        skillId: 'quantum_dash',
        title: '量子冲刺',
        description: '把冲刺升级为更远更快的后期强化。',
        unlockHint: '完成战役 8 自动强化。',
    },
    {
        skillId: 'time_shield',
        title: '时空护盾',
        description: '把化学护盾强化为更久更厚的高阶护盾。',
        unlockHint: '完成战役 10 自动强化。',
    },
];

interface SkillTreeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SkillTreeModal({ isOpen, onClose }: SkillTreeModalProps) {
    const {
        skills,
        coins,
        level,
        unlockSkill,
        spendCoins,
        completedCampaigns,
        completedCampaignLevels,
        campaignProgress,
        ageGroupCampaignProgress,
    } = useGameStore();
    const [tab, setTab] = useState<SkillTab>('shop');
    const [isCompactViewport, setIsCompactViewport] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 960 : false
    );
    const [purchaseFeedback, setPurchaseFeedback] = useState<{
        title: string;
        description: string;
        instruction: string;
    } | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('modal-opened'));
            }
        } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('modal-closed'));
        }
    }, [isOpen]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const mediaQuery = window.matchMedia('(max-width: 959px)');
        const handleViewportChange = () => setIsCompactViewport(mediaQuery.matches);

        handleViewportChange();
        mediaQuery.addEventListener('change', handleViewportChange);

        return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }, []);

    useEffect(() => {
        if (!purchaseFeedback) {
            return;
        }

        const timer = window.setTimeout(() => {
            setPurchaseFeedback(null);
        }, 3600);

        return () => window.clearTimeout(timer);
    }, [purchaseFeedback]);

    const campaignAccessSet = useMemo(() => {
        const unlocked = new Set<string>();

        completedCampaigns.forEach((campaignId) => {
            unlocked.add(campaignId);
            const splitIndex = campaignId.indexOf(':');
            if (splitIndex >= 0) {
                unlocked.add(campaignId.slice(splitIndex + 1));
            }
        });

        completedCampaignLevels.forEach((levelId) => {
            const match = levelId.match(/(campaign_\d+)/);
            if (match) {
                unlocked.add(match[1]);
            }
        });

        Object.entries(campaignProgress).forEach(([campaignId, progress]) => {
            if ((progress ?? 0) > 0) {
                unlocked.add(campaignId);
            }
        });

        Object.values(ageGroupCampaignProgress).forEach((progress) => {
            progress.completed.forEach((campaignId) => unlocked.add(campaignId));
            progress.levels.forEach((levelId) => {
                const match = levelId.match(/(campaign_\d+)/);
                if (match) {
                    unlocked.add(match[1]);
                }
            });
        });

        return unlocked;
    }, [ageGroupCampaignProgress, campaignProgress, completedCampaignLevels, completedCampaigns]);

    const shopCards = useMemo(
        () =>
            SHOP_SKILL_CARDS.map((card) => {
                const rule = getSkillShopRule(card.skillId);
                if (!rule) {
                    throw new Error(`Missing skill shop rule for ${card.skillId}`);
                }

                const owned = skills.includes(card.skillId);
                const campaignReady = !rule.requiredCampaignId || campaignAccessSet.has(rule.requiredCampaignId);
                const levelReady = level >= (rule.requiredLevel ?? 1);
                const prerequisitesReady = card.prerequisiteSkills.every((skillId) => skills.includes(skillId));
                const affordable = coins >= rule.costCoins;
                const canUnlock =
                    !owned && campaignReady && levelReady && prerequisitesReady && affordable;

                const blockers: string[] = [];
                if (!campaignReady && rule.requiredCampaignLabel) blockers.push(`先玩到 ${rule.requiredCampaignLabel}`);
                if (!levelReady) blockers.push(`角色需 Lv.${rule.requiredLevel ?? 1}+`);
                if (!prerequisitesReady) {
                    blockers.push(
                        `前置：${card.prerequisiteSkills.map((skillId) => getSkillDisplayName(skillId)).join('、')}`
                    );
                }
                if (!affordable) blockers.push(`${TRAINING_CURRENCY_LABEL}不足（需 ${rule.costCoins}）`);

                const costText = rule.costCoins > 0 ? `${rule.costCoins} ${TRAINING_CURRENCY_LABEL}` : '免费起步';

                return {
                    ...card,
                    rule,
                    owned,
                    canUnlock,
                    costText,
                    statusText: owned
                        ? '已掌握，进入关卡后直接生效。'
                        : blockers.join(' · ') || (rule.costCoins > 0 ? '可以学习' : '可立即领取'),
                };
            }),
        [campaignAccessSet, coins, level, skills]
    );

    const campaignOwnedCount = CAMPAIGN_BADGES.filter((badge) => skills.includes(badge.skillId)).length;

    const handleUnlock = (skillId: string) => {
        const rule = getSkillShopRule(skillId);
        const card = shopCards.find((item) => item.skillId === skillId);

        if (!rule || !card || card.owned || !card.canUnlock) {
            return;
        }

        if (!spendCoins(rule.costCoins)) {
            return;
        }

        unlockSkill(skillId);
        setPurchaseFeedback({
            title: getSkillDisplayName(skillId),
            description: card.effect,
            instruction: SKILL_SHORT_INSTRUCTIONS[skillId] ?? '进入关卡后会自动生效。',
        });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('skill-unlocked', {
                    detail: { skillId },
                })
            );
        }
    };

    if (!isOpen) return null;

    const panelShellStyle = isCompactViewport
        ? { left: 8, right: 8, bottom: 8, top: 'auto' as const }
        : { right: 16, top: 16, bottom: 16, left: 'auto' as const };

    const panelCardStyle = {
        width: isCompactViewport ? '100%' : 420,
        maxWidth: isCompactViewport ? '100%' : 420,
        maxHeight: isCompactViewport ? '64vh' : '80vh',
    };

    return (
        <div className="fixed inset-0 z-50">
            <button
                aria-label="关闭技能训练册"
                className="absolute inset-0 bg-slate-950/10"
                onClick={onClose}
            />

            <div className="pointer-events-none absolute" style={panelShellStyle}>
                <div
                    className="pointer-events-auto flex flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/94 shadow-2xl"
                    style={panelCardStyle}
                >
                    <div className="border-b border-slate-800 bg-slate-900/92 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                                    Skill Book
                                </div>
                                <h2 className="mt-1 text-xl font-bold text-white">技能训练册</h2>
                                <p className="mt-1 text-sm leading-6 text-slate-400">
                                    先领起步技能，再用钻石解锁进阶能力。宠物和家园金币不会在这里扣除。
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
                                <div className="text-xs uppercase tracking-widest text-slate-500">角色等级</div>
                                <div className="mt-1 text-lg font-bold text-cyan-300">Lv.{level}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
                                    <Gem className="h-3.5 w-3.5" />
                                    {TRAINING_CURRENCY_LABEL}
                                </div>
                                <div className="mt-1 text-lg font-bold text-amber-300">{coins}</div>
                                <div className="mt-1 text-[11px] leading-5 text-slate-500">
                                    只用于学技能，不会扣宠物金币。
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2 rounded-2xl bg-slate-900/80 p-1">
                            <button
                                onClick={() => setTab('shop')}
                                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                    tab === 'shop'
                                        ? 'bg-cyan-400 text-slate-950'
                                        : 'text-slate-300 hover:bg-slate-800'
                                }`}
                            >
                                可购买技能
                            </button>
                            <button
                                onClick={() => setTab('campaign')}
                                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                    tab === 'campaign'
                                        ? 'bg-cyan-400 text-slate-950'
                                        : 'text-slate-300 hover:bg-slate-800'
                                }`}
                            >
                                战役专精
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3 md:px-4">
                        {tab === 'shop' ? (
                            <div className="space-y-3">
                                {purchaseFeedback ? (
                                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-50">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    已学会：{purchaseFeedback.title}
                                                </div>
                                                <p className="mt-1 text-xs leading-5 text-slate-200">
                                                    {purchaseFeedback.description}
                                                </p>
                                                <div className="mt-2 text-xs font-semibold text-cyan-100">
                                                    用法：{purchaseFeedback.instruction}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setPurchaseFeedback(null)}
                                                className="shrink-0 rounded-full border border-emerald-300/30 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/10"
                                            >
                                                收起
                                            </button>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 px-3 py-3 text-xs leading-5 text-cyan-100">
                                    推荐路线：先免费领二段跳，再学冲刺 / 墙跳，后续补滑翔、减速和护盾。
                                </div>

                                {shopCards.map((card) => {
                                    const Icon = card.icon;
                                    return (
                                        <section
                                            key={card.skillId}
                                            className={`rounded-3xl border p-3.5 ${
                                                card.owned
                                                    ? 'border-emerald-500/40 bg-emerald-500/10'
                                                    : 'border-slate-800 bg-slate-900/80'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                                                        card.owned
                                                            ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                                                            : 'border-slate-700 bg-slate-800 text-cyan-300'
                                                    }`}
                                                >
                                                    <Icon className="h-6 w-6" />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-base font-bold text-white">
                                                            {getSkillDisplayName(card.skillId)}
                                                        </h3>
                                                        {card.owned ? (
                                                            <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-semibold text-emerald-200">
                                                                已掌握
                                                            </span>
                                                        ) : isShopSkill(card.skillId) ? (
                                                            <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
                                                                成长路线
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <p className="mt-1 text-sm leading-6 text-slate-300">
                                                        {card.summary}
                                                    </p>

                                                    <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                                                        <span className="rounded-full bg-amber-400/10 px-2.5 py-1 font-semibold text-amber-200">
                                                            {card.costText}
                                                        </span>
                                                        {card.rule.requiredCampaignLabel ? (
                                                            <span className="rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
                                                                {card.rule.requiredCampaignLabel}
                                                            </span>
                                                        ) : null}
                                                        {(card.rule.requiredLevel ?? 1) > 1 ? (
                                                            <span className="rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
                                                                Lv.{card.rule.requiredLevel}+
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    {card.prerequisiteSkills.length > 0 ? (
                                                        <div className="mt-2 text-xs text-slate-400">
                                                            前置：
                                                            {card.prerequisiteSkills
                                                                .map((skillId) => getSkillDisplayName(skillId))
                                                                .join('、')}
                                                        </div>
                                                    ) : null}

                                                    <div className="mt-2 text-xs text-slate-400">
                                                        操作：{SKILL_SHORT_INSTRUCTIONS[card.skillId] ?? '进入关卡后自动生效'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between gap-3">
                                                <div className={`text-xs leading-5 ${card.owned ? 'text-emerald-200' : 'text-slate-400'}`}>
                                                    {card.statusText}
                                                </div>
                                                <button
                                                    onClick={() => handleUnlock(card.skillId)}
                                                    disabled={!card.canUnlock}
                                                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                        card.owned
                                                            ? 'cursor-default bg-emerald-500/20 text-emerald-200'
                                                            : card.canUnlock
                                                                ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                                                                : 'cursor-not-allowed bg-slate-800 text-slate-500'
                                                    }`}
                                                >
                                                    {card.owned
                                                        ? '已掌握'
                                                        : card.rule.costCoins > 0
                                                            ? `学习 ${card.rule.costCoins} ${TRAINING_CURRENCY_LABEL}`
                                                            : '免费领取'}
                                                </button>
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-white">战役专精</div>
                                            <div className="mt-1 text-xs leading-5 text-slate-400">
                                                这些能力不花钻石，推进战役后会自动加入或强化。
                                            </div>
                                        </div>
                                        <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                                            {campaignOwnedCount}/{CAMPAIGN_BADGES.length}
                                        </div>
                                    </div>
                                </div>

                                {CAMPAIGN_BADGES.map((badge) => {
                                    const owned = skills.includes(badge.skillId);
                                    return (
                                        <section
                                            key={badge.skillId}
                                            className={`rounded-2xl border p-4 ${
                                                owned
                                                    ? 'border-emerald-500/30 bg-emerald-500/10'
                                                    : 'border-slate-800 bg-slate-900/80'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                                                        owned
                                                            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                                                            : 'border-slate-700 bg-slate-800 text-slate-400'
                                                    }`}
                                                >
                                                    {owned ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : (
                                                        <Sparkles className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-sm font-bold text-white">{badge.title}</h3>
                                                        <span
                                                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                                owned
                                                                    ? 'bg-emerald-400/15 text-emerald-200'
                                                                    : 'bg-slate-800 text-slate-400'
                                                            }`}
                                                        >
                                                            {owned ? '已获得' : '未获得'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-sm leading-6 text-slate-300">
                                                        {badge.description}
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                        {badge.unlockHint}
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
