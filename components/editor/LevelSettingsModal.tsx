"use client";

/**
 * LevelSettingsModal - 关卡设置弹窗组件
 * Requirements: 2.1, 2.2, 2.3
 * 配置关卡名称、描述、难度、尺寸
 * 🔒 安全：添加XSS防护
 */

import { useState, useCallback, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useAuthStore } from "@/store/authStore";
import {
  Difficulty,
  MAP_DIMENSION_LIMITS,
  isValidMapWidth,
  isValidMapHeight,
} from "@/types/editor";
import { X, AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import QuestionBankEditor from "./QuestionBankEditor";
import { getQuestionBank } from "@/lib/api/userQuestions";

// ==================== 安全函数 ====================

/**
 * 🔒 安全：消毒用户输入，防止XSS攻击
 */
function sanitizeInput(input: string, maxLength: number = 500): string {
  if (!input) return '';
  
  // 移除HTML标签
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // 转义特殊HTML字符
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // 移除潜在的JavaScript协议
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  
  // 限制长度
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized.trim();
}

// ==================== 类型定义 ====================

interface LevelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==================== 验证函数 ====================

/**
 * 验证地图宽度
 * Property 1: Map Dimension Validation
 * Validates: Requirements 2.2, 2.3
 */
export function validateMapWidth(width: number): { valid: boolean; error?: string } {
  if (typeof width !== "number" || isNaN(width)) {
    return { valid: false, error: "宽度必须是数字" };
  }
  if (width < MAP_DIMENSION_LIMITS.width.min) {
    return { valid: false, error: `宽度不能小于 ${MAP_DIMENSION_LIMITS.width.min}` };
  }
  if (width > MAP_DIMENSION_LIMITS.width.max) {
    return { valid: false, error: `宽度不能大于 ${MAP_DIMENSION_LIMITS.width.max}` };
  }
  return { valid: true };
}

/**
 * 验证地图高度
 * Property 1: Map Dimension Validation
 * Validates: Requirements 2.2, 2.3
 */
export function validateMapHeight(height: number): { valid: boolean; error?: string } {
  if (typeof height !== "number" || isNaN(height)) {
    return { valid: false, error: "高度必须是数字" };
  }
  if (height < MAP_DIMENSION_LIMITS.height.min) {
    return { valid: false, error: `高度不能小于 ${MAP_DIMENSION_LIMITS.height.min}` };
  }
  if (height > MAP_DIMENSION_LIMITS.height.max) {
    return { valid: false, error: `高度不能大于 ${MAP_DIMENSION_LIMITS.height.max}` };
  }
  return { valid: true };
}

// ==================== 主组件 ====================

export default function LevelSettingsModal({
  isOpen,
  onClose,
}: LevelSettingsModalProps) {
  const {
    levelName,
    levelDescription,
    difficulty,
    mapWidth,
    mapHeight,
    questions,
    setLevelMeta,
  } = useEditorStore();
  
  const { token, isAuthenticated } = useAuthStore();

  // Local state for form
  const [name, setName] = useState(levelName);
  const [description, setDescription] = useState(levelDescription);
  const [diff, setDiff] = useState<Difficulty>(difficulty);
  const [width, setWidth] = useState(mapWidth);
  const [height, setHeight] = useState(mapHeight);
  
  // 🔥 题库编辑器状态
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  
  // 🔥 云端题库数量
  const [cloudQuestionCount, setCloudQuestionCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    width?: string;
    height?: string;
  }>({});

  // 🔥 加载云端题库数量
  const loadCloudQuestionCount = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setCloudQuestionCount(questions.length); // 未登录时显示本地数量
      return;
    }
    
    setLoadingCount(true);
    try {
      const data = await getQuestionBank(token);
      setCloudQuestionCount(data.total);
    } catch (error) {
      console.error('Failed to load question count:', error);
      setCloudQuestionCount(questions.length); // 失败时显示本地数量
    } finally {
      setLoadingCount(false);
    }
  }, [isAuthenticated, token, questions.length]);

  // Sync with store when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(levelName);
      setDescription(levelDescription);
      setDiff(difficulty);
      setWidth(mapWidth);
      setHeight(mapHeight);
      setErrors({});
      // 🔥 加载云端题库数量
      loadCloudQuestionCount();
    }
  }, [isOpen, levelName, levelDescription, difficulty, mapWidth, mapHeight, loadCloudQuestionCount]);
  
  // 🔥 题库编辑器关闭时刷新数量
  useEffect(() => {
    if (!showQuestionBank && isOpen) {
      loadCloudQuestionCount();
    }
  }, [showQuestionBank, isOpen, loadCloudQuestionCount]);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: typeof errors = {};
    
    // Validate name
    if (!name || name.trim() === "") {
      newErrors.name = "请输入关卡名称";
    } else if (name.length > 100) {
      newErrors.name = "名称不能超过100个字符";
    }
    
    // Validate width
    const widthValidation = validateMapWidth(width);
    if (!widthValidation.valid) {
      newErrors.width = widthValidation.error;
    }
    
    // Validate height
    const heightValidation = validateMapHeight(height);
    if (!heightValidation.valid) {
      newErrors.height = heightValidation.error;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, width, height]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!validate()) return;
    
    // 🔒 安全：消毒用户输入
    setLevelMeta({
      name: sanitizeInput(name.trim(), 100),
      description: sanitizeInput(description.trim(), 500),
      difficulty: diff,
      mapWidth: width,
      mapHeight: height,
    });
    
    onClose();
  }, [validate, name, description, diff, width, height, setLevelMeta, onClose]);

  // Handle width change with validation
  const handleWidthChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setWidth(num);
      const validation = validateMapWidth(num);
      setErrors((prev) => ({
        ...prev,
        width: validation.valid ? undefined : validation.error,
      }));
    }
  }, []);

  // Handle height change with validation
  const handleHeightChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setHeight(num);
      const validation = validateMapHeight(num);
      setErrors((prev) => ({
        ...prev,
        height: validation.valid ? undefined : validation.error,
      }));
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 rounded-xl shadow-2xl max-w-lg w-full border-2 border-yellow-500/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-yellow-500/30">
          <h2 className="text-xl font-bold text-yellow-100">⚙️ 关卡设置</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-yellow-200" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-yellow-200 mb-1">
              关卡名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入关卡名称"
              maxLength={100}
              className={`w-full px-3 py-2 bg-black/30 border rounded-lg text-white placeholder:text-gray-500 focus:outline-none ${
                errors.name
                  ? "border-red-500 focus:border-red-400"
                  : "border-yellow-600/30 focus:border-yellow-500"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-yellow-200 mb-1">
              关卡描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述你的关卡..."
              rows={3}
              className="w-full px-3 py-2 bg-black/30 border border-yellow-600/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm text-yellow-200 mb-2">
              难度等级
            </label>
            <div className="flex gap-2">
              {([1, 2, 3] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDiff(d)}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                    diff === d
                      ? "bg-yellow-600/40 border-yellow-400 text-yellow-100"
                      : "bg-black/20 border-yellow-600/30 text-gray-400 hover:bg-yellow-900/20"
                  }`}
                >
                  <div className="text-lg mb-1">
                    {d === 1 ? "⭐" : d === 2 ? "⭐⭐" : "⭐⭐⭐"}
                  </div>
                  <div className="text-xs">
                    {d === 1 ? "简单" : d === 2 ? "中等" : "困难"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Map Dimensions */}
          <div>
            <label className="block text-sm text-yellow-200 mb-2">
              地图尺寸
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Width */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  宽度 ({MAP_DIMENSION_LIMITS.width.min}-{MAP_DIMENSION_LIMITS.width.max})
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  min={MAP_DIMENSION_LIMITS.width.min}
                  max={MAP_DIMENSION_LIMITS.width.max}
                  step={100}
                  className={`w-full px-3 py-2 bg-black/30 border rounded-lg text-white focus:outline-none ${
                    errors.width
                      ? "border-red-500 focus:border-red-400"
                      : "border-yellow-600/30 focus:border-yellow-500"
                  }`}
                />
                {errors.width && (
                  <p className="mt-1 text-xs text-red-400">{errors.width}</p>
                )}
              </div>
              
              {/* Height */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  高度 ({MAP_DIMENSION_LIMITS.height.min}-{MAP_DIMENSION_LIMITS.height.max})
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  min={MAP_DIMENSION_LIMITS.height.min}
                  max={MAP_DIMENSION_LIMITS.height.max}
                  step={100}
                  className={`w-full px-3 py-2 bg-black/30 border rounded-lg text-white focus:outline-none ${
                    errors.height
                      ? "border-red-500 focus:border-red-400"
                      : "border-yellow-600/30 focus:border-yellow-500"
                  }`}
                />
                {errors.height && (
                  <p className="mt-1 text-xs text-red-400">{errors.height}</p>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              💡 提示：更大的地图需要更多元素来填充
            </p>
          </div>
          
          {/* 🔥 题库管理 */}
          <div>
            <label className="block text-sm text-yellow-200 mb-2">
              题库管理
            </label>
            <button
              onClick={() => setShowQuestionBank(true)}
              className="w-full py-3 px-4 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-lg transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <span className="text-purple-200">📚 管理自定义题库</span>
              </div>
              <span className="text-purple-300 text-sm">
                {loadingCount ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  `${cloudQuestionCount ?? questions.length} 道题目`
                )}
              </span>
            </button>
            <p className="mt-2 text-xs text-gray-500">
              💡 测试模式中，死亡复活和到达终点都会从题库随机抽题
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-yellow-500/30">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors text-white font-medium"
          >
            保存设置
          </button>
        </div>
      </div>
      
      {/* 🔥 题库编辑器弹窗 */}
      <QuestionBankEditor
        isOpen={showQuestionBank}
        onClose={() => setShowQuestionBank(false)}
      />
    </div>
  );
}
