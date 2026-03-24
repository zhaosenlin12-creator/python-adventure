'use client';

/**
 * 📊 进度可视化组件
 * 展示玩家整体进度和统计数据
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface CampaignProgress {
  id: string;
  name: string;
  totalLevels: number;
  completedLevels: number;
  color: string;
}

interface ProgressVisualizationProps {
  playerLevel: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  totalPlayTime?: number; // in minutes
  campaignProgress: CampaignProgress[];
  achievements?: {
    total: number;
    unlocked: number;
  };
  className?: string;
}

// 动画进度条
function AnimatedProgressBar({ 
  value, 
  max, 
  color = 'blue',
  showLabel = true,
  height = 'h-3'
}: { 
  value: number; 
  max: number; 
  color?: string;
  showLabel?: boolean;
  height?: string;
}) {
  const percent = Math.min((value / max) * 100, 100);
  
  const colorClasses = {
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-green-600',
    purple: 'from-purple-400 to-purple-600',
    orange: 'from-orange-400 to-orange-600',
    red: 'from-red-400 to-red-600',
    yellow: 'from-yellow-400 to-yellow-600',
    pink: 'from-pink-400 to-pink-600',
    cyan: 'from-cyan-400 to-cyan-600',
  };
  
  return (
    <div className="relative w-full">
      <div className={`${height} bg-gray-700 rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} rounded-full`}
        />
      </div>
      {showLabel && (
        <div className="absolute right-0 top-0 -mt-5 text-xs text-gray-400">
          {Math.round(percent)}%
        </div>
      )}
    </div>
  );
}

// 统计卡片
function StatCard({ 
  icon, 
  label, 
  value, 
  subValue,
  color = 'blue'
}: { 
  icon: string; 
  label: string; 
  value: string | number;
  subValue?: string;
  color?: string;
}) {
  const bgColors = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${bgColors[color as keyof typeof bgColors]} border rounded-xl p-3`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-xs text-gray-400">{label}</div>
          <div className="text-lg font-bold text-white">{value}</div>
          {subValue && <div className="text-xs text-gray-500">{subValue}</div>}
        </div>
      </div>
    </motion.div>
  );
}

export function ProgressVisualization({
  playerLevel,
  xp,
  xpToNextLevel,
  coins,
  totalPlayTime,
  campaignProgress,
  achievements,
  className = '',
}: ProgressVisualizationProps) {
  // 计算总体进度
  const overallProgress = useMemo(() => {
    const totalLevels = campaignProgress.reduce((sum, c) => sum + c.totalLevels, 0);
    const completedLevels = campaignProgress.reduce((sum, c) => sum + c.completedLevels, 0);
    return totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;
  }, [campaignProgress]);
  
  // 格式化游戏时间
  const formattedPlayTime = useMemo(() => {
    if (!totalPlayTime) return null;
    const hours = Math.floor(totalPlayTime / 60);
    const minutes = totalPlayTime % 60;
    return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  }, [totalPlayTime]);

  return (
    <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 ${className}`}>
      {/* Header - Player Level */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-1"
            >
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{playerLevel}</span>
              </div>
            </motion.div>
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full px-2 py-0.5 text-xs font-bold">
              LV
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">玩家等级</h2>
            <div className="text-sm text-gray-400">
              {xp} / {xpToNextLevel} XP
            </div>
          </div>
        </div>
      </div>
      
      {/* XP Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">经验进度</span>
          <span className="text-purple-400">{xp} / {xpToNextLevel}</span>
        </div>
        <AnimatedProgressBar value={xp} max={xpToNextLevel} color="purple" showLabel={false} height="h-4" />
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon="🪙" label="金币" value={coins.toLocaleString()} color="yellow" />
        <StatCard 
          icon="🏆" 
          label="成就" 
          value={achievements ? `${achievements.unlocked}/${achievements.total}` : '-'} 
          color="purple" 
        />
        <StatCard 
          icon="📊" 
          label="总进度" 
          value={`${Math.round(overallProgress)}%`} 
          color="blue" 
        />
        {formattedPlayTime && (
          <StatCard icon="⏱️" label="游戏时长" value={formattedPlayTime} color="green" />
        )}
      </div>
      
      {/* Campaign Progress */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">🗺️ 战役进度</h3>
        <div className="space-y-3">
          {campaignProgress.map((campaign, index) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 rounded-lg p-3"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-white font-medium">{campaign.name}</span>
                <span className="text-xs text-gray-400">
                  {campaign.completedLevels}/{campaign.totalLevels}
                </span>
              </div>
              <AnimatedProgressBar 
                value={campaign.completedLevels} 
                max={campaign.totalLevels} 
                color={campaign.color as any}
                showLabel={false}
                height="h-2"
              />
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Overall Progress Ring */}
      <div className="mt-6 flex justify-center">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#374151"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <motion.circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 251.2' }}
              animate={{ strokeDasharray: `${overallProgress * 2.512} 251.2` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-white">{Math.round(overallProgress)}%</span>
            <span className="text-xs text-gray-400">完成</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 紧凑版进度条（用于头部显示）
export function CompactProgressBar({
  level,
  xp,
  xpToNextLevel,
  coins,
}: {
  level: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
}) {
  return (
    <div className="flex items-center gap-4 bg-gray-800/80 backdrop-blur-sm rounded-full px-4 py-2">
      {/* Level Badge */}
      <div className="flex items-center gap-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{level}</span>
        </div>
      </div>
      
      {/* XP Bar */}
      <div className="flex-1 max-w-32">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(xp / xpToNextLevel) * 100}%` }}
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
          />
        </div>
      </div>
      
      {/* Coins */}
      <div className="flex items-center gap-1">
        <span className="text-yellow-400">🪙</span>
        <span className="text-sm font-medium text-white">{coins}</span>
      </div>
    </div>
  );
}
