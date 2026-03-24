'use client';

import { X } from 'lucide-react';

interface PetGrowthGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PetGrowthGuide({ isOpen, onClose }: PetGrowthGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden bg-slate-800 backdrop-blur-md border-2 border-slate-700 rounded-2xl shadow-xl">
        <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">🐾 宠物成长说明</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 text-sm space-y-4 overflow-y-auto max-h-[70vh]">
          {/* 核心属性提升 */}
          <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/30 border-2 border-amber-500/40 rounded-xl p-5 shadow-lg">
            <h3 className="text-amber-300 font-bold mb-3 text-base flex items-center gap-2">
              🎯 核心属性如何提升
            </h3>
            <ul className="space-y-2.5 text-amber-50/90">
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold">❤️</span>
                <span><span className="text-red-300 font-semibold">亲密度</span>：通过【抚摸/交流/聊天/训练/洗澡】提升；喂食也会有基础亲密度加成。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">🧠</span>
                <span><span className="text-blue-300 font-semibold">智力</span>：通过【读书/训练】或带智力加成的食物提升（如：鱼、星星饼干、神秘礼盒）。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">🎨</span>
                <span><span className="text-purple-300 font-semibold">创造力</span>：通过【画画/训练】或带创造力加成的食物提升（如：彩虹糖果、神秘礼盒）。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">💪</span>
                <span><span className="text-green-300 font-semibold">毅力</span>：通过【玩耍/训练】或带毅力加成的食物提升（如：肉、能量饮料、神秘礼盒）。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 font-bold">⭐</span>
                <span><span className="text-yellow-300 font-semibold">经验</span>：互动与喂食都会带来经验，等级提升将解锁更高进化阶段。</span>
              </li>
            </ul>
          </div>

          {/* 互动冷却 */}
          <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/30 border-2 border-blue-500/40 rounded-xl p-5 shadow-lg">
            <h3 className="text-cyan-300 font-bold mb-3 text-base flex items-center gap-2">
              ⏱ 互动冷却 & 日上限（防刷数值）
            </h3>
            <ul className="space-y-2.5 text-cyan-50/90">
              <li>每种互动都有独立冷却时间（按钮上会显示）。</li>
              <li>每日互动收益上限：<span className="text-cyan-300 font-semibold">亲密度 50 / 智力 10 / 创造力 10 / 毅力 10 / 经验 60 / 快乐值 80</span>。</li>
              <li>达到上限后仍可互动，但数值收益会暂停（保持陪伴体验）。</li>
            </ul>
          </div>

          {/* 进化成长 */}
          <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 border-2 border-purple-500/40 rounded-xl p-5 shadow-lg">
            <h3 className="text-pink-300 font-bold mb-3 text-base flex items-center gap-2">
              🚀 进化与长期成长
            </h3>
            <ul className="space-y-2.5 text-pink-50/90">
              <li>进化条件基于<span className="text-pink-300 font-semibold">等级 + 亲密度 + 核心属性</span>。</li>
              <li>建议：<span className="text-pink-300 font-semibold">每日互动 + 合理喂食 + 完成学习关卡</span>，持续成长更稳定。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
