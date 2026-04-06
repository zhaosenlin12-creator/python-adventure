"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { useAuthStore } from "@/store/authStore";
import { useCoinStore } from "@/store/coinStore";
import { useSoundStore } from "@/store/soundStore";
import { musicManager } from "@/lib/audio/musicManager";
import { useI18n } from "@/lib/i18n";
import AuthModal from "@/components/auth/AuthModal";
import ChapterSelect from "@/components/game/ChapterSelect";
import WorldMap from "@/components/game/WorldMap";
import LevelView from "@/components/game/LevelView";
import LeaderboardModal from "@/components/game/LeaderboardModal";
import { SyncStatusIndicator } from "@/components/game/SyncStatusIndicator";
import { Level } from "@/lib/levels";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trophy, LogOut, User, Volume2, VolumeX, Languages } from "lucide-react";
import Footer from "@/components/Footer";
import CoinBalance from "@/components/ui/CoinBalance";
import CoinHistory from "@/components/ui/CoinHistory";
import NewUserGuide, { shouldShowNewUserGuide } from "@/components/ui/NewUserGuide";
import SystemUpdateAnnouncement from "@/components/ui/SystemUpdateAnnouncement";
import DailyCheckIn from "@/components/pet/DailyCheckIn";
import AchievementPanel from "@/components/pet/AchievementPanel";

type ViewState = 'home' | 'map' | 'level';

