'use client';

import { useState } from 'react';

/**
 * 支持的图标名称
 */
export type IconName = 'coin' | 'exp' | 'level' | 'settings' | 'close';

/**
 * 图标尺寸
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface IconProps {
  /** 图标名称 */
  name: IconName;
  /** 图标尺寸 */
  size?: IconSize | number;
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onClick?: () => void;
  /** 是否可点击 */
  clickable?: boolean;
}

/**
 * 尺寸映射
 */
const sizeMap: Record<IconSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

/**
 * 获取图标路径
 */
function getIconPath(name: IconName): string {
  return `/icons/ui/${name}.svg`;
}

/**
 * 通用图标组件
 * 
 * 支持动态加载 SVG 图标，提供统一的尺寸和样式控制
 * 
 * @example
 * ```tsx
 * <Icon name="coin" size="md" />
 * <Icon name="exp" size={32} />
 * <Icon name="close" size="sm" clickable onClick={handleClose} />
 * ```
 */
export default function Icon({ 
  name, 
  size = 'md', 
  className = '',
  onClick,
  clickable = false
}: IconProps) {
  const [error, setError] = useState(false);
  
  // 计算实际尺寸
  const actualSize = typeof size === 'number' ? size : sizeMap[size];
  
  // 图标路径
  const iconPath = getIconPath(name);
  
  // 如果加载失败，显示占位符
  if (error) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-gray-700 rounded ${className}`}
        style={{ width: actualSize, height: actualSize }}
      >
        <span className="text-xs text-gray-400">?</span>
      </div>
    );
  }
  
  return (
    <img
      src={iconPath}
      alt={`${name} icon`}
      width={actualSize}
      height={actualSize}
      className={`
        inline-block
        ${clickable || onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${className}
      `}
      onClick={onClick}
      onError={() => setError(true)}
    />
  );
}

/**
 * 图标工具函数
 */
export const IconUtils = {
  /**
   * 获取图标路径
   */
  getPath: getIconPath,
  
  /**
   * 预加载图标
   */
  preload: (names: IconName[]) => {
    names.forEach(name => {
      const img = new Image();
      img.src = getIconPath(name);
    });
  },
  
  /**
   * 获取所有可用图标
   */
  getAllIcons: (): IconName[] => {
    return ['coin', 'exp', 'level', 'settings', 'close'];
  },
};
