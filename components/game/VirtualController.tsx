'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { touchInputManager } from '@/lib/input/TouchInputManager';

interface VirtualControllerProps {
  visible?: boolean;
  opacity?: number;
}

/**
 * 虚拟控制器组件
 * 左侧D-Pad方向键 + 右侧动作按钮
 */
export default function VirtualController({ 
  visible = true, 
  opacity = 0.6 
}: VirtualControllerProps) {
  const dpadRef = useRef<HTMLDivElement>(null);
  
  // 注意：不再阻止默认触控行为，允许用户缩放和滑动页面

  // 方向键处理
  const handleDirectionStart = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    touchInputManager.setDirection(direction, true);
  }, []);

  const handleDirectionEnd = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    touchInputManager.setDirection(direction, false);
  }, []);

  // 动作按钮处理
  const handleActionStart = useCallback((action: 'jump' | 'attack' | 'interact' | 'dash') => {
    touchInputManager.setAction(action, true);
  }, []);

  const handleActionEnd = useCallback((action: 'jump' | 'attack' | 'interact' | 'dash') => {
    touchInputManager.setAction(action, false);
  }, []);

  // 清理所有输入
  useEffect(() => {
    return () => {
      touchInputManager.reset();
    };
  }, []);

  if (!visible) return null;

  const buttonStyle = {
    opacity,
    touchAction: 'none' as const,
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    WebkitTouchCallout: 'none' as const,
  };

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50"
      style={{ touchAction: 'none' }}
    >
      {/* 左侧 D-Pad - 放在底部黑色区域 */}
      <div 
        ref={dpadRef}
        className="absolute left-4 bottom-8 pointer-events-auto"
        style={buttonStyle}
      >
        <div className="relative w-36 h-36">
          {/* 上 */}
          <DPadButton
            direction="up"
            className="absolute top-0 left-1/2 -translate-x-1/2"
            onStart={() => handleDirectionStart('up')}
            onEnd={() => handleDirectionEnd('up')}
          />
          {/* 下 */}
          <DPadButton
            direction="down"
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            onStart={() => handleDirectionStart('down')}
            onEnd={() => handleDirectionEnd('down')}
          />
          {/* 左 */}
          <DPadButton
            direction="left"
            className="absolute left-0 top-1/2 -translate-y-1/2"
            onStart={() => handleDirectionStart('left')}
            onEnd={() => handleDirectionEnd('left')}
          />
          {/* 右 */}
          <DPadButton
            direction="right"
            className="absolute right-0 top-1/2 -translate-y-1/2"
            onStart={() => handleDirectionStart('right')}
            onEnd={() => handleDirectionEnd('right')}
          />
          {/* 中心装饰 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gray-700 rounded-full border-2 border-gray-600" />
        </div>
      </div>

      {/* 右侧动作按钮 - 放在底部黑色区域 */}
      <div 
        className="absolute right-4 bottom-4 pointer-events-auto"
        style={buttonStyle}
      >
        <div className="relative w-40 h-40">
          {/* 跳跃按钮 - 上方 */}
          <ActionButton
            label="跳"
            color="green"
            className="absolute top-0 left-1/2 -translate-x-1/2"
            onStart={() => handleActionStart('jump')}
            onEnd={() => handleActionEnd('jump')}
          />
          {/* 攻击按钮 - 右侧 */}
          <ActionButton
            label="攻"
            color="red"
            className="absolute right-0 top-1/2 -translate-y-1/2"
            onStart={() => handleActionStart('attack')}
            onEnd={() => handleActionEnd('attack')}
          />
          {/* 使用/技能按钮 - 左侧 */}
          <ActionButton
            label="用"
            color="yellow"
            className="absolute left-0 top-1/2 -translate-y-1/2"
            onStart={() => handleActionStart('interact')}
            onEnd={() => handleActionEnd('interact')}
          />
          {/* 冲刺按钮 - 下方 */}
          <ActionButton
            label="冲"
            color="blue"
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            onStart={() => handleActionStart('dash')}
            onEnd={() => handleActionEnd('dash')}
          />
        </div>
      </div>
    </div>
  );
}


// D-Pad方向按钮组件
interface DPadButtonProps {
  direction: 'up' | 'down' | 'left' | 'right';
  className?: string;
  onStart: () => void;
  onEnd: () => void;
}

function DPadButton({ direction, className, onStart, onEnd }: DPadButtonProps) {
  const [pressed, setPressed] = React.useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPressed(true);
    onStart();
  }, [onStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPressed(false);
    onEnd();
  }, [onEnd]);

  const arrows: Record<string, string> = {
    up: '▲',
    down: '▼',
    left: '◀',
    right: '▶',
  };

  return (
    <button
      className={`w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all duration-75 ${className}`}
      style={{
        backgroundColor: pressed ? 'rgba(100, 100, 100, 0.9)' : 'rgba(60, 60, 60, 0.8)',
        border: '2px solid rgba(150, 150, 150, 0.5)',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        boxShadow: pressed ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.3)',
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {arrows[direction]}
    </button>
  );
}

// 动作按钮组件
interface ActionButtonProps {
  label: string;
  color: 'green' | 'red' | 'blue' | 'yellow';
  className?: string;
  onStart: () => void;
  onEnd: () => void;
}

function ActionButton({ label, color, className, onStart, onEnd }: ActionButtonProps) {
  const [pressed, setPressed] = React.useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPressed(true);
    onStart();
  }, [onStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPressed(false);
    onEnd();
  }, [onEnd]);

  const colors: Record<string, { bg: string; border: string; pressedBg: string }> = {
    green: {
      bg: 'rgba(34, 197, 94, 0.85)',
      border: 'rgba(187, 247, 208, 0.75)',
      pressedBg: 'rgba(22, 163, 74, 0.95)',
    },
    red: {
      bg: 'rgba(248, 113, 113, 0.82)',
      border: 'rgba(254, 202, 202, 0.72)',
      pressedBg: 'rgba(220, 38, 38, 0.92)',
    },
    blue: {
      bg: 'rgba(56, 189, 248, 0.82)',
      border: 'rgba(186, 230, 253, 0.75)',
      pressedBg: 'rgba(14, 165, 233, 0.94)',
    },
    yellow: {
      bg: 'rgba(250, 204, 21, 0.82)',
      border: 'rgba(254, 240, 138, 0.76)',
      pressedBg: 'rgba(202, 138, 4, 0.94)',
    },
  };

  const colorStyle = colors[color];

  return (
    <button
      className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold transition-all duration-75 ${className}`}
      style={{
        backgroundColor: pressed ? colorStyle.pressedBg : colorStyle.bg,
        border: `3px solid ${colorStyle.border}`,
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        boxShadow: pressed 
          ? 'inset 0 2px 6px rgba(0,0,0,0.55)' 
          : '0 6px 12px rgba(0,0,0,0.28), inset 0 -2px 5px rgba(0,0,0,0.18), 0 0 14px rgba(255,255,255,0.08)',
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

// 导出子组件供自定义使用
export { DPadButton, ActionButton };
