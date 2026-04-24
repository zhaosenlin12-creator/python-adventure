"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, User } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';

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
      setLocalError('两次输入的密码不一致。');
      return;
    }

    if (password.length < 6) {
      setLocalError('密码长度至少 6 位。');
      return;
    }

    try {
      await register(username, email, password);
    } catch {
      // store handles request errors
    }
  };

  const displayError = localError || error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-14 w-14">
            <img src="/assets/theme/sparkle.svg" alt="" className="h-full w-full" />
          </div>
          <h2 className="mb-1 text-2xl font-pixel text-blue-400">创建账号</h2>
          <p className="text-sm text-slate-400">加入 Python 冒险岛</p>
        </div>

        {displayError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-3 rounded-lg border-2 border-red-500 bg-red-900/50 p-2 text-sm text-red-400"
          >
            {displayError}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-pixel text-blue-400">
              <User className="mr-2 inline h-4 w-4" />
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-600 bg-slate-700 px-4 py-3 text-white transition-colors focus:border-blue-400 focus:outline-none"
              placeholder="输入用户名"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-pixel text-blue-400">
              <Mail className="mr-2 inline h-4 w-4" />
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-600 bg-slate-700 px-4 py-3 text-white transition-colors focus:border-blue-400 focus:outline-none"
              placeholder="输入邮箱"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-pixel text-blue-400">
              <Lock className="mr-2 inline h-4 w-4" />
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-600 bg-slate-700 px-4 py-3 text-white transition-colors focus:border-blue-400 focus:outline-none"
              placeholder="至少 6 位"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-pixel text-blue-400">
              <Lock className="mr-2 inline h-4 w-4" />
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-600 bg-slate-700 px-4 py-3 text-white transition-colors focus:border-blue-400 focus:outline-none"
              placeholder="再次输入密码"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 py-3 font-pixel text-white shadow-md shadow-blue-900 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">
            已有账号？{' '}
            <button
              onClick={onSwitchToLogin}
              className="font-pixel text-blue-400 hover:text-blue-300"
            >
              立即登录
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
