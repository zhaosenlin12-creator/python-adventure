"use client";

// 版本号 - 用于验证部署是否成功
const BUILD_VERSION = "v20260406-stable6-r7";
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamicImport from 'next/dynamic';
import { useRouter } from 'next/navigation';

const PhaserGame = dynamicImport(() => import('@/components/world/PhaserGame'), {
    ssr: false,
    loading: () => <div className="w-full h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] flex items-center justify-center text-blue-400 font-pixel">开放世界加载中...</div>
});
import SkillChallengeModal from "@/components/game/SkillChallengeModal";
import DoorChallengeModal from "@/components/game/DoorChallengeModal";
import SkillTreeModal from "@/components/game/SkillTreeModal";
import ArenaSelect from "@/components/game/ArenaSelect";
import ArenaChallengeModal from "@/components/game/ArenaChallengeModal";
import LeaderboardModal from "@/components/game/LeaderboardModal";
import ArenaLeaderboardModal from "@/components/game/ArenaLeaderboardModal";
import Footer from "@/components/Footer";
import BattleMatchmaking from "@/components/game/BattleMatchmaking";
import BattleRoom from "@/components/game/BattleRoom";
import dynamicPvp from 'next/dynamic';

const PvpBattleSystem = dynamicPvp(() => import('@/components/game/pvp/PvpBattleSystem'), {
    ssr: false,
    loading: () => null
});
const PvpBattleRoyaleSystem = dynamicPvp(() => import('@/components/game/pvp-br/PvpBattleRoyaleSystem'), {
    ssr: false,
    loading: () => (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/88 backdrop-blur-sm">
            <div className="rounded-[28px] border border-cyan-300/15 bg-slate-900/92 px-7 py-6 text-center shadow-[0_24px_70px_rgba(2,6,23,0.52)]">
                <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
                <div className="text-lg font-semibold text-white">正在进入宠物生存乱斗...</div>
                <div className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                    已触发交互，系统正在加载大厅与联网资源。加载完成后会自动进入，不需要重复按 E/F。
                </div>
            </div>
        </div>
    )
});
import PlatformGame from "@/components/game/PlatformGame";
import ResultModal from "@/components/game/ResultModal";
import OnlinePlayersList from "@/components/world/OnlinePlayersList";
import { useGameStore } from "@/store/gameStore";
import { useAuthStore } from "@/store/authStore";
import { usePetStore } from "@/store/petStore";
import { useSoundStore } from "@/store/soundStore";
import { musicManager } from "@/lib/audio/musicManager";
import { ARENA_CHALLENGES, ArenaChallenge } from "@/types/arena";
import { WorldSyncService, type WorldSyncMode } from "@/lib/services/worldSync";
import OrientationLock from "@/components/game/OrientationLock";
import MobileGameWrapper from "@/components/game/MobileGameWrapper";

