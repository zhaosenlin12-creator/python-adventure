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
import '@/lib/soundEffects';  // 鍒濆鍖栭煶鏁堢郴缁?
import { generateQuestionsForLevel, generateQuestionsForAgeGroup } from '@/lib/campaigns';
import { MobileGameWrapper } from './MobileGameWrapper';
import { AgeGroup } from '@/types/ageGroup';
import { useDeviceType } from '@/hooks/useDeviceType';
import { grantLevelCompleteReward } from '@/lib/utils/foodRewards';
import { showFoodRewardToast } from '@/components/ui/FoodRewardToast';
import { showCoinRewardToast } from '@/components/ui/CoinRewardToast';
import { addCoinsToServer } from '@/lib/api/coinAPI';
import { shouldAutoGrantCampaignSkill } from '@/lib/skills';
import type { CampaignQuestionMode } from '@/lib/gameplayText';
import { getPlatformCampaignThemeId, getPlatformShellTheme } from '@/lib/platformArt';

interface PlatformGameProps {
    onExit: () => void;
}

export default function PlatformGame({ onExit }: PlatformGameProps) {
    const BASE_CAMPAIGN_LIVES = 3;
    const gameRef = useRef<Phaser.Game | null>(null);
    const parentRef = useRef<HTMLDivElement>(null);
    const { isTouchDevice } = useDeviceType();

    const setDevPlatformGame = (game: Phaser.Game | null) => {
        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
            (window as Window & { __platformPhaserGame?: Phaser.Game | null }).__platformPhaserGame = game;
        }
    };

    const destroyPlatformGame = () => {
        if (gameRef.current) {
            gameRef.current.destroy(true);
            gameRef.current = null;
        }
        setDevPlatformGame(null);
    };
    
    // 鎴樺焦绯荤粺鐘舵€?
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [currentCampaignLevel, setCurrentCampaignLevel] = useState<CampaignLevel | null>(null);
    const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
    const [showCampaignSelector, setShowCampaignSelector] = useState(true);
    const [currentAgeGroup, setCurrentAgeGroup] = useState<AgeGroup | null>(null); // 褰撳墠骞撮緞娈?
    
    // 棰樼洰绯荤粺鐘舵€?
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [showQuestion, setShowQuestion] = useState(false);
    const [questionMode, setQuestionMode] = useState<CampaignQuestionMode>('challenge');
    const [isLevelFailed, setIsLevelFailed] = useState(false); // 鏍囪鍏冲崱鏄惁澶辫触
    
    // 澶嶆椿绯荤粺鐘舵€?
    const [showReviveModal, setShowReviveModal] = useState(false);
    const [playerLives, setPlayerLives] = useState(3);
    
    // 鍘熸湁鐘舵€侊紙淇濇寔鍏煎锛?
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
    const activePlatformThemeId = getPlatformCampaignThemeId(
        String(currentCampaignLevel?.id || selectedCampaign?.id || currentLevel?.id || '')
    );
    const activePlatformShellTheme = getPlatformShellTheme(activePlatformThemeId);
    const activeStageTitle = selectedCampaign
        ? selectedCampaign.name + ' · 第 ' + (currentLevelIndex + 1) + ' 关'
        : currentLevel?.title || '平台冒险';
    const activeStageSubtitle = currentCampaignLevel?.description
        || currentLevel?.description
        || '完成目标后答题过关，失败后可通过复活答题重新开始当前关卡。';

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

    const unlockRewardSkills = (rewardSkills?: string[] | string) => {
        const skillIds = Array.isArray(rewardSkills)
            ? rewardSkills
            : rewardSkills
                ? [rewardSkills]
                : [];

        if (!skillIds.length) return;

        skillIds.forEach((skillId) => {
            if (skillId && shouldAutoGrantCampaignSkill(skillId)) {
                unlockSkill(skillId);
            }
        });
    };

    const buildRuntimeCampaignLevel = (campaignLevel: CampaignLevel, levelIndex: number, ageGroup?: AgeGroup | null) => {
        const hasQuestionTriggers = Boolean(campaignLevel.campaignMapData?.questionTriggers?.length);
        const questionCount = Math.max(
            campaignLevel.questions?.length || 0,
            campaignLevel.id.endsWith('_5') ? 3 : 1,
        );

        if (hasQuestionTriggers) {
            return campaignLevel;
        }

        const randomQuestions = ageGroup
            ? generateQuestionsForAgeGroup(ageGroup, questionCount)
            : generateQuestionsForLevel(levelIndex + 1, questionCount);

        return {
            ...campaignLevel,
            questions: randomQuestions.length > 0 ? randomQuestions : campaignLevel.questions,
        };
    };

    useEffect(() => {
        // 鐩戝惉鍏冲崱鍐呯瓟棰樿Е鍙戜簨浠?
        const handleShowQuestion = (event: any) => {
            const { question, onAnswer } = event.detail;
            console.log('[PlatformGame] 鏀跺埌绛旈瑙﹀彂浜嬩欢:', question);
            
            // 淇濆瓨绛旈鍥炶皟
            (window as any).__questionCallback = onAnswer;
            
            // 鏄剧ず棰樼洰
            setQuestionMode('challenge');
            setCurrentQuestion(question);
            setShowQuestion(true);
        };
        
        window.addEventListener('showQuestion', handleShowQuestion);
        
        // 鐩戝惉鐜╁姝讳骸浜嬩欢锛堢粺涓€浣跨敤澶嶆椿绯荤粺锛?
        const handlePlayerDeath = (event: any) => {
            console.log('[PlatformGame] player died, showing revive quiz');
            // 姝讳骸鏃跺缁堟樉绀哄娲婚鐩紝绛斿鎵嶈兘閲嶆柊寮€濮?
            setShowReviveModal(true);
        };
        
        window.addEventListener('playerDeath', handlePlayerDeath);
        
        // 鐩戝惉鍏冲崱瀹屾垚浜嬩欢
        const handleLevelComplete = (event: any) => {
            const data = event.detail;
            
            if (currentCampaignLevel) {
                // 鎴樺焦妯″紡
                if (data.success) {
                    // 鎴愬姛锛氶攢姣佹父鎴忓疄渚嬶紝鏄剧ず棰樼洰鎸戞垬
                    destroyPlatformGame();
                    
                    setIsLevelFailed(false); // 閲嶇疆澶辫触鏍囪
                    if (currentCampaignLevel.questions.length > 0) {
                        setQuestionMode('clear');
                        setCurrentQuestion(currentCampaignLevel.questions[0]);
                        setQuestionIndex(0);
                        setShowQuestion(true);
                    } else {
                        // 娌℃湁棰樼洰锛岀洿鎺ュ畬鎴愬叧鍗?
                        handleCampaignLevelComplete();
                    }
                } else {
                    // 澶辫触锛氫笉閿€姣佹父鎴忓疄渚嬶紝寮瑰嚭棰樼洰锛岀瓟瀵瑰悗閲嶆柊寮€濮?
                    console.log('[PlatformGame] level failed, opening retry question while keeping scene alive');
                    setIsLevelFailed(true); // mark level as failed
                    if (currentCampaignLevel.questions.length > 0) {
                        setQuestionMode('retry');
                        setCurrentQuestion(currentCampaignLevel.questions[0]);
                        setQuestionIndex(0);
                        setShowQuestion(true);
                    } else {
                        // 娌℃湁棰樼洰锛岄攢姣佹父鎴忓疄渚嬪苟鏄剧ず澶辫触鐣岄潰
                        destroyPlatformGame();
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
                // 闈炴垬褰规ā寮忥細閿€姣佹父鎴忓疄渚嬶紝璁剧疆鍏冲崱瀹屾垚鏁版嵁
                destroyPlatformGame();
                
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
            destroyPlatformGame();
        };
    }, [currentCampaignLevel, playerLives]);

    // 鎴樺焦閫夋嫨澶勭悊锛堟敮鎸佹寚瀹氬叧鍗″拰骞撮緞娈碉級
    const handleSelectCampaign = (campaign: Campaign, levelIndex: number = 0, ageGroup?: AgeGroup) => {
        console.log('[PlatformGame] 閫夋嫨鎴樺焦鍏冲崱:', campaign.name, '鍏冲崱绱㈠紩:', levelIndex, '骞撮緞娈?', ageGroup);
        
        setSelectedCampaign(campaign);
        setCurrentLevelIndex(levelIndex);
        setShowCampaignSelector(false);
        if (ageGroup) {
            setCurrentAgeGroup(ageGroup);
        }
        
        // 鐩存帴鍚姩鎸囧畾鍏冲崱
        const campaignLevel = campaign.levels[levelIndex];
        
        // 馃敟 鏍规嵁骞撮緞娈电敓鎴愰鐩?
        const levelWithRandomQuestions = buildRuntimeCampaignLevel(campaignLevel, levelIndex, ageGroup);
        const runtimeAgeGroupLabel = ageGroup ? '(' + String(ageGroup) + ')' : '(default)';
        console.log(
            '[PlatformGame] runtime questions prepared:',
            levelWithRandomQuestions.questions?.length || 0,
            runtimeAgeGroupLabel,
        );
        
        setCurrentCampaignLevel(levelWithRandomQuestions);
        setPlayerLives(getCampaignStartingLives());
        setQuestionMode('challenge');
        
        // reset question state
        setCurrentQuestion(null);
        setQuestionIndex(0);
        setShowQuestion(false);
        setIsLevelFailed(false);
        
        // 浼犻€掑甫鏈夋纭鐩殑鍏冲崱鏁版嵁鍜屽勾榫勬
        startCampaignLevelWithIndex(levelWithRandomQuestions, levelIndex, ageGroup);
    };

    // 棰樼洰鍥炵瓟姝ｇ‘
    const handleQuestionCorrect = () => {
        console.log('[PlatformGame] handleQuestionCorrect triggered');
        console.log('[PlatformGame] 褰撳墠棰樼洰绱㈠紩:', questionIndex);
        
        setShowQuestion(false);
        
        // 妫€鏌ユ槸鍚︽槸鍏冲崱鍐呯瓟棰樿Е鍙戠偣
        const questionCallback = (window as any).__questionCallback;
        if (questionCallback) {
            console.log('[PlatformGame] resolving in-level question callback: correct');
            questionCallback(true, '');
            (window as any).__questionCallback = null;
            return;
        }
        
        // 鍚﹀垯鏄叧鍗＄粨鏉熺瓟棰?
        console.log('[PlatformGame] isLevelFailed:', isLevelFailed);
        console.log('[PlatformGame] currentCampaignLevel:', currentCampaignLevel);
        
        if (!currentCampaignLevel) {
            console.log('[PlatformGame] currentCampaignLevel is missing');
            return;
        }
        
        // 妫€鏌ユ槸澶辫触閲嶇敓杩樻槸鎴愬姛閫氬叧
        if (isLevelFailed) {
            // 澶辫触鍚庣瓟瀵归鐩細閲嶆柊寮€濮嬪綋鍓嶅叧鍗?
            console.log('[PlatformGame] retry path: restart current level after correct answer');
            setIsLevelFailed(false); // 閲嶇疆澶辫触鏍囪
            setTimeout(() => {
                startCampaignLevelWithIndex(currentCampaignLevel, currentLevelIndex, currentAgeGroup);
            }, 500);
        } else {
            // 鎴愬姛鍚庣瓟瀵归鐩細妫€鏌ユ槸鍚﹁繕鏈夋洿澶氶鐩?
            const nextQuestionIndex = questionIndex + 1;
            console.log('[PlatformGame] 涓嬩竴棰樼储寮?', nextQuestionIndex, '鎬婚鐩暟:', currentCampaignLevel.questions.length);
            
            if (nextQuestionIndex < currentCampaignLevel.questions.length) {
                // 杩樻湁棰樼洰锛屾樉绀轰笅涓€棰?
                console.log('[PlatformGame] opening next question');
                setQuestionIndex(nextQuestionIndex);
                setCurrentQuestion(currentCampaignLevel.questions[nextQuestionIndex]);
                setTimeout(() => {
                    setShowQuestion(true);
                }, 500); // 寤惰繜0.5绉掓樉绀轰笅涓€棰?
            } else {
                // 鎵€鏈夐鐩瓟瀹岋紝瀹屾垚鍏冲崱
                console.log('[PlatformGame] 鎵€鏈夐鐩瓟瀹岋紝瀹屾垚鍏冲崱');
                handleCampaignLevelComplete();
            }
        }
    };

    // 棰樼洰鍥炵瓟閿欒
    const handleQuestionWrong = () => {
        console.log('[PlatformGame] 绛旈閿欒');
        setShowQuestion(false);
        
        // 妫€鏌ユ槸鍚︽槸鍏冲崱鍐呯瓟棰樿Е鍙戠偣
        const questionCallback = (window as any).__questionCallback;
        if (questionCallback) {
            console.log('[PlatformGame] resolving in-level question callback: wrong');
            questionCallback(false, '');
            (window as any).__questionCallback = null;
            return;
        }
        
        // 鍚﹀垯鏄叧鍗＄粨鏉熺瓟棰橈紝閲嶆柊寮€濮嬪叧鍗?
        console.log('[PlatformGame] end-of-level answer was wrong, restarting level');
        if (currentCampaignLevel) {
            // 寤惰繜涓€涓嬪啀閲嶅惎锛岃鐢ㄦ埛鐪嬪埌閿欒鎻愮ず
            setTimeout(() => {
                startCampaignLevelWithIndex(currentCampaignLevel, currentLevelIndex, currentAgeGroup);
            }, 500);
        }
    };

    // 瀹屾垚鎴樺焦鍏冲崱
    const handleCampaignLevelComplete = async () => {
        if (!selectedCampaign || !currentCampaignLevel) return;
        
        console.log('[PlatformGame] 瀹屾垚鍏冲崱:', currentCampaignLevel.name, '褰撳墠绱㈠紩:', currentLevelIndex, '骞撮緞娈?', currentAgeGroup);
        
        // 鑾峰彇濂栧姳閲戦
        const rewardValues = applyCampaignRewardBonuses(
            currentCampaignLevel.rewards.xp,
            currentCampaignLevel.rewards.coins,
        );
        const coinsEarned = rewardValues.coins;
        const xpEarned = rewardValues.xp;
        
        // 娣诲姞濂栧姳
        addXp(xpEarned);
        addCoins(coinsEarned);
        
        // 馃獧 鏄剧ず閲戝竵濂栧姳Toast
        if (coinsEarned > 0) {
            showCoinRewardToast(coinsEarned, '完成关卡: ' + currentCampaignLevel.name, 'reward');
            syncCoinsToServer(coinsEarned, 'campaign_level_complete', '完成关卡: ' + currentCampaignLevel.name);
        }
        
        // 馃崠 鍙戞斁椋熺墿濂栧姳
        try {
            // 鏍规嵁鍏冲崱闅惧害鍙戞斁椋熺墿锛堥粯璁や腑绛夐毦搴︼級
            const difficulty = 'medium';
            await grantLevelCompleteReward(difficulty, showFoodRewardToast);
            console.log('[PlatformGame] 椋熺墿濂栧姳鍙戞斁鎴愬姛');
        } catch (error) {
            console.error('[PlatformGame] 椋熺墿濂栧姳鍙戞斁澶辫触:', error);
            // 濂栧姳澶辫触涓嶅奖鍝嶅叧鍗″畬鎴?
        }
        
        // 馃悤 鑷姩鍠傞瀹犵墿锛堝凡绉婚櫎锛屾敼涓烘墜鍔ㄥ杺椋燂級
        // 鐜╁闇€瑕佷娇鐢ㄨ幏寰楃殑椋熺墿鎵嬪姩鍠傚吇瀹犵墿
        
        // 馃敟 鏍囪鍏冲崱瀹屾垚锛堜娇鐢ㄥ勾榫勬鐙珛杩涘害锛?
        unlockRewardSkills(currentCampaignLevel.rewards.skills ?? (currentCampaignLevel.rewards as any).skill);

        if (currentAgeGroup) {
            completeAgeGroupLevel(currentAgeGroup, currentCampaignLevel.id);
        } else {
            completeCampaignLevel(currentCampaignLevel.id);
        }
        
        const nextLevelIndex = currentLevelIndex + 1;
        console.log('[PlatformGame] 涓嬩竴鍏崇储寮?', nextLevelIndex, '鎬诲叧鍗℃暟:', selectedCampaign.levels.length);
        
        if (nextLevelIndex < selectedCampaign.levels.length) {
            // 杩涘叆涓嬩竴鍏?
            console.log('[PlatformGame] 杩涘叆涓嬩竴鍏?', selectedCampaign.levels[nextLevelIndex].name, '骞撮緞娈?', currentAgeGroup);
            setCurrentLevelIndex(nextLevelIndex);
            // 寤惰繜鍚姩涓嬩竴鍏筹紝纭繚鐘舵€佹洿鏂板拰UI鍒锋柊
            setTimeout(() => {
                startCampaignLevelWithIndex(selectedCampaign.levels[nextLevelIndex], nextLevelIndex, currentAgeGroup);
            }, 100);
        } else {
            // 鎴樺焦瀹屾垚
            console.log('[PlatformGame] 鎴樺焦瀹屾垚!', '骞撮緞娈?', currentAgeGroup);
            // 馃敟 鏍囪鎴樺焦瀹屾垚锛堜娇鐢ㄥ勾榫勬鐙珛杩涘害锛?
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
                unlockRewardSkills(selectedCampaign.rewards.skills ?? (selectedCampaign.rewards as any).skill);

                if (campaignRewardValues.coins > 0) {
                    showCoinRewardToast(
                        campaignRewardValues.coins,
                        '完成战役: ' + selectedCampaign.name,
                        'reward',
                    );
                    syncCoinsToServer(
                        campaignRewardValues.coins,
                        'campaign_complete',
                        '完成战役: ' + selectedCampaign.name,
                    );
                }
            }

            if (currentAgeGroup) {
                completeAgeGroupCampaign(currentAgeGroup, selectedCampaign.id);
            } else {
                completeCampaign(selectedCampaign.id);
            }
            // 馃敟 寤惰繜杩斿洖鎴樺焦鍒楄〃锛岀‘淇濈姸鎬佹洿鏂板畬鎴?
            // 杩欐牱鍙互閬垮厤 CampaignSelector 鍦ㄧ姸鎬佹洿鏂板墠娓叉煋瀵艰嚧瑙ｉ攣鐘舵€佷笉姝ｇ‘
            setTimeout(() => {
                setShowCampaignSelector(true);
                setSelectedCampaign(null);
                setCurrentCampaignLevel(null);
            }, 100);
        }
    };

    // 寮€濮嬫垬褰瑰叧鍗★紙甯︾储寮曞拰骞撮緞娈碉級
    const startCampaignLevelWithIndex = (campaignLevel: CampaignLevel, levelIndex: number, ageGroup?: AgeGroup | null) => {
        // 浣跨敤浼犲叆鐨勫勾榫勬鎴栧綋鍓嶇姸鎬?
        const activeAgeGroup = ageGroup || currentAgeGroup;
        
        console.log('[PlatformGame] startCampaignLevelWithIndex triggered');
        console.log('[PlatformGame] campaignLevel:', campaignLevel.name);
        console.log('[PlatformGame] levelIndex:', levelIndex);
        console.log('[PlatformGame] activeAgeGroup:', activeAgeGroup);
        console.log('[PlatformGame] 浼犲叆鐨勯鐩暟閲?', campaignLevel.questions?.length);
        
        // 鍏堥攢姣佺幇鏈夋父鎴忓疄渚?
        if (gameRef.current) {
            console.log('[PlatformGame] destroying previous Phaser instance');
            destroyPlatformGame();
        }
        
        // 馃敟 妫€鏌ユ槸鍚﹀凡缁忔湁骞撮緞娈甸鐩紙閫氳繃棰樼洰ID鍓嶇紑鍒ゆ柇锛?
        const levelWithRandomQuestions = buildRuntimeCampaignLevel(campaignLevel, levelIndex, activeAgeGroup);
        const startLevelAgeGroupLabel = activeAgeGroup ? '(' + String(activeAgeGroup) + ')' : '(default)';
        console.log(
            '[PlatformGame] start level with runtime questions:',
            levelWithRandomQuestions.questions?.length || 0,
            startLevelAgeGroupLabel,
        );
        
        setCurrentCampaignLevel(levelWithRandomQuestions);
        setPlayerLives(getCampaignStartingLives()); // 閲嶇疆鐢熷懡鏁?        
        // 閲嶇疆棰樼洰鐘舵€?
        setCurrentQuestion(null);
        setQuestionIndex(0);
        setShowQuestion(false);
        
        // 濡傛灉鎴樺焦鍏冲崱鏈夎嚜瀹氫箟鍦板浘鏁版嵁锛屼娇鐢ㄥ畠锛涘惁鍒欎娇鐢ㄩ粯璁ゅ叧鍗?
        let levelData: any;
        if (campaignLevel.campaignMapData || campaignLevel.mapData) {
            // 灏嗘垬褰瑰湴鍥炬暟鎹浆鎹负鍏冲崱鏁版嵁鏍煎紡
            levelData = {
                id: campaignLevel.id,
                title: campaignLevel.name,
                description: campaignLevel.description,
                story: campaignLevel.story || campaignLevel.description,
                questions: levelWithRandomQuestions.questions,
                difficulty: 'medium',
                objectives: campaignLevel.objectives?.length
                    ? campaignLevel.objectives
                    : [{ type: 'reach' as const, description: '鍒拌揪缁堢偣' }],
                rewards: { exp: campaignLevel.rewards.xp, coins: campaignLevel.rewards.coins },
                campaignMapData: campaignLevel.campaignMapData || campaignLevel.mapData,
                bossConfig: campaignLevel.bossConfig // 浼犻€払oss閰嶇疆
            };
        } else {
            // 浣跨敤榛樿鍏冲崱鏁版嵁
            levelData = allLevels[levelIndex % allLevels.length];
        }
        
        console.log('[PlatformGame] 浣跨敤鐨勫叧鍗℃暟鎹?', levelData.title);
        console.log('[PlatformGame] Boss閰嶇疆:', levelData.bossConfig);
        setCurrentLevel(levelData as PlatformLevel);
        startLevel(levelData as PlatformLevel);
    };

    const startLevel = async (level: PlatformLevel) => {
        setCurrentLevel(level);
        setShowLevelSelect(false);
        setShowLevelComplete(false);
        setShowQuiz(false);

        // 绛夊緟DOM鏇存柊
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!parentRef.current || gameRef.current) return;

        // 鍔ㄦ€佸姞杞絇haser鍜屽満鏅?
        const Phaser = await import('phaser');
        const { default: PlatformGameScene } = await import('@/components/world/scenes/PlatformGameScene');

        // 妫€娴嬫槸鍚︿负绉诲姩璁惧
        // 绉诲姩绔娇鐢ㄨ嚜閫傚簲缂╂斁
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: isTouchDevice ? 800 : 960,
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
            // 馃敟 淇绉诲姩绔簿鐏垫姈鍔?铏氬儚闂
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
        setDevPlatformGame(gameRef.current);
        
        // 鍚姩鍦烘櫙骞朵紶閫掑叧鍗℃暟鎹?
        gameRef.current.scene.start('PlatformGameScene', { level });
    };

    const restartLevel = () => {
        if (currentLevel) {
            destroyPlatformGame();
            startLevel(currentLevel);
        }
    };

    const handleQuizCorrect = () => {
        if (!currentLevel) return;

        // 缁欎簣濂栧姳
        addXp(currentLevel.rewards.exp);
        addCoins(currentLevel.rewards.coins);
        if (currentLevel.rewards.coins > 0) {
            showCoinRewardToast(currentLevel.rewards.coins, '完成关卡: ' + currentLevel.title, 'reward');
            syncCoinsToServer(currentLevel.rewards.coins, 'level_complete', '完成关卡: ' + currentLevel.title);
        }

        setShowQuiz(false);
        
        // 鏄剧ず瀹屾垚鐣岄潰
        setTimeout(() => {
            alert('恭喜通关！\n获得经验: ' + currentLevel.rewards.exp + '\n获得金币: ' + currentLevel.rewards.coins);
            setShowLevelSelect(true);
            setCurrentLevel(null);
        }, 500);
    };

    const handleQuizWrong = () => {
        setShowQuiz(false);
        alert('答题错误，重新挑战关卡！');
        restartLevel();
    };

    const handleQuizClose = () => {
        setShowQuiz(false);
        setShowLevelSelect(true);
        setCurrentLevel(null);
    };

    // 鏄剧ず鎴樺焦閫夋嫨鍣?
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
            <div className="fixed inset-0 z-50 overflow-auto bg-[radial-gradient(circle_at_top,#224b6d_0%,#111a30_40%,#060a12_100%)]">
                <div className={`sticky top-0 z-10 border-b bg-gradient-to-r ${activePlatformShellTheme.chromeClassName} p-4 shadow-[0_18px_36px_rgba(0,0,0,0.26)] backdrop-blur-xl`}>
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                        <div className="min-w-0">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
                                <Gamepad2 className="h-3.5 w-3.5" />
                                <span>Free Play</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white md:text-3xl">平台冒险关卡库</h1>
                            <p className="mt-1 text-sm text-white/70">这个入口保留给单关调试和自由试玩，战役主流程仍从战役地图进入。</p>
                        </div>
                        <button
                            onClick={onExit}
                            className="rounded-2xl border border-white/10 bg-slate-950/36 px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-950/60"
                        >
                            返回世界
                        </button>
                    </div>
                </div>

                <div className="mx-auto max-w-6xl p-5 sm:p-8">
                    <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/68 p-5 shadow-[0_26px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                        <h2 className="text-xl font-bold text-white sm:text-2xl">选择单关</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-200/78">
                            完成目标后再答题过关；若挑战失败，可以通过复活答题回到当前关卡继续尝试。
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {allLevels.map((level) => (
                            <div
                                key={level.id}
                                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_18px_46px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-1 hover:border-sky-200/22 hover:shadow-[0_24px_54px_rgba(45,107,158,0.18)]"
                                onClick={() => startLevel(level)}
                            >
                                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-white/10 via-sky-300/10 to-transparent" />
                                <div className="relative">
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.24em] text-white/48">Level {level.id}</div>
                                            <h3 className="mt-1 text-xl font-bold text-white">{level.title}</h3>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                            level.difficulty === 'easy'
                                                ? 'bg-emerald-400/18 text-emerald-100'
                                                : level.difficulty === 'medium'
                                                    ? 'bg-amber-300/18 text-amber-50'
                                                    : 'bg-rose-300/18 text-rose-100'
                                        }`}>
                                            {level.difficulty === 'easy' ? '简单' : level.difficulty === 'medium' ? '中等' : '困难'}
                                        </span>
                                    </div>

                                    <p className="mb-5 text-sm leading-6 text-slate-200/78">{level.description}</p>

                                    <div className="mb-5 rounded-[22px] border border-white/8 bg-black/16 p-4">
                                        <p className="mb-2 text-sm font-semibold text-sky-100">本关目标</p>
                                        <ul className="space-y-2">
                                            {level.objectives.map((obj, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-200/78">
                                                    <span className="mt-0.5 text-sky-200">•</span>
                                                    <span>{obj.description}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-sky-100">
                                            <Star className="mr-1 inline h-4 w-4" />
                                            {level.rewards.exp} EXP
                                        </span>
                                        <span className="text-amber-100">
                                            <Coins className="mr-1 inline h-4 w-4" />
                                            {level.rewards.coins} 金币
                                        </span>
                                    </div>

                                    <button className="mt-5 w-full rounded-2xl border border-sky-200/16 bg-gradient-to-r from-sky-300 to-emerald-300 px-4 py-3 font-bold text-slate-950 transition-all group-hover:shadow-[0_18px_30px_rgba(52,211,153,0.18)]">
                                        开始挑战
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <MobileGameWrapper showController={isTouchDevice}>
            <div className={`fixed inset-0 z-40 flex flex-col bg-[radial-gradient(circle_at_top,#173c4d_0%,#0c1620_45%,#060911_100%)] ${activePlatformShellTheme.accentClassName}`}>
                <div className={`border-b bg-gradient-to-r ${activePlatformShellTheme.chromeClassName} p-3 shadow-[0_14px_30px_rgba(6,10,18,0.35)] backdrop-blur-xl md:p-4`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/55">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-2.5 py-1">
                                    <Gamepad2 className="h-3.5 w-3.5" />
                                    <span>Adventure Mode</span>
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-white/72">
                                    Lives {playerLives}
                                </span>
                            </div>
                            <h2 className="truncate text-sm font-bold text-white md:text-xl">
                                {activeStageTitle}
                            </h2>
                            <p className="mt-1 hidden truncate text-xs text-white/70 md:block md:text-sm">
                                {activeStageSubtitle}
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-2 md:gap-3">
                            <button
                                onClick={restartLevel}
                                data-restart-button
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-100/35 bg-amber-400/85 px-3 py-2 text-xs font-bold text-slate-950 shadow-[0_10px_20px_rgba(245,158,11,0.28)] transition-all hover:-translate-y-0.5 hover:bg-amber-300 md:px-4 md:text-sm"
                            >
                                <RotateCcw className="h-4 w-4" />
                                <span className="hidden md:inline">重新开始</span>
                                <span className="md:hidden">重开</span>
                            </button>
                            <button
                                onClick={() => {
                                    destroyPlatformGame();
                                    setShowCampaignSelector(true);
                                    setSelectedCampaign(null);
                                    setCurrentCampaignLevel(null);
                                    setCurrentLevel(null);
                                }}
                                className="rounded-xl border border-white/12 bg-slate-950/45 px-3 py-2 text-xs font-bold text-white shadow-[0_10px_20px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 hover:bg-slate-900/80 md:px-4 md:text-sm"
                            >
                                <span className="hidden md:inline">返回战役选择</span>
                                <span className="md:hidden">返回</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto px-2 py-2 md:px-4 md:py-4">
                    <div className="mx-auto flex min-h-full min-w-fit items-center justify-center">
                        <div
                            ref={parentRef}
                            className={`rounded-[28px] border bg-slate-950/72 ${activePlatformShellTheme.panelClassName} shadow-[0_25px_60px_rgba(4,8,15,0.45)]`}
                            style={{
                                width: isTouchDevice ? 'min(100%, 960px)' : 'min(98vw, 1680px)',
                                aspectRatio: isTouchDevice ? '4 / 3' : '16 / 10',
                                minWidth: isTouchDevice ? '320px' : '960px',
                                minHeight: isTouchDevice ? '240px' : '600px',
                                maxHeight: isTouchDevice ? 'calc(100vh - 96px)' : 'calc(100vh - 92px)',
                            }}
                        />
                    </div>
                </div>

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
                        }}
                        onRetry={() => {
                            setShowLevelComplete(false);
                            setLevelCompleteData(null);
                            restartLevel();
                        }}
                    />
                )}

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
                        isFailed={questionMode === 'retry'}
                        mode={questionMode}
                    />
                )}

                {showQuiz && currentLevel && (
                    <QuizModal
                        isOpen={showQuiz}
                        quiz={currentLevel.quiz}
                        onCorrect={handleQuizCorrect}
                        onWrong={handleQuizWrong}
                        onClose={handleQuizClose}
                    />
                )}

                {showReviveModal && (
                    <DeathQuizModal
                        isOpen={showReviveModal}
                        onSuccess={() => {
                            console.log('[PlatformGame] revive quiz passed, restarting level');
                            setShowReviveModal(false);
                            restartLevel();
                        }}
                    />
                )}
            </div>
        </MobileGameWrapper>
    );
}
