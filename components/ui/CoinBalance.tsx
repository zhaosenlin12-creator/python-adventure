'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

interface CoinBalanceProps {
  /** 初始金币数量 */
  initialCoins?: number;
  /** 是否显示动画 */
  animated?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 点击事件 */
  onClick?: () => void;
}

/**
 * 金币余额显示组件
 */
export default function CoinBalance({ 
  initialCoins = 0, 
  animated = true,
  size = 'md',
  onClick 
}: CoinBalanceProps) {
  const [coins, setCoins] = useState(initialCoins);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 监听金币变化
  useEffect(() => {
    if (initialCoins !== coins) {
      if (animated) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
      }
      setCoins(initialCoins);
    }
  }, [initialCoins, animated, coins]);
  
  // 格式化金币数字(添加千位分隔符)
  const formatCoins = (amount: number): string => {
    return amount.toLocaleString('zh-CN');
  };
  
  // 尺寸样式
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2'
  };
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  return (
    <div
      className={`
        pixel-panel bg-amber-900/30 border-amber-500/30
        flex items-center gap-2
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:bg-amber-800/30 transition-colors' : ''}
        ${isAnimating ? 'animate-pulse' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* 金币图标 */}
      <Icon 
        name="coin" 
        size={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
        className="flex-shrink-0"
      />
      
      {/* 金币数量 */}
      <span className={`
        font-bold text-amber-400
        ${isAnimating ? 'scale-110' : 'scale-100'}
        transition-transform duration-300
      `}>
        {formatCoins(coins)}
      </span>
    </div>
  );
}

/**
 * 简化版金币显示(仅图标+数字,无边框)
 */
export function CoinBalanceSimple({ 
  coins = 0,
  size = 'md'
}: { 
  coins?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };
  
  return (
    <div className="flex items-center gap-1.5">
      <Icon 
        name="coin" 
        size={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
      />
      <span className={`${textSizes[size]} font-bold text-amber-400`}>
        {coins.toLocaleString('zh-CN')}
      </span>
    </div>
  );
}
