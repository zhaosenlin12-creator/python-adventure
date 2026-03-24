"use client";

/**
 * 创意工坊编辑器页面内容组件
 * Requirements: 1.2 - 创意工坊入口和编辑器界面
 * Requirements: 1.3 - 创意工坊菜单（新建、加载、模板）
 * Requirements: 10.2, 10.3, 10.4 - 测试模式
 * Requirements: 设计文档-自动保存
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as Phaser from "phaser";
import { useEditorStore } from "@/store/editorStore";
import { useAuthStore } from "@/store/authStore";
import { useDeviceType } from "@/hooks/useDeviceType";
import { LevelEditorScene } from "@/components/world/scenes/LevelEditorScene";
import PlatformGameScene from "@/components/world/scenes/PlatformGameScene";
import ElementPalette from "@/components/editor/ElementPalette";
import PropertyPanel from "@/components/editor/PropertyPanel";
import EditorToolbar from "@/components/editor/EditorToolbar";
import MobileEditorToolbar from "@/components/editor/MobileEditorToolbar";
import MobileElementPanel from "@/components/editor/MobileElementPanel";
import MobilePropertyPanel from "@/components/editor/MobilePropertyPanel";
import LevelSettingsModal from "@/components/editor/LevelSettingsModal";
import LevelSelectModal from "@/components/editor/LevelSelectModal";
import AutoSaveIndicator from "@/components/editor/AutoSaveIndicator";
import CreativeWorkshopMenu from "@/components/editor/CreativeWorkshopMenu";
import TutorialOverlay, { markTutorialCompleted } from "@/components/editor/TutorialOverlay";
import VirtualController from "@/components/game/VirtualController";
import { SyncStatusIndicator } from "@/components/game/SyncStatusIndicator";
import { EditorElement, EditorTool, ElementConfig, CustomLevelData } from "@/types/editor";
import { Home, Settings, AlertCircle, HelpCircle, AlertTriangle, RefreshCw } from "lucide-react";
// 导入音效系统，确保测试模式有音效
import "@/lib/soundEffects";
// 🔥 导入用户题库API
import { getRandomQuestions } from "@/lib/api/userQuestions";

/**
 * Convert CustomLevelData to PlatformGameScene level format
 * This bridges the editor's data format with the game scene's expected format
 * @param levelData - 关卡数据
 * @param userQuestions - 用户云端题库（可选，如果提供则使用云端题库）
 */
