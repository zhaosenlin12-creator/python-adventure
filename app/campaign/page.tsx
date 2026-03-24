"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChapterSelect from "@/components/game/ChapterSelect";
import WorldMap from "@/components/game/WorldMap";
import LevelView from "@/components/game/LevelView";
import AuthModal from "@/components/auth/AuthModal";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { LEVELS, Level } from "@/lib/levels";
import { Compass, Map, BookOpen, Sword } from "lucide-react";

export default function CampaignPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const { level: userLevel, xp, coins } = useGameStore();

    const [mounted, setMounted] = useState(false);
    const [view, setView] = useState<"chapter" | "map" | "level">("chapter");
    const [selectedChapter, setSelectedChapter] = useState<number>(1);
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    if (!isAuthenticated) {
        return <AuthModal />;
    }

    const handleChapterSelect = (chapterId: number) => {
        setSelectedChapter(chapterId);
        setView("map");
    };

    const handleLevelSelect = (level: Level) => {
        setSelectedLevel(level);
        setView("level");
    };

    const handleBackToChapters = () => {
        setSelectedLevel(null);
        setView("chapter");
    };

    const handleBackToMap = () => {
        setSelectedLevel(null);
        setView("map");
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] text-white">
            {/* Top Navigation */}
            <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 bg-[#0a0e27]/90 px-6 py-4 backdrop-blur-sm border-b border-blue-900/30">
                <div className="flex items-center gap-4">
                    <Compass className="text-blue-400" />
                    <div>
                        <h1 className="text-2xl font-pixel text-blue-400">战役模式</h1>
                        <p className="text-sm text-gray-400">选择章节 · 突破关卡 · 保存进度</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                    <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> Lv.{userLevel}</span>
                    <span className="flex items-center gap-1"><Sword className="w-4 h-4" /> XP {xp}</span>
                    <span className="flex items-center gap-1"><Map className="w-4 h-4" /> Coins {coins}</span>
                    <button
                        onClick={() => router.push("/world")}
                        className="ml-4 rounded-lg border border-blue-500 px-3 py-1 text-blue-400 hover:bg-blue-900/30 font-pixel"
                    >
                        返回开放世界
                    </button>
                </div>
            </header>

            <section className="px-6 py-8">
                {view === "chapter" && (
                    <ChapterSelect onSelectChapter={handleChapterSelect} userLevel={userLevel} />
                )}

                {view === "map" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={handleBackToChapters}
                                className="rounded-lg bg-slate-700 px-4 py-2 font-pixel text-sm hover:bg-slate-600 text-white"
                            >
                                ← 返回章节
                            </button>
                            <div className="text-sm text-gray-400">当前章节：{selectedChapter}</div>
                        </div>
                        <WorldMap onSelectLevel={handleLevelSelect} chapterFilter={selectedChapter} />
                    </div>
                )}

                {view === "level" && selectedLevel && (
                    <LevelView level={selectedLevel as any} onBack={handleBackToMap} />
                )}
            </section>
        </main>
    );
}
