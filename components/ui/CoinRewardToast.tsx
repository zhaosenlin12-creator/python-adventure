'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Coins, Gem, Sparkles } from 'lucide-react';
import { TRAINING_CURRENCY_LABEL, SERVER_CURRENCY_LABEL } from '@/lib/gameEconomy';

type ToastType = 'reward' | 'spend';
type CurrencyType = 'coin' | 'diamond';

interface CurrencyToastMessage {
  id: number;
  amount: number;
  source: string;
  type: ToastType;
  currency: CurrencyType;
}

let toastId = 0;
const toastListeners: ((amount: number, source: string, type: ToastType, currency: CurrencyType) => void)[] = [];

export function showCoinRewardToast(
  coins: number,
  source: string = '完成任务',
  type: ToastType = 'reward'
) {
  toastListeners.forEach((listener) => listener(coins, source, type, 'coin'));
}

export function showDiamondRewardToast(
  diamonds: number,
  source: string = '完成挑战',
  type: ToastType = 'reward'
) {
  toastListeners.forEach((listener) => listener(diamonds, source, type, 'diamond'));
}

export default function CoinRewardToast() {
  const [toasts, setToasts] = useState<CurrencyToastMessage[]>([]);

  useEffect(() => {
    const listener = (amount: number, source: string, type: ToastType, currency: CurrencyType) => {
      const id = toastId++;
      setToasts((prev) => [...prev, { id, amount, source, type, currency }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3000);
    };

    toastListeners.push(listener);

    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-24 z-[100] space-y-2">
      {toasts.map((toast) => {
        const isDiamond = toast.currency === 'diamond';
        const isReward = toast.type === 'reward';
        const amountColor = isDiamond
          ? (isReward ? 'text-cyan-200' : 'text-slate-400')
          : (isReward ? 'text-amber-400' : 'text-slate-400');
        const frameColor = isDiamond
          ? (isReward ? 'bg-cyan-950/80 border-cyan-400/30' : 'bg-slate-800 border-slate-600')
          : (isReward ? 'bg-amber-950/80 border-amber-500/30' : 'bg-slate-800 border-slate-600');
        const label = isDiamond ? TRAINING_CURRENCY_LABEL : SERVER_CURRENCY_LABEL;

        return (
          <div
            key={toast.id}
            className={`pixel-panel min-w-[300px] max-w-[400px] animate-slide-in-right border p-4 ${frameColor}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isDiamond
                    ? 'bg-cyan-400/10 text-cyan-200'
                    : isReward
                      ? 'bg-amber-400/10 text-amber-300'
                      : 'bg-slate-700 text-slate-300'
                }`}
              >
                {isDiamond ? <Gem className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
              </div>

              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`text-lg font-bold ${amountColor}`}>
                    {toast.type === 'reward' ? '+' : '-'}{toast.amount}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">{label}</span>
                </div>
                <div className="text-xs text-slate-300">{toast.source}</div>
              </div>

              {isReward ? (
                <div className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-100">
                  {isDiamond ? (
                    <Sparkles className="h-4 w-4 text-cyan-200" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-amber-300" />
                  )}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
