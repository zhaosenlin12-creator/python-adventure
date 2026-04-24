export type LearningAssistantRole = "user" | "assistant";

export interface LearningAssistantHistoryItem {
  role: LearningAssistantRole;
  content: string;
}

export interface LearningAssistantContext {
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

export interface LearningAssistantRequest {
  message: string;
  history: LearningAssistantHistoryItem[];
  context: LearningAssistantContext;
}

export interface LearningAssistantResponse {
  success: boolean;
  reply: string;
  suggestions?: string[];
  mode?: "live" | "fallback";
}

export interface LearningAssistantStatus {
  available: boolean;
  mode: "live" | "fallback";
  message?: string | null;
}
