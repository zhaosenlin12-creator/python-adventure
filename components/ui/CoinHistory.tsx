'use client';

import { useEffect, useState } from 'react';
import { Clock, TrendingDown, TrendingUp } from 'lucide-react';

import { getCoinsHistory } from '@/lib/api/coinAPI';
import { useCoinStore } from '@/store/coinStore';
import Icon from './Icon';

interface CoinTransaction {
  id: number;
  amount: number;
  type: string;
  source: string;
  description: string | null;
  created_at: string;
}

interface CoinHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
}

export default function CoinHistory({ isOpen, onClose, token }: CoinHistoryProps) {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loadBalance } = useCoinStore();

  useEffect(() => {
    if (!isOpen || !token) return;
    loadHistory(token);
    loadBalance(token).catch(() => {});
  }, [isOpen, token, loadBalance]);

  const loadHistory = async (accessToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const history = await getCoinsHistory(accessToken, 50);
      setTransactions(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getSourceLabel = (source: string): string => {
    const labels: Record<string, string> = {
      level_complete: '完成关卡',
      campaign_level_complete: '完成战役',
      arena_match: '竞技场',
      pvp_match: 'PVP 对战',
      workshop_earning: '工坊收益',
      workshop_play: '社区关卡被游玩',
      workshop_like: '社区关卡被点赞',
      food_purchase: '购买食物',
      decoration_purchase: '购买装饰',
      system_update_compensation_20260406: '系统更新补给',
      code_research: 'Code Research 奖励',
    };
    return labels[source] || source;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        data-testid="coin-history-modal"
        className="m-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border-2 border-slate-700 bg-slate-800 shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <div className="flex items-center gap-2">
            <Icon name="coin" size="md" />
            <h2 className="text-xl font-bold text-white">金币历史</h2>
          </div>
          <button
            onClick={onClose}
            data-testid="coin-history-close"
            className="rounded-lg p-2 transition-colors hover:bg-slate-700"
          >
            <Icon name="close" size="sm" clickable />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="py-8 text-center text-slate-400">加载中...</div>}
          {error && <div className="py-8 text-center text-red-500">{error}</div>}
          {!loading && !error && transactions.length === 0 && (
            <div className="py-8 text-center text-slate-400">暂无交易记录</div>
          )}

          {!loading && !error && transactions.length > 0 && (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-lg border border-slate-600 bg-slate-700 p-3 shadow-sm transition-colors hover:bg-blue-700/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 items-start gap-3">
                      <div
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-full',
                          tx.amount > 0 ? 'bg-blue-900/20' : 'bg-red-900/20',
                        ].join(' ')}
                      >
                        {tx.amount > 0 ? (
                          <TrendingUp className="h-5 w-5 text-blue-400" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white">{getSourceLabel(tx.source)}</div>
                        {tx.description ? (
                          <div className="truncate text-sm text-slate-500">{tx.description}</div>
                        ) : null}
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatTime(tx.created_at)}
                        </div>
                      </div>
                    </div>

                    <div
                      className={[
                        'whitespace-nowrap text-lg font-bold',
                        tx.amount > 0 ? 'text-blue-400' : 'text-red-500',
                      ].join(' ')}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                      <Icon name="coin" size={16} className="ml-1 inline" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
