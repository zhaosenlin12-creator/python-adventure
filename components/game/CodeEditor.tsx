"use client";

import { useCallback, useEffect } from "react";

interface CodeEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
    storageKey?: string;
    language?: string;
    locale?: "cn" | "en";
    placeholder?: string;
    showLanguageLabel?: boolean;
}

function getEditorLabel(language: string) {
    switch (language) {
        case "cpp":
            return "C++";
        case "html":
            return "HTML";
        case "css":
            return "CSS";
        case "sql":
            return "SQL";
        case "bash":
            return "Bash";
        case "javascript":
            return "JS / JSX";
        case "prompt":
            return "Prompt";
        default:
            return language.toUpperCase();
    }
}

function getPlaceholder(language: string, locale: "cn" | "en") {
    if (locale === "cn") {
        switch (language) {
            case "cpp":
                return "// 在这里补全 C++ 代码...";
            case "java":
                return "// 在这里补全 Java 代码...";
            case "go":
                return "// 在这里补全 Go 代码...";
            case "html":
                return "<!-- 在这里补全 HTML 结构... -->";
            case "css":
                return "/* 在这里补全 CSS 规则... */";
            case "sql":
                return "-- 在这里补全 SQL 语句...";
            case "bash":
                return "# 在这里补全命令或步骤...";
            case "javascript":
                return "// 在这里补全代码或组件逻辑...";
            case "prompt":
                return "# 在这里补全提示词或任务清单...";
            default:
                return "# 在这里补全 Python 代码...";
        }
    }

    switch (language) {
        case "cpp":
            return "// Complete the C++ code for this challenge...";
        case "java":
            return "// Complete the Java code for this challenge...";
        case "go":
            return "// Complete the Go code for this challenge...";
        case "html":
            return "<!-- Complete the HTML structure for this challenge... -->";
        case "css":
            return "/* Complete the CSS rules for this challenge... */";
        case "sql":
            return "-- Complete the SQL for this challenge...";
        case "bash":
            return "# Complete the lab command for this challenge...";
        case "javascript":
            return "// Complete the code or JSX for this challenge...";
        case "prompt":
            return "# Fill the prompt or checklist for this challenge...";
        default:
            return "# Complete the Python code for this challenge...";
    }
}

export default function CodeEditor({
    code,
    onChange,
    storageKey,
    language = "python",
    locale = "en",
    placeholder,
    showLanguageLabel = true,
}: CodeEditorProps) {
    useEffect(() => {
        if (!storageKey) return;
        if (typeof window === "undefined") return;
        localStorage.setItem(storageKey, code);
    }, [code, storageKey]);

    const handleChange = useCallback(
        (value: string) => {
            onChange(value);
        },
        [onChange],
    );

    return (
        <div className="relative h-full w-full overflow-hidden rounded-lg border-4 border-slate-700 bg-[#1e1e1e]">
            {showLanguageLabel && (
                <div className="absolute right-2 top-1 z-10 text-[10px] font-mono text-gray-600 opacity-50">
                    {getEditorLabel(language)}
                </div>
            )}
            <div className="h-full">
                <textarea
                    value={code}
                    onChange={(e) => handleChange(e.target.value)}
                    className="h-full w-full resize-none bg-[#1e1e1e] p-4 pt-6 font-mono text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    style={{
                        fontFamily: "'Courier New', 'Consolas', monospace",
                        lineHeight: "1.5",
                        tabSize: 4,
                        caretColor: "#00ff00",
                    }}
                    spellCheck={false}
                    placeholder={placeholder ?? getPlaceholder(language, locale)}
                />
            </div>
        </div>
    );
}
