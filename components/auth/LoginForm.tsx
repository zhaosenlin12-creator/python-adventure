"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { User, Lock } from 'lucide-react';

interface LoginFormProps {
    onSwitchToRegister: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading, error, clearError } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        try {
            await login(username, password);
        } catch {
            // Error is handled in the store
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >
            <div className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-8 shadow-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4">
                        <img src="/assets/theme/gamepad.svg" alt="" className="w-full h-full" />
                    </div>
                    <h2 className="text-3xl font-pixel text-blue-400 mb-2">
                        Python 冒险岛
                    </h2>
                    <p className="text-slate-400">登录开始你的编程之旅</p>
                </div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-4 p-3 bg-red-900/50 border-2 border-red-500 rounded-lg text-red-400 text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username */}
                    <div>
                        <label className="block text-blue-400 font-pixel mb-2 text-sm">
                            <User className="inline w-4 h-4 mr-2" />
                            用户名
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                            placeholder="输入用户名"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-blue-400 font-pixel mb-2 text-sm">
                            <Lock className="inline w-4 h-4 mr-2" />
                            密码
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                            placeholder="输入密码"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-pixel rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900"
                    >
                        {isLoading ? '登录中...' : '登录'}
                    </button>
                </form>

                {/* Switch to Register */}
                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        还没有账号？{' '}
                        <button
                            onClick={onSwitchToRegister}
                            className="text-blue-400 hover:text-blue-300 font-pixel"
                        >
                            立即注册
                        </button>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
