"use client";

/**
 * QuestionEditor - 题目编辑器组件
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 * 支持选择题、填空题、数学题、逻辑题的创建和编辑
 */

import { useState, useCallback, useEffect } from "react";
import {
  CustomQuestion,
  QuestionType,
  RewardType,
  Difficulty,
} from "@/types/editor";
import {
  validateQuestion,
  QuestionValidationResult,
  isValidChoiceOptionsCount,
} from "@/lib/editor/questionValidation";
import {
  X,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Gift,
} from "lucide-react";

// Re-export validation functions for external use
export { validateQuestion, isValidChoiceOptionsCount };
export type { QuestionValidationResult };

// ==================== 类型定义 ====================

interface QuestionEditorProps {
  question?: CustomQuestion;
  onSave: (question: CustomQuestion) => void;
  onCancel: () => void;
}

// ==================== 常量 ====================

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: "choice", label: "选择题", icon: "📝" },
  { value: "fill", label: "填空题", icon: "✏️" },
  { value: "math", label: "数学题", icon: "🔢" },
  { value: "logic", label: "逻辑题", icon: "🧩" },
];

const REWARD_TYPES: { value: RewardType; label: string; icon: string }[] = [
  { value: "unlock_door", label: "开门", icon: "🚪" },
  { value: "give_item", label: "获得道具", icon: "🎁" },
  { value: "hp", label: "恢复生命", icon: "❤️" },
  { value: "coins", label: "获得金币", icon: "💰" },
  { value: "xp", label: "获得经验", icon: "⭐" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; color: string }[] = [
  { value: 1, label: "简单", color: "text-green-400" },
  { value: 2, label: "中等", color: "text-yellow-400" },
  { value: 3, label: "困难", color: "text-red-400" },
];

// ==================== 主组件 ====================

export default function QuestionEditor({
  question,
  onSave,
  onCancel,
}: QuestionEditorProps) {
  // 表单状态
  const [type, setType] = useState<QuestionType>(question?.type || "choice");
  const [questionText, setQuestionText] = useState(question?.question || "");
  const [options, setOptions] = useState<string[]>(
    question?.options || ["", "", "", ""]
  );
  const [answer, setAnswer] = useState<string>(
    Array.isArray(question?.answer) ? question.answer[0] : question?.answer || ""
  );
  const [explanation, setExplanation] = useState(question?.explanation || "");
  const [difficulty, setDifficulty] = useState<Difficulty>(question?.difficulty || 1);
  const [rewardType, setRewardType] = useState<RewardType>(
    question?.reward?.type || "coins"
  );
  const [rewardValue, setRewardValue] = useState<number>(
    question?.reward?.value || 10
  );

  // 验证状态
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  // 当题目类型改变时重置相关字段
  useEffect(() => {
    if (type !== "choice") {
      // 非选择题不需要选项，重置答案格式
      // 如果之前是选择题的单字母答案，清空它
      if (answer.length === 1 && /^[A-D]$/.test(answer)) {
        setAnswer("");
      }
    }
  }, [type, answer]);

  // 实时验证
  useEffect(() => {
    const currentQuestion: Partial<CustomQuestion> = {
      type,
      question: questionText,
      options: type === "choice" ? options.filter(o => o.trim() !== "") : undefined,
      answer,
      difficulty,
    };
    const result = validateQuestion(currentQuestion);
    setValidationErrors(result.errors);
  }, [type, questionText, options, answer, difficulty]);

  // 添加选项
  const handleAddOption = useCallback(() => {
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  }, [options]);

  // 删除选项
  const handleRemoveOption = useCallback((index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      // 如果删除的选项是当前答案，重置答案
      const answerIndex = ["A", "B", "C", "D"].indexOf(answer);
      if (answerIndex >= newOptions.length) {
        setAnswer("");
      }
    }
  }, [options, answer]);

  // 更新选项
  const handleOptionChange = useCallback((index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  }, [options]);

  // 保存题目
  const handleSave = useCallback(() => {
    const currentQuestion: Partial<CustomQuestion> = {
      type,
      question: questionText,
      options: type === "choice" ? options.filter(o => o.trim() !== "") : undefined,
      answer,
      explanation: explanation || undefined,
      difficulty,
      reward: {
        type: rewardType,
        value: rewardValue,
      },
    };

    const result = validateQuestion(currentQuestion);
    if (!result.valid) {
      setShowErrors(true);
      return;
    }

    const savedQuestion: CustomQuestion = {
      id: question?.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      question: questionText,
      options: type === "choice" ? options.filter(o => o.trim() !== "") : undefined,
      answer,
      explanation: explanation || undefined,
      difficulty,
      reward: {
        type: rewardType,
        value: rewardValue,
      },
    };

    onSave(savedQuestion);
  }, [type, questionText, options, answer, explanation, difficulty, rewardType, rewardValue, question, onSave]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-red-900/95 to-black/95 border-2 border-yellow-600/50 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-yellow-600/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-bold text-yellow-400">
              {question ? "编辑题目" : "创建题目"}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-red-800/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 题目类型选择 */}
          <div>
            <label className="block text-sm font-medium text-yellow-400 mb-2">
              题目类型
            </label>
            <div className="grid grid-cols-4 gap-2">
              {QUESTION_TYPES.map((qt) => (
                <button
                  key={qt.value}
                  onClick={() => setType(qt.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    type === qt.value
                      ? "border-yellow-500 bg-yellow-500/20"
                      : "border-yellow-600/30 hover:border-yellow-600/50 bg-black/30"
                  }`}
                >
                  <div className="text-2xl mb-1">{qt.icon}</div>
                  <div className="text-xs text-white">{qt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 题目内容 */}
          <div>
            <label className="block text-sm font-medium text-yellow-400 mb-2">
              题目内容 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="请输入题目内容..."
              rows={3}
              className="w-full px-3 py-2 bg-black/30 border border-yellow-600/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>

          {/* 选择题选项 */}
          {type === "choice" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-yellow-400">
                  选项 <span className="text-red-400">*</span>
                  <span className="text-xs text-gray-400 ml-2">(2-4个)</span>
                </label>
                {options.length < 4 && (
                  <button
                    onClick={handleAddOption}
                    className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    <Plus className="w-4 h-4" />
                    添加选项
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-yellow-600/30 rounded text-sm text-yellow-400 font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                      className="flex-1 px-3 py-2 bg-black/30 border border-yellow-600/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
                    />
                    <button
                      onClick={() => setAnswer(String.fromCharCode(65 + index))}
                      className={`p-2 rounded-lg transition-colors ${
                        answer === String.fromCharCode(65 + index)
                          ? "bg-green-600/30 text-green-400"
                          : "hover:bg-yellow-600/20 text-gray-400"
                      }`}
                      title="设为正确答案"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(index)}
                        className="p-2 hover:bg-red-600/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        title="删除选项"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {answer && (
                <p className="mt-2 text-sm text-green-400">
                  ✓ 正确答案: {answer}
                </p>
              )}
            </div>
          )}

          {/* 填空题/数学题/逻辑题答案 */}
          {type !== "choice" && (
            <div>
              <label className="block text-sm font-medium text-yellow-400 mb-2">
                正确答案 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={
                  type === "fill"
                    ? "请输入填空答案..."
                    : type === "math"
                    ? "请输入数学答案..."
                    : "请输入逻辑答案..."
                }
                className="w-full px-3 py-2 bg-black/30 border border-yellow-600/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>
          )}

          {/* 解析说明 */}
          <div>
            <label className="block text-sm font-medium text-yellow-400 mb-2">
              解析说明 <span className="text-gray-400 text-xs">(可选)</span>
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="答题后显示的解析..."
              rows={2}
              className="w-full px-3 py-2 bg-black/30 border border-yellow-600/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>

          {/* 难度选择 */}
          <div>
            <label className="block text-sm font-medium text-yellow-400 mb-2">
              难度等级
            </label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                    difficulty === d.value
                      ? "border-yellow-500 bg-yellow-500/20"
                      : "border-yellow-600/30 hover:border-yellow-600/50 bg-black/30"
                  }`}
                >
                  <span className={d.color}>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 奖励配置 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-yellow-400" />
              <label className="text-sm font-medium text-yellow-400">
                答题奖励
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">奖励类型</label>
                <select
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as RewardType)}
                  className="w-full px-3 py-2 bg-black/30 border border-yellow-600/30 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  {REWARD_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.icon} {rt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">奖励数值</label>
                <input
                  type="number"
                  value={rewardValue}
                  onChange={(e) => setRewardValue(Number(e.target.value))}
                  min={1}
                  max={1000}
                  className="w-full px-3 py-2 bg-black/30 border border-yellow-600/30 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </div>

          {/* 验证错误提示 */}
          {showErrors && validationErrors.length > 0 && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">请修正以下问题:</span>
              </div>
              <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-yellow-600/30 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg transition-colors"
          >
            {question ? "保存修改" : "创建题目"}
          </button>
        </div>
      </div>
    </div>
  );
}
