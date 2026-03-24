/**
 * 创意工坊编辑器状态管理
 * Requirements: 13.1, 13.2, 13.3
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import { getApiBaseUrl } from '@/lib/config/api';
import { publishLevel as apiPublishLevel, unpublishLevel as apiUnpublishLevel } from '@/lib/api/community';
import {
  EditorElement,
  CustomLevelData,
  CustomQuestion,
  EditorTool,
  LevelMeta,
  Position,
  EditorSnapshot,
  Difficulty,
  // serializeLevelData, // Unused
  // deserializeLevelData, // Unused
  isValidMapDimensions,
  validateLevelForTesting,
  LevelValidationResult,
} from '@/types/editor';

// 生产环境禁用调试日志
// 只在真正的本地开发环境输出调试日志
const isLocalDev = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  : process.env.NODE_ENV === 'development';
const debugLog = isLocalDev ? console.log.bind(console) : () => {};

// ==================== 常量 ====================

const MAX_UNDO_STACK_SIZE = 50;
// const AUTO_SAVE_INTERVAL = 30000; // 30秒 - Unused
const LOCAL_STORAGE_KEY = 'editor-autosave';

// 优化常量 - Requirements: 13.1
const SNAPSHOT_COMPRESSION_THRESHOLD = 100; // 元素数量超过此值时启用压缩
const MAX_SNAPSHOT_SIZE_BYTES = 1024 * 1024; // 1MB 最大快照大小

// 🔒 安全常量 - 防止资源耗尽攻击
const MAX_ELEMENTS_PER_LEVEL = 500;  // 单个关卡最大元素数量
const MAX_QUESTIONS_PER_LEVEL = 100; // 单个关卡最大题目数量
const SAVE_COOLDOWN_MS = 3000;       // 保存冷却时间（毫秒）

// ==================== 状态接口 ====================

export interface EditorState {
  // 关卡元数据
  levelId: string | null;
  levelName: string;
  levelDescription: string;
  difficulty: Difficulty;
  mapWidth: number;
  mapHeight: number;
  
  // 元素数据
  elements: EditorElement[];
  playerStart: Position;
  goal: Position | null;
  questions: CustomQuestion[];
  
  // 编辑状态
  selectedElementId: string | null;
  currentTool: EditorTool;
  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];
  isDirty: boolean;
  
  // 学生友好功能
  isSimpleMode: boolean;
  showTutorial: boolean;
  tutorialStep: number;
  lastAutoSaveTime: number;
  autoSaveEnabled: boolean;
  
  // 测试模式状态 (Requirements: 10.2, 10.3, 10.4)
  isTestMode: boolean;
  testModeSnapshot: EditorSnapshot | null;  // 进入测试模式前的状态快照
  
  // 同步状态
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  lastSaveTime: number;  // 🔒 保存冷却时间追踪
  
  // 社区发布状态 (Requirements: 1.1, 1.4)
  isPublished: boolean;
  publishedAt: string | null;
  isPublishing: boolean;
}

// ==================== Actions 接口 ====================

export interface EditorActions {
  // 关卡元数据操作
  setLevelMeta: (meta: Partial<LevelMeta>) => void;
  setLevelId: (id: string | null) => void;
  
  // 元素操作
  addElement: (element: EditorElement) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  
  // 起点/终点操作
  setPlayerStart: (position: Position) => void;
  setGoal: (position: Position | null) => void;
  
  // 题目操作
  addQuestion: (question: CustomQuestion) => void;
  updateQuestion: (id: string, updates: Partial<CustomQuestion>) => void;
  removeQuestion: (id: string) => void;
  
  // 工具操作
  setTool: (tool: EditorTool) => void;
  
  // 撤销/重做
  undo: () => void;
  redo: () => void;
  pushToUndoStack: () => void;
  clearHistory: () => void;
  
  // 云端同步
  saveToCloud: () => Promise<boolean>;
  loadFromCloud: (levelId: string) => Promise<boolean>;
  
  // 导入/导出
  exportToJSON: () => CustomLevelData;
  importFromJSON: (data: CustomLevelData) => void;
  
  // 学生友好功能
  toggleSimpleMode: () => void;
  nextTutorialStep: () => void;
  skipTutorial: () => void;
  
  // 自动保存
  autoSave: () => void;
  loadAutoSave: () => boolean;
  clearAutoSave: () => void;
  
  // 模板
  loadTemplate: (templateData: CustomLevelData) => void;
  
  // 测试模式 (Requirements: 10.1, 10.2, 10.3, 10.4, 10.5)
  validateLevel: () => LevelValidationResult;
  enterTestMode: () => boolean;
  exitTestMode: () => void;
  
  // 重置
  reset: () => void;
  clearError: () => void;
  
  // 社区发布 (Requirements: 1.1, 1.4)
  publishLevel: () => Promise<boolean>;
  unpublishLevel: () => Promise<boolean>;
  setPublishState: (isPublished: boolean, publishedAt: string | null) => void;
}

// ==================== 初始状态 ====================

// 🔥 创意工坊：默认示例题库（每种类型5道题）
const defaultQuestions: CustomQuestion[] = [
  // 选择题示例
  {
    id: 'default-choice-1',
    type: 'choice',
    question: '1 + 1 等于多少？',
    options: ['1', '2', '3', '4'],
    answer: '2',
    explanation: '1加1等于2，这是最基础的加法运算。',
    difficulty: 1,
  },
  {
    id: 'default-choice-2',
    type: 'choice',
    question: '太阳从哪个方向升起？',
    options: ['东方', '西方', '南方', '北方'],
    answer: '东方',
    explanation: '太阳每天从东方升起，从西方落下。',
    difficulty: 1,
  },
  {
    id: 'default-choice-3',
    type: 'choice',
    question: '一年有多少个月？',
    options: ['10个月', '11个月', '12个月', '13个月'],
    answer: '12个月',
    explanation: '一年有12个月，从1月到12月。',
    difficulty: 1,
  },
  {
    id: 'default-choice-4',
    type: 'choice',
    question: '水的化学式是什么？',
    options: ['H2O', 'CO2', 'O2', 'N2'],
    answer: 'H2O',
    explanation: '水由两个氢原子和一个氧原子组成，化学式为H2O。',
    difficulty: 2,
  },
  {
    id: 'default-choice-5',
    type: 'choice',
    question: '中国的首都是哪里？',
    options: ['上海', '北京', '广州', '深圳'],
    answer: '北京',
    explanation: '北京是中华人民共和国的首都。',
    difficulty: 1,
  },
  // 填空题示例
  {
    id: 'default-fill-1',
    type: 'fill',
    question: '2 × 3 = ___',
    answer: '6',
    explanation: '2乘以3等于6。',
    difficulty: 1,
  },
  {
    id: 'default-fill-2',
    type: 'fill',
    question: '一周有___天',
    answer: '7',
    explanation: '一周有7天，从周一到周日。',
    difficulty: 1,
  },
  {
    id: 'default-fill-3',
    type: 'fill',
    question: '地球绕太阳转一圈需要___年',
    answer: '1',
    explanation: '地球绕太阳公转一周需要一年时间。',
    difficulty: 2,
  },
  {
    id: 'default-fill-4',
    type: 'fill',
    question: '三角形有___条边',
    answer: '3',
    explanation: '三角形由三条边组成。',
    difficulty: 1,
  },
  {
    id: 'default-fill-5',
    type: 'fill',
    question: '100 ÷ 10 = ___',
    answer: '10',
    explanation: '100除以10等于10。',
    difficulty: 1,
  },
];

const initialState: EditorState = {
  levelId: null,
  levelName: '未命名关卡',
  levelDescription: '',
  difficulty: 1,
  mapWidth: 800,
  mapHeight: 600,
  
  elements: [],
  playerStart: { x: 100, y: 500 },
  goal: null,
  questions: [...defaultQuestions],  // 🔥 使用默认示例题库
  
  selectedElementId: null,
  currentTool: 'select',
  undoStack: [],
  redoStack: [],
  isDirty: false,
  
  isSimpleMode: true,
  showTutorial: true,
  tutorialStep: 0,
  lastAutoSaveTime: 0,
  autoSaveEnabled: true,
  
  // 测试模式状态
  isTestMode: false,
  testModeSnapshot: null,
  
  isSaving: false,
  isLoading: false,
  error: null,
  lastSaveTime: 0,  // 🔒 保存冷却时间追踪
  
  // 社区发布状态
  isPublished: false,
  publishedAt: null,
  isPublishing: false,
};

// ==================== 辅助函数 ====================

/** 
 * 创建当前状态的快照
 * 优化：使用结构化克隆代替JSON序列化（更快）
 */
