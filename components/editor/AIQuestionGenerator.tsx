"use client";

/**
 * AI智能题目生成器组件
 * 支持年级、科目、难度选择，一键生成题目
 */

import { useState, useCallback, useEffect } from "react";
import { X, Sparkles, Loader2, Check, RefreshCw, ChevronLeft, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { generateQuestions, convertToEditorQuestion, checkAIStatus } from "@/lib/api/aiQuestions";
import type { 
  GradeGroup, 
  SubjectType, 
  GeneratedQuestion,
  QuickTemplate,
  AIGeneratorState 
} from "@/types/aiQuestion";
import { 
  GRADE_GROUPS, 
  SUBJECTS, 
  QUICK_TEMPLATES,
  getAvailableSubjects 
} from "@/types/aiQuestion";

interface AIQuestionGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: Array<{
    id: string;
    type: 'choice' | 'fill';
    question: string;
    options?: string[];
    answer: string;
    explanation?: string;
    difficulty: 1 | 2 | 3;
  }>) => void;
}

export default function AIQuestionGenerator({ isOpen, onClose, onImport }: AIQuestionGeneratorProps) {
  const { token } = useAuthStore();
  
  // 状态管理
  const [state, setState] = useState<AIGeneratorState>({
    step: 'config',
    grade: 'primary_lower',
    selectedSubjects: [],
    difficulty: 1,
    count: 10,
    extraPrompt: '',
    generatedQuestions: [],
    selectedQuestionIds: new Set(),
    error: null,
  });
  
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  // 检查AI服务状态
  useEffect(() => {
    if (isOpen) {
      checkAIStatus().then(status => setAiAvailable(status.available));
    }
  }, [isOpen]);

  // 重置状态
  const resetState = useCallback(() => {
    setState({
      step: 'config',
      grade: 'primary_lower',
      selectedSubjects: [],
      difficulty: 1,
      count: 10,
      extraPrompt: '',
      generatedQuestions: [],
      selectedQuestionIds: new Set(),
      error: null,
    });
  }, []);

  // 切换科目选择
  const toggleSubject = useCallback((subject: SubjectType) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedSubjects);
      if (newSelected.has(subject)) {
        newSelected.delete(subject);
      } else if (newSelected.size < 5) {
        newSelected.add(subject);
      }
      return { ...prev, selectedSubjects: Array.from(newSelected) };
    });
  }, []);

  // 应用快捷模板
  const applyTemplate = useCallback((template: QuickTemplate) => {
    setState(prev => ({
      ...prev,
      selectedSubjects: template.subjects,
      difficulty: template.difficulty,
      count: template.count,
      extraPrompt: template.extraPrompt || '',
    }));
  }, []);

  // 生成题目
  const handleGenerate = useCallback(async () => {
    if (!token) {
      setState(prev => ({ ...prev, error: '请先登录后再使用AI出题功能' }));
      return;
    }
    
    if (state.selectedSubjects.length === 0) {
      setState(prev => ({ ...prev, error: '请至少选择一个科目' }));
      return;
    }

    setState(prev => ({ ...prev, step: 'loading', error: null }));

    try {
      const response = await generateQuestions({
        grade: state.grade,
        subjects: state.selectedSubjects,
        difficulty: state.difficulty,
        count: state.count,
        extraPrompt: state.extraPrompt,
      }, token);

      if (response.success && response.questions.length > 0) {
        setState(prev => ({
          ...prev,
          step: 'result',
          generatedQuestions: response.questions,
          selectedQuestionIds: new Set(response.questions.map((_, i) => i)),
        }));
      } else {
        setState(prev => ({
          ...prev,
          step: 'config',
          error: response.message || '生成失败，请重试',
        }));
      }
    } catch (err) {
      let errorMessage = '生成失败，请重试';
      
      if (err instanceof Error) {
        // 🔥 友好的错误提示
        if (err.message.includes('504') || err.message.includes('超时') || err.message.includes('timeout')) {
          errorMessage = 'AI服务响应超时，请稍后重试。建议：减少生成数量或简化要求';
        } else if (err.message.includes('503') || err.message.includes('不可用')) {
          errorMessage = 'AI服务暂时不可用，请稍后重试';
        } else if (err.message.includes('401') || err.message.includes('登录')) {
          errorMessage = '登录已过期，请刷新页面重新登录';
        } else if (err.message.includes('429') || err.message.includes('频繁')) {
          // 🔥 v2.4.1: 速率限制提示
          errorMessage = err.message.includes('秒') ? err.message : '请求过于频繁，请稍后重试（每分钟最多3次）';
        } else {
          errorMessage = err.message;
        }
      }
      
      setState(prev => ({
        ...prev,
        step: 'config',
        error: errorMessage,
      }));
    }
  }, [token, state.grade, state.selectedSubjects, state.difficulty, state.count, state.extraPrompt]);

  // 切换题目选择
  const toggleQuestionSelection = useCallback((index: number) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedQuestionIds);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return { ...prev, selectedQuestionIds: newSelected };
    });
  }, []);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    setState(prev => {
      if (prev.selectedQuestionIds.size === prev.generatedQuestions.length) {
        return { ...prev, selectedQuestionIds: new Set() };
      } else {
        return { ...prev, selectedQuestionIds: new Set(prev.generatedQuestions.map((_, i) => i)) };
      }
    });
  }, []);

  // 导入选中题目
  const handleImport = useCallback(() => {
    const selectedQuestions = state.generatedQuestions
      .filter((_, i) => state.selectedQuestionIds.has(i))
      .map((q, i) => convertToEditorQuestion(q, i));
    
    onImport(selectedQuestions);
    resetState();
    onClose();
  }, [state.generatedQuestions, state.selectedQuestionIds, onImport, resetState, onClose]);

  if (!isOpen) return null;

  const availableSubjects = getAvailableSubjects(state.grade);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/90">
          <h2 className="text-xl font-bold text-sky-300 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-sky-400" />
            智能出题助手
          </h2>
          <button
            onClick={() => { resetState(); onClose(); }}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* AI不可用提示 */}
        {aiAvailable === false && (
          <div className="mx-6 mt-4 p-3 bg-slate-800/80 border border-slate-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            <span className="text-slate-200 text-sm">AI服务未配置，请联系管理员</span>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {state.step === 'config' && (
            <ConfigStep
              state={state}
              setState={setState}
              availableSubjects={availableSubjects}
              toggleSubject={toggleSubject}
              applyTemplate={applyTemplate}
              onGenerate={handleGenerate}
              aiAvailable={aiAvailable}
            />
          )}

          {state.step === 'loading' && (
            <LoadingStep />
          )}

          {state.step === 'result' && (
            <ResultStep
              state={state}
              toggleQuestionSelection={toggleQuestionSelection}
              toggleSelectAll={toggleSelectAll}
              onBack={() => setState(prev => ({ ...prev, step: 'config' }))}
              onRegenerate={handleGenerate}
              onImport={handleImport}
            />
          )}
        </div>
      </div>
    </div>
  );
}


