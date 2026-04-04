"use client";

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import type { PlatformLevel } from '@/lib/platformLevels';
import { getAllPlatformLevels } from '@/lib/platformLevels';
import type { Campaign, CampaignLevel, Question } from '@/lib/campaigns';
import QuizModal from './QuizModal';
import LevelCompleteModal from './LevelCompleteModal';
import CampaignSelector from './CampaignSelector';
import { Gamepad2, Star, Coins, RotateCcw } from 'lucide-react';
import QuestionModal from './QuestionModal';
import DeathQuizModal from './DeathQuizModal';
import { useGameStore } from '@/store/gameStore';
import { usePetStore } from '@/store/petStore';
import { useAuthStore } from '@/store/authStore';
import { useCoinStore } from '@/store/coinStore';
import '@/lib/soundEffects';  // 初始化音效系统
import { generateQuestionsForLevel, generateQuestionsForAgeGroup } from '@/lib/campaigns';
import { MobileGameWrapper } from './MobileGameWrapper';
import { AgeGroup } from '@/types/ageGroup';
import { useDeviceType } from '@/hooks/useDeviceType';
import { grantLevelCompleteReward } from '@/lib/utils/foodRewards';
import { showFoodRewardToast } from '@/components/ui/FoodRewardToast';
import { showCoinRewardToast } from '@/components/ui/CoinRewardToast';
import { addCoinsToServer } from '@/lib/api/coinAPI';

interface PlatformGameProps {
    onExit: () => void;
}

