"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Skull, HelpCircle } from "lucide-react";
import Icon from "@/components/ui/Icon";
import { useGameStore } from "@/store/gameStore";
import { useAuthStore } from "@/store/authStore";
import { useCoinStore } from "@/store/coinStore";
import { useFoodStore } from "@/store/foodStore";
import { addCoinsToServer } from "@/lib/api/coinAPI";
import confetti from "canvas-confetti";

// 音效 URL（使用免费音效）
const SOUNDS = {
    spin: '/sounds/button_click.wav',
    tick: '/sounds/button_hover.wav',
    win: '/sounds/level_complete.wav',
    lose: '/sounds/level_failed.wav',
};

interface FateSystemProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'reward' | 'punishment' | 'random';
}

type RewardItem = {
    id: string;
    name: string;
    color: string;
    desc: string;
    rewardType: 'coins' | 'food';
    amount?: number;
    foodId?: string;
    quantity?: number;
    iconType: 'ui' | 'img';
    icon: string;
};

type PunishmentItem = {
    id: string;
    name: string;
    icon: any;
    iconType: 'lucide';
    color: string;
    desc: string;
};

const REWARDS: RewardItem[] = [
    {
        id: 'coin_small',
        name: '金币奖励',
        color: 'text-yellow-400',
        desc: '+20 金币',
        rewardType: 'coins',
        amount: 20,
        iconType: 'ui',
        icon: 'coin'
    },
    {
        id: 'coin_medium',
        name: '金币奖励',
        color: 'text-yellow-300',
        desc: '+50 金币',
        rewardType: 'coins',
        amount: 50,
        iconType: 'ui',
        icon: 'coin'
    },
    {
        id: 'coin_large',
        name: '金币奖励',
        color: 'text-yellow-200',
        desc: '+100 金币',
        rewardType: 'coins',
        amount: 100,
        iconType: 'ui',
        icon: 'coin'
    },
    {
        id: 'food_basic',
        name: '宠物食物',
        color: 'text-blue-300',
        desc: '肉骨头 x2',
        rewardType: 'food',
        foodId: 'bone',
        quantity: 2,
        iconType: 'img',
        icon: '/icons/food/basic-food.svg'
    },
    {
        id: 'food_fresh',
        name: '宠物食物',
        color: 'text-green-300',
        desc: '苹果 x2',
        rewardType: 'food',
        foodId: 'apple',
        quantity: 2,
        iconType: 'img',
        icon: '/icons/food/snack.svg'
    },
    {
        id: 'food_rare',
        name: '高级食物',
        color: 'text-orange-300',
        desc: '蛋糕 x1',
        rewardType: 'food',
        foodId: 'cake',
        quantity: 1,
        iconType: 'img',
        icon: '/icons/food/premium-food.svg'
    },
    {
        id: 'food_epic',
        name: '稀有食物',
        color: 'text-purple-300',
        desc: '星星饼干 x1',
        rewardType: 'food',
        foodId: 'star_cookie',
        quantity: 1,
        iconType: 'img',
        icon: '/icons/food/special-food.svg'
    }
];

const PUNISHMENTS: PunishmentItem[] = [
    { id: 'bug_swarm', name: 'Bug Swarm', icon: Skull, iconType: 'lucide', color: 'text-red-500', desc: 'Screen glitch for 10s' },
    { id: 'syntax_curse', name: 'Syntax Curse', icon: Skull, iconType: 'lucide', color: 'text-green-500', desc: 'Fake errors appear' },
];

