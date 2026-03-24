'use client';

import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { useRouter } from 'next/navigation';

/**
 * 进度同步状态指示器
 * 显示云端同步状态，提示用户登录过期等问题
 */
export function SyncStatusIndicator() {
    const { syncStatus, lastSyncError, isAuthenticated, logout } = useAuthStore();
    const { lastSyncTime } = useGameStore();
    const router = useRouter();

    // 未登录时不显示
    if (!isAuthenticated && syncStatus !== 'token-expired') {
        return null;
    }

    // 处理重新登录
    const handleReLogin = () => {
        logout(); // 清除过期状态
        router.push('/'); // 跳转到首页登录
    };

    // 需要重新登录提示 - 友好的提示语言，不打断游戏
    // 只在页面加载时检测到过期才显示，游戏过程中不会突然弹出
    if (syncStatus === 'token-expired') {
        return (
            <div className="fixed top-16 right-4 z-50 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white px-4 py-3 rounded-xl shadow-lg shadow-yellow-900/50 flex items-center gap-3 border-2 border-yellow-300 max-w-xs">
                <span className="text-2xl">☁️</span>
                <div className="flex-1">
                    <div className="font-pixel text-sm text-yellow-100">需要重新登录</div>
                    <div className="text-xs text-yellow-200">游戏进度已保存在本地，登录后可同步到云端</div>
                </div>
                <button
                    onClick={handleReLogin}
                    className="bg-white/20 hover:bg-white/30 text-yellow-100 px-3 py-1.5 rounded-lg text-xs font-pixel transition-colors border border-yellow-300/50 whitespace-nowrap"
                >
                    去登录
                </button>
            </div>
        );
    }

    // 同步失败提示
    if (syncStatus === 'failed') {
        return (
            <div className="fixed top-16 right-4 z-50 bg-gradient-to-r from-red-700 to-red-600 text-white px-4 py-3 rounded-xl shadow-lg shadow-red-900/50 flex items-center gap-3 border-2 border-red-400">
                <span className="text-2xl">⚠️</span>
                <div>
                    <div className="font-pixel text-sm text-red-100">同步失败</div>
                    <div className="text-xs text-red-200">{lastSyncError || '请检查网络连接'}</div>
                </div>
            </div>
        );
    }

    // 正在同步
    if (syncStatus === 'pending') {
        return (
            <div className="fixed top-16 right-4 z-50 bg-gradient-to-r from-blue-800/90 to-blue-700/90 text-blue-200 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm border border-blue-500/50">
                <span className="animate-spin">☁️</span>
                <span className="font-pixel text-xs">同步中...</span>
            </div>
        );
    }

    return null;
}
