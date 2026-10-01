'use client';

import { useState, useEffect } from 'react';
import { DECORATIONS, RARITY_TEXT, Decoration } from '@/types/decoration';
import { useDecorationStore } from '@/store/decorationStore';
import { usePetStore } from '@/store/petStore';
import { useCoinStore } from '@/store/coinStore';
import { useAuthStore } from '@/store/authStore';
import { DecorationIcon, hasGeneratedDecorationArt } from '@/components/ui/DecorationIcon';
import Toast, { ToastType } from '@/components/ui/Toast';
import { apiRequest, ApiError } from '@/lib/utils/apiRequest';
import { Coins, LockKeyhole, ShoppingBag, Sparkles } from 'lucide-react';

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
      showToast(`等级不足\n\n需要等级：Lv.${decoration.unlockLevel}\n当前等级：Lv.${currentPet.level}\n\n完成更多关卡可以提升等级。`, 'warning');
      return;
    }
    
    // 检查金币
    if (userCoins < decoration.price) {
      showToast(`金币不足\n\n需要：${decoration.price} 金币\n当前：${userCoins} 金币\n缺少：${decoration.price - userCoins} 金币\n\n完成关卡、战役和创作任务可以获得金币。`, 'warning');
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
        showToast(`购买成功\n\n获得：${decoration.name}\n花费：${decoration.price} 金币\n剩余：${userCoins - decoration.price} 金币\n拥有数量：${owned + 1}`, 'success');
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
          showToast('购买失败\n\n网络连接失败，请检查网络后重试。', 'error');
        } else if (error.isTimeout()) {
          showToast('购买失败\n\n请求超时，请稍后重试。', 'error');
        } else {
          showToast(`购买失败\n\n${toFriendlyMessage(error, '请稍后再试')}`, 'error');
        }
      } else {
        showToast(`购买失败\n\n${toFriendlyMessage(error, '请稍后再试')}`, 'error');
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
      
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#3a2b25]/42 p-3 backdrop-blur-[5px] sm:p-5">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="decoration-shop-title"
          className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-[#e4cda9] bg-[#f7f0e4] text-[#4e3b31] shadow-[0_28px_80px_rgba(67,46,31,0.28)]"
        >
          <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-[#f8d9a2]/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-[#b9e2d1]/38 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 border-b border-[#e6d6bf] bg-[linear-gradient(135deg,#fffaf0_0%,#f9f0df_58%,#f4e4c8_100%)] px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ae7336]">
                <Sparkles className="h-3.5 w-3.5 text-[#e5a83b]" />
                温馨家居市场
              </div>
              <h2 id="decoration-shop-title" className="mt-1 flex items-center gap-2 text-xl font-black text-[#4e3428] sm:text-2xl">
                <ShoppingBag className="h-5 w-5 text-[#78a99b]" />
                小屋装饰商店
              </h2>
              <p className="mt-1 text-xs text-[#80695c]">
                先挑喜欢的家具，再带回小屋陪宠物一起布置。
              </p>
            </div>
            
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 rounded-full border border-[#ebc86c] bg-[#fff5ce] px-3 py-2 text-sm font-black text-[#78511f] shadow-[0_6px_16px_rgba(194,142,54,0.12)]">
                <Coins className="h-4 w-4 text-[#d7952e]" />
                {userCoins} 金币
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfcfb8] bg-[#fffaf2] text-xl text-[#836e61] shadow-[0_5px_12px_rgba(92,64,44,0.08)] transition hover:border-[#caa77c] hover:bg-white hover:text-[#4e3428]"
                aria-label="关闭装饰商店"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="relative flex gap-2 overflow-x-auto border-b border-[#e6d6bf] bg-[#fffaf3]/72 px-4 py-3 sm:px-6">
            {['all', 'furniture', 'plant', 'nature', 'toy', 'fun', 'decor'].map(type => {
              const labels: Record<string, string> = {
                all: '全部',
                furniture: '家具',
                plant: '植物',
                nature: '自然',
                toy: '玩具',
                fun: '趣味',
                decor: '装饰',
              };
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                    selectedType === type
                      ? 'border-[#8db9a7] bg-[#dcefe4] text-[#416f5d] shadow-[0_6px_14px_rgba(88,147,122,0.14)]'
                      : 'border-[#e3d3bd] bg-[#fffaf2] text-[#80695c] hover:border-[#cda879] hover:bg-white'
                  }`}
                >
                  {labels[type] || type}
                </button>
              );
            })}
          </div>
          
          <div className="relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fbf6ec_0%,#f5ecdf_100%)] px-4 py-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {decorations.map(decoration => {
                const owned = getOwnedQuantity(decoration.id);
                const isLocked = currentPet.level < decoration.unlockLevel;
                const canAfford = userCoins >= decoration.price;
                const canBuy = !isLocked && canAfford;
                const rarityClass = {
                  common: 'border-[#dfc8a5] bg-[#fff6e7] text-[#9a6b36]',
                  rare: 'border-[#b7d9cd] bg-[#e5f4ed] text-[#4d846c]',
                  epic: 'border-[#e1c0cf] bg-[#f8e5ed] text-[#9f5975]',
                  legendary: 'border-[#d5c0e8] bg-[#f0e5f8] text-[#79539b]',
                }[decoration.rarity];
                
                return (
                  <div
                    key={decoration.id}
                    className={`group relative overflow-hidden rounded-[24px] border p-3 transition ${
                      isLocked
                        ? 'border-[#e3d9cb] bg-[#f5f0e8]'
                        : 'border-[#ead8bd] bg-[#fffdf8] shadow-[0_8px_18px_rgba(102,72,45,0.07)] hover:-translate-y-0.5 hover:border-[#d5b37e] hover:shadow-[0_16px_28px_rgba(102,72,45,0.13)]'
                    }`}
                  >
                    <div className="mb-2 text-center">
                      <div className="mb-3 flex items-center justify-center">
                        <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-[20px] border border-[#eedfc8] bg-[radial-gradient(circle_at_32%_18%,rgba(255,255,255,0.96),transparent_33%),linear-gradient(155deg,#fffaf0,#edf5ed)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                          <span className="absolute bottom-3 h-3 w-20 rounded-full bg-[#9d7d63]/16 blur-md" />
                          <span className="absolute left-6 top-3 h-8 w-14 rounded-full bg-white/65 blur-lg" />
                          <DecorationIcon
                            decorationId={decoration.id}
                            size={82}
                            className="relative z-[1] transition-transform duration-200 group-hover:scale-105"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-center text-sm font-black text-[#563d31]">
                        {decoration.name}
                        {hasGeneratedDecorationArt(decoration.id) && (
                          <span className="rounded-full border border-[#d7c39c] bg-[#fff4d3] px-1.5 py-0.5 text-[9px] font-bold text-[#9b7039]">
                            童话风
                          </span>
                        )}
                      </div>
                      <div className={`mx-auto mt-1 w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold ${rarityClass}`}>
                        {RARITY_TEXT[decoration.rarity]}
                      </div>
                    </div>
                    
                    <p className="mb-3 min-h-8 text-center text-xs leading-4 text-[#8a7568]">
                      {decoration.description}
                    </p>
                    
                    {decoration.effect && (
                      <div className="mb-3 flex min-h-5 items-center justify-center gap-1 text-center text-xs">
                        {decoration.effect.happiness && (
                          <span className="rounded-full bg-[#fde7e5] px-2 py-0.5 font-bold text-[#b76263]">快乐 +{decoration.effect.happiness}</span>
                        )}
                        {decoration.effect.comfort && (
                          <span className="rounded-full bg-[#e4f0f5] px-2 py-0.5 font-bold text-[#56819a]">舒适 +{decoration.effect.comfort}</span>
                        )}
                      </div>
                    )}
                    
                    {owned > 0 && (
                      <div className="mb-2 text-center text-xs font-bold text-[#5d8c77]">
                        已拥有 · {owned}
                      </div>
                    )}
                    
                    {isLocked ? (
                      <div className="flex items-center justify-center gap-1.5 rounded-full border border-[#edcbb6] bg-[#fff0e5] py-2 text-xs font-bold text-[#a5674f]">
                        <LockKeyhole className="h-3.5 w-3.5 text-[#c18162]" />
                        Lv.{decoration.unlockLevel} 解锁
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchase(decoration)}
                        disabled={!canBuy || purchasing === decoration.id}
                        aria-label={`购买${decoration.name}，${decoration.price}金币`}
                        className={`w-full rounded-full border py-2 text-xs font-black transition ${
                          canBuy
                            ? 'border-[#d9ad55] bg-[#f6c96b] text-[#68471e] shadow-[0_6px_12px_rgba(196,142,48,0.16)] hover:bg-[#f8d37e]'
                            : 'cursor-not-allowed border-[#dfd6ca] bg-[#f0ebe4] text-[#9b8b7d]'
                        }`}
                      >
                        {purchasing === decoration.id ? '购买中...' : canAfford ? `${decoration.price} 金币` : `还差 ${decoration.price - userCoins} 金币`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="relative border-t border-[#e6d6bf] bg-[#fffaf2] px-4 py-3 text-xs text-[#80695c] sm:px-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="font-black text-[#a56e31]">小屋提示</span>
              <span>装饰会提升快乐和舒适度</span>
              <span>购买后可在衣柜中点击放置</span>
              <span>等级提升会解锁更多风格</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