function createSnapshot(state: EditorState): EditorSnapshot {
  // 使用结构化克隆（比JSON.parse/stringify更快）
  try {
    return {
      elements: structuredClone(state.elements),
      playerStart: { ...state.playerStart },
      goal: state.goal ? { ...state.goal } : null,
      questions: structuredClone(state.questions),
    };
  } catch {
    // 回退到JSON方式（兼容性）
    return {
      elements: JSON.parse(JSON.stringify(state.elements)),
      playerStart: { ...state.playerStart },
      goal: state.goal ? { ...state.goal } : null,
      questions: JSON.parse(JSON.stringify(state.questions)),
    };
  }
}

/** 
 * 从快照恢复状态
 * 优化：使用结构化克隆
 */
function restoreFromSnapshot(snapshot: EditorSnapshot): Partial<EditorState> {
  try {
    return {
      elements: structuredClone(snapshot.elements),
      playerStart: { ...snapshot.playerStart },
      goal: snapshot.goal ? { ...snapshot.goal } : null,
      questions: structuredClone(snapshot.questions),
    };
  } catch {
    return {
      elements: JSON.parse(JSON.stringify(snapshot.elements)),
      playerStart: { ...snapshot.playerStart },
      goal: snapshot.goal ? { ...snapshot.goal } : null,
      questions: JSON.parse(JSON.stringify(snapshot.questions)),
    };
  }
}

/** 
 * 🔒 安全：生成唯一ID（使用crypto API防止碰撞）
 * 使用 crypto.randomUUID() 或回退到更安全的随机生成
 * Currently unused but kept for future use
 */
