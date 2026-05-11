"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, SendHorizontal, X } from "lucide-react";

import { sendLearningAssistantMessage } from "@/lib/api/learningAssistant";
import { useAuthStore } from "@/store/authStore";
import type { LearningAssistantContext, LearningAssistantHistoryItem } from "@/types/learningAssistant";

interface LearningCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: LearningAssistantContext;
  variant?: "floating" | "embedded";
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MIN_THINKING_MS = 650;

function buildInitialGreeting(language: "cn" | "en") {
  if (language === "en") {
    return "I can explain this level or give you just the next step.";
  }

  return "我是 AI 小伴，可以解释这一关，也可以只给你下一步。";
}

function buildLocalHelp(context: LearningAssistantContext, message: string) {
  const question = message.toLowerCase();
  const firstHint = context.guideHints[0];
  const lastOutput = context.consoleOutput[context.consoleOutput.length - 1];

  if (context.interfaceLanguage === "en") {
    if (question.includes("error") && lastOutput) {
      return `Read the last terminal line first: ${lastOutput}. Then compare it with the code you just changed.`;
    }

    if (question.includes("knowledge") || question.includes("idea")) {
      return context.knowledgeHint
        ? `This level focuses on: ${context.knowledgeHint}. Understand that first.`
        : "Read the mission and find the one structure this level is testing first.";
    }

    return firstHint
      ? `Try this first: ${firstHint}. Then run the level again.`
      : "Start with the blank that controls the result, then run once and compare the output.";
  }

  if (question.includes("报错") && lastOutput) {
    return `先看终端最后一行：${lastOutput}。再对照你刚改的那一处代码。`;
  }

  if (question.includes("知识点") || question.includes("原理")) {
    return context.knowledgeHint
      ? `这一关核心是：${context.knowledgeHint}。先想明白这个点。`
      : "先看这一关在练哪一种结构，再开始补代码。";
  }

  return firstHint
    ? `你可以先做这一步：${firstHint}。做完再运行一次。`
    : "先补最关键的一处代码，再根据终端结果继续调整。";
}

function parseMessageBlocks(content: string) {
  return content
    .replace(/\r/g, "")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines) => {
      const ordered = lines.every((line) => /^\d+[.)]\s+/.test(line));
      const bulleted = lines.every((line) => /^[-*•]\s+/.test(line));

      if (ordered || bulleted) {
        return {
          type: "list" as const,
          ordered,
          items: lines.map((line) => line.replace(/^(\d+[.)]|[-*•])\s+/, "")),
        };
      }

      return {
        type: "paragraph" as const,
        text: lines.join(" "),
      };
    });
}

function buildQuickPrompts(language: "cn" | "en") {
  if (language === "en") {
    return [
      "What is this level teaching?",
      "Only tell me the next step.",
      "Help me read my latest error.",
    ];
  }

  return [
    "这一关在练什么？",
    "只告诉我下一步。",
    "帮我看最后一条报错。",
  ];
}

