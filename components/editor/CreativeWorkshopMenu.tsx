"use client";

/**
 * 创意工坊菜单组件
 * Requirements: 1.3 - 显示新建关卡、加载关卡、模板选择选项
 * Requirements: 3.1, 3.2, 3.3 - 社区关卡游玩功能
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Phaser from "phaser";
import { useEditorStore } from "@/store/editorStore";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/config/api";
import { CustomLevelData, LevelTemplate } from "@/types/editor";
import { Plus, FolderOpen, Layout, ArrowLeft, Loader2, Trash2, Globe, X, AlertCircle } from "lucide-react";
import CommunityBrowserModal from "./CommunityBrowserModal";
import { getCommunityLevel, recordPlay } from "@/lib/api/community";
import { toFriendlyMessage } from "@/lib/utils/friendlyError";
import { getRandomQuestions } from "@/lib/api/userQuestions";
import type { CommunityLevelDetail } from "@/types/community";
import PlatformGameScene from "@/components/world/scenes/PlatformGameScene";
import VirtualController from "@/components/game/VirtualController";
import { useDeviceType } from "@/hooks/useDeviceType";
import { destroyPhaserGameSafely } from "@/lib/game/phaserLifecycle";

// 预设模板数据 - 元素类型使用后端白名单中的类型
const LEVEL_TEMPLATES: LevelTemplate[] = [
  {
    id: "simple_jump",
    name: "Simple Jump",
    nameCN: "简单跳跃",
    description: "基础跳跃关卡，适合新手入门",
    thumbnail: "🏃",
    difficulty: 1,
    levelData: {
      name: "简单跳跃",
      description: "跳过平台到达终点",
      difficulty: 1,
      authorId: "template",
      authorName: "系统模板",
      mapWidth: 1200,
      mapHeight: 600,
      playerStart: { x: 100, y: 500 },
      goal: { x: 1100, y: 500 },
      elements: [
        { id: "p1", type: "ground", x: 50, y: 550, width: 200, height: 32, config: { platformType: "ground" } },
        { id: "p2", type: "platform", x: 350, y: 480, width: 150, height: 32, config: { platformType: "platform" } },
        { id: "p3", type: "platform", x: 600, y: 420, width: 150, height: 32, config: { platformType: "platform" } },
        { id: "p4", type: "platform", x: 850, y: 480, width: 150, height: 32, config: { platformType: "platform" } },
        { id: "p5", type: "ground", x: 1000, y: 550, width: 200, height: 32, config: { platformType: "ground" } },
      ],
      questions: [],
    },
  },
  {
    id: "collect_coins",
    name: "Coin Collector",
    nameCN: "金币收集",
    description: "收集所有金币到达终点",
    thumbnail: "💰",
    difficulty: 1,
    levelData: {
      name: "金币收集",
      description: "收集金币并到达终点",
      difficulty: 1,
      authorId: "template",
      authorName: "系统模板",
      mapWidth: 1200,
      mapHeight: 600,
      playerStart: { x: 100, y: 500 },
      goal: { x: 1100, y: 500 },
      elements: [
        { id: "p1", type: "ground", x: 50, y: 550, width: 200, height: 32, config: { platformType: "ground" } },
        { id: "p2", type: "ground", x: 300, y: 550, width: 200, height: 32, config: { platformType: "ground" } },
        { id: "p3", type: "ground", x: 550, y: 550, width: 200, height: 32, config: { platformType: "ground" } },
        { id: "p4", type: "ground", x: 800, y: 550, width: 200, height: 32, config: { platformType: "ground" } },
        { id: "p5", type: "ground", x: 1000, y: 550, width: 200, height: 32, config: { platformType: "ground" } },
        { id: "c1", type: "coin", x: 200, y: 480, width: 32, height: 32, config: { collectibleType: "coin", value: 10 } },
        { id: "c2", type: "coin", x: 400, y: 480, width: 32, height: 32, config: { collectibleType: "coin", value: 10 } },
        { id: "c3", type: "coin", x: 600, y: 480, width: 32, height: 32, config: { collectibleType: "coin", value: 10 } },
        { id: "c4", type: "coin", x: 800, y: 480, width: 32, height: 32, config: { collectibleType: "coin", value: 10 } },
      ],
      questions: [],
    },
  },
  {
    id: "enemy_dodge",
    name: "Enemy Dodge",
    nameCN: "躲避敌人",
    description: "躲避敌人到达终点",
    thumbnail: "👾",
    difficulty: 2,
    levelData: {
      name: "躲避敌人",
      description: "小心敌人，安全到达终点",
      difficulty: 2,
      authorId: "template",
      authorName: "系统模板",
      mapWidth: 1200,
      mapHeight: 600,
      playerStart: { x: 100, y: 500 },
      goal: { x: 1100, y: 500 },
      elements: [
        { id: "p1", type: "ground", x: 50, y: 550, width: 300, height: 32, config: { platformType: "ground" } },
        { id: "p2", type: "ground", x: 450, y: 550, width: 300, height: 32, config: { platformType: "ground" } },
        { id: "p3", type: "ground", x: 850, y: 550, width: 350, height: 32, config: { platformType: "ground" } },
        { id: "e1", type: "enemy", x: 300, y: 500, width: 48, height: 48, config: { enemyType: "basic", patrolDistance: 150, moveSpeed: 60 } },
        { id: "e2", type: "enemy", x: 600, y: 500, width: 48, height: 48, config: { enemyType: "basic", patrolDistance: 150, moveSpeed: 60 } },
        { id: "e3", type: "enemy", x: 450, y: 400, width: 48, height: 48, config: { enemyType: "bat", patrolDistance: 200, moveSpeed: 80 } },
      ],
      questions: [],
    },
  },
  {
    id: "bouncy_fun",
    name: "Bouncy Fun",
    nameCN: "弹跳乐园",
    description: "使用弹跳平台到达高处",
    thumbnail: "🦘",
    difficulty: 2,
    levelData: {
      name: "弹跳乐园",
      description: "利用弹跳平台跳得更高",
      difficulty: 2,
      authorId: "template",
      authorName: "系统模板",
      mapWidth: 1200,
      mapHeight: 800,
      playerStart: { x: 100, y: 700 },
      goal: { x: 1100, y: 150 },
      elements: [
        { id: "p1", type: "ground", x: 50, y: 750, width: 200, height: 32, config: { platformType: "ground" } },
        { id: "b1", type: "bouncy", x: 300, y: 700, width: 100, height: 32, config: { platformType: "bouncy", bounceForce: 800 } },
        { id: "p2", type: "platform", x: 500, y: 550, width: 150, height: 32, config: { platformType: "platform" } },
        { id: "b2", type: "bouncy", x: 700, y: 500, width: 100, height: 32, config: { platformType: "bouncy", bounceForce: 900 } },
        { id: "p3", type: "platform", x: 900, y: 350, width: 150, height: 32, config: { platformType: "platform" } },
        { id: "b3", type: "bouncy", x: 1000, y: 300, width: 100, height: 32, config: { platformType: "bouncy", bounceForce: 700 } },
        { id: "p4", type: "ground", x: 1000, y: 200, width: 200, height: 32, config: { platformType: "ground" } },
      ],
      questions: [],
    },
  },
  {
    id: "puzzle_level",
    name: "Puzzle Challenge",
    nameCN: "解谜关卡",
    description: "解开谜题打开门到达终点",
    thumbnail: "🧩",
    difficulty: 3,
    levelData: {
      name: "解谜关卡",
      description: "回答问题打开门",
      difficulty: 3,
      authorId: "template",
      authorName: "系统模板",
      mapWidth: 1200,
      mapHeight: 600,
      playerStart: { x: 100, y: 500 },
      goal: { x: 1100, y: 500 },
      elements: [
        { id: "p1", type: "ground", x: 50, y: 550, width: 400, height: 32, config: { platformType: "ground" } },
        { id: "p2", type: "ground", x: 550, y: 550, width: 200, height: 32, config: { platformType: "ground" } },
        { id: "p3", type: "ground", x: 850, y: 550, width: 350, height: 32, config: { platformType: "ground" } },
        { id: "d1", type: "door", x: 500, y: 450, width: 64, height: 96, config: { mechanismType: "door", linkedTo: "q1" } },
        { id: "c1", type: "coin", x: 200, y: 480, width: 32, height: 32, config: { collectibleType: "coin", value: 10 } },
        { id: "c2", type: "coin", x: 700, y: 480, width: 32, height: 32, config: { collectibleType: "coin", value: 10 } },
      ],
      questions: [
        {
          id: "q1",
          type: "choice",
          question: "1 + 1 = ?",
          options: ["1", "2", "3", "4"],
          answer: "2",
          difficulty: 1,
          reward: { type: "unlock_door", value: 1 },
        },
      ],
    },
  },
];

interface SavedLevel {
  id: string;
  name: string;
  description?: string;
  difficulty: number;
  created_at: string;
  updated_at: string;
}

/**
 * Convert CommunityLevelDetail to PlatformGameScene level format
 * This bridges the community level data format with the game scene's expected format
 * Requirements: 3.1 - Load community level data and start game scene
 * @param levelDetail - 社区关卡详情
 * @param userQuestions - 用户云端题库（可选，如果提供则使用云端题库）
 */
