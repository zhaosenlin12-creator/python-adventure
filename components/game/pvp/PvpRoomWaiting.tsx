'use client';

/**
 * PVP 房间等待组件 - 重构版
 * 流程：房主创建 → 等待客人 → 客人加入显示 → 房主点击开始 → 双方倒计时
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, Users, Loader2, Play, User } from 'lucide-react';
import { usePvpStore } from '../../../store/pvpStore';
import { isAIOpponent } from '../../../types/pvp';
import { createPvpWebSocket, disconnectPvpWebSocket, PvpWebSocketClient } from '../../../lib/services/pvpWebSocket';
import { useAuthStore } from '../../../store/authStore';
import { getApiBaseUrl } from '../../../lib/config/api';

interface PvpRoomWaitingProps {
    onClose: () => void;
    onStartBattle: () => void;
}

export default function PvpRoomWaiting({ onClose, onStartBattle }: PvpRoomWaitingProps) {
    const [copied, setCopied] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [guestInfo, setGuestInfo] = useState<{ id: string; name: string } | null>(null);
    const [canStart, setCanStart] = useState(false);
    const [guestWsConnected, setGuestWsConnected] = useState(false); // 🔥 客人WebSocket是否已连接
    const wsRef = useRef<PvpWebSocketClient | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const wsConnectedRef = useRef(false); // 🔥 防止重复连接
    
    const { currentRoom, setRoomStatus } = usePvpStore();
    const { user } = useAuthStore();

    // 判断当前用户是房主还是客人（确保类型一致，都转为字符串比较）
    const myId = user?.id?.toString() || '';
    const hostId = currentRoom?.hostPlayer?.id?.toString() || '';
    const guestId = currentRoom?.guestPlayer?.id?.toString() || '';
    const isHost = hostId === myId && myId !== '';
    const isGuest = guestId === myId && myId !== '';
    


    // 复制房间ID - 添加错误处理和兼容性
    const handleCopy = useCallback(async () => {
        if (!currentRoom?.id) return;
        
        try {
            // 优先使用 Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(currentRoom.id);
            } else {
                // 回退方案：使用 execCommand
                const textArea = document.createElement('textarea');
                textArea.value = currentRoom.id;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('[PvpRoomWaiting] 复制失败:', err);
            // 显示房间号让用户手动复制
            alert(`房间号: ${currentRoom.id}\n请手动复制`);
        }
    }, [currentRoom?.id]);

    // 倒计时逻辑
    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) { onStartBattle(); return; }
        const t = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, onStartBattle]);

    // AI 对战自动开始
    useEffect(() => {
        if (currentRoom?.guestPlayer && isAIOpponent(currentRoom.guestPlayer)) {
            setTimeout(() => setCountdown(3), 500);
        }
    }, [currentRoom]);

    // 房主：轮询检查是否有客人加入
    useEffect(() => {
        if (!currentRoom?.id || !isHost || canStart) return;
        if (isAIOpponent(currentRoom?.guestPlayer)) return;

        const checkRoomStatus = async () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }
            try {
                const baseUrl = getApiBaseUrl();
                const res = await fetch(`${baseUrl}/pvp/rooms/${currentRoom.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'ready' && data.guest_name && !guestInfo) {
                        // 改用 guest_name 判断，因为 guest_id 可能是 0（falsy）
                        const guestIdStr = data.guest_id ? data.guest_id.toString() : '0';
                        setGuestInfo({ id: guestIdStr, name: data.guest_name || '对手' });
                        // 🔥 简化：客人加入后直接允许开始，后端会检查 WebSocket 连接
                        setCanStart(true);
                        setGuestWsConnected(true); // 假设客人已连接
                        setRoomStatus('ready');
                        
                        // 更新 store 中的 guestPlayer
                        usePvpStore.setState((state) => ({
                            currentRoom: state.currentRoom ? {
                                ...state.currentRoom,
                                guestPlayer: {
                                    id: guestIdStr,
                                    username: data.guest_name || '对手',
                                    avatar: '🎮',
                                    level: 1,
                                    skills: [],
                                    petType: data.guest_pet_type || 'code_kitty',
                                    petStage: data.guest_pet_stage || 3,
                                    petName: data.guest_pet_name || '对手伙伴',
                                },
                                status: 'ready',
                            } : null,
                        }));
                    }
                }
            } catch (err) {
                console.error('[PvpRoomWaiting] 检查房间状态失败:', err);
            }
        };

        const handleVisibilityRefresh = () => {
            if (document.visibilityState === 'visible') {
                void checkRoomStatus();
            }
        };

        pollingRef.current = setInterval(checkRoomStatus, 6000);
        checkRoomStatus();
        document.addEventListener('visibilitychange', handleVisibilityRefresh);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            document.removeEventListener('visibilitychange', handleVisibilityRefresh);
        };
    }, [currentRoom?.id, currentRoom?.guestPlayer, isHost, guestInfo, canStart, setRoomStatus]);

    // WebSocket 连接
    useEffect(() => {
        if (!currentRoom?.id || !user?.id) return;
        if (currentRoom.id === 'CREATING...') return;
        if (isAIOpponent(currentRoom?.guestPlayer)) return;
        
        // 防止重复连接
        if (wsConnectedRef.current && wsRef.current) return;

        wsConnectedRef.current = true;
        
        wsRef.current = createPvpWebSocket({
            roomId: currentRoom.id,
            playerId: user.id.toString(),
            onMessage: (msg) => {
                // 房主收到客人加入通知（通过 WebSocket）
                if (msg.type === 'player_joined' && isHost) {
                    const payload = msg.payload as any;
                    const guestId = payload?.user_id?.toString() || '0';
                    const guestName = payload?.username || '对手';
                    
                    setGuestInfo({ id: guestId, name: guestName });
                    setCanStart(true);
                    setGuestWsConnected(true);
                    setRoomStatus('ready');
                    
                    usePvpStore.setState((state) => ({
                            currentRoom: state.currentRoom ? {
                                ...state.currentRoom,
                                guestPlayer: {
                                    id: guestId,
                                    username: guestName,
                                    avatar: '🎮',
                                    level: 1,
                                    skills: [],
                                    petType: payload?.pet_type || 'code_kitty',
                                    petStage: payload?.pet_stage || 3,
                                    petName: payload?.pet_name || '对手伙伴',
                                },
                                status: 'ready',
                            } : null,
                    }));
                }
                
                // 房主收到客人 WebSocket 已连接的通知
                if (msg.type === 'guest_ws_connected' && isHost) {
                    setGuestWsConnected(true);
                    setCanStart(true);
                }
                
                // 收到错误消息
                if (msg.type === 'error') {
                    alert((msg as any).message || '操作失败');
                }
                
                // 双方收到开始对战通知
                if (msg.type === 'battle_start') {
                    setCountdown(3);
                }
            },
            onConnect: () => {},
            onDisconnect: () => {},
        });
        wsRef.current.connect();

        return () => {
            wsRef.current = null;
        };
    // 🔥 只依赖 roomId 和 userId，避免 guestPlayer 变化导致重连
    }, [currentRoom?.id, user?.id]);

    // 客人端：如果自己是客人，显示等待房主开始
    useEffect(() => {
        // 🔥 客人端：检查自己是否已经加入房间（guestPlayer.id === 自己的id）
        const myId = user?.id?.toString();
        const guestId = currentRoom?.guestPlayer?.id;
        const amIGuest = guestId === myId;
        
        if (amIGuest && currentRoom?.guestPlayer && !isAIOpponent(currentRoom.guestPlayer)) {
            setGuestInfo({ id: myId || '', name: user?.username || '我' });
            setCanStart(false);
        }
    }, [currentRoom?.guestPlayer, user]);

    // 房主点击开始
    const handleStartGame = useCallback(() => {
        if (!canStart || !wsRef.current) return;
        wsRef.current.send('player_ready', {});
        setCountdown(3);
    }, [canStart]);

    if (!currentRoom) return null;
    const isAI = currentRoom.guestPlayer && isAIOpponent(currentRoom.guestPlayer);
    const hostName = currentRoom.hostPlayer?.username || '房主';
    const guestName = guestInfo?.name || (isGuest ? user?.username : null);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 overflow-auto">
            <div className="bg-slate-800 backdrop-blur-md rounded-xl md:rounded-2xl w-full max-w-lg border-2 border-slate-700 shadow-lg">
                {/* 头部 - 移动端响应式 */}
                <div className="bg-blue-900/30 border-b border-slate-700 p-3 md:p-6 flex justify-between items-center rounded-t-xl md:rounded-t-2xl">
                    <div className="flex items-center gap-2 md:gap-3">
                        <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                        <h2 className="text-base md:text-xl font-bold text-white">对战房间</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                
                <div className="p-3 md:p-6 space-y-4 md:space-y-6">
                    {/* 房间ID（仅房主等待时显示）- 移动端响应式 */}
                    {isHost && !guestInfo && !isAI && (
                        <div className="bg-blue-900/30 rounded-lg md:rounded-xl p-3 md:p-4 text-center border border-slate-700">
                            <p className="text-slate-500 text-xs md:text-sm mb-1 md:mb-2">房间 ID（分享给好友）</p>
                            <div className="flex items-center justify-center gap-2 md:gap-3">
                                <span className="text-xl md:text-3xl font-mono font-bold text-blue-400 tracking-wider">
                                    {currentRoom.id}
                                </span>
                                <button
                                    onClick={handleCopy}
                                    className="p-1.5 md:p-2 bg-blue-900/20 hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                    {copied ? <Check className="w-4 h-4 md:w-5 md:h-5 text-green-400" /> : <Copy className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* VS 对战卡片 - 移动端响应式 */}
                    <div className="flex items-center justify-center gap-2 md:gap-4">
                        {/* 房主/玩家1 */}
                        <div className="flex-1 bg-blue-900/30 border border-blue-500/50 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-1 md:mb-2">
                                <User className="w-6 h-6 md:w-8 md:h-8 text-white" />
                            </div>
                            <p className="text-white font-bold text-sm md:text-base">{isHost ? '你' : hostName}</p>
                            <p className="text-blue-400 text-xs md:text-sm">{isHost ? '房主' : '对手'}</p>
                        </div>

                        {/* VS */}
                        <div className="text-xl md:text-3xl font-bold text-blue-400">VS</div>

                        {/* 客人/玩家2 */}
                        <div className={`flex-1 rounded-lg md:rounded-xl p-2 md:p-4 text-center ${
                            guestName 
                                ? 'bg-red-900/30 border border-red-500/30' 
                                : 'bg-slate-800 border border-slate-600 border-dashed'
                        }`}>
                            {guestName ? (
                                <>
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-1 md:mb-2">
                                        <User className="w-6 h-6 md:w-8 md:h-8 text-white" />
                                    </div>
                                    <p className="text-white font-bold text-sm md:text-base">{isGuest ? '你' : guestName}</p>
                                    <p className="text-red-400 text-xs md:text-sm">{isGuest ? '挑战者' : '对手'}</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-1 md:mb-2">
                                        <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-slate-400 animate-spin" />
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm md:text-base">等待加入</p>
                                    <p className="text-slate-500 text-xs md:text-sm">空位</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 状态/操作区 - 移动端响应式 */}
                    {countdown !== null ? (
                        <div className="text-center py-3 md:py-4">
                            <p className="text-slate-500 mb-1 md:mb-2 text-sm md:text-base">对战即将开始</p>
                            <span className="text-4xl md:text-6xl font-bold text-blue-400">{countdown}</span>
                        </div>
                    ) : isHost && canStart ? (
                        <button
                            onClick={handleStartGame}
                            className="w-full py-3 md:py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-lg md:rounded-xl hover:from-green-500 hover:to-blue-500 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                        >
                            <Play className="w-4 h-4 md:w-5 md:h-5" />
                            开始对战
                        </button>
                    ) : isHost && guestInfo && !guestWsConnected ? (
                        <div className="text-center py-3 md:py-4">
                            <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 animate-spin mx-auto mb-1 md:mb-2" />
                            <p className="text-yellow-400 text-sm md:text-base">对手正在连接中...</p>
                        </div>
                    ) : isGuest ? (
                        <div className="text-center py-3 md:py-4">
                            <p className="text-yellow-400 text-sm md:text-base">等待房主开始对战...</p>
                        </div>
                    ) : (
                        <div className="text-center py-3 md:py-4">
                            <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-orange-400 animate-spin mx-auto mb-1 md:mb-2" />
                            <p className="text-slate-500 text-sm md:text-base">{isAI ? '正在准备 AI 对战...' : '等待对手加入...'}</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
