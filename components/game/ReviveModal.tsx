// ReviveModal v2 - 2024-12-04
'use client';

import { useState, useEffect } from 'react';
import { playSound } from '@/lib/soundEffects';
import { Skull, Heart, CheckCircle2, XCircle } from 'lucide-react';

interface Question {
  id: string;
  type: 'choice' | 'fill';
  question: string;
  options?: string[];
  answer: string | string[];
  hint?: string;
  difficulty: number;
  subject: string;
}

const diverseQuestionBank: Question[] = [
  { id: 'h1', type: 'choice', question: '什么东西越洗越脏？', options: ['衣服', '水', '碗', '手'], answer: '水', hint: '洗东西时什么会变脏', difficulty: 2, subject: 'humor' },
  { id: 'h2', type: 'choice', question: '什么门永远关不上？', options: ['大门', '球门', '房门', '车门'], answer: '球门', hint: '体育运动', difficulty: 2, subject: 'humor' },
  { id: 'h3', type: 'choice', question: '什么东西有头没有脚？', options: ['蛇', '蒜', '鱼', '虫'], answer: '蒜', hint: '厨房调味品', difficulty: 2, subject: 'humor' },
  { id: 'h4', type: 'choice', question: '什么水不能喝？', options: ['矿泉水', '薪水', '自来水', '纯净水'], answer: '薪水', hint: '每月想要更多', difficulty: 2, subject: 'humor' },
  { id: 'p1', type: 'choice', question: 'Python中 type([]) 返回？', options: ['list', 'array', 'tuple', 'dict'], answer: 'list', hint: '[]是列表', difficulty: 2, subject: 'programming' },
  { id: 'p2', type: 'fill', question: 'len("Hello") 等于？', answer: ['5'], hint: '数字母', difficulty: 2, subject: 'programming' },
  { id: 'p3', type: 'choice', question: '哪个不是Python数据类型？', options: ['int', 'float', 'char', 'str'], answer: 'char', hint: 'Python没有char', difficulty: 2, subject: 'programming' },
  { id: 'p4', type: 'choice', question: 'typeof null 返回？', options: ['null', 'undefined', 'object', 'boolean'], answer: 'object', hint: 'JS著名bug', difficulty: 2, subject: 'programming' },
  { id: 'm1', type: 'fill', question: '2的10次方等于？', answer: ['1024'], hint: '2连乘10次', difficulty: 2, subject: 'math' },
  { id: 'm2', type: 'choice', question: '正方形对角线分成几个三角形？', options: ['2个', '3个', '4个', '1个'], answer: '2个', hint: '画一条对角线', difficulty: 2, subject: 'math' },
  { id: 'm3', type: 'fill', question: '圆周率前两位小数？(3.XX)', answer: ['3.14'], hint: '很常见的数', difficulty: 2, subject: 'math' },
  { id: 'm4', type: 'choice', question: '1+2+3+...+10=?', options: ['45', '50', '55', '60'], answer: '55', hint: '等差数列求和', difficulty: 2, subject: 'math' },
  { id: 'ph1', type: 'choice', question: '光速约为？', options: ['3×10⁶m/s', '3×10⁷m/s', '3×10⁸m/s', '3×10⁹m/s'], answer: '3×10⁸m/s', hint: '30万公里/秒', difficulty: 2, subject: 'physics' },
  { id: 'ph2', type: 'choice', question: '水的沸点？', options: ['90°C', '100°C', '110°C', '120°C'], answer: '100°C', hint: '整数', difficulty: 2, subject: 'physics' },
  { id: 'ph3', type: 'choice', question: '地球公转一周多久？', options: ['365天', '30天', '7天', '24小时'], answer: '365天', hint: '一年', difficulty: 2, subject: 'physics' },
  { id: 'ph4', type: 'choice', question: '哪个是导体？', options: ['橡胶', '玻璃', '铜', '塑料'], answer: '铜', hint: '金属', difficulty: 2, subject: 'physics' },
  { id: 'l1', type: 'choice', question: '所有猫是动物，动物需要食物，那么？', options: ['有些猫不需要食物', '所有猫需要食物', '有些动物是猫', '食物是动物'], answer: '所有猫需要食物', hint: '三段论', difficulty: 2, subject: 'logic' },
  { id: 'l2', type: 'fill', question: '2,4,8,16,?', answer: ['32'], hint: '每个是前一个2倍', difficulty: 2, subject: 'logic' },
  { id: 'l3', type: 'choice', question: '小明比小红高，小红比小刚高，谁最高？', options: ['小刚', '小明', '小红', '无法判断'], answer: '小明', hint: '排序', difficulty: 2, subject: 'logic' },
  { id: 'l4', type: 'fill', question: '1,1,2,3,5,8,?', answer: ['13'], hint: '斐波那契', difficulty: 2, subject: 'logic' },
];