export default function LearningCompanionModal({
  isOpen,
  onClose,
  context,
  variant = "floating",
}: LearningCompanionModalProps) {
  const { token } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMessages([
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: buildInitialGreeting(context.interfaceLanguage),
      },
    ]);
    setInputValue("");
  }, [context.interfaceLanguage, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages]);

  const handleSend = async (rawContent?: string) => {
    const content = (rawContent ?? inputValue).trim();
    if (!content || isSending) {
      return;
    }

    const requestStartedAt = Date.now();
    let assistantMessage: ChatMessage | null = null;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setIsSending(true);

    if (!token) {
      assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: context.interfaceLanguage === "en"
          ? "Sign in first, then I can use the live AI helper for this level."
          : "先登录账号，我才能调用实时 AI 帮你分析这一关。",
      };
    } else {
      const history: LearningAssistantHistoryItem[] = messages.slice(-6).map((message) => ({
        role: message.role,
        content: message.content,
      }));

      try {
        const result = await sendLearningAssistantMessage(
          {
            message: content,
            history,
            context,
          },
          token,
        );

        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.reply,
        };
      } catch (requestError) {
        console.warn("[LearningCompanionModal] Falling back to local help:", requestError);
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: buildLocalHelp(context, content),
        };
      }
    }

    const elapsed = Date.now() - requestStartedAt;
    if (elapsed < MIN_THINKING_MS) {
      await new Promise((resolve) => window.setTimeout(resolve, MIN_THINKING_MS - elapsed));
    }

    if (assistantMessage) {
      setMessages((current) => [...current, assistantMessage as ChatMessage]);
    }
    setIsSending(false);
  };

  if (!isOpen) {
    return null;
  }

  const copy = context.interfaceLanguage === "en"
    ? {
        title: "AI Guide",
        placeholder: "Ask one concrete question...",
        send: "Send",
        thinking: "Thinking...",
      helper: "Ask for the key idea or the next step.",
      quickPrompts: "Quick asks",
    }
    : {
        title: "AI 小伴",
        placeholder: "直接问这一关的具体问题...",
        send: "发送",
        thinking: "思考中...",
        helper: "可以问核心知识点，或直接问下一步。",
        quickPrompts: "快捷提问",
      };
  const quickPrompts = buildQuickPrompts(context.interfaceLanguage);
  const shellClassName = variant === "embedded"
    ? "flex min-h-[360px] max-h-[520px] flex-col overflow-hidden rounded-[26px] border border-cyan-300/18 bg-slate-950/94 shadow-[0_22px_60px_rgba(8,15,40,0.36)]"
    : "fixed inset-x-3 bottom-3 z-[90] flex min-h-[520px] max-h-[min(86vh,860px)] flex-col overflow-hidden rounded-3xl border border-cyan-300/20 bg-slate-950/96 shadow-[0_28px_90px_rgba(8,15,40,0.55)] md:inset-x-auto md:bottom-5 md:right-5 md:min-h-[700px] md:max-h-[86vh] md:w-[600px] lg:w-[680px]";

  return (
    <div className={shellClassName} data-testid="learning-companion-modal">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-slate-900/90 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-cyan-200">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 p-2">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <div className="font-pixel text-sm tracking-[0.18em] text-cyan-100">{copy.title}</div>
              <div className="mt-1 truncate text-[11px] text-slate-400">{context.levelTitle}</div>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-white/8 bg-slate-950/92 px-4 py-2 text-[11px] leading-5 text-slate-300">
        {context.knowledgeHint ?? copy.helper}
      </div>

      <div className="border-b border-white/8 bg-slate-950/90 px-4 py-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">{copy.quickPrompts}</div>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void handleSend(prompt)}
              disabled={isSending}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-45"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm ${
                    isUser
                      ? "border-cyan-300/30 bg-cyan-500/14 text-cyan-50"
                      : "border-white/10 bg-slate-900/86 text-slate-100"
                  }`}
                >
                  <div className="space-y-2">
                    {parseMessageBlocks(message.content).map((block, index) => (
                      block.type === "list" ? (
                        block.ordered ? (
                          <ol key={`${message.id}-${index}`} className="list-decimal space-y-1 pl-5">
                            {block.items.map((item) => (
                              <li key={`${message.id}-${index}-${item}`}>{item}</li>
                            ))}
                          </ol>
                        ) : (
                          <ul key={`${message.id}-${index}`} className="list-disc space-y-1 pl-5">
                            {block.items.map((item) => (
                              <li key={`${message.id}-${index}-${item}`}>{item}</li>
                            ))}
                          </ul>
                        )
                      ) : (
                        <p key={`${message.id}-${index}`} className="whitespace-pre-wrap">
                          {block.text}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/86 px-4 py-3 text-sm text-slate-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{copy.thinking}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-white/10 bg-slate-900/90 px-4 py-4">
        <div className="flex items-start gap-3">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value.slice(0, 240))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder={copy.placeholder}
            className="min-h-[46px] flex-1 rounded-2xl border border-white/10 bg-slate-950/88 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
            maxLength={240}
          />
          <button
            onClick={() => void handleSend()}
            disabled={isSending || !inputValue.trim()}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-500/16 px-4 py-3 text-sm font-medium text-cyan-50 transition-colors hover:bg-cyan-500/24 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            <span>{isSending ? copy.thinking : copy.send}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
