"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { User, Lock, Mail } from 'lucide-react';

interface RegisterFormProps {
    onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const { register, isLoading, error, clearError } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError('');

        if (password !== confirmPassword) {
            setLocalError('两次密码输入不一致');
            return;
        }

        if (password.length < 6) {
            setLocalError('密码长度至少6位');
            return;
        }

        try {
            await register(username, email, password);
        } catch {
            // Error is handled in the store
        }
    };

    const displayError = localError || error;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >
            <div className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-8 shadow-lg">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-3">
                        <img src="/assets/theme/sparkle.svg" alt="" className="w-full h-full" />
                    </div>
                    <h2 className="text-2xl font-pixel text-blue-400 mb-1">
                        创建账号
                    </h2>
                    <p className="text-slate-400 text-sm">加入 Python 冒险岛</p>
                </div>

                {/* Error Message */}
                {displayError && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-3 p-2 bg-red-900/50 border-2 border-red-500 rounded-lg text-red-400 text-sm"
                    >
                        {displayError}
                    </motion.div>
                )}

                {/* Register Form */}
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

                    {/* Email */}
                    <div>
                        <label className="block text-blue-400 font-pixel mb-2 text-sm">
                            <Mail className="inline w-4 h-4 mr-2" />
                            邮箱
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                            placeholder="输入邮箱"
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
                            placeholder="至少6位"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-blue-400 font-pixel mb-2 text-sm">
                            <Lock className="inline w-4 h-4 mr-2" />
                            确认密码
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                            placeholder="再次输入密码"
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
                        {isLoading ? '注册中...' : '注册'}
                    </button>
                </form>

                {/* Switch to Login */}
                <div className="mt-4 text-center">
                    <p className="text-slate-400 text-sm">
                        已有账号？{' '}
                        <button
                            onClick={onSwitchToLogin}
                            className="text-blue-400 hover:text-blue-300 font-pixel"
                        >
                            立即登录
                        </button>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