export default function FateSystem({ isOpen, onClose, type }: FateSystemProps) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<any>(null);
    const { addCoins } = useGameStore();
    const { token } = useAuthStore();
    const { loadBalance } = useCoinStore();
    const { addFood } = useFoodStore();
    const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 播放音效
    const playSound = (soundKey: keyof typeof SOUNDS) => {
        try {
            const audio = new Audio(SOUNDS[soundKey]);
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch {}
    };

    // 清理定时器
    useEffect(() => {
        return () => {
            if (tickIntervalRef.current) {
                clearInterval(tickIntervalRef.current);
            }
        };
    }, []);

    const handleSpin = () => {
        setIsSpinning(true);
        setResult(null);
        
        // 播放开始音效
        playSound('spin');
        
        // 转动时的滴答声
        tickIntervalRef.current = setInterval(() => {
            playSound('tick');
        }, 200);

        // Simulate spin delay
        setTimeout(() => {
            // 停止滴答声
            if (tickIntervalRef.current) {
                clearInterval(tickIntervalRef.current);
                tickIntervalRef.current = null;
            }
            
            if (type === 'punishment') {
                const randomItem = PUNISHMENTS[Math.floor(Math.random() * PUNISHMENTS.length)];
                setResult(randomItem);
                setIsSpinning(false);
                // 惩罚音效
                playSound('lose');
                return;
            }

            const randomItem = REWARDS[Math.floor(Math.random() * REWARDS.length)];
            setResult(randomItem);
            setIsSpinning(false);

            {
                // 播放胜利音效
                playSound('win');
                
                // 撒花效果 - 更丰富
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                setTimeout(() => {
                    confetti({
                        particleCount: 50,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 }
                    });
                }, 200);
                setTimeout(() => {
                    confetti({
                        particleCount: 50,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 }
                    });
                }, 400);
                
                if (randomItem.rewardType === 'coins' && randomItem.amount) {
                    addCoins(randomItem.amount);
                    if (token) {
                        addCoinsToServer(randomItem.amount, 'wheel_spin', '幸运转盘奖励', token)
                            .then(() => loadBalance(token).catch(() => {}))
                            .catch((error) => {
                                console.error('[FateSystem] Failed to sync coins:', error);
                            });
                    }
                }
                if (randomItem.rewardType === 'food' && randomItem.foodId && randomItem.quantity && token) {
                    addFood(randomItem.foodId, randomItem.quantity, token).catch((error) => {
                        console.error('[FateSystem] Failed to grant food reward:', error);
                    });
                }
            }
        }, 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, y: 50 }}
                        className="w-full max-w-md bg-slate-800 backdrop-blur-md border-2 border-slate-700 rounded-xl p-6 relative overflow-hidden shadow-lg"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-pixel text-blue-400 mb-2">
                                {type === 'punishment' ? 'FATE\'S JUDGMENT' : 'WHEEL OF FORTUNE'}
                            </h2>
                            <p className="text-slate-500">
                                {type === 'punishment' ? 'Will you survive the curse?' : 'Spin for legendary loot!'}
                            </p>
                        </div>

                        <div className="flex justify-center mb-8">
                            <div className="w-48 h-48 bg-blue-900/30 rounded-full border-8 border-slate-700 flex items-center justify-center relative">
                                {isSpinning ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                                        className="w-full h-full rounded-full border-t-4 border-blue-600"
                                    />
                                ) : result ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="text-center"
                                    >
                                        {result.iconType === 'img' && (
                                            <img
                                                src={result.icon}
                                                alt={result.name}
                                                className="w-16 h-16 mx-auto mb-2"
                                            />
                                        )}
                                        {result.iconType === 'lucide' && result.icon && (
                                            <result.icon className={`w-16 h-16 mx-auto mb-2 ${result.color}`} />
                                        )}
                                        {result.iconType === 'ui' && (
                                            <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                                                <Icon name={result.icon} size={64} />
                                            </div>
                                        )}
                                        {!result.iconType && (
                                            <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                                                <Icon name={result.icon} size={64} />
                                            </div>
                                        )}
                                        <div className={`font-bold ${result.color}`}>{result.name}</div>
                                        <div className="text-xs text-slate-400">{result.desc}</div>
                                    </motion.div>
                                ) : (
                                    <HelpCircle className="w-16 h-16 text-slate-300" />
                                )}
                            </div>
                        </div>

                        {!result && !isSpinning && (
                            <button
                                onClick={handleSpin}
                                className="w-full pixel-btn bg-purple-600 hover:bg-purple-500"
                            >
                                SPIN NOW
                            </button>
                        )}

                        {result && (
                            <button
                                onClick={onClose}
                                className="w-full pixel-btn bg-slate-600 hover:bg-slate-500"
                            >
                                CLAIM & CLOSE
                            </button>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
