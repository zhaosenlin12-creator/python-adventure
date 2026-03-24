'use client';

/**
 * PVP 大厅组件
 * Requirements: 1.1, 1.2, 1.3
 * 🤖 AI接管方案：移除"继续挑战"功能，断线=判负
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Bot, Plus, LogIn, Swords, Trophy, Wifi } from 'lucide-react';
import { usePvpStore, canJoinRoom } from '../../../store/pvpStore';
import { useGameStore } from '../../../store/gameStore';
import { useAuthStore } from '../../../store/authStore';
import { RoomInfo, PlayerInfo, Difficulty, isValidRoomId } from '../../../types/pvp';
import { getApiBaseUrl } from '../../../lib/config/api';

interface PvpLobbyProps {
    onClose: () => void;
    onStartBattle: (roomId: string) => void;
}

export default function PvpLobby({ onClose, onStartBattle }: PvpLobbyProps) {
    const [activeTab, setActiveTab] = useState<'create' | 'join' | 'ai'>('ai');
    const [roomIdInput, setRoomIdInput] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
    const [error, setError] = useState<string | null>(null);

    const { user, token } = useAuthStore();
    const { skills, level } = useGameStore();
    const {
        currentRoom,
        availableRooms,
        wsConnected,
        existingRoomId,
        createRoom,
        joinRoom,
        startAIBattle,
        leaveRoom,
        setError: setPvpError,
    } = usePvpStore();
    
    // 🔥 监听 store 中的错误
    const pvpStoreError = usePvpStore((state) => state.error);

    // 创建玩家信息
    const createPlayerInfo = (): PlayerInfo => {
        return {
            id: user?.id?.toString() || `guest_${Date.now()}`,
            username: user?.username || '访客',
            avatar: '🎮',
            level: level,
            skills: skills,
        };
    };

    // 创建房间
    const [isCreating, setIsCreating] = useState(false);
    
    const handleCreateRoom = () => {
        setError(null);
        setIsCreating(true);
        const player = createPlayerInfo();
        createRoom(player);
    };
    
    // 🔥🔥🔥 关闭已存在的房间
    const handleCloseExistingRoom = () => {
        leaveRoom();
        setError(null);
        usePvpStore.setState({ existingRoomId: null, error: null });
    };
    
    // 🔥🔥🔥 进入已存在的房间
    const handleEnterExistingRoom = () => {
        if (existingRoomId) {
            onStartBattle(existingRoomId);
        }
    };
    
    // 🔥 监听房间创建成功 - 等待后端返回真正的房间ID
    useEffect(() => {
        if (isCreating && currentRoom && currentRoom.id !== 'CREATING...') {
            if (pvpStoreError && existingRoomId) {
                setIsCreating(false);
                setError(pvpStoreError);
                return;
            }
            setIsCreating(false);
            onStartBattle(currentRoom.id);
        }
    }, [isCreating, currentRoom, onStartBattle, pvpStoreError, existingRoomId]);

    // 加入房间
    const [isJoining, setIsJoining] = useState(false);
    const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
    
    const handleJoinRoom = async () => {
        setError(null);
        const trimmedId = roomIdInput.trim().toUpperCase();
        
        if (!isValidRoomId(trimmedId)) {
            setError('请输入有效的房间 ID（6位字母数字）');
            return;
        }

        const player = createPlayerInfo();
        setIsJoining(true);
        setPendingRoomId(trimmedId);
        
        // 调用 joinRoom（异步操作）
        joinRoom(trimmedId, player);
    };
    
    // 监听加入房间成功 - 检查 currentRoom 变化
    useEffect(() => {
        if (isJoining && pendingRoomId && currentRoom) {
            if (currentRoom.id === pendingRoomId || currentRoom.status === 'ready') {
                setIsJoining(false);
                setPendingRoomId(null);
                onStartBattle(currentRoom.id);
            }
        }
    }, [currentRoom, currentRoom?.id, currentRoom?.status, isJoining, pendingRoomId, onStartBattle]);
    
    // 监听错误
    const pvpError = usePvpStore((state) => state.error);
    useEffect(() => {
        if (pvpError && isJoining) {
            setError(pvpError);
            setIsJoining(false);
            setPendingRoomId(null);
        }
    }, [pvpError, isJoining]);

    // 开始 AI 对战
    const handleStartAIBattle = () => {
        setError(null);
        const player = createPlayerInfo();
        startAIBattle(player, selectedDifficulty);
        
        // 直接开始对战
        setTimeout(() => {
            const { currentRoom } = usePvpStore.getState();
            if (currentRoom) {
                onStartBattle(currentRoom.id);
            }
        }, 100);
    };


    const difficultyConfig = {
        easy: { label: '简单', color: 'text-green-400', bg: 'bg-green-500/20', desc: '适合新手练习' },
        medium: { label: '中等', color: 'text-yellow-400', bg: 'bg-yellow-500/20', desc: '平衡的挑战' },
        hard: { label: '困难', color: 'text-red-400', bg: 'bg-red-500/20', desc: '高手对决' },
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-800 backdrop-blur-md rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-lg border-2 border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="bg-blue-900/30 border-b border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Swords className="w-8 h-8 text-blue-400" />
                            <div>
                                <h2 className="text-2xl font-bold text-white">PVP 对战</h2>
                                <p className="text-blue-400 text-sm">三轮制竞技挑战</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* 标签页 */}
                <div className="flex border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'ai'
                                ? 'bg-blue-900/30 text-blue-400 border-b-2 border-blue-600'
                                : 'text-slate-400 hover:text-white hover:bg-blue-700/50'
                        }`}
                    >
                        <Bot className="w-5 h-5" />
                        <span>人机对战</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'create'
                                ? 'bg-blue-900/30 text-blue-400 border-b-2 border-blue-600'
                                : 'text-slate-400 hover:text-white hover:bg-blue-700/50'
                        }`}
                    >
                        <Plus className="w-5 h-5" />
                        <span>创建房间</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('join')}
                        className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'join'
                                ? 'bg-blue-900/30 text-blue-400 border-b-2 border-blue-600'
                                : 'text-slate-400 hover:text-white hover:bg-blue-700/50'
                        }`}
                    >
                        <LogIn className="w-5 h-5" />
                        <span>加入房间</span>
                    </button>
                </div>

                {/* 内容区 */}
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {/* AI 对战 */}
                        {activeTab === 'ai' && (
                            <motion.div
                                key="ai"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-white mb-2">选择 AI 难度</h3>
                                    <p className="text-slate-500">与 AI 对手进行三轮制对战</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    {(Object.keys(difficultyConfig) as Difficulty[]).map((diff) => (
                                        <button
                                            key={diff}
                                            onClick={() => setSelectedDifficulty(diff)}
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                                selectedDifficulty === diff
                                                    ? `${difficultyConfig[diff].bg} border-current ${difficultyConfig[diff].color}`
                                                    : 'border-slate-700 hover:border-blue-500'
                                            }`}
                                        >
                                            <div className={`text-2xl font-bold ${difficultyConfig[diff].color}`}>
                                                {difficultyConfig[diff].label}
                                            </div>
                                            <div className="text-sm text-slate-500 mt-1">
                                                {difficultyConfig[diff].desc}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleStartAIBattle}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-xl hover:from-blue-500 hover:to-teal-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                                >
                                    <Swords className="w-5 h-5" />
                                    开始对战
                                </button>
                            </motion.div>
                        )}

                        {/* 创建房间 */}
                        {activeTab === 'create' && (
                            <motion.div
                                key="create"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-white mb-2">创建对战房间</h3>
                                    <p className="text-slate-500">创建房间后分享 ID 给好友</p>
                                </div>

                                {/* 🔥🔥🔥 已存在房间提示 - 简化版，只有进入按钮 */}
                                {existingRoomId && error && (
                                    <div className="bg-blue-900/30 rounded-xl p-6 border border-slate-700">
                                        <div className="text-center mb-4">
                                            <p className="text-blue-400 font-bold mb-2">🎮 您有一个等待中的房间</p>
                                            <p className="text-slate-500 text-sm">房间正在等待对手加入，点击下方按钮进入</p>
                                        </div>
                                        <div className="bg-slate-700 rounded-lg p-4 mb-4 border border-slate-700">
                                            <p className="text-slate-500 text-sm mb-1">房间 ID</p>
                                            <p className="text-3xl font-mono font-bold text-blue-400 tracking-wider">
                                                {existingRoomId}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleEnterExistingRoom}
                                            className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-700 text-white font-bold rounded-xl hover:from-green-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                                        >
                                            <LogIn className="w-5 h-5" />
                                            进入房间
                                        </button>
                                        <p className="text-slate-400 text-xs text-center mt-3">
                                            💡 提示：房间会在5分钟无人加入后自动关闭
                                        </p>
                                    </div>
                                )}

                                {/* 正常显示房间或创建按钮 */}
                                {!existingRoomId && (
                                    <>
                                        {currentRoom && currentRoom.id !== 'CREATING...' ? (
                                            <div className="bg-blue-900/30 rounded-xl p-6 text-center border border-slate-700">
                                                <p className="text-slate-500 mb-2">房间 ID</p>
                                                <p className="text-4xl font-mono font-bold text-blue-400 tracking-wider">
                                                    {currentRoom.id}
                                                </p>
                                                <p className="text-slate-400 mt-4">等待对手加入...</p>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleCreateRoom}
                                                disabled={isCreating}
                                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isCreating ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        创建中...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-5 h-5" />
                                                        创建房间
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        )}

                        {/* 加入房间 */}
                        {activeTab === 'join' && (
                            <motion.div
                                key="join"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-white mb-2">加入对战房间</h3>
                                    <p className="text-slate-500">输入好友分享的房间 ID</p>
                                </div>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={roomIdInput}
                                        onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                                        placeholder="输入房间 ID"
                                        maxLength={6}
                                        className="w-full px-4 py-4 bg-blue-900/30 border border-slate-700 rounded-xl text-white text-center text-2xl font-mono tracking-wider placeholder-slate-400 focus:outline-none focus:border-blue-400"
                                    />

                                    {error && (
                                        <p className="text-red-400 text-center text-sm">{error}</p>
                                    )}

                                    <button
                                        onClick={handleJoinRoom}
                                        disabled={roomIdInput.length !== 6}
                                        className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-700 text-white font-bold rounded-xl hover:from-green-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <LogIn className="w-5 h-5" />
                                        加入房间
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 底部信息 */}
                <div className="border-t border-slate-700 p-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Trophy className="w-4 h-4" />
                        <span>三轮制: 对战 → 答题 → 编程</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                        <Wifi className="w-4 h-4" />
                        <span>在线</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
