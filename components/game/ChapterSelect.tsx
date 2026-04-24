"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Lock, Sparkles } from "lucide-react";

import { LearningIcon } from "@/components/game/LearningIcon";
import {
  getLearningChaptersForSubject,
  getLearningCopy,
  getLearningSubject,
  type LearningSubjectId,
} from "@/lib/learningHub";
import { useI18n } from "@/lib/i18n";

interface ChapterSelectProps {
  subjectId: LearningSubjectId;
  onSelectChapter: (chapterId: number) => void;
  onBackToSubjects: () => void;
  userLevel: number;
}

export default function ChapterSelect({
  subjectId,
  onSelectChapter,
  onBackToSubjects,
  userLevel,
}: ChapterSelectProps) {
  const { language } = useI18n();
  const subject = getLearningSubject(subjectId);
  const chapters = getLearningChaptersForSubject(subjectId);
  const copy =
    language === "cn"
      ? {
          back: "返回学习主题",
          badge: "主题路线",
          recommendedAge: "推荐年龄",
          chooseTitle: "选择章节",
          chooseSubtitle: "每章只讲一个核心重点。先学会，再练熟，最后挑战本章终测。",
          chapterLabel: (order: number) => `章节 ${order}`,
          focus: "本章重点",
          levels: "关卡",
          unlockAt: (level: number) => `Lv.${level} 解锁`,
          ready: "可进入",
        }
      : {
          back: "Back to Subjects",
          badge: "Subject Path",
          recommendedAge: "Recommended Age",
          chooseTitle: "Choose a Chapter",
          chooseSubtitle: "Each chapter has one clear focus. Learn it, practice it, then challenge the chapter boss.",
          chapterLabel: (order: number) => `Chapter ${order}`,
          focus: "Focus",
          levels: "levels",
          unlockAt: (level: number) => `Lv.${level} Unlock`,
          ready: "Ready",
        };

  if (!subject) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <button
        type="button"
        onClick={onBackToSubjects}
        className="mb-5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {copy.back}
      </button>

      <div
        className={`rounded-[30px] border bg-gradient-to-br ${subject.cardClass} p-[1px] shadow-[0_20px_55px_rgba(8,15,30,0.35)]`}
      >
        <div className="rounded-[29px] bg-slate-950/88 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-200/75">
                <Sparkles className="h-4 w-4" />
                {copy.badge}
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <LearningIcon icon={subject.icon} className="h-9 w-9" />
                </div>
                <div>
                  <h2 className="text-3xl font-pixel text-white sm:text-4xl">
                    {getLearningCopy(language, subject.titleCN, subject.title)}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-200/90 sm:text-base">
                    {getLearningCopy(language, subject.subtitleCN, subject.subtitle)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200/85">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.recommendedAge}</div>
              <div className="mt-2 font-semibold text-white">
                {getLearningCopy(language, subject.recommendedAgeCN, subject.recommendedAge)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(language === "cn" ? subject.featuredTagsCN : subject.featuredTags)
                  .slice(0, 4)
                  .map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-full border px-3 py-1 text-xs ${subject.accentClass}`}
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <h3 className="text-2xl font-pixel text-blue-300">{copy.chooseTitle}</h3>
        <p className="mt-2 text-sm text-slate-400 sm:text-base">{copy.chooseSubtitle}</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {chapters.map((chapter) => {
          const isUnlocked = userLevel >= chapter.requiredLevel;

          return (
            <motion.button
              key={chapter.id}
              type="button"
              onClick={() => isUnlocked && onSelectChapter(chapter.id)}
              disabled={!isUnlocked}
              whileHover={isUnlocked ? { y: -5, scale: 1.01 } : {}}
              whileTap={isUnlocked ? { scale: 0.98 } : {}}
              className={`relative rounded-[26px] border p-5 text-left shadow-[0_12px_30px_rgba(8,15,30,0.26)] transition-transform ${
                isUnlocked
                  ? "border-slate-700 bg-slate-900/85 hover:bg-slate-850"
                  : "border-slate-800 bg-slate-900/55 opacity-55"
              }`}
            >
              {!isUnlocked && (
                <div className="absolute right-4 top-4 rounded-full bg-slate-900/80 p-2 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white">
                  <LearningIcon icon={chapter.icon} className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {copy.chapterLabel(chapter.order)}
                  </div>
                  <h4 className="mt-2 text-xl font-pixel text-blue-300">
                    {getLearningCopy(language, chapter.titleCN, chapter.title)}
                  </h4>
                </div>
              </div>

              <p className="mt-4 min-h-[56px] text-sm leading-6 text-slate-300">
                {getLearningCopy(language, chapter.descriptionCN, chapter.description)}
              </p>

              <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-200/85">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{copy.focus}</div>
                <div className="mt-2">{getLearningCopy(language, chapter.focusCN, chapter.focus)}</div>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {chapter.levelCount} {copy.levels}
                  </span>
                </div>
                {!isUnlocked ? (
                  <div className="font-pixel text-xs text-amber-200">{copy.unlockAt(chapter.requiredLevel)}</div>
                ) : (
                  <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">{copy.ready}</div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
