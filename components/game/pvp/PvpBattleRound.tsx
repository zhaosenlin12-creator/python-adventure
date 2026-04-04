'use client';

/**
 * PVP 第一轮：实时对战组件 v3.0
 * - 操作与开放大厅一致：方向键移动，上键跳跃，空格冲刺
 * - 技能：Q/W/E/R 四个技能
 * - 音效系统
 * - 相机跟随玩家
 * - 更大地图 + 更好UI
 * - 移动端虚拟控制器支持
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Heart, Swords, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { getRandomPvpMap } from '../../../lib/pvpMaps';
import { getAIConfig, AIConfig } from '../../../lib/pvpAI';
import { AIOpponent } from '../../../types/pvp';
import { playSound } from '../../../lib/soundEffects';
import { musicManager } from '../../../lib/audio/musicManager';
import { createPvpWebSocket, disconnectPvpWebSocket, PvpWebSocketClient } from '../../../lib/services/pvpWebSocket';
import { touchInputManager } from '../../../lib/input/TouchInputManager';
import { MobileGameWrapper } from '../MobileGameWrapper';
import { usePvpStore } from '../../../store/pvpStore';
import { usePetStore } from '@/store/petStore';
import { getPetImageUrl } from '@/lib/config/petAssets';
import { getPetVariantScale, getPetWorldYOffset } from '@/lib/config/petArtworkProfiles';
import { migratePetType } from '@/lib/pet/migration';

// 技能定义
interface Skill {
    id: string;
    name: string;
    icon: string;
    cooldown: number;
    duration?: number;
    damage?: number;
    key: string;
}

// Q = 普通攻击，W/E/R/T = 技能
// 🔥 v2.1.8: 所有技能伤害减半，增加对战乐趣
const SKILLS: Skill[] = [
    { id: 'fireball', name: '火球', icon: '🔥', cooldown: 2000, damage: 10, key: 'W' },
    { id: 'lightning', name: '闪电', icon: '⚡', cooldown: 4000, damage: 12, key: 'E' },
    { id: 'shield', name: '护盾', icon: '🛡️', cooldown: 8000, duration: 2000, key: 'R' },
    { id: 'meteor', name: '陨石', icon: '☄️', cooldown: 10000, damage: 20, key: 'T' },
];


// 道具定义
interface PowerUp {
    id: number;
    x: number;
    y: number;
    type: 'health' | 'speed' | 'damage' | 'shield';
    active: boolean;
}

// 玩家状态
interface Player {
    x: number;
    y: number;
    vx: number;
    vy: number;
    hp: number;
    maxHp: number;
    facingRight: boolean;
    isAttacking: boolean;
    attackCooldown: number;
    attackVisualTimer: number; // 🔥 攻击视觉计时器（独立于冷却）
    isInvincible: boolean;
    invincibleTimer: number;
    damageDealt: number;
    color: string;
    name: string;
    skillCooldowns: Record<string, number>;
    isDashing: boolean;
    dashTimer: number;
    hasShield: boolean;
    shieldTimer: number;
    speedBoost: number;
    damageBoost: number;
    comboCount: number;
    lastHitTime: number;
}

// 投射物
interface Projectile {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: 'fireball' | 'lightning' | 'meteor';
    damage: number;
    owner: 'player1' | 'player2';
    active: boolean;
    size: number;
}

// 特效
interface Effect {
    id: number;
    x: number;
    y: number;
    type: 'hit' | 'dash' | 'shield' | 'powerup' | 'explosion';
    timer: number;
    color: string;
    size: number;
}

interface PvpBattleRoundProps {
    opponent: AIOpponent | null;
    isRealPlayer?: boolean; // 是否是真人对战
    roomId?: string; // 房间ID（真人对战时需要）
    playerId?: string; // 本地玩家ID
    isHost?: boolean; // 是否是房主（真人对战时区分角色）
    opponentName?: string; // 🔥 真人对战时对手的名字
    onComplete: (player1Score: number, player2Score: number, player1HP: number, player2HP: number) => void;
    onClose: () => void;
}

interface FighterPetProfile {
    petType?: string;
    petStage?: number;
    petName?: string;
}

const isLocalDev = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    : process.env.NODE_ENV === 'development';
const debugLog = isLocalDev ? console.log.bind(console) : () => {};

// 游戏常量 - 优化比例
const GAME_WIDTH = 1800;
const GAME_HEIGHT = 600;
const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 450;
const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 52;
const GRAVITY = 0.7;
const JUMP_FORCE = -16;
const MOVE_SPEED = 6;
const DASH_SPEED = 20;
const DASH_DURATION = 250;
// 🔥 v2.1.8: Q攻击范围减小、伤害减半、冷却增加到1.5秒
const ATTACK_RANGE = 45;
const ATTACK_DAMAGE = 5;
const ATTACK_COOLDOWN = 1500;
const ATTACK_VISUAL_DURATION = 80; // 🔥 v2.1.9: 攻击视觉只持续80ms（一瞬间）
const INVINCIBLE_TIME = 600;
const BATTLE_TIME = 120;
const COMBO_WINDOW = 2000;


export default function PvpBattleRound({ opponent, isRealPlayer, roomId, playerId, isHost = true, opponentName, onComplete }: PvpBattleRoundProps) {
    debugLog('[PvpBattleRound] 组件参数:', { isRealPlayer, roomId, playerId, isHost, opponentName, hasOpponent: !!opponent });
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number | null>(null);
    const keysRef = useRef<Set<string>>(new Set());
    const projectilesRef = useRef<Projectile[]>([]);
    const effectsRef = useRef<Effect[]>([]);
    const powerUpsRef = useRef<PowerUp[]>([]);
    const petImageCacheRef = useRef<Record<string, HTMLImageElement>>({});
    const nextIdRef = useRef(1);
    const cameraRef = useRef({ x: 0, y: 0 });
    const wsRef = useRef<any>(null); // WebSocket 引用
    const remotePlayerRef = useRef<Player | null>(null); // 远程玩家状态
    const lastSyncTime = useRef(0);
    
    // 🔥 插值优化：存储远程玩家的目标位置，用于平滑移动
    const remoteTargetRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
    const INTERPOLATION_FACTOR = 0.25; // 插值系数，越大越快跟上，越小越平滑
    const SYNC_INTERVAL = 33; // 同步间隔 33ms ≈ 30fps（优化：从50ms减少）
    
    const map = useMemo(() => getRandomPvpMap(), []);
    // 如果是真人对战且没有 AI opponent，使用 null；否则使用 AI 配置
    const aiConfig = useMemo(() => {
        if (isRealPlayer) return null; // 真人对战不使用 AI
        return opponent ? getAIConfig(opponent.difficulty) : null;
    }, [opponent, isRealPlayer]);
    
    const [timeLeft, setTimeLeft] = useState(BATTLE_TIME);
    const [gameStarted, setGameStarted] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [gameEnded, setGameEnded] = useState(false);
    const [p1HP, setP1HP] = useState(150); // 🔥 v2.1.9: 与 createPlayer 保持一致
    const [p2HP, setP2HP] = useState(150); // 🔥 v2.1.9: 与 createPlayer 保持一致
    const [p1Combo, setP1Combo] = useState(0);
    const [p2Combo, setP2Combo] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const currentRoom = usePvpStore((state) => state.currentRoom);
    const currentPet = usePetStore((state) => state.currentPet);

    const localPetProfile = useMemo<FighterPetProfile>(() => {
        const roomProfile = isHost ? currentRoom?.hostPlayer : currentRoom?.guestPlayer;
        return {
            petType: roomProfile && !('type' in roomProfile) ? roomProfile.petType : currentPet?.petType,
            petStage: roomProfile && !('type' in roomProfile) ? roomProfile.petStage : (currentPet?.evolution_stage ?? 3),
            petName: roomProfile && !('type' in roomProfile) ? roomProfile.petName : currentPet?.name,
        };
    }, [currentPet?.evolution_stage, currentPet?.name, currentPet?.petType, currentRoom?.guestPlayer, currentRoom?.hostPlayer, isHost]);

    const remotePetProfile = useMemo<FighterPetProfile>(() => {
        if (!isRealPlayer) {
            return {};
        }
        const roomProfile = isHost ? currentRoom?.guestPlayer : currentRoom?.hostPlayer;
        if (roomProfile && !('type' in roomProfile)) {
            return {
                petType: roomProfile.petType,
                petStage: roomProfile.petStage,
                petName: roomProfile.petName,
            };
        }
        return {};
    }, [currentRoom?.guestPlayer, currentRoom?.hostPlayer, isHost, isRealPlayer]);

    useEffect(() => {
        [localPetProfile, remotePetProfile].forEach((profile) => {
            if (!profile.petType) return;
            const normalizedType = migratePetType(profile.petType);
            const normalizedStage = Math.max(1, Math.min(5, profile.petStage ?? 3));
            const cacheKey = `${normalizedType}-${normalizedStage}`;
            if (petImageCacheRef.current[cacheKey]) {
                return;
            }
            const image = new Image();
            image.decoding = 'async';
            image.src = getPetImageUrl(normalizedType, 'normal', normalizedStage);
            petImageCacheRef.current[cacheKey] = image;
        });
    }, [localPetProfile, remotePetProfile]);
    
    // 初始化玩家 - 站在地面上
    // 真人对战时：房主在左边（蓝色），客人在右边（红色）
    // 本地玩家始终是 player1Ref，远程玩家是 player2Ref
    const createPlayer = (isLocalPlayer: boolean): Player => {
        // 真人对战时，根据是否是房主决定位置
        const isLeftSide = isRealPlayer ? (isLocalPlayer ? isHost : !isHost) : isLocalPlayer;
        return {
            x: isLeftSide ? 150 : GAME_WIDTH - 200,
            y: GAME_HEIGHT - 40 - PLAYER_HEIGHT,
            vx: 0, vy: 0,
            hp: 150, maxHp: 150, // 🔥 v2.1.8: 血量增加到150
            facingRight: isLeftSide,
            isAttacking: false,
            attackCooldown: 0,
            attackVisualTimer: 0, // 🔥 攻击视觉计时器
            isInvincible: false,
            invincibleTimer: 0,
            damageDealt: 0,
            color: isLeftSide ? '#3b82f6' : '#ef4444',
            name: isLocalPlayer ? '你' : (opponent?.name || '对手'),
            skillCooldowns: {},
            isDashing: false, dashTimer: 0,
            hasShield: false, shieldTimer: 0,
            speedBoost: 1, damageBoost: 1,
            comboCount: 0, lastHitTime: 0,
        };
    };
    
    const player1Ref = useRef<Player>(createPlayer(true));  // 本地玩家
    const player2Ref = useRef<Player>(createPlayer(false)); // 远程玩家/AI
    
    // 🔥 初始化远程玩家目标位置
    useEffect(() => {
        const p2 = player2Ref.current;
        remoteTargetRef.current = { x: p2.x, y: p2.y, vx: 0, vy: 0 };
    }, []);

    // 播放音效 - 使用window全局函数
    const playSoundEffect = useCallback((soundId: string) => {
        if (soundEnabled && typeof window !== 'undefined') {
            try {
                // 优先使用全局函数
                if ((window as any).playGameSound) {
                    (window as any).playGameSound(soundId);
                } else {
                    playSound(soundId);
                }
            } catch (e) { /* ignore */ }
        }
    }, [soundEnabled]);

    // 🔥 背景音乐 - 使用统一的 musicManager 管理
    useEffect(() => {
        if (typeof window !== 'undefined' && soundEnabled) {
            // 切换到 PVP 战斗 BGM
            musicManager.switchBGM('pvp');
        }
        
        return () => {
            // 组件卸载时切换回主 BGM
            musicManager.switchBGM('main');
        };
    }, [soundEnabled]);

    // 🔥 真人对战 WebSocket 连接
    const [wsConnected, setWsConnected] = useState(false);
    const [aiTakeover, setAiTakeover] = useState(false);  // 🤖 AI接管状态
    const [aiTakeoverName, setAiTakeoverName] = useState('');  // 断线玩家名字
    
    useEffect(() => {
        // 只有真人对战才需要 WebSocket
        if (!isRealPlayer || !roomId || !playerId) return;
        
        debugLog('[PvpBattleRound] 建立真人对战 WebSocket 连接', { roomId, playerId });
        
        wsRef.current = createPvpWebSocket({
            roomId,
            playerId,
            onMessage: (msg) => {
                // 🔥 调试日志
                debugLog('[PvpBattleRound] 收到WS消息:', msg.type, msg);
                
                // 🤖 处理AI接管消息
                if (msg.type === 'player_replaced_by_ai') {
                    const msgAny = msg as any;
                    debugLog('[PvpBattleRound] 🤖 对方断线，AI接管:', msgAny);
                    setAiTakeover(true);
                    setAiTakeoverName(msgAny.disconnected_name || '对手');
                    // 切换到AI模式：不再从WebSocket接收对方状态，改用本地AI逻辑
                }
                
                // 🤖 处理重连被拒绝消息
                if (msg.type === 'reconnect_rejected') {
                    debugLog('[PvpBattleRound] 🚫 重连被拒绝，结束游戏');
                    setGameEnded(true);
                }
                
                // 处理远程玩家状态更新（只在非AI接管时处理）
                // 后端发送格式: { type: 'player_state', user_id: xxx, payload: {...} }
                if (msg.type === 'player_state' && !aiTakeover) {
                    const msgAny = msg as any;
                    const state = msgAny.payload || {};
                    const senderId = msgAny.user_id?.toString() || state.id?.toString();
                    
                    debugLog('[PvpBattleRound] player_state - senderId:', senderId, 'myId:', playerId);
                    
                    // 只处理对方的状态（不是自己发的）
                    if (senderId && senderId !== playerId) {
                        // 🔥 插值优化：存储目标位置，而不是直接设置
                        // 位置和速度存入目标，由游戏循环插值更新
                        remoteTargetRef.current.x = state.x ?? remoteTargetRef.current.x;
                        remoteTargetRef.current.y = state.y ?? remoteTargetRef.current.y;
                        remoteTargetRef.current.vx = state.vx ?? 0;
                        remoteTargetRef.current.vy = state.vy ?? 0;
                        
                        // 其他状态直接更新（不需要插值）
                        const p2 = player2Ref.current;
                        p2.hp = state.hp ?? p2.hp;
                        p2.facingRight = state.facingRight ?? p2.facingRight;
                        p2.isAttacking = state.isAttacking ?? p2.isAttacking;
                        p2.hasShield = state.hasShield ?? p2.hasShield;
                        p2.isDashing = state.isDashing ?? p2.isDashing;
                        setP2HP(p2.hp);
                    }
                }
                // 处理远程玩家造成的伤害（对方攻击了我）- 只在非AI接管时处理
                if (msg.type === 'player_damage' && msg.payload && !aiTakeover) {
                    const { damage } = msg.payload as any;
                    const p1 = player1Ref.current;
                    p1.hp = Math.max(0, p1.hp - damage);
                    p1.isInvincible = true;
                    p1.invincibleTimer = INVINCIBLE_TIME;
                    setP1HP(p1.hp);
                    playSoundEffect('enemy_hit');
                    // 击退效果
                    p1.vx = player2Ref.current.facingRight ? 12 : -12;
                    p1.vy = -8;
                }
                // 处理远程玩家发射的投射物（显示对方的技能）- 只在非AI接管时处理
                if (msg.type === 'projectile' && msg.payload && !aiTakeover) {
                    const proj = msg.payload as any;
                    projectilesRef.current.push({
                        id: nextIdRef.current++,
                        x: proj.x,
                        y: proj.y,
                        vx: proj.vx,
                        vy: proj.vy,
                        type: proj.type,
                        damage: proj.damage,
                        owner: 'player2', // 远程玩家的投射物
                        active: true,
                        size: proj.size,
                    });
                    playSoundEffect('player_attack');
                }
                
                // 🔥 处理对方发送的轮次结束消息（同步进入下一轮）
                if (msg.type === 'round_end') {
                    debugLog('[PvpBattleRound] 收到对方 round_end 消息，同步结束游戏');
                    setGameEnded(true);
                }
            },
            onConnect: () => {
                debugLog('[PvpBattleRound] WebSocket 已连接');
                setWsConnected(true);
            },
            onDisconnect: () => {
                debugLog('[PvpBattleRound] WebSocket 断开');
                setWsConnected(false);
            },
        });
        
        wsRef.current.connect();
        
        return () => {
            debugLog('[PvpBattleRound] 清理 WebSocket 连接');
            // 🔥 不要在这里断开连接，让连接保持
            // disconnectPvpWebSocket();
            wsRef.current = null;
        };
    }, [isRealPlayer, roomId, playerId, aiTakeover]);


    // 生成道具 - 🔥 减少补给品数量，让战斗更有策略性
    useEffect(() => {
        const spawnPowerUp = () => {
            // 🔥 最多2个补给品（原来是5个）
            if (powerUpsRef.current.length < 2 && gameStarted && !gameEnded) {
                const types: PowerUp['type'][] = ['health', 'speed', 'damage', 'shield'];
                powerUpsRef.current.push({
                    id: nextIdRef.current++,
                    x: 300 + Math.random() * (GAME_WIDTH - 600),
                    y: 200 + Math.random() * 300,
                    type: types[Math.floor(Math.random() * types.length)],
                    active: true,
                });
            }
        };
        // 🔥 每12秒生成一个（原来是4秒），补给品更稀缺
        const interval = setInterval(spawnPowerUp, 12000);
        // 🔥 延迟5秒后才开始生成第一个补给品
        const initialDelay = setTimeout(() => spawnPowerUp(), 5000);
        return () => {
            clearInterval(interval);
            clearTimeout(initialDelay);
        };
    }, [gameStarted, gameEnded]);

    // 开场倒计时
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
                playSoundEffect('button_click');
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && !gameStarted) {
            setGameStarted(true);
            playSoundEffect('level_complete');
        }
    }, [countdown, gameStarted, playSoundEffect]);

    // 游戏计时器
    useEffect(() => {
        if (!gameStarted || gameEnded) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { setGameEnded(true); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameStarted, gameEnded]);

    // 键盘事件 - 与开放大厅一致
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current.add(e.key);
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'q', 'w', 'e', 'r', 't'].includes(e.key.toLowerCase()) || e.key === ' ') {
                e.preventDefault();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);


    // 生成平台数据 - 优化布局
    const platforms = useMemo(() => [
        // 地面
        { x: 0, y: GAME_HEIGHT - 40, w: GAME_WIDTH, h: 40 },
        // 左侧区域
        { x: 80, y: GAME_HEIGHT - 130, w: 180, h: 18 },
        { x: 50, y: GAME_HEIGHT - 230, w: 150, h: 18 },
        { x: 150, y: GAME_HEIGHT - 330, w: 140, h: 18 },
        // 中左区域
        { x: 350, y: GAME_HEIGHT - 150, w: 160, h: 18 },
        { x: 420, y: GAME_HEIGHT - 260, w: 180, h: 18 },
        { x: 320, y: GAME_HEIGHT - 370, w: 150, h: 18 },
        // 中央区域
        { x: 650, y: GAME_HEIGHT - 140, w: 220, h: 18 },
        { x: 720, y: GAME_HEIGHT - 250, w: 260, h: 18 },
        { x: 780, y: GAME_HEIGHT - 360, w: 220, h: 18 },
        // 中右区域
        { x: 1050, y: GAME_HEIGHT - 150, w: 160, h: 18 },
        { x: 1120, y: GAME_HEIGHT - 260, w: 180, h: 18 },
        { x: 1200, y: GAME_HEIGHT - 370, w: 150, h: 18 },
        // 右侧区域
        { x: 1450, y: GAME_HEIGHT - 130, w: 180, h: 18 },
        { x: 1550, y: GAME_HEIGHT - 230, w: 150, h: 18 },
        { x: 1500, y: GAME_HEIGHT - 330, w: 140, h: 18 },
    ], []);

    // 平台碰撞检测
    const checkPlatformCollision = useCallback((player: Player): boolean => {
        for (const plat of platforms) {
            if (player.x + PLAYER_WIDTH > plat.x && player.x < plat.x + plat.w &&
                player.y + PLAYER_HEIGHT >= plat.y && player.y + PLAYER_HEIGHT <= plat.y + 25 && player.vy >= 0) {
                player.y = plat.y - PLAYER_HEIGHT;
                player.vy = 0;
                return true;
            }
        }
        return false;
    }, [platforms]);

    // 使用技能
    const useSkill = useCallback((player: Player, skillId: string, targetX: number, targetY: number, isPlayer1: boolean) => {
        const skill = SKILLS.find(s => s.id === skillId);
        if (!skill) return;
        const now = Date.now();
        if (now < (player.skillCooldowns[skillId] || 0)) return;
        
        player.skillCooldowns[skillId] = now + skill.cooldown;
        playSoundEffect('player_attack');
        
        const dir = player.facingRight ? 1 : -1;
        let projData: { x: number; y: number; vx: number; vy: number; type: string; damage: number; size: number } | null = null;
        
        switch (skillId) {
            case 'fireball':
                projData = {
                    x: player.x + (player.facingRight ? PLAYER_WIDTH : 0),
                    y: player.y + PLAYER_HEIGHT / 2,
                    vx: 14 * dir, vy: 0,
                    type: 'fireball',
                    damage: (skill.damage || 20) * player.damageBoost,
                    size: 18,
                };
                break;
            case 'lightning':
                projData = {
                    x: player.x + (player.facingRight ? PLAYER_WIDTH : 0),
                    y: player.y + PLAYER_HEIGHT / 2,
                    vx: 28 * dir, vy: 0,
                    type: 'lightning',
                    damage: (skill.damage || 25) * player.damageBoost,
                    size: 12,
                };
                break;
            case 'shield':
                player.hasShield = true;
                player.shieldTimer = skill.duration || 2000;
                effectsRef.current.push({ id: nextIdRef.current++, x: player.x, y: player.y, type: 'shield', timer: skill.duration || 2000, color: '#00ffff', size: 50 });
                break;
            case 'meteor':
                projData = {
                    x: targetX,
                    y: 0,
                    vx: 0, vy: 12,
                    type: 'meteor',
                    damage: (skill.damage || 40) * player.damageBoost,
                    size: 35,
                };
                effectsRef.current.push({ id: nextIdRef.current++, x: targetX, y: 50, type: 'explosion', timer: 500, color: '#ff6600', size: 30 });
                break;
        }
        
        // 添加本地投射物
        if (projData) {
            projectilesRef.current.push({
                id: nextIdRef.current++,
                ...projData,
                type: projData.type as 'fireball' | 'lightning' | 'meteor',
                owner: isPlayer1 ? 'player1' : 'player2',
                active: true,
            });
            
            // 真人对战时，发送投射物给对方显示
            if (isRealPlayer && isPlayer1 && wsRef.current) {
                wsRef.current.send('projectile', projData);
            }
        }
    }, [playSoundEffect, isRealPlayer]);


    // AI 决策 - 智能版
    const updateAI = useCallback((ai: Player, target: Player, config: AIConfig, deltaTime: number) => {
        const dx = target.x - ai.x;
        const dy = target.y - ai.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const now = Date.now();
        const hpPercent = ai.hp / ai.maxHp;
        
        // 找最近的血包位置
        const nearestHealthPack = powerUpsRef.current
            .filter(p => p.active && p.type === 'health')
            .map(p => ({ ...p, dist: Math.sqrt((p.x - ai.x) ** 2 + (p.y - ai.y) ** 2) }))
            .sort((a, b) => a.dist - b.dist)[0];
        
        // 🔥 低血量逃跑找血策略
        const shouldRetreat = hpPercent < 0.35 && nearestHealthPack && nearestHealthPack.dist < 600;
        const shouldSeekHealth = hpPercent < 0.5 && nearestHealthPack && nearestHealthPack.dist < 400;
        
        // 移动决策
        const moveChance = config.reactionTime < 200 ? 0.98 : config.reactionTime < 350 ? 0.9 : 0.75;
        if (Math.random() < moveChance) {
            if (shouldRetreat || shouldSeekHealth) {
                // 🔥 低血量时优先去吃血
                const healthDx = nearestHealthPack!.x - ai.x;
                if (healthDx > 30) { ai.vx = MOVE_SPEED * ai.speedBoost * config.moveSpeed; ai.facingRight = true; }
                else if (healthDx < -30) { ai.vx = -MOVE_SPEED * ai.speedBoost * config.moveSpeed; ai.facingRight = false; }
                // 如果血包在上方，跳跃
                if (nearestHealthPack!.y < ai.y - 50 && ai.vy === 0) ai.vy = JUMP_FORCE;
            } else {
                // 🔥 正常战斗：主动追击玩家
                if (dx > 60) { ai.vx = MOVE_SPEED * ai.speedBoost * config.moveSpeed; ai.facingRight = true; }
                else if (dx < -60) { ai.vx = -MOVE_SPEED * ai.speedBoost * config.moveSpeed; ai.facingRight = false; }
                else { ai.vx *= 0.8; } // 近距离减速准备攻击
            }
        }
        
        // 🔥 智能跳跃：追击时跳跃、躲避攻击、追上方玩家
        const shouldJump = (dy < -60 && distance < 300) || // 玩家在上方
                          (target.isAttacking && distance < 150 && Math.random() < config.dodgeProbability) || // 躲避攻击
                          (Math.random() < config.jumpProbability * 0.08); // 随机跳跃
        if (shouldJump && ai.vy === 0) ai.vy = JUMP_FORCE;
        
        // 🔥 主动攻击：更积极的攻击判定
        const attackChance = config.aggressiveness * (distance < 100 ? 1.5 : 1);
        if (distance < ATTACK_RANGE * 2 && ai.attackCooldown <= 0 && Math.random() < attackChance) {
            ai.isAttacking = true;
            ai.attackCooldown = ATTACK_COOLDOWN * (config.reactionTime < 200 ? 0.7 : 0.85);
            ai.attackVisualTimer = ATTACK_VISUAL_DURATION; // 🔥 AI攻击视觉也只持续120ms
            // 攻击时面向玩家
            ai.facingRight = dx > 0;
        }
        
        // 🔥 智能技能使用
        const skillChance = config.accuracy * 0.8;
        if (Math.random() < skillChance * 0.15) {
            // 远距离用火球
            if (distance > 200 && distance < 500) {
                useSkill(ai, 'fireball', target.x, target.y, false);
            }
            // 中距离用闪电（更快）
            else if (distance > 300 && distance < 700 && Math.random() < 0.5) {
                useSkill(ai, 'lightning', target.x, target.y, false);
            }
            // 低血量开盾
            else if (hpPercent < 0.4 && !ai.hasShield && Math.random() < 0.6) {
                useSkill(ai, 'shield', target.x, target.y, false);
            }
            // 玩家静止时用陨石
            else if (Math.abs(target.vx) < 2 && Math.random() < 0.25) {
                useSkill(ai, 'meteor', target.x, target.y, false);
            }
        }
        
        // 🔥 智能冲刺：追击或逃跑
        const dashCooldownReady = (ai.skillCooldowns['dash'] || 0) < now;
        if (!ai.isDashing && dashCooldownReady) {
            // 追击冲刺
            if (distance > 250 && distance < 500 && Math.random() < config.aggressiveness * 0.1) {
                ai.isDashing = true;
                ai.dashTimer = DASH_DURATION;
                ai.vx = ai.facingRight ? DASH_SPEED : -DASH_SPEED;
                ai.skillCooldowns['dash'] = now + 2500;
            }
            // 逃跑冲刺（低血量远离玩家）
            else if (shouldRetreat && distance < 200 && Math.random() < 0.15) {
                ai.isDashing = true;
                ai.dashTimer = DASH_DURATION;
                ai.vx = dx > 0 ? -DASH_SPEED : DASH_SPEED; // 反方向冲刺
                ai.skillCooldowns['dash'] = now + 2500;
            }
        }
    }, [useSkill]);

    // 攻击检测
    const checkAttack = useCallback((attacker: Player, defender: Player, isAttackerP1: boolean) => {
        if (!attacker.isAttacking || defender.isInvincible || defender.hasShield) return;
        
        const attackX = attacker.facingRight ? attacker.x + PLAYER_WIDTH : attacker.x - ATTACK_RANGE;
        if (attackX < defender.x + PLAYER_WIDTH && attackX + ATTACK_RANGE > defender.x &&
            attacker.y < defender.y + PLAYER_HEIGHT && attacker.y + PLAYER_HEIGHT > defender.y) {
            
            const now = Date.now();
            const damage = Math.round(ATTACK_DAMAGE * attacker.damageBoost * (1 + attacker.comboCount * 0.15));
            
            // 真人对战时：本地玩家攻击远程玩家，发送伤害消息给对方
            // 对方收到后会自己扣血
            if (isRealPlayer && isAttackerP1 && wsRef.current) {
                wsRef.current.send('player_damage', {
                    damage: damage,
                });
            }
            
            // AI 对战或本地玩家被攻击时，直接应用伤害
            if (!isRealPlayer || !isAttackerP1) {
                defender.hp = Math.max(0, defender.hp - damage);
                defender.isInvincible = true;
                defender.invincibleTimer = INVINCIBLE_TIME;
            }
            
            attacker.damageDealt += damage;
            
            // 连击
            if (now - attacker.lastHitTime < COMBO_WINDOW) attacker.comboCount = Math.min(attacker.comboCount + 1, 15);
            else attacker.comboCount = 1;
            attacker.lastHitTime = now;
            
            // 击退（真人对战时只对本地玩家应用）
            if (!isRealPlayer || !isAttackerP1) {
                defender.vx = attacker.facingRight ? 12 : -12;
                defender.vy = -8;
            }
            
            playSoundEffect('enemy_hit');
            effectsRef.current.push({ id: nextIdRef.current++, x: defender.x + PLAYER_WIDTH / 2, y: defender.y + PLAYER_HEIGHT / 2, type: 'hit', timer: 250, color: '#ffff00', size: 25 });
            
            if (isAttackerP1) { setP1Combo(attacker.comboCount); if (!isRealPlayer) setP2HP(defender.hp); }
            else { setP2Combo(attacker.comboCount); setP1HP(defender.hp); }
        }
    }, [playSoundEffect, isRealPlayer, playerId]);


    // 游戏主循环
    useEffect(() => {
        if (!gameStarted || gameEnded) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let lastTime = performance.now();
        
        const gameLoop = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            const p1 = player1Ref.current;
            const p2 = player2Ref.current;
            const keys = keysRef.current;
            
            if (p1.hp <= 0 || p2.hp <= 0) { setGameEnded(true); playSoundEffect('level_failed'); return; }
            
            // 🔥 获取触控输入状态
            const touchState = touchInputManager.getState();
            
            // 玩家1输入 - 支持键盘和触控
            if (!p1.isDashing) {
                const moveLeft = keys.has('ArrowLeft') || touchState.left;
                const moveRight = keys.has('ArrowRight') || touchState.right;
                if (moveLeft) { p1.vx = -MOVE_SPEED * p1.speedBoost; p1.facingRight = false; }
                else if (moveRight) { p1.vx = MOVE_SPEED * p1.speedBoost; p1.facingRight = true; }
                else { p1.vx *= 0.88; }
            }
            
            // 跳跃 - 上键或触控A按钮/上方向
            const groundY = GAME_HEIGHT - 40 - PLAYER_HEIGHT;
            const isOnPlatform = platforms.some(plat => 
                p1.x + PLAYER_WIDTH > plat.x && p1.x < plat.x + plat.w &&
                Math.abs(p1.y + PLAYER_HEIGHT - plat.y) < 5 && p1.vy >= 0
            );
            const onGround = (Math.abs(p1.vy) < 1 && p1.y >= groundY - 5) || isOnPlatform;
            const wantJump = keys.has('ArrowUp') || touchState.up || touchState.jump;
            if (wantJump && onGround) {
                p1.vy = JUMP_FORCE;
                playSoundEffect('player_jump');
                keys.delete('ArrowUp');
                touchInputManager.setDirection('up', false);
                touchInputManager.setAction('jump', false);
            }
            
            // 冲刺 - 空格键或触控冲刺按钮
            const wantDash = keys.has(' ') || touchState.dash;
            if (wantDash && !p1.isDashing && (p1.skillCooldowns['dash'] || 0) < Date.now()) {
                p1.isDashing = true;
                p1.dashTimer = DASH_DURATION;
                p1.vx = p1.facingRight ? DASH_SPEED : -DASH_SPEED;
                p1.skillCooldowns['dash'] = Date.now() + 2000;
                effectsRef.current.push({ id: nextIdRef.current++, x: p1.x, y: p1.y + PLAYER_HEIGHT / 2, type: 'dash', timer: 300, color: p1.color, size: 40 });
                keys.delete(' ');
                touchInputManager.setAction('dash', false);
            }
            
            // 普通攻击 - Q键或触控B按钮（攻击）
            const wantAttack = keys.has('q') || keys.has('Q') || touchState.attack;
            if (wantAttack && p1.attackCooldown <= 0) {
                p1.isAttacking = true;
                p1.attackCooldown = ATTACK_COOLDOWN;
                p1.attackVisualTimer = ATTACK_VISUAL_DURATION;
                playSoundEffect('player_attack');
                keys.delete('q'); keys.delete('Q');
                touchInputManager.setAction('attack', false);
            }
            
            // 技能 - W/E/R/T（移动端暂时用E按钮触发火球）
            const wantInteract = keys.has('w') || keys.has('W') || touchState.interact;
            if (wantInteract) { useSkill(p1, 'fireball', p2.x, p2.y, true); keys.delete('w'); keys.delete('W'); touchInputManager.setAction('interact', false); }
            if (keys.has('e') || keys.has('E')) { useSkill(p1, 'lightning', p2.x, p2.y, true); keys.delete('e'); keys.delete('E'); }
            if (keys.has('r') || keys.has('R')) { useSkill(p1, 'shield', p2.x, p2.y, true); keys.delete('r'); keys.delete('R'); }
            if (keys.has('t') || keys.has('T')) { useSkill(p1, 'meteor', p2.x, p2.y, true); keys.delete('t'); keys.delete('T'); }
            
            // AI控制 或 真人对战同步
            if (aiConfig || aiTakeover) {
                // 🤖 AI 对战 或 AI接管断线玩家：使用 AI 逻辑控制 player2
                // AI接管时使用中等难度
                const config = aiConfig || {
                    difficulty: 'medium' as const,
                    reactionTime: 200,
                    accuracy: 0.85,
                    aggressiveness: 0.7,
                    quizCorrectRate: 0.8,
                    codingSpeed: 1.2,
                    moveSpeed: 1.1,
                    jumpProbability: 0.6,
                    attackRange: 90,
                    dodgeProbability: 0.55,
                };
                updateAI(p2, p1, config, deltaTime);
            } else if (isRealPlayer) {
                // 🔥 真人对战：插值更新远程玩家位置（平滑移动）
                const target = remoteTargetRef.current;
                const dx = target.x - p2.x;
                const dy = target.y - p2.y;
                
                // 如果距离太远（可能是瞬移/传送），直接设置位置
                if (Math.abs(dx) > 200 || Math.abs(dy) > 200) {
                    p2.x = target.x;
                    p2.y = target.y;
                } else {
                    // 插值平滑移动
                    p2.x += dx * INTERPOLATION_FACTOR;
                    p2.y += dy * INTERPOLATION_FACTOR;
                }
                p2.vx = target.vx;
                p2.vy = target.vy;
                
                // 发送本地玩家状态到服务器（优化：33ms ≈ 30fps）
                if (wsRef.current) {
                    const now = Date.now();
                    if (now - lastSyncTime.current > SYNC_INTERVAL) {
                        lastSyncTime.current = now;
                        wsRef.current.send('player_state', {
                            id: playerId,
                            x: p1.x,
                            y: p1.y,
                            vx: p1.vx,
                            vy: p1.vy,
                            hp: p1.hp,
                            facingRight: p1.facingRight,
                            isAttacking: p1.isAttacking,
                            hasShield: p1.hasShield,
                            isDashing: p1.isDashing,
                        });
                    }
                }
            }

            
            // 更新玩家物理 (groundY 已在上面声明)
            [p1, p2].forEach((player) => {
                if (!player.isDashing) player.vy += GRAVITY;
                player.x += player.vx;
                player.y += player.vy;
                
                // 边界检测
                player.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, player.x));
                if (player.y < 0) player.y = 0;
                
                // 地面碰撞
                if (player.y >= groundY) {
                    player.y = groundY;
                    player.vy = 0;
                }
                
                // 平台碰撞
                checkPlatformCollision(player);
                
                // 更新状态
                if (player.attackCooldown > 0) player.attackCooldown -= deltaTime;
                // 🔥 攻击视觉基于 attackVisualTimer（120ms），而不是 attackCooldown（1500ms）
                if (player.attackVisualTimer > 0) {
                    player.attackVisualTimer -= deltaTime;
                    if (player.attackVisualTimer <= 0) player.isAttacking = false;
                }
                if (player.invincibleTimer > 0) { player.invincibleTimer -= deltaTime; if (player.invincibleTimer <= 0) player.isInvincible = false; }
                if (player.dashTimer > 0) { player.dashTimer -= deltaTime; if (player.dashTimer <= 0) player.isDashing = false; }
                if (player.shieldTimer > 0) { player.shieldTimer -= deltaTime; if (player.shieldTimer <= 0) player.hasShield = false; }
                if (Date.now() - player.lastHitTime > COMBO_WINDOW) player.comboCount = 0;
            });
            
            // 相机跟随玩家1
            const targetCamX = p1.x - VIEW_WIDTH / 2 + PLAYER_WIDTH / 2;
            const targetCamY = p1.y - VIEW_HEIGHT / 2 + PLAYER_HEIGHT / 2;
            cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.08;
            cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.08;
            cameraRef.current.x = Math.max(0, Math.min(GAME_WIDTH - VIEW_WIDTH, cameraRef.current.x));
            cameraRef.current.y = Math.max(0, Math.min(GAME_HEIGHT - VIEW_HEIGHT, cameraRef.current.y));
            
            // 更新投射物
            projectilesRef.current = projectilesRef.current.filter(proj => {
                if (!proj.active) return false;
                proj.x += proj.vx;
                proj.y += proj.vy;
                if (proj.type === 'meteor') proj.vy += 0.3; // 陨石加速下落
                if (proj.x < -50 || proj.x > GAME_WIDTH + 50 || proj.y > GAME_HEIGHT) return false;
                
                const target = proj.owner === 'player1' ? p2 : p1;
                const isLocalProjectile = proj.owner === 'player1'; // 本地玩家的投射物
                
                if (!target.isInvincible && !target.hasShield &&
                    proj.x > target.x - proj.size && proj.x < target.x + PLAYER_WIDTH + proj.size &&
                    proj.y > target.y - proj.size && proj.y < target.y + PLAYER_HEIGHT + proj.size) {
                    
                    // 真人对战时：本地投射物命中远程玩家，发送伤害消息
                    if (isRealPlayer && isLocalProjectile && wsRef.current) {
                        wsRef.current.send('player_damage', {
                            damage: proj.damage,
                        });
                    }
                    
                    // AI 对战或远程投射物命中本地玩家时，直接应用伤害
                    if (!isRealPlayer || !isLocalProjectile) {
                        target.hp = Math.max(0, target.hp - proj.damage);
                        target.isInvincible = true;
                        target.invincibleTimer = INVINCIBLE_TIME;
                    }
                    
                    const attacker = proj.owner === 'player1' ? p1 : p2;
                    attacker.damageDealt += proj.damage;
                    playSoundEffect('enemy_hit');
                    effectsRef.current.push({ id: nextIdRef.current++, x: proj.x, y: proj.y, type: proj.type === 'meteor' ? 'explosion' : 'hit', timer: 350, color: proj.type === 'fireball' ? '#ff6600' : proj.type === 'meteor' ? '#ff3300' : '#00ffff', size: proj.type === 'meteor' ? 60 : 30 });
                    if (proj.owner === 'player1' && !isRealPlayer) setP2HP(target.hp); 
                    else if (proj.owner === 'player2') setP1HP(target.hp);
                    return false;
                }
                return true;
            });

            
            // 更新道具
            powerUpsRef.current.forEach(powerUp => {
                if (!powerUp.active) return;
                [p1, p2].forEach((player, idx) => {
                    if (player.x < powerUp.x + 25 && player.x + PLAYER_WIDTH > powerUp.x - 25 &&
                        player.y < powerUp.y + 25 && player.y + PLAYER_HEIGHT > powerUp.y - 25) {
                        powerUp.active = false;
                        playSoundEffect('collect_gem');
                        effectsRef.current.push({ id: nextIdRef.current++, x: powerUp.x, y: powerUp.y, type: 'powerup', timer: 400, color: '#00ff00', size: 35 });
                        switch (powerUp.type) {
                            case 'health': player.hp = Math.min(player.maxHp, player.hp + 30); break;
                            case 'speed': player.speedBoost = 1.6; setTimeout(() => { player.speedBoost = 1; }, 6000); break;
                            case 'damage': player.damageBoost = 1.6; setTimeout(() => { player.damageBoost = 1; }, 6000); break;
                            case 'shield': player.hasShield = true; player.shieldTimer = 4000; break;
                        }
                        if (idx === 0) setP1HP(player.hp); else setP2HP(player.hp);
                    }
                });
            });
            powerUpsRef.current = powerUpsRef.current.filter(p => p.active);
            
            // 更新特效
            effectsRef.current = effectsRef.current.filter(e => { e.timer -= deltaTime; return e.timer > 0; });
            
            // 攻击检测
            checkAttack(p1, p2, true);
            checkAttack(p2, p1, false);
            
            // 渲染
            render(ctx, p1, p2);
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };
        
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
    }, [gameStarted, gameEnded, aiConfig, aiTakeover, checkPlatformCollision, updateAI, checkAttack, useSkill, playSoundEffect, platforms, isRealPlayer, playerId]);


    // 渲染函数
    const render = (ctx: CanvasRenderingContext2D, p1: Player, p2: Player) => {
        const cam = cameraRef.current;
        
        // 背景渐变
        const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
        gradient.addColorStop(0, '#0a0e27');
        gradient.addColorStop(0.5, '#1a1e3f');
        gradient.addColorStop(1, '#2a2e4f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        
        // 星星背景
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 80; i++) {
            const sx = ((i * 137 + cam.x * 0.1) % VIEW_WIDTH);
            const sy = ((i * 97) % (VIEW_HEIGHT * 0.6));
            ctx.beginPath();
            ctx.arc(sx, sy, 1 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 网格
        ctx.strokeStyle = 'rgba(74, 74, 110, 0.3)';
        ctx.lineWidth = 1;
        for (let x = -cam.x % 80; x < VIEW_WIDTH; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_HEIGHT); ctx.stroke(); }
        for (let y = -cam.y % 80; y < VIEW_HEIGHT; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_WIDTH, y); ctx.stroke(); }
        
        // 平台 - 更好看的样式
        platforms.forEach(plat => {
            const px = plat.x - cam.x;
            const py = plat.y - cam.y;
            if (px + plat.w < 0 || px > VIEW_WIDTH) return;
            
            // 平台主体
            const platGrad = ctx.createLinearGradient(px, py, px, py + plat.h);
            platGrad.addColorStop(0, '#4ecdc4');
            platGrad.addColorStop(1, '#2d8a85');
            ctx.fillStyle = platGrad;
            ctx.fillRect(px, py, plat.w, plat.h);
            
            // 平台高光
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(px, py, plat.w, 4);
            
            // 平台边框
            ctx.strokeStyle = '#6ee7e0';
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, plat.w, plat.h);
        });
        
        // 道具
        powerUpsRef.current.forEach(powerUp => {
            if (!powerUp.active) return;
            const px = powerUp.x - cam.x;
            const py = powerUp.y - cam.y;
            if (px < -30 || px > VIEW_WIDTH + 30) return;
            
            const colors: Record<string, string> = { health: '#00ff00', speed: '#00ffff', damage: '#ff6600', shield: '#9900ff' };
            const icons: Record<string, string> = { health: '❤️', speed: '⚡', damage: '🔥', shield: '🛡️' };
            
            // 发光效果
            ctx.shadowColor = colors[powerUp.type];
            ctx.shadowBlur = 15;
            ctx.fillStyle = colors[powerUp.type];
            ctx.beginPath();
            ctx.arc(px, py, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(icons[powerUp.type], px, py + 7);
        });

        
        // 投射物
        projectilesRef.current.forEach(proj => {
            const px = proj.x - cam.x;
            const py = proj.y - cam.y;
            if (px < -50 || px > VIEW_WIDTH + 50) return;
            
            ctx.shadowBlur = 20;
            if (proj.type === 'fireball') {
                ctx.shadowColor = '#ff6600';
                ctx.fillStyle = '#ff6600';
                ctx.beginPath();
                ctx.arc(px, py, proj.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(px, py, proj.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (proj.type === 'lightning') {
                ctx.shadowColor = '#00ffff';
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(px - 25, py);
                ctx.lineTo(px + 25, py);
                ctx.stroke();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (proj.type === 'meteor') {
                ctx.shadowColor = '#ff3300';
                ctx.fillStyle = '#ff3300';
                ctx.beginPath();
                ctx.arc(px, py, proj.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(px, py, proj.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
                // 尾焰
                ctx.fillStyle = 'rgba(255,100,0,0.5)';
                ctx.beginPath();
                ctx.moveTo(px - proj.size, py - proj.size);
                ctx.lineTo(px, py - proj.size * 2);
                ctx.lineTo(px + proj.size, py - proj.size);
                ctx.closePath();
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        });
        
        // 特效
        effectsRef.current.forEach(effect => {
            const ex = effect.x - cam.x;
            const ey = effect.y - cam.y;
            ctx.globalAlpha = effect.timer / 350;
            ctx.shadowBlur = 15;
            ctx.shadowColor = effect.color;
            
            // 确保半径不为负数
            const progress = Math.max(0, Math.min(1, 1 - effect.timer / 350));
            
            if (effect.type === 'hit' || effect.type === 'powerup') {
                ctx.fillStyle = effect.color;
                ctx.beginPath();
                const radius = Math.max(1, effect.size * progress);
                ctx.arc(ex, ey, radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (effect.type === 'explosion') {
                ctx.fillStyle = effect.color;
                ctx.beginPath();
                const radius = Math.max(1, effect.size * (0.5 + progress));
                ctx.arc(ex, ey, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(ex, ey, Math.max(1, radius * 0.5), 0, Math.PI * 2);
                ctx.fill();
            } else if (effect.type === 'dash') {
                ctx.fillStyle = effect.color;
                ctx.fillRect(ex - 30, ey - 10, 60, 20);
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        });

        
        // 玩家 - 🎮 v3.0 更真实的人物形象
        [p1, p2].forEach((player, idx) => {
            const px = player.x - cam.x;
            const py = player.y - cam.y;
            if (px + PLAYER_WIDTH < -50 || px > VIEW_WIDTH + 50) return;
            
            if (player.isInvincible && Math.floor(Date.now() / 80) % 2 === 0) ctx.globalAlpha = 0.4;
            
            // 护盾效果
            if (player.hasShield) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(px + PLAYER_WIDTH / 2, py + PLAYER_HEIGHT / 2, 35, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            
            const centerX = px + PLAYER_WIDTH / 2;
            const petProfile = idx === 0 ? localPetProfile : remotePetProfile;
            const resolvedPetType = petProfile.petType ? migratePetType(petProfile.petType) : null;
            const petStage = Math.max(1, Math.min(5, petProfile.petStage ?? 3));
            const petCacheKey = resolvedPetType ? `${resolvedPetType}-${petStage}` : '';
            const petImage = petCacheKey ? petImageCacheRef.current[petCacheKey] : null;
            const canDrawPet = Boolean(petImage && petImage.complete && petImage.naturalWidth > 0);

            if (canDrawPet && resolvedPetType && petImage) {
                const petScale = Math.max(0.9, Math.min(1.18, getPetVariantScale(resolvedPetType, 'world') * 0.86));
                const petWidth = PLAYER_WIDTH * 1.9 * petScale;
                const petHeight = PLAYER_HEIGHT * 1.82 * petScale;
                const petX = centerX - petWidth / 2;
                const petY = py - 8 + getPetWorldYOffset(resolvedPetType) * 0.9;

                ctx.save();
                ctx.shadowColor = idx === 0 ? 'rgba(59, 130, 246, 0.28)' : 'rgba(239, 68, 68, 0.28)';
                ctx.shadowBlur = 14;
                if (!player.facingRight) {
                    ctx.translate(centerX, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(petImage, -(petWidth / 2), petY, petWidth, petHeight);
                } else {
                    ctx.drawImage(petImage, petX, petY, petWidth, petHeight);
                }
                ctx.restore();

                ctx.strokeStyle = idx === 0 ? 'rgba(96, 165, 250, 0.75)' : 'rgba(248, 113, 113, 0.75)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(centerX, py + PLAYER_HEIGHT * 0.82, PLAYER_WIDTH * 0.38, 5, 0, 0, Math.PI * 2);
                ctx.stroke();

                if (player.isAttacking) {
                    ctx.fillStyle = idx === 0 ? 'rgba(59, 130, 246, 0.32)' : 'rgba(239, 68, 68, 0.32)';
                    const attackX = player.facingRight ? px + PLAYER_WIDTH : px - ATTACK_RANGE;
                    ctx.beginPath();
                    ctx.ellipse(
                        attackX + ATTACK_RANGE / 2,
                        py + PLAYER_HEIGHT / 2,
                        ATTACK_RANGE * 0.42,
                        ATTACK_RANGE * 0.28,
                        0,
                        0,
                        Math.PI * 2,
                    );
                    ctx.fill();
                }
            } else {
                const baseColor = idx === 0 ? '#3b82f6' : '#ef4444';
                const lightColor = idx === 0 ? '#60a5fa' : '#f87171';
                const darkColor = idx === 0 ? '#1e40af' : '#991b1b';
                
                const headRadius = 12;
                const headY = py + headRadius + 2;
                
                const headGrad = ctx.createRadialGradient(centerX - 3, headY - 3, 0, centerX, headY, headRadius);
                headGrad.addColorStop(0, '#ffe4c4');
                headGrad.addColorStop(0.7, '#deb887');
                headGrad.addColorStop(1, '#cd853f');
                ctx.fillStyle = headGrad;
                ctx.beginPath();
                ctx.arc(centerX, headY, headRadius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = idx === 0 ? '#2d1b0e' : '#1a1a1a';
                ctx.beginPath();
                ctx.arc(centerX, headY - 3, headRadius, Math.PI, Math.PI * 2);
                ctx.fill();
                
                const eyeOffset = player.facingRight ? 3 : -3;
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.ellipse(centerX + eyeOffset - 4, headY, 3, 4, 0, 0, Math.PI * 2);
                ctx.ellipse(centerX + eyeOffset + 4, headY, 3, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                
                const pupilOffset = player.facingRight ? 1 : -1;
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(centerX + eyeOffset - 4 + pupilOffset, headY, 1.5, 0, Math.PI * 2);
                ctx.arc(centerX + eyeOffset + 4 + pupilOffset, headY, 1.5, 0, Math.PI * 2);
                ctx.fill();
                
                const bodyTop = py + headRadius * 2 + 4;
                const bodyHeight = 22;
                const shoulderWidth = 20;
                const waistWidth = 14;
                
                const bodyGrad = ctx.createLinearGradient(centerX, bodyTop, centerX, bodyTop + bodyHeight);
                bodyGrad.addColorStop(0, lightColor);
                bodyGrad.addColorStop(0.5, baseColor);
                bodyGrad.addColorStop(1, darkColor);
                ctx.fillStyle = bodyGrad;
                
                ctx.beginPath();
                ctx.moveTo(centerX - shoulderWidth / 2, bodyTop);
                ctx.lineTo(centerX + shoulderWidth / 2, bodyTop);
                ctx.lineTo(centerX + waistWidth / 2, bodyTop + bodyHeight);
                ctx.lineTo(centerX - waistWidth / 2, bodyTop + bodyHeight);
                ctx.closePath();
                ctx.fill();
                
                ctx.strokeStyle = lightColor;
                ctx.lineWidth = 1;
                ctx.stroke();
                
                const armY = bodyTop + 3;
                const armLength = 14;
                const armWidth = 5;
                
                ctx.fillStyle = '#deb887';
                ctx.beginPath();
                ctx.ellipse(centerX - shoulderWidth / 2 - armWidth / 2, armY + armLength / 2, armWidth / 2, armLength / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                if (player.isAttacking) {
                    const attackArmX = player.facingRight ? centerX + shoulderWidth / 2 + armLength : centerX - shoulderWidth / 2 - armLength;
                    ctx.fillStyle = '#deb887';
                    ctx.beginPath();
                    ctx.ellipse(attackArmX, armY + 5, armLength / 2, armWidth / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = idx === 0 ? 'rgba(59, 130, 246, 0.6)' : 'rgba(239, 68, 68, 0.6)';
                    const attackX = player.facingRight ? px + PLAYER_WIDTH : px - ATTACK_RANGE;
                    ctx.beginPath();
                    ctx.arc(attackX + ATTACK_RANGE / 2, py + PLAYER_HEIGHT / 2, ATTACK_RANGE / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#deb887';
                    ctx.beginPath();
                    ctx.ellipse(centerX + shoulderWidth / 2 + armWidth / 2, armY + armLength / 2, armWidth / 2, armLength / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                const legTop = bodyTop + bodyHeight;
                const legHeight = 14;
                const legWidth = 5;
                const legGap = 3;
                
                ctx.fillStyle = '#4a4a4a';
                ctx.fillRect(centerX - legGap - legWidth, legTop, legWidth, legHeight);
                ctx.fillRect(centerX + legGap, legTop, legWidth, legHeight);
                
                ctx.fillStyle = '#2d2d2d';
                ctx.fillRect(centerX - legGap - legWidth - 1, legTop + legHeight - 3, legWidth + 2, 4);
                ctx.fillRect(centerX + legGap - 1, legTop + legHeight - 3, legWidth + 2, 4);
            }
            
            // 增益指示
            if (player.speedBoost > 1) {
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(px, py - 6, PLAYER_WIDTH, 3);
            }
            if (player.damageBoost > 1) {
                ctx.fillStyle = '#ff6600';
                ctx.fillRect(px, py - 10, PLAYER_WIDTH, 3);
            }
            
            ctx.globalAlpha = 1;
            
            // 名字
            ctx.fillStyle = 'white';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, centerX, py - 16);
            
            // 连击
            if (player.comboCount > 1) {
                ctx.fillStyle = '#fbbf24';
                ctx.font = 'bold 13px Arial';
                ctx.fillText(`${player.comboCount}连击!`, centerX, py - 30);
            }
            
            // 小血条
            ctx.fillStyle = '#222';
            ctx.fillRect(px - 3, py - 8, PLAYER_WIDTH + 6, 5);
            ctx.fillStyle = player.hp > 50 ? '#22c55e' : player.hp > 25 ? '#eab308' : '#ef4444';
            ctx.fillRect(px - 3, py - 8, (PLAYER_WIDTH + 6) * (player.hp / player.maxHp), 5);
        });
        
        // 小地图
        const mmW = 180, mmH = 50, mmX = VIEW_WIDTH - mmW - 15, mmY = VIEW_HEIGHT - mmH - 15;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(mmX, mmY, mmW, mmH);
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        ctx.strokeRect(mmX, mmY, mmW, mmH);
        
        // 小地图上的玩家
        const mmScale = mmW / GAME_WIDTH;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(mmX + p1.x * mmScale - 3, mmY + p1.y * (mmH / GAME_HEIGHT) - 3, 6, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(mmX + p2.x * mmScale - 3, mmY + p2.y * (mmH / GAME_HEIGHT) - 3, 6, 6);
        
        // 视野框
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mmX + cam.x * mmScale, mmY + cam.y * (mmH / GAME_HEIGHT), VIEW_WIDTH * mmScale, VIEW_HEIGHT * (mmH / GAME_HEIGHT));
    };


    // 游戏结束处理
    useEffect(() => {
        if (!gameEnded) return;
        // BGM 会在组件卸载时自动切换回 main
        const p1 = player1Ref.current;
        const p2 = player2Ref.current;
        const p1Score = Math.round(p1.hp * 0.4 + p1.damageDealt * 0.6);
        const p2Score = Math.round(p2.hp * 0.4 + p2.damageDealt * 0.6);
        
        // 🔥 真人对战时，发送轮次结束消息给对方
        if (isRealPlayer && wsRef.current) {
            debugLog('[PvpBattleRound] 发送 round_end 消息');
            wsRef.current.send('round_end', {
                round: 'battle',
                scores: { player1: p1Score, player2: p2Score },
                hp: { player1: p1.hp, player2: p2.hp },
            });
        }
        
        setTimeout(() => onComplete(p1Score, p2Score, p1.hp, p2.hp), 1500);
    }, [gameEnded, onComplete, isRealPlayer]);

    const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    const p1 = player1Ref.current;
    const p2 = player2Ref.current;

    const getSkillCooldownPercent = (skillId: string) => {
        const cooldownEnd = p1.skillCooldowns[skillId] || 0;
        const skill = SKILLS.find(s => s.id === skillId);
        if (!skill) return 0;
        return Math.max(0, cooldownEnd - Date.now()) / skill.cooldown;
    };

    const getDashCooldownPercent = () => {
        const cooldownEnd = p1.skillCooldowns['dash'] || 0;
        return Math.max(0, cooldownEnd - Date.now()) / 2000;
    };

    // 检测是否为移动设备
    const isMobile = typeof navigator !== 'undefined' && 
        (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         'ontouchstart' in window);

    return (
        <MobileGameWrapper showController={isMobile}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/95 flex items-center justify-center z-40 overflow-auto">
                <div className="flex flex-col items-center gap-2 md:gap-3 p-2">
                    {/* 头部信息栏 - 移动端响应式 */}
                    <div className="w-full max-w-[900px] bg-gradient-to-r from-red-900/60 via-orange-900/60 to-yellow-900/60 rounded-lg p-1.5 md:p-2 border border-red-500/30">
                        <div className="flex items-center justify-between gap-1 md:gap-2">
                            {/* 玩家1 */}
                            <div className="flex items-center gap-1 md:gap-2">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xs md:text-sm">你</span>
                                </div>
                                <div className="w-20 md:w-36">
                                    <div className="flex items-center gap-0.5 md:gap-1 mb-0.5">
                                        <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-500" />
                                        <span className="text-white font-bold text-xs md:text-sm">{p1HP}</span>
                                        {p1Combo > 1 && <span className="text-yellow-400 text-[10px] md:text-xs ml-0.5 md:ml-1 hidden md:inline">{p1Combo}连击</span>}
                                    </div>
                                    <div className="h-2 md:h-2.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                                            style={{ width: `${(p1HP / p1.maxHp) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                            
                            {/* 中间 */}
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 md:gap-2">
                                    <Swords className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
                                    <span className="text-white font-bold text-xs md:text-sm hidden md:inline">PVP</span>
                                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-0.5 hover:bg-white/10 rounded">
                                        {soundEnabled ? <Volume2 className="w-3 h-3 md:w-4 md:h-4 text-white" /> : <VolumeX className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />}
                                    </button>
                                </div>
                                <div className="flex items-center gap-0.5 md:gap-1 bg-black/40 px-1.5 md:px-2 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                    <span className={`font-mono font-bold text-sm md:text-lg ${timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* 玩家2 */}
                            <div className="flex items-center gap-1 md:gap-2">
                                <div className="w-20 md:w-36">
                                    <div className="flex items-center justify-end gap-0.5 md:gap-1 mb-0.5">
                                        {p2Combo > 1 && <span className="text-yellow-400 text-[10px] md:text-xs mr-0.5 md:mr-1 hidden md:inline">{p2Combo}连击</span>}
                                        <span className="text-white font-bold text-xs md:text-sm">{p2HP}</span>
                                        <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-500" />
                                    </div>
                                    <div className="h-2 md:h-2.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-red-400 to-rose-500 transition-all ml-auto"
                                            style={{ width: `${(p2HP / p2.maxHp) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-[10px] md:text-xs">
                                        {isRealPlayer ? (opponentName?.slice(0, 2) || '对手') : (opponent?.name?.slice(0, 2) || 'AI')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>


                {/* 游戏画布 */}
                <div className="relative border-2 border-red-500/40 rounded-lg overflow-hidden shadow-xl shadow-red-500/20">
                    <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} className="bg-gray-900" />
                    
                    {/* 🤖 AI接管提示 */}
                    {aiTakeover && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 z-10">
                            <span>🤖</span>
                            <span>{aiTakeoverName} 已断线，AI接管继续对战</span>
                        </div>
                    )}
                    
                    {/* 倒计时 */}
                    {countdown > 0 && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                            <motion.div key={countdown} initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{countdown}</motion.div>
                        </div>
                    )}
                    
                    {/* 游戏结束 */}
                    {gameEnded && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                            <div className="text-center">
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl font-bold mb-4">
                                    {p1HP > p2HP ? <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">🏆 胜利！</span> :
                                     p1HP < p2HP ? <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500">💀 失败</span> :
                                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">⚔️ 平局</span>}
                                </motion.div>
                                <div className="text-gray-400 text-lg">正在计算分数...</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 技能栏 - Q攻击 + WERT技能 */}
                <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-gray-600">
                    {/* 普通攻击 Q */}
                    <div className="w-10 h-10 rounded border-2 border-orange-400 bg-gray-700 flex flex-col items-center justify-center">
                        <span className="text-base">⚔️</span>
                        <span className="text-[9px] text-gray-300">Q</span>
                    </div>
                    
                    <div className="w-px h-8 bg-gray-600" />
                    
                    {/* 技能 W/E/R/T */}
                    {SKILLS.map(skill => {
                        const cdPercent = getSkillCooldownPercent(skill.id);
                        return (
                            <div key={skill.id} className="relative">
                                <div className={`w-10 h-10 rounded border-2 flex flex-col items-center justify-center
                                    ${cdPercent > 0 ? 'border-gray-600 bg-gray-800' : 'border-yellow-400 bg-gray-700'}`}>
                                    <span className="text-base">{skill.icon}</span>
                                    <span className="text-[9px] text-gray-300">{skill.key}</span>
                                </div>
                                {cdPercent > 0 && (
                                    <div className="absolute inset-0 bg-black/70 rounded flex items-center justify-center">
                                        <span className="text-white text-xs">{Math.ceil(cdPercent * skill.cooldown / 1000)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    <div className="w-px h-8 bg-gray-600" />
                    
                    {/* 冲刺 */}
                    <div className="relative">
                        <div className={`w-10 h-10 rounded border-2 flex flex-col items-center justify-center
                            ${getDashCooldownPercent() > 0 ? 'border-gray-600 bg-gray-800' : 'border-cyan-400 bg-gray-700'}`}>
                            <span className="text-base">💨</span>
                            <span className="text-[9px] text-gray-300">空格</span>
                        </div>
                        {getDashCooldownPercent() > 0 && (
                            <div className="absolute inset-0 bg-black/70 rounded flex items-center justify-center">
                                <span className="text-white text-xs">{Math.ceil(getDashCooldownPercent() * 2)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 操作提示 - 移动端隐藏 */}
                <div className="hidden md:flex items-center gap-4 text-gray-400 text-xs">
                    <span><kbd className="px-1 bg-gray-700 rounded text-white">←→</kbd> 移动</span>
                    <span><kbd className="px-1 bg-gray-700 rounded text-white">↑</kbd> 跳跃</span>
                    <span><kbd className="px-1 bg-gray-700 rounded text-white">Q</kbd> 攻击</span>
                    <span><kbd className="px-1 bg-gray-700 rounded text-white">WERT</kbd> 技能</span>
                    <span><kbd className="px-1 bg-gray-700 rounded text-white">空格</kbd> 冲刺</span>
                </div>
                </div>
            </motion.div>
        </MobileGameWrapper>
    );
}
