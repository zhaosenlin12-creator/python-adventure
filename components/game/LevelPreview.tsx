'use client';

/**
 * 🎮 关卡预览组件
 * 展示关卡详情和难度信息
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LevelPreviewData {
  id: string;
  name: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  objectives?: string[];
  rewards?: {
    xp: number;
    coins: number;
    items?: string[];
  };
  timeLimit?: number;
  bestTime?: number;
  completed?: boolean;
  locked?: boolean;
  thumbnail?: string;
}

interface LevelPreviewProps {
  level: LevelPreviewData;
  isOpen: boolean;
  onClose: () => void;
  onStart?: () => void;
}

const difficultyConfig = {
  easy: { label: '简单', color: 'bg-green-500', stars: 1 },
  medium: { label: '中等', color: 'bg-yellow-500', stars: 2 },
  hard: { label: '困难', color: 'bg-orange-500', stars: 3 },
  expert: { label: '专家', color: 'bg-red-500', stars: 4 },
};

export function LevelPreview({ level, isOpen, onClose, onStart }: LevelPreviewProps) {
  const difficulty = difficultyConfig[level.difficulty];
  
  const formattedTime = useMemo(() => {
    if (!level.timeLimit) return null;
    const minutes = Math.floor(level.timeLimit / 60);
    const seconds = level.timeLimit % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [level.timeLimit]);
  
  const formattedBestTime = useMemo(() => {
    if (!level.bestTime) return null;
    const minutes = Math.floor(level.bestTime / 60);
    const seconds = level.bestTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [level.bestTime]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-slate-800 backdrop-blur-md rounded-2xl p-6 max-w-md w-full mx-4 border-2 border-slate-700 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{level.name}</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Thumbnail */}
            {level.thumbnail && (
              <div className="relative h-40 rounded-lg overflow-hidden mb-4 bg-gray-700">
                <img 
                  src={level.thumbnail} 
                  alt={level.name}
                  className="w-full h-full object-cover"
                />
                {level.completed && (
                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            )}
            
            {/* Difficulty */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`${difficulty.color} px-3 py-1 rounded-full text-sm font-medium text-white`}>
                {difficulty.label}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < difficulty.stars ? 'text-yellow-400' : 'text-gray-600'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            
            {/* Description */}
            {level.description && (
              <p className="text-slate-300 text-sm mb-4">{level.description}</p>
            )}
            
            {/* Objectives */}
            {level.objectives && level.objectives.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-500 mb-2">🎯 目标</h3>
                <ul className="space-y-1">
                  {level.objectives.map((obj, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="text-blue-400">•</span>
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Time Info */}
            {(formattedTime || formattedBestTime) && (
              <div className="flex gap-4 mb-4">
                {formattedTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">⏱️ 时限:</span>
                    <span className="text-white font-mono">{formattedTime}</span>
                  </div>
                )}
                {formattedBestTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">🏆 最佳:</span>
                    <span className="text-yellow-400 font-mono">{formattedBestTime}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Rewards */}
            {level.rewards && (
              <div className="bg-blue-900/30 rounded-lg p-3 mb-4 border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-500 mb-2">🎁 奖励</h3>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-purple-400">✨</span>
                    <span className="text-white font-medium">{level.rewards.xp} XP</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">🪙</span>
                    <span className="text-white font-medium">{level.rewards.coins}</span>
                  </div>
                  {level.rewards.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-green-400">📦</span>
                      <span className="text-white text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              disabled={level.locked}
              className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                level.locked
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : level.completed
                  ? 'bg-gradient-to-r from-green-500 to-blue-700 text-white hover:shadow-lg hover:shadow-green-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:shadow-lg hover:shadow-blue-500/30'
              }`}
            >
              {level.locked ? '🔒 未解锁' : level.completed ? '▶️ 再次挑战' : '▶️ 开始挑战'}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing level preview state
export function useLevelPreview() {
  const [selectedLevel, setSelectedLevel] = useState<LevelPreviewData | null>(null);
  
  const openPreview = (level: LevelPreviewData) => setSelectedLevel(level);
  const closePreview = () => setSelectedLevel(null);
  
  return {
    selectedLevel,
    isOpen: selectedLevel !== null,
    openPreview,
    closePreview,
  };
}
