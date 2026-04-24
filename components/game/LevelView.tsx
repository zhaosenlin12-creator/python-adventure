"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bot, ExternalLink, Play } from "lucide-react";
import confetti from "canvas-confetti";

import { showCoinRewardToast } from "@/components/ui/CoinRewardToast";
import { useSound } from "@/hooks/useSound";
import usePyodide from "@/hooks/usePyodide";
import { addCoinsToServer } from "@/lib/api/coinAPI";
import { buildLearningAssistantContext } from "@/lib/learningLevelSupport";
import { getLearningChapter, getLearningCopy, getLearningResourcesForChapter } from "@/lib/learningHub";
import { useI18n } from "@/lib/i18n";
import { Level } from "@/lib/levels";
import { getLevelEditorLanguage, getLevelRuntime, validatePatternLevel } from "@/lib/learningValidation";
import { useAuthStore } from "@/store/authStore";
import { useCoinStore } from "@/store/coinStore";
import { useGameStore } from "@/store/gameStore";
import { usePetStore } from "@/store/petStore";

import BattleArena from "./BattleArena";
import CodeEditor from "./CodeEditor";
import Console from "./Console";
import FateSystem from "./FateSystem";
import LearningCompanionModal from "./LearningCompanionModal";
import { LearningIcon } from "./LearningIcon";

function cleanTerminalLine(line: string) {
  return line
    .replace(/Code updated.*$/i, "")
    .replace(/Executing\.{3}$/i, "")
    .replace(/Validation passed.*$/i, "")
    .replace(/Validation failed.*$/i, "")
    .trim();
}

function getDifficultyMeta(level: Level, language: "cn" | "en") {
  if (level.type === "boss") {
    return {
      label: language === "cn" ? "终测" : "Final Test",
      className: "border-rose-300/40 bg-rose-400/10 text-rose-100",
    };
  }

  if (level.type === "battle") {
    return {
      label: language === "cn" ? "实战" : "Practice",
      className: "border-violet-300/40 bg-violet-400/10 text-violet-100",
    };
  }

  return {
    label: language === "cn" ? "热身" : "Warm-up",
    className: "border-cyan-300/40 bg-cyan-400/10 text-cyan-100",
  };
}

