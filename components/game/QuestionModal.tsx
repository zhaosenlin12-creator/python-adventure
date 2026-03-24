"use client";

import React, { useState, useEffect } from 'react';
import { Question } from '@/lib/campaigns';
import { playSound } from '@/lib/soundEffects';
import { FileText, Skull, Timer, CheckCircle2, XCircle } from 'lucide-react';
import { executePythonCode, compareCodeOutputs, TestCase } from '@/lib/codeExecutor';

interface QuestionModalProps {
  isOpen: boolean;
  question: Question;
  onCorrect: () => void;
  onWrong: () => void;
  onClose: () => void;
  currentIndex?: number;  // 当前题目索引
  totalQuestions?: number;  // 总题目数
  timeLimit?: number;  // 答题时间限制（秒）
  isFailed?: boolean;  // 是否是失败状态（血量为0）
}

export default function QuestionModal({ 
  isOpen, 
  question, 
  onCorrect, 
  onWrong, 
  onClose,
  currentIndex = 0,
  totalQuestions = 1,
  timeLimit = 60,
  isFailed = false
}: QuestionModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [showResult, setShowResult] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);

  useEffect(() => {
    if (isOpen) {
      setSelectedAnswer('');
      setUserInput('');
      setShowResult(false);
      setIsCorrect(false);
      setTimeLeft(timeLimit);
      
      // 播放显示题目音效
      playSound('question_show');
      
      // 禁用游戏按键
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('modal-opened'));
      }
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('modal-closed'));
      }
    };
  }, [isOpen, timeLimit]);

  // 倒计时
  useEffect(() => {
    if (!isOpen || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // 超时，自动提交错误答案
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, showResult]);

  const handleTimeout = () => {
    setIsCorrect(false);
    setShowResult(true);
    playSound('answer_wrong');

    setTimeout(() => {
      onWrong();
    }, 2000);
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    let userAnswer = '';
    
    if (question.type === 'choice') {
      userAnswer = selectedAnswer;
    } else {
      userAnswer = userInput.trim();
    }

    const correct = await checkAnswer(userAnswer);
    setIsCorrect(correct);
    setShowResult(true);

    // 播放音效
    if (correct) {
      playSound('answer_correct');
    } else {
      playSound('answer_wrong');
    }

    setTimeout(() => {
      if (correct) {
        onCorrect();
      } else {
        onWrong();
      }
    }, 2000);
  };

  const checkAnswer = async (userAnswer: string): Promise<boolean> => {
    if (!question) return false;
    
    const correctAnswer = Array.isArray(question.answer) ? question.answer[0] : question.answer;
    const correctAnswerStr = typeof correctAnswer === 'string' ? correctAnswer.trim() : String(correctAnswer);
    
    let isCorrect = false;
    
    if (question.type === 'code') {
      // 代码题使用智能判断（基于输出）
      isCorrect = await checkCodeAnswer(userAnswer, correctAnswerStr);
    } else {
      // 其他题目使用标准化比较
      const normalizedUser = userAnswer.toLowerCase().replace(/\s+/g, '');
      const normalizedCorrect = correctAnswerStr.toLowerCase().replace(/\s+/g, '');
      isCorrect = normalizedUser === normalizedCorrect;
    }
    
    return isCorrect;
  };

  const checkCodeAnswer = async (userAnswer: string, correctAnswer: string): Promise<boolean> => {
    try {
      // 标准化处理
      const normalizedUser = userAnswer.toLowerCase().trim().replace(/\s+/g, '');
      const normalizedCorrect = correctAnswer.toLowerCase().trim().replace(/\s+/g, '');
      
      // 方法1：完全匹配
      if (normalizedUser === normalizedCorrect) {
        return true;
      }
      
      // 方法2：包含关系判断（70%匹配）- 用于填空题
      const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);
      
      if (similarity >= 0.7) {
        return true;
      }
      
      // 方法3：关键词包含判断（用于填空题）
      if (normalizedCorrect.length <= 20) {
        // 短答案（如填空题），检查是否包含关键内容
        if (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
          return true;
        }
      }
      
      // 方法4：执行代码并比较输出（用于完整代码）
      const isOutputSame = await compareCodeOutputs(userAnswer, correctAnswer);
      
      if (isOutputSame) {
        return true;
      }
      
      // 方法5：语义等价判断（宽松判断）
      const isEquivalent = isEquivalentCode(normalizedUser, normalizedCorrect);
      if (isEquivalent) {
        return true;
      }
      
      return false;
    } catch {
      // 出错时使用宽松判断
      const normalizedUser = userAnswer.toLowerCase().trim().replace(/\s+/g, '');
      const normalizedCorrect = correctAnswer.toLowerCase().trim().replace(/\s+/g, '');
      return normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser);
    }
  };
  
  // 计算两个字符串的相似度（Levenshtein距离）
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };
  
  // 计算编辑距离
  const getEditDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };
  
  // 提取代码的输出值（数组、对象、字符串等）
  const extractCodeOutput = (code: string): string | null => {
    try {
      // Python数组：a=[10, 20, 30] 或 data = [10, 20, 30]
      const pythonArrayMatch = code.match(/=\s*\[([^\]]+)\]/);
      if (pythonArrayMatch) {
        const values = pythonArrayMatch[1].trim();
        return `[${values}]`;
      }
      
      // JavaScript数组：let data = [10, 20, 30]
      const jsArrayMatch = code.match(/(?:let|const|var)\s+\w+\s*=\s*\[([^\]]+)\]/);
      if (jsArrayMatch) {
        const values = jsArrayMatch[1].trim();
        return `[${values}]`;
      }
      
      // Python对象/字典
      const pythonDictMatch = code.match(/=\s*\{([^}]+)\}/);
      if (pythonDictMatch) {
        const values = pythonDictMatch[1].trim();
        return `{${values}}`;
      }
      
      // for循环输出
      if (code.includes('for') && code.includes('print')) {
        return extractForLoopOutput(code);
      }
      
      return null;
    } catch {
      return null;
    }
  };
  
  // 提取for循环的输出
  const extractForLoopOutput = (code: string): string | null => {
    try {
      // 匹配 for i in range(...): print(...)
      const forMatch = code.match(/for\s+\w+\s+in\s+range\(([^)]+)\)/);
      const printMatch = code.match(/print\(([^)]+)\)/);
      
      if (!forMatch) return null;
      
      const rangeArgs = forMatch[1].split(',').map(s => parseInt(s.trim()));
      let start = 0, end = 0;
      
      if (rangeArgs.length === 1) {
        end = rangeArgs[0];
      } else if (rangeArgs.length === 2) {
        start = rangeArgs[0];
        end = rangeArgs[1];
      }
      
      // 检查print中是否有偏移
      let offset = 0;
      if (printMatch) {
        const offsetMatch = printMatch[1].match(/([+\-])(\d+)/);
        if (offsetMatch) {
          offset = offsetMatch[1] === '+' ? parseInt(offsetMatch[2]) : -parseInt(offsetMatch[2]);
        }
      }
      
      // 生成输出序列
      const output = [];
      for (let i = start; i < end; i++) {
        output.push(i + offset);
      }
      
      return output.join(',');
    } catch (error) {
      return null;
    }
  };

  const isEquivalentCode = (code1: string, code2: string): boolean => {
    // 检查函数定义的等价性（支持多种写法）
    const isFunctionDef1 = code1.includes('function') || code1.includes('=>');
    const isFunctionDef2 = code2.includes('function') || code2.includes('=>');
    
    if (isFunctionDef1 && isFunctionDef2) {
      // 提取函数名和返回值
      const extractFunctionInfo = (code: string) => {
        // function add(a, b) { return a + b; }
        const match1 = code.match(/function\s*(\w+)\s*\([^)]*\)\s*\{\s*return\s*([^;]+)/);
        if (match1) {
          return { name: match1[1], returnExpr: match1[2].trim() };
        }
        
        // const add = (a, b) => a + b
        const match2 = code.match(/(?:const|let|var)?\s*(\w+)\s*=\s*\([^)]*\)\s*=>\s*([^;]+)/);
        if (match2) {
          return { name: match2[1], returnExpr: match2[2].trim() };
        }
        
        // (a, b) => a + b
        const match3 = code.match(/\([^)]*\)\s*=>\s*([^;]+)/);
        if (match3) {
          return { name: 'anonymous', returnExpr: match3[1].trim() };
        }
        
        return null;
      };
      
      const info1 = extractFunctionInfo(code1);
      const info2 = extractFunctionInfo(code2);
      
      if (info1 && info2) {
        // 比较返回表达式（忽略空格）
        const expr1 = info1.returnExpr.replace(/\s+/g, '');
        const expr2 = info2.returnExpr.replace(/\s+/g, '');
        
        if (expr1 === expr2) {
          return true;
        }
      }
    }
    
    // 检查是否都是for循环
    const isForLoop1 = code1.includes('for') && code1.includes('range') && code1.includes('print');
    const isForLoop2 = code2.includes('for') && code2.includes('range') && code2.includes('print');
    
    if (isForLoop1 && isForLoop2) {
      // 提取循环的关键信息（更宽松的匹配）
      const extractLoopInfo = (code: string) => {
        // 匹配 range(start, end)
        const rangeMatch1 = code.match(/range\((\d+),\s*(\d+)\)/);
        if (rangeMatch1) {
          const start = parseInt(rangeMatch1[1]);
          const end = parseInt(rangeMatch1[2]);
          
          // 检查是否有 print(i+offset) 或 print(i-offset)
          const printMatch = code.match(/print\(\w+([+\-])(\d+)\)/);
          if (printMatch) {
            const op = printMatch[1];
            const offset = parseInt(printMatch[2]);
            if (op === '+') {
              return { start: start + offset, end: end - 1 + offset };
            } else {
              return { start: start - offset, end: end - 1 - offset };
            }
          }
          
          // 没有偏移，直接返回
          return { start, end: end - 1 };
        }
        
        // 匹配 range(end)
        const rangeMatch2 = code.match(/range\((\d+)\)/);
        if (rangeMatch2) {
          const end = parseInt(rangeMatch2[1]);
          
          // 检查是否有 print(i+offset) 或 print(i-offset)
          const printMatch = code.match(/print\(\w+([+\-])(\d+)\)/);
          if (printMatch) {
            const op = printMatch[1];
            const offset = parseInt(printMatch[2]);
            if (op === '+') {
              return { start: 0 + offset, end: end - 1 + offset };
            } else {
              return { start: 0 - offset, end: end - 1 - offset };
            }
          }
          
          // 没有偏移，从0开始
          return { start: 0, end: end - 1 };
        }
        
        return null;
      };

      const info1 = extractLoopInfo(code1);
      const info2 = extractLoopInfo(code2);
      
      // 如果两个循环输出相同的数字序列，则认为等价
      if (info1 && info2) {
        return info1.start === info2.start && info1.end === info2.end;
      }
    }

    // print语句的等价判断
    if (code1.includes('print') && code2.includes('print')) {
      // 提取print的内容（支持单引号和双引号）
      const extractPrintContent = (code: string) => {
        const match = code.match(/print\(['"](.*?)['"]\)/);
        return match ? match[1] : null;
      };
      
      const content1 = extractPrintContent(code1);
      const content2 = extractPrintContent(code2);
      
      if (content1 && content2 && content1 === content2) {
        return true;
      }
    }

    return false;
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'text-green-500';
      case 2: return 'text-yellow-500';
      case 3: return 'text-red-500';
      default: return 'text-slate-500';
    }
  };

  const getDifficultyText = (difficulty: number) => {
    switch (difficulty) {
      case 1: return '简单';
      case 2: return '中等';
      case 3: return '困难';
      default: return '未知';
    }
  };

  const getSubjectEmoji = (subject: string) => {
    switch (subject) {
      case 'math': return '🔢';
      case 'programming': return '💻';
      case 'logic': return '🧠';
      default: return '📚';
    }
  };

  // 获取倒计时颜色（适配60秒）
  const getTimeColor = () => {
    if (timeLeft <= 10) return 'text-red-500';      // 最后10秒红色
    if (timeLeft <= 20) return 'text-yellow-500';   // 20秒内黄色
    return 'text-green-500';                         // 其他时间绿色
  };

  return (
    <div className={`fixed inset-0 flex items-start sm:items-center justify-center z-[100] animate-fadeIn p-2 sm:p-4 pt-4 pb-32 sm:pb-4 overflow-y-auto ${
      isFailed ? 'bg-[#0a0e27]/95 backdrop-blur-sm' : 'bg-gradient-to-b from-[#0a0e27]/95 via-[#1a1e3e]/95 to-[#0a0e27]/95 backdrop-blur-sm'
    }`}>
      <div className={`rounded-xl max-w-2xl w-full border-2 sm:border-4 shadow-2xl animate-slideIn my-auto ${
        isFailed 
          ? 'bg-slate-800/95 backdrop-blur-md border-red-500/30' 
          : 'bg-slate-800 backdrop-blur-md border-slate-700'
      }`}>
        <div className="p-4 sm:p-8">
        {/* 题目区域 - 始终显示 */}
        <>
            {/* 进度条和倒计时 */}
            {totalQuestions > 1 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-500">
                    第 {currentIndex + 1} 题 / 共 {totalQuestions} 题
                  </span>
                  <span className={`text-sm font-bold ${getTimeColor()}`}>
                    <Timer className="w-4 h-4 inline mr-1" />{timeLeft}秒
                  </span>
                </div>
                <div className="w-full bg-blue-900/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-sky-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* 单题倒计时 */}
            {totalQuestions === 1 && (
              <div className="mb-4 flex justify-end">
                <span className={`text-lg font-bold ${getTimeColor()}`}>
                  <Timer className="w-4 h-4 inline mr-1" />{timeLeft}秒
                </span>
              </div>
            )}

            {/* 题目头部 - 移动端适配 */}
            <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                {isFailed ? <Skull className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" /> : <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />}
                <div>
                  <h2 className={`text-lg sm:text-2xl font-bold ${
                    isFailed ? 'text-red-500' : 'text-blue-400'
                  }`}>{isFailed ? '答题复活！' : '知识挑战'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs sm:text-sm font-medium ${getDifficultyColor(question.difficulty)}`}>
                      {getDifficultyText(question.difficulty)}
                    </span>
                    <span className="text-slate-500 text-xs sm:text-sm">
                      {question.subject === 'math' ? '数学' : 
                       question.subject === 'programming' ? '编程' : 
                       question.subject === 'chinese' ? '语文' :
                       question.subject === 'english' ? '英语' :
                       question.subject === 'science' ? '科学' :
                       question.subject === 'fun' ? '趣味' : '逻辑'}
                    </span>
                  </div>
                </div>
              </div>
              {!isFailed && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white active:text-gray-200 text-2xl font-bold p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>

            {/* 题目内容 */}
            <div className="mb-6 sm:mb-8">
              <p className="text-base sm:text-xl text-white mb-4 sm:mb-6 leading-relaxed">
                {question.question}
              </p>

              {/* 选择题 - 移动端优化触摸区域 */}
              {question.type === 'choice' && question.options && (
                <div className="space-y-2 sm:space-y-3">
                  {question.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all min-h-[48px] ${
                        selectedAnswer === option
                          ? 'border-blue-400 bg-blue-500/25 shadow-[0_0_10px_rgba(59,130,246,0.3)] ring-1 ring-blue-400/30'
                          : 'border-slate-600 hover:border-slate-600 active:border-blue-400 bg-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={selectedAnswer === option}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        className="mr-2 sm:mr-3 w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0"
                      />
                      <span className="text-white text-base sm:text-lg">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* 填空题 - 移动端优化 */}
              {(question.type === 'fill' || question.type === 'math') && (
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="请输入答案..."
                  className="w-full p-3 sm:p-4 text-base sm:text-lg bg-slate-700 border-2 border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                  autoFocus
                />
              )}

              {/* 编程题 - 移动端优化高度 */}
              {question.type === 'code' && (
                <div className="mb-4">
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="请输入代码..."
                    className="w-full h-40 sm:h-64 p-3 sm:p-4 text-sm sm:text-lg bg-gray-900 border-2 border-gray-600 rounded-lg text-green-400 focus:border-blue-400 focus:outline-none font-mono"
                    autoFocus
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            {/* 提交按钮 - 移动端全宽 */}
            {!showResult && (
              <div className="flex justify-center sm:justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={
                    (question.type === 'choice' && !selectedAnswer) ||
                    (question.type !== 'choice' && !userInput.trim())
                  }
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[48px] shadow-md"
                >
                  提交答案
                </button>
              </div>
            )}

          {/* 结果显示 - 在题目下方 */}
          {showResult && (
          <div className={`mt-6 text-center p-8 rounded-lg ${
            isFailed ? 'bg-red-900/30 border-2 border-red-500/30' : 'bg-blue-900/30'
          }`}>
            <div className="mb-6">
              {isCorrect ? (
                <div className="animate-bounce">
                  <div className="mb-4 animate-pulse flex justify-center"><CheckCircle2 className="w-20 h-20 text-green-400" strokeWidth={2.5} /></div>
                  <h3 className="text-4xl font-bold mb-3 text-green-400">答对了！</h3>
                  <p className="text-xl text-slate-500">太棒了，继续加油！</p>
                </div>
              ) : (
                <div className="animate-shake">
                  <div className="mb-4 flex justify-center"><XCircle className="w-20 h-20 text-red-500" strokeWidth={2.5} /></div>
                  <h3 className="text-4xl font-bold mb-3 text-red-400">
                    {timeLeft === 0 ? '超时了' : '答错了'}
                  </h3>
                  <p className="text-xl mb-4 text-slate-500">
                    {timeLeft === 0 ? '时间到了，再快一点！' : '不要气馁，再试一次！'}
                  </p>
                  <div className="bg-slate-800 p-4 rounded-lg text-left border border-slate-600">
                    <p className="text-white text-lg">
                      <strong className="text-blue-400">正确答案：</strong>
                      <span className="ml-2">
                        {Array.isArray(question.answer) 
                          ? question.answer.join(' 或 ') 
                          : question.answer}
                      </span>
                    </p>
                    {question.explanation && (
                      <p className="text-slate-500 mt-3 text-base">
                        <strong className="text-sky-500">解释：</strong>
                        <span className="ml-2">{question.explanation}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </>
        </div>
      </div>
    </div>
  );
}
