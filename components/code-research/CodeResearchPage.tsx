"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject, type WheelEvent as ReactWheelEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Gem,
  Lightbulb,
  ListChecks,
  LogOut,
  Map as MapIcon,
  Play,
  RotateCcw,
  ScrollText,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";
import { useAuthStore } from "@/store/authStore";
import LearningCompanionModal from "@/components/game/LearningCompanionModal";
import { musicManager } from "@/lib/audio/musicManager";
import { addCoinsToServer } from "@/lib/api/coinAPI";
import { useGameStore } from "@/store/gameStore";
import { useCoinStore } from "@/store/coinStore";
import { useCodeResearchStore } from "@/store/codeResearchStore";
import { useSoundStore } from "@/store/soundStore";
import {
  codeResearchLevels,
  getFirstIncompleteCodeResearchLevel,
  getCodeResearchCompletionSummary,
  getCodeResearchGoalStatuses,
  getCodeResearchLevel,
  getCodeResearchPythonStage,
  getCodeResearchTutorialStatuses,
  getCodeResearchTutorialSteps,
  mergeCodeResearchProgressRecord,
  simulateCodeResearchLevel,
  type CodeResearchBridgeSpot,
  type CodeResearchDoor,
  type CodeResearchFrame,
  type CodeResearchGoalStatus,
  type CodeResearchItem,
  type CodeResearchLevel,
  type CodeResearchProgressRecord,
  type CodeResearchRuntimeState,
  type CodeResearchSceneConfig,
  type CodeResearchSwitch,
  type CodeResearchTask,
  type CodeResearchTerrain,
  type CodeResearchTutorialStepStatus,
} from "@/lib/codeResearch";
import type { LearningAssistantContext } from "@/types/learningAssistant";
import "./code-research.css";

type Screen = "chapters" | "map" | "level";
type SoundName = "click" | "move" | "collect" | "attack" | "open" | "build" | "switch" | "fail" | "success" | "scan";
type PanelId = "map" | "hero" | "gear" | "rewards" | "curriculum" | "student" | "progress";
type ChapterTheme = "dungeon" | "river" | "ruins" | "temple";
type DrawerAction = {
  label: string;
  onClick: () => void;
  tone?: "primary" | "secondary";
};
type DrawerSection = {
  title: string;
  lines: string[];
};
type GuideOverlayMode = "task" | "hint" | "knowledge" | "story" | "timeline" | null;
type GuidedUiTarget = "task" | "hint" | "knowledge" | "toolbox" | "editor" | "run" | "ai";
type TutorialCardState = {
  currentStep?: CodeResearchTutorialStepStatus;
  completedCount: number;
  totalCount: number;
};
type FocusTarget = {
  x: number;
  y: number;
  label: string;
  accent: "item" | "enemy" | "exit" | "switch" | "bridge" | "door";
};
type CodeResearchChapter = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  theme: ChapterTheme;
  background: string;
  levelRangeLabel?: string;
  difficultyBand?: string;
  unlockHint?: string;
  learningGoals?: string[];
  pythonFocus?: string[];
  learningPath?: string[];
  levelIds: string[];
  plannedLevelCount: number;
};
type OnboardingArrowDirection = "top" | "bottom" | "left" | "right";
type OnboardingStep = {
  id: string;
  screen: Screen;
  selector: string;
  title: string;
  description: string;
  arrow?: OnboardingArrowDirection;
  autoAdvanceOnTargetClick?: boolean;
};
type OnboardingTargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function buildCodeResearchAssistantContext(options: {
  level: CodeResearchLevel;
  code: string;
  logs: string[];
  language?: "cn" | "en";
}): LearningAssistantContext {
  const { level, code, logs, language = "cn" } = options;
  return {
    levelId: level.id,
    levelTitle: level.title,
    chapterTitle: level.mapTitle,
    description: level.description,
    runtime: "safe-script",
    editorLanguage: "python",
    validationMode: "pattern-check",
    knowledgeHint: level.concepts[0] ? `这一关先掌握：${level.concepts[0]}` : null,
    guideHints: getCodeResearchTutorialSteps(level).map((step) => step.instruction).slice(0, 4),
    code,
    consoleOutput: logs.filter(Boolean).slice(-4),
    interfaceLanguage: language,
  };
}