export default function LevelView({ level, onBack }: { level: Level; onBack: () => void }) {
  const runtime = getLevelRuntime(level);
  const editorLanguage = getLevelEditorLanguage(level);
  const isBoss = level.type === "boss";
  const chapterMeta = getLearningChapter(level.chapter);

  const [code, setCode] = useState(level.initialCode);
  const [showFate, setShowFate] = useState(false);
  const [fateType, setFateType] = useState<"reward" | "punishment">("reward");
  const [manualOutput, setManualOutput] = useState<string[]>([]);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);

  const [playerHealth, setPlayerHealth] = useState(level.battle?.playerHp || 100);
  const [enemyHealth, setEnemyHealth] = useState(level.battle?.enemyHp || 50);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [battleLog, setBattleLog] = useState<string[]>([]);

  const { isReady, isLoading, output: pyodideOutput, runCode, getGlobal, clearOutput } = usePyodide(runtime === "python");
  const { addXp, unlockLevel, completedLevels } = useGameStore();
  const { t, language } = useI18n();
  const { play } = useSound();
  const { pets, updateHatchProgress } = usePetStore();
  const { token } = useAuthStore();
  const { loadBalance } = useCoinStore();

  const displayOutput = runtime === "python" ? pyodideOutput : manualOutput;
  const runDisabled = turn === "enemy" || (runtime === "python" && (!isReady || isLoading));
  const difficultyMeta = getDifficultyMeta(level, language);
  const chapterTitle = chapterMeta ? getLearningCopy(language, chapterMeta.titleCN, chapterMeta.title) : null;
  const subjectResources = chapterMeta ? getLearningResourcesForChapter(chapterMeta.id) : [];
  const levelTitle = getLearningCopy(language, level.titleCN, level.title);
  const levelDescription = getLearningCopy(language, level.descriptionCN, level.description);
  const assistantContext = useMemo(
    () =>
      buildLearningAssistantContext({
        level,
        code,
        output: displayOutput.map(cleanTerminalLine).filter(Boolean),
        language,
      }),
    [code, displayOutput, language, level],
  );
  const validationModeLabel = runtime === "python"
    ? language === "cn"
      ? "真实运行"
      : "Live Run"
    : language === "cn"
      ? "结构判定"
      : "Pattern Check";
  const techTags = Array.from(new Set([runtime, editorLanguage].map((value) => value.trim()).filter(Boolean)));

  useEffect(() => {
    setCode(level.initialCode);
    setManualOutput([]);
    clearOutput();
    setLastDamage(null);
    setIsAttacking(false);
    setIsHit(false);
    setIsCompanionOpen(false);

    if (level.battle) {
      setPlayerHealth(level.battle.playerHp);
      setEnemyHealth(level.battle.enemyHp);
      setTurn("player");
      setBattleLog([t("battle.start")]);
    }
  }, [clearOutput, level, t]);

  const handleEnemyTurn = () => {
    if (!level.battle) {
      return;
    }

    setTurn("enemy");
    play("hit");

    const damage = Math.floor(Math.random() * level.battle.enemyAttack) + 5;
    const nextPlayerHealth = Math.max(0, playerHealth - damage);

    setLastDamage(damage);
    setPlayerHealth(nextPlayerHealth);
    setIsHit(true);
    setBattleLog((prev) => [
      ...prev,
      `> ${t("battle.enemyAttack", { enemy: level.battle?.enemyName || t("battle.enemy.default"), damage })}`,
    ]);

    setTimeout(() => {
      setIsHit(false);
      setTurn("player");

      if (nextPlayerHealth <= 0) {
        play("lose");
        setBattleLog((prev) => [...prev, `> ${t("battle.defeat")}`]);
      }
    }, 1000);
  };

  const handleWin = async () => {
    play("win");
    confetti({ particleCount: 200, spread: 150 });
    setBattleLog((prev) => [...prev, `> ${t("battle.victory")}`]);

    if (!completedLevels.includes(level.id)) {
      unlockLevel(level.id);

      const coinsEarned = isBoss ? 50 : 10;

      if (token) {
        try {
          const rewardSource = language === "cn" ? `完成关卡：${levelTitle}` : `Level complete: ${level.title}`;
          await addCoinsToServer(coinsEarned, "level_complete", rewardSource, token);
          showCoinRewardToast(coinsEarned, rewardSource, "reward");
          loadBalance(token).catch(() => {});
        } catch (error) {
          console.error("[LevelView] Failed to add coins:", error);
        }
      }

      const incubatingEggs = (pets || []).filter((pet) => pet.isEgg || pet.petType === "egg");
      if (incubatingEggs.length > 0) {
        try {
          await Promise.all(incubatingEggs.map((pet) => updateHatchProgress(pet.id)));
        } catch (error) {
          console.error("[LevelView] Failed to update hatch progress:", error);
        }
      }

      if (isBoss) {
        addXp(500);
        setFateType("reward");
        setShowFate(true);
      } else {
        addXp(50);
        if (Math.random() > 0.7) {
          setFateType(Math.random() > 0.5 ? "reward" : "punishment");
          setShowFate(true);
        }
      }
    }
  };

  const handleRun = async () => {
    if (turn !== "player") {
      return;
    }

    play("run");
    setIsAttacking(true);

    let isSuccess = false;

    if (runtime === "python") {
      const executionOutput = await runCode(code);
      const filteredOutput = executionOutput.map(cleanTerminalLine).filter((line) => line !== "");
      const outputStr = filteredOutput.join("\n").trim();
      const hasError =
        filteredOutput.some((line) => line.toLowerCase().includes("error")) || outputStr.includes("Traceback");

      if (!hasError) {
        if (level.expectedOutput) {
          const outputMatches = outputStr.includes(level.expectedOutput);

          if (outputMatches) {
            isSuccess = true;
          } else if (level.validationKeyword) {
            const keywords = level.validationKeyword.split(",").map((keyword) => keyword.trim());
            const matchedCount = keywords.filter((keyword) => code.includes(keyword)).length;
            isSuccess = matchedCount / keywords.length >= 0.7;
          }
        } else if (level.validationKeyword) {
          const keywords = level.validationKeyword.split(",").map((keyword) => keyword.trim());
          const matchedCount = keywords.filter((keyword) => code.includes(keyword)).length;
          isSuccess = matchedCount / keywords.length >= 0.7 && outputStr.length > 0;
        } else if (outputStr.length > 0) {
          isSuccess = true;
        }
      }
    } else {
      const result = validatePatternLevel(level, code);
      setManualOutput(result.output);
      isSuccess = result.success;
    }

    if (isSuccess) {
      play("attack");

      let damage = 0;
      try {
        const pyDamage = getGlobal("damage");
        if (typeof pyDamage === "number") {
          damage = Math.floor(pyDamage);
        } else if (pyDamage && typeof pyDamage.toJs === "function") {
          damage = Number(pyDamage.toJs());
        } else {
          damage = Math.floor(Math.random() * 20) + 10;
        }
      } catch {
        damage = Math.floor(Math.random() * 20) + 10;
      }

      const nextEnemyHealth = Math.max(0, enemyHealth - damage);
      setLastDamage(damage);
      setEnemyHealth(nextEnemyHealth);
      setIsHit(true);
      setBattleLog((prev) => [...prev, `> ${t("battle.hit", { damage })}`]);

      if (nextEnemyHealth <= 0) {
        await handleWin();
      } else {
        setTimeout(() => handleEnemyTurn(), 1500);
      }
    } else {
      setLastDamage(0);
      setIsHit(false);
      setBattleLog((prev) => [...prev, `> ${t("battle.miss")}`]);
      setTimeout(() => handleEnemyTurn(), 1500);
    }

    setTimeout(() => {
      setIsAttacking(false);
      setIsHit(false);
    }, 1000);
  };

  const copy = language === "cn"
    ? {
        mission: "本关任务",
        resources: "学习资源",
        resourcesEmpty: "重点已经写进代码注释里。",
        editor: "代码编辑区",
        terminal: "运行终端",
        aiCompanion: "AI 小伴",
        aiTooltip: "卡住时点这里，只问这一关的关键思路或下一步。",
        output: "# 运行输出",
        outputEmpty: "运行后，结果会显示在这里。",
      }
    : {
        mission: "Mission",
        resources: "Resources",
        resourcesEmpty: "The key idea is already in the code comments.",
        editor: "Editor",
        terminal: "Terminal",
        aiCompanion: "AI Guide",
        aiTooltip: "Ask for one key idea or the next step when you get stuck.",
        output: "# Output",
        outputEmpty: "Run the level to see the output here.",
      };

  return (
    <div className="relative flex min-h-[calc(100vh-100px)] flex-col gap-3 overflow-y-auto pb-3 xl:h-[calc(100vh-100px)] xl:overflow-hidden">
      <FateSystem
        isOpen={showFate}
        onClose={() => setShowFate(false)}
        type={fateType}
      />

      <div className={`flex items-center justify-between rounded-none px-4 py-2 sm:px-5 ${isBoss ? "pixel-panel-accent" : "pixel-panel"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onBack} className="rounded p-1.5 transition-colors hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            {chapterMeta && (
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-300/80">
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  <LearningIcon icon={chapterMeta.icon} className="h-3.5 w-3.5" />
                  <span>{chapterTitle}</span>
                </span>
                <span className={`rounded-full border px-2 py-1 ${difficultyMeta.className}`}>
                  {difficultyMeta.label}
                </span>
              </div>
            )}
            <h1 className={`font-pixel text-lg font-bold tracking-widest ${isBoss ? "text-red-500" : "pixel-text-shadow text-yellow-400"}`}>
              {levelTitle}
            </h1>
            <p className="text-xs text-slate-300">{levelDescription}</p>
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={runDisabled}
          className={`pixel-btn flex items-center gap-2 px-4 py-2 text-sm ${isBoss ? "pixel-btn-danger" : "pixel-btn-success"} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Play className="h-4 w-4" />
          {runtime === "python" && isLoading ? t("btn.loading") : turn === "enemy" ? t("btn.enemyTurn") : t("btn.run")}
        </button>
      </div>

      <div className="flex min-h-[560px] flex-1 flex-col gap-3 px-2 pb-2 xl:min-h-0">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.88fr)_minmax(280px,0.72fr)]">
          <div className="rounded-2xl border border-cyan-400/14 bg-slate-950/72 px-4 py-3 text-sm text-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{copy.mission}</div>
                <div className="mt-1 text-sm leading-6 text-slate-100">{levelDescription}</div>
              </div>
              <div className="flex flex-wrap gap-2 xl:max-w-[46%] xl:justify-end">
                <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${difficultyMeta.className}`}>
                  {difficultyMeta.label}
                </span>
                {techTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-200"
                  >
                    {tag}
                  </span>
                ))}
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-emerald-100">
                  {validationModeLabel}
                </span>
              </div>
            </div>
            {level.battle && (
              <div className="mt-3 border-t border-white/8 pt-3">
                <div className="h-[132px] sm:h-[138px] xl:h-[144px]">
                  <BattleArena
                    config={level.battle}
                    playerHealth={playerHealth}
                    enemyHealth={enemyHealth}
                    isAttacking={isAttacking}
                    isHit={isHit}
                    damage={lastDamage}
                    turn={turn}
                    language={language}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="self-start rounded-2xl border border-cyan-400/14 bg-slate-950/72 px-4 py-3 text-sm text-slate-200">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{copy.resources}</div>
            {subjectResources.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {subjectResources.map((resourceItem) => (
                  <a
                    key={resourceItem.url}
                    href={resourceItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/40 bg-cyan-400/16 px-3 py-1.5 text-xs font-medium text-cyan-50 transition-colors hover:border-cyan-200/70 hover:bg-cyan-400/26"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>{getLearningCopy(language, resourceItem.labelCN, resourceItem.label)}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-xs leading-5 text-slate-300">{copy.resourcesEmpty}</div>
            )}
          </div>
        </div>

        <div className="grid min-h-[520px] flex-1 gap-3 lg:grid-cols-[minmax(0,1.72fr)_minmax(320px,0.72fr)] xl:min-h-0">
          <div className="flex min-h-[520px] flex-col xl:min-h-0">
            <div className="flex items-center justify-between border-x-4 border-t-4 border-slate-950 bg-slate-900 px-4 py-2 font-pixel text-xs tracking-widest text-blue-400">
              <span>{copy.editor}</span>
              <div className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {editorLanguage}
              </div>
            </div>
            <div className="relative min-h-[520px] flex-1 border-4 border-slate-950 bg-[#1e1e1e] shadow-2xl lg:min-h-0">
              {runtime === "python" && isLoading ? (
                <div className="flex h-full w-full animate-pulse items-center justify-center font-pixel text-blue-400">
                  {t("btn.loading")}...
                </div>
              ) : (
                <CodeEditor
                  code={code}
                  onChange={(value) => setCode(value || "")}
                  language={editorLanguage}
                  locale={language}
                  showLanguageLabel={false}
                />
              )}
            </div>
          </div>

          <div className="relative flex min-h-[360px] flex-col xl:min-h-0">
            <div className="flex items-center justify-between border-x-4 border-t-4 border-slate-950 bg-slate-900 px-4 py-2 font-pixel text-xs tracking-widest text-green-400">
              <span>{copy.terminal}</span>
              <button
                onClick={() => setIsCompanionOpen((current) => !current)}
                title={copy.aiTooltip}
                aria-label={copy.aiTooltip}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-500/12 px-3 py-1.5 text-[11px] tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>{copy.aiCompanion}</span>
              </button>
            </div>
            <LearningCompanionModal
              isOpen={isCompanionOpen}
              onClose={() => setIsCompanionOpen(false)}
              context={assistantContext}
            />
            <div className="relative min-h-[360px] flex-1 overflow-y-auto border-4 border-slate-950 bg-black p-2 font-mono text-sm shadow-2xl lg:min-h-0">
              <div className="mb-4 border-b border-slate-800 pb-2 text-yellow-300">
                {battleLog.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
              <Console
                output={displayOutput}
                label={copy.output}
                emptyText={copy.outputEmpty}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
