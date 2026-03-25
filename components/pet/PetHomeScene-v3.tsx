'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePetStore } from '@/store/petStore';
import { useDecorationStore } from '@/store/decorationStore';
import { useCoinStore } from '@/store/coinStore';
import { useFoodStore } from '@/store/foodStore';
import { useAuthStore } from '@/store/authStore';
import { PET_CONFIGS, STATUS_TEXT, STATUS_COLORS } from '@/types/pet';
import { InteractionType, INTERACTION_CONFIGS } from '@/types/interaction';
import { DECORATIONS, PlacedDecoration } from '@/types/decoration';
import { getPetImageUrl } from '@/lib/config/petAssets';
import { getPetVariantScale } from '@/lib/config/petArtworkProfiles';
import { migratePetType } from '@/lib/pet/migration';
import { getCurrentStage, getStageAppearance } from '@/lib/petEvolution';
import './pet-home-animations.css';
import InteractionButton from './InteractionButton';
import DecorationShop from './DecorationShop';
import FoodSelector from './FoodSelector';
import FoodShop from './FoodShop';
import PetHomeGuide from './PetHomeGuide';
import PetChatModal from './PetChatModal';
import { musicManager } from '@/lib/audio/musicManager';
import { playSound } from '@/lib/utils/soundManager';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, Sparkles } from 'lucide-react';

// 🌟 UI Enhanced Components
import AnimatedCloud from './home/AnimatedCloud';
import AnimatedSun from './home/AnimatedSun';
import PetSpeechBubble from './home/PetSpeechBubble';
import HeartParticles, { useHeartParticles } from './home/HeartParticles';
import AmbientSounds, { AmbientSoundToggle } from './home/AmbientSounds';
import CozyRoomBackground from './home/CozyRoomBackground';
import FurnitureRenderer from './home/FurnitureRenderer';
import InteractionFeedback, { setFeedbackTrigger } from './InteractionFeedback';
import PetMoodOverlay from './PetMoodOverlay';
import { DecorationIcon } from '@/components/ui/DecorationIcon';

interface PetHomeSceneProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * 🏠 Pet Home Scene V3 - Final Optimized Version
 * 
 * Improvements:
 * 1. Visual overhaul with CozyRoomBackground and FurnitureRenderer
 * 2. Enhanced interactions (breathing, speech bubbles, heart particles)
 * 3. Integrated functionality from V3 (Food system, Inventory sync)
 * 4. Smoother animations and transitions
 */
