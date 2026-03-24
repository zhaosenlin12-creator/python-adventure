'use client';

import { useState, memo, useCallback, useEffect, useRef } from 'react';
import { useFoodStore } from '@/store/foodStore';
import { useAuthStore } from '@/store/authStore';
import { usePetStore } from '@/store/petStore';
import FoodInventory from './FoodInventory';
import { FoodInventoryItem } from '@/types/food';
import { RARITY_COLORS, RARITY_BORDER_COLORS } from '@/types/food';
import { FoodIcon } from '@/components/ui/FoodIcon';
import { playSound } from '@/lib/utils/soundManager';

interface FoodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  petId: number;
}
const FEED_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * 🔍 食物预览组件
 * 显示食物的详细信息和快捷使用按钮
 */
interface FoodPreviewProps {
  food: FoodInventoryItem;
  onUse: () => void;
  isUsing: boolean;
}

const FoodPreview = memo(({ food, onUse, isUsing }: FoodPreviewProps) => {
  const rarityColor = RARITY_COLORS[food.food_type.rarity];
  const rarityBorder = RARITY_BORDER_COLORS[food.food_type.rarity];
  
  return (
    <div className="p-4 border-t border-slate-700">
      {/* 食物大图预览 */}
      <div className={`bg-slate-700 border ${rarityBorder} rounded-lg p-6 mb-4 transition-all duration-300 hover:scale-105 shadow-sm`}>
        {/* 食物图标和基本信息 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="animate-bounce">
            <FoodIcon 
              foodId={food.food_id}
              fallbackEmoji={food.food_type.icon}
              size={64}
            />
          </div>
          <div className="flex-1">
            <div className={`font-bold text-xl mb-1 ${rarityColor}`}>
              {food.food_type.name}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              {food.food_type.rarity}
            </div>
            <div className="text-sm text-slate-500 mt-2">
              {food.food_type.description}
            </div>
          </div>
        </div>
        
        {/* 效果详情 */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-white border-b border-slate-600 pb-2">
            📊 效果详情
          </div>
          
          {food.food_type.effects.hunger && (
            <div className="flex items-center justify-between bg-slate-800/85 border border-slate-700 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍖</span>
                <span className="text-slate-400">饱食度</span>
              </div>
              <span className="text-emerald-400 font-bold text-lg">
                +{food.food_type.effects.hunger}
              </span>
            </div>
          )}
          
          {food.food_type.effects.happiness && (
            <div className="flex items-center justify-between bg-slate-800/85 border border-slate-700 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">😊</span>
                <span className="text-slate-400">快乐值</span>
              </div>
              <span className="text-emerald-400 font-bold text-lg">
                +{food.food_type.effects.happiness}
              </span>
            </div>
          )}
          
          {food.food_type.effects.intelligence && (
            <div className="flex items-center justify-between bg-slate-800/85 border border-slate-700 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <span className="text-slate-400">智力</span>
              </div>
              <span className="text-sky-400 font-bold text-lg">
                +{food.food_type.effects.intelligence}
              </span>
            </div>
          )}
          
          {food.food_type.effects.creativity && (
            <div className="flex items-center justify-between bg-slate-800/85 border border-slate-700 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎨</span>
                <span className="text-slate-400">创造力</span>
              </div>
              <span className="text-indigo-300 font-bold text-lg">
                +{food.food_type.effects.creativity}
              </span>
            </div>
          )}
          
          {food.food_type.effects.persistence && (
            <div className="flex items-center justify-between bg-slate-800/85 border border-slate-700 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">💪</span>
                <span className="text-slate-400">毅力</span>
              </div>
              <span className="text-cyan-400 font-bold text-lg">
                +{food.food_type.effects.persistence}
              </span>
            </div>
          )}
        </div>
        
        {/* 库存信息 */}
          <div className="mt-4 pt-4 border-t border-slate-600">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">当前库存</span>
            <span className="text-white font-bold text-lg">
              × {food.quantity}
            </span>
          </div>
        </div>
      </div>
      
      {/* 快捷使用按钮 */}
      <button
        onClick={onUse}
        disabled={isUsing}
        className="w-full pixel-btn bg-sky-700 hover:bg-sky-600 text-white text-lg py-3 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {isUsing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            喂食中...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            🍖 立即使用
          </span>
        )}
      </button>
    </div>
  );
});

FoodPreview.displayName = 'FoodPreview';

/**
 * 🍖 食物选择器弹窗
 * 让用户选择食物喂养宠物
 * 
 * 性能优化:
 * - 使用React.memo避免不必要的重渲染
 * - 使用useCallback优化回调函数
 * - 移除未使用的变量
 */
