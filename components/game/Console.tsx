"use client";

import { useEffect, useRef } from "react";

interface ConsoleProps {
    output: string[];
}

export default function Console({ output }: ConsoleProps) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [output]);

    return (
        <div className="h-full w-full bg-black border-4 border-slate-700 rounded-lg p-4 font-mono text-sm overflow-y-auto">
            <div className="text-slate-500 mb-2"># Output Terminal</div>
            {output.map((line, i) => (
                <div key={i} className="text-green-400 whitespace-pre-wrap">
                    {line}
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}
