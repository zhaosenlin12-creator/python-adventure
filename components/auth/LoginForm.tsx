"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, RefreshCcw, Sparkles, User } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const { login, resetPassword, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResetMessage(null);

    try {
      await login(username, password);
    } catch {
      // store handles request errors
    }
  };

  const handleResetPassword = async () => {
    clearError();
    setResetMessage(null);

    try {
      const payload = await resetPassword(username);
      setPassword(payload.default_password);
      setResetMessage(payload.message);
      setShowResetPanel(true);
    } catch {
      // store handles request errors
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16">
            <img src="/assets/theme/gamepad.svg" alt="" className="h-full w-full" />
          </div>
          <h2 className="mb-2 text-3xl font-pixel text-blue-400">Python 冒险岛</h2>
          <p className="text-slate-400">登录后开始你的编程之旅</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 rounded-lg border-2 border-red-500 bg-red-900/50 p-3 text-sm text-red-400"
          >
            {error}
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
              <Lock className="mr-2 inline h-4 w-4" />
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-600 bg-slate-700 px-4 py-3 text-white transition-colors focus:border-blue-400 focus:outline-none"
              placeholder="输入密码"
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                clearError();
                setResetMessage(null);
                setShowResetPanel((value) => !value);
              }}
              className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-blue-300"
            >
              <RefreshCcw className="h-4 w-4" />
              忘记密码
            </button>
          </div>

          {showResetPanel && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-blue-400/20 bg-slate-900/70 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-blue-500/15 p-2 text-blue-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-pixel text-white">学生账号快速重置</div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    输入用户名后即可一键把密码重置为 <span className="font-semibold text-blue-300">123456</span>。
                    为防误触，同一用户名 30 秒内只能重置一次。
                  </p>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isLoading || !username.trim()}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-pixel text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {isLoading ? '重置中...' : '重置为 123456'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {resetMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
            >
              {resetMessage}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 py-3 font-pixel text-white shadow-md shadow-blue-900 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            还没有账号？{' '}
            <button
              onClick={onSwitchToRegister}
              className="font-pixel text-blue-400 hover:text-blue-300"
            >
              立即注册
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