function FoodSelector({ isOpen, onClose, petId }: FoodSelectorProps) {
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  
  const { inventory, loadInventory } = useFoodStore();
  const { token } = useAuthStore();
  const { feedPet, loadPets } = usePetStore();
  
  // 仅在打开面板时加载一次，避免死循环
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    if (isOpen && token) {
      // 如果刚打开面板，或者之前没有加载过
      if (!hasLoadedRef.current) {
        // 使用缓存策略，避免重复请求导致卡顿
        loadInventory(token);
        hasLoadedRef.current = true;
      }
    } else {
      // 关闭时重置加载标记，以便下次打开时重新加载
      hasLoadedRef.current = false;
    }
  }, [isOpen, token, loadInventory]);
  
  // 使用useCallback优化回调函数
  const handleSelectFood = useCallback((foodId: string) => {
    setSelectedFoodId(foodId);
  }, []);
  
  const handleClose = useCallback(() => {
    onClose();
    setSelectedFoodId(null);
    setFeedbackMessage(null);
  }, [onClose]);
  
  const handleFeed = useCallback(async () => {
    if (!selectedFoodId || !token) return;
    
    // 找到选中的食物获取效果
    const selectedFood = inventory.find(item => item.food_id === selectedFoodId);
    if (!selectedFood) {
      setFeedbackMessage('❌ 食物不存在，请重新选择');
      return;
    }
    
    try {
      setIsFeeding(true);
      setFeedbackMessage(null);
      
      // 1. 直接喂养（后端原子性扣减库存并计算效果）
      await withTimeout(
        feedPet(petId, { foodId: selectedFoodId, quantity: 1 }),
        FEED_TIMEOUT_MS,
        '请求超时，请稍后重试'
      );
      
      // 3. 播放喂食音效
      playSound('pet_eat');
      
      // 4. 显示成功反馈
      setFeedbackMessage('✅ 喂食成功！你的伙伴很开心！');
      
      // 5. 后台刷新宠物数据
      loadPets().catch(() => {});

      // 6. 后台刷新库存（不阻塞UI）
      loadInventory(token, true).catch(() => {});
      
      // 7. 1.2秒后关闭弹窗
      setTimeout(() => {
        handleClose();
      }, 1200);
      
    } catch (error) {
      console.error('Failed to feed pet:', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      
      // 友好的错误提示
      if (errorMsg.includes('Not enough') || errorMsg.includes('库存不足')) {
        setFeedbackMessage('❌ 这个食物已经用完了，请选择其他食物');
        // 刷新库存
        loadInventory(token, true);
      } else if (errorMsg.includes('网络') || errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        setFeedbackMessage('❌ 网络异常，请稍后重试');
      } else if (errorMsg.includes('timeout') || errorMsg.includes('aborted') || errorMsg.includes('超时')) {
        setFeedbackMessage('❌ 网络超时，请稍后重试');
      } else {
        setFeedbackMessage(`❌ 喂食失败：${errorMsg}`);
      }
    } finally {
      setIsFeeding(false);
    }
  }, [selectedFoodId, token, inventory, feedPet, petId, loadPets, loadInventory, handleClose]);
  
  if (!isOpen) return null;
  
  const selectedFood = inventory.find(item => item.food_id === selectedFoodId);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="pixel-panel w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">
            🍖 选择食物
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>
        
        {/* 食物背包 */}
        <FoodInventory
          onSelectFood={handleSelectFood}
          selectedFoodId={selectedFoodId || undefined}
        />
        
        {/* 反馈消息 */}
        {feedbackMessage && (
          <div className={`
            mx-4 mt-4 p-3 text-sm border rounded-lg animate-pulse
            ${feedbackMessage.startsWith('✅') 
              ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/30 border-red-500/40 text-red-300'
            }
          `}>
            {feedbackMessage}
          </div>
        )}
        
        {/* 食物预览组件 */}
        {selectedFood && (
          <FoodPreview
            food={selectedFood}
            onUse={handleFeed}
            isUsing={isFeeding}
          />
        )}
        
        {/* 提示信息 */}
        {inventory.length === 0 && (
          <div className="p-4 border-t border-slate-700">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 text-sm text-slate-200">
              <div className="font-bold mb-3 text-base">🍽️ 当前没有食物</div>
              
              <div className="mb-3">
                <div className="font-semibold mb-2">💰 购买食物：</div>
                <div className="text-xs bg-slate-900 border border-slate-600 p-2 rounded text-slate-300">
                  点击宠物家园顶部的 <span className="font-bold text-sky-300">🍖 食物商店</span> 按钮，用金币购买食物
                </div>
              </div>
              
              <div>
                <div className="font-semibold mb-2">🪙 获得金币：</div>
                <ul className="space-y-1 text-xs">
                  <li>• 完成章节关卡和战役模式</li>
                  <li>• 参与PVP对战获胜</li>
                  <li>• 在创意工坊发布关卡</li>
                  <li>• 完成每日任务和成就</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 导出memo包装的组件
export default memo(FoodSelector);
