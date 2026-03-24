'use client';

import { useState } from 'react';
import { AgeGroup, AGE_GROUP_INFO } from '@/types/ageGroup';

interface AgeGroupSelectorProps {
  onSelect: (ageGroup: AgeGroup) => void;
  onBack?: () => void;
}

export default function AgeGroupSelector({ onSelect, onBack }: AgeGroupSelectorProps) {
  const [hoveredGroup, setHoveredGroup] = useState<AgeGroup | null>(null);

  const ageGroups: AgeGroup[] = ['primary-lower', 'primary-upper', 'junior-high'];

  const getGroupIcon = (group: AgeGroup) => {
    switch (group) {
      case 'primary-lower':
        return '🌟'; // 星星 - 启蒙
      case 'primary-upper':
        return '🚀'; // 火箭 - 进阶
      case 'junior-high':
        return '💡'; // 灯泡 - 思维
    }
  };

  const getGroupGradient = (group: AgeGroup) => {
    switch (group) {
      case 'primary-lower':
        return 'from-blue-700 via-green-500 to-teal-500';
      case 'primary-upper':
        return 'from-blue-600 via-indigo-500 to-purple-500';
      case 'junior-high':
        return 'from-purple-600 via-violet-500 to-pink-500';
    }
  };

  const getGroupBorder = (group: AgeGroup) => {
    switch (group) {
      case 'primary-lower':
        return 'border-blue-500/50 hover:border-blue-500';
      case 'primary-upper':
        return 'border-blue-400/50 hover:border-blue-300';
      case 'junior-high':
        return 'border-purple-400/50 hover:border-purple-300';
    }
  };

  const getGroupShadow = (group: AgeGroup) => {
    switch (group) {
      case 'primary-lower':
        return 'shadow-blue-500/30';
      case 'primary-upper':
        return 'shadow-blue-500/30';
      case 'junior-high':
        return 'shadow-purple-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] flex flex-col items-center justify-start p-4 relative overflow-y-auto overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.3) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      </div>


      {/* 标题区域 - 移动端适配 */}
      <div className="text-center mb-6 md:mb-8 relative z-10 pt-4 md:pt-8">
        <h1 className="text-2xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-400 to-blue-400 mb-2 md:mb-3">
          🎓 选择你的年龄段
        </h1>
        <p className="text-slate-500 text-xs md:text-base px-4">
          不同年龄段有不同的题目难度和内容
        </p>
      </div>

      {/* 年龄段卡片 - 移动端优化滑动 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl relative z-10 px-4 pb-8" style={{ touchAction: 'pan-y' }}>
        {ageGroups.map((group) => {
          const info = AGE_GROUP_INFO[group];
          const isHovered = hoveredGroup === group;
          
          return (
            <button
              key={group}
              onClick={() => onSelect(group)}
              onMouseEnter={() => setHoveredGroup(group)}
              onMouseLeave={() => setHoveredGroup(null)}
              className={`
                relative overflow-hidden rounded-xl p-5 md:p-6
                bg-slate-800 backdrop-blur-sm
                border-2 border-slate-700 hover:border-blue-500
                transform transition-all duration-300 ease-out
                ${isHovered ? `scale-105 shadow-2xl shadow-blue-900/50` : 'scale-100 shadow-lg'}
                hover:shadow-2xl
                group
              `}
            >
              {/* 顶部渐变条 */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${getGroupGradient(group)}`} />

              {/* 背景光效 */}
              <div className={`
                absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500
                bg-gradient-to-br ${getGroupGradient(group)}
              `} />

              {/* 内容 */}
              <div className="relative z-10">
                {/* 图标 */}
                <div className={`
                  text-5xl md:text-6xl mb-3 
                  transform transition-transform duration-300
                  ${isHovered ? 'scale-110' : 'scale-100'}
                `}>
                  {getGroupIcon(group)}
                </div>
                
                {/* 标题 */}
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                  {info.name}
                </h2>
                
                {/* 年级范围 */}
                <p className="text-slate-500 text-sm mb-3">
                  {info.gradeRange} · {info.ageRange}
                </p>
                
                {/* 描述 */}
                <p className="text-slate-500 text-xs md:text-sm mb-4 line-clamp-2">
                  {info.description}
                </p>
                
                {/* 学科标签 */}
                <div className="flex flex-wrap gap-1.5">
                  {info.subjects.slice(0, 4).map((subject: string) => (
                    <span
                      key={subject}
                      className={`
                        px-2 py-0.5 rounded-full text-xs font-medium
                        bg-blue-900/30 text-slate-600
                        border border-slate-700
                      `}
                    >
                      {subject}
                    </span>
                  ))}
                  {info.subjects.length > 4 && (
                    <span className="px-2 py-0.5 bg-blue-900/30 text-slate-500 rounded-full text-xs border border-slate-700">
                      +{info.subjects.length - 4}
                    </span>
                  )}
                </div>
              </div>

              {/* 选择箭头 */}
              <div className={`
                absolute bottom-4 right-4 
                w-8 h-8 rounded-full
                bg-gradient-to-r ${getGroupGradient(group)}
                flex items-center justify-center
                transform transition-all duration-300
                ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
              `}>
                <span className="text-white text-sm">→</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 返回按钮 - 移动端优化触控 */}
      {onBack && (
        <button
          onClick={onBack}
          className="mt-6 md:mt-8 px-6 py-3 min-h-[48px] min-w-[120px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-800 rounded-lg transition-all border border-slate-700 hover:border-blue-500 shadow-md flex items-center justify-center gap-2 relative z-10 backdrop-blur-sm"
          style={{ touchAction: 'manipulation' }}
        >
          <span>←</span>
          <span>返回</span>
        </button>
      )}

      {/* 底部提示 */}
      <p className="mt-6 text-slate-400 text-xs text-center max-w-md relative z-10">
        提示：每个年龄段的战役进度独立保存，你可以随时切换体验不同难度的挑战
      </p>
    </div>
  );
}