// ==================== 配置步骤组件 ====================

interface ConfigStepProps {
  state: AIGeneratorState;
  setState: React.Dispatch<React.SetStateAction<AIGeneratorState>>;
  availableSubjects: typeof SUBJECTS;
  toggleSubject: (subject: SubjectType) => void;
  applyTemplate: (template: QuickTemplate) => void;
  onGenerate: () => void;
  aiAvailable: boolean | null;
}

function ConfigStep({ 
  state, 
  setState, 
  availableSubjects, 
  toggleSubject, 
  applyTemplate, 
  onGenerate,
  aiAvailable 
}: ConfigStepProps) {
  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {state.error && (
        <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          {state.error}
        </div>
      )}

      {/* 快捷模板 */}
      <div>
        <label className="block text-slate-200 text-sm mb-3 font-medium">快捷模板</label>
        <div className="flex flex-wrap gap-2">
          {QUICK_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm transition-colors text-slate-100"
            >
              {template.icon} {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* 年级选择 */}
      <div>
        <label className="block text-slate-200 text-sm mb-3 font-medium">选择年级</label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(GRADE_GROUPS) as [GradeGroup, { label: string; grades: string }][]).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setState(prev => ({ 
                ...prev, 
                grade: key,
                selectedSubjects: prev.selectedSubjects.filter(s => 
                  getAvailableSubjects(key).some(as => as.id === s)
                )
              }))}
              className={`p-4 rounded-xl border-2 transition-all ${
                state.grade === key
                  ? 'bg-sky-900/40 border-sky-500 shadow-lg shadow-sky-900/30'
                  : 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="text-lg font-bold text-slate-100">{value.label}</div>
              <div className="text-xs text-slate-400 mt-1">{value.grades}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 科目选择 */}
      <div>
        <label className="block text-slate-200 text-sm mb-3 font-medium">
          选择科目（可多选，最多5个）
          <span className="text-slate-400 ml-2">已选 {state.selectedSubjects.length}/5</span>
        </label>
        <div className="grid grid-cols-5 gap-2">
          {availableSubjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => toggleSubject(subject.id)}
              className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                state.selectedSubjects.includes(subject.id)
                  ? 'bg-sky-900/40 border-sky-500'
                  : 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
              }`}
            >
              <span className="text-2xl">{subject.icon}</span>
              <span className="text-xs mt-1 text-slate-100">{subject.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 难度和数量 */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-slate-200 text-sm mb-3 font-medium">难度</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(d => (
              <button
                key={d}
                onClick={() => setState(prev => ({ ...prev, difficulty: d as 1 | 2 | 3 }))}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  state.difficulty === d
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {'⭐'.repeat(d)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-slate-200 text-sm mb-3 font-medium">数量</label>
          <div className="flex gap-2">
            {[5, 10, 15, 20].map(n => (
              <button
                key={n}
                onClick={() => setState(prev => ({ ...prev, count: n }))}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  state.count === n
                    ? 'bg-sky-700 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {n}题
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 补充说明 */}
      <div>
        <label className="block text-slate-200 text-sm mb-2 font-medium">补充说明（可选）</label>
        <input
          type="text"
          value={state.extraPrompt}
          onChange={(e) => setState(prev => ({ ...prev, extraPrompt: e.target.value }))}
          placeholder="例如：加减法不超过100、关于动物的..."
          maxLength={200}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* 生成按钮 */}
      <button
        onClick={onGenerate}
        disabled={state.selectedSubjects.length === 0 || aiAvailable === false}
        className="w-full py-4 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30"
      >
        <Sparkles className="w-5 h-5" />
        一键生成题目
      </button>
    </div>
  );
}

// ==================== 加载步骤组件 ====================

function LoadingStep() {
  const [dots, setDots] = useState('');
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  
  // 动态省略号
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);
  
  // 进度步骤模拟
  useEffect(() => {
    const steps = [
      { time: 1000, step: 1 },  // 1秒后：分析需求
      { time: 3000, step: 2 },  // 3秒后：生成题目
      { time: 6000, step: 3 },  // 6秒后：优化内容
    ];
    
    const timers = steps.map(({ time, step: s }) => 
      setTimeout(() => setStep(s), time)
    );
    
    return () => timers.forEach(clearTimeout);
  }, []);
  
  // 计时器
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const progressSteps = [
    { label: '准备中', icon: '🔄' },
    { label: '分析需求', icon: '🧠' },
    { label: '生成题目', icon: '✨' },
    { label: '优化内容', icon: '📝' },
  ];
  
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-16 h-16 text-sky-400 animate-spin mb-6" />
      <p className="text-slate-100 text-lg mb-2">
        正在生成题目{dots}
      </p>
      
      {/* 进度步骤 */}
      <div className="flex items-center gap-2 mb-4">
        {progressSteps.map((s, i) => (
          <div 
            key={i}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
              i <= step 
                ? 'bg-sky-600/25 text-sky-200 border border-sky-500/40' 
                : 'bg-slate-800/60 text-slate-500 border border-slate-700'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      
      {/* 计时和提示 */}
      <p className="text-slate-400 text-sm">
        已等待 {elapsed} 秒
        {elapsed > 10 && ' · AI正在努力思考中'}
        {elapsed > 20 && '，请耐心等待'}
      </p>
      
      {/* 超时提示 */}
      {elapsed > 30 && (
        <p className="text-orange-400 text-xs mt-2">
          ⚠️ 生成时间较长，可能是网络延迟或题目较多
        </p>
      )}
    </div>
  );
}

// ==================== 结果步骤组件 ====================

interface ResultStepProps {
  state: AIGeneratorState;
  toggleQuestionSelection: (index: number) => void;
  toggleSelectAll: () => void;
  onBack: () => void;
  onRegenerate: () => void;
  onImport: () => void;
}

function ResultStep({ 
  state, 
  toggleQuestionSelection, 
  toggleSelectAll, 
  onBack, 
  onRegenerate, 
  onImport 
}: ResultStepProps) {
  const allSelected = state.selectedQuestionIds.size === state.generatedQuestions.length;
  const selectedCount = state.selectedQuestionIds.size;

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sky-300 hover:text-sky-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          返回修改
        </button>
        <div className="flex items-center gap-3">
          <span className="text-slate-300 text-sm">
            已生成 {state.generatedQuestions.length} 道题目
          </span>
          <button
            onClick={toggleSelectAll}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm transition-colors text-slate-100"
          >
            {allSelected ? '取消全选' : '全选'}
          </button>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm transition-colors text-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
            重新生成
          </button>
        </div>
      </div>

      {/* 题目列表 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {state.generatedQuestions.map((q, index) => (
          <QuestionCard
            key={index}
            question={q}
            index={index}
            selected={state.selectedQuestionIds.has(index)}
            onToggle={() => toggleQuestionSelection(index)}
          />
        ))}
      </div>

      {/* 导入按钮 */}
      <button
        onClick={onImport}
        disabled={selectedCount === 0}
        className="w-full py-4 bg-gradient-to-r from-sky-700 to-emerald-600 hover:from-sky-600 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl text-lg font-bold transition-all shadow-lg"
      >
        导入选中题目 ({selectedCount}道) 到我的题库
      </button>
    </div>
  );
}

// ==================== 题目卡片组件 ====================

interface QuestionCardProps {
  question: GeneratedQuestion;
  index: number;
  selected: boolean;
  onToggle: () => void;
}

function QuestionCard({ question, index, selected, onToggle }: QuestionCardProps) {
  const subjectInfo = SUBJECTS.find(s => s.id === question.subject);
  
  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selected
          ? 'bg-sky-900/30 border-sky-500'
          : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 选择框 */}
        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
          selected ? 'bg-sky-600 border-sky-500' : 'border-slate-500'
        }`}>
          {selected && <Check className="w-4 h-4" />}
        </div>
        
        {/* 题目内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-400 text-sm">#{index + 1}</span>
            <span className="text-lg">{subjectInfo?.icon || '📝'}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              question.type === 'choice' ? 'bg-sky-700' : 'bg-indigo-700'
            }`}>
              {question.type === 'choice' ? '选择' : '填空'}
            </span>
            <span className="text-xs text-slate-300">
              {'⭐'.repeat(question.difficulty)}
            </span>
          </div>
          
          <p className="text-slate-100 mb-2">{question.question}</p>
          
          {question.type === 'choice' && question.options && (
            <div className="grid grid-cols-2 gap-1 text-sm text-slate-300 mb-2">
              {question.options.map((opt, i) => (
                <span key={i} className={opt === question.answer ? 'text-sky-400' : ''}>
                  {String.fromCharCode(65 + i)}. {opt}
                </span>
              ))}
            </div>
          )}
          
          <div className="text-sm text-sky-400">
            答案: {question.answer}
          </div>
          
          {question.explanation && (
            <div className="text-xs text-slate-400 mt-1">
              解析: {question.explanation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