function generateId(): string {
  // 优先使用 crypto.randomUUID()（浏览器原生支持）
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 回退方案：使用 crypto.getRandomValues 生成更安全的随机数
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    // 转换为UUID格式
    const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  
  // 最后回退：时间戳 + 多个随机数（降低碰撞概率）
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substr(2, 9);
  const random2 = Math.random().toString(36).substr(2, 9);
  return `${timestamp}-${random1}-${random2}`;
}

/**
 * 🔒 安全：简单的数据混淆（Base64编码）
 * 注意：这不是真正的加密，只是防止直接查看
 * 对于真正的敏感数据，应该使用服务端存储
 */
function obfuscateData(data: string): string {
  try {
    // 使用 Base64 编码
    if (typeof btoa !== 'undefined') {
      return btoa(encodeURIComponent(data));
    }
    return data;
  } catch {
    return data;
  }
}

/**
 * 🔒 安全：解除数据混淆
 */
function deobfuscateData(data: string): string {
  try {
    // 尝试 Base64 解码
    if (typeof atob !== 'undefined') {
      return decodeURIComponent(atob(data));
    }
    return data;
  } catch {
    // 如果解码失败，可能是旧格式的数据，直接返回
    return data;
  }
}

/**
 * 估算快照大小（字节）
 * 用于内存优化决策
 */
function estimateSnapshotSize(snapshot: EditorSnapshot): number {
  // 粗略估算：每个元素约200字节，每个问题约500字节
  const elementsSize = snapshot.elements.length * 200;
  const questionsSize = snapshot.questions.length * 500;
  const baseSize = 100; // 基础字段
  return elementsSize + questionsSize + baseSize;
}

/**
 * 清理过大的撤销栈
 * 当内存使用过高时，移除最旧的快照
 */
function trimUndoStack(stack: EditorSnapshot[], maxSize: number): EditorSnapshot[] {
  if (stack.length <= maxSize) return stack;
  
  // 计算总大小
  let totalSize = 0;
  const trimmedStack: EditorSnapshot[] = [];
  
  // 从最新的开始保留，直到达到大小限制
  for (let i = stack.length - 1; i >= 0 && trimmedStack.length < maxSize; i--) {
    const snapshot = stack[i];
    const size = estimateSnapshotSize(snapshot);
    
    if (totalSize + size <= MAX_SNAPSHOT_SIZE_BYTES || trimmedStack.length === 0) {
      trimmedStack.unshift(snapshot);
      totalSize += size;
    } else {
      break;
    }
  }
  
  if (trimmedStack.length < stack.length) {
    debugLog(`[EditorStore] Trimmed undo stack from ${stack.length} to ${trimmedStack.length} snapshots`);
  }
  
  return trimmedStack;
}

/**
 * 浅比较两个对象是否相等
 * 用于减少不必要的状态更新
 * Currently unused but kept for future use
 */
function shallowEqual<T extends Record<string, unknown>>(obj1: T, obj2: T): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}

// ==================== Store 定义 ====================

