"use client";

import { useEffect, useState, useRef } from 'react';

declare global {
    interface Window {
        loadPyodide: any;
        pyodide: any;
        __pyodideInstance: any;
        __pyodideLoading: boolean;
        __pyodideLoadPromise: Promise<any> | null;
    }
}

// 全局 Pyodide 加载函数（单例模式）
async function getGlobalPyodide(): Promise<any> {
    // 如果已经加载完成，直接返回
    if (window.__pyodideInstance) {
        return window.__pyodideInstance;
    }
    
    // 如果正在加载，等待加载完成
    if (window.__pyodideLoadPromise) {
        return window.__pyodideLoadPromise;
    }
    
    // 开始加载
    window.__pyodideLoadPromise = (async () => {
        try {
            // 加载 Pyodide 脚本（优先本地，CDN备用）
            if (!(window as any).loadPyodide) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    // 优先使用本地文件
                    script.src = '/pyodide/pyodide.js';
                    script.onload = () => {
                        console.log('✅ Pyodide script loaded from local');
                        resolve(undefined);
                    };
                    script.onerror = () => {
                        console.warn('⚠️ Local Pyodide failed, trying CDN...');
                        // 如果本地失败，尝试CDN
                        const cdnScript = document.createElement('script');
                        cdnScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
                        cdnScript.onload = () => {
                            console.log('✅ Pyodide script loaded from CDN');
                            resolve(undefined);
                        };
                        cdnScript.onerror = reject;
                        document.head.appendChild(cdnScript);
                    };
                    document.head.appendChild(script);
                });
            }

            // 初始化 Pyodide（优先本地，CDN备用）
            let pyodide;
            try {
                // 先尝试本地
                console.log('🔄 Loading Pyodide from local files...');
                pyodide = await (window as any).loadPyodide({
                    indexURL: '/pyodide/'
                });
                console.log('✅ Pyodide initialized from local files');
            } catch (localErr) {
                console.warn('⚠️ Local Pyodide initialization failed, trying CDN...', localErr);
                // 本地失败，使用CDN
                pyodide = await (window as any).loadPyodide({
                    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
                });
                console.log('✅ Pyodide initialized from CDN');
            }
            
            window.__pyodideInstance = pyodide;
            return pyodide;
        } catch (err) {
            console.error('❌ Failed to load Pyodide:', err);
            window.__pyodideLoadPromise = null;
            throw err;
        }
    })();
    
    return window.__pyodideLoadPromise;
}

export default function usePyodide() {
    const [isReady, setIsReady] = useState(!!window.__pyodideInstance);
    const [output, setOutput] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(!window.__pyodideInstance);
    const pyodideRef = useRef<any>(window.__pyodideInstance || null);

    useEffect(() => {
        // 如果已经加载，直接使用
        if (window.__pyodideInstance) {
            pyodideRef.current = window.__pyodideInstance;
            setIsReady(true);
            setIsLoading(false);
            return;
        }

        // 注册 Service Worker 用于缓存
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // 静默失败
            });
        }

        // 加载 Pyodide
        getGlobalPyodide()
            .then((pyodide) => {
                pyodideRef.current = pyodide;
                setIsReady(true);
                setIsLoading(false);
            })
            .catch(() => {
                setIsLoading(false);
            });
    }, []);

    const runCode = async (code: string) => {
        setOutput([]); // Clear previous output
        
        if (!code || code.trim() === '') {
            setOutput(['请输入代码']);
            return;
        }
        
        if (!pyodideRef.current) {
            setOutput(['Python 环境加载中...']);
            return;
        }
        
        try {
            // 捕获 print 输出
            await pyodideRef.current.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
            `);
            
            // 执行用户代码
            await pyodideRef.current.runPythonAsync(code);
            
            // 获取输出
            const stdout = await pyodideRef.current.runPythonAsync('sys.stdout.getvalue()');
            const lines = stdout.split('\n').filter((line: string) => line.trim() !== '');
            setOutput(lines.length > 0 ? lines : ['(无输出)']);
        } catch (err: any) {
            setOutput([`Error: ${err.message}`]);
        }
    };

    const getGlobal = (name: string) => {
        if (!pyodideRef.current) return null;
        try {
            return pyodideRef.current.globals.get(name);
        } catch (err) {
            return null;
        }
    };

    return { isReady, isLoading, output, runCode, getGlobal, clearOutput: () => setOutput([]) };
}
