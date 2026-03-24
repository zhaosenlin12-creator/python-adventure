'use client';

import { useEffect, memo, useCallback, useState, useRef } from 'react';
import { useFoodStore } from '@/store/foodStore';
import { useAuthStore } from '@/store/authStore';
import { RARITY_COLORS, RARITY_BG_COLORS, RARITY_BORDER_COLORS } from '@/types/food';
import type { FoodInventoryItem } from '@/types/food';
import { FoodIcon } from '@/components/ui/FoodIcon';

interface FoodInventoryProps {
  onSelectFood?: (foodId: string) => void;
  selectedFoodId?: string;
}

/**
 * 🍖 骨架屏加载组件
 */
const FoodItemSkeleton = memo(() => (
  <div className="bg-slate-700 border-2 border-slate-600 p-3 text-center animate-pulse rounded-xl">
    <div className="w-8 h-8 bg-slate-700 rounded mx-auto mb-2"></div>
    <div className="h-3 bg-slate-700 rounded mb-1"></div>
    <div className="h-4 bg-slate-700 rounded w-12 mx-auto"></div>
  </div>
));
FoodItemSkeleton.displayName = 'FoodItemSkeleton';

/**
 * 🍖 单个食物项组件 (使用React.memo优化)
 */
interface FoodItemProps {
  item: FoodInventoryItem;
  isSelected: boolean;
  onSelect: (foodId: string) => void;
  isFocused?: boolean;
}

const FoodItem = memo(({ item, isSelected, onSelect, isFocused }: FoodItemProps) => {
  const rarityColor = RARITY_COLORS[item.food_type.rarity];
  const rarityBg = RARITY_BG_COLORS[item.food_type.rarity];
  const rarityBorder = RARITY_BORDER_COLORS[item.food_type.rarity];
  
  const handleClick = useCallback(() => {
    onSelect(item.food_id);
  }, [item.food_id, onSelect]);
  
  return (
    <button
      onClick={handleClick}
      className={`
        ${rarityBg} ${rarityBorder}
        border-2 p-3 text-center
        relative
        transition-all duration-200
        ${isSelected 
          ? 'scale-105 ring-2 ring-blue-500 border-blue-500 shadow-lg shadow-blue-500/50' 
          : 'hover:scale-105'
        }
        ${isFocused ? 'ring-2 ring-yellow-400' : ''}
      `}
    >
      {/* 选中复选标记 */}
      {isSelected && (
        <div className="absolute top-1 right-1 bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center animate-scale-in">
          <svg 
            className="w-4 h-4 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={3} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
      )}
      
      {/* 食物图标 - 使用SVG图标 */}
      <div className="mb-2 flex items-center justify-center">
        <FoodIcon 
          foodId={item.food_id}
          fallbackEmoji={item.food_type.icon}
          size={48}
          className="transition-transform duration-200"
        />
      </div>
      
      {/* 食物名称 */}
      <div className={`text-xs font-bold ${rarityColor} mb-1`}>
        {item.food_type.name}
      </div>
      
      {/* 数量 */}
      <div className="text-sm font-bold text-game-light">
        ×{item.quantity}
      </div>
      
      {/* 效果预览 */}
      <div className="text-xs text-slate-500 mt-2 space-y-1">
        {item.food_type.effects.hunger && (
          <div>🍖 +{item.food_type.effects.hunger}</div>
        )}
        {item.food_type.effects.happiness && (
          <div>😊 +{item.food_type.effects.happiness}</div>
        )}
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在这些属性变化时重新渲染
  return (
    prevProps.item.food_id === nextProps.item.food_id &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFocused === nextProps.isFocused
  );
});
FoodItem.displayName = 'FoodItem';

/**
 * 🍖 食物背包组件
 * 显示用户拥有的所有食物
 * 
 * 性能优化:
 * - 使用React.memo避免不必要的重渲染
 * - 添加骨架屏加载状态
 * - 优化图片懒加载
 * - 使用useCallback优化回调函数
 * 
 * 交互优化:
 * - 选中高亮效果(蓝色边框,缩放动画)
 * - 选中复选标记图标
 * - 键盘导航支持(方向键选择)
 */
function FoodInventory({ onSelectFood, selectedFoodId }: FoodInventoryProps) {
  const { inventory, foodTypes, isLoading, loadInventory, loadFoodTypes } = useFoodStore();
  const { token } = useAuthStore();
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [initialLoading, setInitialLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    // 只在首次加载或数据为空时请求
    if (token && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setInitialLoading(true);
      
      Promise.all([
        inventory.length === 0 ? loadInventory(token) : Promise.resolve(),
        foodTypes.length === 0 ? loadFoodTypes() : Promise.resolve()
      ]).finally(() => {
        setInitialLoading(false);
      });
    } else if (inventory.length > 0) {
      // 已有缓存数据，直接显示
      setInitialLoading(false);
    }
  }, [token, inventory.length, foodTypes.length, loadInventory, loadFoodTypes]);
  
  // 使用useCallback优化回调函数
  const handleSelectFood = useCallback((foodId: string) => {
    onSelectFood?.(foodId);
  }, [onSelectFood]);
  
  // 键盘导航处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inventory.length === 0) return;
      
      const cols = 3; // 每行3个
      const rows = Math.ceil(inventory.length / cols);
      
      let newIndex = focusedIndex;
      
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          newIndex = Math.min(focusedIndex + 1, inventory.length - 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = Math.max(focusedIndex - 1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newIndex = Math.min(focusedIndex + cols, inventory.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newIndex = Math.max(focusedIndex - cols, 0);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < inventory.length) {
            handleSelectFood(inventory[focusedIndex].food_id);
          }
          break;
        default:
          return;
      }
      
      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex);
        // 滚动到可见区域
        const element = containerRef.current?.children[newIndex] as HTMLElement;
        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, inventory, handleSelectFood]);
  
  // 初始化焦点
  useEffect(() => {
    if (inventory.length > 0 && focusedIndex === -1) {
      setFocusedIndex(0);
    }
  }, [inventory.length, focusedIndex]);
  
  // 骨架屏加载状态（仅在首次且无缓存时显示）
  if ((isLoading || initialLoading) && inventory.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-3 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <FoodItemSkeleton key={index} />
        ))}
      </div>
    );
  }
  
  // 空状态
  if (inventory.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-4xl mb-4">🍽️</div>
        <div className="text-gray-400 mb-2">背包空空如也</div>
        <div className="text-sm text-gray-500">
          完成关卡、PvP对战或创意工坊可以获得食物！
        </div>
      </div>
    );
  }
  
  // 使用普通网格布局（优化后的版本）
  // 对于大列表，浏览器的原生滚动已经足够高效
  // React.memo 和 useCallback 已经提供了足够的性能优化
  return (
    <div>
      {/* 键盘导航提示 */}
      <div className="px-4 pt-4 pb-2 text-xs text-gray-400 flex items-center gap-2">
        <span>💡</span>
        <span>使用方向键导航，Enter/空格选择</span>
      </div>
      
      <div 
        ref={containerRef}
        className="grid grid-cols-3 gap-3 p-4 max-h-[500px] overflow-y-auto"
      >
        {inventory.map((item, index) => (
          <FoodItem
            key={item.food_id}
            item={item}
            isSelected={selectedFoodId === item.food_id}
            isFocused={focusedIndex === index}
            onSelect={handleSelectFood}
          />
        ))}
      </div>
    </div>
  );
}

// 导出memo包装的组件
export default memo(FoodInventory);
