"use client";

/**
 * 登录/注册模态框
 * v4.0: 暗色像素风主题
 * - 游戏平台装饰
 * - 暗蓝渐变背景
 * - SVG 专业图标
 * - 流畅的动画效果
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';


// 像素方块装饰
function PixelBlock({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
    return (
        <motion.div
            className="absolute w-4 h-4 pointer-events-none"
            style={{ 
                left: `${x}%`, 
                top: `${y}%`,
                backgroundColor: color,
                boxShadow: `0 2px 0 ${color}88`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ delay, duration: 0.5 }}
        />
    );
}

// 游戏平台组件
function GamePlatform({ left, bottom, width, variant }: { 
    left: string; 
    bottom: string; 
    width: number;
    variant: 'grass' | 'stone' | 'gold';
}) {
    const colors = {
        grass: 'from-green-600 via-green-500 to-green-600',
        stone: 'from-gray-600 via-gray-500 to-gray-600',
        gold: 'from-yellow-600 via-yellow-400 to-yellow-600',
    };
    
    return (
        <motion.div 
            className={`absolute h-4 bg-gradient-to-r ${colors[variant]} rounded-sm pointer-events-none`}
            style={{ left, bottom, width }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.5, x: 0 }}
            transition={{ duration: 0.8, delay: Math.random() * 0.5 }}
        >
            {/* 平台顶部高光 */}
            <div className="absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t-sm" />
        </motion.div>
    );
}


export default function AuthModal() {
    const [isLogin, setIsLogin] = useState(true);
    const [showElements, setShowElements] = useState(false);

    // 延迟显示装饰元素，优先加载表单
    useEffect(() => {
        const timer = setTimeout(() => setShowElements(true), 200);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            {/* 暗蓝渐变背景 */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27]" />
            
            
            {/* 装饰性柔光 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
            
            {/* 中心光环 */}
            <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(122,162,247,0.12) 0%, transparent 70%)',
                }}
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            
            {/* 游戏平台装饰 */}
            {showElements && (
                <>
                    <GamePlatform left="3%" bottom="15%" width={100} variant="grass" />
                    <GamePlatform left="88%" bottom="25%" width={80} variant="stone" />
                    <GamePlatform left="8%" bottom="75%" width={70} variant="gold" />
                    <GamePlatform left="82%" bottom="70%" width={90} variant="grass" />
                    <GamePlatform left="15%" bottom="45%" width={60} variant="stone" />
                    <GamePlatform left="78%" bottom="50%" width={75} variant="gold" />
                </>
            )}
            
            {/* 像素方块装饰 */}
            {showElements && (
                <>
                    <PixelBlock x={5} y={20} color="#4ade80" delay={0.1} />
                    <PixelBlock x={92} y={35} color="#60a5fa" delay={0.2} />
                    <PixelBlock x={8} y={65} color="#fbbf24" delay={0.3} />
                    <PixelBlock x={88} y={80} color="#f472b6" delay={0.4} />
                    <PixelBlock x={3} y={45} color="#a78bfa" delay={0.5} />
                    <PixelBlock x={95} y={55} color="#34d399" delay={0.6} />
                </>
            )}
            
            
            {/* 顶部标题已移除，改为在表单内显示 */}
            
            {/* 底部特色展示 - 下移确保不被遮挡 */}
            {showElements && (
                <motion.div 
                    className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-20"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                >
                    <div className="flex gap-6 sm:gap-10 text-center">
                        {[
                            { icon: '/assets/theme/gamepad.svg', label: '趣味闯关', color: 'from-green-400 to-blue-500' },
                            { icon: '/assets/theme/code-icon.svg', label: 'Python学习', color: 'from-blue-400 to-cyan-500' },
                            { icon: '/assets/theme/swords.svg', label: 'PK对战', color: 'from-orange-400 to-amber-500' },
                            { icon: '/assets/theme/palette.svg', label: '创意工坊', color: 'from-purple-400 to-pink-500' },
                        ].map((item, i) => (
                            <motion.div 
                                key={item.label}
                                className="flex flex-col items-center group"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                whileHover={{ scale: 1.1 }}
                            >
                                <div className="w-8 h-8 sm:w-10 sm:h-10 mb-1 filter drop-shadow-lg">
                                    <img src={item.icon} alt={item.label} className="w-full h-full" />
                                </div>
                                <span className={`text-[10px] sm:text-xs font-medium text-transparent bg-clip-text bg-gradient-to-r ${item.color}`}>
                                    {item.label}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
            
            {/* 登录/注册表单 - 统一宽度控制 */}
            <motion.div 
                className="relative z-10 w-[480px] max-w-[calc(100vw-2rem)]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                {isLogin ? (
                    <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
                ) : (
                    <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
                )}
            </motion.div>
        </div>
    );
}