export default function WorldPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    
    // 原有的模态框
    const [showSkillChallenge, setShowSkillChallenge] = useState(false);
    const [showDoorChallenge, setShowDoorChallenge] = useState(false);
    const [showSkillTree, setShowSkillTree] = useState(false);
    const [showArenaSelect, setShowArenaSelect] = useState(false);
    const [showArenaChallenge, setShowArenaChallenge] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showArenaLeaderboard, setShowArenaLeaderboard] = useState(false);
    const [currentSkillId, setCurrentSkillId] = useState<string>("");
    const [currentChallenge, setCurrentChallenge] = useState<ArenaChallenge | null>(null);
    const [currentDoorId, setCurrentDoorId] = useState<string>("arena_door");
    
    // 平台游戏状态
    const [showPlatformGame, setShowPlatformGame] = useState(false);
    
    // PvP对战状态
    const [showPvPMatchmaking, setShowPvPMatchmaking] = useState(false);
    const [showPvPBattle, setShowPvPBattle] = useState(false);
    const [pvpRoomId, setPvpRoomId] = useState<string>("");
    const [pvpOpponent, setPvpOpponent] = useState<string>("");
    const [pvpTaskId, setPvpTaskId] = useState<number>(0);
    
    // 新 PVP 三轮制系统
    const [showNewPvp, setShowNewPvp] = useState(false);
    const [showBattleRoyale, setShowBattleRoyale] = useState(false);
    
    // 结果弹窗状态
    const [showResultModal, setShowResultModal] = useState(false);
    const [resultData, setResultData] = useState<any>(null);
    
    // 在线玩家状态
    const [onlinePlayers, setOnlinePlayers] = useState<any[]>([]);
    const [worldSync, setWorldSync] = useState<WorldSyncService | null>(null);
    const [worldSyncNotice, setWorldSyncNotice] = useState<{ tone: 'success' | 'warning' | 'info'; text: string } | null>(null);
    const lastWorldSyncModeRef = useRef<WorldSyncMode>('websocket');
    
    // 🔥 创意工坊加载状态
    const [isLoadingEditor, setIsLoadingEditor] = useState(false);

    const { unlockSkill, level: userLevel } = useGameStore();
    const { user, token, isAuthenticated } = useAuthStore();

    const getCurrentPetSyncPayload = useCallback(() => {
        const currentPet = usePetStore.getState().currentPet;
        if (!currentPet) return {};
        return {
            pet_id: currentPet.id,
            pet_type: currentPet.petType,
            pet_name: currentPet.name,
            pet_status: currentPet.status,
            pet_is_egg: Boolean(currentPet.isEgg),
            pet_evolution_stage: typeof currentPet.evolution_stage === 'number' ? currentPet.evolution_stage : undefined,
            pet_hatch_progress: typeof currentPet.hatchProgress === 'number' ? currentPet.hatchProgress : undefined,
            pet_level: currentPet.level
        };
    }, []);

    // 获取后端API URL
    const getBackendUrl = useCallback(() => {
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        // 生产环境域名列表
        const productionHosts = ['game.codebn.cn', 'codebn.cn'];
        const isProduction = productionHosts.some(h => host === h || host.endsWith('.' + h));
        
        // 生产环境通过Nginx代理，不需要端口
        if (isProduction) {
            return `${protocol}//${host}`;
        }
        // 开发环境直接访问后端端口
        return `${protocol}//${host}:8000`;
    }, []);

    // 更新玩家位置到后端 - 使用 useCallback 避免重复创建
    const updatePlayerLocation = useCallback(async (x: number, y: number, mapArea: string) => {
        if (!token) return;

        try {
            const apiUrl = `${getBackendUrl()}/api/v1/world/update-location`;
            
            await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    x,
                    y,
                    map_area: mapArea
                })
            });
        } catch (error) {
            // 静默处理，不阻塞游戏
            debugLog('[WorldPage] Failed to update location (non-blocking):', error);
        }
    }, [getBackendUrl, token]);

    useEffect(() => {
        // 输出版本号，用于验证部署
        debugLog(`%c🎮 Code Adventure ${BUILD_VERSION}`, 'color: #00ff00; font-size: 16px; font-weight: bold;');
        setMounted(true);
        
        // 初始化背景音乐
        if (typeof window !== 'undefined') {
            musicManager.initialize();
            
            // 用户首次交互后启动音乐
            const handleFirstInteraction = async () => {
                try {
                    const { isMuted } = useSoundStore.getState();
                    if (!isMuted) {
                        await musicManager.play();
                    }
                } catch (e) {
                    console.error('[WorldPage] Failed to start background music:', e);
                }
                document.removeEventListener('click', handleFirstInteraction);
                document.removeEventListener('keydown', handleFirstInteraction);
                document.removeEventListener('touchstart', handleFirstInteraction);
            };
            
            document.addEventListener('click', handleFirstInteraction);
            document.addEventListener('keydown', handleFirstInteraction);
            document.addEventListener('touchstart', handleFirstInteraction);
        }
    }, []);

    useEffect(() => {
        if (worldSyncNotice?.tone !== 'success') {
            return;
        }
        const timer = setTimeout(() => {
            setWorldSyncNotice(current => (current?.tone === 'success' ? null : current));
        }, 2400);
        return () => clearTimeout(timer);
    }, [worldSyncNotice]);

    // 单独的 useEffect 处理 WebSocket
    useEffect(() => {
        if (!user?.id || !isAuthenticated || !token) return;
        
        debugLog('[WorldPage] Initializing WebSocket for user:', user.id, user.username);
        lastWorldSyncModeRef.current = 'websocket';
        setWorldSyncNotice(null);
        
        // 先更新玩家位置到后端
        updatePlayerLocation(100, 100, "开放世界");
        
        const sync = new WorldSyncService(user.id, "开放世界");
        
        // 使用 useCallback 优化回调函数
        sync.setCallbacks({
            onPlayerJoin: (player) => {
                setOnlinePlayers(prev => {
                    const index = prev.findIndex(p => p.user_id === player.user_id);
                    if (index !== -1) {
                        const newPlayers = [...prev];
                        newPlayers[index] = { ...newPlayers[index], ...player };
                        return newPlayers;
                    }
                    return [...prev, player];
                });
            },
            onPlayerLeave: (userId) => {
                setOnlinePlayers(prev => prev.filter(p => p.user_id !== userId));
            },
            onPlayerMove: (player) => {
                setOnlinePlayers(prev => {
                    const index = prev.findIndex(p => p.user_id === player.user_id);
                    if (index === -1) return [...prev, player];
                    // 浅拷贝优化
                    const newPlayers = [...prev];
                    newPlayers[index] = { ...newPlayers[index], ...player };
                    return newPlayers;
                });
            },
            onPlayersList: (players) => {
                setOnlinePlayers(players);
            },
            onConnected: () => {},
            onDisconnected: () => {},
            onModeChange: (mode) => {
                const previousMode = lastWorldSyncModeRef.current;
                lastWorldSyncModeRef.current = mode;
                if (mode === 'reconnecting') {
                    setWorldSyncNotice({ tone: 'warning', text: '联机波动，正在自动重连' });
                    return;
                }
                if (mode === 'polling') {
                    setWorldSyncNotice({ tone: 'info', text: '联机波动，已切到轻量模式' });
                    return;
                }
                if (mode === 'websocket' && previousMode !== 'websocket') {
                    setWorldSyncNotice({ tone: 'success', text: '实时联机已恢复' });
                }
            }
        });
        
        sync.connect().catch(error => {
            console.error('[WorldPage] Failed to connect WebSocket:', error);
            setWorldSyncNotice({ tone: 'info', text: '联机暂时不可用，已切到轻量模式' });
        });
        
        setWorldSync(sync);
        
        return () => {
            sync.disconnect();
        };
    }, [user?.id, isAuthenticated, token, updatePlayerLocation]);

    // 单独的 useEffect 处理事件监听
    useEffect(() => {
        // 监听来自Phaser场景的自定义事件
        const handleSkillShrineActivate = (event: any) => {
            setCurrentSkillId(event.detail.skillId || 'double_jump');
            setShowSkillChallenge(true);
        };

        const handleDoorActivate = () => {
            setShowDoorChallenge(true);
        };

        const handleSkillTreeOpen = () => {
            setShowSkillTree(true);
        };

        const handleArenaChallengeOpen = (event: any) => {
            const challenge = ARENA_CHALLENGES.find(c => c.id === (event.detail.challengeId || 'draw_001'));
            setCurrentChallenge(challenge || null);
            setShowArenaChallenge(true);
        };
        
        // 新的站点交互事件
        const handleStationInteraction = (event: any) => {
            const { stationId } = event.detail;
            debugLog('[WorldPage] Station interaction received:', stationId);
            
            switch (stationId) {
                case 'campaign':
                    debugLog('[WorldPage] 进入战役模式...');
                    musicManager.switchBGM('battle'); // 🔥 切换到战斗BGM
                    setShowPlatformGame(true);
                    break;
                case 'arena':
                    // 竞技场 - 进入竞技场平台游戏场景
                    debugLog('[WorldPage] 进入竞技场场景...');
                    musicManager.switchBGM('arena'); // 🔥 切换到竞技场BGM
                    window.dispatchEvent(new CustomEvent('enter-arena'));
                    break;
                case 'skilltree':
                    setShowSkillTree(true);
                    break;
                case 'pvp':
                    // 使用新的三轮制 PVP 系统（PVP组件内部会切换BGM）
                    setShowNewPvp(true);
                    break;
                case 'battle_royale':
                    window.dispatchEvent(new Event('modal-opened'));
                    setShowBattleRoyale(true);
                    break;
                case 'secret':
                    debugLog('[WorldPage] 打开密码门挑战');
                    setCurrentDoorId('arena_door');
                    setShowDoorChallenge(true);
                    break;
                case 'creative':
                    // 创意工坊 - 显示加载提示后跳转到编辑器页面
                    debugLog('[WorldPage] 进入创意工坊...');
                    setIsLoadingEditor(true);
                    // 延迟一点让用户看到加载提示
                    setTimeout(() => {
                        router.push('/editor');
                    }, 100);
                    break;
            }
        };

        // 监听竞技场挑战事件
        const handleOpenArenaChallenge = (event: any) => {
            const { challenge } = event.detail;
            setCurrentChallenge(challenge);
            setShowArenaChallenge(true);
        };

        // 监听排行榜事件
        const handleOpenLeaderboard = () => {
            setShowLeaderboard(true);
        };
        
        // 监听竞技场排行榜事件
        const handleOpenArenaLeaderboard = () => {
            setShowArenaLeaderboard(true);
        };
        
        // 监听PvP对战结束事件
        const handlePvPBattleEndEvent = (event: any) => {
            handlePvPBattleEnd(event.detail);
        };
        
        // 🔥 监听场景切换事件（从竞技场返回时），切换回主BGM
        const handleSceneChanged = () => {
            debugLog('[WorldPage] Scene changed, switching to main BGM');
            musicManager.switchBGM('main');
        };

        window.addEventListener('skill-shrine-activate', handleSkillShrineActivate);
        window.addEventListener('door-activate', handleDoorActivate);
        window.addEventListener('skill-tree-open', handleSkillTreeOpen);
        window.addEventListener('arena-challenge-open', handleArenaChallengeOpen);
        window.addEventListener('open-arena-challenge', handleOpenArenaChallenge);
        window.addEventListener('open-leaderboard', handleOpenLeaderboard);
        window.addEventListener('open-arena-leaderboard', handleOpenArenaLeaderboard);
        window.addEventListener('stationInteraction', handleStationInteraction);
        window.addEventListener('pvp-battle-end', handlePvPBattleEndEvent);
        window.addEventListener('scene-changed', handleSceneChanged);

        return () => {
            window.removeEventListener('skill-shrine-activate', handleSkillShrineActivate);
            window.removeEventListener('door-activate', handleDoorActivate);
            window.removeEventListener('skill-tree-open', handleSkillTreeOpen);
            window.removeEventListener('arena-challenge-open', handleArenaChallengeOpen);
            window.removeEventListener('open-arena-challenge', handleOpenArenaChallenge);
            window.removeEventListener('open-leaderboard', handleOpenLeaderboard);
            window.removeEventListener('open-arena-leaderboard', handleOpenArenaLeaderboard);
            window.removeEventListener('stationInteraction', handleStationInteraction);
            window.removeEventListener('pvp-battle-end', handlePvPBattleEndEvent);
            window.removeEventListener('scene-changed', handleSceneChanged);
        };
    }, []); // 事件监听器只需要注册一次
    
    // 单独的useEffect处理位置更新（依赖worldSync）
    useEffect(() => {
        if (!worldSync) return;
        
        const handlePlayerPositionUpdate = (event: any) => {
            const { x, y, direction } = event.detail;
            worldSync.sendPosition(x, y, direction, getCurrentPetSyncPayload());
        };

        const handlePetStatusChanged = (event: any) => {
            const pet = event?.detail?.pet;
            const payload = pet ? {
                pet_id: pet.id,
                pet_type: pet.petType,
                pet_name: pet.name,
                pet_status: pet.status,
                pet_is_egg: Boolean(pet.isEgg),
                pet_evolution_stage: typeof pet.evolution_stage === 'number' ? pet.evolution_stage : undefined,
                pet_hatch_progress: typeof pet.hatchProgress === 'number' ? pet.hatchProgress : undefined,
                pet_level: pet.level
            } : getCurrentPetSyncPayload();
            worldSync.sendPetChange(payload);
        };
        
        window.addEventListener('player-position-update', handlePlayerPositionUpdate);
        window.addEventListener('pet-status-changed', handlePetStatusChanged);
        
        return () => {
            window.removeEventListener('player-position-update', handlePlayerPositionUpdate);
            window.removeEventListener('pet-status-changed', handlePetStatusChanged);
        };
    }, [worldSync, getCurrentPetSyncPayload]);
    
    // 使用 ref 追踪上次派发的玩家数据，避免不必要的事件派发
    const lastDispatchedPlayers = useRef<string>('');
    
    useEffect(() => {
        if (onlinePlayers.length === 0) return;
        
        // 序列化当前玩家数据
        const currentData = JSON.stringify(onlinePlayers.map(p => ({
            id: p.user_id,
            x: p.x,
            y: p.y,
            pet_type: p.pet_type ?? p.petType ?? null
        })));
        
        // 只在数据真正变化时才派发事件
        if (currentData !== lastDispatchedPlayers.current) {
            lastDispatchedPlayers.current = currentData;
            window.dispatchEvent(new CustomEvent('online-players-update', {
                detail: { players: onlinePlayers }
            }));
        }
    }, [onlinePlayers]);

    const handleSkillUnlock = () => {
        unlockSkill(currentSkillId);
        // Dispatch event back to Phaser
        window.dispatchEvent(new CustomEvent('skill-unlocked', {
            detail: { skillId: currentSkillId }
        }));
    };

    const handleDoorUnlock = () => {
        // 解锁 door_unlocked 技能，这样竞技场就可以进入了
        unlockSkill('door_unlocked');
        
        // Dispatch event back to Phaser
        window.dispatchEvent(new CustomEvent('door-unlocked'));
        window.dispatchEvent(new CustomEvent('skill-unlocked', {
            detail: { skillId: 'door_unlocked' }
        }));
    };

    const handleArenaChallengeComplete = useCallback((timeUsed: number, codeLength: number) => {
        // Dispatch event to ArenaScene
        window.dispatchEvent(new CustomEvent('arena-challenge-completed', {
            detail: { 
                challengeId: currentChallenge?.id,
                timeUsed,
                codeLength
            }
        }));
        setShowArenaChallenge(false);
        // 不要跳转到选择界面，留在竞技场场景中
    }, [currentChallenge?.id]);
    
    const handleArenaChallengeClose = useCallback(() => {
        setShowArenaChallenge(false);
        // 鍏抽棴鍚庣暀鍦ㄧ珵鎶€鍦猴紝涓嶈烦杞?
        window.dispatchEvent(new CustomEvent('arena-challenge-closed'));
    }, []);

    const handleArenaChallengeFail = useCallback(() => {
        // 澶辫触鍚庝篃鐣欏湪绔炴妧鍦?
        window.dispatchEvent(new CustomEvent('arena-challenge-failed'));
    }, []);

    const handleSelectChallenge = useCallback((challenge: ArenaChallenge) => {
        setCurrentChallenge(challenge);
        setShowArenaSelect(false);
        setShowArenaChallenge(true);
    }, []);
    
    
    // PvP对战处理
    const handlePvPMatchFound = (roomId: string, opponentName: string, taskId: number) => {
        setPvpRoomId(roomId);
        setPvpOpponent(opponentName);
        setPvpTaskId(taskId);
        setShowPvPMatchmaking(false);
        setShowPvPBattle(true);
    };
    
    const handlePvPBattleEnd = (result?: any) => {
        // 如果有结果，显示奖励
        if (result) {
            const { addXp, addCoins } = useGameStore.getState();
            const isWinner = result.winner_id === useAuthStore.getState().user?.id;
            
            const xpGained = isWinner ? 50 : 20;
            const coinsGained = isWinner ? 100 : 30;
            
            // 添加奖励
            addXp(xpGained);
            addCoins(coinsGained);
            
            // 设置结果数据并显示弹窗
            setResultData({
                isWinner,
                xpGained,
                coinsGained,
                rankChange: result.player1_rank_change,
                title: isWinner ? 'PvP对战胜利！' : 'PvP对战失败',
                message: isWinner ? '恭喜你战胜了对手！' : '继续努力，下次一定能赢！'
            });
            setShowResultModal(true);
        }
        
        setShowPvPBattle(false);
        setPvpRoomId("");
        setPvpOpponent("");
        setPvpTaskId(0);
    };

    // Prevent SSR hydration mismatch
    if (!mounted) {
        return null;
    }

    return (
        <OrientationLock requireLandscape={true}>
        <div className="relative w-full h-screen">
            {/* 🔥 创意工坊加载提示 */}
            {isLoadingEditor && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
                    <div className="text-6xl mb-4 animate-bounce">🎨</div>
                    <div className="text-yellow-400 font-pixel text-2xl mb-2">正在进入创意工坊...</div>
                    <div className="text-gray-400 text-sm">加载编辑器资源中，请稍候</div>
                    <div className="mt-4 w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse rounded-full" style={{ width: '60%' }} />
                    </div>
                </div>
            )}
            
            {/* Phaser游戏场景 */}
            {!showPlatformGame && !showPvPBattle && (
                <MobileGameWrapper showController={true}>
                    <PhaserGame />
                </MobileGameWrapper>
            )}
            
            {/* 在线玩家列表 */}
            {!showPlatformGame && !showPvPBattle && user && (
                <OnlinePlayersList 
                    players={onlinePlayers}
                    currentUserId={user.id}
                    mapArea="开放世界"
                    connectionNotice={worldSyncNotice}
                />
            )}
            
            {/* 平台闯关游戏 */}
            {showPlatformGame && (
                <PlatformGame onExit={() => {
                    setShowPlatformGame(false);
                    // 🔥 退出战役模式时，切换回主BGM
                    musicManager.switchBGM('main');
                    // 触发模态框关闭事件，重置键盘状态
                    window.dispatchEvent(new Event('modal-closed'));
                    setTimeout(() => {
                        window.dispatchEvent(new Event('scene-changed'));
                    }, 100);
                }} />
            )}

            {/* Skill Challenge Modal */}
            <SkillChallengeModal
                isOpen={showSkillChallenge}
                onClose={() => setShowSkillChallenge(false)}
                skillId={currentSkillId}
                onUnlock={handleSkillUnlock}
            />

            {/* Door Challenge Modal */}
            <DoorChallengeModal
                isOpen={showDoorChallenge}
                onClose={() => setShowDoorChallenge(false)}
                doorId={currentDoorId}
                onUnlock={handleDoorUnlock}
            />

            {/* Skill Tree Modal */}
            <SkillTreeModal
                isOpen={showSkillTree}
                onClose={() => setShowSkillTree(false)}
            />

            {/* Arena Select */}
            {showArenaSelect && (
                <ArenaSelect
                    onSelectChallenge={handleSelectChallenge}
                    onClose={() => setShowArenaSelect(false)}
                />
            )}
            
            {/* Arena Challenge Modal */}
            {showArenaChallenge && currentChallenge && (
                <ArenaChallengeModal
                    challenge={currentChallenge}
                    onClose={handleArenaChallengeClose}
                    onComplete={handleArenaChallengeComplete}
                    onFail={handleArenaChallengeFail}
                />
            )}
            
            {/* PvP匹配模态框 */}
            <BattleMatchmaking
                isOpen={showPvPMatchmaking}
                onClose={() => setShowPvPMatchmaking(false)}
                onMatchFound={handlePvPMatchFound}
            />
            
            {/* PvP对战房间 */}
            {showPvPBattle && (
                <BattleRoom
                    roomId={pvpRoomId}
                    opponentName={pvpOpponent}
                    taskId={pvpTaskId}
                    onBattleEnd={(result) => {
                        handlePvPBattleEnd(result);
                    }}
                    onClose={() => handlePvPBattleEnd()}
                />
            )}

            {/* 排行榜模态框 */}
            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
            />
            
            {/* 竞技场排行榜模态框 */}
            <ArenaLeaderboardModal
                isOpen={showArenaLeaderboard}
                onClose={() => setShowArenaLeaderboard(false)}
            />

            {/* 结果弹窗 */}
            {resultData && (
                <ResultModal
                    isOpen={showResultModal}
                    onClose={() => {
                        setShowResultModal(false);
                        setResultData(null);
                    }}
                    isWinner={resultData.isWinner}
                    xpGained={resultData.xpGained}
                    coinsGained={resultData.coinsGained}
                    rankChange={resultData.rankChange}
                    title={resultData.title}
                    message={resultData.message}
                />
            )}

            {/* 新 PVP 三轮制系统 */}
            <PvpBattleSystem
                isOpen={showNewPvp}
                onClose={() => setShowNewPvp(false)}
            />

            {showBattleRoyale && (
                <PvpBattleRoyaleSystem
                    isOpen={showBattleRoyale}
                    onClose={() => setShowBattleRoyale(false)}
                />
            )}

            {/* 底部备案信息 */}
            <Footer />
        </div>
        </OrientationLock>
    );
}