function convertToGameLevel(levelData: CustomLevelData, userQuestions?: any[]): any {
  // Group elements by type
  const platforms: any[] = [];
  const enemies: any[] = [];
  const collectibles: any[] = [];
  const traps: any[] = [];
  const mechanisms: any[] = [];
  const explosionTraps: any[] = [];  // 🔥 爆炸陷阱单独处理
  const windZones: any[] = [];       // 🔥 风力区域单独处理
  const portals: any[] = [];         // 🔥 传送门单独处理
  const gravityZones: any[] = [];    // 🔥 重力区域单独处理

  levelData.elements.forEach((element) => {
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

      // 构建平台数据
      const platformData: any = {
        ...baseElement,
        type: platformType,
      };

      // 移动平台配置
      if (platformType === 'moving') {
        const moveDirection = config?.moveDirection || 'horizontal';
        const moveDistance = config?.moveDistance || 200;
        const moveSpeed = config?.moveSpeed || 100;

        // 转换为PlatformGameScene期望的movePath格式
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
        // 巡逻配置
        patrolDistance: config?.patrolDistance || 150,
        moveSpeed: config?.moveSpeed || 60,
      };

      // Boss配置
      if (config?.enemyType === 'boss') {
        enemyData.isBoss = true;
        enemyData.hp = config?.bossConfig?.hp || 300;
        enemyData.defeatCondition = config?.bossConfig?.defeatCondition || 'combat';
        enemyData.questionsRequired = config?.bossConfig?.questionsRequired || 3;
        // 🔥 传递Boss技能配置
        enemyData.skills = config?.bossConfig?.skills || {
          shoot: true,
          enrage: true,
        };
      }

      enemies.push(enemyData);
    } else if (['coin', 'gem', 'key', 'clue', 'health_pack'].includes(element.type)) {
      const config = element.config as any;
      collectibles.push({
        ...baseElement,
        type: config?.collectibleType || element.type,
        value: config?.value || 10,
      });
    } else if (['spike', 'fire', 'electric'].includes(element.type)) {
      // 🔥 普通陷阱（尖刺、火焰、电击）
      const config = element.config as any;
      traps.push({
        ...baseElement,
        type: config?.trapType || element.type,
        damage: config?.damage || 20,
        pattern: config?.pattern || 'static',
      });
    } else if (element.type === 'explosion') {
      // 🔥 爆炸陷阱单独处理（PlatformGameScene期望在explosionTraps数组中）
      const config = element.config as any;
      explosionTraps.push({
        ...baseElement,
        damage: config?.damage || 50,
        blastRadius: 80,
        warningTime: 1000,
        cooldownTime: 3000,
      });
    } else if (element.type === 'wind') {
      // 🔥 风力区域 - 放到 windZones 数组
      const config = element.config as any;
      windZones.push({
        ...baseElement,
        direction: config?.windDirection || 'up',
        windForce: config?.windForce || 300,
      });
    } else if (element.type === 'portal') {
      // 🔥 传送门 - 放到 portals 数组
      const config = element.config as any;
      portals.push({
        ...baseElement,
        id: config?.portalId || element.id,  // 使用配置的portalId或元素ID
        linkedTo: config?.linkedTo,           // 链接的传送门ID（PlatformGameScene期望的字段名）
        color: config?.portalColor || 'blue',
      });
    } else if (element.type === 'gravity_zone') {
      // 🔥 重力区域 - 放到 gravityZones 数组
      const config = element.config as any;
      gravityZones.push({
        ...baseElement,
        gravityMultiplier: config?.gravityMultiplier ?? -1,  // 默认反重力
      });
    } else if (['button', 'lever', 'door', 'trampoline'].includes(element.type)) {
      // 🔥 其他机关（按钮、拉杆、门、蹦床）
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
    id: levelData.id || 'custom_test',
    name: levelData.name,
    description: levelData.description,
    difficulty: levelData.difficulty,
    isCustomLevel: true,  // Flag to indicate this is a custom level
    isTestMode: true,     // Flag to indicate test mode

    // Objectives (required by PlatformGameScene)
    objectives: [
      {
        type: 'reach_goal',
        description: '到达终点',
        target: 1,
      }
    ],

    // Map data in campaignMapData format (used by PlatformGameScene)
    campaignMapData: {
      width: levelData.mapWidth,
      height: levelData.mapHeight,
      platforms,
      enemies,
      collectibles,
      traps,
      mechanisms,
      explosionTraps,  // 🔥 爆炸陷阱单独数组
      windZones,       // 🔥 风力区域单独数组
      portals,         // 🔥 传送门单独数组
      gravityZones,    // 🔥 重力区域单独数组
      // 使用startPosition而不是playerStart（PlatformGameScene期望的格式）
      startPosition: levelData.playerStart,
      goal: levelData.goal,
    },

    // Also provide in standard map format for compatibility
    map: {
      width: levelData.mapWidth,
      height: levelData.mapHeight,
      platforms,
      obstacles: traps,  // Traps are treated as obstacles
      enemies: [],
      collectibles: [],
      // 同样使用startPosition
      startPosition: levelData.playerStart,
    },

    // Player start position
    playerStart: levelData.playerStart,

    // Goal position
    goal: levelData.goal,

    // Questions for question triggers
    // 🔥 v2.4.6: 优先使用云端用户题库，如果没有则使用关卡默认题库
    questions: (userQuestions && userQuestions.length > 0) ? userQuestions : levelData.questions,
  };
}

export default function EditorPageContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const deviceInfo = useDeviceType();
  const isMobile = deviceInfo.type === "mobile" || deviceInfo.type === "tablet";
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Editor state
  const {
    levelName,
    selectedElementId,
    elements,
    currentTool,
    isDirty,
    error,
    isSimpleMode,
    isTestMode,
    showTutorial,
    setTool,
    clearError,
    enterTestMode,
    exitTestMode,
    exportToJSON,
    validateLevel,
  } = useEditorStore();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [testLevelData, setTestLevelData] = useState<CustomLevelData | null>(null);
  const [showMenu, setShowMenu] = useState(true);  // Show menu on initial load
  const [isEditing, setIsEditing] = useState(false);  // Track if user has started editing
  const [positionWarning, setPositionWarning] = useState<{
    type: string;
    warnings: string[];
  } | null>(null);  // Position validation warnings

  // 🔥 创意工坊测试模式状态
  const [showCustomQuiz, setShowCustomQuiz] = useState(false);  // 自定义题目答题弹窗
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState<any>(null);  // 当前答题题目
  const [quizCallbacks, setQuizCallbacks] = useState<{ onCorrect: () => void; onWrong: () => void } | null>(null);
  const [showTestComplete, setShowTestComplete] = useState(false);  // 测试通关提示
  const [testCompleteData, setTestCompleteData] = useState<any>(null);  // 通关数据
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);  // 选中的答案
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);  // 答题结果
  const [testQuestions, setTestQuestions] = useState<any[]>([]);  // 🔥 测试模式用的题目（从云端获取）

  // Mobile panel state - Requirements: 15.4
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showMobileProperties, setShowMobileProperties] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Get selected element
  const selectedElement: EditorElement | null = selectedElementId
    ? elements.find(el => el.id === selectedElementId) ?? null
    : null;

  // Initialize Phaser game when editing starts
  useEffect(() => {
    setMounted(true);

    // Only initialize Phaser when user starts editing
    if (typeof window === "undefined" || gameRef.current || !isEditing) return;

    let isMounted = true;

    const initGame = async () => {
      try {
        if (!containerRef.current || !isMounted) return;

        const editorState = useEditorStore.getState();

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: 960,
          height: 640,
          parent: containerRef.current,
          backgroundColor: "#1A0505",
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            // 🔥 关键：不扩展父容器，防止挤压左右面板
            expandParent: false,
          },
          physics: {
            default: "arcade",
            arcade: {
              gravity: { x: 0, y: 500 },  // 🔥 与战役模式一致的重力值
              debug: false,
            },
          },
          scene: [LevelEditorScene, PlatformGameScene],  // Include both scenes
          input: {
            keyboard: {
              target: window,
            },
          },
        };

        gameRef.current = new Phaser.Game(config);

        // Start the editor scene with initial data
        gameRef.current.events.once("ready", () => {
          if (gameRef.current) {
            const scene = gameRef.current.scene.getScene("LevelEditorScene");
            if (scene) {
              scene.scene.restart({
                mapWidth: editorState.mapWidth,
                mapHeight: editorState.mapHeight,
              });
            }
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error("[EditorPage] Failed to initialize Phaser:", err);
        setIsLoading(false);
      }
    };

    initGame();

    return () => {
      isMounted = false;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [isEditing]);

  // Handle tool change
  const handleToolChange = useCallback((tool: EditorTool) => {
    setTool(tool);

    // Dispatch event to Phaser scene
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("editor-tool-change", {
        detail: { tool },
      }));
    }
  }, [setTool]);

  // Handle element selection from palette
  const handleElementSelect = useCallback((elementType: string, config?: ElementConfig, defaultSize?: { width: number; height: number }) => {
    setTool("place");

    // Dispatch event to Phaser scene
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("editor-place-element", {
        detail: { elementType, config, defaultSize },
      }));
    }
  }, [setTool]);

  // Handle property change - 支持嵌套属性如 config.bossConfig.skills.shoot
  const handlePropertyChange = useCallback((property: string, value: unknown) => {
    if (!selectedElementId) return;

    const { updateElement } = useEditorStore.getState();
    const element = elements.find(el => el.id === selectedElementId);
    if (!element) return;

    if (property.startsWith("config.")) {
      const configPath = property.replace("config.", "");

      // 深度克隆当前配置
      const newConfig = JSON.parse(JSON.stringify(element.config || {}));

      // 处理嵌套路径，如 "bossConfig.hp" 或 "bossConfig.skills.shoot"
      const pathParts = configPath.split(".");
      if (pathParts.length === 1) {
        // 单层: config.moveSpeed
        newConfig[pathParts[0]] = value;
      } else if (pathParts.length === 2) {
        // 双层: config.bossConfig.hp
        if (!newConfig[pathParts[0]]) {
          newConfig[pathParts[0]] = {};
        }
        newConfig[pathParts[0]][pathParts[1]] = value;
      } else if (pathParts.length === 3) {
        // 🔥 三层: config.bossConfig.skills.shoot
        if (!newConfig[pathParts[0]]) {
          newConfig[pathParts[0]] = {};
        }
        if (!newConfig[pathParts[0]][pathParts[1]]) {
          newConfig[pathParts[0]][pathParts[1]] = {};
        }
        newConfig[pathParts[0]][pathParts[1]][pathParts[2]] = value;
      }

      updateElement(selectedElementId, { config: newConfig });
    } else {
      updateElement(selectedElementId, { [property]: value });
    }
  }, [selectedElementId, elements]);

  // Handle delete element
  const handleDeleteElement = useCallback(() => {
    if (!selectedElementId) return;

    const { removeElement } = useEditorStore.getState();
    removeElement(selectedElementId);
  }, [selectedElementId]);

  // Handle exit
  const handleExit = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.push("/world");
    }
  }, [isDirty, router]);

  // Handle confirm exit
  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false);
    router.push("/world");
  }, [router]);

  // Handle starting editing from menu
  const handleStartEditing = useCallback(() => {
    setShowMenu(false);
    setIsEditing(true);
  }, []);

  // Handle tutorial completion
  const handleTutorialComplete = useCallback(() => {
    markTutorialCompleted();
  }, []);

  // Handle showing tutorial again
  const handleShowTutorial = useCallback(() => {
    useEditorStore.setState({
      showTutorial: true,
      tutorialStep: 0,
    });
  }, []);

  // Handle showing menu again
  const handleShowMenu = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      setShowMenu(true);
      setIsEditing(false);
      // Destroy Phaser game when returning to menu
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    }
  }, [isDirty]);

  /**
   * Handle starting test mode
   * Requirements: 10.2, 10.3
   * - Validates level
   * - Exports level data
   * - Starts PlatformGameScene
   * 🔥 v2.4.0: 从云端获取用户全局题库
   */
  const handleStartTest = useCallback(async () => {
    // Validate level first
    const validation = validateLevel();
    if (!validation.valid) {
      // Error will be set by enterTestMode
      return;
    }

    const { token } = useAuthStore.getState();
    const editorQuestions = useEditorStore.getState().questions; // 获取编辑器中的题目作为回退
    let userQuestions: any[] = [];

    if (token) {
      try {
        userQuestions = await getRandomQuestions(token, 50);
        // 如果云端没题，使用编辑器里的题
        const finalQuestions = (userQuestions && userQuestions.length > 0)
          ? userQuestions
          : editorQuestions;
        setTestQuestions(finalQuestions);
        console.log('[EditorPage] 测试模式题库已就绪, 数量:', finalQuestions.length);
      } catch (err) {
        console.warn('[EditorPage] 获取云端题库失败，使用编辑器题库:', err);
        setTestQuestions(editorQuestions);
      }
    } else {
      setTestQuestions(editorQuestions);
    }

    // Enter test mode (saves snapshot)
    const success = enterTestMode();
    if (!success) {
      return;
    }

    // Export level data for testing
    const levelData = exportToJSON();
    setTestLevelData(levelData);

    // Convert CustomLevelData to PlatformGameScene format
    // 🔥 v2.4.6: 传入云端用户题库，确保测试模式使用正确的题库
    const testLevel = convertToGameLevel(levelData, userQuestions);

    // Switch to PlatformGameScene
    if (gameRef.current) {
      // 🔥🔥🔥 完全停止并移除所有场景，确保干净的状态
      const editorScene = gameRef.current.scene.getScene("LevelEditorScene");
      if (editorScene) {
        if (editorScene.scene.isActive() || editorScene.scene.isPaused()) {
          editorScene.scene.stop();
        }
      }

      // 检查PlatformGameScene是否已存在并完全移除它
      const existingGameScene = gameRef.current.scene.getScene("PlatformGameScene");
      if (existingGameScene) {
        if (existingGameScene.scene.isActive() || existingGameScene.scene.isPaused()) {
          existingGameScene.scene.stop();
        }
        // 🔥 移除旧场景以确保完全重新初始化
        gameRef.current.scene.remove("PlatformGameScene");
      }

      // 🔥🔥🔥 重置 Phaser 游戏的主相机状态
      // 这是关键：确保相机在新场景启动前处于干净状态
      gameRef.current.scene.scenes.forEach(scene => {
        if (scene.cameras && scene.cameras.main) {
          scene.cameras.main.stopFollow();
          scene.cameras.main.setZoom(1);
          scene.cameras.main.setFollowOffset(0, 0);
          scene.cameras.main.scrollX = 0;
          scene.cameras.main.scrollY = 0;
        }
      });

      // 🔥🔥🔥 调试日志：确认地图尺寸
      console.log('[EditorPage] 🗺️ 测试关卡地图尺寸:', {
        mapWidth: levelData.mapWidth,
        mapHeight: levelData.mapHeight,
        campaignMapData: testLevel.campaignMapData ? {
          width: testLevel.campaignMapData.width,
          height: testLevel.campaignMapData.height,
        } : 'undefined',
      });

      // 🔥 使用 setTimeout 确保旧场景完全清理后再启动新场景
      // 增加延迟到 100ms 确保场景完全销毁
      setTimeout(() => {
        if (gameRef.current) {
          console.log('[EditorPage] 🎮 启动 PlatformGameScene，地图尺寸:', testLevel.campaignMapData?.width, 'x', testLevel.campaignMapData?.height);
          // 重新添加并启动PlatformGameScene
          gameRef.current.scene.add("PlatformGameScene", PlatformGameScene, true, { level: testLevel });
        }
      }, 100);
    }
  }, [validateLevel, enterTestMode, exportToJSON]);

  /**
   * Handle exiting test mode
   * Requirements: 10.4, 10.5
   * - Returns to editor
   * - Restores editor state
   * 🔥 v2.4.4: 完全重写场景切换逻辑，修复 setBounds null 错误
   */
  const handleExitTest = useCallback(() => {
    console.log('[EditorPage] handleExitTest called, isTestMode:', useEditorStore.getState().isTestMode);

    // 🔥 清理测试模式相关状态
    setShowCustomQuiz(false);
    setCurrentQuizQuestion(null);
    setQuizCallbacks(null);
    setShowTestComplete(false);
    setTestCompleteData(null);
    setSelectedAnswer(null);
    setAnswerResult(null);

    // Exit test mode (restores snapshot)
    exitTestMode();
    setTestLevelData(null);

    const editorState = useEditorStore.getState();
    console.log('[EditorPage] Editor state after exitTestMode:', {
      isTestMode: editorState.isTestMode,
      elementsCount: editorState.elements.length,
      mapWidth: editorState.mapWidth,
      mapHeight: editorState.mapHeight,
    });

    // Switch back to LevelEditorScene
    if (gameRef.current) {
      console.log('[EditorPage] Switching back to LevelEditorScene');

      try {
        // 🔥🔥🔥 v2.4.4: 安全的场景切换 - 不要移除事件监听器！
        // 只停止 PlatformGameScene，不要清理所有场景

        // 1. 停止 PlatformGameScene
        const gameScene = gameRef.current.scene.getScene("PlatformGameScene");
        if (gameScene) {
          console.log('[EditorPage] Stopping PlatformGameScene');
          try {
            // 只停止场景，不移除事件监听器
            if (gameScene.scene.isActive() || gameScene.scene.isPaused()) {
              gameScene.scene.stop();
            }
            // 移除游戏场景
            gameRef.current.scene.remove("PlatformGameScene");
          } catch (e) {
            console.warn('[EditorPage] Error stopping PlatformGameScene:', e);
          }
        }

        // 2. 检查编辑器场景状态
        const existingEditorScene = gameRef.current.scene.getScene("LevelEditorScene");

        // 🔥🔥🔥 v2.4.4: 关键修复 - 完全销毁并重新创建 Phaser 游戏实例
        // 这是最可靠的方式，避免场景状态污染
        console.log('[EditorPage] 🔄 重新初始化 Phaser 游戏实例');

        // 销毁当前游戏实例
        gameRef.current.destroy(true);
        gameRef.current = null;

        // 延迟重新创建游戏实例
        setTimeout(() => {
          if (!containerRef.current) {
            console.error('[EditorPage] Container ref is null, cannot reinitialize');
            return;
          }

          try {
            const config: Phaser.Types.Core.GameConfig = {
              type: Phaser.AUTO,
              width: 960,
              height: 640,
              parent: containerRef.current,
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
              scene: [LevelEditorScene, PlatformGameScene],
              input: {
                keyboard: {
                  target: window,
                },
              },
            };

            gameRef.current = new Phaser.Game(config);

            // 游戏准备好后启动编辑器场景
            gameRef.current.events.once("ready", () => {
              if (gameRef.current) {
                const scene = gameRef.current.scene.getScene("LevelEditorScene");
                if (scene) {
                  scene.scene.restart({
                    mapWidth: editorState.mapWidth,
                    mapHeight: editorState.mapHeight,
                  });
                }
              }
            });

            console.log('[EditorPage] ✅ Phaser 游戏实例重新创建成功');
          } catch (e) {
            console.error('[EditorPage] Error reinitializing Phaser:', e);
          }
        }, 100);

      } catch (e) {
        console.error('[EditorPage] Critical error in handleExitTest:', e);
        // 强制刷新页面作为最后手段
        useEditorStore.setState({
          isTestMode: false,
          testModeSnapshot: null,
        });
      }
    } else {
      console.warn('[EditorPage] gameRef is null, forcing state reset');
      useEditorStore.setState({ isTestMode: false, testModeSnapshot: null });
    }
  }, [exitTestMode]);

  // Listen for test mode events from toolbar and game scene
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStartTestEvent = () => {
      handleStartTest();
    };

    const handleExitTestEvent = () => {
      handleExitTest();
    };

    // Listen for position warning events from LevelEditorScene
    // Requirements: 9.4 - Display warnings for invalid positions
    const handlePositionWarning = (event: CustomEvent) => {
      const { type, warnings } = event.detail || {};
      if (warnings && warnings.length > 0) {
        setPositionWarning({ type, warnings });
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setPositionWarning(null);
        }, 5000);
      }
    };

    // Listen for level complete event from PlatformGameScene
    // This is dispatched when the player reaches the goal or dies
    const handlePlatformLevelComplete = (event: CustomEvent) => {
      const { success } = event.detail || {};

      // Only handle if we're in test mode
      if (useEditorStore.getState().isTestMode) {
        if (success) {
          // 🔥 测试通关：不自动退出，显示通关提示
          // 玩家需要手动点击"退出测试"按钮
          // 通关提示由 PlatformGameScene 内部显示
        } else {
          // 🔥 测试失败（死亡）：不自动退出，让玩家继续尝试或手动退出
          // 死亡复活答题由 PlatformGameScene 处理
        }
      }
    };

    // 🔥 创意工坊：自定义题库答题事件
    const handleCustomLevelQuiz = (event: CustomEvent) => {
      const { question, onCorrect, onWrong, isBossQuiz } = event.detail || {};

      // 🔥🔥🔥 如果已经在显示答题弹窗，忽略新的事件（防止重复触发）
      if (showCustomQuiz) {
        console.log('[EditorPage] 答题弹窗已显示，忽略新事件');
        return;
      }

      if (question) {
        setCurrentQuizQuestion(question);
        setQuizCallbacks({ onCorrect, onWrong });
        setSelectedAnswer(null);
        setAnswerResult(null);
        setShowCustomQuiz(true);
      }
    };

    // 🔥 创意工坊：测试通关事件
    const handleTestModeComplete = (event: CustomEvent) => {
      const data = event.detail || {};
      setTestCompleteData(data);
      setShowTestComplete(true);
    };

    // 🔥 创意工坊：玩家死亡事件（复活答题）
    const handlePlayerDeath = () => {
      const isTest = useEditorStore.getState().isTestMode;
      console.log('[EditorPage] 收到玩家死亡事件, 测试模式:', isTest, '当前题目数:', testQuestions.length);

      // 只在测试模式下处理
      if (!isTest) return;

      // 🔥🔥🔥 如果已经在显示答题弹窗，忽略（可能是Boss答题中）
      if (showCustomQuiz) {
        console.log('[EditorPage] 答题弹窗已显示或正在处理中，忽略死亡事件');
        return;
      }

      // 🔥 v2.4.0: 使用从云端获取的testQuestions
      if (testQuestions.length > 0) {
        // 有自定义题目，随机选一道
        const randomIndex = Math.floor(Math.random() * testQuestions.length);
        const question = testQuestions[randomIndex];
        setCurrentQuizQuestion(question);
        setQuizCallbacks({
          onCorrect: () => {
            // 答对复活
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("playerRevive", {
                detail: { hpPercent: 0.5 }
              }));
            }
          },
          onWrong: () => {
            // 答错游戏结束
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("playerGameOver"));
            }
          }
        });
        setSelectedAnswer(null);
        setAnswerResult(null);
        setShowCustomQuiz(true);
      } else {
        // 没有自定义题目，直接游戏结束
        console.log('[EditorPage] 用户题库为空，直接游戏结束');
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("playerGameOver"));
        }
      }
    };

    window.addEventListener("editor-start-test", handleStartTestEvent);
    window.addEventListener("editor-exit-test", handleExitTestEvent);
    window.addEventListener("editor-position-warning", handlePositionWarning as EventListener);
    window.addEventListener("platformLevelComplete", handlePlatformLevelComplete as EventListener);
    window.addEventListener("customLevelQuiz", handleCustomLevelQuiz as EventListener);
    window.addEventListener("testModeComplete", handleTestModeComplete as EventListener);
    window.addEventListener("playerDeath", handlePlayerDeath);

    return () => {
      window.removeEventListener("editor-start-test", handleStartTestEvent);
      window.removeEventListener("editor-exit-test", handleExitTestEvent);
      window.removeEventListener("editor-position-warning", handlePositionWarning as EventListener);
      window.removeEventListener("platformLevelComplete", handlePlatformLevelComplete as EventListener);
      window.removeEventListener("customLevelQuiz", handleCustomLevelQuiz as EventListener);
      window.removeEventListener("testModeComplete", handleTestModeComplete as EventListener);
      window.removeEventListener("playerDeath", handlePlayerDeath);
    };
  }, [handleStartTest, handleExitTest, showCustomQuiz, testQuestions]);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/");
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#1a1e3e] flex items-center justify-center">
        <div className="text-blue-400 font-pixel text-xl animate-pulse">
          加载中...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show menu when not editing
  if (showMenu && !isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#1a1e3e]">
        <CreativeWorkshopMenu
          isOpen={true}
          onClose={() => router.push("/world")}
          onStartEditing={handleStartEditing}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800 via-slate-900 to-slate-800 text-white flex flex-col">
      {/* 🔒 Token 过期提示 */}
      <SyncStatusIndicator />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-600">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExit}
            className="p-2 hover:bg-red-900/30 rounded transition-colors"
            title="返回"
          >
            <Home className="w-5 h-5 text-blue-400" />
          </button>
          <h1 className="text-lg font-pixel text-blue-400">
            🎨 创意工坊
          </h1>
          <span className="text-sm text-gray-400">-</span>
          <span className="text-sm text-slate-300 truncate max-w-[200px]">
            {levelName}
          </span>
          {isDirty && (
            <span className="text-xs text-orange-400">*未保存</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 🔥 v2.4.4: 添加刷新按钮，方便用户遇到问题时刷新 */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-blue-700/30 rounded transition-colors"
            title="刷新页面"
          >
            <RefreshCw className="w-5 h-5 text-blue-400" />
          </button>
          <button
            onClick={handleShowTutorial}
            className="p-2 hover:bg-blue-700/30 rounded transition-colors"
            title="显示教程"
          >
            <HelpCircle className="w-5 h-5 text-blue-400" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-blue-700/30 rounded transition-colors"
            title="关卡设置"
          >
            <Settings className="w-5 h-5 text-blue-400" />
          </button>
        </div>
      </header>

      {/* Error Toast - 🔥 增强版：支持刷新按钮 */}
      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500 rounded-lg px-4 py-3 max-w-md animate-fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-red-200">{error}</span>
              {/* 🔥 如果是登录过期或加载失败，显示刷新按钮 */}
              {(error.includes('登录') || error.includes('过期') || error.includes('加载失败') || error.includes('请刷新')) && (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 w-full px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
                >
                  🔄 刷新页面
                </button>
              )}
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-200 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Position Warning Toast - Requirements: 9.4 */}
      {positionWarning && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-orange-900/90 border border-orange-500 rounded-lg px-4 py-3 max-w-md animate-fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-200 font-medium mb-1">
                ⚠️ {positionWarning.type === 'player_start' ? '起点' : '终点'}位置警告
              </p>
              <ul className="text-orange-300/80 text-sm space-y-0.5">
                {positionWarning.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setPositionWarning(null)}
              className="ml-2 text-orange-400 hover:text-orange-200 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex overflow-hidden ${isMobile ? 'pb-20' : ''}`}>
        {/* Left Panel - Element Palette (hidden in test mode and on mobile) */}
        {!isTestMode && !isMobile && (
          <div className="w-64 flex-shrink-0 bg-slate-900/80 border-r border-slate-700/40 overflow-y-auto">
            <ElementPalette
              onElementSelect={handleElementSelect}
              isSimpleMode={isSimpleMode}
            />
          </div>
        )}

        {/* Center - Phaser Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar (hidden in test mode) - Desktop only */}
          {!isTestMode && !isMobile && (
            <EditorToolbar
              currentTool={currentTool}
              onToolChange={handleToolChange}
              onShowSettings={() => setShowSettings(true)}
            />
          )}

          {/* Test Mode Header */}
          {isTestMode && (
            <div className="flex items-center justify-between px-4 py-2 bg-green-900/50 border-b border-green-500/30">
              <div className="flex items-center gap-2">
                <span className="text-green-400 animate-pulse">🎮</span>
                <span className="text-green-300 font-pixel">测试模式</span>
                <span className="text-green-200/60 text-sm hidden sm:inline">- 使用方向键移动，空格跳跃</span>
              </div>
              <div className="flex items-center gap-2">
                {/* 🔥 v2.4.2: 添加刷新按钮，用户卡住时可以手动刷新 */}
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-600/30 hover:bg-gray-600/50 border border-gray-500/50 rounded-lg transition-colors"
                  title="如果页面卡住，点击刷新"
                >
                  <span className="text-gray-300 text-sm">🔄 刷新</span>
                </button>
                <button
                  onClick={handleExitTest}
                  className="flex items-center gap-2 px-4 py-1.5 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 rounded-lg transition-colors"
                >
                  <span className="text-red-300">退出测试</span>
                </button>
              </div>
            </div>
          )}

          {/* Canvas Container */}
          <div className={`flex-1 relative bg-[#0D0303] overflow-hidden ${isTestMode ? 'flex items-center justify-center' : ''}`}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-yellow-400 font-pixel text-xl animate-pulse">
                  加载编辑器中...
                </div>
              </div>
            )}
            <div
              ref={containerRef}
              id="editor-canvas"
              className={isTestMode ? "w-[960px] h-[640px] max-w-full max-h-full" : "w-full h-full"}
              style={isTestMode ? { aspectRatio: '960/640' } : undefined}
            />
          </div>

          {/* 测试模式移动端虚拟控制器 */}
          {isTestMode && isMobile && !showCustomQuiz && (
            <VirtualController visible={true} opacity={0.7} />
          )}
        </div>

        {/* Right Panel - Property Panel (hidden in test mode and on mobile) */}
        {!isTestMode && !isMobile && (
          <div className="w-72 flex-shrink-0 bg-slate-900/80 border-l border-slate-700/40 overflow-y-auto">
            <PropertyPanel
              selectedElement={selectedElement}
              onPropertyChange={handlePropertyChange}
              onDelete={handleDeleteElement}
            />
          </div>
        )}
      </div>

      {/* Mobile Toolbar - Requirements: 15.1 */}
      {isMobile && !isTestMode && (
        <MobileEditorToolbar
          currentTool={currentTool}
          onToolChange={handleToolChange}
          onShowSettings={() => setShowSettings(true)}
          onShowPalette={() => setShowMobilePalette(true)}
          onShowProperties={() => setShowMobileProperties(true)}
          onShowLoadModal={() => setShowLoadModal(true)}
          isPaletteVisible={showMobilePalette}
          isPropertiesVisible={showMobileProperties}
        />
      )}

      {/* Mobile Element Panel - Requirements: 15.4 */}
      {isMobile && (
        <MobileElementPanel
          isOpen={showMobilePalette}
          onClose={() => setShowMobilePalette(false)}
          onElementSelect={handleElementSelect}
        />
      )}

      {/* Mobile Property Panel - Requirements: 15.4 */}
      {isMobile && (
        <MobilePropertyPanel
          isOpen={showMobileProperties}
          onClose={() => setShowMobileProperties(false)}
          selectedElement={selectedElement}
          onPropertyChange={handlePropertyChange}
          onDelete={handleDeleteElement}
        />
      )}

      {/* Level Select Modal (for mobile load) */}
      <LevelSelectModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLevelLoaded={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("editor-level-loaded"));
          }
        }}
      />

      {/* Level Settings Modal */}
      {showSettings && (
        <LevelSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900/95 rounded-xl p-6 max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-sky-300 mb-4">
              ⚠️ 确认退出
            </h3>
            <p className="text-slate-300 mb-6">
              您有未保存的更改，确定要退出吗？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmExit}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                不保存退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-save Indicator */}
      <AutoSaveIndicator
        onRestore={() => {
          // Refresh the editor scene after restoring auto-save
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("editor-level-loaded"));
          }
        }}
      />

      {/* 🔥 创意工坊：自定义题库答题弹窗（支持选择题和填空题） */}
      {showCustomQuiz && currentQuizQuestion && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900/95 rounded-xl p-6 max-w-lg w-full mx-4 border border-slate-700">
            <h3 className="text-xl font-bold text-sky-300 mb-4 text-center">
              📝 答题挑战
            </h3>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded ${currentQuizQuestion.type === 'choice' ? 'bg-sky-700' : 'bg-indigo-700'
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

            {/* 选择题选项 */}
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
                    className={`w-full p-3 rounded-lg text-left transition-all ${selectedAnswer === option
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

            {/* 填空题输入框 */}
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
                  className={`w-full px-4 py-3 rounded-lg text-center text-lg transition-all ${answerResult === 'correct'
                    ? 'bg-green-600 border-2 border-green-400 text-white'
                    : answerResult === 'wrong'
                      ? 'bg-red-600 border-2 border-red-400 text-white'
                      : 'bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none'
                    }`}
                  autoFocus
                />
              </div>
            )}

            {/* 答题结果提示 */}
            {answerResult && (
              <div className={`text-center mb-4 p-3 rounded-lg ${answerResult === 'correct' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
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

            {/* 按钮 */}
            <div className="flex gap-3 justify-center">
              {!answerResult ? (
                <button
                  onClick={() => {
                    if (!selectedAnswer || selectedAnswer.trim() === '') return;
                    // 填空题忽略大小写和前后空格
                    const userAnswer = selectedAnswer.trim().toLowerCase();
                    const correctAnswer = String(currentQuizQuestion.answer).trim().toLowerCase();
                    const isCorrect = userAnswer === correctAnswer;
                    setAnswerResult(isCorrect ? 'correct' : 'wrong');

                    // 延迟执行回调
                    setTimeout(() => {
                      setShowCustomQuiz(false);
                      if (isCorrect) {
                        quizCallbacks?.onCorrect?.();
                      } else {
                        quizCallbacks?.onWrong?.();
                      }
                    }, 1500);
                  }}
                  disabled={!selectedAnswer || selectedAnswer.trim() === ''}
                  className={`px-6 py-2 rounded-lg transition-colors ${selectedAnswer && selectedAnswer.trim() !== ''
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

      {/* 🔥 创意工坊：测试通关提示弹窗 */}
      {showTestComplete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-green-900 via-slate-900 to-teal-900 rounded-xl p-8 max-w-md w-full mx-4 border-2 border-green-500/50 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-green-100 mb-4">
              测试通关！
            </h3>
            <p className="text-green-200/80 mb-6">
              {testCompleteData?.message || '恭喜你成功通过了关卡测试！'}
            </p>
            {testCompleteData?.score !== undefined && (
              <p className="text-yellow-300 mb-4">
                得分: {testCompleteData.score}
              </p>
            )}
            <p className="text-green-300/60 text-sm mb-6">
              点击下方按钮退出测试，继续完善你的关卡
            </p>
            <button
              onClick={() => {
                setShowTestComplete(false);
                setTestCompleteData(null);
                handleExitTest();
              }}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white font-bold"
            >
              退出测试，继续编辑
            </button>
          </div>
        </div>
      )}

      {/* Tutorial Overlay (only show when editing and not in test mode) */}
      {isEditing && !isTestMode && showTutorial && (
        <TutorialOverlay onComplete={handleTutorialComplete} />
      )}
    </div>
  );
}
