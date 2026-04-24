"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Compass, Map, Sword } from "lucide-react";

import AuthModal from "@/components/auth/AuthModal";
import SubjectSelect from "@/components/game/SubjectSelect";
import ChapterSelect from "@/components/game/ChapterSelect";
import { LearningIcon } from "@/components/game/LearningIcon";
import WorldMap from "@/components/game/WorldMap";
import LevelView from "@/components/game/LevelView";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { Level } from "@/lib/levels";
import { getLearningChapter, type LearningSubjectId } from "@/lib/learningHub";

export default function CampaignPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const { level: userLevel, xp, coins } = useGameStore();

    const [mounted, setMounted] = useState(false);
    const [view, setView] = useState<"home" | "map" | "level">("home");
    const [selectedSubject, setSelectedSubject] = useState<LearningSubjectId | null>(null);
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

    const selectedChapterMeta = getLearningChapter(selectedChapter);

    const handleSelectSubject = (subjectId: LearningSubjectId) => {
        setSelectedSubject(subjectId);
        setView("home");
    };

    const handleSelectChapter = (chapterId: number) => {
        const chapter = getLearningChapter(chapterId);
        if (chapter) {
            setSelectedSubject(chapter.subjectId);
        }
        setSelectedChapter(chapterId);
        setView("map");
    };

    const handleLevelSelect = (level: Level) => {
        setSelectedLevel(level);
        setView("level");
    };

    const handleBackToHome = () => {
        setSelectedLevel(null);
        setView("home");
    };

    const handleBackToSubjects = () => {
        setSelectedSubject(null);
        setSelectedLevel(null);
        setView("home");
    };

    const handleBackToMap = () => {
        setSelectedLevel(null);
        setView("map");
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] text-white">
            <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-blue-900/30 bg-[#0a0e27]/90 px-6 py-4 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Compass className="text-blue-400" />
                    <div>
                        <h1 className="text-2xl font-pixel text-blue-400">Campaign Mode</h1>
                        <p className="text-sm text-gray-400">Subjects, chapters, maps, and coding battles.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                    <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> Lv.{userLevel}</span>
                    <span className="flex items-center gap-1"><Sword className="h-4 w-4" /> XP {xp}</span>
                    <span className="flex items-center gap-1"><Map className="h-4 w-4" /> Coins {coins}</span>
                    <button
                        onClick={() => router.push("/world")}
                        className="ml-4 rounded-lg border border-blue-500 px-3 py-1 font-pixel text-blue-400 hover:bg-blue-900/30"
                    >
                        Back to World
                    </button>
                </div>
            </header>

            <section className="px-6 py-8">
                {view === "home" && (
                    <>
                        {!selectedSubject ? (
                            <SubjectSelect
                                userLevel={userLevel}
                                onSelectSubject={handleSelectSubject}
                            />
                        ) : (
                            <ChapterSelect
                                subjectId={selectedSubject}
                                onSelectChapter={handleSelectChapter}
                                onBackToSubjects={handleBackToSubjects}
                                userLevel={userLevel}
                            />
                        )}
                    </>
                )}

                {view === "map" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={handleBackToHome}
                                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-pixel text-white hover:bg-slate-600"
                            >
                                Back
                            </button>
                        </div>
                        {selectedChapterMeta && (
                            <div className="rounded-[28px] border border-cyan-400/18 bg-slate-950/70 p-5 shadow-[0_18px_42px_rgba(8,15,30,0.35)]">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-100">
                                            <LearningIcon icon={selectedChapterMeta.icon} className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-pixel text-yellow-400">
                                                {selectedChapterMeta.title}
                                            </h2>
                                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                                                {selectedChapterMeta.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200/90">
                                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                            Chapter Focus
                                        </div>
                                        <div className="mt-2 max-w-xs">{selectedChapterMeta.focus}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <WorldMap onSelectLevel={handleLevelSelect} chapterFilter={selectedChapter} />
                    </div>
                )}

                {view === "level" && selectedLevel && (
                    <LevelView level={selectedLevel} onBack={handleBackToMap} />
                )}
            </section>
        </main>
    );
}
