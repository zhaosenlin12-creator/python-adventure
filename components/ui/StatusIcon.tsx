'use client';

type PetStatus = 'normal' | 'tired' | 'coma' | 'egg';
type StatusIconType = 'hungry' | 'happy' | 'tired' | 'sick' | 'coma';

interface StatusIconProps {
  status: PetStatus;
  className?: string;
  size?: number;
  animate?: boolean;
}

/**
 * 状态图标组件
 * 根据宠物状态显示对应的彩色 SVG 图标
 * 支持动画效果
 */
export default function StatusIcon({ 
  status, 
  className = '', 
  size = 20,
  animate = false
}: StatusIconProps) {
  const iconType = mapStatusToIcon(status);
  const animationClass = animate ? getAnimationClass(iconType) : '';
  
  return (
    <img 
      src={`/icons/status/${iconType}.svg`}
      alt={getStatusLabel(status)}
      width={size}
      height={size}
      className={`inline-block ${animationClass} ${className}`}
      style={{ imageRendering: 'auto' }}
    />
  );
}

/**
 * 将宠物状态映射到图标类型
 */
function mapStatusToIcon(status: PetStatus): StatusIconType {
  const mapping: Record<PetStatus, StatusIconType> = {
    'normal': 'happy',    // 正常状态 -> 快乐图标
    'tired': 'tired',     // 疲惫状态 -> 疲惫图标
    'coma': 'coma',       // 昏迷状态 -> 昏迷图标
    'egg': 'happy'        // 蛋状态 -> 快乐图标（默认）
  };
  return mapping[status] || 'happy';
}

/**
 * 获取状态对应的动画类名
 */
function getAnimationClass(type: StatusIconType): string {
  const animations: Record<StatusIconType, string> = {
    'happy': 'animate-heartbeat',
    'hungry': 'animate-blink',
    'sick': 'animate-shake',
    'tired': 'animate-pulse',
    'coma': 'animate-spin-slow'
  };
  return animations[type] || '';
}

/**
 * 获取状态标签
 */
function getStatusLabel(status: PetStatus): string {
  const labels: Record<PetStatus, string> = {
    'normal': '健康',
    'tired': '疲惫',
    'coma': '昏迷',
    'egg': '蛋'
  };
  return labels[status] || status;
}
