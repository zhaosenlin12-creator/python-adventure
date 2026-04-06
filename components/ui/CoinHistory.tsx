'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import Icon from './Icon';
import { getApiBaseUrl } from '@/lib/config/api';
import { useCoinStore } from '@/store/coinStore';

interface CoinTransaction {
  id: number;
  amount: number;
  type: 'reward' | 'purchase' | 'workshop_earning';
  source: string;
  description: string;
  created_at: string;
}

interface CoinHistoryProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 用户token */
  token?: string;
}

/**
 * 金币历史记录组件
 */
export default function CoinHistory({ isOpen, onClose, token }: CoinHistoryProps) {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loadBalance } = useCoinStore();
  
  // 加载交易历史
  useEffect(() => {
    if (isOpen && token) {
      loadHistory();
      loadBalance(token).catch(() => {});
    }
  }, [isOpen, token, loadBalance]);
  
  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/coins/history?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('加载失败');
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 格式化时间
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN');
  };
  
  // 获取来源描述
  const getSourceLabel = (source: string): string => {
    const labels: Record<string, string> = {
      'level_complete': '完成关卡',
      'campaign_level_complete': '完成战役',
      'arena_match': '竞技场',
      'pvp_match': 'PVP对战',
      'workshop_earning': '工坊收益',
      'workshop_play': '社区关卡被游玩',
      'workshop_like': '社区关卡被点赞',
      'food_purchase': '购买食物',
      'decoration_purchase': '购买装饰',
      'system_update_compensation_20260406': '系统更新补给'
    };
    return labels[source] || source;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div data-testid="coin-history-modal" className="bg-slate-800 backdrop-blur-md border-2 border-slate-700 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] m-4 flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Icon name="coin" size="md" />
            <h2 className="text-xl font-bold text-white">金币历史</h2>
          </div>
          <button
            onClick={onClose}
            data-testid="coin-history-close"
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Icon name="close" size="sm" clickable />
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-8 text-slate-400">
              加载中...
            </div>
          )}
          
          {error && (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          )}
          
          {!loading && !error && transactions.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              暂无交易记录
            </div>
          )}
          
          {!loading && !error && transactions.length > 0 && (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-slate-700 border border-slate-600 rounded-lg p-3 hover:bg-blue-700/50 transition-colors shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* 左侧: 图标和信息 */}
                    <div className="flex items-start gap-3 flex-1">
                      {/* 图标 */}
                      <div className={`
                        flex items-center justify-center w-10 h-10 rounded-full
                        ${tx.amount > 0 ? 'bg-blue-900/20' : 'bg-red-900/20'}
                      `}>
                        {tx.amount > 0 ? (
                          <TrendingUp className="w-5 h-5 text-blue-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      
                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white">
                          {getSourceLabel(tx.source)}
                        </div>
                        {tx.description && (
                          <div className="text-sm text-slate-500 truncate">
                            {tx.description}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(tx.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    {/* 右侧: 金币数量 */}
                    <div className={`
                      text-lg font-bold whitespace-nowrap
                      ${tx.amount > 0 ? 'text-blue-400' : 'text-red-500'}
                    `}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                      <Icon name="coin" size={16} className="inline ml-1" />
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
