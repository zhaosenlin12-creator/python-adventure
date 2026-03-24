'use client';

import { useEffect, useState } from 'react';
import { usePetStore } from '@/store/petStore';
import { useAuthStore } from '@/store/authStore';
import { PET_CONFIGS } from '@/types/pet';
import { getPetAnimation, getPetConfig } from '@/lib/config/petAssets';

/**
 * 🏠 宠物家园 - 宠物管理和互动界面
 * 玩家可以在这里查看所有宠物、喂养、互动、玩耍
 */

interface PetHomePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PetHomePanel({ isOpen, onClose }: PetHomePanelProps) {
  const { pets, currentPet, loadPets, feedPet, setCurrentPet, isLoading } = usePetStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedPet, setSelectedPet] = useState<number | null>(null);
  
  useEffect(() => {
    if (isAuthenticated) {
      loadPets();
    }
  }, [isAuthenticated, loadPets]);
  
  const handlePetClick = (petId: number) => {
    setSelectedPet(petId);
  };
  
  const handleFeed = async (petId: number) => {
    if (!isLoading) {
      await feedPet(petId);
    }
  };
  
  const handleSetActive = (petId: number) => {
    const pet = pets.find(p => p.id === petId);
    if (pet) {
      setCurrentPet(pet);
    }
  };
  
  if (!isOpen) return null;
  
  const activePet = selectedPet ? pets.find(p => p.id === selectedPet) : currentPet;
  
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="pixel-panel w-full max-w-5xl h-[80vh] mx-4 flex flex-col">
        {/* 头部 */}
        <div className="bg-slate-700 p-4 border-b-4 border-slate-900 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-game-light pixel-text-shadow">🏠 我的宠物家园</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-game-light text-2xl w-8 h-8"
          >
            ×
          </button>
        </div>
        
        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：宠物列表 */}
          <div className="w-64 bg-slate-800 border-r-4 border-slate-900 overflow-y-auto">
            <div className="p-4 space-y-2">
              <h3 className="text-sm font-bold text-gray-400 mb-3">我的宠物们</h3>
              {pets.map(pet => {
                const petConfig = PET_CONFIGS[pet.petType];
                const isActive = currentPet?.id === pet.id;
                const isSelected = selectedPet === pet.id;
                
                return (
                  <div
                    key={pet.id}
                    onClick={() => handlePetClick(pet.id)}
                    className={`p-3 cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'bg-slate-600 border-game-accent'
                        : 'bg-slate-700 border-slate-600 hover:bg-slate-650'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{petConfig.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-game-light truncate">
                          {pet.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Lv.{pet.level}
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-xs text-green-400">✓ 跟随中</span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {pets.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">还没有宠物</p>
                  <p className="text-xs mt-2">去领养一只吧！</p>
                </div>
              )}
            </div>
          </div>
          
          {/* 右侧：宠物互动区 */}
          <div className="flex-1 flex flex-col bg-slate-800">
            {activePet ? (
              <>
                {/* 宠物展示区 */}
                <div className="flex-1 flex items-center justify-center bg-slate-900/50 relative">
                  {/* 宠物3D展示（这里用大图标代替） */}
                  <div className="text-center">
                    <div className="text-9xl mb-4">
                      {PET_CONFIGS[activePet.petType].icon}
                    </div>
                    <h3 className="text-2xl font-bold text-game-light pixel-text-shadow mb-2">
                      {activePet.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {PET_CONFIGS[activePet.petType].displayName}
                    </p>
                  </div>
                  
                  {/* 状态提示 */}
                  {activePet.status === 'tired' && (
                    <div className="absolute top-4 left-4 bg-yellow-900/80 border-2 border-yellow-700 p-3 max-w-xs">
                      <p className="text-sm text-yellow-300">
                        😴 {activePet.name} 有点累了，记得多陪陪它哦！
                      </p>
                    </div>
                  )}
                  
                  {activePet.status === 'coma' && (
                    <div className="absolute top-4 left-4 bg-red-900/80 border-2 border-red-700 p-3 max-w-xs">
                      <p className="text-sm text-red-300">
                        💀 {activePet.name} 陷入昏迷！快去答题营救它！
                      </p>
                    </div>
                  )}
                </div>
                
                {/* 宠物信息和操作区 */}
                <div className="bg-slate-800 border-t-4 border-slate-900 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* 左侧：属性信息 */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1 text-game-light">
                          <span className="font-medium">等级 {activePet.level}</span>
                          <span className="text-gray-400">
                            {activePet.exp}/100 EXP
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 border-2 border-slate-900">
                          <div
                            className="bg-game-accent h-full transition-all"
                            style={{ width: `${(activePet.exp / 100) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-slate-700 border-2 border-slate-600 p-2 text-center">
                          <div className="text-gray-400">智力</div>
                          <div className="font-bold text-purple-400">{activePet.attributes.intelligence}</div>
                        </div>
                        <div className="bg-slate-700 border-2 border-slate-600 p-2 text-center">
                          <div className="text-gray-400">创造</div>
                          <div className="font-bold text-pink-400">{activePet.attributes.creativity}</div>
                        </div>
                        <div className="bg-slate-700 border-2 border-slate-600 p-2 text-center">
                          <div className="text-gray-400">毅力</div>
                          <div className="font-bold text-blue-400">{activePet.attributes.persistence}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 右侧：互动按钮 */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleFeed(activePet.id)}
                        disabled={isLoading || activePet.status === 'coma'}
                        className="pixel-btn pixel-btn-success text-sm"
                      >
                        🍖 喂食
                      </button>
                      
                      <button
                        className="pixel-btn bg-blue-600 text-white hover:bg-blue-500 text-sm"
                      >
                        🎮 玩耍
                      </button>
                      
                      <button
                        className="pixel-btn bg-purple-600 text-white hover:bg-purple-500 text-sm"
                      >
                        💬 交流
                      </button>
                      
                      <button
                        onClick={() => handleSetActive(activePet.id)}
                        disabled={currentPet?.id === activePet.id}
                        className="pixel-btn bg-green-600 text-white hover:bg-green-500 text-sm disabled:opacity-50"
                      >
                        ✓ 设为跟随
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">选择一只宠物</p>
                  <p className="text-sm">点击左侧列表查看宠物详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
