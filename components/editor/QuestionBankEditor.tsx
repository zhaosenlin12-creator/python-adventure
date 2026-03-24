"use client";

/**
 * 创意工坊题库编辑器组件 v2.4.0
 * 🔥 重构：使用全局云端题库，所有关卡共享
 * 支持用户创建、编辑、删除、批量删除自定义题目
 * 🔒 安全：添加XSS防护
 * 🤖 AI智能出题功能
 */

import { useState, useCallback, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { X, Plus, Trash2, Check, HelpCircle, Sparkles, RefreshCw, CheckSquare, Square, Loader2, AlertCircle } from "lucide-react";
import AIQuestionGenerator from "./AIQuestionGenerator";
import {
  getQuestionBank,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  batchDeleteQuestions,
  batchImportQuestions,
  UserQuestion,
  CreateQuestionRequest,
} from "@/lib/api/userQuestions";

interface QuestionBankEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

type QuestionType = 'choice' | 'fill';
type Difficulty = 1 | 2 | 3;

// 全局题库限制
const MAX_QUESTIONS = 300;

/**
 * 🔒 安全：消毒用户输入，防止XSS攻击
 */
function sanitizeInput(input: string): string {
  if (!input) return '';
  let sanitized = input.replace(/<[^>]*>/g, '');
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  const MAX_LENGTH = 1000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }
  return sanitized.trim();
}

