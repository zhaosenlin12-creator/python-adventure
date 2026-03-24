'use client';

import { useState, useEffect } from 'react';
import { usePetStore } from '@/store/petStore';
import { useInteractionStore } from '@/store/interactionStore';
import { InteractionType } from '@/types/interaction';
import PetHomeSceneV3 from './PetHomeScene-v3';
import InteractionButton from './InteractionButton';
import DecorationShop from './DecorationShop';
import PetChatModal from './PetChatModal';

interface PetHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INTERACTION_TYPES: InteractionType[] = ['pat', 'play', 'talk', 'train', 'read', 'paint', 'chat', 'bath'];

export default function PetHomeModal({ isOpen, onClose }: PetHomeModalProps) {
  const { currentPet } = usePetStore();
  const { lastMessage } = useInteractionStore();
  const [activeTab, setActiveTab] = useState<'home' | 'decorations'>('home');
  const [showDialogue, setShowDialogue] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showPetChat, setShowPetChat] = useState(false);
  
  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // 显示对话气泡
  useEffect(() => {
    if (lastMessage) {
      setShowDialogue(true);
      const timer = setTimeout(() => {
        setShowDialogue(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);
  
  // 🐾 控制开放世界中的宠物跟随显示/隐藏
  useEffect(() => {
    if (isOpen) {
      // 打开宠物小屋时，隐藏开放世界中的宠物跟随
      window.dispatchEvent(new CustomEvent('pet-home-opened'));
    } else {
      // 关闭宠物小屋时，显示开放世界中的宠物跟随
      window.dispatchEvent(new CustomEvent('pet-home-closed'));
    }
  }, [isOpen]);
  
  if (!isOpen || !currentPet) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="pixel-panel w-[90vw] h-[85vh] max-w-5xl max-h-[700px] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 超大关闭按钮 - 右上角 */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-[10000] pixel-btn bg-slate-700 hover:bg-red-600 text-white font-bold px-6 py-3 text-lg shadow-2xl border border-slate-500"
          title="关闭并返回游戏"
        >
          ✕ 关闭
        </button>
        
        {/* 头部 - 优化间距 */}
        <div className="flex justify-between items-center p-3 border-b-2 border-slate-700 relative z-10">
          <h2 className="text-xl font-bold text-game-light pixel-text-shadow">
            🏠 {currentPet.name}的小屋
          </h2>
        </div>
        
        {/* 标签页 - 优化尺寸 */}
        <div className="flex border-b-2 border-slate-700">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === 'home'
                ? 'bg-slate-700 text-game-light'
                : 'text-gray-400 hover:text-game-light'
            }`}
          >
            🏠 家园
          </button>
          <button
            onClick={() => setActiveTab('decorations')}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === 'decorations'
                ? 'bg-slate-700 text-game-light'
                : 'text-gray-400 hover:text-game-light'
            }`}
          >
            🎨 装饰
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* 场景区域 */}
          <div className="flex-1 relative">
            {activeTab === 'home' && (
              <>
                <PetHomeSceneV3 isOpen={isOpen} onClose={onClose} />
                
                {/* 对话气泡 - 优化尺寸 */}
                {showDialogue && lastMessage && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 animate-fadeIn">
                    <div className="bg-slate-900/95 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl border-2 border-slate-600 max-w-sm">
                      <p className="text-base font-bold text-center">{lastMessage}</p>
                      <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {activeTab === 'decorations' && (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6">
                <div className="text-center mb-6">
                  <p className="text-lg mb-3 text-slate-200">🎨 装饰你的宠物小屋</p>
                  <p className="text-xs text-slate-400">让你的宠物生活得更舒适温馨！</p>
                </div>
                
                <button
                  onClick={() => setShowShop(true)}
                  className="pixel-btn bg-sky-700 hover:bg-sky-600 text-white px-6 py-3 text-base"
                >
                  🏪 打开装饰品商店
                </button>
                
                <div className="mt-6 bg-slate-800/80 border border-slate-600 p-3 text-xs text-slate-200 max-w-md rounded-lg">
                  <p className="font-bold mb-1">💡 即将推出</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>家具、植物、玩具等装饰品</li>
                    <li>自由放置和移动装饰品</li>
                    <li>装饰品提供属性加成</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          {/* 互动面板 - 优化宽度 */}
          {activeTab === 'home' && (
            <div className="w-72 bg-slate-800 border-l-2 border-slate-700 p-3 overflow-y-auto">
              <h3 className="text-base font-bold text-game-light mb-3 pixel-text-shadow">
                互动选项
              </h3>
              
              <div className="space-y-2">
                {INTERACTION_TYPES.map(type => (
                  <InteractionButton
                    key={type}
                    petId={currentPet.id}
                    interactionType={type}
                    onClickOverride={type === 'chat' ? () => setShowPetChat(true) : undefined}
                  />
                ))}
              </div>
              
              {/* 提示信息 - 优化尺寸 */}
              <div className="mt-4 bg-slate-800/80 border border-slate-600 p-2 text-[10px] text-slate-200 rounded-lg">
                <p className="font-bold mb-1">💡 互动提示</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>每种互动都有冷却时间</li>
                  <li>互动可以增加宠物属性</li>
                  <li>多和宠物互动可以提升亲密度</li>
                  <li>宠物会随机回应你的互动</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 装饰品商店弹窗 */}
      <DecorationShop
        isOpen={showShop}
        onClose={() => setShowShop(false)}
      />

      {/* 宠物聊天弹窗 */}
      <PetChatModal
        isOpen={showPetChat}
        onClose={() => setShowPetChat(false)}
        petId={currentPet.id}
        petName={currentPet.name}
      />
    </div>
  );
}