export default function PlatformGame({ onExit }: PlatformGameProps) {
    const BASE_CAMPAIGN_LIVES = 3;
    const gameRef = useRef<Phaser.Game | null>(null);
    const parentRef = useRef<HTMLDivElement>(null);
    const { isTouchDevice } = useDeviceType();
    
    // 战役系统状态
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [currentCampaignLevel, setCurrentCampaignLevel] = useState<CampaignLevel | null>(null);
    const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
    const [showCampaignSelector, setShowCampaignSelector] = useState(true);
    const [currentAgeGroup, setCurrentAgeGroup] = useState<AgeGroup | null>(null); // 当前年龄段
    
    // 题目系统状态
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [showQuestion, setShowQuestion] = useState(false);
    const [isLevelFailed, setIsLevelFailed] = useState(false); // 标记关卡是否失败
    
    // 复活系统状态
    const [showReviveModal, setShowReviveModal] = useState(false);
    const [playerLives, setPlayerLives] = useState(3);
    
    // 原有状态（保持兼容）
    const [currentLevel, setCurrentLevel] = useState<PlatformLevel | null>(null);
    const [showLevelSelect, setShowLevelSelect] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [levelCompleteData, setLevelCompleteData] = useState<any>(null);
    
    const { 
        addXp, 
        addCoins,
        skills,
        unlockSkill,
        coins,
        completedCampaigns,
        campaignProgress,
        completeCampaignLevel,
        completeCampaign,
        completeAgeGroupCampaign,
        completeAgeGroupLevel,
        ageGroupCampaignProgress
    } = useGameStore();
    const { token } = useAuthStore();
    const { loadBalance } = useCoinStore();
    const allLevels = getAllPlatformLevels();

    const syncCoinsToServer = async (amount: number, source: string, description: string) => {
        if (!amount || !token) return;
        try {
            await addCoinsToServer(amount, source, description, token);
            loadBalance(token).catch(() => {});
        } catch (error) {
            console.error('[PlatformGame] Failed to sync coins:', error);
        }
    };

    const hasSkill = (skillId: string) => skills.includes(skillId);

    const getCampaignStartingLives = () => (
        hasSkill('academic_master') ? BASE_CAMPAIGN_LIVES + 1 : BASE_CAMPAIGN_LIVES
    );

    const applyCampaignRewardBonuses = (baseXp: number, baseCoins: number) => ({
        xp: Math.round(baseXp * (hasSkill('ancient_wisdom') ? 1.1 : 1)),
        coins: Math.round(baseCoins * (hasSkill('school_star') ? 1.1 : 1)),
    });

    const unlockRewardSkills = (skillIds?: string[]) => {
        if (!skillIds?.length) return;
        skillIds.forEach((skillId) => {
            if (skillId) {
                unlockSkill(skillId);
            }
        });
    };

    useEffect(() => {
        // 监听关卡内答题触发事件
        const handleShowQuestion = (event: any) => {
            const { question, onAnswer } = event.detail;
            console.log('[PlatformGame] 收到答题触发事件:', question);
            
            // 保存答题回调
            (window as any).__questionCallback = onAnswer;
            
            // 显示题目
            setCurrentQuestion(question);
            setShowQuestion(true);
        };
        
        window.addEventListener('showQuestion', handleShowQuestion);
        
        // 监听玩家死亡事件（统一使用复活系统）
        const handlePlayerDeath = (event: any) => {
            console.log('[PlatformGame] 玩家死亡，显示复活题目');
            // 死亡时始终显示复活题目，答对才能重新开始
            setShowReviveModal(true);
        };
        
        window.addEventListener('playerDeath', handlePlayerDeath);
        
        // 监听关卡完成事件
        const handleLevelComplete = (event: any) => {
            const data = event.detail;
            
            if (currentCampaignLevel) {
                // 战役模式
                if (data.success) {
                    // 成功：销毁游戏实例，显示题目挑战
                    if (gameRef.current) {
                        gameRef.current.destroy(true);
                        gameRef.current = null;
                    }
                    
                    setIsLevelFailed(false); // 重置失败标记
                    if (currentCampaignLevel.questions.length > 0) {
                        setCurrentQuestion(currentCampaignLevel.questions[0]);
                        setQuestionIndex(0);
                        setShowQuestion(true);
                    } else {
                        // 没有题目，直接完成关卡
                        handleCampaignLevelComplete();
                    }
                } else {
                    // 失败：不销毁游戏实例，弹出题目，答对后重新开始
                    console.log('[PlatformGame] 关卡失败，弹出重生题目（保留游戏实例）');
                    setIsLevelFailed(true); // 标记为失败
                    if (currentCampaignLevel.questions.length > 0) {
                        setCurrentQuestion(currentCampaignLevel.questions[0]);
                        setQuestionIndex(0);
                        setShowQuestion(true);
                    } else {
                        // 没有题目，销毁游戏实例并显示失败界面
                        if (gameRef.current) {
                            gameRef.current.destroy(true);
                            gameRef.current = null;
                        }
                        setLevelCompleteData({
                            success: false,
                            title: currentCampaignLevel.name,
                            score: data.score,
                            timeElapsed: data.timeElapsed,
                            objectives: [],
                            rewards: { exp: 0, coins: 0 }
                        });
                        setShowLevelComplete(true);
                    }
                }
            } else {
                // 非战役模式：销毁游戏实例，设置关卡完成数据
                if (gameRef.current) {
                    gameRef.current.destroy(true);
                    gameRef.current = null;
                }
                
                setLevelCompleteData({
                    success: data.success,
                    title: data.levelTitle,
                    score: data.score,
                    timeElapsed: data.timeElapsed,
                    objectives: data.objectives,
                    rewards: data.rewards
                });
                
                setShowLevelComplete(true);
            }
        };

        window.addEventListener('platformLevelComplete', handleLevelComplete);

        return () => {
            window.removeEventListener('showQuestion', handleShowQuestion);
            window.removeEventListener('playerDeath', handlePlayerDeath);
            window.removeEventListener('platformLevelComplete', handleLevelComplete);
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, [currentCampaignLevel, playerLives]);

    // 战役选择处理（支持指定关卡和年龄段）
    const handleSelectCampaign = (campaign: Campaign, levelIndex: number = 0, ageGroup?: AgeGroup) => {
        console.log('[PlatformGame] 选择战役关卡:', campaign.name, '关卡索引:', levelIndex, '年龄段:', ageGroup);
        
        setSelectedCampaign(campaign);
        setCurrentLevelIndex(levelIndex);
        setShowCampaignSelector(false);
        if (ageGroup) {
            setCurrentAgeGroup(ageGroup);
        }
        
        // 直接启动指定关卡
        const campaignLevel = campaign.levels[levelIndex];
        
        // 🔥 根据年龄段生成题目
        const questionCount = campaignLevel.questions?.length || 3;
        const randomQuestions = ageGroup 
            ? generateQuestionsForAgeGroup(ageGroup, questionCount)
            : generateQuestionsForLevel(levelIndex + 1, questionCount);
        const levelWithRandomQuestions = {
            ...campaignLevel,
            questions: randomQuestions.length > 0 ? randomQuestions : campaignLevel.questions
        };
        console.log('[PlatformGame] 🎲 随机生成题目:', randomQuestions.length, '道', ageGroup ? `(${ageGroup}年龄段)` : '');
        
        setCurrentCampaignLevel(levelWithRandomQuestions);
        setPlayerLives(getCampaignStartingLives());
        
        // 重置题目状态
        setCurrentQuestion(null);
        setQuestionIndex(0);
        setShowQuestion(false);
        setIsLevelFailed(false);
        
        // 传递带有正确题目的关卡数据和年龄段
        startCampaignLevelWithIndex(levelWithRandomQuestions, levelIndex, ageGroup);
    };

    // 题目回答正确
    const handleQuestionCorrect = () => {
        console.log('[PlatformGame] handleQuestionCorrect 被调用');
        console.log('[PlatformGame] 当前题目索引:', questionIndex);
        
        setShowQuestion(false);
        
        // 检查是否是关卡内答题触发点
        const questionCallback = (window as any).__questionCallback;
        if (questionCallback) {
            console.log('[PlatformGame] 调用关卡内答题回调（答对）');
            questionCallback(true, '');
            (window as any).__questionCallback = null;
            return;
        }
        
        // 否则是关卡结束答题
        console.log('[PlatformGame] isLevelFailed:', isLevelFailed);
        console.log('[PlatformGame] currentCampaignLevel:', currentCampaignLevel);
        
        if (!currentCampaignLevel) {
            console.log('[PlatformGame] 错误：currentCampaignLevel 为空！');
            return;
        }
        
        // 检查是失败重生还是成功通关
        if (isLevelFailed) {
            // 失败后答对题目：重新开始当前关卡
            console.log('[PlatformGame] 失败重生：答对题目，重新开始当前关卡');
            setIsLevelFailed(false); // 重置失败标记
            setTimeout(() => {
                startCampaignLevelWithIndex(currentCampaignLevel, currentLevelIndex, currentAgeGroup);
            }, 500);
        } else {
            // 成功后答对题目：检查是否还有更多题目
            const nextQuestionIndex = questionIndex + 1;
            console.log('[PlatformGame] 下一题索引:', nextQuestionIndex, '总题目数:', currentCampaignLevel.questions.length);
            
            if (nextQuestionIndex < currentCampaignLevel.questions.length) {
                // 还有题目，显示下一题
                console.log('[PlatformGame] 显示下一题');
                setQuestionIndex(nextQuestionIndex);
                setCurrentQuestion(currentCampaignLevel.questions[nextQuestionIndex]);
                setTimeout(() => {
                    setShowQuestion(true);
                }, 500); // 延迟0.5秒显示下一题
            } else {
                // 所有题目答完，完成关卡
                console.log('[PlatformGame] 所有题目答完，完成关卡');
                handleCampaignLevelComplete();
            }
        }
    };

    // 题目回答错误
    const handleQuestionWrong = () => {
        console.log('[PlatformGame] 答题错误');
        setShowQuestion(false);
        
        // 检查是否是关卡内答题触发点
        const questionCallback = (window as any).__questionCallback;
        if (questionCallback) {
            console.log('[PlatformGame] 调用关卡内答题回调（答错）');
            questionCallback(false, '');
            (window as any).__questionCallback = null;
            return;
        }
        
        // 否则是关卡结束答题，重新开始关卡
        console.log('[PlatformGame] 关卡结束答题错误，重新开始关卡');
        if (currentCampaignLevel) {
            // 延迟一下再重启，让用户看到错误提示
            setTimeout(() => {
                startCampaignLevelWithIndex(currentCampaignLevel, currentLevelIndex, currentAgeGroup);
            }, 500);
        }
    };

    // 完成战役关卡
    const handleCampaignLevelComplete = async () => {
        if (!selectedCampaign || !currentCampaignLevel) return;
        
        console.log('[PlatformGame] 完成关卡:', currentCampaignLevel.name, '当前索引:', currentLevelIndex, '年龄段:', currentAgeGroup);
        
        // 获取奖励金额
        const rewardValues = applyCampaignRewardBonuses(
            currentCampaignLevel.rewards.xp,
            currentCampaignLevel.rewards.coins,
        );
        const coinsEarned = rewardValues.coins;
        const xpEarned = rewardValues.xp;
        
        // 添加奖励
        addXp(xpEarned);
        addCoins(coinsEarned);
        
        // 🪙 显示金币奖励Toast
        if (coinsEarned > 0) {
            showCoinRewardToast(coinsEarned, `完成关卡: ${currentCampaignLevel.name}`, 'reward');
            syncCoinsToServer(coinsEarned, 'campaign_level_complete', `完成关卡: ${currentCampaignLevel.name}`);
        }
        
        // 🍖 发放食物奖励
        try {
            // 根据关卡难度发放食物（默认中等难度）
            const difficulty = 'medium';
            await grantLevelCompleteReward(difficulty, showFoodRewardToast);
            console.log('[PlatformGame] 食物奖励发放成功');
        } catch (error) {
            console.error('[PlatformGame] 食物奖励发放失败:', error);
            // 奖励失败不影响关卡完成
        }
        
        // 🐕 自动喂食宠物（已移除，改为手动喂食）
        // 玩家需要使用获得的食物手动喂养宠物
        
        // 🔥 标记关卡完成（使用年龄段独立进度）
        unlockRewardSkills(currentCampaignLevel.rewards.skills);

        if (currentAgeGroup) {
            completeAgeGroupLevel(currentAgeGroup, currentCampaignLevel.id);
        } else {
            completeCampaignLevel(currentCampaignLevel.id);
        }
        
        const nextLevelIndex = currentLevelIndex + 1;
        console.log('[PlatformGame] 下一关索引:', nextLevelIndex, '总关卡数:', selectedCampaign.levels.length);
        
        if (nextLevelIndex < selectedCampaign.levels.length) {
            // 进入下一关
            console.log('[PlatformGame] 进入下一关:', selectedCampaign.levels[nextLevelIndex].name, '年龄段:', currentAgeGroup);
            setCurrentLevelIndex(nextLevelIndex);
            // 延迟启动下一关，确保状态更新和UI刷新
            setTimeout(() => {
                startCampaignLevelWithIndex(selectedCampaign.levels[nextLevelIndex], nextLevelIndex, currentAgeGroup);
            }, 100);
        } else {
            // 战役完成
            console.log('[PlatformGame] 战役完成!', '年龄段:', currentAgeGroup);
            // 🔥 标记战役完成（使用年龄段独立进度）
            const alreadyCompletedCampaign = currentAgeGroup
                ? Boolean(ageGroupCampaignProgress[currentAgeGroup]?.completed.includes(selectedCampaign.id))
                : completedCampaigns.includes(selectedCampaign.id);

            if (!alreadyCompletedCampaign) {
                const campaignRewardValues = applyCampaignRewardBonuses(
                    selectedCampaign.rewards.xp,
                    selectedCampaign.rewards.coins,
                );
                addXp(campaignRewardValues.xp);
                addCoins(campaignRewardValues.coins);
                unlockRewardSkills(selectedCampaign.rewards.skills);

                if (campaignRewardValues.coins > 0) {
                    showCoinRewardToast(
                        campaignRewardValues.coins,
                        `完成战役: ${selectedCampaign.name}`,
                        'reward',
                    );
                    syncCoinsToServer(
                        campaignRewardValues.coins,
                        'campaign_complete',
                        `完成战役: ${selectedCampaign.name}`,
                    );
                }
            }

            if (currentAgeGroup) {
                completeAgeGroupCampaign(currentAgeGroup, selectedCampaign.id);
            } else {
                completeCampaign(selectedCampaign.id);
            }
            // 🔥 延迟返回战役列表，确保状态更新完成
            // 这样可以避免 CampaignSelector 在状态更新前渲染导致解锁状态不正确
            setTimeout(() => {
                setShowCampaignSelector(true);
                setSelectedCampaign(null);
                setCurrentCampaignLevel(null);
            }, 100);
        }
    };

    // 开始战役关卡（带索引和年龄段）
    const startCampaignLevelWithIndex = (campaignLevel: CampaignLevel, levelIndex: number, ageGroup?: AgeGroup | null) => {
        // 使用传入的年龄段或当前状态
        const activeAgeGroup = ageGroup || currentAgeGroup;
        
        console.log('[PlatformGame] startCampaignLevelWithIndex 被调用');
        console.log('[PlatformGame] campaignLevel:', campaignLevel.name);
        console.log('[PlatformGame] levelIndex:', levelIndex);
        console.log('[PlatformGame] activeAgeGroup:', activeAgeGroup);
        console.log('[PlatformGame] 传入的题目数量:', campaignLevel.questions?.length);
        
        // 先销毁现有游戏实例
        if (gameRef.current) {
            console.log('[PlatformGame] 销毁现有游戏实例');
            gameRef.current.destroy(true);
            gameRef.current = null;
        }
        
        // 🔥 检查是否已经有年龄段题目（通过题目ID前缀判断）
        const hasAgeGroupQuestions = campaignLevel.questions?.length > 0 && 
            (campaignLevel.questions[0]?.id?.startsWith('pl-') || 
             campaignLevel.questions[0]?.id?.startsWith('pu-') || 
             campaignLevel.questions[0]?.id?.startsWith('jh-'));
        
        let levelWithRandomQuestions = campaignLevel;
        
        if (!hasAgeGroupQuestions && activeAgeGroup) {
            // 需要生成新的年龄段题目
            const questionCount = campaignLevel.questions?.length || 3;
            const randomQuestions = generateQuestionsForAgeGroup(activeAgeGroup, questionCount);
            levelWithRandomQuestions = {
                ...campaignLevel,
                questions: randomQuestions.length > 0 ? randomQuestions : campaignLevel.questions
            };
            console.log('[PlatformGame] 🎲 生成年龄段题目:', randomQuestions.length, '道', `(${activeAgeGroup})`);
        } else if (hasAgeGroupQuestions) {
            console.log('[PlatformGame] ✅ 使用已有的年龄段题目');
        } else {
            console.log('[PlatformGame] ⚠️ 没有年龄段，使用原始题目');
        }
        
        setCurrentCampaignLevel(levelWithRandomQuestions);
        setPlayerLives(getCampaignStartingLives()); // 重置生命数
        
        // 重置题目状态
        setCurrentQuestion(null);
        setQuestionIndex(0);
        setShowQuestion(false);
        
        // 如果战役关卡有自定义地图数据，使用它；否则使用默认关卡
        let levelData: any;
        if (campaignLevel.campaignMapData || campaignLevel.mapData) {
            // 将战役地图数据转换为关卡数据格式
            levelData = {
                id: campaignLevel.id,
                title: campaignLevel.name,
                description: campaignLevel.description,
                story: campaignLevel.story || campaignLevel.description,
                difficulty: 'medium',
                objectives: [{ type: 'reach' as const, description: '到达终点' }],
                rewards: { exp: campaignLevel.rewards.xp, coins: campaignLevel.rewards.coins },
                campaignMapData: campaignLevel.campaignMapData || campaignLevel.mapData,
                bossConfig: campaignLevel.bossConfig // 传递Boss配置
            };
        } else {
            // 使用默认关卡数据
            levelData = allLevels[levelIndex % allLevels.length];
        }
        
        console.log('[PlatformGame] 使用的关卡数据:', levelData.title);
        console.log('[PlatformGame] Boss配置:', levelData.bossConfig);
        setCurrentLevel(levelData as PlatformLevel);
        startLevel(levelData as PlatformLevel);
    };

    const startLevel = async (level: PlatformLevel) => {
        setCurrentLevel(level);
        setShowLevelSelect(false);
        setShowLevelComplete(false);
        setShowQuiz(false);

        // 等待DOM更新
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!parentRef.current || gameRef.current) return;

        // 动态加载Phaser和场景
        const Phaser = await import('phaser');
        const { default: PlatformGameScene } = await import('@/components/world/scenes/PlatformGameScene');

        // 检测是否为移动设备
        // 移动端使用自适应缩放
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            parent: parentRef.current,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 500 },
                    debug: false
                }
            },
            scene: [PlatformGameScene],
            backgroundColor: '#1a1a2e',
            // 🔥 修复移动端精灵抖动/虚像问题
            pixelArt: true,
            roundPixels: true,
            render: {
                antialias: false,
                pixelArt: true,
                roundPixels: true,
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
        };

        gameRef.current = new Phaser.Game(config);
        
        // 启动场景并传递关卡数据
        gameRef.current.scene.start('PlatformGameScene', { level });
    };

    const restartLevel = () => {
        if (currentLevel) {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
            startLevel(currentLevel);
        }
    };

    const handleQuizCorrect = () => {
        if (!currentLevel) return;

        // 给予奖励
        addXp(currentLevel.rewards.exp);
        addCoins(currentLevel.rewards.coins);
        if (currentLevel.rewards.coins > 0) {
            showCoinRewardToast(currentLevel.rewards.coins, `完成关卡: ${currentLevel.title}`, 'reward');
            syncCoinsToServer(currentLevel.rewards.coins, 'level_complete', `完成关卡: ${currentLevel.title}`);
        }

        setShowQuiz(false);
        
        // 显示完成界面
        setTimeout(() => {
            alert(`恭喜通关！\n获得经验: ${currentLevel.rewards.exp}\n获得金币: ${currentLevel.rewards.coins}`);
            setShowLevelSelect(true);
            setCurrentLevel(null);
        }, 500);
    };

    const handleQuizWrong = () => {
        setShowQuiz(false);
        alert('答题错误！重新挑战关卡');
        restartLevel();
    };

    const handleQuizClose = () => {
        setShowQuiz(false);
        setShowLevelSelect(true);
        setCurrentLevel(null);
    };

    // 显示战役选择器
    if (showCampaignSelector) {
        return (
            <CampaignSelector
                onSelectCampaign={handleSelectCampaign}
                onClose={onExit}
            />
        );
    }

    if (showLevelSelect) {
        return (
            <div className="fixed inset-0 bg-gradient-to-b from-sky-100 via-emerald-50 to-sky-100 z-50 overflow-auto">
                {/* 春季主题头部 */}
                <div className="sticky top-0 bg-slate-800 backdrop-blur-sm border-b border-slate-700 p-4 z-10">
                    <div className="max-w-6xl mx-auto flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-3">
                            <span className="text-4xl">🌿</span>
                            冒险闯关
                        </h1>
                        <button
                            onClick={onExit}
                            className="bg-red-900/300 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            ← 返回世界
                        </button>
                    </div>
                </div>

                {/* 关卡列表 */}
                <div className="max-w-6xl mx-auto p-8">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-2">选择关卡</h2>
                        <p className="text-slate-500">
                            通过平台跳跃、躲避障碍、击败敌人，完成目标后回答问题即可通关！
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allLevels.map((level) => (
                            <div
                                key={level.id}
                                className="bg-slate-700/90 backdrop-blur-sm rounded-xl p-6 border border-slate-600 hover:border-emerald-400 shadow-sm transition-all cursor-pointer group"
                                onClick={() => startLevel(level)}
                            >
                                {/* 关卡标题 */}
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white">
                                        关卡 {level.id}: {level.title}
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        level.difficulty === 'easy' ? 'bg-green-500' :
                                        level.difficulty === 'medium' ? 'bg-yellow-500' :
                                        'bg-red-900/300'
                                    } text-white`}>
                                        {level.difficulty === 'easy' ? '简单' :
                                         level.difficulty === 'medium' ? '中等' : '困难'}
                                    </span>
                                </div>

                                {/* 描述 */}
                                <p className="text-slate-500 mb-4 text-sm">
                                    {level.description}
                                </p>

                                {/* 目标 */}
                                <div className="mb-4">
                                    <p className="text-blue-400 text-sm font-bold mb-2">目标：</p>
                                    <ul className="space-y-1">
                                        {level.objectives.map((obj, idx) => (
                                            <li key={idx} className="text-slate-500 text-sm flex items-center gap-2">
                                                <span className="text-blue-400">▸</span>
                                                {obj.description}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* 奖励 */}
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-blue-400">
                                        <Star className="w-4 h-4 inline mr-1" />{level.rewards.exp} EXP
                                    </span>
                                    <span className="text-amber-500">
                                        <Coins className="w-4 h-4 inline mr-1" />{level.rewards.coins} 金币
                                    </span>
                                </div>

                                {/* 开始按钮 */}
                                <button className="w-full mt-4 bg-blue-600 group-hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                    开始挑战 →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <MobileGameWrapper showController={isTouchDevice}>
            <div className="fixed inset-0 bg-gradient-to-b from-sky-100 to-emerald-50 z-40 flex flex-col">
                {/* 春季主题游戏头部 - 移动端简化 */}
                <div className="bg-slate-800 backdrop-blur-sm border-b border-slate-700 p-2 md:p-4 flex justify-between items-center">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm md:text-xl font-bold truncate text-blue-400">
                            🌿 {selectedCampaign ? `${selectedCampaign.name} - 第${currentLevelIndex + 1}关` : currentLevel?.title}
                        </h2>
                        <p className="text-xs md:text-sm text-slate-400 truncate hidden md:block">
                            {currentCampaignLevel ? currentCampaignLevel.description : currentLevel?.description}
                        </p>
                    </div>
                    <div className="flex gap-2 md:gap-4 flex-shrink-0">
                        <button
                            onClick={restartLevel}
                            data-restart-button
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 md:py-2 md:px-4 rounded-lg transition-colors text-xs md:text-base"
                        >
                            🔄 <span className="hidden md:inline">重新开始</span>
                        </button>
                        <button
                            onClick={() => {
                                if (gameRef.current) {
                                    gameRef.current.destroy(true);
                                    gameRef.current = null;
                                }
                                setShowCampaignSelector(true);
                                setSelectedCampaign(null);
                                setCurrentCampaignLevel(null);
                                setCurrentLevel(null);
                            }}
                            className="bg-red-900/300 hover:bg-red-600 text-white font-bold py-1 px-2 md:py-2 md:px-4 rounded-lg transition-colors text-xs md:text-base"
                        >
                            ← <span className="hidden md:inline">返回战役选择</span>
                        </button>
                    </div>
                </div>

                {/* 游戏容器 - 移动端自适应 */}
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 overflow-auto px-3 py-3">
                    <div
                        ref={parentRef}
                        className="h-full w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 shadow-2xl"
                        style={{
                            maxWidth: 'min(96vw, 1440px)',
                            maxHeight: 'calc(100vh - 150px)',
                        }}
                    />
                </div>

                {/* 操作提示 - 移动端隐藏 */}
                <div className="bg-slate-800 backdrop-blur-sm border-t border-slate-700 p-2 md:p-4 hidden md:block">
                    <div className="max-w-4xl mx-auto flex justify-center gap-8 text-slate-500 text-sm">
                        <span>⬅️ ➡️ 移动</span>
                        <span>⬆️ 跳跃</span>
                        <span>SPACE 冲刺</span>
                        <span>X 攻击</span>
                        <span>到达🏮完成目标即可通关</span>
                    </div>
                </div>

            {/* 关卡完成模态框 */}
            {showLevelComplete && levelCompleteData && (
                <LevelCompleteModal
                    isOpen={showLevelComplete}
                    success={levelCompleteData.success}
                    levelData={levelCompleteData}
                    onClose={() => {
                        setShowLevelComplete(false);
                        setLevelCompleteData(null);
                        setShowCampaignSelector(true);
                        setSelectedCampaign(null);
                        setCurrentCampaignLevel(null);
                        setCurrentLevel(null);
                    }}
                    onNextLevel={() => {
                        setShowLevelComplete(false);
                        setLevelCompleteData(null);
                        // 进入下一关逻辑
                    }}
                    onRetry={() => {
                        setShowLevelComplete(false);
                        setLevelCompleteData(null);
                        restartLevel();
                    }}
                />
            )}

            {/* 题目挑战模态框 */}
            {showQuestion && currentQuestion && currentCampaignLevel && (
                <QuestionModal
                    isOpen={showQuestion}
                    question={currentQuestion}
                    onCorrect={handleQuestionCorrect}
                    onWrong={handleQuestionWrong}
                    onClose={() => setShowQuestion(false)}
                    currentIndex={questionIndex}
                    totalQuestions={currentCampaignLevel.questions.length}
                    timeLimit={60}
                />
            )}

            {/* 答题模态框 */}
            {showQuiz && currentLevel && (
                <QuizModal
                    isOpen={showQuiz}
                    quiz={currentLevel.quiz}
                    onCorrect={handleQuizCorrect}
                    onWrong={handleQuizWrong}
                    onClose={handleQuizClose}
                />
            )}

            {/* 死亡答题模态框 */}
            {showReviveModal && (
                <DeathQuizModal
                    isOpen={showReviveModal}
                    onSuccess={() => {
                        console.log('[PlatformGame] 答题正确，重新开始关卡');
                        setShowReviveModal(false);
                        restartLevel();
                    }}
                />
            )}
            </div>
        </MobileGameWrapper>
    );
}
