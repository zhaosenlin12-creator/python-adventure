"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Send, User, X } from "lucide-react";
import CodeEditor from "./CodeEditor";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl, getWebSocketUrl } from "@/lib/config/api";

interface BattleRoomProps {
    roomId: string;
    opponentName: string;
    taskId: number;
    onBattleEnd: (result: any) => void;
    onClose: () => void;
}

export default function BattleRoom({ roomId, opponentName, taskId, onBattleEnd, onClose }: BattleRoomProps) {
    const [code, setCode] = useState('# 在这里编写你的代码\n');
    const [timeLeft, setTimeLeft] = useState(300);
    const [task, setTask] = useState<any>(null);
    const [output, setOutput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [opponentStatus, setOpponentStatus] = useState('准备中');
    const wsRef = useRef<WebSocket | null>(null);
    const { token, user } = useAuthStore();
    const isAiMatch = roomId.startsWith('ai_'); // 检测是否为AI对战

    useEffect(() => { loadTask(); }, [taskId]);

    useEffect(() => {
        if (!user) return;
        
        // AI对战不需要WebSocket
        if (isAiMatch) {
            setOpponentStatus('已准备');
            // 模拟AI编写代码
            setTimeout(() => setOpponentStatus('编写中...'), 2000);
            setTimeout(() => setOpponentStatus('思考中...'), 5000);
            return;
        }
        
        // 真人对战使用WebSocket
        const ws = new WebSocket(getWebSocketUrl(`/api/v1/battles/ws/battle/${roomId}/${user.id}`));
        wsRef.current = ws;

        ws.onopen = () => { ws.send(JSON.stringify({ type: 'ready' })); };
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'opponent_ready') setOpponentStatus('已准备');
            else if (message.type === 'opponent_code_update') setOpponentStatus(`编写中 (${message.code_length} 字符)`);
            else if (message.type === 'opponent_submitted') setOpponentStatus(`已提交 (得分: ${message.score})`);
            else if (message.type === 'opponent_left') setOpponentStatus('已离开');
        };

        return () => { ws.close(); };
    }, [roomId, user, isAiMatch]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const loadTask = async () => {
        // AI对战使用模拟题目
        if (isAiMatch) {
            const mockTasks = [
                { id: 1, title: '两数之和', description: '给定一个整数数组和目标值，找出数组中和为目标值的两个数', difficulty: 'easy' },
                { id: 2, title: '反转字符串', description: '编写函数反转输入的字符串', difficulty: 'easy' },
                { id: 3, title: '斐波那契数列', description: '计算第n个斐波那契数', difficulty: 'medium' },
            ];
            setTask(mockTasks[taskId % mockTasks.length]);
            return;
        }
        
        // 真人对战从后端加载题目
        if (!token) return;
        try {
            const response = await fetch(`${getApiBaseUrl()}/tasks/detail/${taskId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            setTask(data);
        } catch (error) {
            console.error('加载题目失败:', error);
        }
    };

    const handleSubmit = async () => {
        if (!token || isSubmitting) return;
        setIsSubmitting(true);
        setOutput('正在执行代码...');

        // AI对战使用模拟结果
        if (isAiMatch) {
            setOpponentStatus('AI正在提交...');
            setTimeout(() => {
                const playerScore = Math.floor(Math.random() * 50) + 50; // 50-100分
                const aiScore = Math.floor(Math.random() * 40) + 40; // 40-80分
                const winnerId = playerScore > aiScore ? user?.id : -1; // -1代表AI
                
                const mockResult = {
                    room_id: roomId,
                    winner_id: winnerId,
                    player1_id: user?.id || 0,
                    player2_id: -1, // AI
                    player1_score: playerScore,
                    player2_score: aiScore,
                    player1_time: 300 - timeLeft,
                    player2_time: Math.floor(Math.random() * 200) + 50,
                    player1_rank_change: winnerId === user?.id ? 15 : -10,
                    player2_rank_change: 0,
                };
                
                const isWinner = winnerId === user?.id;
                setOutput(`对战结束！\n\n你的得分: ${playerScore}\nAI得分: ${aiScore}\n\n${isWinner ? '🎉 你赢了！' : '😢 你输了！'}\n\n排名变化: ${mockResult.player1_rank_change > 0 ? '+' : ''}${mockResult.player1_rank_change}`);
                setIsSubmitting(false);
                
                // 延迟显示结果，让玩家看到输出
                setTimeout(() => {
                    onBattleEnd(mockResult);
                }, 3000);
            }, 2000);
            return;
        }

        // 真人对战调用后端API
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'submission', score: 0 }));
        }

        try {
            const response = await fetch(`${getApiBaseUrl()}/battles/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ room_id: roomId, code: code }),
            });

            if (response.status === 202) {
                setOutput('等待对手提交...');
                pollBattleResult();
            } else {
                const result = await response.json();
                setOutput('对战结束！');
                onBattleEnd(result);
            }
        } catch (error: any) {
            setOutput(`错误: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const pollBattleResult = () => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${getApiBaseUrl()}/battles/status`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const data = await response.json();
                if (data.room_status === 'finished') {
                    clearInterval(interval);
                    const resultResponse = await fetch(`${getApiBaseUrl()}/battles/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ room_id: roomId, code: code }),
                    });
                    const result = await resultResponse.json();
                    onBattleEnd(result);
                }
            } catch (error) { console.error('轮询结果失败:', error); }
        }, 2000);
        setTimeout(() => clearInterval(interval), 30000);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#0a0e27] via-white to-slate-700 z-50 flex flex-col">
            <div className="bg-slate-800 backdrop-blur-md border-b-2 border-slate-700 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-white">
                            <Clock className="w-5 h-5 text-blue-400" />
                            <span className={`font-pixel text-xl ${timeLeft < 60 ? 'text-red-400 animate-pulse' : ''}`}>{formatTime(timeLeft)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <User className="w-5 h-5 text-sky-500" />
                            <span className="font-pixel">{opponentName}</span>
                            <span className="text-sm text-slate-500">({opponentStatus})</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-1/3 bg-slate-800 p-6 overflow-y-auto border-r-2 border-slate-700">
                    {task && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-pixel text-blue-400">{task.title}</h2>
                            <div className="text-slate-300 whitespace-pre-wrap">{task.description}</div>
                            {task.test_cases && task.test_cases.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-pixel text-white mb-2">测试用例</h3>
                                    <div className="space-y-2">
                                        {task.test_cases.slice(0, 2).map((tc: any, i: number) => (
                                            <div key={i} className="bg-blue-900/30 p-3 rounded">
                                                <div className="text-sm text-slate-500">输入: {tc.input}</div>
                                                <div className="text-sm text-slate-500">输出: {tc.expected_output}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="flex-1 relative">
                        <CodeEditor code={code} onChange={(val) => {
                            setCode(val || '');
                            if (wsRef.current?.readyState === WebSocket.OPEN) {
                                wsRef.current.send(JSON.stringify({ type: 'code_update', code: val }));
                            }
                        }} storageKey={`battle-${roomId}`} />
                    </div>

                    <div className="h-32 bg-slate-900 border-t-2 border-slate-700 p-4 overflow-y-auto">
                        <div className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{output || '点击提交按钮运行代码...'}</div>
                    </div>

                    <div className="bg-slate-800 p-4 border-t-2 border-slate-700">
                        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-400 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-pixel text-lg py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                            <Send className="w-5 h-5" />
                            {isSubmitting ? '提交中...' : '提交代码'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
