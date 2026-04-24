"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Lock, Sparkles } from "lucide-react";

import { LearningIcon } from "@/components/game/LearningIcon";
import {
  getLearningCategories,
  getLearningCategorySubjectCount,
  getLearningCopy,
  getLearningSubjectChapterCount,
  getLearningSubjectsForCategory,
  type LearningCategoryId,
  type LearningSubjectId,
} from "@/lib/learningHub";
import { useI18n } from "@/lib/i18n";

interface SubjectSelectProps {
  userLevel: number;
  onSelectSubject: (subjectId: LearningSubjectId) => void;
}

export default function SubjectSelect({ userLevel, onSelectSubject }: SubjectSelectProps) {
  const { language } = useI18n();
  const categories = getLearningCategories();
  const [activeCategory, setActiveCategory] = useState<LearningCategoryId>("backend");

  const currentCategory = categories.find((category) => category.id === activeCategory) ?? categories[0];
  const visibleSubjects = getLearningSubjectsForCategory(currentCategory.id);
  const copy =
    language === "cn"
      ? {
          badge: "学习宇宙",
          title: "选择你的学习主线",
          subtitle: "先选一个大方向，再进入具体学科。后端从 Python 起步，再逐步扩展到前端、数据库和网络安全。",
          subjectLabel: "学科",
          currentDomain: "当前板块",
          selected: "已选",
          recommendedFlow: "推荐路线",
          chaptersLabel: "章节",
          unlockAt: (level: number) => `Lv.${level} 解锁`,
          flowText:
            currentCategory.id === "backend"
              ? "先学 Python，再扩展到工程、并发和 AI 协作"
              : currentCategory.id === "frontend"
                ? "先学 HTML / CSS / JS，再进入 Vue / React"
                : currentCategory.id === "database"
                  ? "先搭表结构，再练真实查询"
                  : "先建立防护意识，再进入实验室工具",
        }
      : {
          badge: "Learning Universe",
          title: "Choose Your Learning Path",
          subtitle:
            "Choose a domain first, then enter a subject. Backend starts with Python, then expands into frontend, databases, and security.",
          subjectLabel: "subjects",
          currentDomain: "Current Domain",
          selected: "Active",
          recommendedFlow: "Recommended Flow",
          chaptersLabel: "chapters",
          unlockAt: (level: number) => `Unlock at Lv.${level}`,
          flowText:
            currentCategory.id === "backend"
              ? "Python first, then engineering, concurrency, and AI teamwork"
              : currentCategory.id === "frontend"
                ? "HTML/CSS/JS first, then Vue / React"
                : currentCategory.id === "database"
                  ? "Tables first, queries next"
                  : "Defense first, lab tools next",
        };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-200/80">
          <Sparkles className="h-4 w-4" />
          {copy.badge}
        </div>
        <h2 className="mt-4 text-3xl font-pixel text-cyan-200 sm:text-4xl">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => {
          const isActive = category.id === currentCategory.id;
          const subjectCount = getLearningCategorySubjectCount(category.id);

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`relative rounded-[26px] border p-[1px] text-left transition-all ${
                isActive
                  ? "scale-[1.02] shadow-[0_22px_56px_rgba(18,40,84,0.42)] ring-2 ring-white/20"
                  : "opacity-70 saturate-[0.78] hover:opacity-100 hover:saturate-100"
              } bg-gradient-to-br ${category.cardClass}`}
            >
              <div className={`h-full rounded-[25px] px-5 py-5 transition-colors ${isActive ? "bg-slate-950/82" : "bg-slate-950/92"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-white ${isActive ? "border-white/20 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : "border-white/10 bg-white/5"}`}>
                    <LearningIcon icon={category.icon} className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${category.accentClass}`}
                    >
                      {subjectCount} {copy.subjectLabel}
                    </div>
                    {isActive ? (
                      <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {copy.selected}
                      </div>
                    ) : null}
                  </div>
                </div>
                <h3 className="mt-5 text-2xl font-pixel text-white">
                  {getLearningCopy(language, category.titleCN, category.title)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-200/88">
                  {getLearningCopy(language, category.subtitleCN, category.subtitle)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className={`mt-8 rounded-[30px] border bg-gradient-to-br ${currentCategory.cardClass} p-[1px] shadow-[0_20px_55px_rgba(8,15,30,0.35)]`}
      >
        <div className="rounded-[29px] bg-slate-950/88 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-200/75">
                <Sparkles className="h-4 w-4" />
                {copy.currentDomain}
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <LearningIcon icon={currentCategory.icon} className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="text-3xl font-pixel text-white sm:text-4xl">
                    {getLearningCopy(language, currentCategory.titleCN, currentCategory.title)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-200/90 sm:text-base">
                    {getLearningCopy(language, currentCategory.subtitleCN, currentCategory.subtitle)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200/85">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.recommendedFlow}</div>
              <div className="mt-2 font-semibold text-white">{copy.flowText}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleSubjects.map((subject) => {
          const isUnlocked = userLevel >= subject.requiredLevel;
          const chapterCount = getLearningSubjectChapterCount(subject.id);

          return (
            <motion.button
              key={subject.id}
              type="button"
              onClick={() => isUnlocked && onSelectSubject(subject.id)}
              disabled={!isUnlocked}
              whileHover={isUnlocked ? { y: -6, scale: 1.01 } : {}}
              whileTap={isUnlocked ? { scale: 0.98 } : {}}
              className={`relative overflow-hidden rounded-[28px] border bg-gradient-to-br ${subject.cardClass} p-[1px] text-left shadow-[0_18px_50px_rgba(8,15,30,0.35)] transition-transform ${
                isUnlocked ? "cursor-pointer" : "cursor-not-allowed opacity-55"
              }`}
            >
              <div className="relative h-full rounded-[27px] bg-slate-950/86 px-5 py-5">
                {!isUnlocked && (
                  <div className="absolute right-4 top-4 rounded-full bg-slate-900/80 p-2 text-slate-300">
                    <Lock className="h-4 w-4" />
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <LearningIcon icon={subject.icon} className="h-8 w-8" />
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200/80">
                    {getLearningCopy(language, subject.recommendedAgeCN, subject.recommendedAge)}
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-2xl font-pixel text-white">
                    {getLearningCopy(language, subject.titleCN, subject.title)}
                  </h3>
                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-200/88">
                    {getLearningCopy(language, subject.subtitleCN, subject.subtitle)}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(language === "cn" ? subject.featuredTagsCN : subject.featuredTags)
                    .slice(0, 3)
                    .map((tag) => (
                      <span key={tag} className={`rounded-full border px-3 py-1 text-xs ${subject.accentClass}`}>
                        {tag}
                      </span>
                    ))}
                </div>

                <div className="mt-6 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-200/85">
                    <BookOpen className="h-4 w-4" />
                    <span>
                      {chapterCount} {copy.chaptersLabel}
                    </span>
                  </div>
                  {!isUnlocked && <div className="font-pixel text-xs text-amber-200">{copy.unlockAt(subject.requiredLevel)}</div>}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