function convertCommunityLevelToGameLevel(levelDetail: CommunityLevelDetail, userQuestions?: any[]): any {
  const levelData = levelDetail.level_data as any;
  
  // Group elements by type
  const platforms: any[] = [];
  const enemies: any[] = [];
  const collectibles: any[] = [];
  const traps: any[] = [];
  const mechanisms: any[] = [];
  const explosionTraps: any[] = [];
  const windZones: any[] = [];
  const portals: any[] = [];
  const gravityZones: any[] = [];
  
  const elements = levelData.elements || [];
  
  elements.forEach((element: any) => {
    const baseElement = {
      x: element.x,
      y: element.y,
      width: element.width || 64,
      height: element.height || 64,
    };
    
    // Categorize by element type
    if (element.type === 'platform' || element.type === 'ground' || element.type === 'moving' ||
        element.type === 'bouncy' || element.type === 'disappearing' || element.type === 'conveyor' ||
        element.type === 'gravity_flip') {
      const config = element.config as any;
      const platformType = config?.platformType || element.type;
      
      const platformData: any = {
        ...baseElement,
        type: platformType,
      };
      
      // 移动平台配置
      if (platformType === 'moving') {
        const moveDirection = config?.moveDirection || 'horizontal';
        const moveDistance = config?.moveDistance || 200;
        const moveSpeed = config?.moveSpeed || 100;
        
        if (moveDirection === 'horizontal') {
          platformData.movePath = [
            { x: element.x, y: element.y },
            { x: element.x + moveDistance, y: element.y }
          ];
        } else {
          platformData.movePath = [
            { x: element.x, y: element.y },
            { x: element.x, y: element.y + moveDistance }
          ];
        }
        platformData.moveSpeed = moveSpeed;
      }
      
      // 传送带配置
      if (platformType === 'conveyor') {
        platformData.conveyorSpeed = config?.conveyorSpeed || 100;
        platformData.conveyorDirection = config?.conveyorDirection || 'right';
      }
      
      // 弹跳平台配置
      if (platformType === 'bouncy') {
        platformData.bounceForce = config?.bounceForce || 800;
      }
      
      // 消失平台配置
      if (platformType === 'disappearing') {
        platformData.disappearTime = config?.disappearTime || 1000;
      }
      
      platforms.push(platformData);
    } else if (element.type.startsWith('enemy_') || element.type === 'enemy') {
      const config = element.config as any;
      const enemyData: any = {
        ...baseElement,
        type: config?.enemyType || element.type.replace('enemy_', '') || 'basic',
        patrolDistance: config?.patrolDistance || 150,
        moveSpeed: config?.moveSpeed || 60,
      };
      
      // Boss配置
      if (config?.enemyType === 'boss') {
        enemyData.isBoss = true;
        enemyData.hp = config?.bossConfig?.hp || 300;
        enemyData.defeatCondition = config?.bossConfig?.defeatCondition || 'combat';
        enemyData.questionsRequired = config?.bossConfig?.questionsRequired || 3;
        enemyData.skills = config?.bossConfig?.skills || {
          shoot: true,
          enrage: true,
        };
      }
      
      enemies.push(enemyData);
    } else if (['coin', 'gem', 'key', 'clue'].includes(element.type)) {
      const config = element.config as any;
      collectibles.push({
        ...baseElement,
        type: config?.collectibleType || element.type,
        value: config?.value || 10,
      });
    } else if (['spike', 'fire', 'electric'].includes(element.type)) {
      const config = element.config as any;
      traps.push({
        ...baseElement,
        type: config?.trapType || element.type,
        damage: config?.damage || 20,
        pattern: config?.pattern || 'static',
      });
    } else if (element.type === 'explosion') {
      const config = element.config as any;
      explosionTraps.push({
        ...baseElement,
        damage: config?.damage || 50,
        blastRadius: 80,
        warningTime: 1000,
        cooldownTime: 3000,
      });
    } else if (element.type === 'wind') {
      const config = element.config as any;
      windZones.push({
        ...baseElement,
        direction: config?.windDirection || 'up',
        windForce: config?.windForce || 300,
      });
    } else if (element.type === 'portal') {
      const config = element.config as any;
      portals.push({
        ...baseElement,
        id: config?.portalId || element.id,
        linkedTo: config?.linkedTo,
        color: config?.portalColor || 'blue',
      });
    } else if (element.type === 'gravity_zone') {
      const config = element.config as any;
      gravityZones.push({
        ...baseElement,
        gravityMultiplier: config?.gravityMultiplier ?? -1,
      });
    } else if (['button', 'lever', 'door', 'trampoline'].includes(element.type)) {
      const config = element.config as any;
      const mechanismData: any = {
        ...baseElement,
        id: element.id,
        type: config?.mechanismType || element.type,
        linkedTo: config?.linkedTo,
      };
      mechanisms.push(mechanismData);
    }
  });
  
  // Build the level object in PlatformGameScene format
  return {
    id: levelDetail.id,
    name: levelDetail.name,
    description: levelDetail.description,
    difficulty: levelDetail.difficulty,
    isCustomLevel: true,
    isCommunityLevel: true,  // Flag to indicate this is a community level
    authorName: levelDetail.author_name,
    authorId: levelDetail.author_id,
    
    // Objectives
    objectives: [
      {
        type: 'reach_goal',
        description: '到达终点',
        target: 1,
      }
    ],
    
    // Map data in campaignMapData format
    campaignMapData: {
      width: levelDetail.map_width,
      height: levelDetail.map_height,
      platforms,
      enemies,
      collectibles,
      traps,
      mechanisms,
      explosionTraps,
      windZones,
      portals,
      gravityZones,
      startPosition: levelData.playerStart,
      goal: levelData.goal,
    },
    
    // Also provide in standard map format for compatibility
    map: {
      width: levelDetail.map_width,
      height: levelDetail.map_height,
      platforms,
      obstacles: traps,
      enemies: [],
      collectibles: [],
      startPosition: levelData.playerStart,
    },
    
    // Player start position
    playerStart: levelData.playerStart,
    
    // Goal position
    goal: levelData.goal,
    
    // Questions: Use player's own question bank (Requirements: 3.2)
    questions: (userQuestions && userQuestions.length > 0) ? userQuestions : (levelData.questions || []),
  };
}

