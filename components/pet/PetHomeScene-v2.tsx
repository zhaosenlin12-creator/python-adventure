'use client';

import { useState, useEffect, useRef } from 'react';
import { usePetStore } from '@/store/petStore';
import { useDecorationStore } from '@/store/decorationStore';
import { useCoinStore } from '@/store/coinStore';
import { PET_CONFIGS } from '@/types/pet';
import { DECORATIONS } from '@/types/decoration';
import { getPetAnimation, getPetConfig } from '@/lib/config/petAssets';
import './pet-home-animations.css';
import DecorationShop from './DecorationShop';
import MyWardrobe from './MyWardrobe';

interface PetHomeSceneProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * 🏠 宠物家园场景 V2 - 优化版
 * 
 * 改进点：
 * 1. 宠物居中显示，可以自由走动
 * 2. 移除下方大片空白区域
 * 3. 全屏游戏体验
 * 4. 更好的装饰品布置空间
 */
export default function PetHomeSceneV2({ isOpen, onClose }: PetHomeSceneProps) {
  const { currentPet } = usePetStore();
  const { placedDecorations, loadDecorations, placeDecoration } = useDecorationStore();
  const { balance: userCoins, loadBalance } = useCoinStore();
  const [currentScene, setCurrentScene] = useState<'living' | 'garden'>('living');
  const [showShop, setShowShop] = useState(false);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [placingDecoration, setPlacingDecoration] = useState<string | null>(null);
  
  // 加载金币余额
  useEffect(() => {
    if (isOpen !== false) {
      const token = localStorage.getItem('token');
      if (token) {
        loadBalance(token);
      }
    }
  }, [isOpen, loadBalance]);
  
  // 宠物位置和移动
  const [petPosition, setPetPosition] = useState({ x: 50, y: 50 }); // 百分比位置
  const [petDirection, setPetDirection] = useState<'left' | 'right'>('right');
  const [isWalking, setIsWalking] = useState(false);
  const walkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 加载装饰品数据
  useEffect(() => {
    if (isOpen !== false && currentPet) {
      loadDecorations();
    }
  }, [isOpen, currentPet, loadDecorations]);
  
  // 处理装饰品放置
  const handleSceneClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingDecoration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // 放置装饰品
    await placeDecoration(placingDecoration, x, y, currentScene);
    setPlacingDecoration(null);
  };
  
  // 处理衣柜选择装饰品
  const handleSelectDecoration = (decorationId: string) => {
    setPlacingDecoration(decorationId);
    setShowWardrobe(false);
  };
  
  // 宠物随机走动
  useEffect(() => {
    if (isOpen === false || !currentPet) return;
    
    const startRandomWalk = () => {
      walkIntervalRef.current = setInterval(() => {
        // 30%概率开始走动
        if (Math.random() < 0.3) {
          setIsWalking(true);
          
          // 随机目标位置（保持在安全区域内）
          const targetX = 20 + Math.random() * 60; // 20%-80%
          const targetY = 30 + Math.random() * 50; // 30%-80%
          
          // 确定方向
          setPetDirection(targetX > petPosition.x ? 'right' : 'left');
          
          // 移动到目标位置
          setPetPosition({ x: targetX, y: targetY });
          
          // 2-4秒后停止走动
          setTimeout(() => {
            setIsWalking(false);
          }, 2000 + Math.random() * 2000);
        }
      }, 5000); // 每5秒检查一次
    };
    
    startRandomWalk();
    
    return () => {
      if (walkIntervalRef.current) {
        clearInterval(walkIntervalRef.current);
      }
    };
  }, [isOpen, currentPet, petPosition.x]);
  
  if (isOpen === false) return null;
  if (!currentPet) return null;
  
  const petConfig = PET_CONFIGS[currentPet.petType];
  const petAssetConfig = getPetConfig(currentPet.petType);
  const currentAnimation = getPetAnimation(currentPet.petType, isWalking ? 'happy' : currentPet.status);
  
  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm animate-fadeIn">
      {/* 顶部工具栏 - 紧凑设计 */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-slate-900/95 to-transparent p-3 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white pixel-text-shadow">
              🏠 {currentPet.name}的家
            </h2>
            
            {/* 金币显示 */}
            <div className="bg-yellow-900/50 border-2 border-yellow-700 px-3 py-1 text-sm font-bold text-yellow-300 rounded">
              💰 {userCoins}
            </div>
            
            {/* 场景切换 */}
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentScene('living')}
                className={`px-3 py-1 text-sm rounded transition-all ${
                  currentScene === 'living'
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                🛋️ 客厅
              </button>
              <button
                onClick={() => setCurrentScene('garden')}
                className={`px-3 py-1 text-sm rounded transition-all ${
                  currentScene === 'garden'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                🌳 庭院
              </button>
            </div>
            
            {/* 功能按钮 */}
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setShowShop(true)}
                className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-all"
              >
                🏪 商店
              </button>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white text-xl font-bold transition-all hover:scale-110"
              title="关闭"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {/* 主游戏区域 - 全屏 */}
      <div 
        className="w-full h-full relative cursor-crosshair"
        onClick={handleSceneClick}
      >
        {/* 左侧衣柜按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowWardrobe(true);
          }}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50 w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-500 flex flex-col items-center justify-center text-white transition-all hover:scale-110 shadow-2xl"
          title="我的衣柜"
        >
          <span className="text-2xl">👔</span>
          <span className="text-xs mt-1">衣柜</span>
        </button>
        
        {/* 右侧商店按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowShop(true);
          }}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-50 w-16 h-16 rounded-full bg-amber-600 hover:bg-amber-500 flex flex-col items-center justify-center text-white transition-all hover:scale-110 shadow-2xl"
          title="装饰品商店"
        >
          <span className="text-2xl">🏪</span>
          <span className="text-xs mt-1">商店</span>
        </button>
        
        {/* 放置提示 */}
        {placingDecoration && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold animate-bounce">
            点击场景放置装饰品
          </div>
        )}
        
        {/* 客厅场景 */}
        {currentScene === 'living' && (
          <div className="w-full h-full relative bg-gradient-to-b from-sky-300 via-sky-200 to-amber-100">
            {/* 天空层 */}
            <div className="absolute inset-0">
              {/* 太阳 */}
              <div className="absolute top-12 right-16 text-6xl animate-pulse">☀️</div>
              
              {/* 云朵 */}
              <div className="absolute top-16 left-20 text-4xl opacity-70 animate-float">☁️</div>
              <div className="absolute top-24 right-32 text-3xl opacity-50 animate-float-delayed">☁️</div>
              <div className="absolute top-32 left-1/3 text-2xl opacity-40 animate-float">☁️</div>
            </div>
            
            {/* 房间层 */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* 墙壁装饰 */}
              <div className="absolute top-20 left-16 text-5xl">🖼️</div>
              <div className="absolute top-20 right-16 text-5xl">🖼️</div>
              
              {/* 左侧家具 */}
              <div className="absolute left-12 top-1/3 text-6xl">🪴</div>
              <div className="absolute left-12 bottom-32 text-6xl">🛋️</div>
              
              {/* 右侧家具 */}
              <div className="absolute right-12 top-1/3 text-6xl">📚</div>
              <div className="absolute right-12 bottom-32 text-6xl">🪑</div>
              
              {/* 中央地毯 */}
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-64 bg-red-700/20 border-4 border-red-800/40 rounded-lg"></div>
            </div>
            
            {/* 宠物 - 可移动 */}
            <div 
              className="absolute z-30 transition-all duration-2000 ease-in-out"
              style={{
                left: `${petPosition.x}%`,
                top: `${petPosition.y}%`,
                transform: `translate(-50%, -50%) scaleX(${petDirection === 'left' ? -1 : 1})`
              }}
            >
              <div className="relative">
                {/* 宠物图像 */}
                <div className="w-32 h-32 flex items-center justify-center">
                  {petAssetConfig?.isAnimated ? (
                    <img 
                      src={currentAnimation} 
                      alt={currentPet.name}
                      className="w-full h-full object-contain drop-shadow-2xl"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-8xl drop-shadow-2xl">{petConfig.icon}</span>
                  )}
                </div>
                
                {/* 宠物名字 */}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-slate-800/90 px-3 py-1 rounded-full text-white font-bold text-sm pixel-text-shadow border-2 border-slate-600">
                    {currentPet.name}
                  </div>
                </div>
                
                {/* 行走状态指示 */}
                {isWalking && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <div className="text-2xl animate-bounce">👣</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 用户装饰品 */}
            {placedDecorations
              .filter(p => p.scene === 'living')
              .map(placed => {
                const decoration = DECORATIONS[placed.decorationId];
                if (!decoration) return null;
                
                return (
                  <div
                    key={placed.id}
                    className="absolute z-20"
                    style={{
                      left: `${placed.x}%`,
                      top: `${placed.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="text-5xl drop-shadow-lg">
                      {decoration.icon}
                    </div>
                  </div>
                );
              })}
            
            {/* 地板 */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-700 to-amber-800 border-t-4 border-amber-900"></div>
          </div>
        )}
        
        {/* 庭院场景 */}
        {currentScene === 'garden' && (
          <div className="w-full h-full relative bg-gradient-to-b from-sky-400 via-green-300 to-green-500">
            {/* 天空 */}
            <div className="absolute top-12 right-16 text-6xl animate-pulse">☀️</div>
            <div className="absolute top-16 left-20 text-4xl opacity-70 animate-float">☁️</div>
            
            {/* 树木 */}
            <div className="absolute left-12 top-24 text-8xl">🌳</div>
            <div className="absolute right-12 top-32 text-7xl">🌲</div>
            
            {/* 花朵 */}
            <div className="absolute left-24 bottom-32 text-5xl">🌻</div>
            <div className="absolute right-24 bottom-40 text-5xl">🌺</div>
            
            {/* 宠物 - 可移动 */}
            <div 
              className="absolute z-30 transition-all duration-2000 ease-in-out"
              style={{
                left: `${petPosition.x}%`,
                top: `${petPosition.y}%`,
                transform: `translate(-50%, -50%) scaleX(${petDirection === 'left' ? -1 : 1})`
              }}
            >
              <div className="relative">
                <div className="w-32 h-32 flex items-center justify-center">
                  {petAssetConfig?.isAnimated ? (
                    <img 
                      src={currentAnimation} 
                      alt={currentPet.name}
                      className="w-full h-full object-contain drop-shadow-2xl"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-8xl drop-shadow-2xl">{petConfig.icon}</span>
                  )}
                </div>
                
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-slate-800/90 px-3 py-1 rounded-full text-white font-bold text-sm pixel-text-shadow border-2 border-slate-600">
                    {currentPet.name}
                  </div>
                </div>
                
                {isWalking && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <div className="text-2xl animate-bounce">👣</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 用户装饰品 */}
            {placedDecorations
              .filter(p => p.scene === 'garden')
              .map(placed => {
                const decoration = DECORATIONS[placed.decorationId];
                if (!decoration) return null;
                
                return (
                  <div
                    key={placed.id}
                    className="absolute z-20"
                    style={{
                      left: `${placed.x}%`,
                      top: `${placed.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="text-5xl drop-shadow-lg">
                      {decoration.icon}
                    </div>
                  </div>
                );
              })}
            
            {/* 草地 */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-green-600 to-green-700 border-t-4 border-green-800"></div>
          </div>
        )}
      </div>
      
      {/* 底部交互按钮 - 紧凑图标设计 */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-2 bg-slate-900/90 px-4 py-2 rounded-full border-2 border-slate-700 shadow-2xl">
          <button
            onClick={() => {/* TODO: 喂食逻辑 */}}
            className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center text-2xl transition-all hover:scale-110"
            title="喂食"
          >
            🍖
          </button>
          <button
            onClick={() => {/* TODO: 玩耍逻辑 */}}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-2xl transition-all hover:scale-110"
            title="玩耍"
          >
            🎾
          </button>
          <button
            onClick={() => {/* TODO: 清洁逻辑 */}}
            className="w-12 h-12 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-2xl transition-all hover:scale-110"
            title="清洁"
          >
            🛁
          </button>
          <button
            onClick={() => {/* TODO: 训练逻辑 */}}
            className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-2xl transition-all hover:scale-110"
            title="训练"
          >
            📚
          </button>
        </div>
      </div>
      
      {/* 商店弹窗 */}
      {showShop && (
        <DecorationShop isOpen={showShop} onClose={() => setShowShop(false)} />
      )}
      
      {/* 我的衣柜 */}
      <MyWardrobe 
        isOpen={showWardrobe}
        onClose={() => setShowWardrobe(false)}
        scene={currentScene}
        onPlaceDecoration={handleSelectDecoration}
      />
    </div>
  );
}