export default function Home() {
    const router = useRouter();
    const { isAuthenticated, user, logout, validateToken, token } = useAuthStore();
    const [view, setView] = useState<ViewState>('home');
    const [selectedChapter, setSelectedChapter] = useState<number>(1);
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showCoinHistory, setShowCoinHistory] = useState(false);
    const [showNewUserGuide, setShowNewUserGuide] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isValidating, setIsValidating] = useState(true); // 🔒 Token验证状态
    const { level: userLevel, xp } = useGameStore();
    const { balance: coins, loadBalance } = useCoinStore(); // 使用统一的coinStore
    const { isMuted, toggleMute } = useSoundStore();
    const { language, setLanguage, t } = useI18n();
    const musicInitialized = useRef(false);
    const tokenValidated = useRef(false); // 🔒 防止重复验证

    useEffect(() => {
        setMounted(true);

        // 🔒 页面加载时验证Token（只验证一次）
        if (!tokenValidated.current && isAuthenticated) {
            tokenValidated.current = true;
            validateToken().finally(() => {
                setIsValidating(false);
            });
        } else {
            setIsValidating(false);
        }
        
        // 加载金币余额
        if (isAuthenticated && token) {
            loadBalance(token);
        }
        
        // 👋 检查是否需要显示新用户引导
        if (isAuthenticated && shouldShowNewUserGuide(user?.id)) {
            setShowNewUserGuide(true);
        }

        // 只初始化一次音乐管理器
        if (!musicInitialized.current) {
            musicInitialized.current = true;
            musicManager.initialize();

            // 启动背景音乐
            if (typeof window !== 'undefined') {
                // 用户首次交互后启动音乐
                const handleFirstInteraction = async () => {
                    try {
                        const { isMuted } = useSoundStore.getState();
                        if (!isMuted) {
                            await musicManager.play();
                        }
                    } catch (e) {
                        console.error('[HomePage] Failed to start background music:', e);
                    }
                    document.removeEventListener('click', handleFirstInteraction);
                    document.removeEventListener('keydown', handleFirstInteraction);
                    document.removeEventListener('touchstart', handleFirstInteraction);
                };
                
                document.addEventListener('click', handleFirstInteraction);
                document.addEventListener('keydown', handleFirstInteraction);
                document.addEventListener('touchstart', handleFirstInteraction);
            }
        }

        // Listen for campaign mode trigger from open world
        const handleOpenCampaign = (event?: Event) => {
            const detail = (event as CustomEvent | undefined)?.detail as { chapterId?: number; openMap?: boolean } | undefined;
            if (detail?.openMap) {
                setSelectedChapter(detail.chapterId ?? 1);
                setView('map');
                return;
            }
            setView('home'); // Show chapter selection
        };
        

        window.addEventListener('open-campaign', handleOpenCampaign);

        return () => {
            window.removeEventListener('open-campaign', handleOpenCampaign);
        };
    }, [isAuthenticated, validateToken, token, loadBalance]);

    // 🔒 验证中显示加载状态
    if (!mounted || isValidating) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] flex items-center justify-center">
                <div className="text-blue-400 font-pixel text-xl animate-pulse">加载中...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthModal />;
    }

    const handleSelectChapter = (chapterId: number) => {
        setSelectedChapter(chapterId);
        setView('map');
    };

    const handleSelectLevel = (level: Level) => {
        setSelectedLevel(level);
        setView('level');
    };

    const handleBackToHome = () => {
        setView('home');
        setSelectedLevel(null);
    };

    const handleBackToMap = () => {
        setView('map');
        setSelectedLevel(null);
    };

    const handleLogout = () => {
        logout();
        window.location.reload();
    };

    const handleToggleMute = () => {
        toggleMute();
        musicManager.toggleMute();
    };

    const handleToggleLanguage = () => {
        setLanguage(language === 'cn' ? 'en' : 'cn');
    };

    const handleEnterWorld = () => {
        // 停止主页音乐
        musicManager.stop();
        router.push('/world');
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] text-white">
            {/* 🔒 进度同步状态指示器 */}
            <SyncStatusIndicator />
            
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-2 sm:p-4 bg-[#0a0e27]/80 backdrop-blur-sm border-b border-blue-900/30 gap-2 sm:gap-0">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-start">
                    <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-slate-950/40 px-3 py-2 shadow-[0_8px_24px_rgba(4,18,38,0.35)]">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                            <Image
                                src="/brand/logo11-badge.png"
                                alt="LeQiXiang Logo"
                                width={32}
                                height={32}
                                priority
                                className="h-7 w-7 object-contain"
                            />
                        </div>
                        <div className="leading-tight">
                            <div className="text-lg sm:text-2xl font-pixel text-blue-300">{t('app.title')}</div>
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-cyan-200/75">
                                <span>LeQiXiang</span>
                                <span className="text-gray-500/80">v2.2</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-400 hidden sm:block">{t('app.welcome', { username: user?.username || '' })}</div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-900/30 rounded">
                        <User className="w-4 h-4 text-blue-400" />
                        <span className="text-xs sm:text-sm">Lv.{userLevel}</span>
                    </div>
                    {/* 金币显示 */}
                    <CoinBalance 
                        initialCoins={coins}
                        size="sm"
                        onClick={() => setShowCoinHistory(true)}
                    />
                    {view === 'home' && <SystemUpdateAnnouncement triggerVariant="toolbar" />}
                    <button
                        onClick={handleToggleMute}
                        className="p-2 sm:p-2 hover:bg-blue-900/30 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={isMuted ? t('btn.soundOff') : t('btn.soundOn')}
                    >
                        {isMuted ? (
                            <VolumeX className="w-5 h-5 text-gray-400" />
                        ) : (
                            <Volume2 className="w-5 h-5 text-green-400" />
                        )}
                    </button>
                    <button
                        onClick={handleToggleLanguage}
                        className="p-2 hover:bg-blue-900/30 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={language === 'cn' ? t('btn.switchToEnglish') : t('btn.switchToChinese')}
                    >
                        <Languages className="w-5 h-5 text-blue-400" />
                        <span className="ml-1 text-xs hidden sm:inline">{language === 'cn' ? 'EN' : '中'}</span>
                    </button>
                    <button
                        onClick={() => setShowLeaderboard(true)}
                        className="p-2 hover:bg-blue-900/30 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={t('ui.leaderboard')}
                    >
                        <Trophy className="w-5 h-5 text-yellow-400" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-red-900/30 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={t('btn.logout')}
                    >
                        <LogOut className="w-5 h-5 text-red-400" />
                    </button>
                </div>
            </div>

            {/* Main Content - 响应式适配 */}
            {view === 'home' && (
                <div className="max-w-5xl mx-auto p-4 sm:p-8">
                    {/* Open World Button - 移动端优化 */}
                    {/* 开放世界按钮 */}
                    <button
                        onClick={handleEnterWorld}
                        className="relative w-full mb-4 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-xl border-2 sm:border-4 border-yellow-400 transition-all active:scale-95 sm:hover:scale-105 group min-h-[80px]"
                    >
                        <div className="flex items-center justify-center gap-2 sm:gap-4">
                            <span className="text-2xl sm:text-4xl">🌍</span>
                            <div className="text-left">
                                <h2 className="text-xl sm:text-3xl font-pixel text-white">{t('btn.openWorld')}</h2>
                                <p className="text-yellow-100 text-xs sm:text-sm mt-1">{t('btn.openWorld.desc')}</p>
                            </div>
                        </div>
                    </button>

                    {/* Chapter Cards */}
                    <ChapterSelect
                        onSelectChapter={handleSelectChapter}
                        userLevel={userLevel}
                    />
                </div>
            )}

            {view === 'map' && (
                <div className="p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <button
                                onClick={handleBackToHome}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white font-pixel transition-colors"
                            >
                                ← {t('ui.backToHome')}
                            </button>
                            <h2 className="text-2xl font-pixel text-yellow-400">
                                Chapter {selectedChapter}
                            </h2>
                        </div>
                        <WorldMap
                            onSelectLevel={handleSelectLevel}
                            chapterFilter={selectedChapter}
                        />
                    </div>
                </div>
            )}

            {view === 'level' && selectedLevel && (
                <LevelView
                    level={selectedLevel}
                    onBack={handleBackToMap}
                />
            )}

            {showLeaderboard && (
                <LeaderboardModal
                    isOpen={showLeaderboard}
                    onClose={() => setShowLeaderboard(false)}
                />
            )}

            {/* 金币历史记录 */}
            {showCoinHistory && (
                <CoinHistory
                    isOpen={showCoinHistory}
                    onClose={() => setShowCoinHistory(false)}
                    token={useAuthStore.getState().token || undefined}
                />
            )}
            
            {/* 👋 新用户引导 */}
            <NewUserGuide
                isOpen={showNewUserGuide}
                onClose={() => setShowNewUserGuide(false)}
            />

            {view === 'home' && (
                <>
                    <DailyCheckIn />
                    <AchievementPanel />
                </>
            )}

            {/* 底部备案信息 */}
            <Footer />
        </main>
    );
}
