'use client';

import { useState } from 'react';
import { useDecorationStore } from '@/store/decorationStore';
import { DECORATIONS } from '@/types/decoration';
import { DecorationIcon } from '@/components/ui/DecorationIcon';

interface MyWardrobeProps {
  isOpen: boolean;
  onClose: () => void;
  scene: 'living' | 'garden';
  onPlaceDecoration: (decorationId: string) => void;
}

/**
 * 我的衣柜 - 侧边栏装饰品选择器
 * 点击装饰品后可以拖拽到场景中
 */
export default function MyWardrobe({ isOpen, onClose, scene, onPlaceDecoration }: MyWardrobeProps) {
  const { ownedDecorations } = useDecorationStore();
  const [selectedDecoration, setSelectedDecoration] = useState<string | null>(null);
  
  if (!isOpen) return null;
  
  // 过滤有库存的装饰品
  const availableDecorations = ownedDecorations.filter(d => d.quantity > 0);
  
  const handleDecorationClick = (decorationId: string) => {
    setSelectedDecoration(decorationId);
    onPlaceDecoration(decorationId);
  };
  
  return (
    <>
      {/* 模糊背景 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />
      
      {/* 侧边栏 */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900/95 border-l-2 border-slate-700 z-[9999] shadow-2xl animate-slideInRight">
        {/* 头部 */}
        <div className="flex justify-between items-center p-4 border-b-2 border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👔</span>
            <h3 className="text-lg font-bold text-white">我的衣柜</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white text-xl font-bold transition-all hover:scale-110"
          >
            ×
          </button>
        </div>
        
        {/* 提示 */}
        <div className="p-3 bg-blue-900/30 border-b-2 border-blue-700 text-xs text-blue-300">
          💡 点击装饰品，然后在场景中点击位置放置
        </div>
        
        {/* 装饰品列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {availableDecorations.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">📦</div>
              <p>衣柜空空如也</p>
              <p className="text-xs mt-1">去商店购买装饰品吧！</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableDecorations.map(owned => {
                const decoration = DECORATIONS[owned.decorationId];
                if (!decoration) return null;
                
                const isSelected = selectedDecoration === owned.decorationId;
                
                return (
                  <button
                    key={owned.decorationId}
                    onClick={() => handleDecorationClick(owned.decorationId)}
                    className={`
                      p-3 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'bg-blue-600/30 border-blue-400 scale-105' 
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
                      }
                    `}
                  >
                    {/* 装饰品图标 */}
                    <div className="flex justify-center mb-2">
                      <DecorationIcon 
                        decorationId={owned.decorationId}
                        size={48}
                        className="transition-transform duration-200 hover:scale-110"
                      />
                    </div>
                    
                    {/* 装饰品名称 */}
                    <div className="text-xs font-bold text-white text-center mb-1">
                      {decoration.name}
                    </div>
                    
                    {/* 数量 */}
                    <div className="text-xs text-green-400 text-center">
                      x{owned.quantity}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        {/* 底部提示 */}
        <div className="p-3 bg-slate-800/50 border-t-2 border-slate-700 text-xs text-gray-400">
          <p>💡 提示：</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>点击装饰品选择</li>
            <li>在场景中点击放置</li>
            <li>长按装饰品可移除</li>
          </ul>
        </div>
      </div>
    </>
  );
}
