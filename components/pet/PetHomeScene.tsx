'use client';

import { useState, useEffect, useRef } from 'react';
import { usePetStore } from '@/store/petStore';
import { useDecorationStore } from '@/store/decorationStore';
import { useCoinStore } from '@/store/coinStore';
import { PET_CONFIGS, PetMood } from '@/types/pet';
import { DECORATIONS, PlacedDecoration } from '@/types/decoration';
import { getPetAnimation, getPetConfig } from '@/lib/config/petAssets';
import LottiePet from './LottiePet';
import { PetMoodSystem } from '@/lib/pet/moodSystem';
import { migratePetType } from '@/lib/pet/migration';
import './pet-home-animations.css';
import InteractionButton from './InteractionButton';
import DecorationShop from './DecorationShop';
import { DecorationIcon } from '@/components/ui/DecorationIcon';
import { musicManager } from '@/lib/audio/musicManager';
import { playSound } from '@/lib/utils/soundManager';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';

// 🌟 新增UI增强组件
import AnimatedCloud from './home/AnimatedCloud';
import AnimatedSun from './home/AnimatedSun';
import PetSpeechBubble from './home/PetSpeechBubble';
import HeartParticles, { useHeartParticles } from './home/HeartParticles';
import AmbientSounds, { AmbientSoundToggle } from './home/AmbientSounds';
import CozyRoomBackground from './home/CozyRoomBackground';
import FurnitureRenderer from './home/FurnitureRenderer';
import FarmGrid, { isPlantable, findNearestFarmPlot, getOccupiedPlotIds } from './home/FarmGrid';

interface PetHomeSceneProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * 🏠 宠物家园场景 - 最终优化版
 * 
 * 改进点：
 * 1. ✅ 移除中间黑色大框
 * 2. ✅ 优化关闭按钮为圆形红色×
 * 3. ✅ 移除"布置"按钮
 * 4. ✅ 添加左侧"我的衣柜"按钮
 * 5. ✅ 修复金币数据同步
 */
