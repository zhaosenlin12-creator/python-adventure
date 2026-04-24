"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { Lock, Skull, Star } from "lucide-react";

import { useSound } from "@/hooks/useSound";
import { getLearningChapter, getLearningCopy } from "@/lib/learningHub";
import { useI18n } from "@/lib/i18n";
import { LEVELS, Level } from "@/lib/levels";
import { useGameStore } from "@/store/gameStore";

interface WorldMapProps {
  onSelectLevel: (level: Level) => void;
  chapterFilter?: number;
}

function getLevelTier(level: Level, language: "cn" | "en") {
  if (level.type === "boss") {
    return {
      label: language === "cn" ? "终测" : "Final Test",
      nodeClass: "bg-rose-500 border-rose-300 hover:scale-110 active:scale-95",
      badgeClass: "border-rose-300/40 bg-rose-400/10 text-rose-100",
    };
  }

  if (level.type === "battle") {
    return {
      label: language === "cn" ? "实战" : "Practice",
      nodeClass: "bg-violet-600 border-violet-300 hover:scale-110 active:scale-95",
      badgeClass: "border-violet-300/40 bg-violet-400/10 text-violet-100",
    };
  }

  return {
    label: language === "cn" ? "热身" : "Warm-up",
    nodeClass: "bg-sky-600 border-sky-300 hover:scale-110 active:scale-95",
    badgeClass: "border-cyan-300/40 bg-cyan-400/10 text-cyan-100",
  };
}

export default function WorldMap({ onSelectLevel, chapterFilter }: WorldMapProps) {
  const { completedLevels } = useGameStore();
  const { language } = useI18n();
  const { play } = useSound();

  const filteredLevels = chapterFilter ? LEVELS.filter((level) => level.chapter === chapterFilter) : LEVELS;

  const handleSelectLevel = (level: Level) => {
    play("click");
    onSelectLevel(level);
  };

  const isLevelUnlocked = (level: Level, index: number) => {
    if (index === 0) return true;
    const prevLevel = filteredLevels[index - 1];
    return completedLevels.includes(prevLevel.id);
  };

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-[#0a0e27] to-[#1a1e3e] shadow-lg shadow-slate-900/30 sm:h-[500px] md:h-[600px]">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        {[...Array(20)].map((_, index) => (
          <div
            key={index}
            className="absolute h-1 w-1 rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.7,
            }}
          />
        ))}
      </div>

      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-200 shadow-[0_8px_24px_rgba(8,15,30,0.32)] backdrop-blur-sm">
        <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-cyan-100">
          {language === "cn" ? "热身" : "Warm-up"}
        </span>
        <span className="rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-violet-100">
          {language === "cn" ? "实战" : "Practice"}
        </span>
        <span className="rounded-full border border-rose-300/40 bg-rose-400/10 px-3 py-1 text-rose-100">
          {language === "cn" ? "终测" : "Final Test"}
        </span>
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {filteredLevels.map((level, index) => {
          if (index === filteredLevels.length - 1) return null;
          const nextLevel = filteredLevels[index + 1];

          return (
            <motion.line
              key={`line-${level.id}`}
              x1={`${level.x}%`}
              y1={`${level.y}%`}
              x2={`${nextLevel.x}%`}
              y2={`${nextLevel.y}%`}
              stroke={completedLevels.includes(level.id) ? "#60a5fa" : "#334155"}
              strokeWidth="4"
              strokeDasharray="8 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: index * 0.2 }}
            />
          );
        })}
      </svg>

      {filteredLevels.map((level, index) => {
        const isUnlocked = isLevelUnlocked(level, index);
        const isCompleted = completedLevels.includes(level.id);
        const chapterMeta = getLearningChapter(level.chapter);
        const tier = getLevelTier(level, language);
        const levelTitle = getLearningCopy(language, level.titleCN, level.title);
        const levelDescription = getLearningCopy(language, level.descriptionCN, level.description);
        const chapterFocus = chapterMeta ? getLearningCopy(language, chapterMeta.focusCN, chapterMeta.focus) : null;

        return (
          <motion.button
            key={level.id}
            type="button"
            aria-label={`${levelTitle} ${levelDescription}`}
            className={clsx(
              "group absolute z-10 flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 transform items-center justify-center rounded-full border-2 shadow-md transition-all",
              "h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16",
              isUnlocked
                ? isCompleted
                  ? "border-yellow-300 bg-amber-500"
                  : tier.nodeClass
                : "cursor-not-allowed border-slate-600 bg-slate-700 grayscale",
            )}
            style={{ left: `${level.x}%`, top: `${level.y}%` }}
            whileHover={isUnlocked ? { scale: 1.16 } : {}}
            whileTap={isUnlocked ? { scale: 0.96 } : {}}
            onClick={() => isUnlocked && handleSelectLevel(level)}
          >
            {isUnlocked ? (
              isCompleted ? (
                <Star className="h-5 w-5 fill-yellow-300 text-yellow-200 sm:h-7 sm:w-7 md:h-8 md:w-8" />
              ) : level.type === "boss" ? (
                <Skull className="h-5 w-5 animate-pulse text-red-100 sm:h-7 sm:w-7 md:h-8 md:w-8" />
              ) : (
                <span className="text-sm font-bold text-white sm:text-lg md:text-xl">{index + 1}</span>
              )
            ) : (
              <Lock className="h-4 w-4 text-slate-500 sm:h-5 sm:w-5 md:h-6 md:w-6" />
            )}

            <div className="pointer-events-none absolute top-full z-20 mt-3 hidden w-48 rounded-2xl border border-slate-600 bg-slate-900/96 p-3 text-left opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block lg:w-56">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-blue-300">
                  {levelTitle}
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${tier.badgeClass}`}>
                  {tier.label}
                </span>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-300">
                {levelDescription}
              </div>
              {chapterMeta && (
                <div className="mt-2 text-[11px] leading-5 text-slate-400">
                  {language === "cn" ? "章节重点：" : "Focus: "}
                  <span className="text-slate-200">
                    {chapterFocus}
                  </span>
                </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