export const useEditorStore = create<EditorState & EditorActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ==================== 关卡元数据操作 ====================
      
      setLevelMeta: (meta: Partial<LevelMeta>) => {
        const updates: Partial<EditorState> = {};
        
        if (meta.name !== undefined) updates.levelName = meta.name;
        if (meta.description !== undefined) updates.levelDescription = meta.description;
        if (meta.difficulty !== undefined) updates.difficulty = meta.difficulty;
        
        if (meta.mapWidth !== undefined && meta.mapHeight !== undefined) {
          if (isValidMapDimensions(meta.mapWidth, meta.mapHeight)) {
            updates.mapWidth = meta.mapWidth;
            updates.mapHeight = meta.mapHeight;
          }
        } else if (meta.mapWidth !== undefined) {
          if (isValidMapDimensions(meta.mapWidth, get().mapHeight)) {
            updates.mapWidth = meta.mapWidth;
          }
        } else if (meta.mapHeight !== undefined) {
          if (isValidMapDimensions(get().mapWidth, meta.mapHeight)) {
            updates.mapHeight = meta.mapHeight;
          }
        }
        
        set({ ...updates, isDirty: true });
      },
      
      setLevelId: (id: string | null) => {
        set({ levelId: id });
      },

      // ==================== 元素操作 ====================
      
      addElement: (element: EditorElement) => {
        const state = get();
        
        // 🔒 安全检查：元素数量限制
        if (state.elements.length >= MAX_ELEMENTS_PER_LEVEL) {
          set({ error: `元素数量已达上限 (${MAX_ELEMENTS_PER_LEVEL} 个)，请删除一些元素后再添加` });
          return;
        }
        
        get().pushToUndoStack();
        set((state) => ({
          elements: [...state.elements, element],
          isDirty: true,
          redoStack: [], // 清空重做栈
          error: null,
        }));
      },
      
      updateElement: (id: string, updates: Partial<EditorElement>) => {
        const state = get();
        const element = state.elements.find(el => el.id === id);
        
        // 优化：检查是否有实际变化，避免不必要的更新
        if (element) {
          let hasChanges = false;
          for (const key of Object.keys(updates) as (keyof EditorElement)[]) {
            if (key === 'config') {
              // 配置对象需要深度比较
              if (JSON.stringify(element.config) !== JSON.stringify(updates.config)) {
                hasChanges = true;
                break;
              }
            } else if (element[key] !== updates[key]) {
              hasChanges = true;
              break;
            }
          }
          
          if (!hasChanges) {
            debugLog('[EditorStore] Skipping updateElement - no changes detected');
            return;
          }
        }
        
        get().pushToUndoStack();
        set((state) => ({
          elements: state.elements.map((el) =>
            el.id === id ? { ...el, ...updates } : el
          ),
          isDirty: true,
          redoStack: [],
        }));
      },
      
      removeElement: (id: string) => {
        get().pushToUndoStack();
        set((state) => ({
          elements: state.elements.filter((el) => el.id !== id),
          selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
          isDirty: true,
          redoStack: [],
        }));
      },
      
      selectElement: (id: string | null) => {
        set({ selectedElementId: id });
      },

      // ==================== 起点/终点操作 ====================
      
      setPlayerStart: (position: Position) => {
        get().pushToUndoStack();
        set({
          playerStart: position,
          isDirty: true,
          redoStack: [],
        });
      },
      
      setGoal: (position: Position | null) => {
        get().pushToUndoStack();
        set({
          goal: position,
          isDirty: true,
          redoStack: [],
        });
      },

      // ==================== 题目操作 ====================
      
      addQuestion: (question: CustomQuestion) => {
        const state = get();
        
        // 🔒 安全检查：题目数量限制
        if (state.questions.length >= MAX_QUESTIONS_PER_LEVEL) {
          set({ error: `题目数量已达上限 (${MAX_QUESTIONS_PER_LEVEL} 道)，请删除一些题目后再添加` });
          return;
        }
        
        get().pushToUndoStack();
        set((state) => ({
          questions: [...state.questions, question],
          isDirty: true,
          redoStack: [],
          error: null,
        }));
      },
      
      updateQuestion: (id: string, updates: Partial<CustomQuestion>) => {
        get().pushToUndoStack();
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, ...updates } : q
          ),
          isDirty: true,
          redoStack: [],
        }));
      },
      
      removeQuestion: (id: string) => {
        get().pushToUndoStack();
        set((state) => ({
          questions: state.questions.filter((q) => q.id !== id),
          isDirty: true,
          redoStack: [],
        }));
      },

      // ==================== 工具操作 ====================
      
      setTool: (tool: EditorTool) => {
        set({ currentTool: tool });
      },

      // ==================== 撤销/重做 ====================
      
      pushToUndoStack: () => {
        const state = get();
        const snapshot = createSnapshot(state);
        
        set((state) => {
          let newUndoStack = [...state.undoStack, snapshot];
          
          // 限制撤销栈大小
          if (newUndoStack.length > MAX_UNDO_STACK_SIZE) {
            newUndoStack.shift();
          }
          
          // 内存优化：当元素较多时，进一步限制栈大小
          if (state.elements.length > SNAPSHOT_COMPRESSION_THRESHOLD) {
            newUndoStack = trimUndoStack(newUndoStack, MAX_UNDO_STACK_SIZE);
          }
          
          return { undoStack: newUndoStack };
        });
      },
      
      undo: () => {
        const state = get();
        if (state.undoStack.length === 0) return;
        
        // 保存当前状态到重做栈
        const currentSnapshot = createSnapshot(state);
        const newUndoStack = [...state.undoStack];
        const previousSnapshot = newUndoStack.pop()!;
        
        set({
          ...restoreFromSnapshot(previousSnapshot),
          undoStack: newUndoStack,
          redoStack: [...state.redoStack, currentSnapshot],
          isDirty: true,
        });
      },
      
      redo: () => {
        const state = get();
        if (state.redoStack.length === 0) return;
        
        // 保存当前状态到撤销栈
        const currentSnapshot = createSnapshot(state);
        const newRedoStack = [...state.redoStack];
        const nextSnapshot = newRedoStack.pop()!;
        
        set({
          ...restoreFromSnapshot(nextSnapshot),
          undoStack: [...state.undoStack, currentSnapshot],
          redoStack: newRedoStack,
          isDirty: true,
        });
      },
      
      clearHistory: () => {
        set({ undoStack: [], redoStack: [] });
      },

      // ==================== 云端同步 ====================
      
      saveToCloud: async () => {
        const state = get();
        const { token, isAuthenticated, user } = useAuthStore.getState();
        
        if (!isAuthenticated || !token || !user) {
          set({ error: '请先登录' });
          return false;
        }
        
        // 🔒 安全检查：保存冷却时间
        const now = Date.now();
        if (now - state.lastSaveTime < SAVE_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((SAVE_COOLDOWN_MS - (now - state.lastSaveTime)) / 1000);
          set({ error: `请等待 ${remainingSeconds} 秒后再保存` });
          return false;
        }
        
        // 验证关卡数据
        if (!state.goal) {
          set({ error: '请设置关卡终点' });
          return false;
        }
        
        // 🔒 安全检查：元素数量
        if (state.elements.length > MAX_ELEMENTS_PER_LEVEL) {
          set({ error: `元素数量超过限制 (${MAX_ELEMENTS_PER_LEVEL} 个)` });
          return false;
        }
        
        // 🔒 安全检查：题目数量
        if (state.questions.length > MAX_QUESTIONS_PER_LEVEL) {
          set({ error: `题目数量超过限制 (${MAX_QUESTIONS_PER_LEVEL} 道)` });
          return false;
        }
        
        set({ isSaving: true, error: null, lastSaveTime: now });
        
        try {
          const levelData = get().exportToJSON();
          const baseUrl = getApiBaseUrl();
          
          const requestBody = {
            name: state.levelName,
            description: state.levelDescription,
            difficulty: state.difficulty,
            map_width: state.mapWidth,
            map_height: state.mapHeight,
            level_data: levelData,
          };
          
          let response: Response;
          
          if (state.levelId) {
            // 更新现有关卡
            response = await fetch(`${baseUrl}/custom-levels/${state.levelId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(requestBody),
            });
          } else {
            // 创建新关卡
            response = await fetch(`${baseUrl}/custom-levels`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(requestBody),
            });
          }
          
          // 🔒 检测 token 过期
          if (response.status === 401) {
            useAuthStore.getState().handleTokenExpired();
            throw new Error('登录已过期，请重新登录');
          }
          
          if (!response.ok) {
            const error = await response.json();
            // 🔒 处理 Pydantic 验证错误（422 返回的 detail 可能是数组）
            let errorMessage = '保存失败';
            if (error.detail) {
              if (typeof error.detail === 'string') {
                errorMessage = error.detail;
              } else if (Array.isArray(error.detail)) {
                // Pydantic 验证错误格式: [{loc: [...], msg: '...', type: '...'}]
                errorMessage = error.detail.map((e: { msg?: string; message?: string }) => e.msg || e.message || JSON.stringify(e)).join('; ');
              } else if (typeof error.detail === 'object') {
                errorMessage = JSON.stringify(error.detail);
              }
            }
            throw new Error(errorMessage);
          }
          
          const data = await response.json();
          
          set({
            levelId: data.id,
            isDirty: false,
            isSaving: false,
          });
          
          // 清除自动保存
          get().clearAutoSave();
          
          debugLog('[EditorStore] Level saved to cloud:', data.id);
          return true;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : '保存失败';
          console.error('[EditorStore] Save failed:', error);
          set({ error: message, isSaving: false });
          return false;
        }
      },
      
      loadFromCloud: async (levelId: string) => {
        const { token, isAuthenticated } = useAuthStore.getState();
        
        if (!isAuthenticated || !token) {
          set({ error: '请先登录后再加载关卡' });
          return false;
        }
        
        // 🔥 v2.4.1: 离线检测
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          set({ error: '网络已断开，请检查网络连接后重试' });
          return false;
        }
        
        set({ isLoading: true, error: null });
        
        // 🔥 v2.4.6: 增强的带超时和重试的请求函数
        const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒超时
          
          try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
          } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
              if (retries > 0) {
                debugLog(`[EditorStore] Request timeout, retrying... (${retries} left)`);
                await new Promise(r => setTimeout(r, 1500)); // 等待1.5秒后重试
                return fetchWithRetry(url, options, retries - 1);
              }
              throw new Error('网络请求超时，请检查网络后刷新页面重试');
            }
            // 🔥 v2.4.6: 处理网络错误
            if (err instanceof TypeError && err.message.includes('fetch')) {
              if (retries > 0) {
                debugLog(`[EditorStore] Network error, retrying... (${retries} left)`);
                await new Promise(r => setTimeout(r, 2000)); // 等待2秒后重试
                return fetchWithRetry(url, options, retries - 1);
              }
              throw new Error('网络连接失败，请检查网络后刷新页面重试');
            }
            if (retries > 0) {
              debugLog(`[EditorStore] Retrying... (${retries} left)`);
              await new Promise(r => setTimeout(r, 1000)); // 等待1秒后重试
              return fetchWithRetry(url, options, retries - 1);
            }
            throw err;
          }
        };
        
        try {
          const baseUrl = getApiBaseUrl();
          debugLog('[EditorStore] Loading level from cloud:', levelId);
          
          const response = await fetchWithRetry(`${baseUrl}/custom-levels/${levelId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          // 🔒 检测 token 过期
          if (response.status === 401) {
            useAuthStore.getState().handleTokenExpired();
            throw new Error('登录已过期，请刷新页面重新登录');
          }
          
          if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: null }));
            // 🔥 v2.4.6: 更友好的错误提示
            let errorMessage = '加载关卡失败，请刷新页面重试';
            if (response.status === 404) {
              errorMessage = '关卡不存在或已被删除';
            } else if (response.status === 403) {
              errorMessage = '没有权限访问此关卡';
            } else if (response.status === 429) {
              errorMessage = '请求过于频繁，请稍后再试';
            } else if (response.status >= 500) {
              errorMessage = '服务器繁忙，请稍后刷新页面重试';
            } else if (error.detail) {
              if (typeof error.detail === 'string') {
                // 🔥 过滤技术性错误信息
                if (error.detail.includes('cannot') || error.detail.includes('undefined') || error.detail.includes('null')) {
                  errorMessage = '加载关卡时出错，请刷新页面重试';
                } else {
                  errorMessage = error.detail;
                }
              } else if (Array.isArray(error.detail)) {
                errorMessage = error.detail.map((e: { msg?: string; message?: string }) => e.msg || e.message || '').filter(Boolean).join('; ') || '加载关卡失败';
              }
            }
            throw new Error(errorMessage);
          }
          
          // 🔥 v2.4.6: 安全解析响应数据
          let data;
          try {
            data = await response.json();
          } catch (parseError) {
            console.error('[EditorStore] JSON parse error:', parseError);
            throw new Error('服务器返回数据格式错误，请刷新页面重试');
          }
          
          debugLog('[EditorStore] Loaded data:', data);
          
          // 🔥 修复：先清除历史，然后直接设置所有状态
          // 不使用 importFromJSON，因为它会用 level_data.name 覆盖数据库中的 name
          get().clearHistory();
          
          // 从 level_data 中提取元素数据
          const levelData = data.level_data;
          
          // 🔒 v2.4.6: 增强安全检查
          if (!levelData) {
            throw new Error('关卡数据为空，可能已损坏');
          }
          
          if (!data.id) {
            throw new Error('关卡ID无效，请刷新页面重试');
          }
          
          set({
            // 使用数据库中的元数据（这些是最新的）
            levelId: data.id,
            levelName: data.name || '未命名关卡',  // 🔥 v2.4.6: 添加默认值
            levelDescription: data.description || '',
            difficulty: data.difficulty || 1,
            mapWidth: data.map_width || 800,
            mapHeight: data.map_height || 600,
            // 从 level_data 中提取关卡内容
            playerStart: levelData.playerStart || { x: 100, y: 400 },
            goal: levelData.goal || null,
            elements: Array.isArray(levelData.elements) ? levelData.elements : [],
            // 🔥 如果关卡没有题目，使用默认题库
            questions: (Array.isArray(levelData.questions) && levelData.questions.length > 0) 
              ? levelData.questions 
              : [...defaultQuestions],
            // 重置状态
            isDirty: false,
            isLoading: false,
            selectedElementId: null,
            error: null,  // 🔥 v2.4.6: 清除之前的错误
            // 🔥 社区发布状态
            isPublished: data.is_published || false,
            publishedAt: data.published_at || null,
          });
          
          debugLog('[EditorStore] Level loaded from cloud:', levelId, 'name:', data.name, 'isPublished:', data.is_published);
          return true;
        } catch (error: unknown) {
          // 🔥 v2.4.6: 更友好的错误处理
          let message = '加载失败，请刷新页面重试';
          if (error instanceof Error) {
            // 过滤技术性错误信息
            if (error.message.includes('cannot') || error.message.includes('undefined') || 
                error.message.includes('null') || error.message.includes('TypeError')) {
              message = '加载关卡时出错，请刷新页面重试';
            } else {
              message = error.message;
            }
          }
          console.error('[EditorStore] Load failed:', error);
          set({ error: message, isLoading: false });
          return false;
        }
      },

      // ==================== 导入/导出 ====================
      
      exportToJSON: (): CustomLevelData => {
        const state = get();
        const { user } = useAuthStore.getState();
        
        return {
          id: state.levelId || undefined,
          name: state.levelName,
          description: state.levelDescription,
          difficulty: state.difficulty,
          authorId: user?.id?.toString() || 'anonymous',
          authorName: user?.username || '匿名',
          mapWidth: state.mapWidth,
          mapHeight: state.mapHeight,
          playerStart: state.playerStart,
          goal: state.goal,
          elements: state.elements,
          questions: state.questions,
        };
      },
      
      importFromJSON: (data: CustomLevelData) => {
        get().clearHistory();
        
        set({
          levelId: data.id || null,
          levelName: data.name,
          levelDescription: data.description,
          difficulty: data.difficulty,
          mapWidth: data.mapWidth,
          mapHeight: data.mapHeight,
          playerStart: data.playerStart,
          goal: data.goal,
          elements: data.elements,
          // 🔥 如果导入的数据没有题目，使用默认题库
          questions: (data.questions && data.questions.length > 0) 
            ? data.questions 
            : [...defaultQuestions],
          isDirty: false,
          selectedElementId: null,
        });
      },

      // ==================== 学生友好功能 ====================
      
      toggleSimpleMode: () => {
        set((state) => ({ isSimpleMode: !state.isSimpleMode }));
      },
      
      nextTutorialStep: () => {
        set((state) => ({ tutorialStep: state.tutorialStep + 1 }));
      },
      
      skipTutorial: () => {
        set({ showTutorial: false, tutorialStep: 0 });
      },

      // ==================== 自动保存 ====================
      
      autoSave: () => {
        const state = get();
        if (!state.autoSaveEnabled || !state.isDirty) return;
        
        try {
          const levelData = get().exportToJSON();
          const saveData = {
            levelData,
            timestamp: Date.now(),
            version: 2, // 🔒 版本标记，用于识别混淆格式
          };
          // 🔒 安全：使用混淆存储
          const jsonStr = JSON.stringify(saveData);
          const obfuscated = obfuscateData(jsonStr);
          localStorage.setItem(LOCAL_STORAGE_KEY, obfuscated);
          set({ lastAutoSaveTime: Date.now() });
          debugLog('[EditorStore] Auto-saved to localStorage (obfuscated)');
        } catch (error) {
          console.error('[EditorStore] Auto-save failed:', error);
        }
      },
      
      loadAutoSave: (): boolean => {
        try {
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (!saved) return false;
          
          // 🔒 安全：尝试解除混淆
          let parsed;
          try {
            // 先尝试解除混淆（新格式）
            const deobfuscated = deobfuscateData(saved);
            parsed = JSON.parse(deobfuscated);
          } catch {
            // 回退到直接解析（旧格式兼容）
            parsed = JSON.parse(saved);
          }
          
          const { levelData, timestamp } = parsed;
          
          // 检查是否过期 (24小时)
          if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return false;
          }
          
          get().importFromJSON(levelData);
          set({ isDirty: true }); // 标记为需要保存
          debugLog('[EditorStore] Loaded auto-save from localStorage');
          return true;
        } catch (error) {
          console.error('[EditorStore] Load auto-save failed:', error);
          return false;
        }
      },
      
      clearAutoSave: () => {
        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (error) {
          console.error('[EditorStore] Clear auto-save failed:', error);
        }
      },

      // ==================== 模板 ====================
      
      loadTemplate: (templateData: CustomLevelData) => {
        debugLog('[EditorStore] Loading template:', templateData.name);
        get().clearHistory();
        
        // 🔥 直接设置状态，而不是通过 importFromJSON
        // 这样可以确保 levelId 被正确清除，isDirty 被正确设置
        set({
          levelId: null,  // 🔥 关键：清除 levelId，这样保存时会创建新关卡
          levelName: templateData.name,
          levelDescription: templateData.description || '',
          difficulty: templateData.difficulty,
          mapWidth: templateData.mapWidth,
          mapHeight: templateData.mapHeight,
          playerStart: templateData.playerStart,
          goal: templateData.goal,
          elements: JSON.parse(JSON.stringify(templateData.elements)),  // 深拷贝
          // 🔥 如果模板没有题目，使用默认题库
          questions: (templateData.questions && templateData.questions.length > 0) 
            ? JSON.parse(JSON.stringify(templateData.questions))  // 深拷贝
            : [...defaultQuestions],
          isDirty: true,  // 🔥 标记为需要保存
          selectedElementId: null,
          error: null,
          // 🔥 重置发布状态（模板是新关卡）
          isPublished: false,
          publishedAt: null,
        });
        
        debugLog('[EditorStore] Template loaded, levelId:', null, 'isDirty:', true);
      },

      // ==================== 测试模式 (Requirements: 10.1, 10.2, 10.3, 10.4, 10.5) ====================
      
      /**
       * 验证关卡是否满足测试要求
       * Requirements: 10.1, 7.4
       */
      validateLevel: (): LevelValidationResult => {
        const levelData = get().exportToJSON();
        return validateLevelForTesting(levelData);
      },
      
      /**
       * 进入测试模式
       * Requirements: 10.2, 10.3
       * - 保存当前编辑器状态快照
       * - 导出关卡数据用于测试
       */
      enterTestMode: (): boolean => {
        const state = get();
        
        // 验证关卡
        const validation = validateLevelForTesting(get().exportToJSON());
        if (!validation.valid) {
          set({ error: validation.errors.join('; ') });
          return false;
        }
        
        // 保存当前状态快照（用于退出测试模式时恢复）
        const snapshot: EditorSnapshot = {
          elements: JSON.parse(JSON.stringify(state.elements)),
          playerStart: { ...state.playerStart },
          goal: state.goal ? { ...state.goal } : null,
          questions: JSON.parse(JSON.stringify(state.questions)),
        };
        
        set({
          isTestMode: true,
          testModeSnapshot: snapshot,
        });
        
        debugLog('[EditorStore] Entered test mode, snapshot saved');
        return true;
      },
      
      /**
       * 退出测试模式
       * Requirements: 10.4, 10.5
       * - 恢复进入测试模式前的编辑器状态
       */
      exitTestMode: () => {
        const state = get();
        
        if (!state.isTestMode) {
          debugLog('[EditorStore] Not in test mode, nothing to exit');
          return;
        }
        
        // 恢复快照状态（如果有）
        if (state.testModeSnapshot) {
          set({
            elements: JSON.parse(JSON.stringify(state.testModeSnapshot.elements)),
            playerStart: { ...state.testModeSnapshot.playerStart },
            goal: state.testModeSnapshot.goal ? { ...state.testModeSnapshot.goal } : null,
            questions: JSON.parse(JSON.stringify(state.testModeSnapshot.questions)),
            isTestMode: false,
            testModeSnapshot: null,
          });
          debugLog('[EditorStore] Exited test mode, state restored from snapshot');
        } else {
          set({
            isTestMode: false,
            testModeSnapshot: null,
          });
          debugLog('[EditorStore] Exited test mode (no snapshot to restore)');
        }
      },

      // ==================== 社区发布 (Requirements: 1.1, 1.4) ====================
      
      /**
       * 发布关卡到社区
       * Requirements: 1.1 - 发布关卡
       */
      publishLevel: async (): Promise<boolean> => {
        const state = get();
        const { token, isAuthenticated } = useAuthStore.getState();
        
        if (!isAuthenticated || !token) {
          set({ error: '请先登录' });
          return false;
        }
        
        if (!state.levelId) {
          set({ error: '请先保存关卡' });
          return false;
        }
        
        if (state.isPublished) {
          set({ error: '关卡已发布' });
          return false;
        }
        
        set({ isPublishing: true, error: null });
        
        try {
          const result = await apiPublishLevel(state.levelId, token);
          
          set({
            isPublished: true,
            publishedAt: result.published_at,
            isPublishing: false,
          });
          
          debugLog('[EditorStore] Level published:', state.levelId);
          
          // 🍖 发放创意工坊发布奖励
          try {
            const { grantWorkshopPublishReward } = await import('@/lib/utils/foodRewards');
            const { showFoodRewardToast } = await import('@/components/ui/FoodRewardToast');
            await grantWorkshopPublishReward(showFoodRewardToast);
            debugLog('[EditorStore] 创意工坊发布食物奖励发放成功');
          } catch (error) {
            console.error('[EditorStore] 食物奖励发放失败:', error);
            // 奖励失败不影响发布流程
          }
          
          // 🪙 显示金币收益提示（创意工坊）
          try {
            const { showCoinRewardToast } = await import('@/components/ui/CoinRewardToast');
            // 显示提示：发布关卡后可以从游玩和点赞中获得金币
            showCoinRewardToast(
              0, // 发布时不直接给金币，只是提示
              '🎉 关卡已发布！玩家游玩(+5💰)和点赞(+20💰)时你将获得金币奖励',
              'reward'
            );
            debugLog('[EditorStore] 创意工坊金币提示显示成功');
          } catch (error) {
            console.error('[EditorStore] 金币提示显示失败:', error);
            // 提示失败不影响发布流程
          }
          
          return true;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : '发布失败';
          
          // 处理登录过期
          if (message === 'LOGIN_EXPIRED') {
            useAuthStore.getState().handleTokenExpired();
            set({ error: '登录已过期，请重新登录', isPublishing: false });
          } else {
            set({ error: message, isPublishing: false });
          }
          
          return false;
        }
      },
      
      /**
       * 取消发布关卡
       * Requirements: 1.5 - 取消发布
       */
      unpublishLevel: async (): Promise<boolean> => {
        const state = get();
        const { token, isAuthenticated } = useAuthStore.getState();
        
        if (!isAuthenticated || !token) {
          set({ error: '请先登录' });
          return false;
        }
        
        if (!state.levelId) {
          set({ error: '关卡不存在' });
          return false;
        }
        
        if (!state.isPublished) {
          set({ error: '关卡未发布' });
          return false;
        }
        
        set({ isPublishing: true, error: null });
        
        try {
          await apiUnpublishLevel(state.levelId, token);
          
          set({
            isPublished: false,
            publishedAt: null,
            isPublishing: false,
          });
          
          debugLog('[EditorStore] Level unpublished:', state.levelId);
          return true;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : '取消发布失败';
          
          // 处理登录过期
          if (message === 'LOGIN_EXPIRED') {
            useAuthStore.getState().handleTokenExpired();
            set({ error: '登录已过期，请重新登录', isPublishing: false });
          } else {
            set({ error: message, isPublishing: false });
          }
          
          return false;
        }
      },
      
      /**
       * 设置发布状态（从云端加载时使用）
       */
      setPublishState: (isPublished: boolean, publishedAt: string | null) => {
        set({ isPublished, publishedAt });
      },

      // ==================== 重置 ====================
      
      reset: () => {
        set(initialState);
      },
      
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({
        isSimpleMode: state.isSimpleMode,
        showTutorial: state.showTutorial,
        autoSaveEnabled: state.autoSaveEnabled,
      }),
    }
  )
);

// ==================== 辅助函数导出 ====================

/** 检查是否可以撤销 */
export function canUndo(): boolean {
  return useEditorStore.getState().undoStack.length > 0;
}

/** 检查是否可以重做 */
export function canRedo(): boolean {
  return useEditorStore.getState().redoStack.length > 0;
}

/** 获取撤销栈大小 */
export function getUndoStackSize(): number {
  return useEditorStore.getState().undoStack.length;
}

/** 获取重做栈大小 */
export function getRedoStackSize(): number {
  return useEditorStore.getState().redoStack.length;
}

/** 验证关卡是否可以保存 */
export function canSaveLevel(): { valid: boolean; errors: string[] } {
  const state = useEditorStore.getState();
  const errors: string[] = [];
  
  if (!state.levelName || state.levelName.trim() === '') {
    errors.push('请输入关卡名称');
  }
  
  if (!state.goal) {
    errors.push('请设置关卡终点');
  }
  
  if (!isValidMapDimensions(state.mapWidth, state.mapHeight)) {
    errors.push('地图尺寸无效');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
