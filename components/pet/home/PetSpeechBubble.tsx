'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface PetSpeechBubbleProps {
  petName: string;
  mood?: string;
  onInteraction?: () => void;
}

type BubbleKind = 'speech' | 'thought';

const SPEECHES: Record<string, string[]> = {
  happy: [
    '今天状态很好，想多陪你一会儿。',
    '和你待在一起的时候最舒服。',
    '这个小屋越来越像家了。',
    '再陪我玩一会儿吧。',
  ],
  excited: [
    '我已经准备好继续冒险了。',
    '刚刚那一下互动很有精神。',
    '今天想表现得更厉害一点。',
    '继续继续，我现在超有劲。',
  ],
  sad: [
    '抱一下就会好很多。',
    '今天想安静地陪在你身边。',
    '慢一点也没关系，我们一起调整。',
    '如果能再摸摸我，我会安心很多。',
  ],
  curious: [
    '那边的新摆设我还想再看看。',
    '庭院里好像又有新变化。',
    '你是不是准备了新的惊喜给我？',
    '我感觉这里还有很多可以探索。',
  ],
  eating: [
    '这份食物很合胃口。',
    '补充完体力，状态好多了。',
    '谢谢你准备的这份补给。',
    '吃饱之后就更想活动了。',
  ],
  playing: [
    '今天的互动很有趣。',
    '再来一次，我还没玩够。',
    '和你玩的时候最放松。',
    '现在的小屋气氛正合适。',
  ],
  hungry: [
    '有点饿了，想吃点东西。',
    '如果能补充一下体力就好了。',
    '背包里还有食物吗？',
    '我想先吃点东西再继续。',
  ],
  tired: [
    '我想慢一点走，休息一下。',
    '今天适合陪伴，不太适合冲太快。',
    '先在小屋里放松一会儿吧。',
    '有你在旁边，我就不着急。',
  ],
  sleeping: [
    '先安静休息一下。',
    '这里的氛围很适合打盹。',
    '让我把体力慢慢恢复回来。',
  ],
  normal: [
    '今天也一起把小屋照顾好吧。',
    '你来了，我就安心了。',
    '我想先陪你逛逛这里。',
    '如果有新装饰，我想第一个看到。',
  ],
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function createGreeting(petName: string) {
  return [
    `${petName} 已经在等你了。`,
    `欢迎回来，${petName} 今天状态不错。`,
    `${petName} 想先陪你在小屋里走走。`,
  ];
}

export default function PetSpeechBubble({
  petName,
  mood = 'normal',
  onInteraction,
}: PetSpeechBubbleProps) {
  const [currentSpeech, setCurrentSpeech] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [bubbleKind, setBubbleKind] = useState<BubbleKind>('speech');
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  const speechPool = useMemo(() => SPEECHES[mood] || SPEECHES.normal, [mood]);
  const greetings = useMemo(() => createGreeting(petName), [petName]);

  useEffect(() => {
    const clearTimers = () => {
      if (showTimeoutRef.current) {
        window.clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const revealBubble = (message: string, kind: BubbleKind) => {
      setCurrentSpeech(message);
      setBubbleKind(kind);
      setIsVisible(true);

      hideTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
        hideTimeoutRef.current = null;
      }, 2600 + Math.floor(Math.random() * 1400));
    };

    const scheduleNext = () => {
      showTimeoutRef.current = window.setTimeout(() => {
        const shouldShow = Math.random() < 0.64;
        if (shouldShow) {
          revealBubble(pickRandom(speechPool), Math.random() < 0.74 ? 'speech' : 'thought');
        }
        scheduleNext();
      }, 12000 + Math.floor(Math.random() * 7000));
    };

    revealBubble(pickRandom(greetings), 'speech');
    scheduleNext();

    return clearTimers;
  }, [greetings, speechPool]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute left-1/2 top-[-76px] z-40"
          initial={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: -8, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          onClick={onInteraction}
        >
          {bubbleKind === 'speech' ? (
            <SpeechBubble text={currentSpeech} />
          ) : (
            <ThoughtBubble text={currentSpeech} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="relative">
      <div className="min-w-[156px] max-w-[240px] rounded-[24px] border border-cyan-300/26 bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(2,6,23,0.94))] px-4 py-3 shadow-[0_20px_44px_rgba(2,6,23,0.34)] backdrop-blur-sm">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
          Companion Voice
        </div>
        <p className="mt-1 text-center text-sm font-medium leading-6 text-slate-100">{text}</p>
      </div>
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
        <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
          <path
            d="M3 1C8.5 4.5 11.5 8 14 15C16.5 8 19.5 4.5 25 1"
            fill="rgba(2,6,23,0.95)"
            stroke="rgba(103,232,249,0.34)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

function ThoughtBubble({ text }: { text: string }) {
  return (
    <div className="relative">
      <div className="min-w-[144px] max-w-[228px] rounded-full border border-violet-300/22 bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,27,75,0.92))] px-5 py-3 shadow-[0_20px_44px_rgba(15,23,42,0.3)] backdrop-blur-sm">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/65">
          Quiet Thought
        </div>
        <p className="mt-1 text-center text-sm italic leading-6 text-slate-100">{text}</p>
      </div>
      <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-1.5">
        <div className="h-3.5 w-3.5 rounded-full border border-violet-300/20 bg-slate-950/90" />
        <div className="mb-[-2px] h-2.5 w-2.5 rounded-full border border-violet-300/18 bg-slate-950/88" />
      </div>
    </div>
  );
}
