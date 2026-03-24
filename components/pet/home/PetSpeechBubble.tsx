'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PetSpeechBubbleProps {
  petName: string;
  mood?: string;  // 支持所有 PetMood 类型
  onInteraction?: () => void;
}

// 不同心情的对话内容
const SPEECHES: Record<string, string[]> = {
  happy: [
    '今天心情超好！✨',
    '和你在一起真开心～',
    '想要一起玩耍！🎮',
    '嘿嘿，最喜欢你了！💕',
    '学习也要记得休息哦～',
  ],
  excited: [
    '太棒啦！！！🎉',
    '耶耶耶！超级开心！🌟',
    '我们做到了！✨',
    '哇哦！好厉害！🎊',
  ],
  sad: [
    '呜呜...好难过 😢',
    '没关系的，下次一定行！',
    '需要一个拥抱...',
    '加油，不要放弃哦～',
  ],
  curious: [
    '嗯？这是什么？🔍',
    '好有趣呀～想看看！',
    '你发现了什么？👀',
    '让我想想...🤔',
  ],
  eating: [
    '好吃好吃！🍖',
    '谢谢投喂～😋',
    '嗯嗯，真好吃！',
    '吃饱了才有力气～',
  ],
  playing: [
    '玩耍时间到！🎮',
    '一起来玩吧！🎯',
    '好好玩呀～🎪',
    '再来再来！🎲',
  ],
  hungry: [
    '肚子有点饿了...',
    '想吃点好吃的～🍖',
    '有食物吗？👀',
    '饿饿，饭饭！',
  ],
  tired: [
    '有点累了...💤',
    '想休息一下～',
    '打个小盹儿...',
    'zzZ...',
  ],
  sleeping: [
    'zzZ...💤',
    '做了个好梦～',
    '呼噜呼噜...',
  ],
  normal: [
    '今天天气真好呀～☀️',
    '你在做什么呢？',
    '一起加油吧！💪',
    '有什么新鲜事吗？',
    '想要摸摸头～',
    '嗯嗯！😊',
  ],
  greeting: [
    'What\'s up ?',
    '嗨～你来啦！',
    '欢迎回来！🏠',
    '见到你真高兴！',
  ]
};

/**
 * 💬 宠物说话气泡组件
 * 随机显示可爱的对话，增加互动感
 */
export default function PetSpeechBubble({ petName, mood = 'normal', onInteraction }: PetSpeechBubbleProps) {
  const [currentSpeech, setCurrentSpeech] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [bubbleType, setBubbleType] = useState<'speech' | 'thought'>('speech');
  
  // 随机显示气泡
  useEffect(() => {
    const showBubble = () => {
      // 70%概率显示
      if (Math.random() < 0.7) {
      const speeches = SPEECHES[mood] || SPEECHES.normal;
        const randomSpeech = speeches[Math.floor(Math.random() * speeches.length)];
        setCurrentSpeech(randomSpeech);
        setBubbleType(Math.random() > 0.3 ? 'speech' : 'thought');
        setIsVisible(true);
        
        // 3-5秒后隐藏
        setTimeout(() => {
          setIsVisible(false);
        }, 3000 + Math.random() * 2000);
      }
    };
    
    // 初始显示greeting
    const greetings = SPEECHES.greeting;
    setCurrentSpeech(greetings[Math.floor(Math.random() * greetings.length)]);
    setIsVisible(true);
    setTimeout(() => setIsVisible(false), 3000);
    
    // 每8-15秒随机触发
    const interval = setInterval(() => {
      showBubble();
    }, 8000 + Math.random() * 7000);
    
    return () => clearInterval(interval);
  }, [mood]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute -top-16 left-1/2 z-40"
          initial={{ opacity: 0, y: 10, scale: 0.8, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: -10, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={onInteraction}
        >
          {bubbleType === 'speech' ? (
            <SpeechBubble text={currentSpeech} />
          ) : (
            <ThoughtBubble text={currentSpeech} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 说话气泡
function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="relative">
      <div className="bg-white rounded-2xl px-4 py-2 shadow-lg border-2 border-slate-200 min-w-[120px] max-w-[200px]">
        <p className="text-sm text-slate-700 font-medium text-center whitespace-nowrap">
          {text}
        </p>
      </div>
      {/* 气泡尾巴 */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        <svg width="20" height="10" viewBox="0 0 20 10">
          <path d="M0 0 L10 10 L20 0" fill="white" stroke="#e2e8f0" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

// 思考气泡
function ThoughtBubble({ text }: { text: string }) {
  return (
    <div className="relative">
      <div className="bg-white rounded-full px-4 py-2 shadow-lg border-2 border-slate-200 min-w-[100px]">
        <p className="text-sm text-slate-600 italic text-center">
          {text}
        </p>
      </div>
      {/* 思考泡泡 */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
        <div className="w-3 h-3 bg-white rounded-full border border-slate-200" />
        <div className="w-2 h-2 bg-white rounded-full border border-slate-200 mt-1" />
      </div>
    </div>
  );
}