export default function PetHomeSceneV2({ isOpen, onClose }: PetHomeSceneProps) {
  const { currentPet } = usePetStore();
  const { placedDecorations, ownedDecorations, loadDecorations, placeDecoration, removeDecoration, updateDecorationPosition } = useDecorationStore();
  const { balance: userCoins, loadBalance } = useCoinStore();
  const [currentScene, setCurrentScene] = useState<'living' | 'garden'>('living');
  const [showShop, setShowShop] = useState(false);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [draggingDecoration, setDraggingDecoration] = useState<string | null>(null);
  
  // 环境音效开关
  const [ambientEnabled, setAmbientEnabled] = useState(false);

  // 心形粒子触发器（点击宠物时触发）
  const { trigger: heartTrigger, burst: burstHearts } = useHeartParticles();
  
  // 装饰品操作状态
  const [selectedPlaced, setSelectedPlaced] = useState<PlacedDecoration | null>(null);
  const [isDraggingPlaced, setIsDraggingPlaced] = useState(false);
  
  // 确认弹窗状态
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  // 宠物位置和移动
  const [petPosition, setPetPosition] = useState({ x: 50, y: 50 }); // 百分比位置
  const [petDirection, setPetDirection] = useState<'left' | 'right'>('right');
  const [isWalking, setIsWalking] = useState(false);
  const walkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🎭 情绪系统
  const [currentMood, setCurrentMood] = useState<PetMood>('normal');
  const moodSystemRef = useRef<PetMoodSystem | null>(null);
  
  // 初始化情绪系统
  useEffect(() => {
    if (isOpen === false || !currentPet) return;
    
    const moodSystem = new PetMoodSystem((mood) => {
      setCurrentMood(mood);
    });
    moodSystemRef.current = moodSystem;
    
    // 进入宠物小屋时触发开心
    moodSystem.triggerMood('enter_pet_home');
    
    return () => {
      moodSystem.destroy();
      moodSystemRef.current = null;
    };
  }, [isOpen, currentPet?.id]);

  const notifyError = (message: string) => {
    import('@/components/ui/ErrorToast')
      .then(({ showErrorToast }) => showErrorToast(message, 'error'))
      .catch(() => {});
  };
  
  // 加载装饰品数据和金币余额
  useEffect(() => {
    if (isOpen !== false && currentPet) {
      loadDecorations();
      const token = localStorage.getItem('token');
      if (token) {
        loadBalance(token);
      }
    }
  }, [isOpen, currentPet, loadDecorations, loadBalance]);
  
  // 🎵 BGM 切换 - 独立管理
  useEffect(() => {
    if (isOpen === false || !currentPet) return;
    // 进入宠物小屋时切换到 home BGM（锁定防止被覆盖）
    console.log('[PetHome] Switching to home BGM');
    musicManager.lockBGM('home');
    // 组件卸载或关闭时恢复主 BGM
    return () => {
      console.log('[PetHome] Switching back to main BGM');
      musicManager.unlockBGM('home');
      musicManager.switchBGM('main');
    };
  }, [isOpen, currentPet?.id]);
  
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
  
  // 处理装饰品拖拽放置（新放置）
  const handleDecorationDrop = async (e: React.MouseEvent) => {
    if (!draggingDecoration && !isDraggingPlaced) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // 限制位置在合理范围内
    let clampedX = Math.max(5, Math.min(95, x));
    let clampedY = Math.max(15, Math.min(85, y));
    
    // 庭院田地吸附：植物类装饰自动对齐到最近的空闲格子
    if (currentScene === 'garden' && draggingDecoration && isPlantable(draggingDecoration)) {
      const gardenPlaced = placedDecorations.filter(p => p.scene === 'garden');
      const occupiedIds = getOccupiedPlotIds(gardenPlaced);
      const nearestPlot = findNearestFarmPlot(clampedX, clampedY, occupiedIds);
      if (nearestPlot) {
        clampedX = nearestPlot.x;
        clampedY = nearestPlot.y;
      }
    }
    
    if (draggingDecoration) {
      // 放置新装饰品
      const placed = await placeDecoration(draggingDecoration, clampedX, clampedY, currentScene);
      if (placed) {
        playSound('decoration_place');
      } else {
        notifyError('放置失败，请稍后再试');
      }
      setDraggingDecoration(null);
    } else if (isDraggingPlaced && selectedPlaced) {
      // 移动已放置的装饰品
      const success = await updateDecorationPosition(selectedPlaced.id, clampedX, clampedY);
      if (success) {
        playSound('decoration_place');
      } else {
        notifyError('移动失败，请稍后再试');
      }
      setIsDraggingPlaced(false);
    }
  };
  
  // 处理已放置装饰品的点击 - 直接选中
  const handlePlacedDecorationClick = (e: React.MouseEvent, placed: PlacedDecoration) => {
    e.stopPropagation();
    // 如果点击的是已选中的，取消选中
    if (selectedPlaced?.id === placed.id) {
      setSelectedPlaced(null);
      setIsDraggingPlaced(false);
    } else {
      setSelectedPlaced(placed);
      setIsDraggingPlaced(false);
    }
  };
  
  // 开始拖拽已放置的装饰品
  const handleStartDragPlaced = () => {
    if (selectedPlaced) {
      setIsDraggingPlaced(true);
    }
  };
  
  // 移除装饰品 - 显示确认弹窗
  const handleRemoveDecoration = () => {
    if (selectedPlaced) {
      setShowRemoveConfirm(true);
    }
  };
  
  // 确认移除装饰品
  const confirmRemoveDecoration = async () => {
    if (selectedPlaced && !isRemoving) {
      setIsRemoving(true);
      const decorationToRemove = selectedPlaced;
      
      // 先清空选中状态（乐观更新UI）
      setSelectedPlaced(null);
      setShowRemoveConfirm(false);
      
      try {
        // 调用API移除
        const success = await removeDecoration(decorationToRemove.id);
        if (success) {
          playSound('button_click');
        } else {
          notifyError('移除失败，请稍后再试');
        }
      } catch (error) {
        console.error('Failed to remove decoration:', error);
        notifyError('移除失败，请稍后再试');
      } finally {
        setIsRemoving(false);
      }
    }
  };
  
  // 渲染已放置的装饰品 - 带动画效果
  const renderPlacedDecoration = (placed: PlacedDecoration) => {
    const decoration = DECORATIONS[placed.decorationId];
    if (!decoration) return null;
    
    const isSelected = selectedPlaced?.id === placed.id;

    // 动态 zIndex：越靠下（y 大）越在上层，营造纵深
    const depthZ = 10 + Math.round(placed.y);

    // 根据锚点确定平移：
    // - floor: 以底边对齐 → translate(-50%, -100%)
    // - wall/center: 居中 → translate(-50%, -50%)
    const anchorTranslate = decoration.anchor === 'floor' ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)';

    return (
      <motion.div
        key={placed.id}
        className={`absolute cursor-pointer group`}
        style={{ left: `${placed.x}%`, top: `${placed.y}%`, zIndex: depthZ }}
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.02 }}
        onClick={(e) => handlePlacedDecorationClick(e, placed)}
      >
        {/* 内层：做锚点平移和互动动画，不影响绝对定位 */}
        <motion.div
          className="relative"
          style={{ transform: anchorTranslate }}
          animate={{ scale: isSelected ? 1.06 : 1, rotate: isSelected ? [0, -2, 2, 0] : 0 }}
          transition={{ rotate: { repeat: isSelected ? Infinity : 0, duration: 2, repeatDelay: 1 } }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* 选中状态边框 */}
          <AnimatePresence>
            {isSelected && (
              <motion.div
                className="absolute -inset-4 border-4 border-dashed border-yellow-400 rounded-2xl bg-yellow-400/15 pointer-events-none"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              />
            )}
          </AnimatePresence>

          {/* 装饰品渲染器 (使用 FurnitureRenderer) */}
          <FurnitureRenderer
            decorationId={decoration.id}
            name={decoration.name}
            isSelected={isSelected}
            scene={currentScene}
          />

          {/* 装饰品名称 - 悬停或选中时显示 */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
            style={{ top: decoration.anchor === 'floor' ? '6px' : 'calc(100% + 6px)' }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: isSelected ? 1 : 0, y: isSelected ? 0 : -5 }}
            whileHover={{ opacity: 1, y: 0 }}
          >
            <span className="bg-slate-900/95 text-white text-xs px-3 py-1 rounded-full border-2 border-slate-600 font-bold">
              {decoration.name}
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };
  
  if (isOpen === false) return null;
  if (!currentPet) return null;
  
  const petConfig = PET_CONFIGS[currentPet.petType];
  const petAssetConfig = getPetConfig(currentPet.petType);
  const currentAnimation = getPetAnimation(currentPet.petType, isWalking ? 'normal' : currentPet.status);
  
  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-slate-900/80 to-transparent p-3 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white pixel-text-shadow">
              🏠 {currentPet.name}的家
            </h2>
            
            {/* 金币显示 */}
            <div className="bg-yellow-900/70 border-2 border-yellow-600 px-3 py-1 rounded-lg text-sm font-bold text-yellow-300 shadow-lg flex items-center gap-2">
              <span>💰</span>
              <span>{userCoins}</span>
            </div>
            
            {/* 场景切换 (简化版) */}
            <div className="flex bg-slate-800/80 rounded-lg p-1 border border-slate-600">
              <button
                onClick={() => setCurrentScene('living')}
                className={`px-3 py-1 text-sm rounded transition-all flex items-center gap-1 ${
                  currentScene === 'living'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🛋️ 客厅
              </button>
              <button
                onClick={() => setCurrentScene('garden')}
                className={`px-3 py-1 text-sm rounded transition-all flex items-center gap-1 ${
                  currentScene === 'garden'
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🌳 庭院
              </button>
            </div>
            
            {/* 商店按钮 */}
            <button
              onClick={() => setShowShop(true)}
              className="w-8 h-8 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
              title="商店"
            >
              🏪
            </button>
            
            {/* 食物商店按钮 */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openFoodShop'))}
              className="w-8 h-8 bg-pink-600 hover:bg-pink-700 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
              title="食物商店"
            >
              🍖
            </button>

            {/* 环境音开关 */}
            <AmbientSoundToggle
              enabled={ambientEnabled}
              onToggle={() => setAmbientEnabled(v => !v)}
            />
          </div>
          
          {/* 关闭按钮 - 圆形红色× */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white text-2xl flex items-center justify-center transition-all shadow-lg hover:scale-110"
              title="关闭"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {/* 左侧衣柜按钮 */}
      <button
        onClick={() => setShowWardrobe(!showWardrobe)}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-40 bg-amber-700 hover:bg-amber-600 text-white px-3 py-6 rounded-r-xl shadow-2xl transition-all hover:scale-105 border-l-0 border-2 border-amber-900"
        title="我的衣柜"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">👔</span>
          <span className="text-xs font-bold" style={{ writingMode: 'vertical-rl' }}>衣柜</span>
        </div>
      </button>
      
      {/* 主游戏区域 (使用 CozyRoomBackground) */}
      <div 
        className="w-full h-full relative"
        onClick={(draggingDecoration || isDraggingPlaced) ? handleDecorationDrop : undefined}
        style={{ cursor: (draggingDecoration || isDraggingPlaced) ? 'crosshair' : 'default' }}
      >
        <CozyRoomBackground scene={currentScene}>
          {/* 庭院田地交互层 */}
          {currentScene === 'garden' && (
            <FarmGrid placedDecorations={placedDecorations.filter(p => p.scene === 'garden')} />
          )}

          {/* 装饰品渲染 */}
          {placedDecorations
            .filter(p => p.scene === currentScene)
            .map(placed => renderPlacedDecoration(placed))}

          {/* 宠物渲染 */}
          <div 
            className="absolute z-30 transition-all duration-2000 ease-in-out cursor-pointer"
            style={{
              left: `${petPosition.x}%`,
              top: `${petPosition.y}%`,
              transform: `translate(-50%, -50%) scaleX(${petDirection === 'left' ? -1 : 1})`
            }}
            onClick={() => {
              burstHearts();
              moodSystemRef.current?.triggerMood('pet_pat');
            }}
          >
            <div className="relative group">
              {/* 宠物说话气泡 */}
              <PetSpeechBubble petName={currentPet.name} mood={currentMood} />
              
              {/* 宠物本体 (Lottie 或 SVG 降级) */}
              <motion.div 
                className="w-32 h-32 flex items-center justify-center"
                animate={{
                  scale: [1, 1.05, 1],
                  y: [0, -5, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
              >
                {petAssetConfig?.useLottie ? (
                  <LottiePet
                    petType={migratePetType(currentPet.petType)}
                    animationState={isWalking ? 'walking' : currentMood}
                    size={128}
                    evolutionStage={currentPet.evolution_stage ?? 1}
                    interactive
                  />
                ) : petAssetConfig?.isAnimated ? (
                  <img 
                    src={currentAnimation} 
                    alt={currentPet.name}
                    className="w-full h-full object-contain drop-shadow-2xl"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span className="text-8xl drop-shadow-2xl">{petConfig.icon}</span>
                )}
              </motion.div>
              
              {/* 宠物名字 */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
        </CozyRoomBackground>
      </div>
      
      {/* 底部交互按钮 - 浮动设计 */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-3 bg-slate-900/90 px-6 py-3 rounded-full border-2 border-slate-700 shadow-2xl">
          <InteractionButton 
            interactionType="pat" 
            petId={currentPet.id} 
            onClickOverride={async () => {
              moodSystemRef.current?.triggerMood('pet_pat');
              const { useInteractionStore } = await import('@/store/interactionStore');
              await useInteractionStore.getState().performInteraction(currentPet.id, 'pat');
            }}
          />
          <InteractionButton 
            interactionType="play" 
            petId={currentPet.id} 
            onClickOverride={async () => {
              moodSystemRef.current?.triggerMood('pet_play');
              const { useInteractionStore } = await import('@/store/interactionStore');
              await useInteractionStore.getState().performInteraction(currentPet.id, 'play');
            }}
          />
          <InteractionButton 
            interactionType="talk" 
            petId={currentPet.id} 
            onClickOverride={async () => {
              moodSystemRef.current?.triggerMood('pet_talk');
              const { useInteractionStore } = await import('@/store/interactionStore');
              await useInteractionStore.getState().performInteraction(currentPet.id, 'talk');
            }}
          />
          <InteractionButton 
            interactionType="train" 
            petId={currentPet.id} 
            onClickOverride={async () => {
              moodSystemRef.current?.triggerMood('pet_train');
              const { useInteractionStore } = await import('@/store/interactionStore');
              await useInteractionStore.getState().performInteraction(currentPet.id, 'train');
            }}
          />
        </div>
      </div>
      
      {/* 衣柜弹窗 - 模糊背景 */}
      {showWardrobe && (
        <>
          {/* 模糊背景 */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setShowWardrobe(false)}
          />
          
          {/* 侧边栏 */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-md z-[70] shadow-2xl border-r-4 border-amber-600 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white pixel-text-shadow">👔 我的衣柜</h3>
                <button
                  onClick={() => setShowWardrobe(false)}
                  className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all hover:scale-110"
                >
                  ×
                </button>
              </div>
              
              <p className="text-xs text-gray-400 mb-4 bg-blue-900/30 border border-blue-700 p-2 rounded">
                💡 点击装饰品，然后点击场景中的位置放置
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {ownedDecorations
                  .filter(d => d.quantity > 0)
                  .map(owned => {
                    const decoration = DECORATIONS[owned.decorationId];
                    if (!decoration) return null;
                    
                    const isSelected = draggingDecoration === owned.decorationId;
                    
                    return (
                      <button
                        key={owned.decorationId}
                        onClick={() => {
                          setDraggingDecoration(owned.decorationId);
                          setShowWardrobe(false);
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'bg-blue-600/30 border-blue-400 scale-105' 
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-center">
                          <DecorationIcon decorationId={decoration.id} size={56} />
                        </div>
                        <div className="text-xs font-bold text-white">{decoration.name}</div>
                        <div className="text-xs text-green-400">x{owned.quantity}</div>
                      </button>
                    );
                  })}
                
                {ownedDecorations.filter(d => d.quantity > 0).length === 0 && (
                  <div className="col-span-2 text-center text-gray-400 py-8">
                    <p className="text-4xl mb-2">📦</p>
                    <p className="text-sm">还没有装饰品</p>
                    <p className="text-xs">去商店购买吧！</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* 商店弹窗 */}
      {showShop && (
        <DecorationShop isOpen={showShop} onClose={() => setShowShop(false)} />
      )}
      
      {/* 选中装饰品的操作面板 - 底部浮动 */}
      {selectedPlaced && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-scaleIn">
          <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-yellow-500 shadow-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {selectedPlaced && (
                <DecorationIcon decorationId={selectedPlaced.decorationId} size={48} />
              )}
              <span className="text-white font-bold text-lg">
                {DECORATIONS[selectedPlaced.decorationId]?.name || '装饰品'}
              </span>
            </div>
            
            <div className="flex gap-3">
              {/* 移动按钮 */}
              <button
                onClick={handleStartDragPlaced}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  isDraggingPlaced
                    ? 'bg-green-500 text-white animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105'
                }`}
              >
                <span className="text-xl">✋</span>
                {isDraggingPlaced ? '点击新位置' : '移动'}
              </button>
              
              {/* 移除按钮 */}
              <button
                onClick={handleRemoveDecoration}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 hover:scale-105"
              >
                <span className="text-xl">🗑️</span>
                移除
              </button>
              
              {/* 取消按钮 */}
              <button
                onClick={() => {
                  setSelectedPlaced(null);
                  setIsDraggingPlaced(false);
                }}
                className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold transition-all hover:scale-105"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 心形粒子效果覆盖层 */}
      <HeartParticles triggerX={petPosition.x} triggerY={petPosition.y} trigger={heartTrigger} />
      
      {/* 拖拽放置提示 */}
      {(draggingDecoration || isDraggingPlaced) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-blue-500/90 text-white px-6 py-3 rounded-full font-bold shadow-lg animate-pulse">
            👆 点击场景中的位置放置装饰品
          </div>
        </div>
      )}
      
      {/* 移除装饰品确认弹窗 */}
      <ConfirmModal
        isOpen={showRemoveConfirm}
        title="移除装饰品"
        message={`确定要移除 ${selectedPlaced ? DECORATIONS[selectedPlaced.decorationId]?.name || '这个装饰品' : ''} 吗？装饰品将返回到你的衣柜中。`}
        icon="🗑️"
        confirmText="确认移除"
        cancelText="取消"
        confirmType="danger"
        onConfirm={confirmRemoveDecoration}
        onCancel={() => setShowRemoveConfirm(false)}
      />

      {/* 环境音效（默认关闭，用户可开启） */}
      <AmbientSounds scene={currentScene} enabled={ambientEnabled} />
    </div>
  );
}
