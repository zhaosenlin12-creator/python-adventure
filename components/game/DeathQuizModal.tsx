'use client';

import { useState, useEffect } from 'react';
import { playSound } from '@/lib/soundEffects';
import { Lightbulb, CheckCircle2, XCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import * as primaryLower from '@/lib/questionBank/primary-lower';
import * as primaryUpper from '@/lib/questionBank/primary-upper';
import * as juniorHigh from '@/lib/questionBank/junior-high';
import type { AgeGroup } from '@/types/ageGroup';
import type { Question as BankQuestion } from '@/lib/questionBank/types';
import { getCampaignQuestionCopy } from '@/lib/gameplayText';

interface Question {
  id: string;
  type: 'choice' | 'fill';
  question: string;
  options?: string[];
  answer: string | string[];
  hint?: string;
  subject: string;
}

// 备用题目（当题库无法获取时使用）
const fallbackQuestions: Question[] = [
  { id: 'h1', type: 'choice', question: '什么东西越洗越脏？', options: ['衣服', '水', '碗', '手'], answer: '水', hint: '洗东西时什么会变脏', subject: 'humor' },
  { id: 'h2', type: 'choice', question: '什么门永远关不上？', options: ['大门', '球门', '房门', '车门'], answer: '球门', hint: '体育运动', subject: 'humor' },
  { id: 'h3', type: 'choice', question: '什么水不能喝？', options: ['矿泉水', '薪水', '自来水', '纯净水'], answer: '薪水', hint: '每月想要更多', subject: 'humor' },
  { id: 'm1', type: 'fill', question: '2的10次方等于？', answer: ['1024'], hint: '2连乘10次', subject: 'math' },
  { id: 'm2', type: 'choice', question: '1+2+3+...+10=?', options: ['45', '50', '55', '60'], answer: '55', hint: '等差数列', subject: 'math' },
];

interface DeathQuizModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export default function DeathQuizModal({ isOpen, onSuccess }: DeathQuizModalProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState('');
  const [input, setInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  
  // 获取当前年龄段
  const { selectedAgeGroup } = useGameStore();
  const copy = getCampaignQuestionCopy('retry');

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').trim();

  const checkAnswer = (ans: string): boolean => {
    if (!question) return false;
    const n = normalize(ans);
    if (Array.isArray(question.answer)) return question.answer.some(a => normalize(a) === n);
    return normalize(question.answer) === n;
  };

  const loadQuestion = () => {
    try {
      // 🔥 从对应年龄段题库随机获取题目
      const ageGroup: AgeGroup = selectedAgeGroup || 'primary-lower';
      const questionBanks = {
        'primary-lower': primaryLower.allQuestions,
        'primary-upper': primaryUpper.allQuestions,
        'junior-high': juniorHigh.allQuestions,
      };
      const allQ: BankQuestion[] = questionBanks[ageGroup] || primaryLower.allQuestions;
      // 随机打乱并选取5道
      const levelQuestions = [...allQ].sort(() => Math.random() - 0.5).slice(0, 5);
      
      if (levelQuestions && levelQuestions.length > 0) {
        // 随机选择一道题
        const randomQ = levelQuestions[Math.floor(Math.random() * levelQuestions.length)];
        
        // 转换为DeathQuiz格式
        const q: Question = {
          id: randomQ.id,
          type: randomQ.type === 'choice' ? 'choice' : 'fill',
          question: randomQ.question,
          options: randomQ.options,
          answer: randomQ.answer,
          hint: randomQ.explanation?.substring(0, 50) || '仔细思考一下',
          subject: randomQ.subject || 'general'
        };
        setQuestion(q);
      } else {
        // 使用备用题目
        const q = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
        setQuestion(q);
      }
    } catch (error) {
      console.error('[DeathQuiz] 获取题目失败，使用备用题目:', error);
      const q = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      setQuestion(q);
    }
    
    setShowResult(false);
    setSelected('');
    setInput('');
    setShowHint(false);
    playSound('question_show');
  };

  const retry = () => {
    setShowResult(false);
    setSelected('');
    setInput('');
    playSound('question_show');
  };

  useEffect(() => {
    if (isOpen) {
      setWrongCount(0);
      loadQuestion();
    }
  }, [isOpen]);

  const submit = () => {
    const ans = question?.type === 'choice' ? selected : input;
    if (!ans) return;
    const ok = checkAnswer(ans);
    setCorrect(ok);
    setShowResult(true);
    if (ok) {
      playSound('answer_correct');
      setTimeout(() => onSuccess(), 2000);
    } else {
      playSound('answer_wrong');
      setWrongCount(prev => prev + 1);
    }
  };

  const getLabel = (s: string) => {
    const m: Record<string, string> = { 
      humor: '😄 脑筋急转弯', 
      programming: '💻 编程', 
      math: '🔢 数学', 
      logic: '🧠 逻辑',
      chinese: '📖 语文',
      english: '🔤 英语',
      science: '🔬 科学',
      fun: '🎮 趣味',
      general: '📚 知识'
    };
    return m[s] || '📚 知识';
  };

  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0e27]/95 via-[#1a1e3e]/95 to-[#0a0e27]/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 backdrop-blur-md rounded-xl p-6 max-w-lg w-full border-2 border-slate-700 shadow-lg">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold text-blue-400 animate-pulse"><Lightbulb className="w-7 h-7 text-blue-400 inline mr-1" /> {copy.title}</h2>
          <p className="text-slate-500 mt-2">{copy.subtitle}</p>
          {wrongCount > 0 && <p className="text-red-400 text-sm mt-1">已答错 {wrongCount} 次</p>}
        </div>

        {!showResult ? (
          <div>
            <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
              <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs mb-2 inline-block">{getLabel(question.subject)}</span>
              <p className="text-white text-lg mb-4">{question.question}</p>
              
              {question.type === 'choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((o, i) => (
                    <button key={i} onClick={() => { setSelected(o); playSound('button_click'); }}
                      className={`w-full p-3 rounded-lg text-left text-white border-2 ${selected === o ? 'bg-blue-500/25 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)] ring-1 ring-blue-400/30' : 'bg-slate-700 border-slate-600 hover:bg-blue-700'}`}>
                      {String.fromCharCode(65+i)}. {o}
                    </button>
                  ))}
                </div>
              )}
              
              {question.type === 'fill' && (
                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder="输入答案..." className="w-full p-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-blue-400 focus:outline-none" autoFocus />
              )}
              
              {question.hint && !showHint && (
                <button onClick={() => setShowHint(true)} className="text-blue-400 text-sm mt-3">💡 提示</button>
              )}
              {showHint && <div className="text-amber-400 text-sm mt-3 bg-amber-900/30 p-2 rounded-lg border border-amber-500/30">💡 {question.hint}</div>}
            </div>
            
            <button onClick={submit} disabled={!selected && !input}
              className={`w-full py-3 rounded font-bold ${(selected || input) ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-600 text-gray-400'}`}>
              提交答案
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-6xl mb-3">{correct ? <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" /> : <XCircle className="w-14 h-14 text-red-500 mx-auto" />}</div>
            <div className={`text-2xl font-bold mb-3 ${correct ? 'text-green-500' : 'text-red-500'}`}>
              {correct ? copy.successTitle : '答错了'}
            </div>
            <p className="text-slate-500 mb-4">{correct ? copy.successBody : copy.wrongBody}</p>
            
            {!correct && (
              <>
                <div className="bg-blue-900/30 rounded-lg p-3 text-left mb-4">
                  <div className="text-slate-500 text-sm">正确答案：</div>
                  <div className="text-green-400">{Array.isArray(question.answer) ? question.answer[0] : question.answer}</div>
                </div>
                <button onClick={retry} className="w-full py-3 rounded font-bold bg-blue-600 hover:bg-blue-700 text-white">
                  🔄 重新答题
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
