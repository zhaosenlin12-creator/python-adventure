import type { Level } from "./levels";

export interface PatternValidationResult {
  success: boolean;
  output: string[];
  missingSnippets: string[];
}

function normalizeSourceText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/['"]/g, '"')
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/【/g, "[")
    .replace(/】/g, "]")
    .replace(/｛/g, "{")
    .replace(/｝/g, "}")
    .replace(/，/g, ",")
    .replace(/：/g, ":")
    .replace(/；/g, ";")
    .replace(/。/g, ".")
    .toLowerCase();
}

function normalizeSnippetText(value: string) {
  return normalizeSourceText(value).replace(/\s+/g, "");
}

function hasPlaceholderText(code: string) {
  return /____|_{3,}|todo|待补|待填写|fill\s*here/i.test(normalizeSourceText(code));
}

export function getLevelRuntime(level: Level) {
  return level.runtime ?? "python";
}

export function getLevelEditorLanguage(level: Level) {
  if (level.editorLanguage) {
    return level.editorLanguage;
  }

  if (getLevelRuntime(level) === "pattern") {
    return "prompt";
  }

  return "python";
}

export function validatePatternLevel(level: Level, code: string): PatternValidationResult {
  const trimmedCode = code.trim();

  if (!trimmedCode) {
    return {
      success: false,
      output: ["先补上代码，再试一次。"],
      missingSnippets: level.requiredSnippets ?? [],
    };
  }

  const requiredSnippets = level.requiredSnippets ?? [];
  const normalizedCode = normalizeSnippetText(code);
  const missingSnippets = requiredSnippets.filter(
    (snippet) => !normalizedCode.includes(normalizeSnippetText(snippet)),
  );
  const hasPlaceholder = hasPlaceholderText(code);
  const success = !hasPlaceholder && missingSnippets.length === 0;

  if (!success) {
    const output = hasPlaceholder
      ? ["先把空白占位补完整，再试一次。"]
      : [
          "关键结构还没补齐。",
          `补上这些片段：${missingSnippets.slice(0, 3).join(" | ")}`,
        ];

    return {
      success,
      output,
      missingSnippets,
    };
  }

  return {
    success,
    output: level.simulatedOutput?.length
      ? level.simulatedOutput
      : ["结构检查通过。", "关键代码已经齐了。"],
    missingSnippets: [],
  };
}
