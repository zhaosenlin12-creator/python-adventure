/**
 * LevelEditorScene - 创意工坊关卡编辑器场景
 * Requirements: 2.5, 14.1, 14.2, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import * as Phaser from 'phaser';
import { useEditorStore } from '@/store/editorStore';
import {
  EditorElement,
  CustomLevelData,
  Position,
  EditorTool,
  ElementConfig,
  PlatformConfig,
  EnemyConfig,
  CollectibleConfig,
  TrapConfig,
  MechanismConfig,
} from '@/types/editor';

// 生产环境禁用调试日志
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => { };

// ==================== 常量 ====================

const GRID_SIZE = 32;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

// 视口裁剪优化常量 - Requirements: 2.2, 2.3
const VIEWPORT_PADDING = 100; // 视口外边距，用于预加载即将进入视口的元素
const CULLING_UPDATE_INTERVAL = 100; // 视口裁剪更新间隔（毫秒）
const GRID_CHUNK_SIZE = 256; // 网格分块大小，用于优化大地图网格渲染

// 🔒 性能优化常量 - 防止频繁状态更新
const DRAG_THROTTLE_MS = 16; // 拖动节流间隔（约60fps）
const STORE_UPDATE_THROTTLE_MS = 100; // Store更新节流间隔

// 🔥 平移边界常量 - 允许超出地图边界的最大距离
const PAN_BOUNDARY_PADDING = 200; // 允许超出地图边界200像素

// 元素颜色映射 - 🔥 确保所有元素类型都有对应颜色
const ELEMENT_COLORS: Record<string, number> = {
  // 平台类型
  platform: 0xDC143C,      // 中国红
  ground: 0x8B0000,        // 深红
  moving: 0xff6b35,        // 橙色
  disappearing: 0x9b59b6,  // 紫色（消失平台）
  bouncy: 0x2ecc71,        // 绿色（弹跳平台）
  conveyor: 0x3498db,      // 蓝色（传送带）
  gravity_flip: 0xe91e63,  // 粉色（重力翻转）
  // 敌人类型
  enemy_basic: 0xff4444,   // 红色
  enemy_bat: 0x9b59b6,     // 紫色
  enemy_robot: 0x3498db,   // 蓝色
  enemy_slime: 0x2ecc71,   // 绿色
  enemy_boss: 0xe74c3c,    // 深红
  // 收集物类型
  coin: 0xFFD700,          // 金色
  gem: 0x00ffff,           // 青色
  key: 0xffa500,           // 橙色
  health_pack: 0xff4477,   // 桃红色 (血包)
  // 陷阱类型
  spike: 0xff4444,         // 红色
  fire: 0xff6600,          // 橙红
  electric: 0xff00ff,      // 紫色
  explosion: 0xff0000,     // 红色（爆炸）
  // 机关类型
  portal: 0x9b59b6,        // 紫色
  wind: 0x87ceeb,          // 天蓝色（风力区域）
  gravity_zone: 0x00bcd4,  // 青色（重力区域）
  button: 0x3498db,        // 蓝色
  door: 0x8B4513,          // 棕色
  // 特殊类型
  player_start: 0x00ff00,  // 绿色
  goal: 0xFFD700,          // 金色
};

// 元素图标映射 - 🔥 确保所有元素类型都有对应图标
const ELEMENT_ICONS: Record<string, string> = {
  // 平台类型
  platform: '▬',
  ground: '▬',
  moving: '↔️',
  disappearing: '👻',
  bouncy: '🔼',
  conveyor: '➡️',
  gravity_flip: '🔃',
  // 敌人类型
  enemy_basic: '👾',
  enemy_bat: '🦇',
  enemy_robot: '🤖',
  enemy_slime: '🟢',
  enemy_boss: '👹',
  // 收集物类型
  coin: '🪙',
  gem: '💎',
  key: '🔑',
  health_pack: '❤️',
  // 陷阱类型
  spike: '🔺',
  fire: '🔥',
  electric: '⚡',
  explosion: '💥',
  // 机关类型
  portal: '🌀',
  wind: '💨',
  gravity_zone: '🌐',
  button: '🔘',
  door: '🚪',
  // 特殊类型
  player_start: '🏁',
  goal: '⭐',
};

// ==================== 接口定义 ====================

interface EditorElementSprite {
  id: string;
  container: Phaser.GameObjects.Container;
  element: EditorElement;
  selectionRect?: Phaser.GameObjects.Rectangle;
}

interface InitData {
  levelData?: CustomLevelData;
  mapWidth?: number;
  mapHeight?: number;
}

// ==================== LevelEditorScene 类 ====================

export class LevelEditorScene extends Phaser.Scene {
  // 场景状态
  private currentTool: EditorTool = 'select';
  private selectedElementId: string | null = null;
  private gridVisible: boolean = true;
  private gridSize: number = GRID_SIZE;
  private zoomLevel: number = 1;

  // 地图尺寸
  private mapWidth: number = 800;
  private mapHeight: number = 600;

  // 图形对象
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private backgroundGraphics!: Phaser.GameObjects.Graphics;  // 🔥 添加背景图形引用
  private elementSprites: Map<string, EditorElementSprite> = new Map();
  private playerStartMarker!: Phaser.GameObjects.Container;
  private goalMarker: Phaser.GameObjects.Container | null = null;

  // 预览元素
  private previewElement: Phaser.GameObjects.Container | null = null;
  private previewElementType: string | null = null;

  // 拖动状态
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragElementStartX: number = 0;
  private dragElementStartY: number = 0;

  // 平移状态
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;

  // 触摸状态 - Requirements: 15.1, 15.2, 15.3
  private isTouchDevice: boolean = false;
  private lastPinchDistance: number = 0;
  private isTwoFingerGesture: boolean = false;

  // 输入
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private deleteKey!: Phaser.Input.Keyboard.Key;
  private ctrlKey!: Phaser.Input.Keyboard.Key;
  private zKey!: Phaser.Input.Keyboard.Key;
  private yKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;  // 🔥 空格键用于平移

  // 🔥 空格键平移状态
  private isSpacePanning: boolean = false;
  private previousTool: EditorTool = 'select';

  // 🔒 性能优化：拖动节流
  private lastDragUpdateTime: number = 0;
  private pendingDragUpdate: { x: number; y: number } | null = null;

  // Store 订阅
  private unsubscribe: (() => void) | null = null;

  // 视口裁剪优化 - Requirements: 2.2, 2.3
  private lastCullingUpdate: number = 0;
  private viewportBounds: { left: number; right: number; top: number; bottom: number } = {
    left: 0, right: 0, top: 0, bottom: 0
  };
  private gridChunks: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private visibleChunks: Set<string> = new Set();

  constructor() {
    super({ key: 'LevelEditorScene' });
  }

  // ==================== 生命周期方法 ====================

  init(data: InitData) {
    debugLog('[LevelEditorScene] init called with data:', data);

    // 从传入数据或store获取地图尺寸
    const editorState = useEditorStore.getState();

    if (data.levelData) {
      this.mapWidth = data.levelData.mapWidth;
      this.mapHeight = data.levelData.mapHeight;
    } else if (data.mapWidth && data.mapHeight) {
      this.mapWidth = data.mapWidth;
      this.mapHeight = data.mapHeight;
    } else {
      this.mapWidth = editorState.mapWidth;
      this.mapHeight = editorState.mapHeight;
    }

    // 重置状态
    this.currentTool = 'select';
    this.selectedElementId = null;
    this.zoomLevel = 1;
    this.elementSprites.clear();
  }

  create() {
    debugLog('[LevelEditorScene] create called');
    debugLog('[LevelEditorScene] Map size:', this.mapWidth, 'x', this.mapHeight);

    // 设置世界边界
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    // 创建背景
    this.createBackground();

    // 创建网格
    this.createGrid();

    // 设置相机
    this.setupCamera();

    // 设置输入
    this.setupInput();

    // 创建起点标记
    this.createPlayerStartMarker();

    // 从store加载元素
    this.loadElementsFromStore();

    // 订阅store变化
    this.subscribeToStore();

    // 监听窗口事件
    this.setupWindowEvents();

    debugLog('[LevelEditorScene] create completed');
  }

  update(time: number, delta: number) {
    // 更新预览元素位置
    if (this.previewElement && this.currentTool === 'place') {
      const pointer = this.input.activePointer;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

      // 网格对齐
      const snappedX = this.snapToGrid(worldPoint.x);
      const snappedY = this.snapToGrid(worldPoint.y);

      this.previewElement.setPosition(snappedX, snappedY);
    }

    // 处理键盘快捷键
    this.handleKeyboardShortcuts();

    // 视口裁剪优化 - Requirements: 2.2, 2.3
    // 定期更新视口裁剪，避免每帧都计算
    if (time - this.lastCullingUpdate > CULLING_UPDATE_INTERVAL) {
      this.updateViewportCulling();
      this.lastCullingUpdate = time;
    }
  }

  shutdown() {
    debugLog('[LevelEditorScene] shutdown called');

    // 清理窗口事件监听器
    this.cleanupWindowEvents();

    // 取消store订阅
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // 清理元素
    this.elementSprites.clear();

    // 清理预览
    if (this.previewElement) {
      this.previewElement.destroy();
      this.previewElement = null;
    }

    // 清理网格分块
    this.gridChunks.forEach(chunk => chunk.destroy());
    this.gridChunks.clear();
    this.visibleChunks.clear();
  }

  // ==================== 视口裁剪优化 - Requirements: 2.2, 2.3 ====================

  /**
   * 更新视口边界
   * 计算当前相机可见区域，用于视口裁剪
   */
  private updateViewportBounds() {
    const camera = this.cameras.main;
    const zoom = camera.zoom;

    // 计算视口在世界坐标中的边界（带边距）
    this.viewportBounds = {
      left: camera.scrollX - VIEWPORT_PADDING / zoom,
      right: camera.scrollX + camera.width / zoom + VIEWPORT_PADDING / zoom,
      top: camera.scrollY - VIEWPORT_PADDING / zoom,
      bottom: camera.scrollY + camera.height / zoom + VIEWPORT_PADDING / zoom,
    };
  }

  /**
   * 检查元素是否在视口内
   * @param x 元素X坐标
   * @param y 元素Y坐标
   * @param width 元素宽度
   * @param height 元素高度
   */
  private isInViewport(x: number, y: number, width: number = 64, height: number = 64): boolean {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return (
      x + halfWidth >= this.viewportBounds.left &&
      x - halfWidth <= this.viewportBounds.right &&
      y + halfHeight >= this.viewportBounds.top &&
      y - halfHeight <= this.viewportBounds.bottom
    );
  }

  /**
   * 更新视口裁剪
   * 隐藏视口外的元素，显示视口内的元素
   */
  private updateViewportCulling() {
    this.updateViewportBounds();

    // 裁剪元素精灵
    for (const [id, sprite] of this.elementSprites) {
      const element = sprite.element;
      const inViewport = this.isInViewport(
        element.x,
        element.y,
        element.width || 64,
        element.height || 64
      );

      // 只在可见性变化时更新，避免不必要的操作
      if (sprite.container.visible !== inViewport) {
        sprite.container.setVisible(inViewport);
        if (sprite.selectionRect) {
          sprite.selectionRect.setVisible(inViewport);
        }
      }
    }

    // 裁剪标记
    if (this.playerStartMarker) {
      const startPos = useEditorStore.getState().playerStart;
      const startInViewport = this.isInViewport(startPos.x, startPos.y, 72, 72);
      if (this.playerStartMarker.visible !== startInViewport) {
        this.playerStartMarker.setVisible(startInViewport);
      }
    }

    if (this.goalMarker) {
      const goalPos = useEditorStore.getState().goal;
      if (goalPos) {
        const goalInViewport = this.isInViewport(goalPos.x, goalPos.y, 72, 72);
        if (this.goalMarker.visible !== goalInViewport) {
          this.goalMarker.setVisible(goalInViewport);
        }
      }
    }

    // 更新网格分块可见性（大地图优化）
    this.updateGridChunkVisibility();
  }

  /**
   * 获取网格分块键
   */
  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  /**
   * 创建网格分块
   * 将大地图的网格分成多个小块，只渲染可见的块
   */
  private createGridChunks() {
    // 清理旧的分块
    this.gridChunks.forEach(chunk => chunk.destroy());
    this.gridChunks.clear();

    // 计算需要多少个分块
    const chunksX = Math.ceil(this.mapWidth / GRID_CHUNK_SIZE);
    const chunksY = Math.ceil(this.mapHeight / GRID_CHUNK_SIZE);

    for (let cx = 0; cx < chunksX; cx++) {
      for (let cy = 0; cy < chunksY; cy++) {
        const chunkKey = this.getChunkKey(cx, cy);
        const chunk = this.add.graphics();
        chunk.setDepth(-50);

        // 计算分块边界
        const startX = cx * GRID_CHUNK_SIZE;
        const startY = cy * GRID_CHUNK_SIZE;
        const endX = Math.min(startX + GRID_CHUNK_SIZE, this.mapWidth);
        const endY = Math.min(startY + GRID_CHUNK_SIZE, this.mapHeight);

        // 绘制分块内的网格
        this.drawGridChunk(chunk, startX, startY, endX, endY);

        this.gridChunks.set(chunkKey, chunk);
      }
    }
  }

  /**
   * 绘制单个网格分块
   */
  private drawGridChunk(
    graphics: Phaser.GameObjects.Graphics,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) {
    if (!this.gridVisible) {
      graphics.clear();
      return;
    }

    graphics.clear();
    graphics.lineStyle(1, 0xFFD700, 0.15);

    // 对齐到网格
    const alignedStartX = Math.floor(startX / this.gridSize) * this.gridSize;
    const alignedStartY = Math.floor(startY / this.gridSize) * this.gridSize;

    // 垂直线
    for (let x = alignedStartX; x <= endX; x += this.gridSize) {
      if (x >= startX) {
        graphics.moveTo(x, startY);
        graphics.lineTo(x, endY);
      }
    }

    // 水平线
    for (let y = alignedStartY; y <= endY; y += this.gridSize) {
      if (y >= startY) {
        graphics.moveTo(startX, y);
        graphics.lineTo(endX, y);
      }
    }

    graphics.strokePath();
  }

  /**
   * 更新网格分块可见性
   */
  private updateGridChunkVisibility() {
    if (this.gridChunks.size === 0) return;

    const newVisibleChunks = new Set<string>();

    // 计算可见的分块范围
    const startChunkX = Math.max(0, Math.floor(this.viewportBounds.left / GRID_CHUNK_SIZE));
    const endChunkX = Math.ceil(this.viewportBounds.right / GRID_CHUNK_SIZE);
    const startChunkY = Math.max(0, Math.floor(this.viewportBounds.top / GRID_CHUNK_SIZE));
    const endChunkY = Math.ceil(this.viewportBounds.bottom / GRID_CHUNK_SIZE);

    // 标记可见分块
    for (let cx = startChunkX; cx <= endChunkX; cx++) {
      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        const chunkKey = this.getChunkKey(cx, cy);
        newVisibleChunks.add(chunkKey);
      }
    }

    // 更新分块可见性
    for (const [chunkKey, chunk] of this.gridChunks) {
      const shouldBeVisible = newVisibleChunks.has(chunkKey);
      if (chunk.visible !== shouldBeVisible) {
        chunk.setVisible(shouldBeVisible);
      }
    }

    this.visibleChunks = newVisibleChunks;
  }

  // ==================== 初始化方法 ====================

  private createBackground() {
    // 🔥 清理旧的背景图形
    if (this.backgroundGraphics) {
      this.backgroundGraphics.destroy();
    }

    this.backgroundGraphics = this.add.graphics();

    // 深红色渐变背景 - 新年主题
    this.backgroundGraphics.fillGradientStyle(0x2D0A0A, 0x2D0A0A, 0x1A0505, 0x1A0505, 1);
    this.backgroundGraphics.fillRect(0, 0, this.mapWidth, this.mapHeight);
    this.backgroundGraphics.setDepth(-100);

    // 边界框
    this.backgroundGraphics.lineStyle(4, 0xFFD700, 1);
    this.backgroundGraphics.strokeRect(0, 0, this.mapWidth, this.mapHeight);

    debugLog('[LevelEditorScene] Background created for map size:', this.mapWidth, 'x', this.mapHeight);
  }

  private createGrid() {
    // 对于大地图（超过2000x1500），使用分块网格优化
    const isLargeMap = this.mapWidth > 2000 || this.mapHeight > 1500;

    if (isLargeMap) {
      // 使用分块网格系统
      this.createGridChunks();
      debugLog('[LevelEditorScene] Using chunked grid for large map');
    } else {
      // 小地图使用单一网格
      this.gridGraphics = this.add.graphics();
      this.gridGraphics.setDepth(-50);
      this.drawGrid();
    }
  }

  private drawGrid() {
    // 如果使用分块网格，重绘所有分块
    if (this.gridChunks.size > 0) {
      const chunksX = Math.ceil(this.mapWidth / GRID_CHUNK_SIZE);
      const chunksY = Math.ceil(this.mapHeight / GRID_CHUNK_SIZE);

      for (let cx = 0; cx < chunksX; cx++) {
        for (let cy = 0; cy < chunksY; cy++) {
          const chunkKey = this.getChunkKey(cx, cy);
          const chunk = this.gridChunks.get(chunkKey);
          if (chunk) {
            const startX = cx * GRID_CHUNK_SIZE;
            const startY = cy * GRID_CHUNK_SIZE;
            const endX = Math.min(startX + GRID_CHUNK_SIZE, this.mapWidth);
            const endY = Math.min(startY + GRID_CHUNK_SIZE, this.mapHeight);
            this.drawGridChunk(chunk, startX, startY, endX, endY);
          }
        }
      }
      return;
    }

    // 单一网格绘制
    if (!this.gridGraphics) return;

    this.gridGraphics.clear();

    if (!this.gridVisible) return;

    // 网格线颜色
    this.gridGraphics.lineStyle(1, 0xFFD700, 0.15);

    // 垂直线
    for (let x = 0; x <= this.mapWidth; x += this.gridSize) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, this.mapHeight);
    }

    // 水平线
    for (let y = 0; y <= this.mapHeight; y += this.gridSize) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(this.mapWidth, y);
    }

    this.gridGraphics.strokePath();
  }

  private setupCamera() {
    const { width, height } = this.cameras.main;

    // 🔥 重置相机缩放为1（编辑器默认缩放）
    this.cameras.main.setZoom(1);
    this.zoomLevel = 1;

    // 🔥 停止任何相机跟随（测试模式可能设置了跟随）
    this.cameras.main.stopFollow();

    // 🔥 重置相机跟随偏移
    this.cameras.main.setFollowOffset(0, 0);

    // 设置相机边界
    this.cameras.main.setBounds(
      -width / 2,
      -height / 2,
      this.mapWidth + width,
      this.mapHeight + height
    );

    // 初始位置居中
    this.cameras.main.centerOn(this.mapWidth / 2, this.mapHeight / 2);

    // 启用像素取整防止抖动
    this.cameras.main.setRoundPixels(true);

    debugLog('[LevelEditorScene] 📷 相机已重置 - 缩放: 1, 居中于:', this.mapWidth / 2, this.mapHeight / 2);
  }

  private setupInput() {
    // 检测触摸设备
    this.isTouchDevice = this.detectTouchDevice();
    debugLog('[LevelEditorScene] Touch device:', this.isTouchDevice);

    // 键盘输入
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.deleteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE);
      this.ctrlKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
      this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
      this.yKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
      this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      // 🔥 空格键按下时启用平移模式
      this.spaceKey.on('down', () => {
        if (!this.isSpacePanning) {
          this.isSpacePanning = true;
          this.previousTool = this.currentTool;
          // 更新鼠标光标
          if (typeof document !== 'undefined') {
            const canvas = document.querySelector('canvas');
            if (canvas) {
              canvas.style.cursor = 'grab';
            }
          }
          debugLog('[LevelEditorScene] 🔥 空格键平移模式启用');
        }
      });

      // 🔥 空格键释放时恢复原工具
      this.spaceKey.on('up', () => {
        if (this.isSpacePanning) {
          this.isSpacePanning = false;
          this.isPanning = false;
          // 恢复鼠标光标
          if (typeof document !== 'undefined') {
            const canvas = document.querySelector('canvas');
            if (canvas) {
              canvas.style.cursor = this.getCursorForTool(this.currentTool);
            }
          }
          debugLog('[LevelEditorScene] 🔥 空格键平移模式禁用');
        }
      });
    }

    // 鼠标/触摸输入
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    // 滚轮缩放 (桌面端)
    this.input.on('wheel', this.onWheel, this);

    // 触摸手势支持 - Requirements: 15.2, 15.3
    if (this.isTouchDevice) {
      this.setupTouchGestures();
    }
  }

  /** 检测是否为触摸设备 */
  private detectTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0
    );
  }

  /** 设置触摸手势 - Requirements: 15.2, 15.3 */
  private setupTouchGestures() {
    // 监听多点触控
    this.input.addPointer(1); // 添加第二个指针支持

    // 自定义触摸处理
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 检测双指手势开始
      const pointers = this.input.manager.pointers.filter(p => p.isDown);
      if (pointers.length === 2) {
        this.startTwoFingerGesture(pointers[0], pointers[1]);
      }
    });
  }

  /** 开始双指手势 */
  private startTwoFingerGesture(pointer1: Phaser.Input.Pointer, pointer2: Phaser.Input.Pointer) {
    this.isTwoFingerGesture = true;
    this.lastPinchDistance = this.getDistance(pointer1, pointer2);

    // 记录平移起始位置
    this.panStartX = (pointer1.x + pointer2.x) / 2;
    this.panStartY = (pointer1.y + pointer2.y) / 2;
    this.cameraStartX = this.cameras.main.scrollX;
    this.cameraStartY = this.cameras.main.scrollY;

    debugLog('[LevelEditorScene] Two finger gesture started');
  }

  /** 处理双指手势移动 */
  private handleTwoFingerMove(pointer1: Phaser.Input.Pointer, pointer2: Phaser.Input.Pointer) {
    if (!this.isTwoFingerGesture) return;

    // 计算缩放 (pinch-to-zoom) - Requirements: 15.2
    const currentDistance = this.getDistance(pointer1, pointer2);
    const pinchDelta = currentDistance - this.lastPinchDistance;

    if (Math.abs(pinchDelta) > 5) {
      const zoomDelta = pinchDelta * 0.002;
      this.setZoom(this.zoomLevel + zoomDelta);
      this.lastPinchDistance = currentDistance;
    }

    // 计算平移 (two-finger drag) - Requirements: 15.3
    const currentCenterX = (pointer1.x + pointer2.x) / 2;
    const currentCenterY = (pointer1.y + pointer2.y) / 2;

    const dx = currentCenterX - this.panStartX;
    const dy = currentCenterY - this.panStartY;

    let newScrollX = this.cameraStartX - dx / this.zoomLevel;
    let newScrollY = this.cameraStartY - dy / this.zoomLevel;

    // 🔥 平移边界限制 - 防止超出地图边界太多
    const camera = this.cameras.main;
    const viewWidth = camera.width / this.zoomLevel;
    const viewHeight = camera.height / this.zoomLevel;

    const minScrollX = -PAN_BOUNDARY_PADDING;
    const maxScrollX = this.mapWidth - viewWidth + PAN_BOUNDARY_PADDING;
    const minScrollY = -PAN_BOUNDARY_PADDING;
    const maxScrollY = this.mapHeight - viewHeight + PAN_BOUNDARY_PADDING;

    newScrollX = Phaser.Math.Clamp(newScrollX, minScrollX, maxScrollX);
    newScrollY = Phaser.Math.Clamp(newScrollY, minScrollY, maxScrollY);

    this.cameras.main.scrollX = newScrollX;
    this.cameras.main.scrollY = newScrollY;
  }

  /** 结束双指手势 */
  private endTwoFingerGesture() {
    this.isTwoFingerGesture = false;
    this.lastPinchDistance = 0;
    debugLog('[LevelEditorScene] Two finger gesture ended');
  }

  /** 计算两点之间的距离 */
  private getDistance(pointer1: Phaser.Input.Pointer, pointer2: Phaser.Input.Pointer): number {
    const dx = pointer2.x - pointer1.x;
    const dy = pointer2.y - pointer1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private createPlayerStartMarker() {
    // 安全检查：确保场景已初始化
    if (!this.add || !this.tweens || !this.input) {
      debugLog('[LevelEditorScene] Scene not ready, skipping createPlayerStartMarker');
      return;
    }

    const editorState = useEditorStore.getState();
    const { x, y } = editorState.playerStart;

    // 创建玩家角色容器
    this.playerStartMarker = this.add.container(x, y);

    // 创建玩家角色纹理（与战役模式一致的样式）
    const playerSize = 40;

    // 玩家身体（圆角矩形效果）
    const body = this.add.rectangle(0, 0, playerSize, playerSize, 0x00ff00, 0.9);
    body.setStrokeStyle(3, 0x00cc00);
    this.playerStartMarker.add(body);

    // 玩家眼睛
    const eyeLeft = this.add.circle(-8, -6, 5, 0xffffff);
    const eyeRight = this.add.circle(8, -6, 5, 0xffffff);
    const pupilLeft = this.add.circle(-6, -6, 2, 0x000000);
    const pupilRight = this.add.circle(10, -6, 2, 0x000000);
    this.playerStartMarker.add(eyeLeft);
    this.playerStartMarker.add(eyeRight);
    this.playerStartMarker.add(pupilLeft);
    this.playerStartMarker.add(pupilRight);

    // 玩家嘴巴（微笑）
    const mouth = this.add.graphics();
    mouth.lineStyle(2, 0x000000);
    mouth.beginPath();
    mouth.arc(0, 2, 8, 0.2, Math.PI - 0.2, false);
    mouth.strokePath();
    this.playerStartMarker.add(mouth);

    // 标签
    const label = this.add.text(0, 35, '🎮 玩家', {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#00ff00',
      backgroundColor: '#000000cc',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5);
    this.playerStartMarker.add(label);

    // 外圈发光效果
    const outerGlow = this.add.circle(0, 0, 30, 0x00ff00, 0.15);
    this.playerStartMarker.addAt(outerGlow, 0);

    // 添加呼吸动画
    this.tweens.add({
      targets: outerGlow,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1500,
      repeat: -1,
    });

    // 添加轻微浮动动画（模拟玩家待机）
    const floatTween = this.tweens.add({
      targets: this.playerStartMarker,
      y: y - 3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 存储动画引用，用于拖动时暂停
    (this.playerStartMarker as any).floatTween = floatTween;

    this.playerStartMarker.setDepth(100);

    // 设置交互，允许拖动
    this.playerStartMarker.setSize(playerSize + 20, playerSize + 20);
    this.playerStartMarker.setInteractive({ draggable: true });

    // 拖动开始时暂停浮动动画
    this.playerStartMarker.on('dragstart', () => {
      const tween = (this.playerStartMarker as any).floatTween;
      if (tween) {
        tween.pause();
      }
    });

    // 拖动事件
    this.playerStartMarker.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      const snappedX = this.snapToGrid(dragX);
      const snappedY = this.snapToGrid(dragY);
      this.playerStartMarker.setPosition(snappedX, snappedY);
    });

    this.playerStartMarker.on('dragend', () => {
      // 更新store
      const finalX = this.playerStartMarker.x;
      const finalY = this.playerStartMarker.y;

      useEditorStore.getState().setPlayerStart({
        x: finalX,
        y: finalY,
      });

      // 恢复浮动动画，从新位置开始
      const tween = (this.playerStartMarker as any).floatTween;
      if (tween) {
        // 重新创建动画从新位置开始
        tween.stop();
        (this.playerStartMarker as any).floatTween = this.tweens.add({
          targets: this.playerStartMarker,
          y: finalY - 3,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      // 验证位置
      this.validateStartPosition(finalX, finalY);

      debugLog('[LevelEditorScene] Player position updated:', finalX, finalY);
    });

    // 启用拖动
    this.input.setDraggable(this.playerStartMarker);
  }

  private loadElementsFromStore() {
    const editorState = useEditorStore.getState();

    // 加载所有元素
    editorState.elements.forEach((element) => {
      this.createElementSprite(element);
    });

    // 加载终点
    if (editorState.goal) {
      this.createGoalMarker(editorState.goal.x, editorState.goal.y);
    }

    // 更新起点位置
    this.playerStartMarker.setPosition(
      editorState.playerStart.x,
      editorState.playerStart.y
    );
  }

  private subscribeToStore() {
    // 订阅store变化
    this.unsubscribe = useEditorStore.subscribe((state, prevState) => {
      // 工具变化
      if (state.currentTool !== this.currentTool) {
        this.setTool(state.currentTool);
      }

      // 选中元素变化
      if (state.selectedElementId !== this.selectedElementId) {
        this.updateSelection(state.selectedElementId);
      }

      // 元素数据变化 - 更新精灵
      if (state.elements !== prevState.elements) {
        this.syncElementSprites(state.elements, prevState.elements);
      }

      // 地图尺寸变化 - 重新初始化场景
      if (state.mapWidth !== prevState.mapWidth || state.mapHeight !== prevState.mapHeight) {
        this.handleMapSizeChange(state.mapWidth, state.mapHeight);
      }

      // 起点位置变化 - 更新标记
      if (state.playerStart.x !== prevState.playerStart.x ||
        state.playerStart.y !== prevState.playerStart.y) {
        this.updatePlayerStartMarker(state.playerStart.x, state.playerStart.y);
      }

      // 终点位置变化 - 更新标记
      if (state.goal !== prevState.goal) {
        if (state.goal) {
          this.createGoalMarker(state.goal.x, state.goal.y);
        } else if (this.goalMarker) {
          this.goalMarker.destroy();
          this.goalMarker = null;
        }
      }
    });
  }

  /** 处理地图尺寸变化 */
  private handleMapSizeChange(newWidth: number, newHeight: number) {
    debugLog('[LevelEditorScene] Map size changed:', newWidth, 'x', newHeight);

    // 🔥 v2.4.5: 安全检查 - 确保场景和物理世界已初始化
    if (!this.physics || !this.physics.world) {
      debugLog('[LevelEditorScene] Physics world not ready, skipping handleMapSizeChange');
      return;
    }

    if (!this.add || !this.cameras || !this.cameras.main) {
      debugLog('[LevelEditorScene] Scene not fully initialized, skipping handleMapSizeChange');
      return;
    }

    // 更新内部状态
    this.mapWidth = newWidth;
    this.mapHeight = newHeight;

    // 更新物理世界边界
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    // 重新创建背景
    this.createBackground();

    // 重新创建网格
    this.createGrid();

    // 重新设置相机边界
    this.setupCamera();

    // 发送地图尺寸变化事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('editor-map-size-changed', {
        detail: { width: newWidth, height: newHeight },
      }));
    }
  }

  /** 更新玩家起点标记位置 */
  private updatePlayerStartMarker(x: number, y: number) {
    // 🔥 v2.4.5: 安全检查 - 确保 tweens 已初始化
    if (!this.tweens) {
      debugLog('[LevelEditorScene] Tweens not ready, skipping updatePlayerStartMarker');
      return;
    }

    if (this.playerStartMarker) {
      // 暂停浮动动画
      const tween = (this.playerStartMarker as any).floatTween;
      if (tween) {
        tween.stop();
      }

      // 更新位置
      this.playerStartMarker.setPosition(x, y);

      // 重新创建浮动动画
      (this.playerStartMarker as any).floatTween = this.tweens.add({
        targets: this.playerStartMarker,
        y: y - 3,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** 同步元素精灵与store数据 */
  private syncElementSprites(newElements: EditorElement[], oldElements: EditorElement[]) {
    // 🔥 v2.4.5: 安全检查 - 确保场景已初始化
    if (!this.add) {
      debugLog('[LevelEditorScene] Scene not ready, skipping syncElementSprites');
      return;
    }

    // 检查每个元素是否有变化
    newElements.forEach((newEl) => {
      const oldEl = oldElements.find(e => e.id === newEl.id);
      const sprite = this.elementSprites.get(newEl.id);

      if (sprite && oldEl) {
        // 检查尺寸或位置是否变化
        const sizeChanged = newEl.width !== oldEl.width || newEl.height !== oldEl.height;
        const posChanged = newEl.x !== oldEl.x || newEl.y !== oldEl.y;
        const configChanged = JSON.stringify(newEl.config) !== JSON.stringify(oldEl.config);

        if (sizeChanged || configChanged) {
          // 重新创建精灵
          this.recreateElementSprite(newEl);
        } else if (posChanged) {
          // 只更新位置
          sprite.container.setPosition(newEl.x, newEl.y);
          if (sprite.selectionRect) {
            sprite.selectionRect.setPosition(newEl.x, newEl.y);
          }
        }
      }
    });
  }

  /** 重新创建元素精灵 */
  private recreateElementSprite(element: EditorElement) {
    const oldSprite = this.elementSprites.get(element.id);

    if (oldSprite) {
      // 销毁旧精灵
      if (oldSprite.selectionRect) {
        oldSprite.selectionRect.destroy();
      }
      oldSprite.container.destroy();
      this.elementSprites.delete(element.id);
    }

    // 创建新精灵
    const newSprite = this.createElementSprite(element);
    if (!newSprite) {
      debugLog('[LevelEditorScene] Failed to create sprite for element:', element.id);
      return;
    }

    // 如果是选中状态，重新创建选中框
    if (this.selectedElementId === element.id) {
      const width = element.width || 64;
      const height = element.height || 64;

      const selectionRect = this.add.rectangle(
        newSprite.container.x,
        newSprite.container.y,
        width + 8,
        height + 8
      );
      selectionRect.setStrokeStyle(3, 0x00ff00);
      selectionRect.setFillStyle(0x00ff00, 0.1);
      selectionRect.setDepth(49);

      newSprite.selectionRect = selectionRect;
    }

    debugLog('[LevelEditorScene] Recreated sprite for element:', element.id);
  }

  // 存储事件处理函数引用，用于正确清理
  private windowEventHandlers: Map<string, EventListener> = new Map();

  private setupWindowEvents() {
    if (typeof window === 'undefined') return;

    // 工具变化事件处理
    const handleToolChange = ((event: CustomEvent) => {
      if (!this.scene || !this.scene.isActive()) return;
      const { tool } = event.detail;
      this.setTool(tool);
    }) as EventListener;

    // 元素放置事件处理
    const handlePlaceElement = ((event: CustomEvent) => {
      if (!this.scene || !this.scene.isActive()) return;
      const { elementType, config, defaultSize } = event.detail;
      this.setPlaceMode(elementType, config, defaultSize);
    }) as EventListener;

    // 网格切换事件处理
    const handleToggleGrid = (() => {
      if (!this.scene || !this.scene.isActive()) return;
      this.toggleGrid();
    }) as EventListener;

    // 缩放事件处理
    const handleZoom = ((event: CustomEvent) => {
      if (!this.scene || !this.scene.isActive()) return;
      const { direction } = event.detail;
      if (direction === 'in') {
        this.zoomIn();
      } else if (direction === 'out') {
        this.zoomOut();
      } else if (direction === 'reset') {
        this.resetZoom();
      }
    }) as EventListener;

    // 关卡加载事件处理
    const handleLevelLoaded = (() => {
      if (!this.scene || !this.scene.isActive()) return;
      this.refreshFromStore();
    }) as EventListener;

    // 注册事件监听器
    window.addEventListener('editor-tool-change', handleToolChange);
    window.addEventListener('editor-place-element', handlePlaceElement);
    window.addEventListener('editor-toggle-grid', handleToggleGrid);
    window.addEventListener('editor-zoom', handleZoom);
    window.addEventListener('editor-level-loaded', handleLevelLoaded);

    // 存储引用用于清理
    this.windowEventHandlers.set('editor-tool-change', handleToolChange);
    this.windowEventHandlers.set('editor-place-element', handlePlaceElement);
    this.windowEventHandlers.set('editor-toggle-grid', handleToggleGrid);
    this.windowEventHandlers.set('editor-zoom', handleZoom);
    this.windowEventHandlers.set('editor-level-loaded', handleLevelLoaded);

    // 清理事件监听
    this.events.once('shutdown', () => {
      this.cleanupWindowEvents();
    });
  }

  /** 清理窗口事件监听器 */
  private cleanupWindowEvents() {
    if (typeof window === 'undefined') return;

    for (const [eventName, handler] of this.windowEventHandlers) {
      window.removeEventListener(eventName, handler);
    }
    this.windowEventHandlers.clear();
    debugLog('[LevelEditorScene] Window event handlers cleaned up');
  }

  /** 从store刷新场景（加载关卡后调用） */
  private refreshFromStore() {
    // 🔥 v2.4.5: 安全检查 - 确保场景已完全初始化
    if (!this.scene || !this.scene.isActive()) {
      debugLog('[LevelEditorScene] Scene not active, skipping refreshFromStore');
      return;
    }

    if (!this.physics || !this.physics.world) {
      debugLog('[LevelEditorScene] Physics world not ready, skipping refreshFromStore');
      return;
    }

    if (!this.add || !this.tweens) {
      debugLog('[LevelEditorScene] Scene not fully initialized, skipping refreshFromStore');
      return;
    }

    const editorState = useEditorStore.getState();

    debugLog('[LevelEditorScene] Refreshing from store...');

    // 更新地图尺寸
    if (editorState.mapWidth !== this.mapWidth || editorState.mapHeight !== this.mapHeight) {
      this.handleMapSizeChange(editorState.mapWidth, editorState.mapHeight);
    }

    // 刷新所有元素
    this.refreshElements();

    // 更新起点位置
    this.updatePlayerStartMarker(editorState.playerStart.x, editorState.playerStart.y);

    // 更新终点
    if (editorState.goal) {
      this.createGoalMarker(editorState.goal.x, editorState.goal.y);
    } else if (this.goalMarker) {
      this.goalMarker.destroy();
      this.goalMarker = null;
    }

    debugLog('[LevelEditorScene] Refresh complete');
  }

  // ==================== 网格系统 ====================

  /** 将坐标对齐到网格 */
  public snapToGrid(value: number): number {
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  /** 切换网格显示 */
  public toggleGrid() {
    this.gridVisible = !this.gridVisible;
    this.drawGrid();
  }

  /** 设置网格大小 */
  public setGridSize(size: number) {
    this.gridSize = size;
    this.drawGrid();
  }

  // ==================== 元素操作 ====================

  /** 创建元素精灵 */
  private createElementSprite(element: EditorElement): EditorElementSprite | null {
    // 安全检查：确保场景已初始化
    if (!this.add || !this.tweens) {
      debugLog('[LevelEditorScene] Scene not ready, skipping createElementSprite');
      return null;
    }

    const container = this.add.container(element.x, element.y);

    const width = element.width || 64;
    const height = element.height || 64;
    const color = ELEMENT_COLORS[element.type] || 0xffffff;
    const icon = ELEMENT_ICONS[element.type] || '?';

    // 背景矩形 - 使用实际尺寸
    const rect = this.add.rectangle(0, 0, width, height, color, 0.8);
    rect.setStrokeStyle(2, 0xFFD700);
    container.add(rect);

    // 图标文字 - 根据尺寸调整字体大小
    const fontSize = Math.min(width, height) * 0.6;
    const text = this.add.text(0, 0, icon, {
      fontSize: `${Math.max(16, fontSize)}px`,
    }).setOrigin(0.5);
    container.add(text);

    // 设置交互 - 使用实际尺寸作为交互区域
    container.setSize(width, height);
    container.setInteractive();
    container.setDepth(50);

    // 存储元素数据
    (container as any).elementId = element.id;
    (container as any).elementData = element;

    const sprite: EditorElementSprite = {
      id: element.id,
      container,
      element,
    };

    this.elementSprites.set(element.id, sprite);

    // 为敌人添加浮动动画效果（不添加巡逻指示，避免占用太多空间）
    if (element.type.startsWith('enemy_')) {
      this.addEnemyAnimation(container, element);
    }

    // 为移动平台添加移动指示
    if (element.type === 'moving') {
      this.addMovingPlatformIndicator(container, element);
    }

    return sprite;
  }

  /** 为敌人添加浮动动画 */
  private addEnemyAnimation(container: Phaser.GameObjects.Container, element: EditorElement) {
    // 只添加简单的浮动动画，不添加巡逻指示（避免占用太多空间）
    this.tweens.add({
      targets: container,
      y: element.y - 3,
      duration: 1200 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** 为移动平台添加移动指示 */
  private addMovingPlatformIndicator(container: Phaser.GameObjects.Container, element: EditorElement) {
    const config = element.config as PlatformConfig;
    const moveDirection = config?.moveDirection || 'horizontal';
    const moveDistance = config?.moveDistance || 200;

    // 添加移动方向指示
    const indicator = this.add.graphics();
    indicator.lineStyle(2, 0xff6b35, 0.5);

    if (moveDirection === 'horizontal') {
      // 水平移动指示
      indicator.moveTo(-moveDistance / 2, 0);
      indicator.lineTo(moveDistance / 2, 0);

      // 箭头
      indicator.moveTo(-moveDistance / 2, 0);
      indicator.lineTo(-moveDistance / 2 + 10, -5);
      indicator.moveTo(-moveDistance / 2, 0);
      indicator.lineTo(-moveDistance / 2 + 10, 5);

      indicator.moveTo(moveDistance / 2, 0);
      indicator.lineTo(moveDistance / 2 - 10, -5);
      indicator.moveTo(moveDistance / 2, 0);
      indicator.lineTo(moveDistance / 2 - 10, 5);
    } else {
      // 垂直移动指示
      indicator.moveTo(0, -moveDistance / 2);
      indicator.lineTo(0, moveDistance / 2);

      // 箭头
      indicator.moveTo(0, -moveDistance / 2);
      indicator.lineTo(-5, -moveDistance / 2 + 10);
      indicator.moveTo(0, -moveDistance / 2);
      indicator.lineTo(5, -moveDistance / 2 + 10);

      indicator.moveTo(0, moveDistance / 2);
      indicator.lineTo(-5, moveDistance / 2 - 10);
      indicator.moveTo(0, moveDistance / 2);
      indicator.lineTo(5, moveDistance / 2 - 10);
    }

    indicator.strokePath();
    container.addAt(indicator, 0);  // 添加到底层

    // 平台本身的移动动画预览
    const previewDuration = 3000;
    if (moveDirection === 'horizontal') {
      this.tweens.add({
        targets: container,
        x: element.x + moveDistance / 2,
        duration: previewDuration,
        yoyo: true,
        repeat: -1,
        ease: 'Linear',
      });
    } else {
      this.tweens.add({
        targets: container,
        y: element.y + moveDistance / 2,
        duration: previewDuration,
        yoyo: true,
        repeat: -1,
        ease: 'Linear',
      });
    }
  }

  /** 放置元素 */
  public placeElement(
    type: string,
    x: number,
    y: number,
    config?: ElementConfig
  ): EditorElement {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 获取默认尺寸
    const defaultSize = (this as any).pendingDefaultSize || { width: 64, height: 64 };

    const element: EditorElement = {
      id,
      type,
      x: this.snapToGrid(x),
      y: this.snapToGrid(y),
      width: defaultSize.width,
      height: defaultSize.height,
      config: config || this.getDefaultConfig(type),
    };

    // 添加到store
    useEditorStore.getState().addElement(element);

    // 创建精灵
    this.createElementSprite(element);

    debugLog('[LevelEditorScene] Element placed:', element);

    return element;
  }

  /** 获取默认配置 */
  private getDefaultConfig(type: string): ElementConfig {
    if (type.startsWith('enemy_')) {
      return {
        enemyType: type.replace('enemy_', '') as any,
      } as EnemyConfig;
    }

    if (['coin', 'gem', 'key', 'clue'].includes(type)) {
      return {
        collectibleType: type as any,
        value: type === 'coin' ? 10 : type === 'gem' ? 50 : 1,
      } as CollectibleConfig;
    }

    if (['spike', 'fire', 'electric', 'explosion'].includes(type)) {
      return {
        trapType: type as any,
        damage: 20,
        pattern: 'static',
      } as TrapConfig;
    }

    if (['button', 'lever', 'door', 'portal', 'trampoline', 'wind', 'gravity_zone'].includes(type)) {
      return {
        mechanismType: type as any,
      } as MechanismConfig;
    }

    // 默认平台配置
    return {
      platformType: type as any || 'platform',
    } as PlatformConfig;
  }

  /** 选择元素 */
  public selectElement(element: EditorElement | null) {
    // 清除之前的选中状态
    if (this.selectedElementId) {
      const prevSprite = this.elementSprites.get(this.selectedElementId);
      if (prevSprite?.selectionRect) {
        prevSprite.selectionRect.destroy();
        prevSprite.selectionRect = undefined;
      }
    }

    if (element) {
      this.selectedElementId = element.id;
      const sprite = this.elementSprites.get(element.id);

      if (sprite) {
        // 创建选中框
        const width = element.width || 64;
        const height = element.height || 64;

        const selectionRect = this.add.rectangle(
          sprite.container.x,
          sprite.container.y,
          width + 8,
          height + 8
        );
        selectionRect.setStrokeStyle(3, 0x00ff00);
        selectionRect.setFillStyle(0x00ff00, 0.1);
        selectionRect.setDepth(49);

        sprite.selectionRect = selectionRect;
      }

      // 更新store
      useEditorStore.getState().selectElement(element.id);
    } else {
      this.selectedElementId = null;
      useEditorStore.getState().selectElement(null);
    }
  }

  /** 更新选中状态 */
  private updateSelection(elementId: string | null) {
    if (elementId === this.selectedElementId) return;

    // 清除之前的选中框
    if (this.selectedElementId) {
      const prevSprite = this.elementSprites.get(this.selectedElementId);
      if (prevSprite?.selectionRect) {
        prevSprite.selectionRect.destroy();
        prevSprite.selectionRect = undefined;
      }
    }

    this.selectedElementId = elementId;

    // 创建新的选中框
    if (elementId) {
      const sprite = this.elementSprites.get(elementId);
      if (sprite) {
        const width = sprite.element.width || 64;
        const height = sprite.element.height || 64;

        const selectionRect = this.add.rectangle(
          sprite.container.x,
          sprite.container.y,
          width + 8,
          height + 8
        );
        selectionRect.setStrokeStyle(3, 0x00ff00);
        selectionRect.setFillStyle(0x00ff00, 0.1);
        selectionRect.setDepth(49);

        sprite.selectionRect = selectionRect;
      }
    }
  }

  /** 删除元素 */
  public deleteElement(element: EditorElement) {
    const sprite = this.elementSprites.get(element.id);

    if (sprite) {
      // 销毁选中框
      if (sprite.selectionRect) {
        sprite.selectionRect.destroy();
      }

      // 销毁容器
      sprite.container.destroy();

      // 从Map中移除
      this.elementSprites.delete(element.id);
    }

    // 从store中移除
    useEditorStore.getState().removeElement(element.id);

    // 清除选中状态
    if (this.selectedElementId === element.id) {
      this.selectedElementId = null;
    }

    debugLog('[LevelEditorScene] Element deleted:', element.id);
  }

  /** 移动元素 */
  public moveElement(element: EditorElement, x: number, y: number) {
    const sprite = this.elementSprites.get(element.id);

    const snappedX = this.snapToGrid(x);
    const snappedY = this.snapToGrid(y);

    if (sprite) {
      sprite.container.setPosition(snappedX, snappedY);

      // 更新选中框位置
      if (sprite.selectionRect) {
        sprite.selectionRect.setPosition(snappedX, snappedY);
      }
    }

    // 更新store
    useEditorStore.getState().updateElement(element.id, {
      x: snappedX,
      y: snappedY,
    });
  }

  // ==================== 标记操作 ====================

  /** 位置验证警告图形 */
  private startWarningGraphics: Phaser.GameObjects.Graphics | null = null;
  private goalWarningGraphics: Phaser.GameObjects.Graphics | null = null;

  /** 创建标记 */
  private createMarker(
    x: number,
    y: number,
    type: string,
    icon: string,
    color: number
  ): Phaser.GameObjects.Container | null {
    // 安全检查：确保场景已初始化
    if (!this.add || !this.tweens) {
      debugLog('[LevelEditorScene] Scene not ready, skipping createMarker');
      return null;
    }

    const container = this.add.container(x, y);

    // 背景圆形 - 更大更明显
    const circle = this.add.circle(0, 0, 28, color, 0.85);
    circle.setStrokeStyle(4, 0xFFD700);
    container.add(circle);

    // 外圈发光效果
    const outerGlow = this.add.circle(0, 0, 36, color, 0.2);
    container.add(outerGlow);

    // 图标 - 更大
    const text = this.add.text(0, 0, icon, {
      fontSize: '32px',
    }).setOrigin(0.5);
    container.add(text);

    // 标签 - 更清晰
    const labelText = type === 'player_start' ? '🏁 起点' : '⭐ 终点';
    const label = this.add.text(0, 42, labelText, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FFD700',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);
    container.add(label);

    // 添加脉冲动画
    this.tweens.add({
      targets: outerGlow,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1500,
      repeat: -1,
    });

    return container;
  }

  /** 创建终点标记 */
  private createGoalMarker(x: number, y: number) {
    // 安全检查：确保场景已初始化
    if (!this.add || !this.tweens) {
      debugLog('[LevelEditorScene] Scene not ready, skipping createGoalMarker');
      return;
    }

    if (this.goalMarker) {
      this.goalMarker.destroy();
    }

    this.goalMarker = this.createMarker(x, y, 'goal', '⭐', 0xFFD700);
    if (!this.goalMarker) return;

    this.goalMarker.setDepth(100);

    // 添加旋转发光动画
    this.tweens.add({
      targets: this.goalMarker,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 验证终点位置
    this.validateGoalPosition(x, y);
  }

  /**
   * 验证位置是否有效
   * Requirements: 9.4 - 检测无效位置并显示警告
   * @returns 验证结果对象，包含是否有效和警告信息
   */
  public validatePosition(x: number, y: number): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // 检查是否在地图边界内
    const margin = 32; // 边缘安全距离
    if (x < margin || x > this.mapWidth - margin) {
      warnings.push('位置太靠近地图边缘（水平方向）');
    }
    if (y < margin || y > this.mapHeight - margin) {
      warnings.push('位置太靠近地图边缘（垂直方向）');
    }

    // 检查是否与现有元素重叠（可能卡住玩家）
    const editorState = useEditorStore.getState();
    for (const element of editorState.elements) {
      const elWidth = element.width || 64;
      const elHeight = element.height || 64;
      const elLeft = element.x - elWidth / 2;
      const elRight = element.x + elWidth / 2;
      const elTop = element.y - elHeight / 2;
      const elBottom = element.y + elHeight / 2;

      // 检查点是否在元素内部
      if (x >= elLeft && x <= elRight && y >= elTop && y <= elBottom) {
        // 平台类型的元素可能会卡住玩家
        if (['platform', 'ground', 'moving', 'ceiling'].includes(element.type)) {
          warnings.push('位置与平台重叠，玩家可能会卡住');
        }
        // 陷阱类型的元素会伤害玩家
        if (['spike', 'fire', 'electric', 'explosion'].includes(element.type)) {
          warnings.push('位置与陷阱重叠，玩家会立即受伤');
        }
      }
    }

    // 检查是否在地图底部（可能掉落）
    if (y > this.mapHeight - 100) {
      warnings.push('位置太靠近地图底部，玩家可能会掉落');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * 验证起点位置并显示警告
   * Requirements: 9.4
   */
  private validateStartPosition(x: number, y: number) {
    const validation = this.validatePosition(x, y);

    // 清除之前的警告图形
    if (this.startWarningGraphics) {
      this.startWarningGraphics.destroy();
      this.startWarningGraphics = null;
    }

    if (!validation.valid) {
      // 显示警告指示器
      this.startWarningGraphics = this.add.graphics();
      this.startWarningGraphics.setDepth(101);

      // 绘制警告圆圈
      this.startWarningGraphics.lineStyle(3, 0xff6600, 0.8);
      this.startWarningGraphics.strokeCircle(x, y, 40);

      // 添加闪烁动画
      this.tweens.add({
        targets: this.startWarningGraphics,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });

      // 发送警告事件到UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('editor-position-warning', {
          detail: {
            type: 'player_start',
            position: { x, y },
            warnings: validation.warnings,
          },
        }));
      }

      debugLog('[LevelEditorScene] Start position warning:', validation.warnings);
    }
  }

  /**
   * 验证终点位置并显示警告
   * Requirements: 9.4
   */
  private validateGoalPosition(x: number, y: number) {
    const validation = this.validatePosition(x, y);

    // 清除之前的警告图形
    if (this.goalWarningGraphics) {
      this.goalWarningGraphics.destroy();
      this.goalWarningGraphics = null;
    }

    if (!validation.valid) {
      // 显示警告指示器
      this.goalWarningGraphics = this.add.graphics();
      this.goalWarningGraphics.setDepth(101);

      // 绘制警告圆圈
      this.goalWarningGraphics.lineStyle(3, 0xff6600, 0.8);
      this.goalWarningGraphics.strokeCircle(x, y, 40);

      // 添加闪烁动画
      this.tweens.add({
        targets: this.goalWarningGraphics,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });

      // 发送警告事件到UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('editor-position-warning', {
          detail: {
            type: 'goal',
            position: { x, y },
            warnings: validation.warnings,
          },
        }));
      }

      debugLog('[LevelEditorScene] Goal position warning:', validation.warnings);
    }
  }

  /**
   * 设置起点位置
   * Requirements: 9.1, 9.2, 9.3
   */
  public setPlayerStart(x: number, y: number) {
    const snappedX = this.snapToGrid(x);
    const snappedY = this.snapToGrid(y);

    // 更新标记位置
    this.playerStartMarker.setPosition(snappedX, snappedY);

    // 更新store
    useEditorStore.getState().setPlayerStart({ x: snappedX, y: snappedY });

    // 验证位置
    this.validateStartPosition(snappedX, snappedY);

    // 播放放置音效反馈
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('editor-element-placed', {
        detail: { type: 'player_start', x: snappedX, y: snappedY },
      }));
    }

    debugLog('[LevelEditorScene] Player start set:', snappedX, snappedY);
  }

  /**
   * 设置终点位置
   * Requirements: 7.3
   */
  public setGoal(x: number, y: number) {
    const snappedX = this.snapToGrid(x);
    const snappedY = this.snapToGrid(y);

    // 创建/更新终点标记
    this.createGoalMarker(snappedX, snappedY);

    // 更新store
    useEditorStore.getState().setGoal({ x: snappedX, y: snappedY });

    // 播放放置音效反馈
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('editor-element-placed', {
        detail: { type: 'goal', x: snappedX, y: snappedY },
      }));
    }

    debugLog('[LevelEditorScene] Goal set:', snappedX, snappedY);
  }

  /**
   * 获取起点位置
   */
  public getPlayerStart(): Position {
    return useEditorStore.getState().playerStart;
  }

  /**
   * 获取终点位置
   */
  public getGoal(): Position | null {
    return useEditorStore.getState().goal;
  }

  /**
   * 清除位置警告
   */
  public clearPositionWarnings() {
    if (this.startWarningGraphics) {
      this.startWarningGraphics.destroy();
      this.startWarningGraphics = null;
    }
    if (this.goalWarningGraphics) {
      this.goalWarningGraphics.destroy();
      this.goalWarningGraphics = null;
    }
  }

  // ==================== 工具操作 ====================

  /** 设置当前工具 */
  public setTool(tool: EditorTool) {
    this.currentTool = tool;

    // 清除预览元素
    if (tool !== 'place' && this.previewElement) {
      this.previewElement.destroy();
      this.previewElement = null;
      this.previewElementType = null;
    }

    // 更新光标样式
    if (typeof document !== 'undefined') {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        switch (tool) {
          case 'select':
            canvas.style.cursor = 'default';
            break;
          case 'place':
            canvas.style.cursor = 'crosshair';
            break;
          case 'delete':
            canvas.style.cursor = 'not-allowed';
            break;
          case 'pan':
            canvas.style.cursor = 'grab';
            break;
        }
      }
    }

    debugLog('[LevelEditorScene] Tool changed:', tool);
  }

  /** 设置放置模式 */
  public setPlaceMode(elementType: string, config?: ElementConfig, defaultSize?: { width: number; height: number }) {
    // 安全检查：确保场景已初始化
    if (!this.cameras || !this.cameras.main || !this.input) {
      debugLog('[LevelEditorScene] Scene not ready, skipping setPlaceMode');
      return;
    }

    this.currentTool = 'place';
    this.previewElementType = elementType;

    // 存储默认尺寸
    (this as any).pendingDefaultSize = defaultSize;

    // 创建预览元素
    if (this.previewElement) {
      this.previewElement.destroy();
      this.previewElement = null;
    }

    try {
      const pointer = this.input.activePointer;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

      this.previewElement = this.createPreviewElement(
        elementType,
        worldPoint.x,
        worldPoint.y,
        defaultSize
      );
    } catch (error) {
      debugLog('[LevelEditorScene] Error creating preview element:', error);
    }

    debugLog('[LevelEditorScene] Place mode set:', elementType, 'size:', defaultSize);
  }

  /** 创建预览元素 */
  private createPreviewElement(
    type: string,
    x: number,
    y: number,
    defaultSize?: { width: number; height: number }
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const color = ELEMENT_COLORS[type] || 0xffffff;
    const icon = ELEMENT_ICONS[type] || '?';
    const width = defaultSize?.width || 64;
    const height = defaultSize?.height || 64;

    // 半透明背景
    const rect = this.add.rectangle(0, 0, width, height, color, 0.5);
    rect.setStrokeStyle(2, 0x00ff00, 0.8);
    container.add(rect);

    // 图标
    const text = this.add.text(0, 0, icon, {
      fontSize: '24px',
    }).setOrigin(0.5).setAlpha(0.7);
    container.add(text);

    container.setDepth(200);

    return container;
  }

  // ==================== 缩放和平移 ====================

  /** 放大 */
  public zoomIn() {
    this.setZoom(this.zoomLevel + ZOOM_STEP);
  }

  /** 缩小 */
  public zoomOut() {
    this.setZoom(this.zoomLevel - ZOOM_STEP);
  }

  /** 重置缩放 */
  public resetZoom() {
    this.setZoom(1);
    this.cameras.main.centerOn(this.mapWidth / 2, this.mapHeight / 2);
  }

  /** 设置缩放级别 */
  public setZoom(level: number) {
    // 限制缩放范围
    const newZoom = Phaser.Math.Clamp(level, MIN_ZOOM, MAX_ZOOM);

    if (newZoom === this.zoomLevel) return;

    // 获取当前鼠标位置作为缩放中心
    const pointer = this.input.activePointer;
    const worldPointBefore = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // 应用缩放
    this.zoomLevel = newZoom;
    this.cameras.main.setZoom(newZoom);

    // 调整相机位置以保持鼠标位置不变
    const worldPointAfter = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    this.cameras.main.scrollX += worldPointBefore.x - worldPointAfter.x;
    this.cameras.main.scrollY += worldPointBefore.y - worldPointAfter.y;

    debugLog('[LevelEditorScene] Zoom level:', newZoom);

    // 发送缩放变化事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('editor-zoom-changed', {
        detail: { zoom: newZoom },
      }));
    }
  }

  /** 平移到指定位置 */
  public panTo(x: number, y: number) {
    this.cameras.main.centerOn(x, y);
  }

  /** 🔥 获取工具对应的鼠标光标 */
  private getCursorForTool(tool: EditorTool): string {
    switch (tool) {
      case 'select':
        return 'default';
      case 'place':
        return 'crosshair';
      case 'delete':
        return 'not-allowed';
      case 'pan':
        return 'grab';
      default:
        return 'default';
    }
  }

  // ==================== 输入处理 ====================

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    // 跳过双指手势期间的单指操作
    if (this.isTwoFingerGesture) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // 中键平移
    if (pointer.middleButtonDown()) {
      this.startPanning(pointer);
      return;
    }

    // 🔥 空格键平移模式
    if (this.isSpacePanning) {
      this.startPanning(pointer);
      return;
    }

    // 根据当前工具处理
    switch (this.currentTool) {
      case 'select':
        this.handleSelectClick(worldPoint);
        break;

      case 'place':
        this.handlePlaceClick(worldPoint);
        break;

      case 'delete':
        this.handleDeleteClick(worldPoint);
        break;

      case 'pan':
        this.startPanning(pointer);
        break;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    // 处理双指手势 - Requirements: 15.2, 15.3
    if (this.isTouchDevice) {
      const pointers = this.input.manager.pointers.filter(p => p.isDown);
      if (pointers.length === 2) {
        this.handleTwoFingerMove(pointers[0], pointers[1]);
        return;
      }
    }

    // 处理平移
    if (this.isPanning) {
      const dx = pointer.x - this.panStartX;
      const dy = pointer.y - this.panStartY;

      let newScrollX = this.cameraStartX - dx / this.zoomLevel;
      let newScrollY = this.cameraStartY - dy / this.zoomLevel;

      // 🔥 平移边界限制 - 防止超出地图边界太多
      const camera = this.cameras.main;
      const viewWidth = camera.width / this.zoomLevel;
      const viewHeight = camera.height / this.zoomLevel;

      // 计算允许的滚动范围
      const minScrollX = -PAN_BOUNDARY_PADDING;
      const maxScrollX = this.mapWidth - viewWidth + PAN_BOUNDARY_PADDING;
      const minScrollY = -PAN_BOUNDARY_PADDING;
      const maxScrollY = this.mapHeight - viewHeight + PAN_BOUNDARY_PADDING;

      // 限制滚动范围
      newScrollX = Phaser.Math.Clamp(newScrollX, minScrollX, maxScrollX);
      newScrollY = Phaser.Math.Clamp(newScrollY, minScrollY, maxScrollY);

      this.cameras.main.scrollX = newScrollX;
      this.cameras.main.scrollY = newScrollY;
      return;
    }

    // 处理拖动元素
    if (this.isDragging && this.selectedElementId) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const sprite = this.elementSprites.get(this.selectedElementId);

      if (sprite) {
        const newX = this.dragElementStartX + (worldPoint.x - this.dragStartX);
        const newY = this.dragElementStartY + (worldPoint.y - this.dragStartY);

        // 如果按住Shift，对齐到网格 (触摸设备默认对齐)
        const shouldSnap = this.shiftKey?.isDown || this.isTouchDevice;
        const snappedX = shouldSnap ? this.snapToGrid(newX) : newX;
        const snappedY = shouldSnap ? this.snapToGrid(newY) : newY;

        // 🔒 性能优化：节流视觉更新（约60fps）
        const now = Date.now();
        if (now - this.lastDragUpdateTime >= DRAG_THROTTLE_MS) {
          sprite.container.setPosition(snappedX, snappedY);

          if (sprite.selectionRect) {
            sprite.selectionRect.setPosition(snappedX, snappedY);
          }

          this.lastDragUpdateTime = now;
        }

        // 存储待更新的位置（用于拖动结束时更新store）
        this.pendingDragUpdate = { x: snappedX, y: snappedY };
      }
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    // 结束双指手势
    if (this.isTwoFingerGesture) {
      const pointers = this.input.manager.pointers.filter(p => p.isDown);
      if (pointers.length < 2) {
        this.endTwoFingerGesture();
      }
    }

    // 结束平移
    if (this.isPanning) {
      this.isPanning = false;

      if (typeof document !== 'undefined') {
        const canvas = document.querySelector('canvas');
        if (canvas && this.currentTool === 'pan') {
          canvas.style.cursor = 'grab';
        }
      }
    }

    // 结束拖动
    if (this.isDragging && this.selectedElementId) {
      const sprite = this.elementSprites.get(this.selectedElementId);

      if (sprite) {
        // 🔒 性能优化：使用待更新的位置，或者当前精灵位置
        const finalX = this.pendingDragUpdate?.x ?? sprite.container.x;
        const finalY = this.pendingDragUpdate?.y ?? sprite.container.y;

        // 确保精灵位置是最终位置
        sprite.container.setPosition(finalX, finalY);
        if (sprite.selectionRect) {
          sprite.selectionRect.setPosition(finalX, finalY);
        }

        // 更新store中的位置（只在拖动结束时更新一次）
        useEditorStore.getState().updateElement(this.selectedElementId, {
          x: finalX,
          y: finalY,
        });
      }

      this.isDragging = false;
      this.pendingDragUpdate = null;
    }
  }

  private onWheel(
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
    deltaX: number,
    deltaY: number
  ) {
    // 滚轮缩放
    if (deltaY < 0) {
      this.zoomIn();
    } else if (deltaY > 0) {
      this.zoomOut();
    }
  }

  private startPanning(pointer: Phaser.Input.Pointer) {
    this.isPanning = true;
    this.panStartX = pointer.x;
    this.panStartY = pointer.y;
    this.cameraStartX = this.cameras.main.scrollX;
    this.cameraStartY = this.cameras.main.scrollY;

    if (typeof document !== 'undefined') {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.cursor = 'grabbing';
      }
    }
  }

  private handleSelectClick(worldPoint: Phaser.Math.Vector2) {
    // 查找点击的元素
    let clickedElement: EditorElement | null = null;

    for (const [id, sprite] of this.elementSprites) {
      const bounds = sprite.container.getBounds();

      if (bounds.contains(worldPoint.x, worldPoint.y)) {
        clickedElement = sprite.element;
        break;
      }
    }

    if (clickedElement) {
      // 选中元素
      this.selectElement(clickedElement);

      // 开始拖动
      this.isDragging = true;
      this.dragStartX = worldPoint.x;
      this.dragStartY = worldPoint.y;
      this.dragElementStartX = clickedElement.x;
      this.dragElementStartY = clickedElement.y;
    } else {
      // 取消选中
      this.selectElement(null);
    }
  }

  private handlePlaceClick(worldPoint: Phaser.Math.Vector2) {
    if (!this.previewElementType) return;

    // 🔥 检查是否点击了已有元素，如果是则选中它而不是放置新元素
    for (const [id, sprite] of this.elementSprites) {
      const bounds = sprite.container.getBounds();
      if (bounds.contains(worldPoint.x, worldPoint.y)) {
        // 点击了已有元素，切换到选择模式并选中它
        this.setTool('select');
        useEditorStore.getState().setTool('select');
        this.selectElement(sprite.element);
        return;
      }
    }

    // 特殊处理终点
    if (this.previewElementType === 'goal') {
      this.setGoal(worldPoint.x, worldPoint.y);
    } else {
      // 放置普通元素
      this.placeElement(this.previewElementType, worldPoint.x, worldPoint.y);
    }
  }

  private handleDeleteClick(worldPoint: Phaser.Math.Vector2) {
    // 查找点击的元素
    for (const [id, sprite] of this.elementSprites) {
      const bounds = sprite.container.getBounds();

      if (bounds.contains(worldPoint.x, worldPoint.y)) {
        this.deleteElement(sprite.element);
        break;
      }
    }
  }

  private handleKeyboardShortcuts() {
    if (!this.input.keyboard) return;

    // Delete键删除选中元素
    if (Phaser.Input.Keyboard.JustDown(this.deleteKey)) {
      if (this.selectedElementId) {
        const sprite = this.elementSprites.get(this.selectedElementId);
        if (sprite) {
          // 发送删除确认事件
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('editor-confirm-delete', {
              detail: { elementId: this.selectedElementId },
            }));
          }
        }
      }
    }

    // Ctrl+Z 撤销
    if (this.ctrlKey?.isDown && Phaser.Input.Keyboard.JustDown(this.zKey)) {
      useEditorStore.getState().undo();
      this.refreshElements();
    }

    // Ctrl+Y 重做
    if (this.ctrlKey?.isDown && Phaser.Input.Keyboard.JustDown(this.yKey)) {
      useEditorStore.getState().redo();
      this.refreshElements();
    }
  }

  /** 刷新所有元素（撤销/重做后调用） */
  private refreshElements() {
    // 🔥 v2.4.5: 安全检查 - 确保场景已初始化
    if (!this.add) {
      debugLog('[LevelEditorScene] Scene not ready, skipping refreshElements');
      return;
    }

    // 清除所有现有精灵
    for (const [id, sprite] of this.elementSprites) {
      if (sprite.selectionRect) {
        sprite.selectionRect.destroy();
      }
      sprite.container.destroy();
    }
    this.elementSprites.clear();

    // 重新加载
    this.loadElementsFromStore();

    // 恢复选中状态
    const editorState = useEditorStore.getState();
    if (editorState.selectedElementId) {
      this.updateSelection(editorState.selectedElementId);
    }
  }

  // ==================== 数据导出 ====================

  /** 导出关卡数据 */
  public exportLevelData(): CustomLevelData {
    return useEditorStore.getState().exportToJSON();
  }

  /** 导入关卡数据 */
  public importLevelData(data: CustomLevelData) {
    // 🔥 v2.4.5: 安全检查 - 确保场景已初始化
    if (!this.physics || !this.physics.world) {
      debugLog('[LevelEditorScene] Physics world not ready, skipping importLevelData');
      return;
    }

    if (!this.add || !this.tweens) {
      debugLog('[LevelEditorScene] Scene not fully initialized, skipping importLevelData');
      return;
    }

    useEditorStore.getState().importFromJSON(data);

    // 更新地图尺寸
    this.mapWidth = data.mapWidth;
    this.mapHeight = data.mapHeight;

    // 重新设置世界边界
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    // 重绘网格
    this.drawGrid();

    // 刷新元素
    this.refreshElements();

    // 更新起点
    if (this.playerStartMarker) {
      this.playerStartMarker.setPosition(data.playerStart.x, data.playerStart.y);
    }

    // 更新终点
    if (data.goal) {
      this.createGoalMarker(data.goal.x, data.goal.y);
    } else if (this.goalMarker) {
      this.goalMarker.destroy();
      this.goalMarker = null;
    }
  }

  // ==================== 公共方法 ====================

  /** 获取当前缩放级别 */
  public getZoomLevel(): number {
    return this.zoomLevel;
  }

  /** 获取网格大小 */
  public getGridSize(): number {
    return this.gridSize;
  }

  /** 获取网格是否可见 */
  public isGridVisible(): boolean {
    return this.gridVisible;
  }

  /** 确认删除选中元素 */
  public confirmDeleteSelected() {
    if (this.selectedElementId) {
      const sprite = this.elementSprites.get(this.selectedElementId);
      if (sprite) {
        this.deleteElement(sprite.element);
      }
    }
  }
}

export default LevelEditorScene;