export default function QuestionBankEditor({ isOpen, onClose }: QuestionBankEditorProps) {
  const { token, isAuthenticated } = useAuthStore();
  
  // 题库状态
  const [questions, setQuestions] = useState<UserQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 编辑状态
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // AI生成器状态
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  
  // 表单状态
  const [formType, setFormType] = useState<QuestionType>('choice');
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptions, setFormOptions] = useState(['', '', '', '']);
  const [formAnswer, setFormAnswer] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>(1);
  
  // 加载题库
  const loadQuestionBank = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getQuestionBank(token);
      setQuestions(data.questions);
      setTotal(data.total);
    } catch (err) {
      if (err instanceof Error && err.message === 'LOGIN_EXPIRED') {
        setError('登录已过期，请刷新页面重新登录');
        useAuthStore.getState().handleTokenExpired();
      } else {
        setError(err instanceof Error ? err.message : '加载题库失败');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);
  
  // 打开时加载题库
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadQuestionBank();
    }
  }, [isOpen, isAuthenticated, loadQuestionBank]);
  
  // 重置表单
  const resetForm = useCallback(() => {
    setFormType('choice');
    setFormQuestion('');
    setFormOptions(['', '', '', '']);
    setFormAnswer('');
    setFormExplanation('');
    setFormDifficulty(1);
    setIsAdding(false);
    setEditingId(null);
  }, []);
  
  // 开始编辑题目
  const startEdit = useCallback((question: UserQuestion) => {
    setEditingId(question.id);
    setFormType(question.type);
    setFormQuestion(question.question);
    setFormOptions(question.options || ['', '', '', '']);
    setFormAnswer(question.answer);
    setFormExplanation(question.explanation || '');
    setFormDifficulty(question.difficulty);
    setIsAdding(false);
  }, []);
  
  // 保存题目
  const handleSave = useCallback(async () => {
    if (!token) return;
    
    if (!formQuestion.trim()) {
      alert('请输入题目内容');
      return;
    }
    
    if (formType === 'choice') {
      const validOptions = formOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        alert('选择题至少需要2个选项');
        return;
      }
      if (!formAnswer.trim() || !validOptions.includes(formAnswer.trim())) {
        alert('请选择正确答案');
        return;
      }
    } else {
      if (!formAnswer.trim()) {
        alert('请输入正确答案');
        return;
      }
    }
    
    // 检查数量限制（新增时）
    if (!editingId && total >= MAX_QUESTIONS) {
      alert(`题库已达上限（${MAX_QUESTIONS}道），请删除一些题目后再添加`);
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const sanitizedQuestion = sanitizeInput(formQuestion);
      const sanitizedAnswer = sanitizeInput(formAnswer);
      const sanitizedExplanation = formExplanation ? sanitizeInput(formExplanation) : undefined;
      const sanitizedOptions = formType === 'choice' 
        ? formOptions.filter(o => o.trim()).map(o => sanitizeInput(o))
        : undefined;
      
      const questionData: CreateQuestionRequest = {
        type: formType,
        question: sanitizedQuestion,
        options: sanitizedOptions,
        answer: sanitizedAnswer,
        explanation: sanitizedExplanation,
        difficulty: formDifficulty,
      };
      
      if (editingId) {
        await updateQuestion(token, editingId, questionData);
      } else {
        await createQuestion(token, questionData);
      }
      
      // 重新加载题库
      await loadQuestionBank();
      resetForm();
    } catch (err) {
      if (err instanceof Error && err.message === 'LOGIN_EXPIRED') {
        setError('登录已过期，请刷新页面重新登录');
        useAuthStore.getState().handleTokenExpired();
      } else {
        setError(err instanceof Error ? err.message : '保存失败');
      }
    } finally {
      setIsSaving(false);
    }
  }, [token, formType, formQuestion, formOptions, formAnswer, formExplanation, formDifficulty, editingId, total, loadQuestionBank, resetForm]);
  
  // 删除单个题目
  const handleDelete = useCallback(async (id: number) => {
    if (!token) return;
    if (!confirm('确定要删除这道题目吗？')) return;
    
    try {
      await deleteQuestion(token, id);
      await loadQuestionBank();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'LOGIN_EXPIRED') {
        setError('登录已过期，请刷新页面重新登录');
        useAuthStore.getState().handleTokenExpired();
      } else {
        setError(err instanceof Error ? err.message : '删除失败');
      }
    }
  }, [token, editingId, loadQuestionBank, resetForm]);
  
  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (!token || selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 道题目吗？`)) return;
    
    setIsSaving(true);
    try {
      await batchDeleteQuestions(token, Array.from(selectedIds));
      await loadQuestionBank();
      setSelectedIds(new Set());
      setIsSelectMode(false);
      resetForm();
    } catch (err) {
      if (err instanceof Error && err.message === 'LOGIN_EXPIRED') {
        setError('登录已过期，请刷新页面重新登录');
        useAuthStore.getState().handleTokenExpired();
      } else {
        setError(err instanceof Error ? err.message : '批量删除失败');
      }
    } finally {
      setIsSaving(false);
    }
  }, [token, selectedIds, loadQuestionBank, resetForm]);
  
  // 切换选择
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);
  
  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  }, [selectedIds.size, questions]);
  
  // AI导入题目
  const handleAIImport = useCallback(async (aiQuestions: Array<{
    id: string;
    type: 'choice' | 'fill';
    question: string;
    options?: string[];
    answer: string;
    explanation?: string;
    difficulty: 1 | 2 | 3;
  }>) => {
    if (!token) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // 🔥 数据清洗和验证
      const questionsToImport: CreateQuestionRequest[] = aiQuestions
        .filter(q => {
          // 过滤掉无效题目
          if (!q.question || q.question.trim().length === 0) return false;
          if (!q.answer || q.answer.trim().length === 0) return false;
          if (q.type === 'choice' && (!q.options || q.options.filter(o => o?.trim()).length < 2)) return false;
          return true;
        })
        .map(q => ({
          type: q.type,
          question: q.question.trim().substring(0, 1000), // 限制长度
          options: q.type === 'choice' 
            ? q.options?.filter(o => o?.trim()).map(o => o.trim().substring(0, 200)) 
            : undefined,
          answer: q.answer.trim().substring(0, 500),
          explanation: q.explanation?.trim().substring(0, 1000) || undefined,
          difficulty: Math.min(3, Math.max(1, q.difficulty || 1)) as 1 | 2 | 3,
        }));
      
      if (questionsToImport.length === 0) {
        setError('没有有效的题目可以导入，请检查AI生成的内容');
        setIsSaving(false);
        return;
      }
      
      const result = await batchImportQuestions(token, questionsToImport);
      
      // 🔥 友好的结果提示
      if (result.imported_count > 0) {
        if (result.skipped_count > 0) {
          setError(`成功导入 ${result.imported_count} 道题目，${result.skipped_count} 道因格式问题被跳过`);
        }
        // 成功导入，刷新列表
        await loadQuestionBank();
      } else {
        setError('导入失败：所有题目都因格式问题被跳过');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'LOGIN_EXPIRED') {
        setError('登录已过期，请刷新页面重新登录');
        useAuthStore.getState().handleTokenExpired();
      } else {
        // 🔥 友好的错误提示
        const errorMsg = err instanceof Error ? err.message : '导入失败';
        if (errorMsg.includes('422') || errorMsg.includes('validation')) {
          setError('导入失败：题目格式不符合要求，请重新生成');
        } else {
          setError(`导入失败：${errorMsg}`);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [token, loadQuestionBank]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/90">
          <h2 className="text-xl font-bold text-sky-300 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-sky-400" />
            📚 我的题库
            <span className="text-sm font-normal text-slate-400">
              （全局共享，所有关卡可用）
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-950/40 border border-red-500/50 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-200 text-sm flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">✕</button>
          </div>
        )}
        
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：题目列表 */}
          <div className="w-1/2 border-r border-slate-700 flex flex-col">
            <div className="px-4 py-3 bg-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <span className="text-slate-200 text-sm">
                共 {total} / {MAX_QUESTIONS} 道题目
                {total >= MAX_QUESTIONS && (
                  <span className="text-red-400 ml-2">（已满）</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadQuestionBank}
                  disabled={isLoading}
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                  title="刷新"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-300 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
                    isSelectMode ? 'bg-sky-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  {isSelectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  多选
                </button>
                <button
                  onClick={() => setShowAIGenerator(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 rounded-lg text-sm transition-colors text-white"
                >
                  <Sparkles className="w-4 h-4" />
                  AI出题
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setIsAdding(true);
                  }}
                  disabled={total >= MAX_QUESTIONS}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-sm transition-colors text-white"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              </div>
            </div>
            
            {/* 批量操作栏 */}
            {isSelectMode && (
              <div className="px-4 py-2 bg-slate-800/90 border-b border-slate-700 flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-sky-300 hover:text-sky-200"
                >
                  {selectedIds.size === questions.length ? '取消全选' : '全选'}
                </button>
                <span className="text-slate-400 text-sm">
                  已选 {selectedIds.size} 项
                </span>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors text-white"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除选中
                  </button>
                )}
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <p>暂无题目</p>
                  <p className="text-sm mt-2">点击"添加"或"AI出题"创建题目</p>
                </div>
              ) : (
                questions.map((q, index) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      editingId === q.id
                        ? 'bg-sky-900/35 border-sky-500'
                        : selectedIds.has(q.id)
                        ? 'bg-sky-900/25 border-sky-600'
                        : 'bg-slate-800/70 border-slate-700 hover:bg-slate-700/60'
                    }`}
                    onClick={() => {
                      if (isSelectMode) {
                        toggleSelect(q.id);
                      } else {
                        startEdit(q);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {isSelectMode && (
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selectedIds.has(q.id) ? 'bg-sky-600 border-sky-500' : 'border-slate-500'
                        }`}>
                          {selectedIds.has(q.id) && <Check className="w-3 h-3" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            q.type === 'choice' ? 'bg-sky-700' : 'bg-indigo-700'
                          }`}>
                            {q.type === 'choice' ? '选择' : '填空'}
                          </span>
                          <span className="text-xs text-slate-300">
                            难度 {'⭐'.repeat(q.difficulty)}
                          </span>
                        </div>
                        <p className="text-slate-100 text-sm truncate">
                          {index + 1}. {q.question}
                        </p>
                      </div>
                      {!isSelectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(q.id);
                          }}
                          className="p-1.5 hover:bg-red-700/30 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右侧：编辑表单 */}
          <div className="w-1/2 flex flex-col">
            {(isAdding || editingId) ? (
              <>
                <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700">
                  <span className="text-slate-200 text-sm">
                    {editingId ? '✏️ 编辑题目' : '➕ 添加新题目'}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* 题目类型 */}
                  <div>
                    <label className="block text-slate-200 text-sm mb-2">题目类型</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFormType('choice')}
                        className={`flex-1 py-2 rounded-lg transition-colors ${
                          formType === 'choice'
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        选择题
                      </button>
                      <button
                        onClick={() => setFormType('fill')}
                        className={`flex-1 py-2 rounded-lg transition-colors ${
                          formType === 'fill'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        填空题
                      </button>
                    </div>
                  </div>
                  
                  {/* 题目内容 */}
                  <div>
                    <label className="block text-slate-200 text-sm mb-2">题目内容 *</label>
                    <textarea
                      value={formQuestion}
                      onChange={(e) => setFormQuestion(e.target.value)}
                      placeholder="请输入题目内容..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none resize-none"
                      rows={3}
                    />
                  </div>
                  
                  {/* 选择题选项 */}
                  {formType === 'choice' && (
                    <div>
                      <label className="block text-slate-200 text-sm mb-2">选项（至少2个）</label>
                      <div className="space-y-2">
                        {formOptions.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-slate-300 w-6">{String.fromCharCode(65 + index)}.</span>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...formOptions];
                                newOptions[index] = e.target.value;
                                setFormOptions(newOptions);
                              }}
                              placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                            />
                            <button
                              onClick={() => setFormAnswer(option)}
                              className={`p-2 rounded-lg transition-colors ${
                                formAnswer === option && option.trim()
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                              }`}
                              title="设为正确答案"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        点击 ✓ 按钮设置正确答案
                      </p>
                    </div>
                  )}
                  
                  {/* 填空题答案 */}
                  {formType === 'fill' && (
                    <div>
                      <label className="block text-slate-200 text-sm mb-2">正确答案 *</label>
                      <input
                        type="text"
                        value={formAnswer}
                        onChange={(e) => setFormAnswer(e.target.value)}
                        placeholder="请输入正确答案..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  )}
                  
                  {/* 解释 */}
                  <div>
                    <label className="block text-slate-200 text-sm mb-2">答案解释（可选）</label>
                    <textarea
                      value={formExplanation}
                      onChange={(e) => setFormExplanation(e.target.value)}
                      placeholder="答对或答错后显示的解释..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>
                  
                  {/* 难度 */}
                  <div>
                    <label className="block text-slate-200 text-sm mb-2">难度</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((d) => (
                        <button
                          key={d}
                          onClick={() => setFormDifficulty(d as Difficulty)}
                          className={`flex-1 py-2 rounded-lg transition-colors ${
                            formDifficulty === d
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {'⭐'.repeat(d)} {d === 1 ? '简单' : d === 2 ? '中等' : '困难'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="px-4 py-3 border-t border-slate-700 flex gap-3 bg-slate-800/60">
                  <button
                    onClick={resetForm}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-100"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-white"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingId ? '保存修改' : '添加题目'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>选择左侧题目进行编辑</p>
                  <p className="text-sm mt-2">或点击"添加"创建新题</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* AI智能出题弹窗 */}
      <AIQuestionGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onImport={handleAIImport}
      />
    </div>
  );
}
