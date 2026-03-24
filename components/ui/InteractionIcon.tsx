'use client';

import { InteractionType } from '@/types/interaction';

interface InteractionIconProps {
  type: InteractionType;
  className?: string;
  size?: number;
}

/**
 * 互动图标组件
 * 根据互动类型显示对应的 SVG 图标
 */
export default function InteractionIcon({ 
  type, 
  className = '', 
  size = 24 
}: InteractionIconProps) {
  const iconProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className
  };

  switch (type) {
    case 'pat':
      // 抚摸 - 使用手掌图标
      return (
        <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
        </svg>
      );

    case 'play':
      // 玩耍 - 使用球图标
      return (
        <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8"/>
          <path d="M12 4v16"/>
          <path d="M4 12h16"/>
          <path d="M7.5 7.5l9 9"/>
          <path d="M7.5 16.5l9-9"/>
        </svg>
      );

    case 'talk':
      // 交流 - 使用对话气泡图标
      return (
        <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <circle cx="9" cy="10" r="1"/>
          <circle cx="12" cy="10" r="1"/>
          <circle cx="15" cy="10" r="1"/>
        </svg>
      );

    case 'train':
      // 训练 - 使用哑铃图标
      return (
        <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="10" width="3" height="4" rx="1"/>
          <rect x="18" y="10" width="3" height="4" rx="1"/>
          <line x1="6" y1="12" x2="18" y2="12"/>
          <path d="M2 7l2 2"/>
          <path d="M2 17l2-2"/>
          <path d="M20 7l2 2"/>
          <path d="M20 17l2-2"/>
        </svg>
      );

    case 'read':
      // 读书 - 使用书本图标
      return (
        <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 0-2 2z"/>
          <path d="M14 3h6a2 2 0 0 1 2 2v18a2 2 0 0 0-2-2h-6z"/>
          <line x1="12" y1="3" x2="12" y2="21"/>
        </svg>
      );

    case 'paint':
      // 画画 - 使用调色盘图标
      return (
        <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-1a5 5 0 1 1 0-10"/>
          <circle cx="7.5" cy="9" r="1.5"/>
          <circle cx="10.5" cy="6.5" r="1.5"/>
          <circle cx="14.5" cy="6.5" r="1.5"/>
          <circle cx="17" cy="9" r="1.5"/>
        </svg>
      );

    case 'chat':
      // 聊天 - 使用双气泡图标
      return (
        <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z"/>
          <path d="M17 17v1a2 2 0 0 1-2 2H7"/>
        </svg>
      );

    case 'bath':
      // 洗澡 - 使用淋浴图标
      return (
        <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7h7a4 4 0 0 1 4 4v8"/>
          <path d="M7 7V4a2 2 0 0 1 2-2h3"/>
          <path d="M14 15h6a2 2 0 0 0 2-2V9"/>
          <path d="M18 11h4"/>
          <path d="M18 5h4"/>
        </svg>
      );

    default:
      // 默认图标
      return (
        <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      );
  }
}
