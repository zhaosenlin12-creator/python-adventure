'use client';

/**
 * 友好错误提示UI
 * 当应用发生错误时显示，提供刷新重试按钮
 */

import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  componentName?: string;
}

export default function ErrorFallback({ 
  error, 
  resetError,
  componentName 
}: ErrorFallbackProps) {
  const handleRefresh = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 backdrop-blur-sm rounded-2xl p-8 text-center border border-slate-700 shadow-xl">
        {/* 图标 */}
        <div className="w-20 h-20 mx-auto mb-6 bg-amber-900/30 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-bold text-white mb-3">
          哎呀，出了点小问题 🛠️
        </h1>

        {/* 描述 */}
        <p className="text-slate-500 mb-6 leading-relaxed">
          游戏遇到了一个小故障，别担心，刷新一下就好啦！
          <br />
          <span className="text-slate-400 text-sm">
            如果问题持续出现，请尝试更换浏览器（推荐Chrome）
          </span>
        </p>

        {/* 按钮组 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
          >
            <RefreshCw className="w-5 h-5" />
            刷新重试
          </button>
          
          <button
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-600 border border-slate-600 transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
        </div>

        {/* 技术信息（折叠显示） */}
        {error && process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-slate-400 text-sm cursor-pointer hover:text-slate-300">
              查看技术详情（仅开发环境）
            </summary>
            <div className="mt-2 p-3 bg-slate-900 rounded-lg text-xs text-slate-400 overflow-auto max-h-40">
              <p className="font-semibold text-red-500 mb-1">{error.message}</p>
              {componentName && (
                <p className="text-slate-500 mb-1">组件: {componentName}</p>
              )}
              <pre className="whitespace-pre-wrap break-all">
                {error.stack}
              </pre>
            </div>
          </details>
        )}

        {/* 提示 */}
        <p className="mt-6 text-slate-400 text-xs">
          错误已自动上报，我们会尽快修复 💪
        </p>
      </div>
    </div>
  );
}
