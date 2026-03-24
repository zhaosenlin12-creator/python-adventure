'use client';

import { useState, useEffect } from 'react';
import { DECORATIONS, RARITY_COLORS, RARITY_TEXT, Decoration } from '@/types/decoration';
import { useDecorationStore } from '@/store/decorationStore';
import { usePetStore } from '@/store/petStore';
import { useCoinStore } from '@/store/coinStore';
import { useAuthStore } from '@/store/authStore';
import { DecorationIcon } from '@/components/ui/DecorationIcon';
import Toast, { ToastType } from '@/components/ui/Toast';
import { apiRequest, ApiError } from '@/lib/utils/apiRequest';

interface DecorationShopProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToastState {
  show: boolean;
  message: string;
  type: ToastType;
}

/**
 * 🏪 装饰品商店 - 优化版
 */
export default function DecorationShop({ isOpen, onClose }: DecorationShopProps) {
  const { currentPet } = usePetStore();
  const { getOwnedQuantity, loadDecorations } = useDecorationStore();
  const { balance: userCoins, loadBalance } = useCoinStore();
  const { token } = useAuthStore();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  
  useEffect(() => {
    if (isOpen && token) {
      loadBalance(token);
    }
  }, [isOpen, token, loadBalance]);
  
  if (!isOpen || !currentPet) return null;
  
  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ show: true, message, type });
  };
  
  const decorations = Object.values(DECORATIONS).filter(d => 
    selectedType === 'all' || d.type === selectedType
  );
  
  const handlePurchase = async (decoration: Decoration) => {
    if (!token) {
      showToast('请先登录', 'error');
      return;
    }
    
    // 检查等级
    if (currentPet.level < decoration.unlockLevel) {
      showToast(`🔒 等级不足\n\n需要等级：Lv.${decoration.unlockLevel}\n当前等级：Lv.${currentPet.level}\n\n💡 完成更多关卡来提升等级！`, 'warning');
      return;
    }
    
    // 检查金币
    if (userCoins < decoration.price) {
      showToast(`💰 金币不足\n\n需要：${decoration.price} 金币\n当前：${userCoins} 金币\n缺少：${decoration.price - userCoins} 金币\n\n💡 如何获得金币？\n• 完成章节关卡和战役\n• 参与PVP对战获胜\n• 创意工坊发布作品`, 'warning');
      return;
    }
    
    // 防止重复点击
    if (purchasing) {
      return;
    }
    
    try {
      setPurchasing(decoration.id);
      
      // 使用apiRequest工具，带并发控制和重试机制
      const data = await apiRequest(
        '/decorations/purchase',  // apiRequest内部已包含/api/v1前缀
        {
          method: 'POST',
          body: { decoration_id: decoration.id },
          token,
          timeout: 30000, // 30秒超时
          retries: 2,     // 服务器错误时重试2次
          retryDelay: 1000
        },
        `decoration-purchase-${decoration.id}-${Date.now()}` // 使用时间戳确保唯一
      );
      
      if (data.success) {
        // 刷新余额和装饰品列表
        await loadBalance(token);
        loadDecorations().catch(() => {});
        
        // 更新本地装饰品状态
        const owned = getOwnedQuantity(decoration.id);
        showToast(`🎉 购买成功！\n\n获得：${decoration.name}\n花费：${decoration.price} 金币\n剩余：${userCoins - decoration.price} 金币\n拥有数量：${owned + 1}`, 'success');
      } else {
        throw new Error('购买失败');
      }
      
    } catch (error) {
      console.error('[DecorationShop] Purchase error:', error);
      
      // 尝试刷新余额
      try {
        await loadBalance(token);
      } catch {}
      
      // 🔒 统一使用 friendlyError 过滤技术性错误信息
      const { toFriendlyMessage } = await import('@/lib/utils/friendlyError');
      if (error instanceof ApiError) {
        if (error.isNetworkError()) {
          showToast('❌ 购买失败\n\n网络连接失败\n请检查网络连接后重试', 'error');
        } else if (error.isTimeout()) {
          showToast('❌ 购买失败\n\n请求超时，请稍后重试', 'error');
        } else {
          showToast(`❌ 购买失败\n\n${toFriendlyMessage(error, '请稍后再试')}`, 'error');
        }
      } else {
        showToast(`❌ 购买失败\n\n${toFriendlyMessage(error, '请稍后再试')}`, 'error');
      }
    } finally {
      setPurchasing(null);
    }
  };
  
  return (
    <>
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
      
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="pixel-panel w-full max-w-4xl max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-slate-700">
            <div>
              <h2 className="text-xl font-bold text-white">
                🏪 装饰品商店
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                装饰你的宠物小屋，让它更温馨！
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-sm font-bold text-amber-300">
                💰 {userCoins} 金币
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 p-3 border-b border-slate-700 overflow-x-auto">
            {['all', 'furniture', 'plant', 'nature', 'toy', 'fun', 'decor'].map(type => {
              const labels: Record<string, string> = {
                all: '全部',
                furniture: '🛋️ 家具',
                plant: '🌱 植物',
                nature: '🌿 自然',
                toy: '🎾 玩具',
                fun: '🎲 趣味',
                decor: '✨ 装饰',
              };
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`pixel-btn text-xs px-3 py-1 whitespace-nowrap ${
                    selectedType === type
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  {labels[type] || type}
                </button>
              );
            })}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {decorations.map(decoration => {
                const owned = getOwnedQuantity(decoration.id);
                const isLocked = currentPet.level < decoration.unlockLevel;
                const canAfford = userCoins >= decoration.price;
                const canBuy = !isLocked && canAfford;
                
                return (
                  <div
                    key={decoration.id}
                    className={`pixel-panel p-3 ${isLocked || !canAfford ? 'opacity-50' : ''}`}
                  >
                    <div className="text-center mb-2">
                      <div className="mb-1 flex items-center justify-center">
                        <DecorationIcon 
                          decorationId={decoration.id}
                          size={64}
                          className="transition-transform duration-200 hover:scale-110"
                        />
                      </div>
                      <div className="font-bold text-sm text-game-light">
                        {decoration.name}
                      </div>
                      <div className={`text-xs ${RARITY_COLORS[decoration.rarity]}`}>
                        {RARITY_TEXT[decoration.rarity]}
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-2 text-center">
                      {decoration.description}
                    </p>
                    
                    {decoration.effect && (
                      <div className="text-xs text-center mb-2">
                        {decoration.effect.happiness && (
                          <span className="text-rose-300">❤️ +{decoration.effect.happiness}</span>
                        )}
                        {decoration.effect.comfort && (
                          <span className="text-sky-300 ml-2">🛋️ +{decoration.effect.comfort}</span>
                        )}
                      </div>
                    )}
                    
                    {owned > 0 && (
                      <div className="text-xs text-center text-sky-300 mb-2">
                        已拥有: {owned}
                      </div>
                    )}
                    
                    {isLocked ? (
                      <div className="text-xs text-center text-red-400 py-1">
                        🔒 Lv.{decoration.unlockLevel} 解锁
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchase(decoration)}
                        disabled={!canBuy || purchasing === decoration.id}
                        className={`w-full pixel-btn text-xs py-1 ${
                          canBuy
                            ? 'pixel-btn-success'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {purchasing === decoration.id ? '购买中...' : `💰 ${decoration.price}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-slate-800 border-t border-slate-700 p-3 text-xs text-slate-300">
            <p className="font-bold mb-1">💡 提示</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>装饰品可以增加宠物的快乐值和舒适度</li>
              <li>完成关卡和任务可以获得金币</li>
              <li>等级提升可以解锁更多装饰品</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
