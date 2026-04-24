"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        loadPyodide: any;
        pyodide: any;
        __pyodideInstance: any;
        __pyodideLoading: boolean;
        __pyodideLoadPromise: Promise<any> | null;
    }
}

async function getGlobalPyodide(): Promise<any> {
    if (window.__pyodideInstance) {
        return window.__pyodideInstance;
    }

    if (window.__pyodideLoadPromise) {
        return window.__pyodideLoadPromise;
    }

    window.__pyodideLoadPromise = (async () => {
        try {
            if (!window.loadPyodide) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = "/pyodide/pyodide.js";
                    script.onload = () => resolve();
                    script.onerror = () => {
                        const cdnScript = document.createElement("script");
                        cdnScript.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
                        cdnScript.onload = () => resolve();
                        cdnScript.onerror = reject;
                        document.head.appendChild(cdnScript);
                    };
                    document.head.appendChild(script);
                });
            }

            let pyodide;
            try {
                pyodide = await window.loadPyodide({
                    indexURL: "/pyodide/",
                });
            } catch {
                pyodide = await window.loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
                });
            }

            window.__pyodideInstance = pyodide;
            return pyodide;
        } catch (error) {
            window.__pyodideLoadPromise = null;
            throw error;
        }
    })();

    return window.__pyodideLoadPromise;
}

export default function usePyodide(enabled = true) {
    const hasWindow = typeof window !== "undefined";
    const initialInstance = hasWindow ? window.__pyodideInstance || null : null;
    const [isReady, setIsReady] = useState(enabled ? !!initialInstance : true);
    const [output, setOutput] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(enabled ? !initialInstance : false);
    const pyodideRef = useRef<any>(initialInstance);

    useEffect(() => {
        if (!enabled) {
            setIsReady(true);
            setIsLoading(false);
            return;
        }

        if (window.__pyodideInstance) {
            pyodideRef.current = window.__pyodideInstance;
            setIsReady(true);
            setIsLoading(false);
            return;
        }

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").catch(() => {
                // Best effort cache warmup only.
            });
        }

        getGlobalPyodide()
            .then((pyodide) => {
                pyodideRef.current = pyodide;
                setIsReady(true);
                setIsLoading(false);
            })
            .catch(() => {
                setIsLoading(false);
            });
    }, [enabled]);

    const runCode = async (code: string): Promise<string[]> => {
        setOutput([]);

        if (!enabled) {
            return [];
        }

        if (!code || code.trim() === "") {
            const lines = ["Please enter some code first."];
            setOutput(lines);
            return lines;
        }

        if (!pyodideRef.current) {
            const lines = ["Python runtime is still loading."];
            setOutput(lines);
            return lines;
        }

        try {
            await pyodideRef.current.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
            `);

            await pyodideRef.current.runPythonAsync(code);

            const stdout = await pyodideRef.current.runPythonAsync("sys.stdout.getvalue()");
            const lines = stdout.split("\n").filter((line: string) => line.trim() !== "");
            const resolvedLines = lines.length > 0 ? lines : ["(no output)"];
            setOutput(resolvedLines);
            return resolvedLines;
        } catch (error: any) {
            const lines = [`Error: ${error.message}`];
            setOutput(lines);
            return lines;
        }
    };

    const getGlobal = (name: string) => {
        if (!pyodideRef.current) return null;
        try {
            return pyodideRef.current.globals.get(name);
        } catch {
            return null;
        }
    };

    const clearOutput = useCallback(() => setOutput([]), []);

    return {
        isReady,
        isLoading,
        output,
        runCode,
        getGlobal,
        clearOutput,
    };
}
