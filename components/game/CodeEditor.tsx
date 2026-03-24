"use client";

import { useEffect, useCallback } from "react";

interface CodeEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
    storageKey?: string;
    language?: string;
}

export default function CodeEditor({ code, onChange, storageKey }: CodeEditorProps) {
    // Persist code when storageKey provided
    useEffect(() => {
        if (!storageKey) return;
        if (typeof window === 'undefined') return;
        localStorage.setItem(storageKey, code);
    }, [code, storageKey]);

    const handleChange = useCallback((value: string) => {
        onChange(value);
    }, [onChange]);

    return (
        <div className="h-full w-full border-4 border-slate-700 rounded-lg overflow-hidden bg-[#1e1e1e] relative">
            <div className="absolute top-1 right-2 text-[10px] text-gray-600 font-mono z-10 opacity-50">
                Python
            </div>
            <div className="h-full">
                <textarea
                    value={code}
                    onChange={(e) => handleChange(e.target.value)}
                    className="w-full h-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 pt-6 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    style={{
                        fontFamily: "'Courier New', 'Consolas', monospace",
                        lineHeight: '1.5',
                        tabSize: 4,
                        caretColor: '#00ff00'
                    }}
                    spellCheck={false}
                    placeholder="# 在这里编写你的Python代码..."
                />
            </div>
        </div>
    );
}
