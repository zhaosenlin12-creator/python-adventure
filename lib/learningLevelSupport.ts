import { getLearningChapter, getLearningCopy, isLikelyCorruptedText } from "./learningHub";
import type { Level } from "./levels";

export type LearningGuideHintKind = "knowledge" | "format" | "example" | "goal" | "tip";

export interface LearningGuideHint {
  kind: LearningGuideHintKind;
  label: string;
  labelCN: string;
  text: string;
}

export interface LearningAssistantContextPayload {
  levelId: string;
  levelTitle: string;
  chapterTitle: string;
  description: string;
  runtime: string;
  editorLanguage: string;
  validationMode: "live-run" | "pattern-check";
  knowledgeHint: string | null;
  guideHints: string[];
  code: string;
  consoleOutput: string[];
  interfaceLanguage: "cn" | "en";
}

const COMMENT_PREFIXES = ["#", "//", "--", "<!--"];
const HINT_META: Array<{
  kind: LearningGuideHintKind;
  label: string;
  labelCN: string;
  patterns: RegExp[];
}> = [
  {
    kind: "knowledge",
    label: "Knowledge",
    labelCN: "知识点",
    patterns: [/^(knowledge|知识点)\s*[:：]?\s*/i],
  },
  {
    kind: "format",
    label: "Format",
    labelCN: "写法",
    patterns: [/^(format|格式)\s*[:：]?\s*/i],
  },
  {
    kind: "example",
    label: "Example",
    labelCN: "示例",
    patterns: [/^(example|例如|示例)\s*[:：]?\s*/i],
  },
  {
    kind: "goal",
    label: "Goal",
    labelCN: "目标",
    patterns: [/^(goal|task|target|请|目标|任务)\s*[:：]?\s*/i],
  },
  {
    kind: "tip",
    label: "Tip",
    labelCN: "提示",
    patterns: [/^(tip|hint|提示)\s*[:：]?\s*/i],
  },
];

function normalizeHintText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[。．.]+$/, "");
}

function isCommentLine(line: string) {
  const trimmed = line.trim();
  return COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function stripCommentSyntax(line: string) {
  const trimmed = line.trim();

  if (trimmed.startsWith("<!--")) {
    return trimmed.replace(/^<!--\s*/, "").replace(/\s*-->$/, "").trim();
  }

  if (trimmed.startsWith("//")) {
    return trimmed.slice(2).trim();
  }

  if (trimmed.startsWith("--")) {
    return trimmed.slice(2).trim();
  }

  if (trimmed.startsWith("#")) {
    return trimmed.slice(1).trim();
  }

  return trimmed;
}

function collectHeaderComments(initialCode: string) {
  const comments: string[] = [];
  const lines = initialCode.split("\n").slice(0, 10);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (comments.length > 0) {
        break;
      }
      continue;
    }

    if (!isCommentLine(trimmed)) {
      break;
    }

    const normalized = normalizeHintText(stripCommentSyntax(trimmed));
    if (!normalized || isLikelyCorruptedText(normalized)) {
      continue;
    }

    comments.push(normalized);
    if (comments.length >= 6) {
      break;
    }
  }

  return comments;
}

function classifyCommentLine(line: string): LearningGuideHint | null {
  for (const meta of HINT_META) {
    for (const pattern of meta.patterns) {
      if (pattern.test(line)) {
        const text = normalizeHintText(line.replace(pattern, ""));
        if (!text || isLikelyCorruptedText(text)) {
          return null;
        }
        return {
          kind: meta.kind,
          label: meta.label,
          labelCN: meta.labelCN,
          text,
        };
      }
    }
  }

  const fallback = normalizeHintText(line);
  if (!fallback || isLikelyCorruptedText(fallback)) {
    return null;
  }

  return {
    kind: "tip",
    label: "Tip",
    labelCN: "提示",
    text: fallback,
  };
}

function uniqueHints(hints: LearningGuideHint[]) {
  const seen = new Set<string>();
  return hints.filter((hint) => {
    const key = `${hint.kind}:${hint.text.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function extractLearningGuideHints(initialCode: string) {
  return uniqueHints(
    collectHeaderComments(initialCode)
      .map(classifyCommentLine)
      .filter((hint): hint is LearningGuideHint => Boolean(hint)),
  );
}

function getGuideHintLimit(level: Level) {
  const chapterMeta = getLearningChapter(level.chapter);
  const chapterOrder = chapterMeta?.order ?? 1;

  if (level.type === "boss") {
    return 1;
  }

  if (chapterOrder >= 6) {
    return 1;
  }

  if (chapterOrder >= 3 || level.type === "battle") {
    return 2;
  }

  return 3;
}

export function getVisibleLearningGuideHints(level: Level) {
  const guideHints = extractLearningGuideHints(level.initialCode);
  const nonKnowledgeHints = guideHints.filter((hint) => hint.kind !== "knowledge");
  const candidates = nonKnowledgeHints.length > 0 ? nonKnowledgeHints : guideHints;

  return candidates.slice(0, getGuideHintLimit(level));
}

export function buildLearningAssistantContext(options: {
  level: Level;
  code: string;
  output: string[];
  language: "cn" | "en";
}): LearningAssistantContextPayload {
  const { level, code, output, language } = options;
  const chapterMeta = getLearningChapter(level.chapter);
  const guideHints = getVisibleLearningGuideHints(level).map((hint) => hint.text);
  const knowledgeHint =
    extractLearningGuideHints(level.initialCode).find((hint) => hint.kind === "knowledge")?.text ?? null;

  return {
    levelId: level.id,
    levelTitle: getLearningCopy(language, level.titleCN, level.title),
    chapterTitle: chapterMeta
      ? getLearningCopy(language, chapterMeta.titleCN, chapterMeta.title)
      : getLearningCopy(language, level.chapterTitleCN, level.chapterTitle),
    description: getLearningCopy(language, level.descriptionCN, level.description),
    runtime: level.runtime ?? "python",
    editorLanguage: level.editorLanguage ?? (level.runtime === "pattern" ? "prompt" : "python"),
    validationMode: (level.runtime ?? "python") === "python" ? "live-run" : "pattern-check",
    knowledgeHint,
    guideHints,
    code,
    consoleOutput: output.filter(Boolean).slice(-4),
    interfaceLanguage: language,
  };
}
