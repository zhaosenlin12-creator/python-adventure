'use client';

import { useState, useEffect } from 'react';
import { useFoodStore } from '@/store/foodStore';
import { useCoinStore } from '@/store/coinStore';
import { useAuthStore } from '@/store/authStore';
import { FoodIcon } from '@/components/ui/FoodIcon';
import { RARITY_TEXT } from '@/types/food';
import Toast, { ToastType } from '@/components/ui/Toast';
import { apiRequest, ApiError } from '@/lib/utils/apiRequest';

interface FoodShopProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToastState {
  show: boolean;
  message: string;
  type: ToastType;
}

/**
 * 🍖 食物商店 - 优化版
 */
export default function FoodShop({ isOpen, onClose }: FoodShopProps) {
  const { foodTypes, loadFoodTypes, isLoading: foodLoading } = useFoodStore();
  const { balance: userCoins, loadBalance, isLoading: coinLoading } = useCoinStore();
  const { token } = useAuthStore();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  // 只在首次打开且没有数据时显示加载状态
  const [initialLoading, setInitialLoading] = useState(foodTypes.length === 0);
  
  useEffect(() => {
    if (isOpen && token) {
      // 只有在没有数据时才显示加载状态
      if (foodTypes.length === 0) {
        setInitialLoading(true);
      }
      
      // 后台加载数据
      Promise.all([
        loadBalance(token),
        foodTypes.length === 0 ? loadFoodTypes() : Promise.resolve()
      ]).finally(() => {
        setInitialLoading(false);
      });
    }
  }, [isOpen, token, loadFoodTypes, loadBalance, foodTypes.length]);
  
  // 只有在初始加载且没有数据时才显示骨架屏
  const isLoading = initialLoading && foodTypes.length === 0;
  
  if (!isOpen) return null;
  
  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ show: true, message, type });
  };
  
  const filteredFoods = foodTypes.filter(food => 
    selectedRarity === 'all' || food.rarity === selectedRarity
  );
  
  const handlePurchase = async (foodId: string, price: number, foodName: string) => {
    if (!token) {
      showToast('请先登录', 'error');
      return;
    }
    
    if (userCoins < price) {
      showToast(`金币不足！\n需要 ${price} 金币，当前只有 ${userCoins} 金币\n\n💡 如何获得金币？\n• 完成章节关卡和战役\n• 参与PVP对战获胜\n• 创意工坊发布作品`, 'warning');
      return;
    }
    
    // 防止重复点击
    if (purchasing) {
      return;
    }
    
    try {
      setPurchasing(foodId);
      
      // 使用apiRequest工具，带并发控制和重试机制
      const data = await apiRequest(
        '/food/purchase',
        {
          method: 'POST',
          body: { food_id: foodId, quantity: 1 },
          token,
          timeout: 30000, // 30秒超时
          retries: 2,     // 服务器错误时重试2次
          retryDelay: 1000
        },
        `food-purchase-${foodId}-${Date.now()}` // 使用时间戳确保每次请求唯一
      );
      
      // 显示成功提示（立即反馈）
      showToast(`🎉 购买成功！\n\n获得：${foodName} x1\n花费：${price} 金币\n剩余：${data.remaining_coins} 金币`, 'success');
      
      // 后台刷新余额和食物列表（不阻塞用户操作）
      loadBalance(token).catch(() => {});
      loadFoodTypes().catch(() => {});
      
    } catch (error) {
      console.error('[FoodShop] Purchase error:', error);
      
      // 尝试刷新余额
      try {
        await loadBalance(token);
      } catch {}
      
      // 使用ApiError的辅助方法判断错误类型
      if (error instanceof ApiError) {
        if (error.isNetworkError()) {
          showToast('❌ 购买失败\n\n网络连接失败\n请检查后端服务是否运行\n\n💡 确保后端服务已启动：\npython -m uvicorn app.main:app --reload', 'error');
        } else if (error.isTimeout()) {
          showToast('❌ 购买失败\n\n请求超时\n请检查网络连接或稍后重试', 'error');
        } else {
          showToast(`❌ 购买失败\n\n${error.message}`, 'error');
        }
      } else {
        showToast(`❌ 购买失败\n\n${error instanceof Error ? error.message : '未知错误'}`, 'error');
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
      
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#49372d]/35 px-4 py-6 backdrop-blur-[5px]" role="presentation">
        <div
          className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-[#dec7a5] bg-[linear-gradient(180deg,#fffaf0,#f2e5d1)] shadow-[0_36px_90px_rgba(91,59,35,0.28)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="food-shop-title"
        >
          {/* 头部 */}
          <div className="flex items-start justify-between gap-4 border-b border-[#ead8bd] bg-[linear-gradient(135deg,#fffaf0,#f4e4c8)] p-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e5c77e] bg-[#fff1c8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a722f]">
                🍎 日常补给
              </div>
              <h2 id="food-shop-title" className="mt-2 text-xl font-black text-[#5c4537]">
                食物小铺
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#8d7160]">
                挑一份好吃的，把今天的能量和快乐都补回来。
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-[#e3c997] bg-[#fff2cb] px-3 py-1.5 text-sm font-bold text-[#916a2d]">
                余额 {userCoins} 金币
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e3cdb0] bg-[#fff8ec] text-xl text-[#8a6b57] transition hover:bg-white hover:text-[#5c4537]"
                aria-label="关闭食物商店"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
          
          {/* 稀有度筛选 */}
          <div className="flex gap-2 overflow-x-auto border-b border-[#ead8bd] bg-[#fff7e9] px-5 py-3">
            {['all', 'common', 'rare', 'epic', 'legendary'].map(rarity => (
              <button
                key={rarity}
                type="button"
                onClick={() => setSelectedRarity(rarity)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedRarity === rarity
                    ? 'border-[#8bc7bc] bg-[#dff1e7] text-[#487b6c] shadow-sm'
                    : 'border-[#e6d4bb] bg-white/70 text-[#866b58] hover:bg-white'
                }`}
              >
                {rarity === 'all' ? '全部' : RARITY_TEXT[rarity as keyof typeof RARITY_TEXT]}
              </button>
            ))}
          </div>
          
          {/* 食物列表 */}
          <div className="pet-scrollbar-soft flex-1 overflow-y-auto bg-[#fffaf0] p-4 sm:p-5">
            {/* 加载骨架屏 */}
            {isLoading && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="animate-pulse rounded-[24px] border border-[#ead8bd] bg-[#f7ead7] p-3">
                    <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-[#e5d4bc]" />
                    <div className="mb-2 h-4 rounded bg-[#e5d4bc]" />
                    <div className="mx-auto mb-2 h-3 w-2/3 rounded bg-[#e5d4bc]" />
                    <div className="h-8 rounded-full bg-[#e5d4bc]" />
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {filteredFoods.map(food => {
                    const canBuy = userCoins >= food.price;
                    const rarityTone = {
                      common: 'text-[#7f8d86]',
                      rare: 'text-[#5b94b0]',
                      epic: 'text-[#9b74b4]',
                      legendary: 'text-[#c38b3d]',
                    }[food.rarity] ?? 'text-[#7f8d86]';
                    
                    return (
                      <div
                        key={food.id}
                        className={`rounded-[24px] border p-3 shadow-[0_10px_22px_rgba(128,88,48,0.08)] transition ${
                          canBuy
                            ? 'border-[#e6d2b2] bg-white/75 hover:-translate-y-0.5 hover:border-[#caa977] hover:bg-white'
                            : 'border-[#ead8bd] bg-[#f8efdf]'
                        }`}
                      >
                        <div className="mb-2 text-center">
                          <div className="mb-1 flex h-20 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#fff8e8,#e7f2e8)]">
                            <FoodIcon 
                              foodId={food.id}
                              fallbackEmoji={food.icon}
                              size={64}
                              className="transition-transform duration-200 hover:scale-110"
                            />
                          </div>
                          <div className="text-sm font-black text-[#6b5140]">
                            {food.name}
                          </div>
                          <div className={`text-xs font-semibold ${rarityTone}`}>
                            {RARITY_TEXT[food.rarity]}
                          </div>
                        </div>
                        
                        <p className="mb-2 text-center text-xs leading-5 text-[#8d7160]">
                          {food.description}
                        </p>
                        
                        <div className="mb-3 space-y-1 text-center text-xs">
                          {food.effects.hunger && (
                            <div className="text-[#6c9abb]">🍖 饱食度 +{food.effects.hunger}</div>
                          )}
                          {food.effects.happiness && (
                            <div className="text-[#65a585]">😊 快乐值 +{food.effects.happiness}</div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handlePurchase(food.id, food.price, food.name)}
                          disabled={!canBuy || purchasing === food.id}
                        className={`w-full rounded-full px-3 py-2 text-xs font-bold transition ${
                          canBuy
                            ? 'bg-[#e49b61] text-white shadow-[0_8px_18px_rgba(228,155,97,0.2)] hover:bg-[#d9894c]'
                            : 'cursor-not-allowed bg-[#eadfce] text-[#a18b78]'
                          }`}
                        >
                          {purchasing === food.id ? '正在准备...' : canBuy ? `${food.price} 金币` : `还差 ${food.price - userCoins} 金币`}
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                {filteredFoods.length === 0 && (
                  <div className="py-8 text-center text-[#927866]">
                    <p className="text-4xl mb-2">🍽️</p>
                    <p className="text-sm">没有找到食物</p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* 底部提示 */}
          <div className="border-t border-[#ead8bd] bg-[#f5e8d6] p-4 text-xs text-[#866b58]">
            <p className="mb-1 font-bold text-[#6b5140]">💡 如何获得金币？</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>完成章节关卡和战役模式</li>
              <li>参与PVP对战获胜</li>
              <li>在创意工坊发布关卡，获得点赞和游玩量</li>
              <li>完成每日任务和成就</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
