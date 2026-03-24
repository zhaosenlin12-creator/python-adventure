"use client";

/**
 * 在线玩家列表组件
 * 🔥 v2.0: 添加分页功能（每页10人）、玩家状态显示
 * 仅在开放大厅显示
 */

import { useState, useMemo } from 'react';
import { useChatStore } from '@/store/chatStore';
import { ChevronLeft, ChevronRight, Users, MessageCircle } from 'lucide-react';

interface OnlinePlayer {
    user_id: number;
    username: string;
    level: number;
    rank_title: string;
    x: number;
    y: number;
    status?: 'lobby' | 'campaign' | 'editor' | 'pvp';  // 玩家状态
}

interface Props {
    players: OnlinePlayer[];
    currentUserId: number;
    mapArea?: string;
}

const PLAYERS_PER_PAGE = 10;

// 状态显示配置
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    lobby: { label: '大厅', color: 'text-green-400', icon: '🏠' },
    campaign: { label: '战役', color: 'text-orange-400', icon: '⚔️' },
    editor: { label: '创作', color: 'text-purple-400', icon: '🎨' },
    pvp: { label: 'PK', color: 'text-red-400', icon: '🎮' },
};

export default function OnlinePlayersList({ players, currentUserId, mapArea = "开放世界" }: Props) {
    const { setActivePrivateChat, setOpen } = useChatStore();
    const [currentPage, setCurrentPage] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // 过滤掉当前用户
    const otherPlayers = useMemo(() => 
        players.filter(p => p.user_id !== currentUserId),
        [players, currentUserId]
    );

    // 计算分页
    const totalPages = Math.ceil(otherPlayers.length / PLAYERS_PER_PAGE);
    const currentPlayers = useMemo(() => {
        const start = currentPage * PLAYERS_PER_PAGE;
        return otherPlayers.slice(start, start + PLAYERS_PER_PAGE);
    }, [otherPlayers, currentPage]);

    // 点击玩家发起私聊
    const handleClickPlayer = (userId: number) => {
        setActivePrivateChat(userId);
        setOpen(true);
    };

    // 翻页
    const goToPrevPage = () => {
        setCurrentPage(prev => Math.max(0, prev - 1));
    };

    const goToNextPage = () => {
        setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
    };

    // 获取玩家状态显示
    const getStatusDisplay = (status?: string) => {
        const config = STATUS_CONFIG[status || 'lobby'] || STATUS_CONFIG.lobby;
        return config;
    };

    return (
        <div className="fixed top-4 right-4 bg-slate-800 backdrop-blur-sm rounded-lg text-white text-sm select-none z-10 min-w-[180px] max-w-[220px] border border-slate-700 shadow-lg">
            {/* 标题栏 - 可点击展开/收起 */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-700 transition-colors rounded-t-lg"
            >
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-blue-400">在线玩家</span>
                    <span className="text-blue-400 text-xs">({otherPlayers.length})</span>
                </div>
                <ChevronRight 
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
            </button>
            
            {/* 展开的玩家列表 */}
            {isExpanded && (
                <div className="border-t border-slate-700">
                    {otherPlayers.length === 0 ? (
                        <div className="text-slate-400 text-xs py-3 px-3 text-center">
                            暂无其他玩家在线
                        </div>
                    ) : (
                        <>
                            {/* 玩家列表 */}
                            <div className="py-1 max-h-[300px] overflow-y-auto">
                                {currentPlayers.map((player) => {
                                    const statusConfig = getStatusDisplay(player.status);
                                    return (
                                        <button
                                            key={player.user_id}
                                            onClick={() => handleClickPlayer(player.user_id)}
                            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-blue-700 transition-colors group"
                                            title="点击发起私聊"
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="text-amber-400 text-xs font-medium">
                                                    Lv.{player.level}
                                                </span>
                                                <span className="text-white group-hover:text-blue-300 truncate text-xs">
                                                    {player.username}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {/* 状态标签 */}
                                                <span className={`text-[10px] ${statusConfig.color}`}>
                                                    {statusConfig.icon}
                                                </span>
                                                {/* 私聊图标 */}
                                <MessageCircle className="w-3 h-3 text-slate-400 group-hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            
                            {/* 分页控制 - 只在超过一页时显示 */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700 bg-blue-900/30">
                                    <button
                                        onClick={goToPrevPage}
                                        disabled={currentPage === 0}
                                        className="p-1 rounded hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs text-slate-400">
                                        {currentPage + 1} / {totalPages}
                                    </span>
                                    <button
                                        onClick={goToNextPage}
                                        disabled={currentPage >= totalPages - 1}
                                        className="p-1 rounded hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