function normalizeHeroCommandToPython(command: string) {
  return command
    .replace(/hero\.moveRight\(\)/g, "hero.move_right()")
    .replace(/hero\.moveLeft\(\)/g, "hero.move_left()")
    .replace(/hero\.moveUp\(\)/g, "hero.move_up()")
    .replace(/hero\.moveDown\(\)/g, "hero.move_down()")
    .replace(/hero\.openDoor\(\)/g, "hero.open_door()")
    .replace(/hero\.stepOnSwitch\(\)/g, "hero.step_on_switch()")
    .replace(/hero\.buildBridge\(/g, "hero.build_bridge(")
    .replace(/hero\.scan\(\)/g, "hero.scan_map()")
    .replace(/hero\.wait\(\)/g, "hero.wait_turn()")
    .replace(/hero\.move\(\s*["']right["']\s*\)/gi, "hero.move_right()")
    .replace(/hero\.move\(\s*["']left["']\s*\)/gi, "hero.move_left()")
    .replace(/hero\.move\(\s*["']up["']\s*\)/gi, "hero.move_up()")
    .replace(/hero\.move\(\s*["']down["']\s*\)/gi, "hero.move_down()");
}

function localizeTeachingCommentBody(commentBody: string) {
  let body = commentBody.trim();
  const replacements: Array<[RegExp, string]> = [
    [/\bmove right twice\b/gi, "向右移动两次"],
    [/\bmove up twice\b/gi, "向上移动两次"],
    [/\bmove to the scroll lane\b/gi, "前往卷轴路线"],
    [/\bmove to upper lane\b/gi, "前往上方路线"],
    [/\breturn to main lane\b/gi, "回到主路线"],
    [/\bmove to main lane\b/gi, "回到主路线"],
    [/\bcollect\b/gi, "收集"],
    [/\bclear\b/gi, "击退"],
    [/\bopen\b/gi, "打开"],
    [/\bgate\b/gi, "闸门"],
    [/\bdoor\b/gi, "门"],
    [/\bkey\b/gi, "钥匙"],
    [/\bscroll\b/gi, "卷轴"],
    [/\bcoin\b/gi, "金币"],
    [/\bcrystal\b/gi, "水晶"],
    [/\bswitch\b/gi, "机关"],
    [/\bbridge\b/gi, "桥梁"],
    [/\bplank\b/gi, "桥板"],
    [/\bsentinel\b/gi, "哨兵"],
    [/\bguard\b/gi, "守卫"],
    [/\bbug\b/gi, "甲虫"],
    [/\bbranch\b/gi, "分支"],
    [/\bboolean\b/gi, "布尔"],
    [/\bfunction\b/gi, "函数"],
    [/\broute\b/gi, "路线"],
    [/\breport\b/gi, "汇报"],
    [/\bsync\b/gi, "同步"],
    [/\bexit\b/gi, "撤离"],
  ];

  for (const [pattern, value] of replacements) {
    body = body.replace(pattern, value);
  }

  return body.replace(/\s{2,}/g, " ").trim();
}

function localizeTeachingComment(line: string) {
  const matched = line.match(/^(\s*)#\s*(Task|TODO|Step\s*(\d+)):\s*(.*)$/i);
  if (!matched) return line;

  const indent = matched[1] ?? "";
  const label = matched[2]?.trim() ?? "";
  const stepIndex = matched[3]?.trim();
  const body = localizeTeachingCommentBody(matched[4] ?? "");

  if (/^Task$/i.test(label)) return `${indent}# 任务：${body}`;
  if (/^TODO$/i.test(label)) return `${indent}# 待补全：${body}`;
  if (stepIndex) return `${indent}# 步骤 ${stepIndex}：${body}`;
  return `${indent}# 说明：${body}`;
}

function addTodoInputSlots(code: string) {
  const lines = code.replace(/\r/g, "").split("\n");
  const withSlots: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    withSlots.push(line);

    if (!/^\s*#\s*待补全：/.test(line)) continue;

    const nextLine = lines[index + 1] ?? "";
    const nextLineIsBlank = nextLine.trim().length === 0;
    if (nextLineIsBlank) continue;

    withSlots.push("");
    withSlots.push("");
  }

  return withSlots.join("\n");
}

function toPythonTeachingCommand(command: string) {
  const trimmed = command.trim();

  const repeatPlaceholder = trimmed.match(/^repeat\s*\(\s*([^)]+)\s*\)\s*\{\s*\.\.\.\s*\}$/i);
  if (repeatPlaceholder) {
    return `for _ in range(${repeatPlaceholder[1].trim()}):\n    hero.move_right()`;
  }

  return normalizeHeroCommandToPython(command);
}

function toPythonTeachingCode(code: string) {
  const lines = code.replace(/\r/g, "").split("\n");
  const converted: string[] = [];

  for (const rawLine of lines) {
    const localizedComment = localizeTeachingComment(rawLine);
    if (localizedComment !== rawLine) {
      converted.push(localizedComment);
      continue;
    }

    const indent = rawLine.match(/^\s*/)?.[0] ?? "";
    const trimmed = rawLine.trim();

    const inlineRepeat = trimmed.match(/^repeat\s*\(\s*([^)]+)\s*\)\s*\{\s*(.*?)\s*\}\s*$/i);
    if (inlineRepeat) {
      converted.push(`${indent}for _ in range(${inlineRepeat[1].trim()}):`);
      const body = inlineRepeat[2].trim();
      if (body && body !== "...") {
        converted.push(`${indent}    ${normalizeHeroCommandToPython(body)}`);
      } else {
        converted.push(`${indent}    hero.move_right()`);
      }
      continue;
    }

    const repeatStart = trimmed.match(/^repeat\s*\(\s*([^)]+)\s*\)\s*\{\s*$/i);
    if (repeatStart) {
      converted.push(`${indent}for _ in range(${repeatStart[1].trim()}):`);
      continue;
    }

    if (trimmed === "}") {
      continue;
    }

    converted.push(normalizeHeroCommandToPython(rawLine));
  }

  return addTodoInputSlots(converted.join("\n"));
}

function looksLikeCodeText(text: string) {
  return /hero\.|for _ in range|def\s+\w+|if\s+|elif\s+|else:|print\(|^\s*#|repeat\(/i.test(text);
}

function cleanMissionCopy(input: string) {
  if (!input) return "";
  if (looksLikeCodeText(input)) return input.trim();

  let normalized = input.replace(/\s+/g, " ").trim();
  normalized = normalized
    .replace(/^Task:\s*/i, "任务：")
    .replace(/^Step\s*(\d+)\s*:\s*/i, (_match, step: string) => `步骤 ${step}：`)
    .replace(/\s+\+\s+/g, " · ");

  const replacements: Array<[RegExp, string]> = [
    [/\bChapter\b/gi, "章节"],
    [/\bLv\b/gi, "关卡"],
    [/Python Focus/gi, "Python 重点"],
    [/Learning Path/gi, "学习路径"],
    [/\bDungeon\b/gi, "地牢"],
    [/\bRiver\b/gi, "河谷"],
    [/\bRuins\b/gi, "遗迹"],
    [/\bTemple\b/gi, "圣殿"],
    [/\bStage\b/gi, "阶段"],
    [/\bFinale?\b/gi, "终局"],
    [/\bThreshold\b/gi, "阈值"],
    [/\bComparator\b/gi, "比较器"],
    [/\bHarmony\b/gi, "协同"],
    [/\bVector\b/gi, "向量"],
    [/\bOverclock\b/gi, "超频"],
    [/\bbaseline\b/gi, "基线"],
    [/\breuse\b/gi, "复用"],
    [/\blong route\b/gi, "长路线"],
    [/\bflow\b/gi, "流程"],
    [/\bcomparisons\b/gi, "比较判断"],
    [/\bcondition\b/gi, "条件"],
    [/\boperator\b/gi, "运算符"],
    [/\bsequencing\b/gi, "顺序控制"],
    [/\bdivision\b/gi, "整除"],
    [/\bvariables\b/gi, "变量"],
    [/\bmodulo\b/gi, "取模"],
    [/\bfinal\b/gi, "最终"],
    [/\bchallenge\b/gi, "挑战"],
    [/\bmission\b/gi, "任务"],
    [/\broute\b/gi, "路线"],
    [/\bscan\b/gi, "扫描"],
    [/\bcollect\b/gi, "收集"],
    [/\bdefeat\b/gi, "击败"],
    [/\bexit\b/gi, "出口"],
    [/\bgate\b/gi, "闸门"],
    [/\bdoor\b/gi, "门"],
    [/\bkeyed\b/gi, "钥匙控制"],
    [/\bkey\b/gi, "钥匙"],
    [/\bscroll\b/gi, "卷轴"],
    [/\bswitch\b/gi, "机关"],
    [/\bbridge\b/gi, "桥梁"],
    [/\bcrystal\b/gi, "水晶"],
    [/\bguard\b/gi, "守卫"],
    [/\bsentinel\b/gi, "哨兵"],
    [/\bcoin\b/gi, "金币"],
    [/\bpipeline\b/gi, "流程"],
    [/\bbranch\b/gi, "分支"],
    [/\bboolean\b/gi, "布尔"],
    [/\bcomparison\b/gi, "比较判断"],
    [/\bequality\b/gi, "相等判断"],
    [/\bhelper function\b/gi, "辅助函数"],
    [/\bhelper\b/gi, "辅助"],
    [/\bfunction\b/gi, "函数"],
    [/\bfinale\b/gi, "终章"],
    [/\bcapstone\b/gi, "压轴"],
    [/\bdebug\b/gi, "调试"],
    [/\bsynced\b/gi, "同步完成"],
  ];

  for (const [pattern, value] of replacements) {
    normalized = normalized.replace(pattern, value);
  }

  return normalized.replace(/\s{2,}/g, " ").trim();
}

function composeStoryBeats(options: {
  level: CodeResearchLevel;
  currentStep?: CodeResearchTutorialStepStatus;
  activeGoal?: CodeResearchGoalStatus;
}) {
  const { level, currentStep, activeGoal } = options;
  const introSteps = getCodeResearchTutorialSteps(level).slice(0, 2);
  const rawBeats = [
    `任务代号：${level.title}`,
    level.description,
    level.mentor.intro,
    ...level.briefing.slice(0, 2),
    ...introSteps.map((step, index) => `行动 ${index + 1}：${step.instruction}`),
    currentStep ? `当前关键：${currentStep.title}` : "",
    activeGoal ? `推进目标：${activeGoal.label}` : "",
    `完成后：${level.mentor.success}`,
  ];

  const beats: string[] = [];
  for (const line of rawBeats) {
    const normalized = cleanMissionCopy(line);
    if (!normalized) continue;
    if (beats.includes(normalized)) continue;
    beats.push(normalized);
  }
  return beats;
}

function composeFrameNarration(options: {
  frame: CodeResearchFrame;
  activeGoal?: CodeResearchGoalStatus;
}) {
  const { frame, activeGoal } = options;
  const goalLine = cleanMissionCopy(activeGoal?.label ?? "");

  switch (frame.event) {
    case "move":
      return goalLine ? `脚步继续推进，朝“${goalLine}”靠近。` : "脚步继续推进，保持路线节奏。";
    case "collect":
      return "已拿到关键资源，任务线路正在打开。";
    case "attack":
      return "敌方已被压制，抓住窗口继续前推。";
    case "openDoor":
      return "闸门已开启，新的可行路线出现。";
    case "buildBridge":
      return "桥梁搭建完成，断层区域可安全通过。";
    case "switch":
      return "机关触发成功，场景状态已改变。";
    case "scan":
      return "扫描完成，情报更新，下一步更清晰。";
    case "say":
      return "口令已发送，行动日志同步完成。";
    case "wait":
      return "保持节奏，确认环境后再继续。";
    case "fail":
      return "这次路径有偏差，按提示修正后再试。";
    case "success":
      return "行动闭环完成，已成功撤离目标区域。";
    case "start":
    default:
      return "";
  }
}

const chapterOneCueByLevelId: Partial<Record<string, string[]>> = {
  "shadow-cell-1": [
    "Step 1: 先向右移动到目标点。",
    "Step 2: 在目标格执行 collect。",
    "Step 3: 继续向右到出口。",
  ],
  "bone-patrol-2": [
    "Step 1: 先贴近守卫，再动手。",
    "Step 2: 在相邻格执行 attack。",
    "Step 3: 拿钥匙并撤离到出口。",
  ],
  "echo-loop-3": [
    "Step 1: 先补第一段循环移动。",
    "Step 2: 在中点收集卷轴。",
    "Step 3: 补第二段循环并通关。",
  ],
  "locked-gate-4": [
    "Step 1: 先拿门钥匙。",
    "Step 2: 在门旁执行 open_door。",
    "Step 3: 穿过门后继续前进。",
  ],
};

function shortenInstructionLine(line: string) {
  const normalized = cleanMissionCopy(line);
  if (!normalized) return "";
  const firstSentence = normalized.split(/[。！？!?]/)[0]?.trim() ?? normalized;
  if (firstSentence.length <= 26) return firstSentence;
  return `${firstSentence.slice(0, 26).trim()}…`;
}

function composeStepCueLine(level: CodeResearchLevel, options: {
  currentStep?: CodeResearchTutorialStepStatus;
  completedCount: number;
}) {
  const { currentStep, completedCount } = options;
  const chapterCue = chapterOneCueByLevelId[level.id]?.[completedCount];
  if (chapterCue) return chapterCue;
  if (!currentStep) return "所有步骤完成，继续优化代码。";

  const commandHint = getSuggestedCommandsForStep(currentStep)[0];
  const shortLine = shortenInstructionLine(currentStep.instruction);
  if (commandHint) {
    return `${shortLine || "先完成当前步骤。"} 建议：${commandHint}`;
  }
  return shortLine || "先完成当前步骤，再运行验证。";
}

function getSuggestedCommandsForStep(step?: CodeResearchTutorialStepStatus) {
  if (!step) return [];
  const commands = new Set<string>();
  for (const requirement of step.requiredCommands ?? []) {
    if (requirement.type === "move" && requirement.direction) {
      if (requirement.direction === "right") commands.add("hero.move_right()");
      if (requirement.direction === "left") commands.add("hero.move_left()");
      if (requirement.direction === "up") commands.add("hero.move_up()");
      if (requirement.direction === "down") commands.add("hero.move_down()");
      continue;
    }
    if (requirement.type === "collect") commands.add("hero.collect()");
    if (requirement.type === "attack") commands.add("hero.attack()");
    if (requirement.type === "openDoor") commands.add("hero.open_door()");
    if (requirement.type === "stepOnSwitch") commands.add("hero.step_on_switch()");
    if (requirement.type === "buildBridge") commands.add(`hero.build_bridge("${requirement.direction ?? "right"}")`);
    if (requirement.type === "say") commands.add(`hero.say("${requirement.textIncludes ?? "..."}")`);
  }
  for (const requirement of step.requiredSnippets ?? []) {
    if (requirement.snippet.includes("repeat(")) commands.add("for _ in range(4):\n    hero.move_right()");
  }

  return Array.from(commands);
}

function getFocusPointForStep(level: CodeResearchLevel, step?: CodeResearchTutorialStepStatus) {
  if (!step) return null;
  const text = `${step.title} ${step.instruction}`;

  if (text.includes("水晶")) {
    return level.items.find((item) => item.kind === "crystal") ?? null;
  }
  if (text.includes("卷轴")) {
    return level.items.find((item) => item.kind === "scroll") ?? null;
  }
  if (text.includes("钥匙")) {
    return level.items.find((item) => item.kind === "key") ?? null;
  }
  if (text.includes("守卫") || text.includes("敌人")) {
    return level.enemies[0] ?? null;
  }
  if (text.includes("断桥")) {
    return (level.bridges ?? [])[0] ?? null;
  }
  if (text.includes("踏板") || text.includes("机关")) {
    return (level.switches ?? [])[0] ?? null;
  }
  if (text.includes("出口")) {
    return level.exit;
  }

  return null;
}

function resolveFocusTargetForStep(level: CodeResearchLevel, step?: CodeResearchTutorialStepStatus): FocusTarget | null {
  if (!step) return null;

  const targetGoal = (step.requiredGoalIds ?? [])
    .map((goalId) => level.goals.find((goal) => goal.id === goalId))
    .find(Boolean);

  if (targetGoal?.kind === "collect" && targetGoal.targetId) {
    const item = level.items.find((candidate) => candidate.id === targetGoal.targetId);
    if (item) return { x: item.x, y: item.y, label: item.label, accent: "item" };
  }
  if (targetGoal?.kind === "defeat" && targetGoal.targetId) {
    const enemy = level.enemies.find((candidate) => candidate.id === targetGoal.targetId);
    if (enemy) return { x: enemy.x, y: enemy.y, label: enemy.label, accent: "enemy" };
  }
  if (targetGoal?.kind === "openDoor" && targetGoal.targetId) {
    const door = (level.doors ?? []).find((candidate) => candidate.id === targetGoal.targetId);
    if (door) return { x: door.x, y: door.y, label: door.label, accent: "door" };
  }
  if (targetGoal?.kind === "buildBridge" && targetGoal.targetId) {
    const bridge = (level.bridges ?? []).find((candidate) => candidate.id === targetGoal.targetId);
    if (bridge) return { x: bridge.x, y: bridge.y, label: bridge.label, accent: "bridge" };
  }
  if (targetGoal?.kind === "activateSwitch" && targetGoal.targetId) {
    const switchTile = (level.switches ?? []).find((candidate) => candidate.id === targetGoal.targetId);
    if (switchTile) return { x: switchTile.x, y: switchTile.y, label: switchTile.label, accent: "switch" };
  }
  if (targetGoal?.kind === "exit") {
    return { x: level.exit.x, y: level.exit.y, label: "出口", accent: "exit" };
  }

  const firstCommand = (step.requiredCommands ?? [])[0];
  if (firstCommand?.type === "collect") {
    const item = level.items.find((candidate) => candidate.required !== false) ?? level.items[0];
    if (item) return { x: item.x, y: item.y, label: item.label, accent: "item" };
  }
  if (firstCommand?.type === "attack" && level.enemies[0]) {
    return { x: level.enemies[0].x, y: level.enemies[0].y, label: level.enemies[0].label, accent: "enemy" };
  }
  if (firstCommand?.type === "openDoor" && level.doors?.[0]) {
    return { x: level.doors[0].x, y: level.doors[0].y, label: level.doors[0].label, accent: "door" };
  }
  if (firstCommand?.type === "buildBridge" && level.bridges?.[0]) {
    return { x: level.bridges[0].x, y: level.bridges[0].y, label: level.bridges[0].label, accent: "bridge" };
  }
  if (firstCommand?.type === "stepOnSwitch" && level.switches?.[0]) {
    return { x: level.switches[0].x, y: level.switches[0].y, label: level.switches[0].label, accent: "switch" };
  }

  const legacyFocus = getFocusPointForStep(level, step);
  if (legacyFocus) {
    const label = "label" in legacyFocus && typeof legacyFocus.label === "string"
      ? legacyFocus.label
      : "出口";
    const accent = label === "出口" ? "exit" as const : "item" as const;
    return { x: legacyFocus.x, y: legacyFocus.y, label, accent };
  }

  return null;
}

function getCurrentStepNumber(step: CodeResearchTutorialStepStatus | undefined, totalCount: number, completedCount: number) {
  if (!step) return totalCount;
  return Math.min(totalCount, completedCount + 1);
}

function handlePrimaryScreenWheel(event: ReactWheelEvent<HTMLElement>) {
  const current = event.currentTarget;
  const style = window.getComputedStyle(current);
  const overflowY = style.overflowY;
  const supportsSelfScroll = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
  const containerCanScroll = supportsSelfScroll && current.scrollHeight > current.clientHeight + 1;
  if (containerCanScroll) return;

  const root = document.scrollingElement ?? document.documentElement;
  const beforeTop = root.scrollTop;
  const deltaY = event.deltaY;
  if (Math.abs(deltaY) < 0.5) return;

  window.requestAnimationFrame(() => {
    if (Math.abs(root.scrollTop - beforeTop) > 1) return;
    const maxTop = Math.max(0, root.scrollHeight - window.innerHeight);
    if (maxTop <= 0) return;
    const nextTop = Math.max(0, Math.min(maxTop, beforeTop + deltaY));
    if (Math.abs(nextTop - beforeTop) < 1) return;
    root.scrollTop = nextTop;
  });
}

const frameDelay = 270;

const eventLabel: Record<CodeResearchFrame["event"], string> = {
  start: "准备",
  move: "移动",
  collect: "收集",
  attack: "战斗",
  openDoor: "开门",
  buildBridge: "修桥",
  switch: "机关",
  scan: "扫描",
  say: "对话",
  wait: "等待",
  fail: "调整",
  success: "完成",
};

const spriteByItemKind: Record<CodeResearchItem["kind"], string> = {
  crystal: "/code-research/sprites/item-crystal.png",
  key: "/code-research/sprites/item-key.png",
  scroll: "/code-research/sprites/item-scroll.png",
  coin: "/code-research/sprites/item-coin.png",
  plank: "/code-research/sprites/item-plank.png",
  potion: "/code-research/sprites/item-potion.png",
};

const spriteByEnemyKind: Record<string, string> = {
  guard: "/code-research/sprites/enemy-guard.png",
  bug: "/code-research/sprites/enemy-bug.png",
  sentinel: "/code-research/sprites/enemy-sentinel.png",
  slime: "/code-research/sprites/enemy-slime.png",
};

const spriteByTerrainKind: Partial<Record<CodeResearchTerrain["kind"], string>> = {
  decor: "/code-research/sprites/tile-decor-torch.png",
  rune: "/code-research/sprites/tile-rune.png",
  hazard: "/code-research/sprites/tile-hazard.png",
};

function TokenSprite({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  return (
    <span className={className}>
      <Image src={src} alt={alt} width={48} height={48} />
    </span>
  );
}

const taskModeLabel: Record<CodeResearchTask["mode"], string> = {
  fill_blanks: "补全代码",
  fix_bug: "修复错误",
  guided_build: "引导编写",
  capstone: "综合实战",
};

const biomeLabel: Record<CodeResearchLevel["biome"], string> = {
  dungeon: "地牢试炼",
  forest: "森林回路",
  river: "河谷桥段",
  ruins: "遗迹研究",
};

const biomeAccentLabel: Record<CodeResearchLevel["biome"], string> = {
  dungeon: "暗影、火光、石门",
  forest: "苔藓、木桥、轻雾",
  river: "潮汐、水格、断桥",
  ruins: "符文、机关、侦测",
};

const chapterThemeLabel: Record<ChapterTheme, string> = {
  dungeon: "地牢入门",
  river: "河谷路线",
  ruins: "遗迹侦测",
  temple: "终端压轴",
};

const _legacyCodeResearchChapters: CodeResearchChapter[] = [
  {
    id: "chapter-dungeon-foundations",
    title: "暗影地牢",
    subtitle: "从移动、收集、开门到长走廊推进",
    description: "对应最早一批基础 dungeon 体验。先建立规则感，再逐步增加守卫、门锁和路线规划。",
    badge: "Chapter 1",
    theme: "dungeon",
    background: "/code-research/calciumtrice-dungeon/scene-training-hall-v2.png",
    learningPath: [
      "Lv1-2: basic movement and command order",
      "Lv3-5: repeat loops and route segments",
      "Lv6-8: switches, gates, and first capstone flow",
    ],
    levelIds: [
      "shadow-cell-1",
      "bone-patrol-2",
      "echo-loop-3",
      "dungeon-gauntlet-9",
      "dungeon-ambush-17",
      "vault-signal-21",
      "dungeon-warden-25",
      "dungeon-def-31",
    ],
    plannedLevelCount: 8,
  },
  {
    id: "chapter-mechanism-routes",
    title: "机关回廊",
    subtitle: "桥、门、踏板与双段路线",
    description: "把机关逻辑独立成章节，先学会支线解锁，再回到主路完成挑战。",
    badge: "Chapter 2",
    theme: "river",
    background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
    levelIds: [
      "locked-gate-4",
      "bridge-river-5",
      "switch-river-10",
      "bridge-siege-14",
      "river-fork-18",
      "river-switchback-22",
      "river-relay-26",
      "river-bridge-32",
      "river-decision-37",
      "river-threshold-39",
    ],
    plannedLevelCount: 10,
  },
  {
    id: "chapter-ruins-scan",
    title: "遗迹侦测",
    subtitle: "scan、repeat、机关门与多目标核对",
    description: "这一章开始强调观察、扫描和多目标调试，关卡会更像真正的任务执行。",
    badge: "Chapter 3",
    theme: "ruins",
    background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
    levelIds: [
      "rune-switch-6",
      "scanner-ruins-7",
      "ruins-scan-11",
      "scan-loop-15",
      "ruins-double-scan-19",
      "ruins-gate-scan-23",
      "ruins-weave-27",
      "ruins-branch-33",
      "ruins-bool-35",
      "ruins-signal-function-40",
      "ruins-comparator-43",
    ],
    plannedLevelCount: 11,
  },
  {
    id: "chapter-terminal-finale",
    title: "终端圣殿",
    subtitle: "综合流程关与最终压轴",
    description: "综合桥、门、踏板、战斗、口令确认等完整流程，作为接近 CodeCombat 节奏的压轴章。",
    badge: "Chapter 4",
    theme: "temple",
    background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
    levelIds: [
      "capstone-8",
      "forge-capstone-12",
      "switch-gate-13",
      "dungeon-finale-16",
      "terminal-override-20",
      "temple-full-stack-24",
      "temple-omega-28",
      "python-branch-29",
      "python-function-30",
      "temple-final-34",
      "temple-pipeline-36",
      "temple-overclock-38",
      "temple-loop-guard-41",
      "temple-vector-route-42",
      "temple-harmony-44",
    ],
    plannedLevelCount: 15,
  },
];
void _legacyCodeResearchChapters;

const codeResearchChapters: CodeResearchChapter[] = [
  {
    id: "chapter-core-foundations",
    title: "新手训练营",
    subtitle: "移动、收集、循环与基础机关",
    description: "第 1-8 关。先建立稳定的输入-运行-反馈节奏，再进入综合任务。",
    badge: "Chapter 1",
    theme: "dungeon",
    background: "/code-research/calciumtrice-dungeon/scene-training-hall-v2.png",
    levelRangeLabel: "Lv 1-8",
    difficultyBand: "入门",
    unlockHint: "默认解锁",
    learningGoals: [
      "理解顺序执行：每条命令按写入顺序生效。",
      "学会 move / collect / attack / open_door 的基本交互。",
      "建立“改一小步 -> 运行 -> 看反馈”学习节奏。",
    ],
    pythonFocus: ["函数调用", "for range", "基础命令顺序"],
    levelIds: [
      "shadow-cell-1",
      "bone-patrol-2",
      "echo-loop-3",
      "locked-gate-4",
      "bridge-river-5",
      "rune-switch-6",
      "scanner-ruins-7",
      "capstone-8",
    ],
    plannedLevelCount: 8,
  },
  {
    id: "chapter-route-engineering",
    title: "路线工程",
    subtitle: "多目标路线拆解与执行一致性",
    description: "第 9-16 关。强调桥、门、踏板和战斗前置条件，训练路线规划能力。",
    badge: "Chapter 2",
    theme: "river",
    background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
    levelRangeLabel: "Lv 9-16",
    difficultyBand: "进阶",
    unlockHint: "完成第 1 章解锁",
    learningGoals: [
      "学会在桥、门、踏板等机制之间安排前置顺序。",
      "处理多目标路线，避免走错格和重复无效步骤。",
      "开始关注步数效率与可读性。",
    ],
    pythonFocus: ["for range", "scan_map", "路线规划"],
    learningPath: [
      "9-10 关：先完成路线前置条件再推进。",
      "11-13 关：扫描 + 机关 + 闸门的连锁执行。",
      "14-16 关：多路线切换与稳定收尾。",
    ],
    levelIds: [
      "dungeon-gauntlet-9",
      "switch-river-10",
      "ruins-scan-11",
      "forge-capstone-12",
      "switch-gate-13",
      "bridge-siege-14",
      "scan-loop-15",
      "dungeon-finale-16",
    ],
    plannedLevelCount: 8,
  },
  {
    id: "chapter-mission-tactics",
    title: "战术任务",
    subtitle: "扫描判断、折返路线与双阶段战斗",
    description: "第 17-24 关。进入多阶段任务流程，强调先观察再执行。",
    badge: "Chapter 3",
    theme: "ruins",
    background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
    levelRangeLabel: "Lv 17-24",
    difficultyBand: "进阶+",
    unlockHint: "完成第 2 章解锁",
    learningGoals: [
      "先侦测再执行，形成更稳定的任务解题习惯。",
      "掌握折返与分段推进，处理双阶段战斗任务。",
      "能够根据失败信息快速定位问题命令。",
    ],
    pythonFocus: ["scan_map", "repeat/for", "战斗与机关协同"],
    learningPath: [
      "17-18 关：先侦测再执行，建立战术顺序感。",
      "19-21 关：战斗与机关协同推进。",
      "22-24 关：双阶段任务衔接与稳定撤离。",
    ],
    levelIds: [
      "dungeon-ambush-17",
      "river-fork-18",
      "ruins-double-scan-19",
      "terminal-override-20",
      "vault-signal-21",
      "river-switchback-22",
      "ruins-gate-scan-23",
      "temple-full-stack-24",
    ],
    plannedLevelCount: 8,
  },
  {
    id: "chapter-systems-mastery",
    title: "系统联动",
    subtitle: "长路线、联动机关与 Python 入门",
    description: "第 25-32 关。从复杂联动过渡到 Python 变量与函数。",
    badge: "Chapter 4",
    theme: "temple",
    background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
    levelRangeLabel: "Lv 25-32",
    difficultyBand: "高级",
    unlockHint: "完成第 3 章解锁",
    learningGoals: [
      "在长路线中保持状态一致性，减少漏目标情况。",
      "从流程化脚本过渡到变量与函数抽象。",
      "为后续控制流章节打下代码组织基础。",
    ],
    pythonFocus: ["变量入门", "def 函数", "长流程拆解"],
    learningPath: [
      "25-26 关：长路线一致性与漏目标控制。",
      "27-29 关：函数入门与分支预热。",
      "30-32 关：系统级任务编排与回放调试。",
    ],
    levelIds: [
      "dungeon-warden-25",
      "river-relay-26",
      "ruins-weave-27",
      "temple-omega-28",
      "python-branch-29",
      "python-function-30",
      "dungeon-def-31",
      "river-bridge-32",
    ],
    plannedLevelCount: 8,
  },
  {
    id: "chapter-python-control",
    title: "Python 控制流",
    subtitle: "分支、布尔逻辑、函数与流水线",
    description: "第 33-38 关。系统训练 if/else、布尔判断、函数拆分与任务流水线。",
    badge: "Chapter 5",
    theme: "ruins",
    background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
    levelRangeLabel: "Lv 33-38",
    difficultyBand: "高级+",
    unlockHint: "完成第 4 章解锁",
    learningGoals: [
      "系统掌握 if / else / not 在任务中的真实用法。",
      "通过函数拆分降低复杂关卡代码混乱度。",
      "形成可调试、可复用的控制流写法。",
    ],
    pythonFocus: ["if/else", "not", "def + 调用"],
    learningPath: [
      "33-34 关：函数拆分与路线复用。",
      "35-36 关：布尔标记、not 与闸门分支。",
      "37-38 关：完整流水线中的分支顺序控制。",
    ],
    levelIds: [
      "ruins-branch-33",
      "temple-final-34",
      "ruins-bool-35",
      "temple-pipeline-36",
      "river-decision-37",
      "temple-overclock-38",
    ],
    plannedLevelCount: 6,
  },
  {
    id: "chapter-python-capstone",
    title: "Python 毕业挑战",
    subtitle: "表达式、复合条件与最终实战",
    description: "第 39-44 关。使用 elif、and/or 与算术表达式完成完整任务链路。",
    badge: "Chapter 6",
    theme: "temple",
    background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
    levelRangeLabel: "Lv 39-44",
    difficultyBand: "专家",
    unlockHint: "完成第 5 章解锁",
    learningGoals: [
      "掌握 elif、and/or 与比较表达式组合。",
      "在高复杂度关卡中平衡正确性、效率与可读性。",
      "完成接近真实项目任务链路的 Python 实战。",
    ],
    pythonFocus: ["if/elif/else", "and/or", "算术表达式 // % +"],
    learningPath: [
      "39-40 关：if/elif/else 与 or 条件决策。",
      "41-42 关：算术变量、// 与 + 的路线控制。",
      "43-44 关：% 取模、相等判断与 and 压轴实战。",
    ],
    levelIds: [
      "river-threshold-39",
      "ruins-signal-function-40",
      "temple-loop-guard-41",
      "temple-vector-route-42",
      "ruins-comparator-43",
      "temple-harmony-44",
    ],
    plannedLevelCount: 6,
  },
];

const codeResearchCampaignKeyPrefix = "code_research";
const dungeonCampaignNodeCount = 44;

function codeResearchLevelMarker(levelId: string) {
  return `${codeResearchCampaignKeyPrefix}:${levelId}`;
}

function codeResearchStarsKey(levelId: string) {
  return `${codeResearchCampaignKeyPrefix}:${levelId}:stars`;
}

function codeResearchBestStepsKey(levelId: string) {
  return `${codeResearchCampaignKeyPrefix}:${levelId}:bestSteps`;
}

function codeResearchRewardClaimedKey(levelId: string) {
  return `${codeResearchCampaignKeyPrefix}:${levelId}:rewardClaimedAt`;
}

function buildDungeonCampaignNodes(count: number) {
  const columns = 8;
  const rowHeight = 12;
  const topStart = 16;
  const leftStart = 9;
  const stepX = 11.2;
  const nodes: Array<{ id: string; left: number; top: number; index: number }> = [];

  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const serpentineColumn = row % 2 === 0 ? column : columns - 1 - column;
    const left = leftStart + serpentineColumn * stepX + (row % 2 === 0 ? 0.6 : -0.6);
    const top = topStart + row * rowHeight + (column % 2 === 0 ? 0 : 1.3);
    nodes.push({
      id: `dungeon-node-${index + 1}`,
      left,
      top,
      index: index + 1,
    });
  }

  return nodes;
}

const dungeonCampaignNodes = buildDungeonCampaignNodes(dungeonCampaignNodeCount);

const chapterIdByLevelId = Object.fromEntries(
  codeResearchChapters.flatMap((chapter) => chapter.levelIds.map((levelId) => [levelId, chapter.id] as const)),
);

if (process.env.NODE_ENV !== "production") {
  const chapterLevelIds = codeResearchChapters.flatMap((chapter) => chapter.levelIds);
  const chapterLevelIdSet = new Set(chapterLevelIds);
  if (chapterLevelIds.length !== chapterLevelIdSet.size) {
    console.warn("[CodeResearchPage] Duplicate level ids detected in chapter configuration.");
  }
  if (chapterLevelIdSet.size !== codeResearchLevels.length) {
    console.warn(
      `[CodeResearchPage] Chapter coverage mismatch: chapters=${chapterLevelIdSet.size}, levels=${codeResearchLevels.length}.`,
    );
  }
}

function getChapterLevels(chapter: CodeResearchChapter) {
  return chapter.levelIds
    .map((levelId) => getCodeResearchLevel(levelId))
    .filter((level): level is CodeResearchLevel => Boolean(level));
}

function getChapterProgress(
  chapter: CodeResearchChapter,
  progress: Record<string, CodeResearchProgressRecord>,
) {
  const levels = getChapterLevels(chapter);
  const completedLevels = levels.filter((level) => progress[level.id]?.completed);
  const stars = completedLevels.reduce((total, level) => total + (progress[level.id]?.stars ?? 0), 0);
  const unlockedCount = levels.filter((level, index) => index === 0 || progress[levels[index - 1].id]?.completed).length;

  return {
    levels,
    completedCount: completedLevels.length,
    stars,
    unlockedCount,
  };
}

function getChapterNextLevel(
  chapter: CodeResearchChapter,
  progress: Record<string, CodeResearchProgressRecord>,
) {
  const levels = getChapterLevels(chapter);
  return levels.find((level) => !progress[level.id]?.completed) ?? levels[0] ?? null;
}

function isChapterUnlocked(
  chapterIndex: number,
  progress: Record<string, CodeResearchProgressRecord>,
) {
  if (chapterIndex <= 0) return true;
  const chapter = codeResearchChapters[chapterIndex];
  if (!chapter) return false;

  const currentLevels = getChapterLevels(chapter);
  if (currentLevels.some((level) => progress[level.id]?.completed)) {
    return true;
  }

  const previousChapter = codeResearchChapters[chapterIndex - 1];
  if (!previousChapter) return true;
  const previousLevels = getChapterLevels(previousChapter);
  if (!previousLevels.length) return true;
  return previousLevels.every((level) => progress[level.id]?.completed);
}

function stateForLevel(level: CodeResearchLevel): CodeResearchRuntimeState {
  return {
    hero: { ...level.heroStart },
    collectedItemIds: [],
    defeatedEnemyIds: [],
    openedDoorIds: [],
    builtBridgeIds: [],
    activatedSwitchIds: [],
    scanned: false,
    saidMessages: [],
    message: level.mentor.intro,
    messageTone: "idle",
    step: 0,
  };
}

function pointKey(point: { x: number; y: number }) {
  return `${point.x},${point.y}`;
}

const tinyDungeonStageSprites = {
  floor: "/code-research/tiny-dungeon/floor-plain.png",
  floorAlt: "/code-research/tiny-dungeon/floor-speckle.png",
  floorWarm: "/code-research/tiny-dungeon/floor-warm.png",
  floorShadow: "/code-research/tiny-dungeon/floor-shadow.png",
  floorCorner: "/code-research/tiny-dungeon/floor-corner.png",
  wallLeft: "/code-research/tiny-dungeon/wall-left.png",
  wallCenter: "/code-research/tiny-dungeon/wall-center.png",
  wallRight: "/code-research/tiny-dungeon/wall-right.png",
  torch: "/code-research/tiny-dungeon/torch-wall.png",
  hero: "/code-research/tiny-dungeon/hero-guide.png",
  skeleton: "/code-research/tiny-dungeon/enemy-skeleton.png",
  door: "/code-research/tiny-dungeon/door-closed.png",
  exit: "/code-research/tiny-dungeon/exit-arch.png",
};

const picoCitySprites = {
  hero: "/code-research/pico-city/hero-cadet-blue.png",
  guard: "/code-research/pico-city/guard-cadet-red.png",
  exit: "/code-research/pico-city/exit-flag.png",
  fence: "/code-research/pico-city/street-fence.png",
  tree: "/code-research/pico-city/street-tree.png",
};

const dungeonSceneSprites = {
  hero: "/code-research/calciumtrice-dungeon/hero-guide-v3.png",
  guard: "/code-research/sprites/enemy-guard.png",
  sentinel: "/code-research/sprites/enemy-sentinel.png",
  bug: "/code-research/sprites/enemy-bug.png",
  exit: "/code-research/calciumtrice-dungeon/stairs-exit-v2.png",
  door: "/code-research/calciumtrice-dungeon/door-closed-v2.png",
  doorOpen: "/code-research/calciumtrice-dungeon/door-open-v2.png",
  decor: "/code-research/calciumtrice-dungeon/torch-decor-v2.png",
  hazard: "/code-research/calciumtrice-dungeon/trap-hazard-v2.png",
  crystal: "/code-research/calciumtrice-dungeon/chest-crystal-v2.png",
  key: "/code-research/calciumtrice-dungeon/barrel-key-v3.png",
  scroll: "/code-research/calciumtrice-dungeon/crate-scroll-v3.png",
  coin: "/code-research/calciumtrice-dungeon/coin-cache-v1.png",
  potion: "/code-research/calciumtrice-dungeon/potion-v1.png",
  plank: "/code-research/calciumtrice-dungeon/plank-bundle-v2.png",
  bridgeBroken: "/code-research/calciumtrice-dungeon/bridge-broken-v2.png",
  bridgeBuilt: "/code-research/calciumtrice-dungeon/bridge-built-v2.png",
  switchOff: "/code-research/calciumtrice-dungeon/switch-off-v2.png",
  switchOn: "/code-research/calciumtrice-dungeon/switch-on-v2.png",
};

function isCodeResearchCityScene(level: CodeResearchLevel) {
  return level.scene?.theme === "city";
}

function isCodeResearchDungeonScene(level: CodeResearchLevel) {
  return level.scene?.theme === "dungeonScene";
}

function isCodeResearchTinyDungeon(level: CodeResearchLevel) {
  return level.biome === "dungeon" && !level.scene;
}

function getCodeResearchBackdrop(level: CodeResearchLevel, fallback?: string) {
  return level.scene?.background ?? fallback ?? "/code-research/calciumtrice-dungeon/scene-training-hall-v2.png";
}

function getCodeResearchHeroSprite(level: CodeResearchLevel) {
  if (isCodeResearchCityScene(level)) return picoCitySprites.hero;
  if (isCodeResearchDungeonScene(level)) return dungeonSceneSprites.hero;
  if (isCodeResearchTinyDungeon(level)) return tinyDungeonStageSprites.hero;
  return "/code-research/sprites/hero-adventurer.png";
}

function getCodeResearchEnemySprite(level: CodeResearchLevel) {
  const enemy = level.enemies[0];
  if (!enemy) return null;
  if (isCodeResearchCityScene(level) && enemy.kind === "guard") return picoCitySprites.guard;
  if (isCodeResearchDungeonScene(level) && enemy.kind === "guard") return dungeonSceneSprites.guard;
  if (isCodeResearchDungeonScene(level) && enemy.kind === "bug") return dungeonSceneSprites.bug;
  if (isCodeResearchDungeonScene(level) && enemy.kind === "sentinel") return dungeonSceneSprites.sentinel;
  if (isCodeResearchTinyDungeon(level) && enemy.kind === "guard") return tinyDungeonStageSprites.skeleton;
  return spriteByEnemyKind[enemy.kind];
}

function getCodeResearchItemSprite(level: CodeResearchLevel, kind: CodeResearchItem["kind"]) {
  if (!isCodeResearchDungeonScene(level)) {
    return spriteByItemKind[kind];
  }

  if (kind === "crystal") return dungeonSceneSprites.crystal;
  if (kind === "key") return dungeonSceneSprites.key;
  if (kind === "scroll") return dungeonSceneSprites.scroll;
  if (kind === "coin") return dungeonSceneSprites.coin;
  if (kind === "potion") return dungeonSceneSprites.potion;
  if (kind === "plank") return dungeonSceneSprites.plank;
  return spriteByItemKind[kind];
}

function getCodeResearchGoalSprite(level: CodeResearchLevel) {
  const goal = level.goals[0];
  if (!goal) return null;

  if (goal.kind === "collect" && goal.targetId) {
    const item = level.items.find((candidate) => candidate.id === goal.targetId);
    return item ? getCodeResearchItemSprite(level, item.kind) : null;
  }

  if (goal.kind === "defeat") {
    return getCodeResearchEnemySprite(level);
  }

  if (goal.kind === "openDoor") {
    return isCodeResearchDungeonScene(level) ? dungeonSceneSprites.door : "/code-research/sprites/tile-door-closed.png";
  }

  if (goal.kind === "buildBridge") {
    return isCodeResearchDungeonScene(level) ? dungeonSceneSprites.bridgeBroken : "/code-research/sprites/tile-bridge-broken.png";
  }

  if (goal.kind === "activateSwitch") {
    return isCodeResearchDungeonScene(level) ? dungeonSceneSprites.switchOff : "/code-research/sprites/tile-switch-off.png";
  }

  if (goal.kind === "scan") {
    return isCodeResearchDungeonScene(level) ? dungeonSceneSprites.hazard : "/code-research/sprites/tile-hazard.png";
  }

  if (goal.kind === "exit") {
    if (isCodeResearchCityScene(level)) return picoCitySprites.exit;
    if (isCodeResearchDungeonScene(level)) return dungeonSceneSprites.exit;
    if (isCodeResearchTinyDungeon(level)) return tinyDungeonStageSprites.exit;
    return "/code-research/sprites/tile-exit.png";
  }

  return null;
}

const realSfxBySound: Partial<Record<SoundName, string[]>> = {
  move: ["/code-research/audio/footstep00.ogg", "/code-research/audio/footstep01.ogg"],
  collect: ["/code-research/audio/handleCoins2.ogg"],
  open: ["/code-research/audio/doorOpen_1.ogg"],
  switch: ["/code-research/audio/metalClick.ogg"],
  build: ["/code-research/audio/creak1.ogg"],
};

function createAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function useCodeResearchAudio(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  const droneRef = useRef<{ oscillator: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode } | null>(null);
  const htmlAudioRef = useRef<Map<SoundName, HTMLAudioElement[]>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const context = contextRef.current ?? createAudioContext();
    if (!context) return undefined;
    contextRef.current = context;

    if (!enabled) {
      if (droneRef.current) {
        droneRef.current.gain.gain.cancelScheduledValues(context.currentTime);
        droneRef.current.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.12);
      }
      return undefined;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    if (!droneRef.current) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.value = 92;
      gain.gain.value = 0.0001;
      lfo.type = "sine";
      lfo.frequency.value = 0.18;
      lfoGain.gain.value = 6;

      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      lfo.start();

      droneRef.current = { oscillator, gain, lfo, lfoGain };
    }

    droneRef.current.gain.gain.cancelScheduledValues(context.currentTime);
    droneRef.current.gain.gain.setTargetAtTime(0.012, context.currentTime, 0.45);

    return () => {
      if (!droneRef.current) return;
      try {
        droneRef.current.gain.gain.cancelScheduledValues(context.currentTime);
        droneRef.current.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.12);
      } catch {}
    };
  }, [enabled]);

  return (sound: SoundName) => {
    if (!enabled || typeof window === "undefined") return;

    const realSfx = realSfxBySound[sound];
    if (realSfx?.length) {
      let pool = htmlAudioRef.current.get(sound);
      if (!pool) {
        pool = realSfx.map((src) => {
          const audio = new Audio(src);
          audio.preload = "auto";
          audio.volume = sound === "move" ? 0.16 : 0.2;
          return audio;
        });
        htmlAudioRef.current.set(sound, pool);
      }

      const audio = pool[Math.floor(Math.random() * pool.length)];
      try {
        audio.currentTime = 0;
        void audio.play().catch(() => {});
      } catch {}
    }

    const context = contextRef.current ?? createAudioContext();
    if (!context) return;
    contextRef.current = context;
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const tones: Record<SoundName, { frequency: number; duration: number; type: OscillatorType; gain: number }> = {
      click: { frequency: 320, duration: 0.05, type: "triangle", gain: 0.05 },
      move: { frequency: 220, duration: 0.06, type: "square", gain: 0.035 },
      collect: { frequency: 720, duration: 0.12, type: "triangle", gain: 0.06 },
      attack: { frequency: 140, duration: 0.12, type: "sawtooth", gain: 0.055 },
      open: { frequency: 440, duration: 0.18, type: "triangle", gain: 0.05 },
      build: { frequency: 260, duration: 0.16, type: "square", gain: 0.04 },
      switch: { frequency: 560, duration: 0.12, type: "sine", gain: 0.055 },
      fail: { frequency: 110, duration: 0.2, type: "sawtooth", gain: 0.045 },
      success: { frequency: 880, duration: 0.22, type: "triangle", gain: 0.065 },
      scan: { frequency: 520, duration: 0.12, type: "sine", gain: 0.04 },
    };

    const playTone = (tone: { frequency: number; duration: number; type: OscillatorType; gain: number }, delay = 0) => {
      const startAt = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = tone.type;
      oscillator.frequency.value = tone.frequency;
      gain.gain.setValueAtTime(tone.gain, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + tone.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + tone.duration);
    };

    const tone = tones[sound];
    playTone(tone);

    if (sound === "success") {
      playTone({ ...tone, frequency: 1174, duration: 0.18, gain: 0.052 }, 0.1);
      playTone({ ...tone, frequency: 1568, duration: 0.2, gain: 0.045 }, 0.22);
    }
    if (sound === "fail") {
      playTone({ ...tone, frequency: 82, duration: 0.18, gain: 0.035 }, 0.12);
    }
    if (sound === "collect") {
      playTone({ ...tone, frequency: 980, duration: 0.1, gain: 0.04 }, 0.08);
    }
  };
}

function Stars({ count, dimmed = false }: { count: number; dimmed?: boolean }) {
  return (
    <span className="cr-stars" aria-label={`${count} stars`}>
      {[0, 1, 2].map((index) => (
        <Star key={index} className={index < count && !dimmed ? "cr-star cr-star-on" : "cr-star"} />
      ))}
    </span>
  );
}

function LogoMark() {
  return (
    <div className="cr-logo" aria-label="Code Research">
      <span>CODE</span>
      <strong>RESEARCH</strong>
    </div>
  );
}

function SideDock({
  onOpenPanel,
  activePanel,
}: {
  onOpenPanel: (panel: PanelId) => void;
  activePanel: PanelId | null;
}) {
  const [hoveredPanel, setHoveredPanel] = useState<PanelId | null>(null);
  const items: Array<{
    label: string;
    caption: string;
    shortHint: string;
    actionLabel: string;
    hint: string;
    panel: PanelId;
    icon: ReactNode;
  }> = [
    {
      label: "挑战地图",
      caption: "地图导航",
      shortHint: "看路线",
      actionLabel: "打开关卡路线",
      hint: "先点亮节点，再开始挑战",
      icon: <MapIcon />,
      panel: "map",
    },
    {
      label: "英雄档案",
      caption: "英雄状态",
      shortHint: "看档案",
      actionLabel: "查看英雄数据",
      hint: "账号、等级与主站状态实时同步",
      icon: <User />,
      panel: "hero",
    },
    {
      label: "装备背包",
      caption: "工具台",
      shortHint: "看工具",
      actionLabel: "查看可用指令",
      hint: "命令卡、提示和调试入口都在这里",
      icon: <Shield />,
      panel: "gear",
    },
    {
      label: "成就奖励",
      caption: "战利品",
      shortHint: "看奖励",
      actionLabel: "查看奖励记录",
      hint: "星级、经验、金币都会同步记录",
      icon: <Trophy />,
      panel: "rewards",
    },
  ];
  const previewPanel = hoveredPanel ?? activePanel;
  const previewItem = items.find((item) => item.panel === previewPanel) ?? null;
  const previewIsActive = previewItem ? activePanel === previewItem.panel : false;

  return (
    <aside
      className={`cr-side-dock ${previewItem ? "has-preview" : ""}`}
      aria-label="game menu"
      onMouseLeave={() => setHoveredPanel(null)}
    >
      {items.map((item) => {
        const selected = activePanel === item.panel || hoveredPanel === item.panel;
        return (
          <button
            key={item.label}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={activePanel === item.panel}
            className={selected ? "is-active" : ""}
            data-onboard={item.panel === "map" ? "side-dock-map" : undefined}
            onMouseEnter={() => setHoveredPanel(item.panel)}
            onFocus={() => setHoveredPanel(item.panel)}
            onClick={() => onOpenPanel(item.panel)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
      {previewItem ? (
        <div
          className={`cr-side-dock-preview is-${previewItem.panel} ${previewIsActive ? "is-pinned" : ""}`}
          data-testid="code-research-side-preview"
        >
          <div className="cr-side-preview-head">
            <small>{previewItem.caption}</small>
            <span className="cr-side-preview-badge">{previewIsActive ? "已展开" : previewItem.shortHint}</span>
          </div>
          <strong>{previewItem.label}</strong>
          <p>{previewItem.hint}</p>
          <div className="cr-side-preview-chips">
            <span>{previewItem.actionLabel}</span>
            {previewIsActive ? <span>点击空白处收起</span> : null}
          </div>
          <div className="cr-side-preview-actions">
            <button
              type="button"
              className="cr-side-preview-action"
              onClick={() => onOpenPanel(previewItem.panel)}
            >
              {previewIsActive ? "收起面板" : "打开"} <ChevronRight />
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function LevelIsland({
  level,
  selected,
  locked,
  progressStars,
  onSelect,
}: {
  level: CodeResearchLevel;
  selected: boolean;
  locked: boolean;
  progressStars: number;
  onSelect: () => void;
}) {
  const size = level.mapPosition.size ?? "small";
  const requiredGoals = level.goals.length;

  return (
    <button
      type="button"
      className={`cr-island cr-island-${size} cr-island-${level.biome} ${selected ? "cr-island-selected" : ""} ${locked ? "cr-island-locked" : ""}`}
      style={{ left: `${level.mapPosition.left}%`, top: `${level.mapPosition.top}%` }}
      onClick={onSelect}
      disabled={locked}
    >
      <div className="cr-island-art">
        <div className="cr-rock cr-rock-a" />
        <div className="cr-rock cr-rock-b" />
        <div className="cr-rock cr-rock-c" />
        <div className="cr-platform" />
        <div className="cr-statue" />
        <div className="cr-island-badge">{locked ? "🔒" : progressStars ? "✓" : "!"}</div>
        {level.enemies.length > 0 && <div className="cr-skeleton">☠</div>}
        {(level.bridges?.length ?? 0) > 0 && <div className="cr-camp">🪵</div>}
        {(level.doors?.length ?? 0) > 0 && <div className="cr-door-mini">▥</div>}
      </div>
      <div className="cr-island-label">
        <small>{biomeLabel[level.biome]}</small>
        <strong>{cleanMissionCopy(level.title)}</strong>
        <span>{level.difficulty} · {progressStars ? `${progressStars}/3` : "未完成"}</span>
        <em>{requiredGoals} 项目标</em>
        <Stars count={progressStars} dimmed={!progressStars} />
      </div>
    </button>
  );
}

function ChapterSelectScreen({
  activeChapterId,
  onSelectChapter,
  onOpenPanel,
  activePanel,
  progress,
  playSound,
}: {
  activeChapterId: string;
  onSelectChapter: (chapter: CodeResearchChapter) => void;
  onOpenPanel: (panel: PanelId) => void;
  activePanel: PanelId | null;
  progress: Record<string, { completed: boolean; stars: number; bestSteps: number; completedAt: string }>;
  playSound: (sound: SoundName) => void;
}) {
  const summary = getCodeResearchCompletionSummary(progress);
  const unlockedChapterCount = codeResearchChapters.filter((_, index) => isChapterUnlocked(index, progress)).length;

  return (
    <section
      className="cr-chapter-screen"
      data-testid="code-research-chapter-screen"
      onWheel={handlePrimaryScreenWheel}
    >
      <div className="cr-reference-bg" aria-hidden="true" />
      <div className="cr-map-path" aria-hidden="true" />
      <SideDock onOpenPanel={onOpenPanel} activePanel={activePanel} />
      <div className="cr-map-meta">
        <div className="cr-resource">
          <Gem />
          <strong>{summary.completedCount}</strong>
        </div>
        <div className="cr-resource">
          <Star />
          <strong>{summary.stars}</strong>
        </div>
        <button className="cr-member-btn" type="button" onClick={() => onOpenPanel("curriculum")}>
          玩法说明
        </button>
      </div>
      <div className="cr-map-header cr-map-header-chapters">
        <div className="cr-map-world">
          <span className="cr-map-kicker">学习地图</span>
          <h1>选择章节</h1>
          <p>先选择学习章节，再进入章节内部的关卡地图，逐关推进当前进度。</p>
          <div className="cr-map-hero-strip">
            <div>
              <small>章节总数</small>
              <strong>{codeResearchChapters.length}</strong>
            </div>
            <div>
              <small>已完成关卡</small>
              <strong>{summary.completedCount}/{summary.totalCount}</strong>
            </div>
            <div>
              <small>累计星级</small>
              <strong>{summary.stars}/{summary.maxStars}</strong>
            </div>
          </div>
        </div>
        <div className="cr-map-world-stats">
            <div>
            <strong>{unlockedChapterCount}</strong>
            <span>已解锁章节</span>
          </div>
          <div>
            <strong>{summary.completedCount}</strong>
            <span>已通关</span>
          </div>
          <div>
            <strong>{summary.stars}</strong>
            <span>累计星级</span>
          </div>
        </div>
      </div>
      <div className="cr-scroll-affordance" role="status" aria-live="polite">
        <Compass />
        <span>滚轮或双指可下滑浏览全部章节，点击章节卡片后进入关卡地图。</span>
      </div>
      <section className="cr-chapter-shell">
        <div className="cr-chapter-shell-head">
          <div>
            <strong>学习章节</strong>
            <span>选中章节之后，再进入当前章节的节点地图选择具体挑战。</span>
          </div>
        </div>
        <div className="cr-chapter-grid" data-testid="code-research-chapter-grid">
          {codeResearchChapters.map((chapter, chapterIndex) => {
            const chapterProgress = getChapterProgress(chapter, progress);
            const nextLevel = getChapterNextLevel(chapter, progress);
            const isActive = activeChapterId === chapter.id;
            const unlocked = isChapterUnlocked(chapterIndex, progress);
            const focusChips = chapter.pythonFocus
              ? (isActive ? chapter.pythonFocus : chapter.pythonFocus.slice(0, 2))
              : [];
            const showExpandedCopy = isActive;

            return (
              <button
                key={chapter.id}
                type="button"
                className={`cr-chapter-card ${isActive ? "is-active" : ""} ${unlocked ? "" : "is-locked"}`}
                data-testid="code-research-chapter-card"
                data-onboard={chapterIndex === 0 ? "chapter-card-first" : undefined}
                aria-pressed={isActive}
                disabled={!unlocked}
                onClick={() => {
                  if (!unlocked) return;
                  playSound("click");
                  onSelectChapter(chapter);
                }}
              >
                <div
                  className="cr-chapter-card-art"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(7, 17, 28, 0.14), rgba(7, 17, 28, 0.72)), url("${chapter.background}")`,
                  }}
                />
                <div className="cr-chapter-card-overlay" />
                <div className="cr-chapter-card-body">
                  <div className="cr-chapter-card-topline">
                    <span>{chapter.badge}</span>
                    <strong>{chapter.levelRangeLabel ?? chapterThemeLabel[chapter.theme]}</strong>
                  </div>
                  <h2>{chapter.title}</h2>
                  <p>{chapter.subtitle}</p>
                  <div className="cr-chapter-card-stats">
                    <span>{chapterProgress.completedCount}/{chapterProgress.levels.length} 已完成</span>
                    <span>{chapterProgress.unlockedCount}/{chapterProgress.levels.length} 已解锁</span>
                    <span>{chapterProgress.stars} 星</span>
                    <span>{chapter.difficultyBand ?? chapterThemeLabel[chapter.theme]}</span>
                  </div>
                  {!showExpandedCopy ? <div className="cr-chapter-card-peek">点击卡片展开章节详情</div> : null}
                  {focusChips.length > 0 ? (
                    <div className="cr-chapter-focus-chips">
                      {focusChips.map((focus) => (
                        <span key={`${chapter.id}-${focus}`}>{focus}</span>
                      ))}
                    </div>
                  ) : null}
                  {showExpandedCopy && chapter.learningGoals && chapter.learningGoals.length > 0 ? (
                    <div className="cr-chapter-goals">
                      {chapter.learningGoals.slice(0, 2).map((goal) => (
                        <span key={`${chapter.id}-goal-${goal}`}>- {goal}</span>
                      ))}
                    </div>
                  ) : null}
                  {showExpandedCopy && chapter.learningPath && chapter.learningPath.length > 0 ? (
                    <div className="cr-chapter-path">
                      {chapter.learningPath.slice(0, 2).map((step) => (
                        <span key={`${chapter.id}-path-${step}`}>• {step}</span>
                      ))}
                    </div>
                  ) : null}
                  {showExpandedCopy ? <div className="cr-chapter-card-desc">{chapter.description}</div> : null}
                  <div className="cr-chapter-card-footer">
                    <div>
                      <small>{unlocked ? "下一关" : "解锁条件"}</small>
                      <strong>{unlocked ? cleanMissionCopy(nextLevel?.title ?? "即将开放") : cleanMissionCopy(chapter.unlockHint ?? "完成前一章解锁")}</strong>
                    </div>
                    {showExpandedCopy ? (
                      <>
                        <div>
                          <small>章节难度</small>
                          <strong>{chapter.difficultyBand ?? "标准"}</strong>
                        </div>
                        <div>
                          <small>计划节点</small>
                          <strong>{chapter.plannedLevelCount}</strong>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function ChapterMapScreen({
  chapter,
  chapterLevels,
  selectedLevel,
  onSelectLevel,
  onStart,
  onBackToChapters,
  onOpenPanel,
  activePanel,
  progress,
  playSound,
}: {
  chapter: CodeResearchChapter;
  chapterLevels: CodeResearchLevel[];
  selectedLevel: CodeResearchLevel;
  onSelectLevel: (level: CodeResearchLevel) => void;
  onStart: () => void;
  onBackToChapters: () => void;
  onOpenPanel: (panel: PanelId) => void;
  activePanel: PanelId | null;
  progress: Record<string, { completed: boolean; stars: number; bestSteps: number; completedAt: string }>;
  playSound: (sound: SoundName) => void;
}) {
  const summary = getCodeResearchCompletionSummary(progress);
  const chapterProgress = getChapterProgress(chapter, progress);
  const unlockedCount = chapterLevels.filter((level, index) => index === 0 || progress[chapterLevels[index - 1].id]?.completed).length;
  const routeNodes = buildDungeonCampaignNodes(Math.max(chapter.plannedLevelCount, chapterLevels.length));
  const playableNodeCount = Math.min(chapterLevels.length, routeNodes.length);
  const unlockedNodeCount = Math.min(unlockedCount, playableNodeCount);
  const routeLinePoints = routeNodes
    .slice(0, playableNodeCount)
    .map((node) => `${node.left},${node.top}`)
    .join(" ");
  const nextMission = cleanMissionCopy(selectedLevel.goals[0]?.label ?? "进入挑战");
  const [selectedMapLevelId, setSelectedMapLevelId] = useState<string | null>(null);
  const [showFocusedDetails, setShowFocusedDetails] = useState(false);
  const [revealedUnlockCount, setRevealedUnlockCount] = useState(unlockedNodeCount);
  const [routeTransitioning, setRouteTransitioning] = useState(false);
  const recentLevelTitle = cleanMissionCopy(codeResearchLevels
    .slice()
    .reverse()
    .find((level) => progress[level.id]?.completed)?.title ?? chapterLevels[0]?.title ?? "暗影地牢 1");
  const focusedLevel = (selectedMapLevelId ? getCodeResearchLevel(selectedMapLevelId) : null) ?? selectedLevel;
  const focusedProgress = progress[focusedLevel.id];
  const focusedStatusLabel = focusedProgress?.completed ? `已完成 · ${focusedProgress.stars}/3 星` : "尚未完成";
  const focusedNextMission = cleanMissionCopy(focusedLevel.goals[0]?.label ?? "进入挑战");
  const focusedLaunchSteps = getCodeResearchTutorialSteps(focusedLevel);
  const focusedPythonStage = getCodeResearchPythonStage(focusedLevel.id);
  const focusedNodeIndex = chapterLevels.findIndex((level) => level.id === focusedLevel.id) + 1;
  const chapterFocusPreview = chapter.pythonFocus?.slice(0, 3).join(" · ") ?? chapterThemeLabel[chapter.theme];
  const chapterGoalPreview = (chapter.learningGoals ?? []).slice(0, 2);
  const chapterPathPreview = (chapter.learningPath ?? []).slice(0, 3);
  const animatedUnlockedCount = Math.min(unlockedNodeCount, Math.max(0, revealedUnlockCount));

  useEffect(() => {
    setShowFocusedDetails(false);
  }, [selectedMapLevelId]);

  useEffect(() => {
    if (unlockedNodeCount <= 0) {
      setRevealedUnlockCount(0);
      setRouteTransitioning(false);
      return;
    }

    if (typeof window === "undefined") {
      setRevealedUnlockCount(unlockedNodeCount);
      setRouteTransitioning(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || window.navigator?.webdriver) {
      setRevealedUnlockCount(unlockedNodeCount);
      setRouteTransitioning(false);
      return;
    }

    let active = true;
    let revealTimer: number | null = null;
    const initialCount = Math.min(1, unlockedNodeCount);
    setRouteTransitioning(true);
    setRevealedUnlockCount(initialCount);
    let currentCount = initialCount;

    const revealNext = () => {
      if (!active) return;
      currentCount = Math.min(unlockedNodeCount, currentCount + 1);
      setRevealedUnlockCount(currentCount);
      if (currentCount >= unlockedNodeCount) return;
      revealTimer = window.setTimeout(revealNext, 92);
    };

    if (currentCount < unlockedNodeCount) {
      revealTimer = window.setTimeout(revealNext, 150);
    }

    const settleTimer = window.setTimeout(() => {
      if (!active) return;
      setRouteTransitioning(false);
    }, Math.max(360, unlockedNodeCount * 96 + 180));

    return () => {
      active = false;
      if (revealTimer) window.clearTimeout(revealTimer);
      window.clearTimeout(settleTimer);
      setRouteTransitioning(false);
    };
  }, [chapter.id, unlockedNodeCount]);

  useEffect(() => {
    if (!selectedMapLevelId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedMapLevelId(null);
        return;
      }
      if (event.key !== "Enter") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(target.tagName)) return;

      event.preventDefault();
      playSound("click");
      setSelectedMapLevelId(focusedLevel.id);
      onStart();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMapLevelId, focusedLevel.id, onStart, playSound]);

  return (
    <section className="cr-map-screen" data-onboard="map-root" onWheel={handlePrimaryScreenWheel}>
      <div
        className="cr-reference-bg"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(21, 88, 107, 0.08), rgba(21, 88, 107, 0.72) 42%, rgba(21, 88, 107, 0.2)), url("${chapter.background}"), url("/code-research/generated-reference-board.png")`,
        }}
      />
      <div className="cr-map-path" aria-hidden="true" />
      <SideDock onOpenPanel={onOpenPanel} activePanel={activePanel} />
      <div className="cr-map-topbar">
        <div className="cr-map-hud">
          <div className="cr-map-hud-chip is-current">
            <small>当前章节</small>
            <strong title={chapter.title}>{chapter.title}</strong>
          </div>
          <div className="cr-map-hud-chip">
            <small>最近通关</small>
            <strong title={recentLevelTitle}>{recentLevelTitle}</strong>
          </div>
          <div className="cr-map-hud-chip is-goal">
            <small>下一目标</small>
            <strong title={nextMission}>{nextMission}</strong>
          </div>
        </div>
        <div className="cr-map-meta">
          <div className="cr-resource">
            <Trophy />
            <div className="cr-resource-copy">
              <strong>{summary.completedCount}</strong>
              <span>已完成</span>
            </div>
          </div>
          <div className="cr-resource">
            <Star />
            <div className="cr-resource-copy">
              <strong>{summary.stars}</strong>
              <span>总星级</span>
            </div>
          </div>
          <button className="cr-member-btn" type="button" onClick={() => onOpenPanel("curriculum")}>
            玩法说明
          </button>
        </div>
      </div>
      <div className="cr-map-header">
        <div className="cr-map-world">
          <span className="cr-map-kicker">{chapter.badge}</span>
          <h1>{chapter.title}</h1>
          <p>{chapter.description}</p>
          <div className="cr-map-hero-strip">
            <div>
              <small>章节主题</small>
              <strong>
                {chapter.difficultyBand
                  ? `${chapter.difficultyBand} · ${chapter.levelRangeLabel ?? chapterThemeLabel[chapter.theme]}`
                  : chapterThemeLabel[chapter.theme]}
              </strong>
            </div>
            <div>
              <small>本章进度</small>
              <strong>{chapterProgress.completedCount}/{chapterLevels.length}</strong>
            </div>
            <div>
              <small>下一目标</small>
              <strong>{nextMission}</strong>
            </div>
          </div>
          <div className="cr-map-chapter-brief">
            <div className="cr-map-chapter-focus">
              <small>Python 重点</small>
              <strong>{cleanMissionCopy(chapterFocusPreview)}</strong>
            </div>
            {chapterGoalPreview.length > 0 ? (
              <div className="cr-map-chapter-goals">
                {chapterGoalPreview.map((goal) => (
                  <span key={`${chapter.id}-map-goal-${goal}`}>- {cleanMissionCopy(goal)}</span>
                ))}
              </div>
            ) : null}
            {chapterPathPreview.length > 0 ? (
              <div className="cr-map-learning-path">
                <small>学习路径</small>
                <div>
                  {chapterPathPreview.map((step) => (
                    <span key={`${chapter.id}-map-path-${step}`}>{cleanMissionCopy(step)}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="cr-map-world-stats">
          <div>
            <strong>{unlockedCount}</strong>
            <span>已解锁</span>
          </div>
          <div>
            <strong>{chapterProgress.completedCount}</strong>
            <span>本章通关</span>
          </div>
          <div>
            <strong>{chapterProgress.stars}</strong>
            <span>本章星级</span>
          </div>
        </div>
      </div>
      <div className="cr-scroll-affordance cr-scroll-affordance-map" role="status" aria-live="polite">
        <Compass />
        <span>滚轮可浏览整张地图，点击路线节点后显示“开始挑战”面板。</span>
      </div>
      <section className={`cr-dungeon-route-shell ${routeTransitioning ? "is-chapter-enter" : ""}`}>
        <div className="cr-dungeon-route-header">
          <div>
            <strong>{chapter.title} 关卡地图</strong>
            <span>计划节点 {routeNodes.length} · 当前开放 {playableNodeCount}</span>
          </div>
          <div className="cr-dungeon-route-meta">
            <span>已解锁 {animatedUnlockedCount}/{playableNodeCount}</span>
            <span>已完成 {chapterProgress.completedCount}/{chapterLevels.length}</span>
            <button
              type="button"
              className="cr-route-back-btn"
              onClick={() => {
                playSound("click");
                setSelectedMapLevelId(null);
                onBackToChapters();
              }}
            >
              <ArrowLeft /> 返回章节
            </button>
          </div>
        </div>
        <div className="cr-dungeon-route-board" data-testid="code-research-dungeon-map" data-onboard="map-route-board">
          <div
            className="cr-dungeon-route-bg"
            aria-hidden="true"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(10, 18, 30, 0.18), rgba(10, 18, 30, 0.44)), url("${chapter.background}")`,
            }}
          />
          <svg className="cr-dungeon-route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {routeLinePoints ? <polyline points={routeLinePoints} /> : null}
          </svg>
          {routeNodes.map((node, index) => {
            const level = chapterLevels[index];
            const previousLevel = index > 0 ? chapterLevels[index - 1] : null;
            const isPlayable = Boolean(level);
            const isCompleted = level ? Boolean(progress[level.id]?.completed) : false;
            const isUnlocked = level ? (index === 0 || Boolean(previousLevel && progress[previousLevel.id]?.completed)) : false;
            const isSelected = level ? selectedLevel.id === level.id : false;
            const isInspecting = level ? selectedMapLevelId === level.id : false;
            const isRevealedUnlock = isUnlocked && index < animatedUnlockedCount;
            const isAwaitingUnlockReveal = isUnlocked && index >= animatedUnlockedCount;
            const nodeClassName = [
              "cr-dungeon-node",
              isPlayable ? "is-playable" : "is-future",
              isUnlocked ? "is-unlocked" : "is-locked",
              isCompleted ? "is-complete" : "",
              isSelected ? "is-selected" : "",
              isInspecting ? "is-inspecting" : "",
              isRevealedUnlock ? "is-unlock-revealed" : "",
              isAwaitingUnlockReveal ? "is-await-unlock" : "",
            ].filter(Boolean).join(" ");

            return (
              <button
                key={node.id}
                type="button"
                className={nodeClassName}
                style={{ left: `${node.left}%`, top: `${node.top}%` }}
                data-onboard={index === 0 ? "map-node-first" : undefined}
                aria-current={isSelected ? "step" : undefined}
                disabled={!isPlayable || !isUnlocked}
                title={level ? `${node.index}. ${cleanMissionCopy(level.title)}` : `第 ${node.index} 关（待开放）`}
                onClick={() => {
                  if (!level || !isUnlocked) return;
                  playSound("click");
                  onSelectLevel(level);
                  setSelectedMapLevelId(level.id);
                }}
              >
                <span>{node.index}</span>
                <i>{isCompleted ? "已完成" : isUnlocked ? "可挑战" : "锁定"}</i>
              </button>
            );
          })}
        </div>
      </section>

      {selectedMapLevelId && (
        <div className="cr-map-selection-backdrop" onClick={() => setSelectedMapLevelId(null)} data-testid="code-research-selected-card">
          <article
            className="cr-selected-card-modern"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cr-selected-level-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cr-selected-head">
              <div>
                <div className="cr-selected-kicker">
                  {biomeLabel[focusedLevel.biome]} · 第 {focusedNodeIndex} 关 · {biomeAccentLabel[focusedLevel.biome]}
                </div>
                <h2 id="cr-selected-level-title">{cleanMissionCopy(focusedLevel.title)}</h2>
                <p>{cleanMissionCopy(focusedLevel.task.summary)}</p>
              </div>
              <div className="cr-selected-head-meta">
                <div className="cr-selected-badge">{focusedLevel.difficulty}</div>
                <button
                  type="button"
                  className="cr-selected-close"
                  aria-label="关闭关卡详情"
                  data-testid="code-research-selected-close"
                  onClick={() => setSelectedMapLevelId(null)}
                >
                  <X />
                </button>
              </div>
            </div>
            <div className="cr-selected-scene-ribbon">
              <span>当前挑战</span>
              <strong>{focusedNextMission}</strong>
            </div>
            <div className="cr-selected-inline-stats">
              <span>状态：{focusedStatusLabel}</span>
              <span>{focusedLevel.goals.length} 个目标</span>
              <span>{focusedLevel.parSteps} 步内</span>
            </div>
            <div className={`cr-selected-details ${showFocusedDetails ? "is-open" : "is-closed"}`}>
              <div className="cr-selected-preview">
                <LevelScenePreview level={focusedLevel} fallbackBackground={chapter.background} />
                <div className="cr-selected-body">
                  <div className="cr-selected-summary-grid">
                    <div>
                      <small>核心概念</small>
                      <strong>{focusedLevel.concepts.map((concept) => cleanMissionCopy(concept)).join(" · ")}</strong>
                    </div>
                    <div>
                      <small>导师</small>
                      <strong>{cleanMissionCopy(focusedLevel.mentor.name)}</strong>
                    </div>
                    <div>
                      <small>第一步</small>
                      <strong>{focusedNextMission}</strong>
                    </div>
                    <div>
                      <small>Python 阶段</small>
                      <strong>
                        {focusedPythonStage
                          ? `阶段 ${focusedPythonStage.index} · ${cleanMissionCopy(focusedPythonStage.focus)}`
                          : "阶段 0 · 路线基础"}
                      </strong>
                    </div>
                    <div>
                      <small>奖励</small>
                      <strong>{`+${focusedLevel.xpReward} XP · +${focusedLevel.coinReward} 金币`}</strong>
                    </div>
                  </div>
                  <div className="cr-scroll-note">{cleanMissionCopy(focusedLevel.mentor.intro)}</div>
                </div>
              </div>
              <div className="cr-selected-tutorial cr-selected-tutorial-compact">
                <div className="cr-selected-tutorial-head">
                  <strong>开局两步</strong>
                  <span>{Math.min(focusedLaunchSteps.length, 2)} 步</span>
                </div>
                <div className="cr-selected-step-list">
                  {focusedLaunchSteps.slice(0, 2).map((step, index) => (
                    <div key={step.id} className="cr-selected-step">
                      <i>{index + 1}</i>
                      <div>
                        <strong>{cleanMissionCopy(step.title)}</strong>
                        <span>{cleanMissionCopy(index === 0 ? step.instruction : step.success)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {!showFocusedDetails ? (
              <div className="cr-selected-compact-note">详情已折叠，点击“展开详情”查看知识点与开局引导。</div>
            ) : null}
            <div className="cr-selected-hotkeys">Hotkeys: Enter start · Esc close</div>
            <div className="cr-selected-bottom">
              <div className="cr-selected-tags">
                {focusedLevel.toolbox.slice(0, 2).map((tool) => {
                  const teachingCommand = toPythonTeachingCommand(tool);
                  return <span key={tool}>{teachingCommand}</span>;
                })}
              </div>
              <div className="cr-selected-actions">
                <button
                  className="cr-tool-btn"
                  type="button"
                  onClick={() => setShowFocusedDetails((value) => !value)}
                >
                  {showFocusedDetails ? "收起详情" : "展开详情"}
                </button>
                <button
                  className="cr-tool-btn"
                  type="button"
                  onClick={() => setSelectedMapLevelId(null)}
                >
                  关闭
                </button>
                <button
                  className="cr-start-btn"
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setSelectedMapLevelId(focusedLevel.id);
                    onStart();
                  }}
                >
                  开始挑战 <ChevronRight />
                </button>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

function DrawerPanel({
  open,
  panelId,
  title,
  subtitle,
  sections,
  chips,
  footer,
  actions,
  children,
  onClose,
}: {
  open: boolean;
  panelId?: string;
  title: string;
  subtitle?: string;
  sections: DrawerSection[];
  chips?: string[];
  footer?: string;
  actions?: DrawerAction[];
  children?: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="cr-drawer-backdrop" onClick={onClose} data-testid="code-research-drawer">
      <aside
        id={panelId}
        className="cr-drawer-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={cleanMissionCopy(title)}
      >
        <div className="cr-drawer-head">
          <div>
            <strong>{cleanMissionCopy(title)}</strong>
            {subtitle && <p>{cleanMissionCopy(subtitle)}</p>}
          </div>
          <button type="button" className="cr-tool-btn" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="cr-drawer-body">
          {sections.map((section) => (
            <section key={section.title} className="cr-drawer-section">
              <h3>{cleanMissionCopy(section.title)}</h3>
              {section.lines.map((line, index) => (
                <div key={`${section.title}-${index}-${line}`} className="cr-drawer-line">
                  {cleanMissionCopy(line)}
                </div>
              ))}
            </section>
          ))}
          {chips && chips.length > 0 && (
            <div className="cr-drawer-chips">
              {chips.map((chip) => (
                <span key={chip}>{cleanMissionCopy(chip)}</span>
              ))}
            </div>
          )}
          {actions && actions.length > 0 && (
            <div className="cr-drawer-actions">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={action.tone === "primary" ? "cr-run-btn" : "cr-tool-btn"}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          {children}
          {footer && <div className="cr-drawer-footer">{cleanMissionCopy(footer)}</div>}
        </div>
      </aside>
    </div>
  );
}

function OnboardingCoach({
  open,
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onPrev,
  onNext,
  onSkip,
}: {
  open: boolean;
  step: OnboardingStep | null;
  stepIndex: number;
  totalSteps: number;
  targetRect: OnboardingTargetRect | null;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  if (!open || !step) return null;

  const spotlightStyle = targetRect
    ? {
        top: `${Math.max(8, targetRect.top - 8)}px`,
        left: `${Math.max(8, targetRect.left - 8)}px`,
        width: `${targetRect.width + 16}px`,
        height: `${targetRect.height + 16}px`,
      }
    : undefined;

  const cardMetrics = (() => {
    if (!targetRect) return null;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;
    const cardWidth = 340;
    const cardHeight = 206;
    const margin = 14;
    let left = targetRect.left;
    let top = targetRect.top + targetRect.height + 16;

    if (step.arrow === "bottom") {
      top = targetRect.top - cardHeight - 16;
    } else if (step.arrow === "left") {
      left = targetRect.left + targetRect.width + 16;
      top = targetRect.top;
    } else if (step.arrow === "right") {
      left = targetRect.left - cardWidth - 16;
      top = targetRect.top;
    }

    left = Math.max(margin, Math.min(left, viewportWidth - cardWidth - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - cardHeight - margin));
    return { left, top, width: cardWidth, height: cardHeight };
  })();

  const cardStyle = cardMetrics ? { left: `${cardMetrics.left}px`, top: `${cardMetrics.top}px` } : undefined;
  const pathStyle = targetRect && cardMetrics
    ? (() => {
        const startX = targetRect.left + targetRect.width / 2;
        const startY = targetRect.top + targetRect.height / 2;
        const endX = cardMetrics.left + Math.min(84, cardMetrics.width / 2);
        const endY = cardMetrics.top + 28;
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return {
          left: `${startX}px`,
          top: `${startY}px`,
          width: `${distance}px`,
          transform: `translateY(-50%) rotate(${angle}deg)`,
        };
      })()
    : undefined;

  return (
    <div className="cr-onboard-layer" data-testid="code-research-onboarding">
      {targetRect ? <div className="cr-onboard-spotlight" style={spotlightStyle} aria-hidden="true" /> : null}
      {pathStyle ? <div className="cr-onboard-path" style={pathStyle} aria-hidden="true" /> : null}
      <aside className="cr-onboard-card" style={cardStyle}>
        <div className="cr-onboard-kicker">新手引导 {stepIndex + 1}/{totalSteps}</div>
        <div className="cr-onboard-progress" aria-hidden="true">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <i key={`onboard-dot-${index}`} className={index <= stepIndex ? "is-active" : ""} />
          ))}
        </div>
        <h3>{cleanMissionCopy(step.title)}</h3>
        <p>{cleanMissionCopy(step.description)}</p>
        {!targetRect ? (
          <div className="cr-onboard-locate-tip">正在定位当前操作区域，请稍候…</div>
        ) : null}
        <div className="cr-onboard-actions is-compact">
          <button type="button" className="cr-tool-btn" onClick={onPrev} disabled={stepIndex <= 0}>
            上一步
          </button>
          <button type="button" className="cr-tool-btn" onClick={onSkip}>
            跳过
          </button>
          <button type="button" className="cr-run-btn" onClick={onNext}>
            {stepIndex >= totalSteps - 1 ? "完成引导" : "下一步"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function cellTokens({
  level,
  state,
  terrain,
  item,
  enemy,
  door,
  bridge,
  switchTile,
  isExit,
  isHero,
}: {
  level: CodeResearchLevel;
  state: CodeResearchRuntimeState;
  terrain?: CodeResearchTerrain;
  item?: CodeResearchItem;
  enemy?: { label: string; kind: string };
  door?: CodeResearchDoor;
  bridge?: CodeResearchBridgeSpot;
  switchTile?: CodeResearchSwitch;
  isExit: boolean;
  isHero: boolean;
}) {
  const tokens = [];
  const scanned = state.scanned || level.id === "scanner-ruins-7" || level.id === "capstone-8";
  const useTinyDungeonStage = level.biome === "dungeon";
  const useCityScene = level.scene?.theme === "city";
  const useDungeonScene = level.scene?.theme === "dungeonScene";
  if (terrain?.kind === "decor" && !useDungeonScene) {
    tokens.push(
      <TokenSprite
        key="decor"
        className="cr-tile-decor cr-token-sprite"
        src={
          useCityScene
            ? picoCitySprites.tree
            : useDungeonScene
              ? dungeonSceneSprites.decor
              : useTinyDungeonStage
                ? tinyDungeonStageSprites.torch
                : spriteByTerrainKind.decor!
        }
        alt={terrain.label}
      />,
    );
  }
  if (terrain?.kind === "rune" && !useDungeonScene) {
    tokens.push(
      <TokenSprite
        key="rune"
        className="cr-tile-rune cr-token-sprite"
        src={spriteByTerrainKind.rune!}
        alt={terrain.label}
      />,
    );
  }
  if (terrain?.kind === "hazard" && scanned) {
    tokens.push(
      <TokenSprite
        key="hazard"
        className="cr-token cr-token-hazard cr-token-sprite"
        src={useDungeonScene ? dungeonSceneSprites.hazard : spriteByTerrainKind.hazard!}
        alt={terrain.label}
      />,
    );
  }
  if (terrain?.kind === "water" && bridge && state.builtBridgeIds.includes(bridge.id)) {
    tokens.push(
      <TokenSprite
        key="built-bridge"
        className="cr-token cr-token-bridge cr-token-sprite"
        src={useDungeonScene ? dungeonSceneSprites.bridgeBuilt : "/code-research/sprites/tile-bridge-built.png"}
        alt={bridge.label}
      />,
    );
  }
  if (terrain?.kind === "water" && bridge && !state.builtBridgeIds.includes(bridge.id)) {
    tokens.push(
      <TokenSprite
        key="bridge-spot"
        className="cr-token cr-token-water cr-token-sprite"
        src={useDungeonScene ? dungeonSceneSprites.bridgeBroken : "/code-research/sprites/tile-bridge-broken.png"}
        alt={bridge.label}
      />,
    );
  }
  if (switchTile) {
    tokens.push(
      <TokenSprite
        key="switch"
        className={`cr-token cr-token-switch cr-token-sprite ${state.activatedSwitchIds.includes(switchTile.id) ? "cr-token-switch-on" : ""}`}
        src={
          useDungeonScene
            ? state.activatedSwitchIds.includes(switchTile.id)
              ? dungeonSceneSprites.switchOn
              : dungeonSceneSprites.switchOff
            : state.activatedSwitchIds.includes(switchTile.id)
              ? "/code-research/sprites/tile-switch-on.png"
              : "/code-research/sprites/tile-switch-off.png"
        }
        alt={switchTile.label}
      />,
    );
  }
  if (isExit) {
    tokens.push(
      <TokenSprite
        key="exit"
        className="cr-token cr-token-exit cr-token-sprite"
        src={
          useCityScene
            ? picoCitySprites.exit
            : useDungeonScene
              ? dungeonSceneSprites.exit
              : useTinyDungeonStage
                ? tinyDungeonStageSprites.exit
                : "/code-research/sprites/tile-exit.png"
        }
        alt="出口"
      />,
    );
  }
  if (door && !state.openedDoorIds.includes(door.id)) {
    tokens.push(
      <TokenSprite
        key="door"
        className="cr-token cr-token-door cr-token-sprite"
        src={
          useCityScene
            ? picoCitySprites.fence
            : useDungeonScene
              ? dungeonSceneSprites.door
              : useTinyDungeonStage
                ? tinyDungeonStageSprites.door
                : "/code-research/sprites/tile-door-closed.png"
        }
        alt={door.label}
      />,
    );
  }
  if (door && state.openedDoorIds.includes(door.id)) {
    tokens.push(
      <TokenSprite
        key="door-open"
        className="cr-token cr-token-door-open cr-token-sprite"
        src={useDungeonScene ? dungeonSceneSprites.doorOpen : "/code-research/sprites/tile-door-open.png"}
        alt={`${door.label}已打开`}
      />,
    );
  }
  if (item) {
    tokens.push(
      <TokenSprite
        key={item.id}
        className={`cr-token cr-token-${item.kind} cr-token-sprite`}
        src={
          useDungeonScene
            ? item.kind === "crystal"
              ? dungeonSceneSprites.crystal
              : item.kind === "key"
                ? dungeonSceneSprites.key
                : item.kind === "scroll"
                  ? dungeonSceneSprites.scroll
                  : item.kind === "coin"
                    ? dungeonSceneSprites.coin
                    : item.kind === "potion"
                      ? dungeonSceneSprites.potion
                      : item.kind === "plank"
                    ? dungeonSceneSprites.plank
                  : spriteByItemKind[item.kind]
            : spriteByItemKind[item.kind]
        }
        alt={item.label}
      />,
    );
  }
  if (enemy) {
    tokens.push(
      <TokenSprite
        key="enemy"
        className={`cr-token cr-token-enemy cr-token-enemy-${enemy.kind} cr-token-sprite`}
        src={
          useCityScene && enemy.kind === "guard"
            ? picoCitySprites.guard
            : useDungeonScene && enemy.kind === "guard"
              ? dungeonSceneSprites.guard
              : useDungeonScene && enemy.kind === "bug"
                ? dungeonSceneSprites.bug
                : useDungeonScene && enemy.kind === "sentinel"
                  ? dungeonSceneSprites.sentinel
              : useTinyDungeonStage && enemy.kind === "guard"
                ? tinyDungeonStageSprites.skeleton
                : spriteByEnemyKind[enemy.kind]
        }
        alt={enemy.label}
      />,
    );
  }
  if (isHero) {
    tokens.push(
      <TokenSprite
        key="hero"
        className="cr-token cr-token-hero cr-token-sprite"
        src={
          useCityScene
            ? picoCitySprites.hero
            : useDungeonScene
              ? dungeonSceneSprites.hero
              : useTinyDungeonStage
                ? tinyDungeonStageSprites.hero
                : "/code-research/sprites/hero-adventurer.png"
        }
        alt="英雄"
      />,
    );
  }
  return tokens;
}

function scenePointStyle(
  scene: CodeResearchSceneConfig,
  level: CodeResearchLevel,
  point: { x: number; y: number },
) {
  const cellWidth = scene.grid.width / Math.max(1, level.width - 1);
  const cellHeight = (scene.grid.height || 0) > 0
    ? scene.grid.height / Math.max(1, level.height - 1)
    : 0;
  const sourceWidth = scene.sourceWidth ?? 1000;
  const sourceHeight = scene.sourceHeight ?? 1000;
  const xPx = scene.grid.left + point.x * cellWidth;
  const yPx = scene.grid.top + point.y * cellHeight;

  return {
    left: `${(xPx / sourceWidth) * 100}%`,
    top: `${(yPx / sourceHeight) * 100}%`,
  };
}

function sceneFocusStyle(
  scene: CodeResearchSceneConfig,
  level: CodeResearchLevel,
  point: { x: number; y: number },
) {
  const cellWidth = scene.grid.width / Math.max(1, level.width - 1);
  const hasSceneHeight = (scene.grid.height || 0) > 0;
  const cellHeight = hasSceneHeight
    ? scene.grid.height / Math.max(1, level.height - 1)
    : 0;
  const sourceWidth = scene.sourceWidth ?? 1000;
  const sourceHeight = scene.sourceHeight ?? 1000;
  const visualCellHeight = hasSceneHeight ? cellHeight : cellWidth * 0.74;
  const size = Math.max(54, Math.min(cellWidth, visualCellHeight) * 1.08);
  const xPx = scene.grid.left + point.x * cellWidth;
  const yPx = scene.grid.top + point.y * cellHeight;

  return {
    left: `${(xPx / sourceWidth) * 100}%`,
    top: `${(yPx / sourceHeight) * 100}%`,
    width: `${(size / sourceWidth) * 100}%`,
    height: `${(size / sourceHeight) * 100}%`,
  };
}

function LevelBoard({
  level,
  state,
  focusPoint,
  pulseEvent,
  running,
}: {
  level: CodeResearchLevel;
  state: CodeResearchRuntimeState;
  focusPoint?: FocusTarget | null;
  pulseEvent?: CodeResearchFrame["event"] | null;
  running?: boolean;
}) {
  const terrainByKey = new Map(level.terrain.map((terrain) => [pointKey(terrain), terrain]));
  const doorByKey = new Map((level.doors ?? []).map((door) => [pointKey(door), door]));
  const bridgeByKey = new Map((level.bridges ?? []).map((bridge) => [pointKey(bridge), bridge]));
  const switchByKey = new Map((level.switches ?? []).map((switchTile) => [pointKey(switchTile), switchTile]));
  const scanned = state.scanned || level.id === "scanner-ruins-7" || level.id === "capstone-8";
  const useTinyDungeonStage = level.biome === "dungeon";
  const scene = level.scene;
  const runToneClass = running
    ? "cr-board-state-running"
    : state.success
      ? "cr-board-state-success"
      : state.failed
        ? "cr-board-state-fail"
        : "cr-board-state-idle";

  if (scene) {
    const boardCells = Array.from({ length: level.width * level.height }, (_, cellIndex) => {
      const x = cellIndex % level.width;
      const y = Math.floor(cellIndex / level.width);
      const key = `${x},${y}`;
      const terrain = terrainByKey.get(key);
      const item = level.items.find((candidate) => candidate.x === x && candidate.y === y && !state.collectedItemIds.includes(candidate.id));
      const enemy = level.enemies.find((candidate) => candidate.x === x && candidate.y === y && !state.defeatedEnemyIds.includes(candidate.id));
      const door = doorByKey.get(key);
      const bridge = bridgeByKey.get(key);
      const switchTile = switchByKey.get(key);
      const isExit = level.exit.x === x && level.exit.y === y;
      const isHero = state.hero.x === x && state.hero.y === y;

      if (!terrain && !item && !enemy && !door && !bridge && !switchTile && !isExit && !isHero) {
        return null;
      }

      const tokens = cellTokens({ level, state, terrain, item, enemy, door, bridge, switchTile, isExit, isHero });
      if (!tokens.length) return null;
      const isFocus = Boolean(focusPoint && focusPoint.x === x && focusPoint.y === y);
      const stackClassName = [
        "cr-scene-token-stack",
        isHero ? "is-hero" : "",
        enemy ? "is-enemy" : "",
        enemy ? `is-enemy-${enemy.kind}` : "",
        item ? "is-item" : "",
        item ? `is-item-${item.kind}` : "",
        switchTile ? "has-switch" : "",
        bridge ? "has-bridge" : "",
        door ? "has-door" : "",
        isExit ? "has-exit" : "",
        isFocus ? "is-focus-target" : "",
        isFocus ? `is-focus-${focusPoint?.accent ?? "item"}` : "",
      ].filter(Boolean).join(" ");

      return (
        <div
          key={key}
          className={stackClassName}
          style={scenePointStyle(scene, level, { x, y })}
          data-cell={`${x},${y}`}
        >
          {tokens}
        </div>
      );
    });

    return (
      <div
        className={`cr-board cr-board-scene cr-board-scene-${scene.theme} cr-board-scene-${level.id} ${runToneClass} ${scanned ? "cr-board-scanned" : ""} ${pulseEvent ? `cr-board-pulse-${pulseEvent}` : ""}`}
        data-testid="code-research-board"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(4, 16, 28, 0.18), rgba(4, 12, 22, 0.34)), url("${scene.background}")`,
          ["--cr-scene-token-scale" as string]: String(scene.tokenScale ?? 1),
        }}
      >
        <div className="cr-scene-vignette" aria-hidden="true" />
        <div className="cr-scene-grid-hud" aria-hidden="true">
          {Array.from({ length: level.width * level.height }, (_, cellIndex) => {
            const x = cellIndex % level.width;
            const y = Math.floor(cellIndex / level.width);
            return (
              <span
                key={`${x},${y}`}
                className={`cr-scene-guide-dot ${state.hero.x === x && state.hero.y === y ? "is-active" : ""}`}
                style={scenePointStyle(scene, level, { x, y })}
              />
            );
          })}
        </div>
        {focusPoint ? (
          <div
            className={`cr-scene-focus-ring cr-scene-focus-${focusPoint.accent}`}
            style={sceneFocusStyle(scene, level, focusPoint)}
          >
            <span>{focusPoint.label}</span>
          </div>
        ) : null}
        {boardCells}
      </div>
    );
  }

  return (
    <div
      className={`cr-board cr-board-${level.biome} ${runToneClass} ${scanned ? "cr-board-scanned" : ""}`}
      style={{ gridTemplateColumns: `repeat(${level.width}, minmax(46px, 1fr))` }}
      data-testid="code-research-board"
    >
      {Array.from({ length: level.width * level.height }, (_, cellIndex) => {
        const x = cellIndex % level.width;
        const y = Math.floor(cellIndex / level.width);
        const key = `${x},${y}`;
        const terrain = terrainByKey.get(key);
        const item = level.items.find((candidate) => candidate.x === x && candidate.y === y && !state.collectedItemIds.includes(candidate.id));
        const enemy = level.enemies.find((candidate) => candidate.x === x && candidate.y === y && !state.defeatedEnemyIds.includes(candidate.id));
        const door = doorByKey.get(key);
        const bridge = bridgeByKey.get(key);
        const switchTile = switchByKey.get(key);
        const isExit = level.exit.x === x && level.exit.y === y;
        const isHero = state.hero.x === x && state.hero.y === y;
        const isFocus = focusPoint?.x === x && focusPoint?.y === y;

        return (
          <div
            key={key}
            className={`cr-cell cr-cell-${terrain?.kind ?? "floor"} ${useTinyDungeonStage ? "cr-cell-tiny-dungeon" : ""} ${isHero ? "cr-cell-hero-here" : ""} ${isFocus ? `cr-cell-focus-target cr-cell-focus-${focusPoint?.accent ?? "item"}` : ""} ${state.scanned ? "cr-cell-scanned" : ""}`}
            data-cell={`${x},${y}`}
          >
            {useTinyDungeonStage ? (
              <span
                className={`cr-cell-surface ${terrain?.kind === "wall" ? "cr-surface-wall" : terrain?.kind === "decor" ? "cr-surface-floor cr-surface-floor-shadow" : terrain?.kind === "rune" ? "cr-surface-floor cr-surface-floor-corner" : "cr-surface-floor"}`}
                aria-hidden="true"
              />
            ) : (
              <span className="cr-cell-coord">{x + 1},{y + 1}</span>
            )}
            {isFocus && focusPoint ? <span className="cr-focus-label">{focusPoint.label}</span> : null}
            {cellTokens({ level, state, terrain, item, enemy, door, bridge, switchTile, isExit, isHero })}
          </div>
        );
      })}
    </div>
  );
}

function LevelScenePreview({
  level,
  fallbackBackground,
  compact,
}: {
  level: CodeResearchLevel;
  fallbackBackground?: string;
  compact?: boolean;
}) {
  const heroSprite = getCodeResearchHeroSprite(level);
  const enemySprite = getCodeResearchEnemySprite(level);
  const goalSprite = getCodeResearchGoalSprite(level);
  const goalLabel = cleanMissionCopy(level.goals[0]?.label ?? "进入挑战");

  return (
    <div
      className={`cr-scene-preview ${compact ? "is-compact" : ""}`}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(5, 16, 28, 0.12), rgba(5, 14, 24, 0.5)), url("${getCodeResearchBackdrop(level, fallbackBackground)}")`,
      }}
      aria-hidden="true"
    >
      <div className="cr-scene-preview-shade" />
      <Image className="cr-scene-preview-hero" src={heroSprite} alt="" width={120} height={120} />
      {enemySprite ? (
        <Image className="cr-scene-preview-enemy" src={enemySprite} alt="" width={88} height={88} />
      ) : null}
      <div className="cr-scene-preview-goal">
        {goalSprite ? <Image src={goalSprite} alt="" width={40} height={40} /> : null}
        <span>{goalLabel}</span>
      </div>
    </div>
  );
}

function GoalList({ statuses }: { statuses: CodeResearchGoalStatus[] }) {
  const completedCount = statuses.filter((goal) => goal.completed).length;

  return (
    <div className="cr-goal-card">
      <h2><Target /> 挑战目标 <small>{completedCount}/{statuses.length}</small></h2>
      {statuses.map((goal) => (
        <div key={goal.id} className={`cr-goal-line ${goal.completed ? "cr-goal-done" : ""}`}>
          <span>{goal.completed ? <Check /> : "•"}</span>
          {cleanMissionCopy(goal.label)}
        </div>
      ))}
    </div>
  );
}

function CompactGoalList({
  statuses,
  activeGoal,
}: {
  statuses: CodeResearchGoalStatus[];
  activeGoal?: CodeResearchGoalStatus;
}) {
  const completedCount = statuses.filter((goal) => goal.completed).length;

  return (
    <div className="cr-goal-card-compact">
      <h2><Target /> 挑战目标 <small>{completedCount}/{statuses.length}</small></h2>
      {activeGoal ? (
        <div className="cr-goal-current">
          <strong>当前先完成</strong>
          <span>{cleanMissionCopy(activeGoal.label)}</span>
        </div>
      ) : (
        <div className="cr-goal-current is-done">
          <strong>目标完成</strong>
          <span>所有关卡目标都已经满足，可以继续优化步数或进入下一关。</span>
        </div>
      )}
      <div className="cr-goal-mini-list">
        {statuses.map((goal) => (
          <div key={goal.id} className={`cr-goal-pill ${goal.completed ? "is-done" : ""}`}>
            <span>{goal.completed ? <Check /> : <Target />}</span>
            {cleanMissionCopy(goal.label)}
          </div>
        ))}
      </div>
    </div>
  );
}

function TutorialProgressCard({
  currentStep,
  completedCount,
  totalCount,
}: TutorialCardState) {
  const currentStepNumber = getCurrentStepNumber(currentStep, totalCount, completedCount);
  return (
    <div className="cr-tutorial-progress" data-testid="code-research-tutorial-progress">
      <div className="cr-panel-title">
        <Lightbulb /> 教学步骤
        <small>{completedCount}/{totalCount}</small>
      </div>
      {currentStep ? (
        <div className="cr-tutorial-stepbar">
          <span>当前步骤 {currentStepNumber}/{totalCount}</span>
          <div className="cr-tutorial-flags">
            <i className={currentStep.draftComplete ? "is-done" : ""}>已补代码</i>
            <i className={currentStep.runComplete ? "is-done" : ""}>已运行验证</i>
          </div>
        </div>
      ) : null}
      <strong>{currentStep?.title ?? "全部教学步骤已完成"}</strong>
      <p>{cleanMissionCopy(currentStep?.instruction ?? "现在可以继续优化代码步数，或者进入下一关。")}</p>
      {currentStep && <div className="cr-tutorial-coach">{cleanMissionCopy(currentStep.coach)}</div>}
    </div>
  );
}

function MissionBrief({ level, statuses }: { level: CodeResearchLevel; statuses: CodeResearchGoalStatus[] }) {
  const requiredItems = level.items.filter((item) => item.required !== false);
  const blockers = [
    ...level.enemies.map((enemy) => enemy.label),
    ...(level.doors ?? []).map((door) => door.label),
    ...(level.bridges ?? []).map((bridge) => bridge.label),
    ...(level.switches ?? []).map((switchTile) => switchTile.label),
  ];
  const incomplete = statuses.find((goal) => !goal.completed);

  return (
    <div className="cr-mission-brief" data-testid="code-research-mission-brief">
      <div className="cr-panel-title">
        <ScrollText /> 任务卷轴
      </div>
      <p>{cleanMissionCopy(level.subtitle)}</p>
      <div className="cr-brief-grid">
        <span><Compass /> 起点 {level.heroStart.x + 1},{level.heroStart.y + 1}</span>
        <span><Target /> 出口 {level.exit.x + 1},{level.exit.y + 1}</span>
        <span><Clock3 /> 三星 {level.parSteps} 步内</span>
      </div>
      <div className="cr-brief-line">
        <strong>关键物品</strong>
        <span>{requiredItems.length ? requiredItems.map((item) => cleanMissionCopy(item.label)).join("、") : "本关不需要额外物品"}</span>
      </div>
      <div className="cr-brief-line">
        <strong>障碍元素</strong>
        <span>{blockers.length ? blockers.map((item) => cleanMissionCopy(item)).join("、") : "无主动障碍，专注顺序执行"}</span>
      </div>
      <div className="cr-next-step">
        <Lightbulb /> 当前优先级：{cleanMissionCopy(incomplete?.label ?? "目标全部完成，运行结果会结算奖励")}
      </div>
    </div>
  );
}

function StrategyCard({ level }: { level: CodeResearchLevel }) {
  const steps = getCodeResearchTutorialSteps(level);

  return (
    <div className="cr-strategy-card" data-testid="code-research-strategy-card">
      <div className="cr-panel-title">
        <ListChecks /> 导师路线
      </div>
      <ol>
        {steps.map((step) => (
          <li key={step.id}>
            <strong>{cleanMissionCopy(step.title)}</strong>
            <span>{cleanMissionCopy(step.instruction)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TaskCard({
  task,
  currentStep,
  guided,
}: {
  task: CodeResearchTask;
  currentStep?: CodeResearchTutorialStepStatus;
  guided?: boolean;
}) {
  return (
    <div className="cr-task-card" data-testid="code-research-task-card">
      <div className="cr-panel-title">
        <ScrollText /> {cleanMissionCopy(task.title)}
        <small>{taskModeLabel[task.mode]}</small>
      </div>
      <p>{cleanMissionCopy(guided && currentStep ? currentStep.instruction : task.summary)}</p>
      {currentStep && (
        <div className="cr-task-focus">
          <strong>{cleanMissionCopy(currentStep.title)}</strong>
          <span>{cleanMissionCopy(guided ? currentStep.coach : currentStep.instruction)}</span>
        </div>
      )}
      <div className="cr-task-checks">
        {(guided && currentStep ? [currentStep.success, currentStep.coach] : task.checklist).map((line) => (
          <div key={line} className="cr-task-check">
            <Check />
            {cleanMissionCopy(line)}
          </div>
        ))}
      </div>
    </div>
  );
}

function MentorPanel({
  level,
  state,
  hint,
  activeGoal,
  currentStep,
}: {
  level: CodeResearchLevel;
  state: CodeResearchRuntimeState;
  hint: string;
  activeGoal?: CodeResearchGoalStatus;
  currentStep?: CodeResearchTutorialStepStatus;
}) {
  return (
    <div className={`cr-mentor-card cr-mentor-${state.messageTone}`}>
      <div className="cr-mentor-avatar">{level.mentor.avatar}</div>
      <div>
        <div className="cr-mentor-name">{cleanMissionCopy(level.mentor.name)}</div>
        <p>{cleanMissionCopy(state.message)}</p>
        {currentStep && (
          <div className="cr-mentor-step">
            <strong>{cleanMissionCopy(currentStep.title)}</strong>
            <span>{cleanMissionCopy(currentStep.coach)}</span>
          </div>
        )}
        {activeGoal && (
          <div className="cr-mentor-next">
            <Target /> 下一目标：{cleanMissionCopy(activeGoal.label)}
          </div>
        )}
        {hint && <div className="cr-mentor-hint"><Lightbulb /> {cleanMissionCopy(hint)}</div>}
      </div>
    </div>
  );
}

function Toolbox({
  commands,
  onInsertCommand,
  suggestedCommands,
  guided,
  currentStep,
  containerRef,
  className,
}: {
  commands: string[];
  onInsertCommand: (command: string) => void;
  suggestedCommands?: string[];
  guided?: boolean;
  currentStep?: CodeResearchTutorialStepStatus;
  containerRef?: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const highlighted = commands.filter((command) => suggestedCommands?.includes(command));
  const remaining = commands.filter((command) => !suggestedCommands?.includes(command));
  return (
    <div ref={containerRef} className={["cr-toolbox", className].filter(Boolean).join(" ")} data-onboard="level-toolbox">
      <div className="cr-panel-title">
        <BookOpen /> 命令书 <small>点击可插入</small>
      </div>
      {guided && currentStep && highlighted.length > 0 ? (
        <div className="cr-toolbox-guided">
          <div className="cr-toolbox-lane">
            <div className="cr-toolbox-lane-head">
              <strong>当前推荐</strong>
              <span>{currentStep.title}</span>
            </div>
            <div className="cr-toolbox-grid">
              {highlighted.map((command) => (
                <button
                  key={command}
                  type="button"
                  onClick={() => onInsertCommand(command)}
                  data-testid="code-research-command-chip"
                  className="cr-command-suggested"
                >
                  <code>{command}</code>
                </button>
              ))}
            </div>
          </div>
          {remaining.length > 0 ? (
            <details className="cr-toolbox-more">
              <summary>
                <span>更多命令</span>
                <small>{remaining.length} 条</small>
              </summary>
              <div className="cr-toolbox-grid">
                {remaining.map((command) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => onInsertCommand(command)}
                    data-testid="code-research-command-chip"
                  >
                    <code>{command}</code>
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <div className="cr-toolbox-grid">
          {commands.map((command) => (
            <button
              key={command}
              type="button"
              onClick={() => onInsertCommand(command)}
              data-testid="code-research-command-chip"
              className={suggestedCommands?.includes(command) ? "cr-command-suggested" : ""}
            >
              <code>{command}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BoardLegend({ level, state }: { level: CodeResearchLevel; state: CodeResearchRuntimeState }) {
  const entries = [
    { key: "hero", label: "英雄", src: "/code-research/sprites/hero-adventurer.png", className: "cr-token-hero" },
    { key: "exit", label: "出口", src: "/code-research/sprites/tile-exit.png", className: "cr-token-exit" },
    ...(level.items.some((item) => item.kind === "crystal")
      ? [{ key: "crystal", label: "水晶", src: "/code-research/sprites/item-crystal.png", className: "cr-token-crystal" }]
      : []),
    ...(level.items.some((item) => item.kind === "key")
      ? [{ key: "key", label: "钥匙", src: "/code-research/sprites/item-key.png", className: "cr-token-key" }]
      : []),
    ...(level.items.some((item) => item.kind === "scroll")
      ? [{ key: "scroll", label: "卷轴", src: "/code-research/sprites/item-scroll.png", className: "cr-token-scroll" }]
      : []),
    ...(level.items.some((item) => item.kind === "plank")
      ? [{ key: "plank", label: "木板", src: "/code-research/sprites/item-plank.png", className: "cr-token-plank" }]
      : []),
    ...(level.enemies.length ? [{ key: "enemy", label: "敌人", src: "/code-research/sprites/enemy-guard.png", className: "cr-token-enemy" }] : []),
    ...((level.doors?.length ?? 0) > 0 ? [{ key: "door", label: "门锁", src: "/code-research/sprites/tile-door-closed.png", className: "cr-token-door" }] : []),
    ...((level.bridges?.length ?? 0) > 0 ? [{ key: "bridge", label: "断桥", src: "/code-research/sprites/tile-bridge-broken.png", className: "cr-token-water" }] : []),
    ...((level.switches?.length ?? 0) > 0 ? [{ key: "switch", label: "机关", src: "/code-research/sprites/tile-switch-off.png", className: "cr-token-switch" }] : []),
    ...(level.terrain.some((tile) => tile.kind === "hazard")
      ? [{ key: "hazard", label: state.scanned ? "危险" : "扫描后显示", src: "/code-research/sprites/tile-hazard.png", className: "cr-token-hazard" }]
      : []),
  ];

  return (
    <div className="cr-board-legend" data-testid="code-research-board-legend">
      {entries.map((entry) => (
        <span key={entry.key}>
          <i className={`cr-token ${entry.className} cr-token-sprite`}>
            <Image src={entry.src} alt={entry.label} width={24} height={24} />
          </i>
          {entry.label}
        </span>
      ))}
    </div>
  );
}

function RunTimeline({ frames, running }: { frames: CodeResearchFrame[]; running: boolean }) {
  const visibleFrames = frames.slice(-9);

  return (
    <div className="cr-run-timeline" data-testid="code-research-run-timeline">
      <div className="cr-panel-title">
        <Clock3 /> 运行时间线 {running && <small>播放中</small>}
      </div>
      <div className="cr-timeline-list">
        {visibleFrames.map((frame, index) => (
          <div key={`${frame.event}-${index}-${frame.state.step}`} className={`cr-timeline-item cr-timeline-${frame.event}`}>
            <span>{frame.state.step || index}</span>
            <strong>{eventLabel[frame.event]}</strong>
            <em>{cleanMissionCopy(frame.log)}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneObjectivePanel({
  level,
  currentStep,
  activeGoal,
  statuses,
}: {
  level: CodeResearchLevel;
  currentStep?: CodeResearchTutorialStepStatus;
  activeGoal?: CodeResearchGoalStatus;
  statuses: CodeResearchGoalStatus[];
}) {
  const completedCount = statuses.filter((goal) => goal.completed).length;

  return (
    <div className="cr-scene-objective">
      <div className="cr-scene-objective-kicker">目标追踪</div>
      <h2>{cleanMissionCopy(currentStep?.title ?? activeGoal?.label ?? "挑战完成")}</h2>
      <p>{cleanMissionCopy(currentStep?.instruction ?? activeGoal?.label ?? level.mentor.success)}</p>
      <div className="cr-scene-objective-progress">
        <span>当前目标：{cleanMissionCopy(activeGoal?.label ?? "全部完成")}</span>
        <span>完成度：{completedCount}/{statuses.length}</span>
      </div>
    </div>
  );
}

function VictoryModal({
  level,
  stars,
  steps,
  onNext,
  onBackToMap,
}: {
  level: CodeResearchLevel;
  stars: number;
  steps: number;
  onNext: () => void;
  onBackToMap: () => void;
}) {
  return (
    <div className="cr-victory-modal" data-testid="code-research-victory-modal">
      <div className="cr-victory-card">
        <div className="cr-victory-burst">✦</div>
        <h2>挑战完成</h2>
        <p>{cleanMissionCopy(level.mentor.success)}</p>
        <Stars count={stars} />
        <div className="cr-victory-rewards">
          <span><Sparkles /> +{level.xpReward} XP</span>
          <span><Gem /> +{level.coinReward} 金币</span>
          <span><ScrollText /> {steps} 步</span>
        </div>
        <div className="cr-victory-actions">
          <button type="button" className="cr-tool-btn" onClick={onBackToMap}>返回地图</button>
          <button type="button" className="cr-run-btn" onClick={onNext}>下一关</button>
        </div>
      </div>
    </div>
  );
}

function LevelScreen({
  level,
  onBackToMap,
  onComplete,
  onSelectNext,
  onOpenOnboarding,
  playSound,
}: {
  level: CodeResearchLevel;
  onBackToMap: () => void;
  onComplete: (stars: number, steps: number) => void;
  onSelectNext: () => void;
  onOpenOnboarding: () => void;
  playSound: (sound: SoundName) => void;
}) {
  const starterTemplate = useMemo(() => toPythonTeachingCode(level.starterCode), [level.id, level.starterCode]);
  const [code, setCode] = useState(starterTemplate);
  const [state, setState] = useState<CodeResearchRuntimeState>(() => stateForLevel(level));
  const [logs, setLogs] = useState<string[]>(["等待运行代码。"]);
  const [running, setRunning] = useState(false);
  const [lastStars, setLastStars] = useState(0);
  const [lastSteps, setLastSteps] = useState(0);
  const [hintIndex, setHintIndex] = useState(-1);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showReference, setShowReference] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showCompanion, setShowCompanion] = useState(false);
  const [showObjectiveDetail, setShowObjectiveDetail] = useState(false);
  const [completedStepToast, setCompletedStepToast] = useState("");
  const [storyBeatIndex, setStoryBeatIndex] = useState(0);
  const [eventNarration, setEventNarration] = useState("");
  const [cinematicCue, setCinematicCue] = useState("");
  const [scenePulseEvent, setScenePulseEvent] = useState<CodeResearchFrame["event"] | null>(null);
  const [guideOverlayMode, setGuideOverlayMode] = useState<GuideOverlayMode>(null);
  const [guidedUiTarget, setGuidedUiTarget] = useState<GuidedUiTarget | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const completedStepCountRef = useRef(0);
  const currentStepIdRef = useRef<string | null>(null);
  const cursorRef = useRef<{ start: number; end: number }>({
    start: starterTemplate.length,
    end: starterTemplate.length,
  });
  const [timeline, setTimeline] = useState<CodeResearchFrame[]>([
    { state: stateForLevel(level), log: level.mentor.intro, event: "start" },
  ]);

  useEffect(() => {
    const initialState = stateForLevel(level);
    setCode(starterTemplate);
    setState(initialState);
    setLogs(["等待运行代码。"]);
    setRunning(false);
    setLastStars(0);
    setLastSteps(0);
    setHintIndex(-1);
    setAttemptCount(0);
    setShowReference(false);
    setShowVictory(false);
    setShowCompanion(false);
    setShowObjectiveDetail(false);
    setCompletedStepToast("");
    setStoryBeatIndex(0);
    setEventNarration("");
    setCinematicCue("");
    setScenePulseEvent(null);
    setGuideOverlayMode(null);
    setGuidedUiTarget(null);
    completedStepCountRef.current = 0;
    currentStepIdRef.current = null;
    cursorRef.current = { start: starterTemplate.length, end: starterTemplate.length };
    setTimeline([{ state: initialState, log: level.mentor.intro, event: "start" }]);
  }, [level, starterTemplate]);

  const statuses = getCodeResearchGoalStatuses(level, state);
  const tutorialStatuses = getCodeResearchTutorialStatuses(level, code, state);
  const currentTutorialStep = tutorialStatuses.find((step) => !step.completed);
  const completedTutorialSteps = tutorialStatuses.filter((step) => step.completed).length;
  const activeGoal = statuses.find((goal) => !goal.completed);
  const currentHint = hintIndex >= 0 ? level.hints[Math.min(hintIndex, level.hints.length - 1)] : "";
  const showStepBanner = tutorialStatuses.length > 0;
  const focusPoint = resolveFocusTargetForStep(level, currentTutorialStep);
  const referenceSolution = useMemo(() => toPythonTeachingCode(level.solution), [level.id, level.solution]);
  const toolboxCommands = useMemo(
    () => level.toolbox.map((command) => toPythonTeachingCommand(command)),
    [level.id, level.toolbox],
  );
  const suggestedCommands = useMemo(
    () => getSuggestedCommandsForStep(currentTutorialStep).map((command) => toPythonTeachingCommand(command)),
    [currentTutorialStep],
  );
  const currentKnowledgeLines = currentTutorialStep
    ? [currentTutorialStep.coach, currentTutorialStep.success]
    : level.briefing.slice(0, 2);
  const showRunFeedback = attemptCount > 0 || state.failed || state.success;
  const assistantContext = useMemo(
    () => buildCodeResearchAssistantContext({ level, code, logs }),
    [code, level, logs],
  );
  const storyBeats = useMemo(
    () => composeStoryBeats({ level, currentStep: currentTutorialStep, activeGoal }),
    [level, currentTutorialStep, activeGoal],
  );
  const safeStoryBeatIndex = Math.max(0, Math.min(storyBeatIndex, Math.max(0, storyBeats.length - 1)));
  const currentStoryBeat = storyBeats[safeStoryBeatIndex] ?? cleanMissionCopy(level.mentor.intro);
  const coachTarget: GuidedUiTarget = currentTutorialStep
    ? currentTutorialStep.draftComplete
      ? currentTutorialStep.runComplete
        ? "task"
        : "run"
      : "toolbox"
    : state.failed
      ? "hint"
      : state.success
        ? "task"
        : "run";
  const objectiveHintLine = currentTutorialStep
    ? currentTutorialStep.draftComplete
      ? "这一步已经写好，直接运行看结果。"
      : "先只处理这一步，再点击运行。"
    : activeGoal
      ? `先完成“${cleanMissionCopy(activeGoal.label)}”，再运行观察结果。`
      : "目标已经全部完成，可以继续优化路径。";
  const currentProgressIndex = showStepBanner
    ? getCurrentStepNumber(currentTutorialStep, tutorialStatuses.length, completedTutorialSteps)
    : Math.max(1, statuses.filter((goal) => goal.completed).length + 1);
  const progressTotalCount = showStepBanner ? Math.max(1, tutorialStatuses.length) : Math.max(1, statuses.length);
  const progressPercent = Math.max(8, Math.min(100, Math.round((currentProgressIndex / progressTotalCount) * 100)));
  const runFeedbackTone = running
    ? "running"
    : state.success
      ? "success"
      : state.failed
        ? "fail"
        : "hint";
  const runFeedbackLine = running
    ? "脚本执行中：观察角色行动与时间线，准备下一步调整。"
    : state.success
      ? `执行成功：本轮 ${state.step} 步完成目标，可继续挑战更优步数。`
      : state.failed
        ? cleanMissionCopy(state.failed)
        : cleanMissionCopy(state.message);

  const stepCueLine = composeStepCueLine(level, {
    currentStep: currentTutorialStep,
    completedCount: completedTutorialSteps,
  });

  useEffect(() => {
    if (completedTutorialSteps <= completedStepCountRef.current) {
      completedStepCountRef.current = completedTutorialSteps;
      return;
    }

    const latestCompletedStep = tutorialStatuses[completedTutorialSteps - 1];
    completedStepCountRef.current = completedTutorialSteps;
    if (!latestCompletedStep) return;

    setCompletedStepToast(`已完成：${cleanMissionCopy(latestCompletedStep.title)}`);
    setStoryBeatIndex((value) => Math.min(value + 1, Math.max(0, storyBeats.length - 1)));
    const timer = window.setTimeout(() => setCompletedStepToast(""), 1600);
    return () => window.clearTimeout(timer);
  }, [completedTutorialSteps, tutorialStatuses, storyBeats.length]);

  useEffect(() => {
    setStoryBeatIndex((value) => Math.min(value, Math.max(0, storyBeats.length - 1)));
  }, [storyBeats.length]);

  useEffect(() => {
    if (!currentTutorialStep) {
      if (currentStepIdRef.current) {
        currentStepIdRef.current = null;
      }
      return;
    }
    if (currentStepIdRef.current === currentTutorialStep.id) return;
    currentStepIdRef.current = currentTutorialStep.id;
    setCinematicCue(stepCueLine);
    const timer = window.setTimeout(() => setCinematicCue(""), 2200);
    return () => window.clearTimeout(timer);
  }, [currentTutorialStep?.id, stepCueLine]);

  useEffect(() => {
    if (!currentTutorialStep && !state.failed) return;
    setGuidedUiTarget(coachTarget);
    const timer = window.setTimeout(() => setGuidedUiTarget(null), 1300);
    return () => window.clearTimeout(timer);
  }, [
    coachTarget,
    currentTutorialStep?.id,
    currentTutorialStep?.draftComplete,
    currentTutorialStep?.runComplete,
    state.failed,
  ]);

  useEffect(() => {
    if (!eventNarration) return;
    const timer = window.setTimeout(() => setEventNarration(""), 1900);
    return () => window.clearTimeout(timer);
  }, [eventNarration]);

  useEffect(() => {
    if (!scenePulseEvent || scenePulseEvent === "start") return;
    const timer = window.setTimeout(() => setScenePulseEvent(null), 260);
    return () => window.clearTimeout(timer);
  }, [scenePulseEvent]);

  const playFrameSound = (frame: CodeResearchFrame) => {
    if (frame.event === "move") playSound("move");
    if (frame.event === "collect") playSound("collect");
    if (frame.event === "attack") playSound("attack");
    if (frame.event === "openDoor") playSound("open");
    if (frame.event === "buildBridge") playSound("build");
    if (frame.event === "switch") playSound("switch");
    if (frame.event === "scan") playSound("scan");
    if (frame.event === "fail") playSound("fail");
    if (frame.event === "success") playSound("success");
  };

  const playFrames = async (frames: CodeResearchFrame[]) => {
    const playedFrames: CodeResearchFrame[] = [];
    for (const frame of frames) {
      playedFrames.push(frame);
      setState(frame.state);
      setTimeline([...playedFrames]);
      setScenePulseEvent(frame.event);
      const nextNarration = composeFrameNarration({ frame, activeGoal });
      if (nextNarration) {
        setEventNarration(nextNarration);
      }
      if (frame.event === "collect" || frame.event === "openDoor" || frame.event === "buildBridge" || frame.event === "switch") {
        setStoryBeatIndex((value) => Math.min(value + 1, Math.max(0, storyBeats.length - 1)));
      }
      playFrameSound(frame);
      await new Promise((resolve) => setTimeout(resolve, frameDelay));
    }
  };

  const syncCursor = () => {
    const input = editorRef.current;
    if (!input) return;
    cursorRef.current = {
      start: input.selectionStart ?? 0,
      end: input.selectionEnd ?? input.selectionStart ?? 0,
    };
  };

  const insertCommand = (command: string) => {
    if (running) return;
    playSound("click");
    const normalized = command.includes("...") ? command.replace("...", "\n    hero.move_right()\n") : command;
    setCode((current) => {
      const input = editorRef.current;
      const fallbackPos = current.length;
      const domStart = input?.selectionStart;
      const domEnd = input?.selectionEnd;
      const start = domStart ?? cursorRef.current.start ?? fallbackPos;
      const end = domEnd ?? cursorRef.current.end ?? start;
      const safeStart = Math.max(0, Math.min(start, current.length));
      const safeEnd = Math.max(safeStart, Math.min(end, current.length));

      const before = current.slice(0, safeStart);
      const after = current.slice(safeEnd);
      const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
      const suffix = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
      const insertText = `${prefix}${normalized}${suffix}`;
      const next = `${before}${insertText}${after}`;
      const nextPos = (before + insertText).length;

      requestAnimationFrame(() => {
        const nextInput = editorRef.current;
        if (!nextInput) return;
        nextInput.focus();
        nextInput.setSelectionRange(nextPos, nextPos);
        cursorRef.current = { start: nextPos, end: nextPos };
      });

      return next;
    });
  };

  const handleRun = async () => {
    if (running) return;
    if (level.task.requireCodeChange && code.trim() === starterTemplate.trim()) {
      const blockedState = {
        ...stateForLevel(level),
        failed: "请先调整起始代码中的占位步骤或错误顺序，再运行。",
        message: "请先调整起始代码中的占位步骤或错误顺序，再运行。",
        messageTone: "fail" as const,
        activeCommand: "等待学生修改代码",
      };
      setState(blockedState);
      setLogs([blockedState.message]);
      setTimeline([{ state: blockedState, log: blockedState.message, event: "fail" }]);
      setScenePulseEvent("fail");
      setHintIndex(0);
      playSound("fail");
      return;
    }

    setRunning(true);
    setLastStars(0);
    setShowVictory(false);
    setAttemptCount((value) => value + 1);
    playSound("click");
    const result = simulateCodeResearchLevel(level, code);
    setLogs(result.logs);
    await playFrames(result.frames);
    setRunning(false);
    setLastSteps(result.steps);
    if (result.success) {
      setLastStars(result.stars);
      setShowVictory(true);
      onComplete(result.stars, result.steps);
      return;
    }
    setHintIndex((value) => Math.max(0, value));
  };

  const handleReset = () => {
    if (running) return;
    const initialState = stateForLevel(level);
    playSound("click");
    setCode(starterTemplate);
    setState(initialState);
    setLogs(["已重置为初始代码。"]);
    setLastStars(0);
    setLastSteps(0);
    setShowVictory(false);
    setTimeline([{ state: initialState, log: "已重置为初始状态。", event: "start" }]);
  };

  const handleHint = () => {
    playSound("click");
    setHintIndex((value) => (value + 1) % level.hints.length);
  };

  const openGuideOverlay = (mode: Exclude<GuideOverlayMode, null>) => {
    playSound("click");
    if (mode === "hint" && hintIndex < 0) {
      setHintIndex(0);
    }
    setGuideOverlayMode(mode);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      if (ctrlOrMeta && event.key === "Enter") {
        event.preventDefault();
        void handleRun();
        return;
      }
      if (ctrlOrMeta && event.key.toLowerCase() === "r") {
        event.preventDefault();
        handleReset();
        return;
      }
      if (event.key === "F1") {
        event.preventDefault();
        openGuideOverlay("hint");
        return;
      }
      if (event.key !== "Escape") return;
      if (showCompanion) {
        event.preventDefault();
        setShowCompanion(false);
        return;
      }
      if (showReference) {
        event.preventDefault();
        setShowReference(false);
        return;
      }
      if (guideOverlayMode) {
        event.preventDefault();
        setGuideOverlayMode(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [guideOverlayMode, showCompanion, showReference, handleReset, handleRun, openGuideOverlay]);

  return (
    <section className="cr-level-screen" data-onboard="level-root">
      <div className="cr-guided-level-shell">
        <div className="cr-guided-level-main">
          <div className="cr-guided-stage-shell">
            <div className="cr-guided-stage-top">
              <button className="cr-back-btn" type="button" onClick={onBackToMap}>
                <ArrowLeft /> 返回地图
              </button>
              <div className="cr-guided-stage-title">
                <span>{level.difficulty} · {biomeLabel[level.biome]} · 推荐 {level.parSteps} 步内</span>
                <h1>{cleanMissionCopy(level.title)}</h1>
                <p>{cleanMissionCopy(level.subtitle)}</p>
              </div>
              <div className="cr-guided-top-actions">
                <button
                  className={`cr-ai-companion-btn ${guidedUiTarget === "ai" ? "is-guided-focus" : ""}`}
                  type="button"
                  data-testid="code-research-ai-toggle"
                  data-onboard="level-ai-companion"
                  onClick={() => setShowCompanion(true)}
                >
                  <Bot /> AI 小伴
                </button>
                <button
                  type="button"
                  className="cr-guide-entry-btn"
                  data-testid="code-research-level-onboarding"
                  onClick={onOpenOnboarding}
                >
                  <Compass /> 新手指导
                </button>
                <button
                  className={[
                    "cr-hint-toggle",
                    guidedUiTarget === "task" ? "is-guided-focus" : "",
                    guideOverlayMode === "task" ? "is-active-toggle" : "",
                  ].filter(Boolean).join(" ")}
                  type="button"
                  data-testid="code-research-task-toggle"
                  aria-haspopup="dialog"
                  aria-expanded={guideOverlayMode === "task"}
                  aria-controls="code-research-drawer-task"
                  onClick={() => openGuideOverlay("task")}
                >
                  <ScrollText /> 任务
                </button>
                <button
                  className={[
                    "cr-hint-toggle",
                    guidedUiTarget === "hint" ? "is-guided-focus" : "",
                    guideOverlayMode === "hint" ? "is-active-toggle" : "",
                  ].filter(Boolean).join(" ")}
                  type="button"
                  data-testid="code-research-hint-toggle"
                  aria-haspopup="dialog"
                  aria-expanded={guideOverlayMode === "hint"}
                  aria-controls="code-research-drawer-hint"
                  onClick={() => openGuideOverlay("hint")}
                >
                  <Lightbulb /> 提示
                </button>
                <button
                  className={[
                    "cr-hint-toggle",
                    guidedUiTarget === "knowledge" ? "is-guided-focus" : "",
                    guideOverlayMode === "knowledge" ? "is-active-toggle" : "",
                  ].filter(Boolean).join(" ")}
                  type="button"
                  data-testid="code-research-knowledge-toggle"
                  aria-haspopup="dialog"
                  aria-expanded={guideOverlayMode === "knowledge"}
                  aria-controls="code-research-drawer-knowledge"
                  onClick={() => openGuideOverlay("knowledge")}
                >
                  <BookOpen /> 知识点
                </button>
                <button
                  className={[
                    "cr-hint-toggle",
                    guideOverlayMode === "story" ? "is-active-toggle" : "",
                  ].filter(Boolean).join(" ")}
                  type="button"
                  data-testid="code-research-story-toggle"
                  aria-haspopup="dialog"
                  aria-expanded={guideOverlayMode === "story"}
                  aria-controls="code-research-drawer-story"
                  onClick={() => openGuideOverlay("story")}
                >
                  <Sparkles /> 剧情
                </button>
              </div>
            </div>

            <div className="cr-guided-objective-banner" data-onboard="level-objective-banner">
              <span>
                {showStepBanner
                  ? `当前步骤 ${currentProgressIndex}/${tutorialStatuses.length}`
                  : `当前目标 ${statuses.filter((goal) => goal.completed).length}/${statuses.length}`}
              </span>
              <strong>{cleanMissionCopy(currentTutorialStep?.title ?? activeGoal?.label ?? "继续前进")}</strong>
              <div className="cr-guided-progress-meter" aria-hidden="true">
                <div className="cr-guided-progress-track">
                  <b style={{ width: `${progressPercent}%` }} />
                </div>
                <small>{progressPercent}%</small>
              </div>
              <p>{showObjectiveDetail ? objectiveHintLine : "先做当前步骤，避免一次写满整关代码。"}</p>
              <button
                type="button"
                className="cr-guided-objective-toggle"
                onClick={() => setShowObjectiveDetail((value) => !value)}
              >
                {showObjectiveDetail ? "收起说明" : "展开说明"}
              </button>
            </div>
            {completedStepToast ? (
              <div className="cr-step-toast">
                <Check />
                <span>{completedStepToast}</span>
              </div>
            ) : null}
            {cinematicCue ? (
              <div className="cr-cinematic-callout" data-testid="code-research-cinematic-cue">
                <Sparkles />
                <span>{cinematicCue}</span>
              </div>
            ) : null}

            {eventNarration ? (
              <div className="cr-event-toast">
                <Sparkles />
                <span>{eventNarration}</span>
              </div>
            ) : null}

            <div className="cr-guided-board-shell">
              <LevelBoard
                level={level}
                state={state}
                focusPoint={focusPoint}
                pulseEvent={scenePulseEvent}
                running={running}
              />
            </div>

            <div className={`cr-message cr-message-${state.messageTone}`}>
              <strong>{state.success ? "挑战完成" : state.failed ? "需要调整" : "运行反馈"}</strong>
              <span>{cleanMissionCopy(state.message)}</span>
            </div>
            {showRunFeedback ? (
              <div
                className={`cr-run-feedback-guided cr-run-feedback-inline is-${runFeedbackTone}`}
                data-testid="code-research-inline-feedback"
              >
                <div className="cr-run-feedback-inline-head">
                  <strong>{running ? "执行中" : state.success ? "本轮通过" : state.failed ? "需修正" : "准备运行"}</strong>
                  <span>第 {Math.max(1, attemptCount)} 次尝试</span>
                </div>
                <p>{runFeedbackLine}</p>
                <div className="cr-run-feedback-inline-actions">
                  <button
                    type="button"
                    className="cr-guided-objective-toggle"
                    onClick={() => openGuideOverlay("timeline")}
                  >
                    查看回放
                  </button>
                  {!running && !state.success ? (
                    <button
                      type="button"
                      className="cr-guided-objective-toggle"
                      onClick={() => openGuideOverlay("hint")}
                    >
                      下一步提示
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

              <div className="cr-stage-footer">
                <span>当前位置：{state.hero.x + 1}, {state.hero.y + 1}</span>
                <span>已执行：{state.step} 步</span>
                <span>当前命令：{cleanMissionCopy(state.activeCommand ?? "等待运行")}</span>
              </div>
          </div>

          <div className="cr-guided-editor-shell">
            <div className="cr-guided-editor-card">
              <div className="cr-guided-editor-head">
                <div>
                  <span>指令台</span>
                  <strong>{currentTutorialStep ? "先补当前一步，再运行" : "先改代码，再运行"}</strong>
                </div>
                <button className="cr-tool-btn" type="button" onClick={() => openGuideOverlay("timeline")}>
                  <Clock3 /> 回放记录
                </button>
              </div>

              <Toolbox
                commands={toolboxCommands}
                onInsertCommand={insertCommand}
                suggestedCommands={suggestedCommands}
                guided
                currentStep={currentTutorialStep}
                className={guidedUiTarget === "toolbox" ? "is-guided-focus" : ""}
              />

              <textarea
                ref={editorRef}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  cursorRef.current = {
                    start: event.target.selectionStart ?? event.target.value.length,
                    end: event.target.selectionEnd ?? event.target.selectionStart ?? event.target.value.length,
                  };
                }}
                onSelect={syncCursor}
                onClick={syncCursor}
                onKeyUp={syncCursor}
                onFocus={syncCursor}
                onBlur={syncCursor}
                spellCheck={false}
                className={`cr-code-editor ${guidedUiTarget === "editor" ? "is-guided-focus" : ""}`}
                aria-label="code editor"
                data-testid="code-research-editor"
                data-onboard="level-editor"
              />

              <div className="cr-run-guard">
                <strong>运行前检查</strong>
                <span>
                  {currentTutorialStep
                    ? currentTutorialStep.draftComplete
                      ? "这一小步已补完，运行看看反馈。"
                      : "只补这一小步，不要一次把整关写满。"
                    : "先检查起始代码和命令顺序，再运行。"}
                </span>
              </div>

              <div className="cr-control-row">
                <button
                  className={`cr-run-btn ${guidedUiTarget === "run" ? "is-guided-focus" : ""}`}
                  type="button"
                  onClick={handleRun}
                  disabled={running}
                  data-testid="code-research-run"
                  data-onboard="level-run"
                >
                  <Play /> {running ? "运行中..." : "运行代码"}
                </button>
                <button className="cr-tool-btn" type="button" onClick={handleReset} disabled={running}>
                  <RotateCcw /> 重置
                </button>
                <button
                  className="cr-tool-btn"
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setShowReference(true);
                  }}
                  disabled={running}
                >
                  <ScrollText /> 参考思路
                </button>
              </div>

              <div className="cr-shortcuts-tip">快捷键：Ctrl+Enter 运行 · Ctrl+R 重置 · Esc 关闭弹层</div>

              <div className="cr-attempt-note">
                已尝试 {attemptCount} 次，卡住时再看提示或问 AI 小伴。
              </div>
            </div>
          </div>
        </div>
      </div>

      <DrawerPanel
        open={guideOverlayMode === "task"}
        panelId="code-research-drawer-task"
        title="当前任务"
        subtitle="先明确这关要完成什么，再回到代码区逐步验证。"
        sections={[
          {
            title: "当前目标",
            lines: [
              activeGoal?.label ?? "所有目标已完成，可以继续优化步数或进入下一关。",
              `任务模式：${taskModeLabel[level.task.mode]}`,
              `推荐步数：${level.parSteps} 步内`,
            ],
          },
          {
            title: "检查清单",
            lines: currentTutorialStep
              ? [currentTutorialStep.success, currentTutorialStep.coach]
              : level.task.checklist,
          },
        ]}
        chips={level.concepts}
        onClose={() => setGuideOverlayMode(null)}
      />

      <DrawerPanel
        open={guideOverlayMode === "hint"}
        panelId="code-research-drawer-hint"
        title="提示"
        subtitle="只给你下一段可执行提示，不直接替你完成代码。"
        sections={[
          {
            title: hintIndex >= 0 ? `提示 ${hintIndex + 1}` : "首个提示",
            lines: [currentHint || level.hints[0] || "先观察当前目标，再运行一次看反馈。"] ,
          },
          {
            title: "导师提醒",
            lines: [level.mentor.intro, state.message],
          },
        ]}
        actions={[
          {
            label: "下一个提示",
            onClick: handleHint,
            tone: "secondary",
          },
        ]}
        onClose={() => setGuideOverlayMode(null)}
      />

      <DrawerPanel
        open={guideOverlayMode === "knowledge"}
        panelId="code-research-drawer-knowledge"
        title="知识点"
        subtitle="把这一关真正要学的概念拆开看，不把说明堆在主界面上。"
        sections={[
          {
            title: "本关核心",
            lines: currentKnowledgeLines,
          },
          {
            title: "可用命令",
            lines: suggestedCommands.length > 0 ? suggestedCommands : toolboxCommands.slice(0, 5),
          },
        ]}
        chips={level.concepts}
        onClose={() => setGuideOverlayMode(null)}
      />

      <DrawerPanel
        open={guideOverlayMode === "story"}
        panelId="code-research-drawer-story"
        title="剧情线"
        subtitle="按段阅读剧情，再回到战场执行代码。"
        sections={[
          {
            title: `当前片段 ${safeStoryBeatIndex + 1}/${Math.max(1, storyBeats.length)}`,
            lines: [currentStoryBeat],
          },
          {
            title: "剧情目录",
            lines: storyBeats.map((beat, index) =>
              `${index === safeStoryBeatIndex ? "▶" : "·"} 第 ${index + 1} 段：${beat}`,
            ),
          },
        ]}
        actions={[
          {
            label: "上一段",
            onClick: () => setStoryBeatIndex((value) => Math.max(0, value - 1)),
          },
          {
            label: "下一段",
            onClick: () => setStoryBeatIndex((value) => Math.min(Math.max(0, storyBeats.length - 1), value + 1)),
            tone: "primary",
          },
        ]}
        onClose={() => setGuideOverlayMode(null)}
      />

      <DrawerPanel
        open={guideOverlayMode === "timeline"}
        panelId="code-research-drawer-timeline"
        title="运行记录"
        subtitle="运行后再打开这里看过程，定位哪一步出了问题。"
        sections={[]}
        onClose={() => setGuideOverlayMode(null)}
      >
        <div className="cr-overlay-stack">
          <TutorialProgressCard
            currentStep={currentTutorialStep}
            completedCount={completedTutorialSteps}
            totalCount={tutorialStatuses.length}
          />
          <CompactGoalList statuses={statuses} activeGoal={activeGoal} />
          <BoardLegend level={level} state={state} />
          {showRunFeedback ? (
            <div className="cr-run-feedback cr-run-feedback-overlay">
              <RunTimeline frames={timeline} running={running} />
              <pre className="cr-console">{logs.slice(-10).join("\n")}</pre>
            </div>
          ) : (
            <div className="cr-drawer-footer">先运行一次代码，这里才会出现详细的执行记录。</div>
          )}
        </div>
      </DrawerPanel>

      {showCompanion && (
        <LearningCompanionModal
          isOpen={showCompanion}
          onClose={() => setShowCompanion(false)}
          context={assistantContext}
          variant="floating"
        />
      )}

      <DrawerPanel
        open={showReference}
        title="参考思路"
        subtitle="先看步骤，不直接替你把代码写进编辑器。"
        sections={[
          {
            title: "关卡路线",
            lines: level.briefing,
          },
          {
            title: "参考解法",
            lines: attemptCount >= 2 ? ["已解锁只读参考解法：", ...referenceSolution.split("\n")] : ["完成两次真实尝试后可查看只读参考解法。"],
          },
        ]}
        footer={attemptCount >= 2 ? "参考解法仅供对照，仍需你自己修改并运行编辑器中的代码。" : "先自己运行并根据反馈调试，再回来查看。"}
        onClose={() => setShowReference(false)}
      />

      {showVictory && (
        <VictoryModal
          level={level}
          stars={lastStars}
          steps={lastSteps}
          onNext={onSelectNext}
          onBackToMap={onBackToMap}
        />
      )}
    </section>
  );
}

export default function CodeResearchPage() {
  const router = useRouter();
  const { isAuthenticated, user, token, validateToken, logout } = useAuthStore();
  const {
    level: userLevel,
    xp,
    addXp,
    completedCampaignLevels,
    campaignProgress,
    loadFromCloud,
  } = useGameStore();
  const { balance, addCoins, loadBalance } = useCoinStore();
  const { completeLevel, setUserProgress } = useCodeResearchStore();
  const { isMuted, toggleMute } = useSoundStore();
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("chapters");
  const [activeChapterId, setActiveChapterId] = useState(codeResearchChapters[0].id);
  const [selectedLevelId, setSelectedLevelId] = useState(codeResearchLevels[0].id);
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [onboardingTargetRect, setOnboardingTargetRect] = useState<OnboardingTargetRect | null>(null);
  const autoSelectSnapshotRef = useRef("");
  const rewardInFlightRef = useRef(new Set<string>());
  const onboardingStorageKey = `code_research_onboarding_v5_${user?.id ?? "guest"}`;
  const onboardingSteps = useMemo<OnboardingStep[]>(
    () => {
      const steps: OnboardingStep[] = [
      {
        id: "chapters-select",
        screen: "chapters",
        selector: '[data-onboard="chapter-card-first"]',
        title: "先选章节",
        description: "从章节卡开始。点击一个已解锁章节后，会进入该章节的关卡地图。",
        arrow: "top",
        autoAdvanceOnTargetClick: true,
      },
      {
        id: "chapters-menu",
        screen: "map",
        selector: '[data-onboard="side-dock-map"]',
        title: "左侧快捷菜单",
        description: "左侧图标是快捷入口，能快速打开地图、英雄档案、工具与奖励信息。",
        arrow: "right",
        autoAdvanceOnTargetClick: true,
      },
      {
        id: "chapters-progress",
        screen: "map",
        selector: '[data-onboard="top-nav-progress"]',
        title: "进度总览入口",
        description: "上方导航的“进度”可查看总通关数与星级，建议每完成几关就复盘一次。",
        arrow: "bottom",
        autoAdvanceOnTargetClick: true,
      },
      {
        id: "map-route",
        screen: "map",
        selector: '[data-onboard="map-route-board"]',
        title: "章节关卡地图",
        description: "这是当前章节的路线图。节点会按顺序解锁，先完成前面的节点再推进后续挑战。",
        arrow: "top",
      },
      {
        id: "map-node",
        screen: "map",
        selector: '[data-onboard="map-node-first"]',
        title: "点击节点选关",
        description: "点亮节点后会显示关卡信息，再开始挑战。卡住时先看目标再写代码。",
        arrow: "top",
      },
      {
        id: "level-objective",
        screen: "level",
        selector: '[data-onboard="level-objective-banner"]',
        title: "先看当前步骤",
        description: "进入关卡先读这里：只做当前一步，不要一次把整关写满，成功率会更高。",
        arrow: "bottom",
      },
      {
        id: "level-toolbox",
        screen: "level",
        selector: '[data-onboard="level-toolbox"]',
        title: "命令书插入",
        description: "命令书支持一键插入。先用推荐命令跑通，再自己重构成更优雅的 Python 写法。",
        arrow: "left",
      },
      {
        id: "level-editor",
        screen: "level",
        selector: '[data-onboard="level-editor"]',
        title: "代码编辑区",
        description: "在编辑区逐步修改代码，保持“改一小步 -> 运行一次 -> 看反馈”的节奏。",
        arrow: "left",
      },
      {
        id: "level-run",
        screen: "level",
        selector: '[data-onboard="level-run"]',
        title: "运行与调试",
        description: "点击运行代码观察时间线反馈；失败先看提示和日志，再调整代码顺序。",
        arrow: "left",
        autoAdvanceOnTargetClick: true,
      },
      {
        id: "level-ai",
        screen: "level",
        selector: '[data-onboard="level-ai-companion"]',
        title: "AI 小伴求助",
        description: "遇到问题可随时问 AI 小伴。它会结合当前关卡上下文，给你分步提示而不是直接代写。",
        arrow: "left",
        autoAdvanceOnTargetClick: true,
      },
      ];
      return steps.filter((candidate) => !["chapters-menu", "chapters-progress"].includes(candidate.id));
    },
    [],
  );
  const currentOnboardingStep = onboardingOpen
    ? onboardingSteps[Math.max(0, Math.min(onboardingStepIndex, onboardingSteps.length - 1))]
    : null;
  const playSound = useCodeResearchAudio(!isMuted);
  const togglePanel = (panel: PanelId) => {
    playSound("click");
    setActivePanel((current) => (current === panel ? null : panel));
  };
  const closeOnboarding = (status: "done" | "dismissed") => {
    setOnboardingOpen(false);
    setOnboardingTargetRect(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(onboardingStorageKey, status);
    }
  };
  const restartOnboarding = (startScreen?: Screen) => {
    const targetScreen = startScreen ?? "chapters";
    const targetStepIndex = onboardingSteps.findIndex((step) => step.screen === targetScreen);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(onboardingStorageKey);
    }
    setActivePanel(null);
    setScreen(targetScreen);
    setOnboardingStepIndex(targetStepIndex >= 0 ? targetStepIndex : 0);
    setOnboardingTargetRect(null);
    setOnboardingOpen(true);
  };
  const handleOnboardingPrev = () => {
    setOnboardingStepIndex((value) => Math.max(0, value - 1));
  };
  const advanceOnboarding = () => {
    if (onboardingStepIndex >= onboardingSteps.length - 1) {
      closeOnboarding("done");
      return;
    }
    setOnboardingStepIndex((value) => Math.min(onboardingSteps.length - 1, value + 1));
  };
  const handleOnboardingNext = () => {
    advanceOnboarding();
  };

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (window.navigator?.webdriver) return;
    const onboardingStatus = window.localStorage.getItem(onboardingStorageKey);
    if (onboardingStatus === "done" || onboardingStatus === "dismissed") return;

    setActivePanel(null);
    setOnboardingStepIndex(0);
    setOnboardingTargetRect(null);
    setOnboardingOpen(true);
  }, [mounted, isAuthenticated, onboardingStorageKey]);

  useEffect(() => {
    if (!onboardingOpen || !currentOnboardingStep) return;
    setActivePanel(null);
    if (screen !== currentOnboardingStep.screen) {
      setOnboardingTargetRect(null);
      setScreen(currentOnboardingStep.screen);
    }
  }, [currentOnboardingStep, onboardingOpen, screen]);

  useEffect(() => {
    if (!onboardingOpen || !currentOnboardingStep?.autoAdvanceOnTargetClick) return;
    if (screen !== currentOnboardingStep.screen) return;
    if (typeof window === "undefined") return;

    const targetNode = document.querySelector(currentOnboardingStep.selector) as HTMLElement | null;
    if (!targetNode) return;

    let advanced = false;
    const handleTargetClick = () => {
      if (advanced) return;
      advanced = true;
      window.setTimeout(() => {
        advanceOnboarding();
      }, 140);
    };

    targetNode.addEventListener("click", handleTargetClick, { once: true });

    return () => {
      targetNode.removeEventListener("click", handleTargetClick);
    };
  }, [onboardingOpen, currentOnboardingStep, screen, onboardingStepIndex, onboardingSteps.length, advanceOnboarding]);

  useEffect(() => {
    if (!onboardingOpen || !currentOnboardingStep) return;
    if (screen !== currentOnboardingStep.screen) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    let attempts = 0;
    const resolveTarget = () => {
      if (cancelled) return;
      const node = document.querySelector(currentOnboardingStep.selector) as HTMLElement | null;
      if (node) {
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setOnboardingTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
          return;
        }
      }
      if (attempts >= 24) {
        setOnboardingTargetRect(null);
        return;
      }
      attempts += 1;
      window.setTimeout(resolveTarget, 70);
    };

    resolveTarget();
    const handleReflow = () => resolveTarget();
    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
    };
  }, [
    onboardingOpen,
    currentOnboardingStep,
    screen,
    selectedLevelId,
    activeChapterId,
    activePanel,
  ]);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) return;

    void (async () => {
      await validateToken();
      await loadFromCloud();
    })();
  }, [isAuthenticated, validateToken, loadFromCloud]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    musicManager.initialize();

    const handleFirstInteraction = async () => {
      try {
        if (!useSoundStore.getState().isMuted) {
          musicManager.lockBGM("battle");
        }
      } catch (error) {
        console.error("[CodeResearchPage] Failed to start background music:", error);
      }
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("keydown", handleFirstInteraction);
    document.addEventListener("touchstart", handleFirstInteraction);

    if (!isMuted) {
      musicManager.lockBGM("battle");
    }

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
      musicManager.unlockBGM("battle");
      musicManager.switchBGM("main");
    };
  }, [isMuted]);

  const progress = useCodeResearchStore((state) => state.getUserProgress(user?.id));
  const summary = getCodeResearchCompletionSummary(progress);
  const selectedChapter = codeResearchChapters.find((chapter) => chapter.id === activeChapterId) ?? codeResearchChapters[0];
  const chapterLevels = useMemo(() => getChapterLevels(selectedChapter), [selectedChapter]);
  const selectedLevel = getCodeResearchLevel(selectedLevelId) ?? chapterLevels[0] ?? codeResearchLevels[0];
  const unlockedLevels = codeResearchLevels.filter((level, index) => index === 0 || progress[codeResearchLevels[index - 1].id]?.completed)
    .length;
  const progressSnapshot = useMemo(
    () => codeResearchLevels.map((level) => `${level.id}:${progress[level.id]?.completed ? 1 : 0}`).join("|"),
    [progress],
  );

  useEffect(() => {
    if (!user?.id) return;

    const importedProgress: Record<string, CodeResearchProgressRecord> = {};
    for (const level of codeResearchLevels) {
      const marker = codeResearchLevelMarker(level.id);
      if (!completedCampaignLevels.includes(marker)) continue;

      const rawStars = campaignProgress[codeResearchStarsKey(level.id)];
      const rawSteps = campaignProgress[codeResearchBestStepsKey(level.id)];
      const stars = Number.isFinite(rawStars) ? Math.max(1, Math.min(3, Math.floor(rawStars))) : 1;
      const bestSteps = Number.isFinite(rawSteps) ? Math.max(1, Math.floor(rawSteps)) : level.parSteps;
      importedProgress[level.id] = {
        completed: true,
        stars,
        bestSteps,
        completedAt: new Date(0).toISOString(),
      };
    }

    if (Object.keys(importedProgress).length) {
      setUserProgress(user.id, importedProgress, "mergeBest");
    }
  }, [user?.id, completedCampaignLevels, campaignProgress, setUserProgress]);

  useEffect(() => {
    autoSelectSnapshotRef.current = "";
  }, [user?.id]);

  useEffect(() => {
    if (!mounted || screen === "level") return;
    if (autoSelectSnapshotRef.current === progressSnapshot) return;
    autoSelectSnapshotRef.current = progressSnapshot;

    const next = getFirstIncompleteCodeResearchLevel(
      Object.keys(progress).filter((id) => progress[id]?.completed),
    );
    const nextChapterId = chapterIdByLevelId[next.id] ?? codeResearchChapters[0].id;
    setActiveChapterId((current) => (current === nextChapterId ? current : nextChapterId));
    setSelectedLevelId((current) => (current === next.id ? current : next.id));
  }, [mounted, progress, progressSnapshot, screen]);

  useEffect(() => {
    if (!chapterLevels.length) return;
    if (chapterLevels.some((level) => level.id === selectedLevelId)) return;

    const nextChapterLevel = getChapterNextLevel(selectedChapter, progress) ?? chapterLevels[0];
    if (!nextChapterLevel) return;
    setSelectedLevelId(nextChapterLevel.id);
  }, [selectedChapter, chapterLevels, selectedLevelId, progress]);

  const markRewardClaimed = (levelId: string, claimedAt: number) => {
    const rewardKey = codeResearchRewardClaimedKey(levelId);
    useGameStore.setState((state) => ({
      campaignProgress: {
        ...state.campaignProgress,
        [rewardKey]: claimedAt,
      },
    }));
    void useGameStore.getState().saveToCloud();
  };

  const grantFirstClearRewards = async (level: CodeResearchLevel) => {
    if (rewardInFlightRef.current.has(level.id)) {
      return;
    }
    rewardInFlightRef.current.add(level.id);
    const rewardNote = `Code Research: ${level.title}`;
    const rewardTransactionId = `code_research_first_clear_${user?.id ?? "unknown"}_${level.id}`;

    try {
      addXp(level.xpReward);

      if (token) {
        try {
          const reward = await addCoinsToServer(level.coinReward, "code_research", rewardNote, token, rewardTransactionId);
          useCoinStore.setState((state) => ({
            ...state,
            balance: Number.isFinite(reward.balance) ? reward.balance : state.balance,
            error: null,
          }));
          if (Number.isFinite(reward.balance)) {
            useGameStore.getState().setCoins(reward.balance);
          }
          loadBalance(token).catch(() => {});
        } catch (error) {
          console.error("[CodeResearchPage] Failed to grant coin reward via server:", error);
          addCoins(level.coinReward, "earn", "code_research_fallback", `${rewardNote} (offline fallback)`);
          const gameState = useGameStore.getState();
          gameState.setCoins(gameState.coins + level.coinReward);
        }
      } else {
        addCoins(level.coinReward, "earn", "code_research_offline", `${rewardNote} (local fallback)`);
        const gameState = useGameStore.getState();
        gameState.setCoins(gameState.coins + level.coinReward);
      }

      markRewardClaimed(level.id, Date.now());
    } finally {
      rewardInFlightRef.current.delete(level.id);
    }
  };

  const chapterFocusLines = selectedChapter.pythonFocus ?? [];
  const chapterGoalLines = selectedChapter.learningGoals ?? [];
  const chapterPathLines = selectedChapter.learningPath ?? [];

  const panelContent: Record<PanelId, { title: string; subtitle: string; sections: DrawerSection[]; chips?: string[]; footer?: string; actions?: DrawerAction[] }> = {
    map: {
      title: "挑战地图",
      subtitle: "先选节点，再进入挑战。",
      sections: [
        {
          title: "当前节点",
          lines: [
            `当前选中关卡：${selectedLevel.title}`,
            `当前地貌：${biomeLabel[selectedLevel.biome]}`,
            `推荐步数：${selectedLevel.parSteps} 步内`,
          ],
        },
        {
          title: "推进节奏",
          lines: [
            `章节进度：${summary.completedCount}/${summary.totalCount}`,
            `已解锁节点：${unlockedLevels}/${codeResearchLevels.length}`,
            "完成当前节点后自动解锁下一节点。",
          ],
        },
      ],
      chips: selectedLevel.concepts,
      footer: selectedLevel.subtitle,
      actions: [
        { label: "收起面板", onClick: () => setActivePanel(null), tone: "secondary" },
        { label: "开始该挑战", onClick: () => { setActivePanel(null); setScreen("level"); }, tone: "primary" },
      ],
    },
    hero: {
      title: "英雄档案",
      subtitle: "沿用当前登录学员，不创建第二套账号。",
      sections: [
        {
          title: "账号状态",
          lines: [
            `学生：${user?.username ?? "未命名学生"}`,
            `等级：Lv.${userLevel}`,
            `经验：${xp}`,
          ],
        },
        {
          title: "本关定位",
          lines: [
            `核心知识点：${selectedLevel.concepts.join("、")}`,
            `导师：${selectedLevel.mentor.name}`,
            `推荐下一步：${selectedLevel.title}`,
          ],
        },
      ],
      chips: ["顺序", "循环", "战斗", "机关", "调试"],
      footer: "等级、经验与章节进度和主站共用同一份数据。",
      actions: [
        { label: "查看学习进度", onClick: () => setActivePanel("progress"), tone: "secondary" },
        { label: "进入当前挑战", onClick: () => { setActivePanel(null); setScreen("level"); }, tone: "primary" },
      ],
    },
    gear: {
      title: "装备背包",
      subtitle: "把常用命令和任务工具集中在这里。",
      sections: [
        {
          title: "常用工具",
          lines: [
            "命令书：一键插入可用指令模板。",
            "任务卷轴：查看本关目标与限制。",
            "运行时间线：快速定位失败步骤。",
            "导师提示：按步骤提供下一步建议。",
          ],
        },
      ],
      chips: selectedLevel.toolbox.map((command) => toPythonTeachingCommand(command)),
      footer: "命令卡会插入到编辑器光标所在位置。",
      actions: [
        { label: "查看玩法说明", onClick: () => setActivePanel("curriculum"), tone: "secondary" },
        { label: "前往代码控制台", onClick: () => { setActivePanel(null); setScreen("level"); }, tone: "primary" },
      ],
    },
    rewards: {
      title: "成就奖励",
      subtitle: "经验走主进度，金币走后端接口并自动对账。",
      sections: [
        {
          title: "当前奖励",
          lines: [
            `当前金币：${balance}`,
            `本关奖励：+${selectedLevel.xpReward} XP · +${selectedLevel.coinReward} 金币`,
            `累计星级：${summary.stars}/${summary.maxStars}`,
          ],
        },
        {
          title: "同步规则",
          lines: [
            "首次通关发放奖励，重复通关只刷新最佳成绩。",
            token ? "金币奖励已连接 /coins/add 接口。" : "当前离线模式：金币先本地记账，登录后会再同步。",
            `已完成关卡：${summary.completedCount}/${summary.totalCount}`,
          ],
        },
      ],
      chips: ["首次通关", "星级结算", "云端同步"],
      footer: "如遇网络波动，系统会回退到本地记账并在后续同步。",
      actions: [
        { label: "查看学习进度", onClick: () => setActivePanel("progress"), tone: "secondary" },
      ],
    },
    curriculum: {
      title: "玩法说明",
      subtitle: "先看任务目标，再改代码，再运行验证。",
      sections: [
        {
          title: "挑战节奏",
          lines: [
            "先读目标，再改代码，最后运行。",
            "代码会进入安全命令解析器，不会执行未知语句。",
          ],
        },
        {
          title: "能力成长",
          lines: [
            "前期重点：顺序、交互、循环、机关。",
            "后续逐步加入变量、条件、函数与多目标调试。",
          ],
        },
        {
          title: "当前章节重点",
          lines: [
            `章节：${selectedChapter.title} (${selectedChapter.levelRangeLabel ?? "Lv -"})`,
            `Python Focus：${chapterFocusLines.length ? chapterFocusLines.join(" · ") : "基础指令与流程"}`,
            ...(chapterPathLines.length ? chapterPathLines.slice(0, 2) : []),
            ...(chapterGoalLines.length ? chapterGoalLines.slice(0, 2) : ["先完成当前章节全部关卡，再进入下一章。"]),
          ],
        },
      ],
      chips: Array.from(new Set([...(selectedChapter.pythonFocus ?? []), ...selectedLevel.task.checklist])).slice(0, 10),
      footer: `${selectedChapter.title} 路 ${selectedChapter.difficultyBand ?? "标准"} 路 ${selectedLevel.task.summary}`,
      actions: [
        { label: "查看当前挑战", onClick: () => setActivePanel("map"), tone: "secondary" },
      ],
    },
    student: {
      title: "学员档案",
      subtitle: "直接复用主站登录状态。",
      sections: [
        {
          title: "账号信息",
          lines: [
            `用户名：${user?.username ?? "-"}`,
            `用户 ID：${user?.id ?? "-"}`,
            `已完成挑战：${summary.completedCount} 关`,
          ],
        },
        {
          title: "同步说明",
          lines: [
            "退出登录后返回主首页，不保留独立会话。",
            "本模块不会创建第二套账号。",
          ],
        },
      ],
      chips: ["统一登录", "统一奖励", "统一进度"],
      footer: "Code Research 与主站使用同一套学员身份。",
      actions: [
        { label: "打开英雄档案", onClick: () => setActivePanel("hero"), tone: "secondary" },
      ],
    },
    progress: {
      title: "学习进度",
      subtitle: "进度决定章节解锁与挑战节奏。",
      sections: [
        {
          title: "总体进度",
          lines: [
            `已完成：${summary.completedCount}/${summary.totalCount}`,
            `已解锁：${unlockedLevels}/${codeResearchLevels.length}`,
            `累计星级：${summary.stars}/${summary.maxStars}`,
          ],
        },
        {
          title: "当前目标",
          lines: [
            `当前关卡：${selectedLevel.title}`,
            `当前任务模式：${taskModeLabel[selectedLevel.task.mode]}`,
          ],
        },
      ],
      chips: selectedLevel.goals.map((goal) => goal.label),
      footer: "先完成全部目标，再冲击更短步数与更高星级。",
      actions: [
        { label: "返回世界地图", onClick: () => { setActivePanel(null); setScreen("chapters"); }, tone: "secondary" },
        { label: "继续当前挑战", onClick: () => { setActivePanel(null); setScreen("level"); }, tone: "primary" },
      ],
    },
  };

  const handleComplete = (stars: number, steps: number) => {
    if (!user?.id) return;
    const levelMarker = codeResearchLevelMarker(selectedLevel.id);
    const starsKey = codeResearchStarsKey(selectedLevel.id);
    const bestStepsKey = codeResearchBestStepsKey(selectedLevel.id);
    const rewardClaimedKey = codeResearchRewardClaimedKey(selectedLevel.id);
    const rawRewardClaimedAt = campaignProgress[rewardClaimedKey];
    const rewardClaimedAt = Number(rawRewardClaimedAt);
    const rewardAlreadyClaimed = Number.isFinite(rewardClaimedAt) && rewardClaimedAt > 0;
    const alreadyCompleted = progress[selectedLevel.id]?.completed || completedCampaignLevels.includes(levelMarker);
    const rawCloudStars = campaignProgress[starsKey];
    const rawCloudBestSteps = campaignProgress[bestStepsKey];
    const shouldGrantFirstClearReward = !alreadyCompleted && !rewardAlreadyClaimed;
    const mergedRecord = mergeCodeResearchProgressRecord(
      mergeCodeResearchProgressRecord(
        progress[selectedLevel.id],
        completedCampaignLevels.includes(levelMarker) || Number.isFinite(rawCloudStars) || Number.isFinite(rawCloudBestSteps)
          ? {
              completed: completedCampaignLevels.includes(levelMarker),
              stars: Number.isFinite(rawCloudStars) ? rawCloudStars : undefined,
              bestSteps: Number.isFinite(rawCloudBestSteps) ? rawCloudBestSteps : undefined,
              completedAt: progress[selectedLevel.id]?.completedAt,
            }
          : undefined,
      ),
      {
        completed: true,
        stars,
        bestSteps: steps,
        completedAt: new Date().toISOString(),
      },
    );
    if (!mergedRecord) return;

    completeLevel(user.id, selectedLevel.id, stars, steps);
    useGameStore.setState((state) => ({
      completedCampaignLevels: state.completedCampaignLevels.includes(levelMarker)
        ? state.completedCampaignLevels
        : [...state.completedCampaignLevels, levelMarker],
      campaignProgress: {
        ...state.campaignProgress,
        [starsKey]: mergedRecord.stars,
        [bestStepsKey]: mergedRecord.bestSteps,
      },
    }));
    void useGameStore.getState().saveToCloud();
    if (shouldGrantFirstClearReward) {
      void grantFirstClearRewards(selectedLevel);
    }
  };

  const handleSelectNext = () => {
    const index = chapterLevels.findIndex((level) => level.id === selectedLevel.id);
    const nextLevel = chapterLevels[index + 1] ?? null;
    if (nextLevel) {
      setSelectedLevelId(nextLevel.id);
      setScreen("level");
      playSound("click");
      return;
    }

    const currentChapterIndex = codeResearchChapters.findIndex((chapter) => chapter.id === selectedChapter.id);
    const nextChapter = codeResearchChapters[currentChapterIndex + 1] ?? null;
    if (nextChapter) {
      const nextChapterLevel = getChapterNextLevel(nextChapter, progress) ?? getChapterLevels(nextChapter)[0];
      setActiveChapterId(nextChapter.id);
      if (nextChapterLevel) {
        setSelectedLevelId(nextChapterLevel.id);
      }
    }
    setScreen("map");
    playSound("click");
  };

  if (!mounted) {
    return <div className="cr-loading">加载编程挑战...</div>;
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <main className="cr-shell">
      <header className="cr-topbar">
        <button className="cr-home-link" type="button" onClick={() => router.push("/")}>
          <LogoMark />
        </button>
        <nav className="cr-nav" aria-label="Code Research navigation">
          <button type="button" onClick={() => router.push("/")}>
            主页
          </button>
          <button type="button" onClick={() => setScreen("chapters")}>
            章节地图
          </button>
          <button type="button" onClick={() => setActivePanel("curriculum")}>玩法</button>
          <button type="button" data-testid="code-research-onboarding-restart" onClick={() => restartOnboarding("chapters")}>新手指导</button>
          <button type="button" data-onboard="top-nav-progress" onClick={() => setActivePanel("progress")}>进度 {summary.completedCount}/{summary.totalCount}</button>
        </nav>
        <div className="cr-userbar">
          <span>Lv.{userLevel}</span>
          <span><Star /> {summary.stars}</span>
          <span><Gem /> {balance}</span>
          <button type="button" onClick={() => { toggleMute(); musicManager.toggleMute(); }} aria-label="toggle sound">
            {isMuted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            <LogOut />
          </button>
        </div>
      </header>

      {screen === "chapters" ? (
        <ChapterSelectScreen
          activeChapterId={selectedChapter.id}
          onSelectChapter={(chapter) => {
            const chapterIndex = codeResearchChapters.findIndex((item) => item.id === chapter.id);
            if (!isChapterUnlocked(chapterIndex, progress)) {
              return;
            }
            const nextChapterLevel = getChapterNextLevel(chapter, progress) ?? getChapterLevels(chapter)[0];
            setActiveChapterId(chapter.id);
            if (nextChapterLevel) {
              setSelectedLevelId(nextChapterLevel.id);
            }
            setScreen("map");
          }}
          onOpenPanel={togglePanel}
          activePanel={activePanel}
          progress={progress}
          playSound={playSound}
        />
      ) : screen === "map" ? (
        <ChapterMapScreen
          chapter={selectedChapter}
          chapterLevels={chapterLevels}
          selectedLevel={selectedLevel}
          onSelectLevel={(level) => setSelectedLevelId(level.id)}
          onStart={() => setScreen("level")}
          onBackToChapters={() => setScreen("chapters")}
          onOpenPanel={togglePanel}
          activePanel={activePanel}
          progress={progress}
          playSound={playSound}
        />
      ) : (
        <LevelScreen
          level={selectedLevel}
          onBackToMap={() => setScreen("map")}
          onComplete={handleComplete}
          onSelectNext={handleSelectNext}
          onOpenOnboarding={() => restartOnboarding("level")}
          playSound={playSound}
        />
      )}

      <DrawerPanel
        open={activePanel !== null}
        title={activePanel ? panelContent[activePanel].title : ""}
        subtitle={activePanel ? panelContent[activePanel].subtitle : ""}
        sections={activePanel ? panelContent[activePanel].sections : []}
        chips={activePanel ? panelContent[activePanel].chips : []}
        footer={activePanel ? panelContent[activePanel].footer : ""}
        actions={activePanel ? panelContent[activePanel].actions : []}
        onClose={() => setActivePanel(null)}
      />
      <OnboardingCoach
        open={onboardingOpen}
        step={currentOnboardingStep}
        stepIndex={onboardingStepIndex}
        totalSteps={onboardingSteps.length}
        targetRect={onboardingTargetRect}
        onPrev={handleOnboardingPrev}
        onNext={handleOnboardingNext}
        onSkip={() => closeOnboarding("dismissed")}
      />
    </main>
  );
}