export default function PetHomeSceneV3({ isOpen, onClose }: PetHomeSceneProps) {
  const { currentPet, pets, setCurrentPet } = usePetStore();
  const { placedDecorations, ownedDecorations, loadDecorations, placeDecoration, removeDecoration, updateDecorationPosition } = useDecorationStore();
  const { balance: userCoins, loadBalance } = useCoinStore();
  const { inventory, loadInventory } = useFoodStore();
  const { token, isAuthenticated } = useAuthStore();
  const currentAppearance = currentPet ? getStageAppearance(currentPet.evolution_stage ?? (currentPet.isEgg ? 0 : 1)) : null;
  const currentRenderScale = currentPet ? getPetVariantScale(migratePetType(currentPet.petType), 'home') : 1;
  const currentScale = currentAppearance ? ((currentAppearance.size || 48) / 48) * currentRenderScale : 1;
  const currentStageInfo = currentPet ? getCurrentStage(currentPet.evolution_stage ?? (currentPet.isEgg ? 0 : 1)) : null;
  const getPetAuraClass = (stage: number, style?: string) => {
    if (style === 'tech') return 'bg-cyan-300/14';
    if (style === 'mythic') return 'bg-yellow-200/14';

    const auraMap: Record<number, string> = {
      0: 'bg-slate-200/10',
      1: 'bg-amber-200/14',
      2: 'bg-emerald-200/14',
      3: 'bg-sky-200/14',
      4: 'bg-violet-200/16',
      5: 'bg-yellow-100/18',
    };

    return auraMap[stage] || auraMap[0];
  };

  const getTechAccent = (petType?: string) => {
    switch (petType) {
      case 'bit_bot':
      case 'tech_bot':
        return {
          frame: 'rounded-xl border border-orange-300/50 bg-orange-500/10',
          glow: 'shadow-[0_0_18px_rgba(251,146,60,0.24)]',
          badge: 'bg-orange-900 text-orange-100 border border-orange-400/50',
          icon: <Cpu className="w-3 h-3" />,
          label: '灵光'
        };
      case 'data_sprite':
      case 'tech_drone':
        return {
          frame: 'rounded-full border border-sky-300/50 bg-sky-500/10 border-dashed',
          glow: 'shadow-[0_0_18px_rgba(56,189,248,0.28)]',
          badge: 'bg-sky-900 text-sky-100 border border-sky-400/50',
          icon: <Zap className="w-3 h-3" />,
          label: '巡游'
        };
      case 'ava_ai':
      case 'tech_ai':
        return {
          frame: 'rounded-full border border-rose-300/50 bg-rose-500/10',
          glow: 'shadow-[0_0_18px_rgba(244,63,94,0.24)]',
          badge: 'bg-rose-900 text-rose-100 border border-rose-400/50',
          icon: <Sparkles className="w-3 h-3" />,
          label: '冲刺'
        };
      default:
        return null;
    }
  };

  const [currentScene, setCurrentScene] = useState<'living' | 'garden'>('living');
  const [showShop, setShowShop] = useState(false);
  const [showFoodShop, setShowFoodShop] = useState(false);
  const [showFoodSelector, setShowFoodSelector] = useState(false);
  const [showPetChat, setShowPetChat] = useState(false);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showPetList, setShowPetList] = useState(false);
  const [showInteractionPanel, setShowInteractionPanel] = useState(true);
  const [draggingDecoration, setDraggingDecoration] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  
  // Ambient Sound Toggle
  const [ambientEnabled, setAmbientEnabled] = useState(false);

  // Heart Particles Trigger (triggered on pet click)
  const { trigger: heartTrigger, burst: burstHearts } = useHeartParticles();
  
  // Decoration Operation State
  const [selectedPlaced, setSelectedPlaced] = useState<PlacedDecoration | null>(null);
  const [isDraggingPlaced, setIsDraggingPlaced] = useState(false);
  
  // Confirm Modal State
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  // Pet Position and Movement
  const [petPosition, setPetPosition] = useState({ x: 50, y: 50 }); // Percentage position
  const [petDirection, setPetDirection] = useState<'left' | 'right'>('right');
  const [isWalking, setIsWalking] = useState(false);
  const walkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [interactionType, setInteractionType] = useState<InteractionType | null>(null);
  const [interactionPlaying, setInteractionPlaying] = useState(false);
  const [interactionPosition, setInteractionPosition] = useState({ x: 0, y: 0 });
  const [interactionFollowPet, setInteractionFollowPet] = useState(true);
  const [interactionSpeech, setInteractionSpeech] = useState<string | null>(null);
  const petRef = useRef<HTMLDivElement | null>(null);
  
  // Load Data
  useEffect(() => {
    if (isOpen !== false && currentPet && isAuthenticated && token) {
      loadDecorations();
      loadInventory(token);
      loadBalance(token);
    }
  }, [isOpen, currentPet, isAuthenticated, token, loadDecorations, loadInventory, loadBalance]);
  
  // BGM Manager
  useEffect(() => {
    if (isOpen === false || !currentPet) return;
    // Switch to home BGM when entering (lock to prevent override)
    console.log('[PetHome] Switching to home BGM');
    musicManager.lockBGM('home');
    return () => {
      // Switch back to main BGM when unmounting
      console.log('[PetHome] Switching back to main BGM');
      musicManager.unlockBGM('home');
      musicManager.switchBGM('main');
    };
  }, [isOpen, currentPet?.id]);

  const getPetScreenPosition = useCallback(() => {
    if (petRef.current) {
      const rect = petRef.current.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    const rect = sceneRef.current?.getBoundingClientRect();
    if (rect) {
      return {
        x: rect.left + (rect.width * petPosition.x) / 100,
        y: rect.top + (rect.height * petPosition.y) / 100
      };
    }
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    return { x: 0, y: 0 };
  }, [petPosition.x, petPosition.y]);

  useEffect(() => {
    setFeedbackTrigger((type, pos, speech) => {
      setInteractionType(type);
      setInteractionPlaying(true);
      setInteractionFollowPet(!pos);
      const resolvedPos = pos ?? getPetScreenPosition();
      setInteractionPosition(resolvedPos);
      const dialogues = INTERACTION_CONFIGS[type]?.dialogues;
      const trimmedSpeech = speech?.trim();
      if (trimmedSpeech) {
        setInteractionSpeech(trimmedSpeech);
      } else if (dialogues?.length) {
        setInteractionSpeech(dialogues[Math.floor(Math.random() * dialogues.length)]);
      } else {
        setInteractionSpeech(null);
      }
      if (['pat', 'play', 'talk', 'chat'].includes(type)) {
        burstHearts();
      }
    });
    return () => setFeedbackTrigger(null);
  }, [getPetScreenPosition, burstHearts]);

  useEffect(() => {
    if (!interactionPlaying || !interactionFollowPet) return;
    let rafId = 0;
    const tick = () => {
      const nextPos = getPetScreenPosition();
      setInteractionPosition(prev =>
        prev.x === nextPos.x && prev.y === nextPos.y ? prev : nextPos
      );
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [interactionPlaying, interactionFollowPet, getPetScreenPosition]);
  
  // Pet Random Walk
  useEffect(() => {
    if (isOpen === false || !currentPet) return;
    
    const startRandomWalk = () => {
      walkIntervalRef.current = setInterval(() => {
        // 30% chance to start walking
        if (Math.random() < 0.3) {
          setIsWalking(true);
          
          // Random target position (within safe area)
          const targetX = 20 + Math.random() * 60; // 20%-80%
          const targetY = 30 + Math.random() * 50; // 30%-80%
          
          // Determine direction
          setPetDirection(targetX > petPosition.x ? 'right' : 'left');
          
          // Move to target
          setPetPosition({ x: targetX, y: targetY });
          
          // Stop walking after 2-4 seconds
          setTimeout(() => {
            setIsWalking(false);
          }, 2000 + Math.random() * 2000);
        }
      }, 5000); // Check every 5 seconds
    };
    
    startRandomWalk();
    
    return () => {
      if (walkIntervalRef.current) {
        clearInterval(walkIntervalRef.current);
      }
    };
  }, [isOpen, currentPet, petPosition.x]);
  
  // Handle decoration drop (New placement)
  const handleDecorationDrop = async (e: React.MouseEvent) => {
    if (!draggingDecoration && !isDraggingPlaced) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp position within reasonable bounds
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(15, Math.min(85, y));
    
    if (draggingDecoration) {
      // Place new decoration
      await placeDecoration(draggingDecoration, clampedX, clampedY, currentScene);
      playSound('decoration_place');
      setDraggingDecoration(null);
    } else if (isDraggingPlaced && selectedPlaced) {
      // Move existing decoration
      await updateDecorationPosition(selectedPlaced.id, clampedX, clampedY);
      playSound('decoration_place');
      setIsDraggingPlaced(false);
    }
  };
  
  // Handle click on placed decoration - Select it
  const handlePlacedDecorationClick = (e: React.MouseEvent, placed: PlacedDecoration) => {
    e.stopPropagation();
    // If clicking already selected, deselect
    if (selectedPlaced?.id === placed.id) {
      setSelectedPlaced(null);
      setIsDraggingPlaced(false);
    } else {
      setSelectedPlaced(placed);
      setIsDraggingPlaced(false);
    }
  };
  
  // Start dragging placed decoration
  const handleStartDragPlaced = () => {
    if (selectedPlaced) {
      setIsDraggingPlaced(true);
    }
  };
  
  // Remove decoration - Show confirm
  const handleRemoveDecoration = () => {
    if (selectedPlaced) {
      setShowRemoveConfirm(true);
    }
  };
  
  // Confirm remove decoration
  const confirmRemoveDecoration = async () => {
    if (selectedPlaced && !isRemoving) {
      setIsRemoving(true);
      const decorationToRemove = selectedPlaced;
      
      // Optimistic UI update
      setSelectedPlaced(null);
      setShowRemoveConfirm(false);
      
      try {
        const success = await removeDecoration(decorationToRemove.id);
        if (success) {
          playSound('button_click');
        }
      } catch (error) {
        console.error('Failed to remove decoration:', error);
      } finally {
        setIsRemoving(false);
      }
    }
  };
  
  // Render placed decoration with animation
  const renderPlacedDecoration = (placed: PlacedDecoration) => {
    const decoration = DECORATIONS[placed.decorationId];
    if (!decoration) return null;
    
    const isSelected = selectedPlaced?.id === placed.id;
    
    return (
      <motion.div
        key={placed.id}
        className={`absolute z-20 cursor-pointer group ${isSelected ? 'z-30' : ''}`}
        style={{
          left: `${placed.x}%`,
          top: `${placed.y}%`,
        }}
        initial={{ scale: 0, opacity: 0, y: -20 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          y: 0,
          x: '-50%',
        }}
        exit={{ 
          scale: 0, 
          opacity: 0, 
          y: 20,
          transition: { duration: 0.2 }
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 20,
          delay: 0.05
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => handlePlacedDecorationClick(e, placed)}
      >
        {/* Selection Border */}
        <AnimatePresence>
          {isSelected && (
            <motion.div 
              className="absolute -inset-4 border-4 border-dashed border-sky-400 rounded-2xl bg-sky-500/20"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
        
        {/* Furniture Renderer */}
        <motion.div 
          className="transition-transform duration-200"
          animate={{ 
            scale: isSelected ? 1.05 : 1,
            rotate: isSelected ? [0, -2, 2, 0] : 0
          }}
          transition={{ 
            rotate: { repeat: Infinity, duration: 2, repeatDelay: 1 }
          }}
        >
          <FurnitureRenderer 
            decorationId={decoration.id} 
            name={decoration.name} 
            isSelected={isSelected}
          />
        </motion.div>
        
        {/* Decoration Name Label */}
        <motion.div 
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: isSelected ? 1 : 0, y: isSelected ? 0 : -5 }}
          whileHover={{ opacity: 1, y: 0 }}
        >
          <span className="bg-slate-900/95 text-white text-xs px-3 py-1 rounded-full border-2 border-slate-600 font-bold">
            {decoration.name}
          </span>
        </motion.div>
      </motion.div>
    );
  };
  
  if (isOpen === false) return null;
  if (!currentPet) return null;
  
  const resolvedPetType = migratePetType(currentPet.petType);
  const petConfig = PET_CONFIGS[resolvedPetType];
  const currentStageIndex = currentPet.evolution_stage ?? (currentPet.isEgg ? 0 : 1);
  const currentImageUrl = getPetImageUrl(resolvedPetType, isWalking ? 'normal' : currentPet.status, currentStageIndex);
  const currentTechAccent = getTechAccent(resolvedPetType);
  const otherPets = (pets || []).filter(p => p.id !== currentPet.id);

  const interactionMotion = (() => {
    if (!interactionPlaying || !interactionType) {
      return { x: 0, y: 0, rotate: 0, scale: 1 };
    }
    switch (interactionType) {
      case 'train':
        return { x: [0, 14, -14, 14, 0], y: [0, -4, 0], rotate: [0, 5, -5, 5, 0] };
      case 'play':
        return { y: [0, -14, 0, -10, 0] };
      case 'talk':
        return { rotate: [0, -8, 8, -6, 0] };
      case 'pat':
        return { scale: [1, 1.12, 1] };
      case 'read':
        return { y: [0, -6, 0] };
      case 'paint':
        return { rotate: [0, 6, -6, 0] };
      case 'chat':
        return { x: [0, 6, -6, 0] };
      case 'bath':
        return { rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] };
      default:
        return { x: 0, y: 0, rotate: 0, scale: 1 };
    }
  })();
  const interactionTransition = interactionPlaying
    ? { duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }
    : { duration: 0.2 };
  
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-slate-900/80 to-transparent p-3 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white pixel-text-shadow flex items-center gap-2">
              🏠 {currentPet.name}的家
              {currentStageInfo && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-600 text-slate-200">
                  {currentStageInfo.name}
                </span>
              )}
            </h2>
            
            {/* Coin Display */}
            <div className="bg-slate-800/85 border border-slate-600 px-3 py-1 rounded-lg text-sm font-bold text-amber-300 shadow-lg flex items-center gap-2">
              <span>💰</span>
              <span>{userCoins}</span>
            </div>
            
            {/* Scene Switcher */}
            <div className="flex bg-slate-800/80 rounded-lg p-1 border border-slate-600">
              <button
                onClick={() => setCurrentScene('living')}
                className={`px-3 py-1 text-sm rounded transition-all flex items-center gap-1 ${
                  currentScene === 'living'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🛋️ 客厅
              </button>
              <button
                onClick={() => setCurrentScene('garden')}
                className={`px-3 py-1 text-sm rounded transition-all flex items-center gap-1 ${
                  currentScene === 'garden'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🌳 庭院
              </button>
            </div>
            
            {/* Shop Button */}
            <button
              onClick={() => setShowShop(true)}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg border border-slate-500"
              title="商店"
            >
              🏪
            </button>
            
            {/* Food Shop Button */}
            <button
              onClick={() => setShowFoodShop(true)}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg border border-slate-500"
              title="食物商店"
            >
              🍖
            </button>

            {/* Pet List Button */}
            <button
              onClick={() => setShowPetList(true)}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg border border-slate-500"
              title="我的伙伴"
            >
              🐾
            </button>

            {/* Ambient Sound Toggle */}
            <AmbientSoundToggle
              enabled={ambientEnabled}
              onToggle={() => setAmbientEnabled(v => !v)}
            />
          </div>
          
          {/* Close Button */}
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
      
      {/* Left Sidebar - Wardrobe */}
      <button
        onClick={() => setShowWardrobe(!showWardrobe)}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-40 bg-slate-700 hover:bg-slate-600 text-white px-3 py-6 rounded-r-xl shadow-2xl transition-all hover:scale-105 border-l-0 border-2 border-slate-500"
        title="我的衣柜"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">👔</span>
          <span className="text-xs font-bold" style={{ writingMode: 'vertical-rl' }}>衣柜</span>
        </div>
      </button>
      
      {/* Right Sidebar - Food Backpack */}
      <button
        onClick={() => {
          setShowWardrobe(false);
          setShowPetList(false);
          setShowFoodShop(false);
          setShowFoodSelector(true);
        }}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-40 bg-slate-700 hover:bg-slate-600 text-white px-3 py-6 rounded-l-xl shadow-2xl transition-all hover:scale-105 border-r-0 border-2 border-slate-500"
        title="食物背包"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🍖</span>
          <span className="text-xs font-bold" style={{ writingMode: 'vertical-rl' }}>背包</span>
        </div>
      </button>
      
      {/* Main Game Area (using CozyRoomBackground) */}
      <div 
        ref={sceneRef}
        className="w-full h-full relative"
        onClick={(draggingDecoration || isDraggingPlaced) ? handleDecorationDrop : undefined}
        style={{ cursor: (draggingDecoration || isDraggingPlaced) ? 'crosshair' : 'default' }}
      >
        <CozyRoomBackground scene={currentScene}>
          {/* Decorations */}
          {placedDecorations
            .filter(p => p.scene === currentScene)
            .map(placed => renderPlacedDecoration(placed))}

          {/* Other Pets Render */}
          {otherPets
            .filter(p => !p.isEgg && p.petType !== 'egg')
            .map((pet, index) => {
              const resolvedType = migratePetType(pet.petType);
              const config = PET_CONFIGS[resolvedType];
              const stageIndex = pet.evolution_stage ?? (pet.isEgg ? 0 : 1);
              const petImgUrl = getPetImageUrl(resolvedType, pet.status, stageIndex);
              const hasAsset = !!petImgUrl;
              const appearance = getStageAppearance(stageIndex);
              const scale = ((appearance.size || 48) / 48) * getPetVariantScale(resolvedType, 'list');
              const techAccent = getTechAccent(resolvedType);
              const x = 12 + (index % 4) * 15;
              const y = 72 + Math.floor(index / 4) * 10;
              return (
                <div
                  key={pet.id}
                  className="absolute z-20 cursor-pointer"
                  style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPet(pet);
                  }}
                  title={`设为跟随：${pet.name}`}
                >
                  <div className="relative group">
                    <div className="relative flex h-16 w-16 items-center justify-center" style={{ transform: `scale(${scale})` }}>
                      <div className={`absolute inset-2 rounded-full blur-lg ${getPetAuraClass(stageIndex, pet.petStyle)}`} />
                      <div className="absolute inset-x-2 bottom-2 h-3 rounded-full bg-slate-950/16 blur-md" />
                      {techAccent && (
                        <div className={`absolute -bottom-1 -right-1 z-10 px-1 py-0.5 text-[9px] rounded-full flex items-center gap-1 ${techAccent.badge}`}>
                          {techAccent.icon}
                        </div>
                      )}
                      {hasAsset ? (
                        <img
                          src={petImgUrl}
                          alt={pet.name}
                          className="pet-sprite pet-sprite-chip w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-5xl drop-shadow-lg">{config.icon}</span>
                      )}
                    </div>
                    <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-slate-800/90 px-2 py-0.5 rounded-full text-white text-xs border border-slate-600">
                        {pet.name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Pet Render */}
          <div 
            className="absolute z-30 transition-all duration-2000 ease-in-out cursor-pointer"
            style={{
              left: `${petPosition.x}%`,
              top: `${petPosition.y}%`,
              transform: `translate(-50%, -50%) scaleX(${petDirection === 'left' ? -1 : 1})`
            }}
            onClick={() => burstHearts()}
            ref={petRef}
          >
            <motion.div
              className="relative group"
              animate={interactionMotion}
              transition={interactionTransition}
            >
              {interactionPlaying && interactionSpeech && (
                <motion.div
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-40"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.9 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <div className="relative">
                    <div className="bg-slate-900/90 rounded-2xl px-4 py-2 shadow-lg border border-cyan-500/40 min-w-[120px] max-w-[220px]">
                      <p className="text-sm text-slate-100 font-medium text-center whitespace-normal leading-snug">
                        {interactionSpeech}
                      </p>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                      <svg width="20" height="10" viewBox="0 0 20 10">
                        <path d="M0 0 L10 10 L20 0" fill="rgba(15,23,42,0.9)" stroke="rgba(6,182,212,0.4)" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              )}
              {/* Pet Speech Bubble */}
              <PetSpeechBubble petName={currentPet.name} mood={isWalking ? 'happy' : 'normal'} />

              {/* Pet Mood Overlay */}
              <PetMoodOverlay
                status={currentPet.status}
                isInteracting={interactionPlaying}
                interactionType={interactionType}
              />
              
              {/* Pet Body (with breathing animation) */}
              <motion.div 
                className="relative flex h-32 w-32 items-center justify-center"
                animate={{
                  scale: [currentScale, currentScale * 1.05, currentScale],
                  y: [0, -5, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                whileHover={{ scale: currentScale * 1.15 }}
                whileTap={{ scale: currentScale * 0.9 }}
                style={currentAppearance?.glowEffect ? { filter: 'drop-shadow(0 0 18px rgba(255, 215, 0, 0.6))' } : undefined}
              >
                <div className={`absolute inset-4 rounded-full blur-2xl ${getPetAuraClass(currentStageIndex, currentPet.petStyle)}`} />
                <div className="absolute inset-x-5 bottom-3 h-5 rounded-full bg-slate-950/16 blur-xl" />
                {currentTechAccent && (
                  <div className={`absolute -bottom-2 -right-2 z-10 px-2 py-1 text-[10px] rounded-full flex items-center gap-1 ${currentTechAccent.badge}`}>
                    {currentTechAccent.icon}
                    <span>{currentTechAccent.label}</span>
                  </div>
                )}
                {currentAppearance?.specialEffect && (
                  <div className="absolute inset-0 -z-10">
                    {currentAppearance.specialEffect === 'aura' && (
                      <div className="absolute inset-0 rounded-full blur-xl bg-yellow-400/30 animate-pulse" />
                    )}
                    {currentAppearance.specialEffect === 'legendary' && (
                      <>
                        <div className="absolute inset-0 rounded-full blur-2xl bg-fuchsia-400/30 animate-pulse" />
                        <div className="absolute inset-3 rounded-full bg-yellow-200/12 blur-xl animate-pulse" />
                      </>
                    )}
                  </div>
                )}
                {currentImageUrl ? (
                  <img 
                    src={currentImageUrl} 
                    alt={currentPet.name}
                    className="pet-sprite pet-sprite-home w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-8xl drop-shadow-2xl">{petConfig.icon}</span>
                )}
              </motion.div>
              
              {/* Pet Name */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-slate-800/90 px-3 py-1 rounded-full text-white font-bold text-sm pixel-text-shadow border-2 border-slate-600">
                  {currentPet.name}
                </div>
              </div>
              
              {/* Walking Effect */}
              {isWalking && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                  <div className="text-2xl animate-bounce">👣</div>
                </div>
              )}
            </motion.div>
          </div>
        </CozyRoomBackground>
      </div>
      
      {/* Interaction Panel (toggleable) */}
      {showInteractionPanel && (
        <div className="absolute right-4 bottom-24 z-50">
          <div className="bg-slate-900/90 border-2 border-sky-500/60 rounded-2xl shadow-2xl px-3 py-2">
            <div className="text-xs text-sky-300 font-bold mb-2 text-center">互动面板</div>
            <div className="grid grid-cols-2 gap-2">
              <InteractionButton interactionType="pat" petId={currentPet.id} size="small" showLabel />
              <InteractionButton interactionType="play" petId={currentPet.id} size="small" showLabel />
              <InteractionButton interactionType="talk" petId={currentPet.id} size="small" showLabel />
              <InteractionButton interactionType="train" petId={currentPet.id} size="small" showLabel />
              <InteractionButton interactionType="read" petId={currentPet.id} size="small" showLabel />
              <InteractionButton interactionType="paint" petId={currentPet.id} size="small" showLabel />
              <InteractionButton
                interactionType="chat"
                petId={currentPet.id}
                size="small"
                showLabel
                onClickOverride={() => setShowPetChat(true)}
              />
              <InteractionButton interactionType="bath" petId={currentPet.id} size="small" showLabel />
            </div>
          </div>
        </div>
      )}

      {/* Interaction Toggle Button */}
      <button
        onClick={() => setShowInteractionPanel(v => !v)}
        className="absolute right-4 bottom-6 z-50 bg-sky-700 hover:bg-sky-600 text-white px-4 py-2 rounded-full shadow-xl border-2 border-sky-400/60 text-sm font-bold transition-all"
      >
        {showInteractionPanel ? '收起互动' : '展开互动'}
      </button>

      {/* Interaction Feedback Effects */}
      <InteractionFeedback
        interactionType={interactionType}
        isPlaying={interactionPlaying}
        position={interactionPosition}
        onComplete={() => {
          setInteractionPlaying(false);
          setInteractionType(null);
          setInteractionSpeech(null);
          setInteractionFollowPet(false);
        }}
      />

      {/* Pet Chat Modal */}
      <PetChatModal
        isOpen={showPetChat}
        onClose={() => setShowPetChat(false)}
        petId={currentPet.id}
        petName={currentPet.name}
      />
      
      {/* Wardrobe Modal */}
      {showWardrobe && (
        <>
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setShowWardrobe(false)}
          />
          
          <div 
            className="absolute left-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-md z-[70] shadow-2xl border-r-4 border-sky-600 overflow-y-auto"
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
              
              <p className="text-xs text-slate-300 mb-4 bg-slate-800/80 border border-slate-600 p-2 rounded">
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
                            ? 'bg-sky-600/30 border-sky-400 scale-105' 
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-center">
                          <DecorationIcon decorationId={decoration.id} size={56} />
                        </div>
                        <div className="text-xs font-bold text-white">{decoration.name}</div>
                        <div className="text-xs text-sky-300">x{owned.quantity}</div>
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

      {/* Pet List Modal */}
      {showPetList && (
        <>
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setShowPetList(false)}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-md z-[70] shadow-2xl border-l-4 border-sky-600 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white pixel-text-shadow">🐾 我的伙伴</h3>
                <button
                  onClick={() => setShowPetList(false)}
                  className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all hover:scale-110"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
              {(pets || []).map(pet => {
                  const resolvedType = migratePetType(pet.petType);
                  const config = PET_CONFIGS[resolvedType];
                  const isActive = currentPet.id === pet.id;
                  const petImgUrl = getPetImageUrl(resolvedType, pet.status, pet.evolution_stage ?? (pet.isEgg ? 0 : 1));
                  const hasAsset = !!petImgUrl;
                  const stageIndex = pet.evolution_stage ?? (pet.isEgg ? 0 : 1);
                  const techAccent = getTechAccent(resolvedType);
                  const listScale = getPetVariantScale(resolvedType, 'list');
                  return (
                    <div
                      key={pet.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isActive
                          ? 'bg-sky-600/20 border-sky-400'
                          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <div className={`absolute inset-1 rounded-full blur-md ${getPetAuraClass(stageIndex, pet.petStyle)}`} />
                          {techAccent && (
                            <div className={`absolute -bottom-1 -right-1 z-10 px-1 py-0.5 text-[9px] rounded-full flex items-center gap-1 ${techAccent.badge}`}>
                              {techAccent.icon}
                            </div>
                          )}
                          {hasAsset ? (
                            <img
                              src={petImgUrl}
                              alt={pet.name}
                              className="pet-sprite pet-sprite-chip w-full h-full object-contain"
                              style={{ transform: `scale(${listScale})` }}
                            />
                          ) : (
                            <span className="text-2xl">{config.icon}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{pet.name}</div>
                          <div className="text-xs text-gray-400">Lv.{pet.level}</div>
                          <div className={`text-xs ${STATUS_COLORS[pet.status]}`}>{STATUS_TEXT[pet.status]}</div>
                        </div>
                        {isActive ? (
                          <div className="text-xs text-sky-300 font-bold">跟随中</div>
                        ) : (
                          <button
                            onClick={() => setCurrentPet(pet)}
                            className="px-2 py-1 text-xs bg-sky-700 hover:bg-sky-600 text-white rounded"
                          >
                            设为跟随
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(pets || []).length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <p className="text-4xl mb-2">🐾</p>
                    <p className="text-sm">还没有宠物</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Decoration Shop */}
      {showShop && (
        <DecorationShop isOpen={showShop} onClose={() => setShowShop(false)} />
      )}
      
      {/* Food Shop (Added back) */}
      <FoodShop isOpen={showFoodShop} onClose={() => setShowFoodShop(false)} />

      {/* Food Selector (Added back) */}
      <FoodSelector
        isOpen={showFoodSelector}
        petId={currentPet.id}
        petName={currentPet.name}
        onClose={() => setShowFoodSelector(false)}
      />
      
      {/* Selected Decoration Controls - Bottom Floating Panel */}
      {selectedPlaced && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-scaleIn">
          <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-sky-500 shadow-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{DECORATIONS[selectedPlaced.decorationId]?.icon}</span>
              <span className="text-white font-bold text-lg">
                {DECORATIONS[selectedPlaced.decorationId]?.name || '装饰品'}
              </span>
            </div>
            
            <div className="flex gap-3">
              {/* Move Button */}
              <button
                onClick={handleStartDragPlaced}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  isDraggingPlaced
                    ? 'bg-emerald-500 text-white animate-pulse'
                    : 'bg-sky-700 hover:bg-sky-600 text-white hover:scale-105'
                }`}
              >
                <span className="text-xl">✋</span>
                {isDraggingPlaced ? '点击新位置' : '移动'}
              </button>
              
              {/* Remove Button */}
              <button
                onClick={handleRemoveDecoration}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 hover:scale-105"
              >
                <span className="text-xl">🗑️</span>
                移除
              </button>
              
              {/* Cancel Button */}
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
      
      {/* Heart Particles Overlay */}
      <HeartParticles triggerX={petPosition.x} triggerY={petPosition.y} trigger={heartTrigger} />
      
      {/* Dragging Hint */}
      {(draggingDecoration || isDraggingPlaced) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-sky-600/90 text-white px-6 py-3 rounded-full font-bold shadow-lg animate-pulse">
            👆 点击场景中的位置放置装饰品
          </div>
        </div>
      )}
      
      {/* Remove Confirmation Modal */}
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

      {/* Ambient Sounds */}
      <AmbientSounds scene={currentScene} enabled={ambientEnabled} />
      
      {/* New User Guide */}
      <PetHomeGuide />
    </div>
  );
}
