'use client';

import { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { AlertTriangle } from 'lucide-react';

interface AnimatedStatusValueProps {
  value: number;
  label: string;
  color: string;
  icon?: string;
}

interface FloatingNumber {
  id: number;
  value: number;
  isPositive: boolean;
}

// 警告提示文案
const WARNING_MESSAGES: Record<string, { low: string; critical: string }> = {
  '智力': {
    low: '智力有点低了，多做题提升吧！',
    critical: '智力严重不足！快去学习！'
  },
  '创造力': {
    low: '创造力下降了，去创作点什么吧！',
    critical: '创造力告急！需要激发灵感！'
  },
  '毅力': {
    low: '毅力不足，坚持锻炼吧！',
    critical: '毅力耗尽！快去休息恢复！'
  }
};

export default function AnimatedStatusValue({ 
  value, 
  label, 
  color,
  icon 
}: AnimatedStatusValueProps) {
  const [prevValue, setPrevValue] = useState(value);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [nextId, setNextId] = useState(0);

  // 数字滚动动画
  const { number } = useSpring({
    from: { number: prevValue },
    number: value,
    config: { duration: 800 }
  });

  useEffect(() => {
    if (prevValue !== value) {
      const diff = value - prevValue;
      
      // 添加浮动数字
      if (diff !== 0) {
        const newFloating: FloatingNumber = {
          id: nextId,
          value: Math.abs(diff),
          isPositive: diff > 0
        };
        
        setFloatingNumbers(prev => [...prev, newFloating]);
        setNextId(prev => prev + 1);
        
        // 800ms后移除浮动数字
        setTimeout(() => {
          setFloatingNumbers(prev => prev.filter(f => f.id !== newFloating.id));
        }, 800);
      }
      
      setPrevValue(value);
    }
  }, [value, prevValue, nextId]);

  // 根据颜色类名提取对应的文本颜色
  const getTextColor = (bgColor: string): string => {
    if (bgColor.includes('purple')) return 'text-purple-400';
    if (bgColor.includes('pink')) return 'text-pink-400';
    if (bgColor.includes('blue')) return 'text-blue-400';
    if (bgColor.includes('orange')) return 'text-orange-400';
    if (bgColor.includes('yellow')) return 'text-yellow-400';
    if (bgColor.includes('green')) return 'text-green-400';
    return 'text-gray-400';
  };

  const textColor = getTextColor(color);
  
  // 判断警告级别
  const isLowStatus = value < 30;
  const isCriticalStatus = value < 10;
  const showWarning = isLowStatus || isCriticalStatus;
  
  // 获取警告提示文案
  const warningMessage = isCriticalStatus 
    ? WARNING_MESSAGES[label]?.critical 
    : WARNING_MESSAGES[label]?.low;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* 图标 - 更大更突出 */}
        {icon && (
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
            <span className="text-lg">{icon}</span>
          </div>
        )}
        <div className="flex-1">
          {/* 标签 - 使用状态颜色 */}
          <div className={`text-xs font-medium mb-1 ${textColor} flex items-center gap-1`}>
            {label}
            {/* 警告图标 */}
            {showWarning && (
              <AlertTriangle 
                className={`w-3 h-3 ${
                  isCriticalStatus 
                    ? 'text-red-500 animate-pulse' 
                    : 'text-yellow-500'
                }`}
                style={isCriticalStatus ? {
                  animation: 'blink 0.5s ease-in-out infinite'
                } : undefined}
              />
            )}
          </div>
          {/* 状态条 - 增加高度和边框 */}
          <div className="w-full bg-slate-700 h-3 border-2 border-slate-900 relative overflow-visible rounded-sm">
            <div
              className={`${color} h-full transition-all duration-300 rounded-sm`}
              style={{ 
                width: `${Math.min(100, Math.max(0, value))}%`,
                imageRendering: 'pixelated',
                boxShadow: value > 0 ? '0 0 8px rgba(255, 255, 255, 0.3)' : 'none'
              }}
            />
          </div>
          {/* 警告提示文案 */}
          {showWarning && warningMessage && (
            <div className={`text-xs mt-1 ${
              isCriticalStatus ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {warningMessage}
            </div>
          )}
        </div>
        {/* 数值 - 使用状态颜色 */}
        <animated.div className={`text-sm font-bold min-w-[3ch] text-right ${textColor}`}>
          {number.to(n => Math.floor(n))}
        </animated.div>
      </div>
      
      {/* 浮动数字 */}
      {floatingNumbers.map(floating => (
        <FloatingNumberDisplay
          key={floating.id}
          value={floating.value}
          isPositive={floating.isPositive}
        />
      ))}
      
      {/* 闪烁动画样式 */}
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function FloatingNumberDisplay({ 
  value, 
  isPositive 
}: { 
  value: number; 
  isPositive: boolean;
}) {
  const styles = useSpring({
    from: { 
      opacity: 1, 
      transform: 'translate(0px, 0px) scale(1)' 
    },
    to: { 
      opacity: 0, 
      transform: `translate(${isPositive ? '20px' : '-20px'}, -30px) scale(1.2)` 
    },
    config: { duration: 800 }
  });

  return (
    <animated.div
      style={styles}
      className={`absolute right-0 top-0 font-bold text-sm pointer-events-none ${
        isPositive ? 'text-green-400' : 'text-red-400'
      }`}
    >
      {isPositive ? '+' : '-'}{value}
    </animated.div>
  );
}
