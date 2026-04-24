"use client";

import { useEffect, useRef } from "react";

interface ConsoleProps {
    output: string[];
    label?: string;
    emptyText?: string;
}

export default function Console({
    output,
    label = "# Output",
    emptyText,
}: ConsoleProps) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [output]);

    return (
        <div className="h-full w-full bg-black border-4 border-slate-700 rounded-lg p-4 font-mono text-sm overflow-y-auto">
            <div className="text-slate-500 mb-2">{label}</div>
            {output.length === 0 && emptyText ? (
                <div className="mb-2 whitespace-pre-wrap text-slate-600">
                    {emptyText}
                </div>
            ) : null}
            {output.map((line, i) => (
                <div key={i} className="text-green-400 whitespace-pre-wrap">
                    {line}
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}
