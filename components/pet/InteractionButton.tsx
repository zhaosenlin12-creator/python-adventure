'use client';

import { InteractionType, INTERACTION_CONFIGS } from '@/types/interaction';
import { useInteractionStore } from '@/store/interactionStore';
import { playSound } from '@/lib/utils/soundManager';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import InteractionIcon from '@/components/ui/InteractionIcon';

interface InteractionButtonProps {
  petId: number;
  interactionType: InteractionType;
  disabled?: boolean;
  loading?: boolean; // 可选的加载状态覆盖
  error?: string; // 可选的错误消息覆盖
  size?: 'small' | 'medium' | 'large'; // 按钮大小
  showLabel?: boolean; // 小尺寸是否显示文字
  onClickOverride?: () => void | Promise<void>;
}

/**
 * 互动按钮组件
 * 显示互动选项，处理冷却时间，执行互动
 * 
 * 动画特性:
 * - 点击时缩放到0.95
 * - Ripple波纹效果
 * - Hover状态颜色渐变
 * - 流畅的Framer Motion动画
 * - 加载状态旋转图标
 * - 加载时禁用防止重复点击
 * - 错误状态抖动动画
 * - 错误Toast提示
 * - 3秒后自动恢复正常状态
 */
export default function InteractionButton({ 
  petId, 
  interactionType, 
  disabled = false,
  loading: externalLoading,
  error: externalError,
  size = 'medium',
  showLabel = false,
  onClickOverride
}: InteractionButtonProps) {
  const { 
    performInteraction, 
    isOnCooldown, 
    getRemainingTime,
    isLoading: storeLoading,
    error: storeError,
    clearError
  } = useInteractionStore();
  
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const config = INTERACTION_CONFIGS[interactionType];
  const onCooldown = isOnCooldown(interactionType);
  const remaining = getRemainingTime(interactionType);
  const isChat = interactionType === 'chat';
  
  // 加载状态：优先使用外部传入的loading，否则使用store的isLoading
  const isLoadingState = externalLoading !== undefined ? externalLoading : storeLoading;
  
  // 错误状态：优先使用外部传入的error，否则使用store的error
  const errorMessage = externalError || storeError || localError;
  const hasError = !!errorMessage;
  
  const isDisabled = disabled || onCooldown || isLoadingState;
  
  // 监听错误状态变化，触发抖动动画和Toast
  useEffect(() => {
    if (errorMessage) {
      // 触发抖动动画
      setIsShaking(true);
      
      // 显示错误Toast
      import('@/components/ui/ErrorToast').then(({ showErrorToast }) => {
        showErrorToast(errorMessage, 'error');
      });
      
      // 3秒后自动恢复正常状态
      const timer = setTimeout(() => {
        setIsShaking(false);
        setLocalError(null);
        clearError();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [errorMessage, clearError]);
  
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      // 播放点击音效
      playSound('button_click');
      
      // 创建波纹效果
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rippleId = Date.now();
      
      setRipples(prev => [...prev, { id: rippleId, x, y }]);
      
      // 500ms后移除波纹
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== rippleId));
      }, 500);
      
      // 执行互动，捕获错误
      try {
        if (onClickOverride) {
          await onClickOverride();
        } else {
          await performInteraction(petId, interactionType);
        }
      } catch {
        // 错误已经在 store 中统一处理，这里只阻止未捕获异常冒泡到界面
      }
    }
  };
  
  // 根据size计算样式
  const sizeClasses = {
    small: showLabel ? 'w-11 h-[3.75rem] p-1.5' : 'h-9 w-9 p-0',
    medium: 'w-full p-4',
    large: 'w-full p-6'
  };
  
  const iconSizes = {
    small: 22,
    medium: 32,
    large: 40
  };
  
  const textSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };
  const isCompact = size === 'small';
  const compactButtonClass = isChat
    ? 'border-cyan-300/35 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.28),rgba(14,116,144,0.72))] text-white shadow-[0_16px_36px_rgba(6,182,212,0.28)]'
    : 'border-white/10 bg-slate-950/76 text-white shadow-[0_16px_34px_rgba(2,6,23,0.22)]';
  
  return (
    <motion.button
      onClick={handleClick}
      disabled={isDisabled}
      title={config.name}
      aria-label={config.name}
      className={`${isCompact ? '' : 'pixel-btn'} relative overflow-hidden group ${sizeClasses[size]} ${
        isCompact ? 'flex items-center justify-center rounded-full border backdrop-blur-md' : 'text-left'
      } ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : ''
      } ${
        hasError
          ? 'border-red-500 bg-red-900/20'
          : ''
      } ${isCompact ? compactButtonClass : isChat ? 'bg-gradient-to-br from-blue-600 via-teal-500 to-cyan-500 text-white ring-2 ring-blue-500/80 shadow-[0_0_18px_rgba(52,211,153,0.45)]' : 'bg-slate-800 border border-slate-700 shadow-sm'} ${
        isCompact ? 'hover:border-white/20 hover:bg-slate-900/88' : ''
      }`}
      // Framer Motion 动画配置
      whileHover={!isDisabled ? { 
        scale: isCompact ? 1.06 : 1.02,
        background: isChat
          ? 'linear-gradient(135deg, rgba(34,211,238,0.95) 0%, rgba(59,130,246,0.95) 100%)'
          : 'linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.9) 100%)',
        transition: { duration: 0.2 }
      } : {}}
      whileTap={!isDisabled ? { 
        scale: 0.95,
        transition: { duration: 0.1 }
      } : {}}
      initial={{ opacity: 0, y: 12 }}
      animate={isShaking ? {
        x: [0, -10, 10, -10, 10, -5, 5, 0],
        opacity: 1,
        y: 0
      } : {
        x: 0,
        opacity: 1,
        y: 0
      }}
      transition={isShaking ? {
        x: { duration: 0.5 },
        opacity: { duration: 0.25 },
        y: { duration: 0.25 }
      } : { duration: 0.25 }}
    >
      {/* Chat Glow */}
      {isChat && !isDisabled && (
          <motion.span
            className={`absolute inset-0 ${isCompact ? 'rounded-full' : 'rounded-2xl'} bg-cyan-400/10`}
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

      {/* Ripple 波纹效果 */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
          }}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{ 
            width: 300, 
            height: 300, 
            opacity: 0,
            x: -150,
            y: -150
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      ))}
      {!isDisabled && isCompact && (
        <span className="absolute right-1.5 top-1.5 z-10 h-1.5 w-1.5 rounded-full bg-emerald-300/80 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
      )}

      {onCooldown && isCompact && (
        <span className="absolute inset-x-2 bottom-1.5 z-10 rounded-full bg-amber-300/24 px-1 py-0.5 text-center text-[9px] font-semibold text-amber-100">
          {remaining}s
        </span>
      )}

      <div className={`flex items-start gap-3 relative z-10 ${isCompact ? 'flex-col items-center gap-1' : ''}`}>
        {/* 加载图标或互动图标 */}
        {isLoadingState ? (
          <motion.div
            className={isCompact ? 'text-lg' : 'text-3xl'}
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear'
            }}
          >
            ⏳
          </motion.div>
        ) : (
          <motion.div
              className="flex-shrink-0"
              animate={!isDisabled ? {
                scale: isChat ? [1, 1.16, 1] : [1, 1.08, 1],
                y: isCompact ? [0, -1.5, 0] : isChat ? [0, -2, 0] : undefined,
              } : {}}
            transition={{
              duration: isChat ? 1.6 : 2,
              repeat: Infinity,
              repeatDelay: isChat ? 1.2 : 3,
            }}
          >
            <InteractionIcon 
              type={interactionType} 
              size={iconSizes[size]}
              className={`transition-colors duration-200 ${
                isDisabled 
                  ? 'text-gray-500' 
                  : isChat
                    ? 'text-white group-hover:text-white'
                    : 'text-sky-500 group-hover:text-sky-400'
              }`}
            />
          </motion.div>
        )}
        
        {/* 小尺寸文字标签（可选） */}
        {isCompact && showLabel && (
          <div className="mt-0.5 text-[9px] leading-none text-slate-200/90">
            {config.name}
          </div>
        )}

        {/* 文字信息 - 小尺寸时隐藏 */}
        {!isCompact && (
          <div className="flex-1">
            <div className={`font-bold text-game-light mb-1 ${textSizes[size]}`}>
              {config.name}
              {onCooldown && (
                <span className="ml-2 text-xs text-amber-500">
                  ({remaining}秒)
                </span>
              )}
              {isLoadingState && (
                <span className="ml-2 text-xs text-sky-500 animate-pulse">
                  互动中...
                </span>
              )}
            </div>
            <div className={`text-xs text-slate-500 mb-2 ${textSizes[size]}`}>
              {isLoadingState ? '正在与宠物互动，请稍候...' : config.description}
            </div>
          
            {/* 效果预览 */}
            <div className="flex flex-wrap gap-2 text-xs">
              {config.effects.happiness && (
                <motion.span 
                  className="bg-slate-700/80 text-cyan-200 border border-slate-600 px-2 py-1 rounded-lg"
                  whileHover={{ scale: 1.1 }}
                >
                  😊 +{config.effects.happiness}
                </motion.span>
              )}
              {config.effects.intimacy && (
                <motion.span 
                  className="bg-slate-700/80 text-rose-200 border border-slate-600 px-2 py-1 rounded-lg"
                  whileHover={{ scale: 1.1 }}
                >
                  ❤️ +{config.effects.intimacy}
                </motion.span>
              )}
              {config.effects.exp && (
                <motion.span 
                  className="bg-slate-700/80 text-sky-200 border border-slate-600 px-2 py-1 rounded-lg"
                  whileHover={{ scale: 1.1 }}
                >
                  ⭐ +{config.effects.exp} EXP
                </motion.span>
              )}
              {config.effects.attributes?.intelligence && (
                <motion.span 
                  className="bg-slate-700/80 text-indigo-200 border border-slate-600 px-2 py-1 rounded-lg"
                  whileHover={{ scale: 1.1 }}
                >
                  🧠 +{config.effects.attributes.intelligence}
                </motion.span>
              )}
              {config.effects.attributes?.creativity && (
                <motion.span 
                  className="bg-slate-700/80 text-violet-200 border border-slate-600 px-2 py-1 rounded-lg"
                  whileHover={{ scale: 1.1 }}
                >
                  🎨 +{config.effects.attributes.creativity}
                </motion.span>
              )}
              {config.effects.attributes?.persistence && (
                <motion.span 
                  className="bg-slate-700/80 text-amber-200 border border-slate-600 px-2 py-1 rounded-lg"
                  whileHover={{ scale: 1.1 }}
                >
                  💪 +{config.effects.attributes.persistence}
                </motion.span>
              )}
            </div>
          
            <div className="text-xs text-slate-400 mt-2">
              冷却: {config.cooldown}秒
            </div>
          </div>
        )}
      </div>
    </motion.button>
  );
}
