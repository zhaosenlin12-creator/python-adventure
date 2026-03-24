'use client';

import { useState, useEffect } from 'react';
import { useFoodStore } from '@/store/foodStore';
import { useCoinStore } from '@/store/coinStore';
import { useAuthStore } from '@/store/authStore';
import { FoodIcon } from '@/components/ui/FoodIcon';
import { RARITY_COLORS, RARITY_TEXT } from '@/types/food';
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
      
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="pixel-panel w-full max-w-4xl max-h-[85vh] flex flex-col">
          {/* 头部 */}
          <div className="flex justify-between items-center p-4 border-b border-slate-700">
            <div>
              <h2 className="text-xl font-bold text-white">
                🍖 食物商店
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                用金币购买食物，喂养你的宠物！
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
          
          {/* 稀有度筛选 */}
          <div className="flex gap-2 p-3 border-b border-slate-700 overflow-x-auto">
            {['all', 'common', 'rare', 'epic', 'legendary'].map(rarity => (
              <button
                key={rarity}
                onClick={() => setSelectedRarity(rarity)}
                className={`pixel-btn text-xs px-3 py-1 whitespace-nowrap ${
                  selectedRarity === rarity
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-600'
                }`}
              >
                {rarity === 'all' ? '全部' : RARITY_TEXT[rarity as keyof typeof RARITY_TEXT]}
              </button>
            ))}
          </div>
          
          {/* 食物列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* 加载骨架屏 */}
            {isLoading && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="pixel-panel p-3 animate-pulse">
                    <div className="w-16 h-16 mx-auto mb-2 bg-slate-700 rounded" />
                    <div className="h-4 bg-slate-700 rounded mb-2" />
                    <div className="h-3 bg-slate-700 rounded mb-2 w-2/3 mx-auto" />
                    <div className="h-8 bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredFoods.map(food => {
                    const canBuy = userCoins >= food.price;
                    const rarityColor = RARITY_COLORS[food.rarity];
                    
                    return (
                      <div
                        key={food.id}
                        className={`pixel-panel p-3 ${!canBuy ? 'opacity-50' : ''}`}
                      >
                        <div className="text-center mb-2">
                          <div className="mb-1 flex items-center justify-center">
                            <FoodIcon 
                              foodId={food.id}
                              fallbackEmoji={food.icon}
                              size={64}
                              className="transition-transform duration-200 hover:scale-110"
                            />
                          </div>
                          <div className="font-bold text-sm text-game-light">
                            {food.name}
                          </div>
                          <div className={`text-xs ${rarityColor}`}>
                            {RARITY_TEXT[food.rarity]}
                          </div>
                        </div>
                        
                        <p className="text-xs text-slate-500 mb-2 text-center">
                          {food.description}
                        </p>
                        
                        <div className="text-xs text-center mb-2 space-y-1">
                          {food.effects.hunger && (
                            <div className="text-blue-400">🍖 饱食度 +{food.effects.hunger}</div>
                          )}
                          {food.effects.happiness && (
                            <div className="text-emerald-400">😊 快乐值 +{food.effects.happiness}</div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handlePurchase(food.id, food.price, food.name)}
                          disabled={!canBuy || purchasing === food.id}
                        className={`w-full pixel-btn text-xs py-1 ${
                          canBuy
                            ? 'pixel-btn-success'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {purchasing === food.id ? '购买中...' : `💰 ${food.price} 金币`}
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                {filteredFoods.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    <p className="text-4xl mb-2">🍽️</p>
                    <p className="text-sm">没有找到食物</p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* 底部提示 */}
          <div className="bg-slate-800 border-t border-slate-700 p-3 text-xs text-slate-300">
            <p className="font-bold mb-1">💡 如何获得金币？</p>
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