interface ReviveModalProps {
  isOpen: boolean;
  livesRemaining: number;
  onRevive: () => void;
  onGiveUp: () => void;
}

export default function ReviveModal({ isOpen, livesRemaining, onRevive }: ReviveModalProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/[，。！？,\.!?]/g, '').trim();

  const check = (ans: string): boolean => {
    if (!question) return false;
    const n = normalize(ans);
    if (Array.isArray(question.answer)) return question.answer.some(a => normalize(a) === n);
    return normalize(question.answer) === n;
  };

  const loadQuestion = () => {
    const q = diverseQuestionBank[Math.floor(Math.random() * diverseQuestionBank.length)];
    setQuestion(q);
    setShowResult(false);
    setSelectedAnswer('');
    setUserInput('');
    setShowHint(false);
    playSound('question_show');
  };

  const resetCurrentQuestion = () => {
    setShowResult(false);
    setSelectedAnswer('');
    setUserInput('');
    playSound('question_show');
  };

  useEffect(() => {
    if (isOpen) {
      setWrongCount(0);
      loadQuestion();
    }
  }, [isOpen]);

  const submit = () => {
    const ans = question?.type === 'choice' ? selectedAnswer : userInput;
    if (!ans) return;
    const ok = check(ans);
    setIsCorrect(ok);
    setShowResult(true);
    if (ok) {
      playSound('answer_correct');
      setTimeout(() => { onRevive(); }, 2000);
    } else {
      playSound('answer_wrong');
      setWrongCount(prev => prev + 1);
    }
  };

  const label = (s: string) => ({ humor: '😄 脑筋急转弯', programming: '💻 编程', math: '🔢 数学', physics: '⚡ 物理', logic: '🧠 逻辑' }[s] || '📚 知识');

  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0e27]/95 via-[#1a1e3e]/95 to-[#0a0e27]/95 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-slate-800 backdrop-blur-md rounded-xl p-6 max-w-2xl w-full border-2 border-slate-700 shadow-lg">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-red-500 mb-2 animate-pulse"><Skull className="w-7 h-7 text-red-500 inline mr-1" /> 你被击败了！</h2>
            <p className="text-lg text-slate-500">答对题目才能重新开始</p>
          </div>
          <div className="bg-blue-900/30 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-white">剩余生命：</span>
              <div className="text-xl">{Array(livesRemaining).fill('❤️').join(' ')}{Array(Math.max(0,3-livesRemaining)).fill('🖤').join(' ')}</div>
            </div>
            {wrongCount > 0 && <div className="text-red-400 text-sm mt-1">已答错 {wrongCount} 次</div>}
          </div>

          {!showResult ? (
            <div>
              <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
                <span className="px-2 py-1 bg-blue-600 text-white rounded text-sm mb-3 inline-block">{label(question.subject)}</span>
                <p className="text-lg text-white mb-4">{question.question}</p>
                {question.type === 'choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((o, i) => (
                      <button key={i} onClick={() => { setSelectedAnswer(o); playSound('button_click'); }}
                        className={`w-full p-3 rounded-lg text-left text-white border-2 ${selectedAnswer === o ? 'bg-blue-500/25 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)] ring-1 ring-blue-400/30' : 'bg-slate-700 border-slate-600 hover:bg-blue-700'}`}>
                        {String.fromCharCode(65+i)}. {o}
                      </button>
                    ))}
                  </div>
                )}
                {question.type === 'fill' && (
                  <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="请输入答案..." className="w-full p-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-blue-400 focus:outline-none" autoFocus />
                )}
                {question.hint && (
                  <div className="mt-3">
                    {!showHint ? (
                      <button onClick={() => setShowHint(true)} className="text-blue-400 text-sm">💡 需要提示？</button>
                    ) : (
                      <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-2 text-amber-400 text-sm">💡 {question.hint}</div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={submit} disabled={!selectedAnswer && !userInput}
                className={`w-full py-3 rounded-lg text-lg font-bold ${(selectedAnswer || userInput) ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
                提交答案
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">{isCorrect ? <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" /> : <XCircle className="w-14 h-14 text-red-500 mx-auto" />}</div>
              <div className={`text-2xl font-bold mb-4 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                {isCorrect ? '🎉 答对了！' : '😢 答错了！'}
              </div>
              <div className="text-lg text-slate-500 mb-4">
                {isCorrect ? '正在重新开始关卡...' : '记住正确答案，再试一次！'}
              </div>
              {!isCorrect && (
                <div>
                  <div className="bg-blue-900/30 rounded-lg p-4 text-left mb-4">
                    <div className="text-slate-500 text-sm">正确答案：</div>
                    <div className="text-green-400 text-lg">{Array.isArray(question.answer) ? question.answer[0] : question.answer}</div>
                  </div>
                  <button onClick={resetCurrentQuestion} className="w-full py-3 rounded-lg text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white">
                    🔄 重新答题
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