interface CreativeWorkshopMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onStartEditing: () => void;
}

export default function CreativeWorkshopMenu({
  isOpen,
  onClose,
  onStartEditing,
}: CreativeWorkshopMenuProps) {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  const { reset, loadTemplate, loadFromCloud, importFromJSON } = useEditorStore();
  const deviceInfo = useDeviceType();  // 移动端检测
  const isMobile = deviceInfo.type === 'mobile' || deviceInfo.type === 'tablet';
  
  const [activeTab, setActiveTab] = useState<"new" | "load" | "templates" | "community">("new");
  const [savedLevels, setSavedLevels] = useState<SavedLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCommunityBrowser, setShowCommunityBrowser] = useState(false);
  
  // Community level player state (Requirements: 3.1, 3.2, 3.3)
  const [isPlayingCommunityLevel, setIsPlayingCommunityLevel] = useState(false);
  const [communityLevelData, setCommunityLevelData] = useState<CommunityLevelDetail | null>(null);
  const [communityGameRef, setCommunityGameRef] = useState<Phaser.Game | null>(null);
  const communityContainerRef = useRef<HTMLDivElement>(null);
  const [communityQuestions, setCommunityQuestions] = useState<any[]>([]);
  const [showCommunityQuiz, setShowCommunityQuiz] = useState(false);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState<any>(null);
  const [quizCallbacks, setQuizCallbacks] = useState<{ onCorrect: () => void; onWrong: () => void } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [showCommunityComplete, setShowCommunityComplete] = useState(false);
  const [communityCompleteData, setCommunityCompleteData] = useState<any>(null);
  const playRecordedRef = useRef(false);  // Track if play has been recorded
  const playRecordingInFlightRef = useRef(false);

  // Fetch saved levels when load tab is active
  useEffect(() => {
    if (activeTab === "load" && isAuthenticated && token) {
      fetchSavedLevels();
    }
  }, [activeTab, isAuthenticated, token]);

  const fetchSavedLevels = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/custom-levels`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("获取关卡列表失败");
      }
      
      const data = await response.json();
      setSavedLevels(data);
    } catch (err) {
      console.error("[CreativeWorkshopMenu] Failed to fetch levels:", err);
      setError(toFriendlyMessage(err, "获取关卡列表失败"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewLevel = () => {
    reset();
    onStartEditing();
  };

  const handleLoadLevel = async (levelId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await loadFromCloud(levelId);
      if (success) {
        onStartEditing();
      } else {
        setError("加载关卡失败");
      }
    } catch (err) {
      console.error("[CreativeWorkshopMenu] Failed to load level:", err);
      setError(toFriendlyMessage(err, "加载关卡失败"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/custom-levels/${levelId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("删除关卡失败");
      }
      
      // Refresh the list
      await fetchSavedLevels();
      setDeleteConfirm(null);
    } catch (err) {
      console.error("[CreativeWorkshopMenu] Failed to delete level:", err);
      setError(toFriendlyMessage(err, "删除关卡失败"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadTemplate = (template: LevelTemplate) => {
    loadTemplate(template.levelData);
    onStartEditing();
  };

  // Handler for playing community levels (Requirements: 3.1, 3.2, 3.3)
  const handlePlayCommunityLevel = useCallback(async (levelId: string) => {
    console.log("[CreativeWorkshopMenu] Play community level:", levelId);
    setIsLoading(true);
    setError(null);
    playRecordedRef.current = false;  // Reset play recorded flag
    playRecordingInFlightRef.current = false;
    
    try {
      // 1. Load community level data via API (Requirements: 3.1)
      const levelDetail = await getCommunityLevel(levelId, token || undefined);
      console.log("[CreativeWorkshopMenu] Loaded community level:", levelDetail.name);
      setCommunityLevelData(levelDetail);
      
      // 2. Get player's own question bank (Requirements: 3.2)
      let userQuestions: any[] = [];
      if (token) {
        try {
          userQuestions = await getRandomQuestions(token, 50);
          console.log("[CreativeWorkshopMenu] Loaded user questions:", userQuestions.length);
        } catch (err) {
          console.warn("[CreativeWorkshopMenu] Failed to load user questions:", err);
        }
      }
      setCommunityQuestions(userQuestions);
      
      // 3. Close the browser and show the game
      setShowCommunityBrowser(false);
      setIsPlayingCommunityLevel(true);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载关卡失败";
      console.error("[CreativeWorkshopMenu] Failed to load community level:", err);
      setError(toFriendlyMessage(err, message));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const recordCommunityPlayAndRewards = useCallback(
    async (context: string) => {
      if (!communityLevelData || playRecordedRef.current || playRecordingInFlightRef.current) return;
      playRecordingInFlightRef.current = true;

      try {
        await recordPlay(communityLevelData.id, token || undefined);
        playRecordedRef.current = true;
        console.log(`[CreativeWorkshopMenu] Play recorded (${context})`);
      } catch (err) {
        console.warn(`[CreativeWorkshopMenu] Failed to record play (${context}):`, err);
        return;
      } finally {
        playRecordingInFlightRef.current = false;
      }

      // 🍖 发放创意工坊游玩奖励（第一次记录时发放）
      try {
        const { grantWorkshopPlayReward } = await import('@/lib/utils/foodRewards');
        const { showFoodRewardToast } = await import('@/components/ui/FoodRewardToast');
        await grantWorkshopPlayReward(showFoodRewardToast);
        console.log('[CreativeWorkshopMenu] 创意工坊游玩食物奖励发放成功');
      } catch (error) {
        console.error('[CreativeWorkshopMenu] 食物奖励发放失败:', error);
      }

    },
    [communityLevelData, token]
  );
  
  // Initialize Phaser game for community level
  useEffect(() => {
    if (!isPlayingCommunityLevel || !communityLevelData || !communityContainerRef.current) return;
    if (communityGameRef) return;  // Already initialized
    let isActive = true;
    
    const initCommunityGame = async () => {
      try {
        // Convert community level to game format
        const gameLevel = convertCommunityLevelToGameLevel(communityLevelData, communityQuestions);
        console.log("[CreativeWorkshopMenu] Starting community level game:", gameLevel.name);
        
        // Create a custom scene class that receives level data
        class CommunityGameScene extends PlatformGameScene {
          constructor() {
            super();
          }
        }
        
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: 960,
          height: 640,
          parent: communityContainerRef.current!,
          backgroundColor: "#1A0505",
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            expandParent: false,
          },
          physics: {
            default: "arcade",
            arcade: {
              gravity: { x: 0, y: 500 },
              debug: false,
            },
          },
          scene: [],  // Don't auto-start any scene
          input: {
            keyboard: {
              target: window,
            },
          },
        };
        
        const game = new Phaser.Game(config);
        if (!isActive) {
          destroyPhaserGameSafely(game, communityContainerRef.current);
          return;
        }
        setCommunityGameRef(game);
        
        // Add scene and start with level data after game is ready
        game.events.once("ready", () => {
          if (!isActive) {
            return;
          }
          console.log("[CreativeWorkshopMenu] Game ready, starting scene with level:", gameLevel.name);
          game.scene.add("PlatformGameScene", CommunityGameScene, true, { level: gameLevel });
        });
        
      } catch (err) {
        console.error("[CreativeWorkshopMenu] Failed to initialize community game:", err);
        setError("启动游戏失败");
        setIsPlayingCommunityLevel(false);
      }
    };
    
    initCommunityGame();
    
    return () => {
      isActive = false;
      destroyPhaserGameSafely(communityGameRef, communityContainerRef.current);
    };
  }, [isPlayingCommunityLevel, communityLevelData, communityQuestions, communityGameRef]);
  
  // Listen for game events when playing community level
  useEffect(() => {
    if (!isPlayingCommunityLevel || !communityLevelData) return;
    
    // Handle level complete event
    const handleLevelComplete = async (event: CustomEvent) => {
      const { success } = event.detail || {};
      console.log("[CreativeWorkshopMenu] Community level complete:", success);
      
      // Record play on level complete (Requirements: 3.3)
      await recordCommunityPlayAndRewards('complete');
      
      if (success) {
        setCommunityCompleteData({ success: true, message: "恭喜通关！" });
        setShowCommunityComplete(true);
      }
    };
    
    // Handle quiz event for community level
    const handleCommunityQuiz = (event: CustomEvent) => {
      const { question, onCorrect, onWrong } = event.detail || {};
      
      if (showCommunityQuiz) return;  // Already showing quiz
      
      if (question) {
        setCurrentQuizQuestion(question);
        setQuizCallbacks({ onCorrect, onWrong });
        setSelectedAnswer(null);
        setAnswerResult(null);
        setShowCommunityQuiz(true);
      }
    };
    
    // Handle player death event
    const handlePlayerDeath = async () => {
      console.log("[CreativeWorkshopMenu] handlePlayerDeath called, showCommunityQuiz:", showCommunityQuiz);
      if (showCommunityQuiz) return;  // Already showing quiz
      
      // Record play on death (Requirements: 3.3)
      void recordCommunityPlayAndRewards('death');
      
      // 获取可用的题目：优先使用云端题库，否则使用关卡自带题目
      const levelQuestions = (communityLevelData?.level_data as any)?.questions || [];
      const availableQuestions = communityQuestions.length > 0 ? communityQuestions : levelQuestions;
      console.log("[CreativeWorkshopMenu] Available questions:", availableQuestions.length, 
        "(cloud:", communityQuestions.length, ", level:", levelQuestions.length, ")");
      
      // Show quiz for revival
      if (availableQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const question = availableQuestions[randomIndex];
        setCurrentQuizQuestion(question);
        setQuizCallbacks({
          onCorrect: () => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("playerRevive", {
                detail: { hpPercent: 0.5 }
              }));
            }
          },
          onWrong: () => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("playerGameOver"));
            }
          }
        });
        setSelectedAnswer(null);
        setAnswerResult(null);
        setShowCommunityQuiz(true);
      } else {
        // No questions available, game over
        console.log("[CreativeWorkshopMenu] No questions available, game over");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("playerGameOver"));
        }
      }
    };
    
    window.addEventListener("platformLevelComplete", handleLevelComplete as unknown as EventListener);
    window.addEventListener("customLevelQuiz", handleCommunityQuiz as unknown as EventListener);
    window.addEventListener("playerDeath", handlePlayerDeath);
    
    return () => {
      window.removeEventListener("platformLevelComplete", handleLevelComplete as unknown as EventListener);
      window.removeEventListener("customLevelQuiz", handleCommunityQuiz as unknown as EventListener);
      window.removeEventListener("playerDeath", handlePlayerDeath);
    };
  }, [isPlayingCommunityLevel, communityLevelData, communityQuestions, token, showCommunityQuiz, recordCommunityPlayAndRewards]);
  
  // Handler for exiting community level
  const handleExitCommunityLevel = useCallback(async () => {
    console.log("[CreativeWorkshopMenu] Exiting community level");
    
    // Record play on exit if not already recorded (Requirements: 3.3)
    await recordCommunityPlayAndRewards('exit');
    
    // Cleanup game
    if (communityGameRef) {
      destroyPhaserGameSafely(communityGameRef, communityContainerRef.current);
      setCommunityGameRef(null);
    } else {
      destroyPhaserGameSafely(null, communityContainerRef.current);
    }
    
    // Reset state
    setIsPlayingCommunityLevel(false);
    setCommunityLevelData(null);
    setCommunityQuestions([]);
    setShowCommunityQuiz(false);
    setCurrentQuizQuestion(null);
    setQuizCallbacks(null);
    setSelectedAnswer(null);
    setAnswerResult(null);
    setShowCommunityComplete(false);
    setCommunityCompleteData(null);
    playRecordedRef.current = false;
    playRecordingInFlightRef.current = false;
  }, [communityGameRef, recordCommunityPlayAndRewards]);

  if (!isOpen) return null;

  // Community Level Player View (Requirements: 3.1, 3.2, 3.3, 3.4)
  if (isPlayingCommunityLevel && communityLevelData) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Header with level info (Requirements: 3.4) */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-600">
          <div className="flex items-center gap-3">
            <span className="text-green-400 animate-pulse">🎮</span>
            <span className="text-green-300 font-pixel">社区关卡</span>
            <span className="text-slate-300 truncate max-w-[200px]">
              {communityLevelData.name}
            </span>
            <span className="text-slate-500 text-sm">
              by {communityLevelData.author_name}
            </span>
          </div>
          <button
            onClick={handleExitCommunityLevel}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-red-300" />
            <span className="text-red-300">退出</span>
          </button>
        </div>
        
        {/* Game Container */}
        <div className="flex-1 flex items-center justify-center bg-[#020617]">
          <div
            ref={communityContainerRef}
            className="w-[960px] h-[640px] max-w-full max-h-full"
            style={{ aspectRatio: '960/640' }}
          />
        </div>
        
        {/* 移动端虚拟控制器 */}
        {isMobile && !showCommunityQuiz && !showCommunityComplete && (
          <VirtualController visible={true} opacity={0.7} />
        )}
        
        {/* Quiz Modal for community level */}
        {showCommunityQuiz && currentQuizQuestion && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-slate-900/95 rounded-xl p-6 max-w-lg w-full mx-4 border border-slate-700">
              <h3 className="text-xl font-bold text-sky-300 mb-4 text-center">
                📝 答题挑战
              </h3>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  currentQuizQuestion.type === 'choice' ? 'bg-sky-700' : 'bg-indigo-700'
                }`}>
                  {currentQuizQuestion.type === 'choice' ? '选择题' : '填空题'}
                </span>
                <span className="text-xs text-slate-300">
                  难度 {'⭐'.repeat(currentQuizQuestion.difficulty || 1)}
                </span>
              </div>
              <p className="text-slate-100 mb-6 text-lg text-center">
                {currentQuizQuestion.question}
              </p>
              
              {/* Choice options */}
              {currentQuizQuestion.type === 'choice' && currentQuizQuestion.options && (
                <div className="space-y-3 mb-6">
                  {currentQuizQuestion.options.map((option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (answerResult) return;
                        setSelectedAnswer(option);
                      }}
                      disabled={answerResult !== null}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedAnswer === option
                          ? answerResult === 'correct'
                            ? 'bg-green-600 border-2 border-green-400'
                            : answerResult === 'wrong'
                            ? 'bg-red-600 border-2 border-red-400'
                            : 'bg-sky-700 border-2 border-sky-500'
                          : 'bg-slate-800 hover:bg-slate-700 border-2 border-transparent'
                      }`}
                    >
                      <span className="text-slate-100">{String.fromCharCode(65 + index)}. {option}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Fill-in input */}
              {currentQuizQuestion.type === 'fill' && (
                <div className="mb-6">
                  <input
                    type="text"
                    value={selectedAnswer || ''}
                    onChange={(e) => {
                      if (answerResult) return;
                      setSelectedAnswer(e.target.value);
                    }}
                    disabled={answerResult !== null}
                    placeholder="请输入答案..."
                    className={`w-full px-4 py-3 rounded-lg text-center text-lg transition-all ${
                      answerResult === 'correct'
                        ? 'bg-green-600 border-2 border-green-400 text-white'
                        : answerResult === 'wrong'
                        ? 'bg-red-600 border-2 border-red-400 text-white'
                        : 'bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none'
                    }`}
                    autoFocus
                  />
                </div>
              )}
              
              {/* Answer result */}
              {answerResult && (
                <div className={`text-center mb-4 p-3 rounded-lg ${
                  answerResult === 'correct' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                }`}>
                  {answerResult === 'correct' ? '✅ 回答正确！' : '❌ 回答错误！'}
                  {answerResult === 'wrong' && currentQuizQuestion.type === 'fill' && (
                    <p className="text-sm mt-1 text-slate-200">正确答案: {currentQuizQuestion.answer}</p>
                  )}
                  {currentQuizQuestion.explanation && (
                    <p className="text-sm mt-2 text-slate-300">{currentQuizQuestion.explanation}</p>
                  )}
                </div>
              )}
              
              {/* Submit button */}
              <div className="flex gap-3 justify-center">
                {!answerResult ? (
                  <button
                    onClick={() => {
                      if (!selectedAnswer || selectedAnswer.trim() === '') return;
                      const userAnswer = selectedAnswer.trim().toLowerCase();
                      const correctAnswer = String(currentQuizQuestion.answer).trim().toLowerCase();
                      const isCorrect = userAnswer === correctAnswer;
                      setAnswerResult(isCorrect ? 'correct' : 'wrong');
                      
                      setTimeout(() => {
                        setShowCommunityQuiz(false);
                        if (isCorrect) {
                          quizCallbacks?.onCorrect?.();
                        } else {
                          quizCallbacks?.onWrong?.();
                        }
                      }, 1500);
                    }}
                    disabled={!selectedAnswer || selectedAnswer.trim() === ''}
                    className={`px-6 py-2 rounded-lg transition-colors ${
                      selectedAnswer && selectedAnswer.trim() !== ''
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    确认答案
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
        
        {/* Level Complete Modal */}
        {showCommunityComplete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-green-900 via-slate-900 to-teal-900 rounded-xl p-8 max-w-md w-full mx-4 border-2 border-green-500/50 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-green-100 mb-4">
                恭喜通关！
              </h3>
              <p className="text-green-200/80 mb-6">
                {communityCompleteData?.message || '你成功完成了这个社区关卡！'}
              </p>
              <p className="text-slate-400 text-sm mb-6">
                关卡作者: {communityLevelData.author_name}
              </p>
              <button
                onClick={() => {
                  setShowCommunityComplete(false);
                  setCommunityCompleteData(null);
                  handleExitCommunityLevel();
                }}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white font-bold"
              >
                返回社区
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-800 backdrop-blur-md rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-2 border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-blue-900/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎨</span>
            <h2 className="text-2xl font-bold text-blue-400 font-pixel">
              创意工坊
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-blue-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex-1 px-6 py-3 flex items-center justify-center gap-2 transition-colors ${
              activeTab === "new"
                ? "bg-blue-900/30 text-blue-400 border-b-2 border-blue-600"
                : "text-slate-500 hover:bg-blue-700"
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="font-pixel">新建关卡</span>
          </button>
          <button
            onClick={() => setActiveTab("load")}
            className={`flex-1 px-6 py-3 flex items-center justify-center gap-2 transition-colors ${
              activeTab === "load"
                ? "bg-blue-900/30 text-blue-400 border-b-2 border-blue-600"
                : "text-slate-500 hover:bg-blue-700"
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="font-pixel">加载关卡</span>
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex-1 px-6 py-3 flex items-center justify-center gap-2 transition-colors ${
              activeTab === "templates"
                ? "bg-blue-900/30 text-blue-400 border-b-2 border-blue-600"
                : "text-slate-500 hover:bg-blue-700"
            }`}
          >
            <Layout className="w-5 h-5" />
            <span className="font-pixel">模板选择</span>
          </button>
          <button
            onClick={() => setShowCommunityBrowser(true)}
            className="flex-1 px-6 py-3 flex items-center justify-center gap-2 transition-colors text-slate-500 hover:bg-blue-700"
          >
            <Globe className="w-5 h-5" />
            <span className="font-pixel">浏览社区</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* New Level Tab */}
          {activeTab === "new" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-6">✨</div>
              <h3 className="text-xl font-bold text-white mb-4">
                创建新关卡
              </h3>
              <p className="text-slate-500 text-center mb-8 max-w-md">
                从空白画布开始，发挥你的创意，设计独一无二的关卡！
              </p>
              <button
                onClick={handleNewLevel}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 rounded-xl text-white font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-6 h-6" />
                  开始创作
                </span>
              </button>
            </div>
          )}

          {/* Load Level Tab */}
          {activeTab === "load" && (
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : savedLevels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-6xl mb-6">📂</div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    暂无保存的关卡
                  </h3>
                  <p className="text-slate-500 text-center mb-8">
                    创建你的第一个关卡吧！
                  </p>
                  <button
                    onClick={() => setActiveTab("new")}
                    className="px-6 py-3 bg-blue-900/20 hover:bg-blue-700 border border-slate-600 rounded-lg text-blue-400 transition-colors"
                  >
                    新建关卡
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedLevels.map((level) => (
                    <div
                      key={level.id}
                      className="bg-slate-800 border border-slate-600 rounded-lg p-4 hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-bold text-white truncate flex-1">
                          {level.name}
                        </h4>
                        <div className="flex items-center gap-1 ml-2">
                          {[1, 2, 3].map((star) => (
                            <span
                              key={star}
                              className={star <= level.difficulty ? "text-yellow-400" : "text-gray-600"}
                            >
                              ⭐
                            </span>
                          ))}
                        </div>
                      </div>
                      {level.description && (
                        <p className="text-slate-500 text-sm mb-3 line-clamp-2">
                          {level.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {new Date(level.updated_at).toLocaleDateString("zh-CN")}
                        </span>
                        <div className="flex gap-2">
                          {deleteConfirm === level.id ? (
                            <>
                              <button
                                onClick={() => handleDeleteLevel(level.id)}
                                className="px-3 py-1.5 bg-red-600/50 hover:bg-red-600/70 rounded text-red-200 text-sm transition-colors"
                              >
                                确认删除
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-1.5 bg-gray-600/50 hover:bg-gray-600/70 rounded text-gray-200 text-sm transition-colors"
                              >
                                取消
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setDeleteConfirm(level.id)}
                                className="p-1.5 hover:bg-red-900/30 rounded transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                              <button
                                onClick={() => handleLoadLevel(level.id)}
                                className="px-4 py-1.5 bg-blue-900/20 hover:bg-blue-700 border border-slate-600 rounded text-blue-400 text-sm transition-colors"
                              >
                                加载
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {LEVEL_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="bg-slate-800 border border-slate-600 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer group"
                  onClick={() => handleLoadTemplate(template)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{template.thumbnail}</span>
                    <div>
                      <h4 className="text-lg font-bold text-white group-hover:text-yellow-200 transition-colors">
                        {template.nameCN}
                      </h4>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((star) => (
                          <span
                            key={star}
                            className={star <= template.difficulty ? "text-amber-500 text-sm" : "text-gray-600 text-sm"}
                          >
                            ⭐
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm">
                    {template.description}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <span className="text-xs text-blue-400/60">
                      点击使用此模板
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Community Browser Modal */}
      <CommunityBrowserModal
        isOpen={showCommunityBrowser}
        onClose={() => setShowCommunityBrowser(false)}
        onPlayLevel={handlePlayCommunityLevel}
      />
    </div>
  );
}

// Export templates for use in other components
export { LEVEL_TEMPLATES };
export type { LevelTemplate };
