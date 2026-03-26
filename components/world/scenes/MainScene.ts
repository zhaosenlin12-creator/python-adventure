import * as Phaser from 'phaser';
import { useGameStore } from '@/store/gameStore';
import { useSoundStore } from '@/store/soundStore';
import { useAuthStore } from '@/store/authStore';
import { usePetStore } from '@/store/petStore';
import { touchInputManager, TouchInputState } from '@/lib/input/TouchInputManager';
import { PetFollower } from '../entities/PetFollower';
import { PET_CONFIGS, Pet, PetMood, PetStatus } from '@/types/pet';
import { migratePetType } from '@/lib/pet/migration';

// 生产环境禁用调试日志
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

// 站点类型定义
interface Station {
    id: string;
    x: number;
    y: number;
    title: string;
    color: number;
    emoji: string;
    requiredSkills?: string[];
}

export class MainScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private infoText!: Phaser.GameObjects.Text;
    private stations: Station[] = [];
    private stationSprites: Map<string, Phaser.GameObjects.Container> = new Map();
    private shiftKey!: Phaser.Input.Keyboard.Key;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private canDoubleJump: boolean = false;
    private hasDoubleJumped: boolean = false;
    private isDashing = false;
    private isGliding = false;
    private lastPlayerX = 0;
    private lastPlayerY = 0;
    private playerMoved = false;
    private canWallJump: boolean = false;
    private touchingWall: boolean = false;
    private eKey!: Phaser.Input.Keyboard.Key;
    private nearbyStation: Station | null = null;
    private interactionPrompt!: Phaser.GameObjects.Text;
    private playerNameText!: Phaser.GameObjects.Text;
    private activeStationForInput: Station | null = null;
    private nativeKeyHandler?: (event: KeyboardEvent) => void;
    private phaserKeyHandler?: (event: KeyboardEvent) => void;
    
    // 在线玩家系统
    private otherPlayers: Map<number, Phaser.GameObjects.Container> = new Map();
    private lastPositionSent = { x: 0, y: 0, time: 0 };
    private positionUpdateThrottle = 100; // 100ms发送一次位置
    
    // 地图配置
    private readonly WORLD_WIDTH = 3500;
    private readonly WORLD_HEIGHT = 720;
    
    // 玩家技能状态（从游戏状态获取）
    private playerSkills: string[] = [];
    
    // 按键监听控制
    private keyboardEnabled: boolean = true;
    
    // 🔥 触控输入状态追踪
    private lastTouchState: TouchInputState = {
        left: false, right: false, up: false, down: false,
        jump: false, attack: false, interact: false, dash: false, timestamp: 0
    };
    
    // 🐾 宠物跟随系统
    private petFollower: PetFollower | null = null;
    
    // 🐾 其他玩家的宠物显示
    private otherPlayerPets: Map<number, PetFollower> = new Map();
    private otherPlayerDirections: Map<number, 'left' | 'right' | 'up' | 'down'> = new Map();
    
    // 🔒 事件监听器引用（用于 shutdown 清理，防止内存泄漏）
    private eventListeners: { event: string; handler: EventListener }[] = [];

    constructor() {
        super({ key: 'MainScene' });
    }
    
    init(data: any) {
        // 从游戏状态获取玩家技能
        const gameState = useGameStore.getState();
        this.playerSkills = [...gameState.skills]; // 获取实际解锁的技能
    }

    create() {
        // 🔥 场景创建时重置键盘状态，确保从其他场景返回时状态干净
        this.keyboardEnabled = true;
        
        // 确保音效已加载
        if (!this.cache.audio.exists('jump')) {
            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                
                // Jump sound
                const jumpDuration = 0.15;
                const jumpBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * jumpDuration, audioCtx.sampleRate);
                const jumpData = jumpBuffer.getChannelData(0);
                for (let i = 0; i < jumpBuffer.length; i++) {
                    const t = i / audioCtx.sampleRate;
                    const freq = 600 - 300 * t; // Higher frequency for better audibility
                    jumpData[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / jumpDuration) * 0.5;
                }
                this.cache.audio.add('jump', jumpBuffer);
            } catch (e) {
                // 音效生成失败，忽略
            }
        }

        // 设置世界边界
        this.physics.world.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
        
        // 获取相机尺寸
        const { width, height } = this.cameras.main;

        // 创建渐变背景
        this.createBackground();

        // 创建平台系统
        this.createPlatforms();
        
        // 创建站点
        this.createStations();

        // 创建玩家
        const groundY = this.WORLD_HEIGHT - 32;
        this.player = this.physics.add.sprite(100, groundY - 100, 'player');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);
        this.player.setData('velocityBeforeGlide', 0);

        // 创建玩家名字文本（显示在玩家头上）
        const authState = useAuthStore.getState();
        const username = authState.user?.username || 'Player';
        this.playerNameText = this.add.text(this.player.x, this.player.y - 40, username, {
            fontSize: '14px',
            color: '#FFD700',
            backgroundColor: '#00000088',
            padding: { x: 6, y: 3 },
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 物理碰撞
        this.physics.add.collider(this.player, this.platforms);

        // 输入控制
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
            this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

            this.phaserKeyHandler = (event: KeyboardEvent) => {
                if (!this.keyboardEnabled) {
                    return;
                }

                if (this.isEKey(event) && this.activeStationForInput && !this.isTextInputFocused()) {
                    event.preventDefault();
                    debugLog('[MainScene] Phaser键盘事件触发站点:', this.activeStationForInput.id);
                    this.interactWithStation(this.activeStationForInput);
                }
            };

            this.input.keyboard.on('keydown', this.phaserKeyHandler, this);
        } else {
            console.error('[MainScene] Keyboard NOT available!');
        }

        // 使用原生DOM事件作为备用方案
        if (typeof window !== 'undefined') {
            this.nativeKeyHandler = (event: KeyboardEvent) => {
                if (this.isEKey(event) && this.activeStationForInput && !this.isTextInputFocused()) {
                    event.preventDefault();
                    debugLog('[MainScene] 原生键盘事件触发站点:', this.activeStationForInput.id);
                    this.interactWithStation(this.activeStationForInput);
                }
            };

            window.addEventListener('keydown', this.nativeKeyHandler);

            this.events.on('shutdown', () => {
                if (this.nativeKeyHandler) {
                    window.removeEventListener('keydown', this.nativeKeyHandler);
                    this.nativeKeyHandler = undefined;
                }

                if (this.input.keyboard && this.phaserKeyHandler) {
                    this.input.keyboard.off('keydown', this.phaserKeyHandler, this);
                    this.phaserKeyHandler = undefined;
                }
                
                // 🔒 清理所有注册的 window 事件监听器（防止内存泄漏）
                this.eventListeners.forEach(({ event, handler }) => {
                    window.removeEventListener(event, handler);
                });
                this.eventListeners = [];
                
                // 清理远端玩家宠物跟随器
                this.otherPlayerPets.forEach((petFollower) => petFollower.destroy());
                this.otherPlayerPets.clear();
                this.otherPlayerDirections.clear();
                debugLog('[MainScene] All event listeners cleaned up on shutdown');
            });
        }

        // 信息文本（固定在相机底部）
        this.infoText = this.add.text(width / 2, height - 30, this.getControlsText(), {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#00ff00',
            backgroundColor: '#000000aa',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0);

        // 返回按钮（固定在相机）
        const backButton = this.add.text(20, 20, '← 返回主菜单', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 }
        }).setInteractive().setScrollFactor(0);

        backButton.on('pointerdown', () => {
            if (typeof window !== 'undefined') {
                // 🔥 直接导航到首页，避免history.back()导致的导航问题
                // （如果用户之前访问过创意工坊，history.back()会返回到编辑器而不是首页）
                window.location.href = '/';
            }
        });

        // Listen for skill unlock events
        this.game.events.on('skill-unlocked', (skillId: string) => {
            // 添加技能到玩家技能列表
            if (!this.playerSkills.includes(skillId)) {
                this.playerSkills.push(skillId);
            }
            
            // 更新特定技能状态
            if (skillId === 'double_jump') {
                this.canDoubleJump = true;
            }
            
            // 更新技能显示
            this.updateSkillDisplay();
        });

        // Listen for window skill unlock events
        if (typeof window !== 'undefined') {
            const handleSkillUnlock = (event: any) => {
                const { skillId } = event.detail;
                debugLog('[MainScene] Received skill unlock event:', skillId);
                if (!this.playerSkills.includes(skillId)) {
                    this.playerSkills.push(skillId);
                    debugLog('[MainScene] Added skill to playerSkills:', skillId);
                    debugLog('[MainScene] Current playerSkills:', this.playerSkills);
                }
                this.updateSkillDisplay();
            };
            
            window.addEventListener('skill-unlocked', handleSkillUnlock);
            
            // 监听竞技场进入事件
            const handleEnterArena = () => {
                debugLog('[MainScene] Enter arena event received, switching to ArenaScene');
                // 切换到竞技场场景
                this.scene.start('ArenaScene');
            };
            
            window.addEventListener('enter-arena', handleEnterArena);
            
            // 🔥 监听模态框关闭事件，重置按键状态
            window.addEventListener('modal-closed', () => {
                this.resetKeyboardState();
            });
            
            // 🔥 监听场景切换事件，重置键盘状态（从竞技场返回时触发）
            window.addEventListener('scene-changed', () => {
                debugLog('[MainScene] Scene changed event received, resetting keyboard');
                this.resetKeyboardState();
                // 确保键盘输入系统已启用
                if (this.input.keyboard) {
                    this.input.keyboard.enabled = true;
                }
                this.keyboardEnabled = true;
            });
        }
        
        // 技能提示文本（固定在相机左下角，与绿色控制提示对齐）
        const skillText = this.add.text(20, height - 30, this.getSkillsText(), {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#FFD700',
            backgroundColor: '#000000aa',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0);
        
        // 交互提示文本（固定在相机中央上方）
        this.interactionPrompt = this.add.text(width / 2, 100, '', {
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: '#00ff00',
            backgroundColor: '#000000dd',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

        // 相机跟随玩家
        this.cameras.main.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 监听模态框状态变化
        this.setupModalListeners();
        
        // 初始化在线玩家系统
        this.setupOnlinePlayersSystem();
        
        // 🐾 初始化宠物跟随系统
        this.setupPetFollowerSystem();
    }
    
    private setupModalListeners() {
        if (typeof window !== 'undefined') {
            // 监听模态框打开事件
            window.addEventListener('modal-opened', () => {
                this.keyboardEnabled = false;
                debugLog('[MainScene] Keyboard disabled - modal opened');
                
                // 完全禁用Phaser的键盘输入系统
                if (this.input.keyboard) {
                    this.input.keyboard.enabled = false;
                    debugLog('[MainScene] Phaser keyboard input disabled');
                }
            });
            
            // 监听模态框关闭事件
            window.addEventListener('modal-closed', () => {
                this.keyboardEnabled = true;
                debugLog('[MainScene] Keyboard enabled - modal closed');
                
                // 重新启用Phaser的键盘输入系统（安全检查）
                try {
                    if (this.input && this.input.keyboard && this.scene && this.scene.isActive()) {
                        this.input.keyboard.enabled = true;
                        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
                        debugLog('[MainScene] Phaser keyboard input enabled and E key recreated');
                    }
                } catch (e) {
                    console.warn('[MainScene] Failed to re-enable keyboard:', e);
                }
            });
        }
    }
    
    private createBackground() {
        const graphics = this.add.graphics();
        
        // 深蓝夜空渐变
        graphics.fillGradientStyle(0x0a1628, 0x0a1628, 0x1a2d4a, 0x1a2d4a, 1);
        graphics.fillRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
        
        // 柔和星星（白色/淡蓝）
        for (let i = 0; i < 120; i++) {
            const x = Math.random() * this.WORLD_WIDTH;
            const y = Math.random() * this.WORLD_HEIGHT * 0.5;
            const size = Math.random() * 1.8 + 0.5;
            const color = Math.random() > 0.3 ? 0xffffff : 0xadd8e6;
            graphics.fillStyle(color, Math.random() * 0.6 + 0.15);
            graphics.fillCircle(x, y, size);
        }
        
        // 远山剪影（深绿色）
        const hillGraphics = this.add.graphics();
        hillGraphics.fillStyle(0x0d1f12, 0.6);
        hillGraphics.beginPath();
        hillGraphics.moveTo(0, this.WORLD_HEIGHT);
        for (let x = 0; x <= this.WORLD_WIDTH; x += 60) {
            const y = this.WORLD_HEIGHT - 180 + Math.sin(x * 0.003) * 60 + Math.sin(x * 0.007) * 30;
            hillGraphics.lineTo(x, y);
        }
        hillGraphics.lineTo(this.WORLD_WIDTH, this.WORLD_HEIGHT);
        hillGraphics.closePath();
        hillGraphics.fillPath();
        
        // 近山（稍亮的绿色）
        hillGraphics.fillStyle(0x142815, 0.5);
        hillGraphics.beginPath();
        hillGraphics.moveTo(0, this.WORLD_HEIGHT);
        for (let x = 0; x <= this.WORLD_WIDTH; x += 40) {
            const y = this.WORLD_HEIGHT - 120 + Math.sin(x * 0.005 + 1) * 40 + Math.sin(x * 0.01) * 20;
            hillGraphics.lineTo(x, y);
        }
        hillGraphics.lineTo(this.WORLD_WIDTH, this.WORLD_HEIGHT);
        hillGraphics.closePath();
        hillGraphics.fillPath();
        
        // 底部草地层
        const grassGraphics = this.add.graphics();
        grassGraphics.fillGradientStyle(0x1a3a1a, 0x1a3a1a, 0x0d200d, 0x0d200d, 1);
        grassGraphics.fillRect(0, this.WORLD_HEIGHT - 64, this.WORLD_WIDTH, 64);
        
        // 萤火虫粒子
        for (let i = 0; i < 25; i++) {
            const fx = Math.random() * this.WORLD_WIDTH;
            const fy = this.WORLD_HEIGHT * 0.3 + Math.random() * this.WORLD_HEIGHT * 0.5;
            const firefly = this.add.circle(fx, fy, 2.5, 0x88ff88, 0.6);
            this.tweens.add({
                targets: firefly,
                x: fx + (Math.random() - 0.5) * 100,
                y: fy + (Math.random() - 0.5) * 60,
                alpha: { from: 0.2, to: 0.8 },
                scale: { from: 0.6, to: 1.2 },
                duration: 2000 + Math.random() * 3000,
                yoyo: true,
                repeat: -1,
                delay: Math.random() * 2000
            });
        }
    }
    
    private createPlatforms() {
        this.platforms = this.physics.add.staticGroup();
        const groundY = this.WORLD_HEIGHT - 32;
        
        // 地面层 (y=600)
        // 主地面 - 分段创建以覆盖整个世界
        for (let x = 0; x < this.WORLD_WIDTH; x += 320) {
            this.platforms.create(x + 160, groundY, 'ground').setScale(10, 1).refreshBody();
        }
        
        // 低层平台 (y=450) - 无需技能
        this.createPlatform(300, groundY - 150, 4);
        this.createPlatform(600, groundY - 150, 4);
        this.createPlatform(1000, groundY - 150, 5);
        this.createPlatform(1400, groundY - 150, 4);
        this.createPlatform(1800, groundY - 150, 6);
        this.createPlatform(2200, groundY - 150, 4);
        this.createPlatform(2600, groundY - 150, 5);
        this.createPlatform(3040, groundY - 150, 4);
        
        // 中层平台 (y=250) - 降低高度，玩家可以跳上去
        this.createPlatform(450, groundY - 250, 3, 0x4444ff);
        this.createPlatform(850, groundY - 250, 4, 0x4444ff);
        this.createPlatform(1250, groundY - 250, 3, 0x4444ff);
        this.createPlatform(1650, groundY - 250, 5, 0x4444ff);
        this.createPlatform(2050, groundY - 250, 3, 0x4444ff);
        this.createPlatform(2450, groundY - 250, 4, 0x4444ff);
        this.createPlatform(2860, groundY - 250, 4, 0x4444ff);
        
        // 高层平台 (y=200) - 需要滑翔
        this.createPlatform(700, groundY - 400, 3, 0xff44ff);
        this.createPlatform(1100, groundY - 420, 3, 0xff44ff);
        this.createPlatform(1500, groundY - 400, 4, 0xff44ff);
        this.createPlatform(1900, groundY - 420, 3, 0xff44ff);
        this.createPlatform(2300, groundY - 400, 3, 0xff44ff);
        this.createPlatform(3150, groundY - 400, 4, 0xff44ff);
        
        // 连接平台 - 帮助玩家在不同层级间移动
        this.createPlatform(200, groundY - 80, 2);
        this.createPlatform(500, groundY - 200, 2);
        this.createPlatform(1300, groundY - 200, 2);
        this.createPlatform(1500, groundY - 180, 4); // 技能树下方平台 - 降低高度
        this.createPlatform(2100, groundY - 200, 2);
        this.createPlatform(2750, groundY - 200, 2);
    }
    
    private createPlatform(x: number, y: number, scale: number, tint?: number) {
        const platform = this.platforms.create(x, y, 'ground').setScale(scale, 1).refreshBody();
        if (tint) {
            // 中层平台：苔藓青
            if (tint === 0x4444ff) {
                platform.setTint(0x4a8a6a);
            }
            // 高层平台：天空蓝
            else if (tint === 0xff44ff) {
                platform.setTint(0x6ab4c8);
            }
            else {
                platform.setTint(tint);
            }
        } else {
            // 低层平台：森林绿
            platform.setTint(0x3d7a3d);
        }
    }
    
    private createStations() {
        const groundY = this.WORLD_HEIGHT - 32;
        
        // 定义6个站点 - 正确的游戏流程逻辑
        this.stations = [
            {
                id: 'secret',
                x: 400,
                y: groundY - 150,
                title: '密码门',
                color: 0x9b59b6,
                emoji: '🔐',
                requiredSkills: [] // 新手入门任务
            },
            {
                id: 'arena',
                x: 900,
                y: groundY - 150,
                title: '竞技场',
                color: 0x4ecdc4,
                emoji: '🏆',
                requiredSkills: ['door_unlocked'] // 完成密码门后解锁
            },
            {
                id: 'creative',
                x: 1200,
                y: groundY - 400,
                title: '创意工坊',
                color: 0xff9500,
                emoji: '🎨',
                requiredSkills: [] // 无需技能，所有玩家可访问
            },
            {
                id: 'skilltree',
                x: 1500,
                y: groundY - 180,
                title: '技能树',
                color: 0xffe66d,
                emoji: '⚡',
                requiredSkills: [] // 用积分解锁技能
            },
            {
                id: 'campaign',
                x: 2100,
                y: groundY - 300,
                title: '战役模式',
                color: 0xff6b6b,
                emoji: '⚔️',
                requiredSkills: ['double_jump'] // 需要基础技能
            },
            {
                id: 'battle_royale',
                x: 2700,
                y: groundY - 250,
                title: '生存乱斗',
                color: 0x4f7dff,
                emoji: '🐾',
                requiredSkills: ['double_jump', 'glide'] // 开放大厅进阶模式
            },
            {
                id: 'pvp',
                x: 3150,
                y: groundY - 400,
                title: '决斗场',
                color: 0xff6b9d,
                emoji: '⚔️',
                requiredSkills: ['double_jump', 'glide'] // 高级PvP
            }
        ];
        
        // 创建站点可视化
        this.stations.forEach(station => {
            this.createStationVisual(station);
        });
    }
    
    private createStationVisual(station: Station) {
        const container = this.add.container(station.x, station.y);
        const stationColor = station.color;
        
        // 外层柔和发光
        const outerGlow = this.add.circle(0, -40, 50, stationColor, 0.08);
        container.add(outerGlow);
        
        // 内层发光
        const glow = this.add.circle(0, -40, 38, stationColor, 0.15);
        container.add(glow);
        
        // 呼吸动画
        this.tweens.add({
            targets: [glow, outerGlow],
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0.3,
            duration: 2000,
            yoyo: true,
            repeat: -1
        });
        
        // 站点底座 — 使用站点主题色
        const base = this.add.rectangle(0, -40, 80, 80, stationColor, 0.25);
        base.setStrokeStyle(3, stationColor, 0.6);
        container.add(base);
        
        // 四角小叶子装饰
        const cornerOffset = 33;
        [-1, 1].forEach(dx => {
            [-1, 1].forEach(dy => {
                const leaf = this.add.circle(dx * cornerOffset, -40 + dy * cornerOffset, 4, 0x88cc88, 0.5);
                container.add(leaf);
            });
        });
        
        // 站点图标
        const icon = this.add.text(0, -40, station.emoji, {
            fontSize: '42px'
        }).setOrigin(0.5);
        container.add(icon);
        
        // 站点标题 — 白色文字+深色背景
        const colorHex = '#' + stationColor.toString(16).padStart(6, '0');
        const title = this.add.text(0, -95, station.title, {
            fontSize: '18px',
            fontStyle: 'bold',
            color: colorHex,
            backgroundColor: '#0a0e27CC',
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5);
        container.add(title);
        
        // 技能解锁需求
        if (station.requiredSkills && station.requiredSkills.length > 0) {
            const hasAllSkills = station.requiredSkills.every(skill => 
                this.playerSkills.includes(skill)
            );
            
            if (!hasAllSkills) {
                const lock = this.add.text(0, -20, '🔒', {
                    fontSize: '20px'
                }).setOrigin(0.5);
                container.add(lock);
                
                const requirement = this.add.text(0, 10, 
                    `需要: ${station.requiredSkills.map(s => this.getSkillName(s)).join(', ')}`,
                    {
                        fontSize: '11px',
                        color: '#ff6b6b',
                        backgroundColor: '#00000099',
                        padding: { x: 6, y: 3 }
                    }
                ).setOrigin(0.5);
                container.add(requirement);
            }
        }
        
        this.stationSprites.set(station.id, container);
    }
    
    private getSkillName(skillId: string): string {
        const names: { [key: string]: string } = {
            'double_jump': '二段跳',
            'dash': '冲刺',
            'wall_jump': '墙跳',
            'glide': '滑翔',
            'door_unlocked': '密码门通行证'
        };
        return names[skillId] || skillId;
    }
    
    private getControlsText(): string {
        let text = '方向键移动 | UP跳跃';
        if (this.playerSkills.includes('double_jump')) text += ' | 空中再按UP二段跳';
        if (this.playerSkills.includes('dash')) text += ' | SPACE冲刺';
        if (this.playerSkills.includes('glide')) text += ' | 空中长按UP滑翔';
        if (this.playerSkills.includes('wall_jump')) text += ' | 贴墙按UP墙跳';
        return text;
    }
    
    private getSkillsText(): string {
        if (this.playerSkills.length === 0) {
            return '已解锁技能: 无 | 前往技能树解锁新技能';
        }
        const skillNames = this.playerSkills.map(s => this.getSkillName(s)).join(', ');
        return `已解锁技能: ${skillNames}`;
    }

    private updateSkillDisplay() {
        // 更新控制提示文本
        if (this.infoText) {
            this.infoText.setText(this.getControlsText());
        }
        
        // 更新技能显示文本
        const skillTexts = this.children.getAll().filter(child => 
            child instanceof Phaser.GameObjects.Text && 
            child.text.includes('已解锁技能')
        ) as Phaser.GameObjects.Text[];
        
        skillTexts.forEach(text => {
            text.setText(this.getSkillsText());
        });
        
        // 更新站点锁定状态
        this.stations.forEach(station => {
            if (station.requiredSkills && station.requiredSkills.length > 0) {
                const container = this.stationSprites.get(station.id);
                if (container) {
                    // 重新创建站点视觉效果以更新锁定状态
                    container.destroy();
                    this.createStationVisual(station);
                }
            }
        });
        
        // 技能显示已更新
    }

    update() {
        if (!this.cursors || !this.player.body) {
            return;
        }
        
        // 检查是否有输入框获得焦点
        if (typeof document !== 'undefined') {
            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'INPUT' ||
                activeElement.getAttribute('contenteditable') === 'true'
            );
            
            // 如果输入框获得焦点，不处理游戏按键
            if (isInputFocused) {
                return;
            }
        }
        
        // 始终检测站点交互（即使键盘被禁用）
        this.checkStationInteraction();
        
        // 如果按键被禁用，只检测站点交互，不处理移动
        if (!this.keyboardEnabled) {
            this.checkStationInteraction();
            return;
        }
        
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const onGround = body.touching.down;
        
        // 重置二段跳
        if (onGround) {
            this.hasDoubleJumped = false;
            this.isGliding = false;
        }
        
        // 检测墙壁接触
        this.touchingWall = body.touching.left || body.touching.right;
        
        // 更新玩家名字位置（跟随玩家）
        if (this.playerNameText) {
            this.playerNameText.setPosition(this.player.x, this.player.y - 40);
        }
        
        // 发送位置更新（节流）
        this.sendPositionUpdate();
        
        // 获取触控输入状态
        const touchState = touchInputManager.getState();
        
        // 合并键盘和触控输入
        const inputLeft = this.cursors.left.isDown || touchState.left;
        const inputRight = this.cursors.right.isDown || touchState.right;
        const inputUp = this.cursors.up.isDown || touchState.up || touchState.jump;
        
        // 检测触控跳跃刚按下
        const touchJumpJustPressed = (touchState.up && !this.lastTouchState.up) || 
                                     (touchState.jump && !this.lastTouchState.jump);
        
        // 水平移动（支持触控）
        let moveSpeed = 250;
        if (inputLeft) {
            this.player.setVelocityX(-moveSpeed);
            this.player.setFlipX(true);
        } else if (inputRight) {
            this.player.setVelocityX(moveSpeed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }
        
        // 冲刺技能（支持触控）
        const touchDashJustPressed = touchState.dash && !this.lastTouchState.dash;
        if ((Phaser.Input.Keyboard.JustDown(this.spaceKey) || touchDashJustPressed) && 
            this.playerSkills.includes('dash') && 
            !this.isDashing) {
            this.performDash();
        }
        
        // 跳跃和技能（支持触控）
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || touchJumpJustPressed) {
            if (onGround) {
                // 普通跳跃（降低跳跃高度）
                this.player.setVelocityY(-350);
                // 播放跳跃音效
                const { isMuted } = useSoundStore.getState();
                if (!isMuted && this.cache.audio.exists('jump')) {
                    try {
                        this.sound.play('jump', { volume: 0.7 });
                    } catch (e) {
                        // 音效播放失败，忽略
                    }
                }
            } else if (this.playerSkills.includes('wall_jump') && this.touchingWall) {
                // 墙跳
                this.performWallJump();
            } else if (this.playerSkills.includes('double_jump') && !this.hasDoubleJumped) {
                // 二段跳
                this.player.setVelocityY(-320);
                this.hasDoubleJumped = true;
                
                // 播放二段跳音效
                const { isMuted: isMuted2 } = useSoundStore.getState();
                if (!isMuted2 && this.cache.audio.exists('jump')) {
                    try {
                        this.sound.play('jump', { volume: 0.7, rate: 1.2 }); // 更高音调
                    } catch (e) {
                        // 音效播放失败，忽略
                    }
                }
                
                // 创建二段跳粒子特效
                this.createDoubleJumpParticles();
            }
        }
        
        // 滑翔技能（支持触控）
        if (this.playerSkills.includes('glide') && 
            inputUp && 
            !onGround && 
            body.velocity.y > 0) {
            this.isGliding = true;
            body.velocity.y = Math.min(body.velocity.y, 100); // 减慢下落速度
        } else {
            this.isGliding = false;
        }
        
        // 更新触控状态追踪
        this.lastTouchState = { ...touchState };
        
        // 优化：只在玩家移动时检查站点交互
        const currentX = this.player.x;
        const currentY = this.player.y;
        this.playerMoved = Math.abs(currentX - this.lastPlayerX) > 1 || Math.abs(currentY - this.lastPlayerY) > 1;
        
        if (this.playerMoved || this.nearbyStation) {
            this.checkStationInteraction();
        }
        
        this.lastPlayerX = currentX;
        this.lastPlayerY = currentY;
        
        // 🐾 更新宠物跟随
        if (this.petFollower) {
            this.petFollower.update(this.player.x, this.player.y, this.game.loop.delta);
        }
        
        // 🐾 更新其他玩家宠物跟随（真实宠物渲染）
        this.otherPlayerPets.forEach((petFollower, userId) => {
            const playerContainer = this.otherPlayers.get(userId);
            if (!playerContainer) return;
            
            const direction = this.otherPlayerDirections.get(userId) || 'right';
            petFollower.update(playerContainer.x, playerContainer.y, this.game.loop.delta, direction);
        });
    }
    
    private createDoubleJumpParticles() {
        // 创建黑色粒子特效
        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 100 + Math.random() * 50;
            
            const particle = this.add.circle(
                this.player.x,
                this.player.y,
                3 + Math.random() * 3,
                0x000000,
                0.8
            );
            
            this.tweens.add({
                targets: particle,
                x: this.player.x + Math.cos(angle) * speed,
                y: this.player.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    private performDash() {
        this.isDashing = true;
        const dashSpeed = this.player.flipX ? -800 : 800; // 增加冲刺速度
        this.player.setVelocityX(dashSpeed);
        
        // 播放冲刺音效
        const { isMuted } = useSoundStore.getState();
        if (!isMuted && this.cache.audio.exists('jump')) {
            try {
                this.sound.play('jump', { volume: 0.5, rate: 0.8 }); // 低音调表示冲刺
            } catch (e) {
                // 音效播放失败，忽略
            }
        }
        
        // 创建多个虚影效果
        const createAfterImage = (delay: number) => {
            this.time.delayedCall(delay, () => {
                if (this.isDashing) {
                    const afterImage = this.add.sprite(
                        this.player.x,
                        this.player.y,
                        'player'
                    );
                    afterImage.setFlipX(this.player.flipX);
                    afterImage.setAlpha(0.3);
                    afterImage.setTint(0x00ffff);
                    
                    this.tweens.add({
                        targets: afterImage,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => afterImage.destroy()
                    });
                }
            });
        };
        
        // 创建多个虚影
        for (let i = 0; i < 5; i++) {
            createAfterImage(i * 40);
        }
        
        this.time.delayedCall(250, () => {
            this.isDashing = false;
        });
    }
    
    private performWallJump() {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const jumpDirection = body.touching.left ? 1 : -1;
        
        this.player.setVelocityY(-350);
        this.player.setVelocityX(jumpDirection * 300);
        
        // 播放墙跳音效
        const { isMuted } = useSoundStore.getState();
        if (!isMuted && this.cache.audio.exists('jump')) {
            try {
                this.sound.play('jump', { volume: 0.6, rate: 1.1 });
            } catch (e) {
                // 音效播放失败，忽略
            }
        }
        this.hasDoubleJumped = false; // 墙跳后重置二段跳
    }
    
    private checkStationInteraction() {
        // 获取触控状态用于E键交互
        const touchState = touchInputManager.getState();
        
        let closestStation: Station | null = null;
        let closestDistance: number = 150; // 增加交互距离
        
        // 找到最近的站点
        this.stations.forEach(station => {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                station.x, station.y - 40 // 调整到站点中心
            );
            
            if (distance < 150 && distance < closestDistance) {
                closestDistance = distance;
                closestStation = station;
            }
        });
        
        // 更新交互提示
        if (closestStation) {
            const station: Station = closestStation;
            
            const hasRequiredSkills = !station.requiredSkills || 
                station.requiredSkills.every((skill: string) => this.playerSkills.includes(skill));
            
            if (hasRequiredSkills) {
                this.nearbyStation = station;
                this.activeStationForInput = station;
                this.interactionPrompt.setText(`按 E 键进入 ${station.title}`);
                this.interactionPrompt.setVisible(true);

                // 支持触控E键交互
                const touchInteractJustPressed = touchState.interact && !this.lastTouchState.interact;
                if ((this.eKey && Phaser.Input.Keyboard.JustDown(this.eKey) || touchInteractJustPressed) && !this.isTextInputFocused()) {
                    this.interactWithStation(station);
                }
            } else {
                this.nearbyStation = null;
                this.activeStationForInput = null;
                this.interactionPrompt.setText(
                    `${station.title} 已锁定\n需要: ${station.requiredSkills!.map((s: string) => this.getSkillName(s)).join(', ')}`
                );
                this.interactionPrompt.setStyle({ color: '#ff6b6b' });
                this.interactionPrompt.setVisible(true);
            }
        } else {
            this.nearbyStation = null;
            this.activeStationForInput = null;
            this.interactionPrompt.setVisible(false);
            this.interactionPrompt.setStyle({ color: '#00ff00' });
        }
    }

    private isTextInputFocused() {
        if (typeof document === 'undefined') return false;
        const activeElement = document.activeElement;
        return !!(activeElement && (
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'INPUT' ||
            activeElement.getAttribute('contenteditable') === 'true'
        ));
    }
    
    private interactWithStation(station: Station) {
        // 与站点交互
        debugLog('[MainScene] interactWithStation called:', station.id, station.title);
        if (typeof window !== 'undefined') {
            // 通过自定义事件通知React组件
            const event = new CustomEvent('stationInteraction', {
                detail: { stationId: station.id }
            });
            debugLog('[MainScene] Dispatching stationInteraction event for:', station.id);
            window.dispatchEvent(event);
        }
    }

    private isEKey(event: KeyboardEvent) {
        if (!event) return false;
        if (event.code && event.code.toUpperCase() === 'KEYE') {
            return true;
        }
        if (event.key) {
            return event.key.toLowerCase() === 'e';
        }
        return false;
    }
    
    // ==================== 在线玩家系统方法 ====================
    
    /**
     * 初始化在线玩家系统
     */
    private setupOnlinePlayersSystem() {
        if (typeof window === 'undefined') return;
        
        // 监听来自React的在线玩家数据
        const handler = ((event: CustomEvent) => {
            const players = event.detail.players || [];
            this.updateOnlinePlayers(players);
        }) as EventListener;
        window.addEventListener('online-players-update', handler);
        this.eventListeners.push({ event: 'online-players-update', handler });
    }
    
    /**
     * 更新在线玩家显示
     */
    private updateOnlinePlayers(players: any[]) {
        // 获取当前所有玩家ID
        const currentPlayerIds = new Set(players.map((p: any) => p.user_id));
        
        // 移除已离线的玩家
        this.otherPlayers.forEach((container, userId) => {
            if (!currentPlayerIds.has(userId)) {
                this.removeOtherPlayer(userId);
            }
        });
        
        // 更新或创建玩家
        players.forEach((playerData: any) => {
            if (this.otherPlayers.has(playerData.user_id)) {
                this.updateOtherPlayer(playerData);
            } else {
                this.createOtherPlayer(playerData);
            }
        });
    }
    
    private getRemotePlayerPetType(playerData: any): string | null {
        const petType = playerData?.pet_type ?? playerData?.petType ?? null;
        return typeof petType === 'string' && petType.length > 0 ? petType : null;
    }
    
    private normalizeRemoteDirection(direction: any): 'left' | 'right' | 'up' | 'down' {
        const normalized = typeof direction === 'string' ? direction.toLowerCase() : '';
        if (normalized === 'left' || normalized === 'right' || normalized === 'up' || normalized === 'down') {
            return normalized;
        }
        return 'right';
    }
    
    private buildRemotePetData(playerData: any): Pet | null {
        const petType = this.getRemotePlayerPetType(playerData);
        if (!petType) return null;
        
        const migratedType = migratePetType(petType as any) as Pet['petType'];
        const petConfig = PET_CONFIGS[migratedType];
        if (!petConfig) return null;
        
        const rawStatus = typeof playerData?.pet_status === 'string' ? playerData.pet_status : undefined;
        const status: PetStatus =
            rawStatus === 'normal' || rawStatus === 'tired' || rawStatus === 'coma' || rawStatus === 'egg'
                ? rawStatus
                : (migratedType === 'egg' ? 'egg' : 'normal');
        
        return {
            id: -Math.abs(Number(playerData?.user_id || 0)) || -1,
            userId: Number(playerData?.user_id || 0),
            petType: migratedType,
            petStyle: petConfig.style,
            name: (typeof playerData?.pet_name === 'string' && playerData.pet_name.trim()) ? playerData.pet_name : petConfig.displayName,
            level: Number(playerData?.pet_level || 1),
            exp: 0,
            hp: 100,
            attributes: {
                intelligence: 0,
                creativity: 0,
                persistence: 0,
            },
            codeQuality: 0,
            creatorValue: 0,
            battlePower: 0,
            status,
            lastFeedTime: null,
            createdAt: new Date().toISOString(),
            evolution_stage: typeof playerData?.pet_evolution_stage === 'number' ? playerData.pet_evolution_stage : 1,
            isEgg: migratedType === 'egg' || status === 'egg' || Boolean(playerData?.pet_is_egg),
            hatchProgress: typeof playerData?.pet_hatch_progress === 'number' ? playerData.pet_hatch_progress : undefined,
        };
    }
    
    private syncOtherPlayerPet(userId: number, playerData: any) {
        const existingPetFollower = this.otherPlayerPets.get(userId);
        const petData = this.buildRemotePetData(playerData);
        
        if (!petData) {
            if (existingPetFollower) {
                existingPetFollower.destroy();
                this.otherPlayerPets.delete(userId);
            }
            return;
        }
        
        if (existingPetFollower) {
            existingPetFollower.setPet(petData);
            return;
        }
        
        const playerContainer = this.otherPlayers.get(userId);
        const startX = playerContainer?.x ?? playerData?.x ?? 0;
        const startY = playerContainer?.y ?? playerData?.y ?? 0;
        
        const petFollower = new PetFollower(this, startX - 60, startY);
        petFollower.setPet(petData);
        this.otherPlayerPets.set(userId, petFollower);
    }
    
    /**
     * 创建其他玩家
     */
    private createOtherPlayer(playerData: any) {
        try {
            // 🔥 空值检查，防止坐标为null时崩溃
            if (playerData.x == null || playerData.y == null) {
                console.warn('[MainScene] Skipping player with null coordinates:', playerData);
                return;
            }
            const container = this.add.container(playerData.x, playerData.y);
            
            // 创建玩家精灵（使用与当前玩家相同的纹理）
            const sprite = this.add.sprite(0, 0, 'player');
            sprite.setTint(0x88ccff); // 浅蓝色区分其他玩家
            sprite.setAlpha(0.8);
            
            // 创建玩家名字
            const nameText = this.add.text(0, -40, playerData.username, {
                fontSize: '12px',
                color: '#88ccff',
                backgroundColor: '#00000088',
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5);
            
            // 添加到容器
            container.add([sprite, nameText]);
            
            // 保存到Map
            this.otherPlayers.set(playerData.user_id, container);
            this.otherPlayerDirections.set(playerData.user_id, this.normalizeRemoteDirection(playerData.direction));
            
            // 🐾 同步其他玩家真实宠物显示
            this.syncOtherPlayerPet(playerData.user_id, playerData);
            
            debugLog('[MainScene] Created other player:', playerData.username);
        } catch (error) {
            console.error('[MainScene] Failed to create other player:', error);
        }
    }
    
    /**
     * 更新其他玩家位置
     */
    private updateOtherPlayer(playerData: any) {
        const container = this.otherPlayers.get(playerData.user_id);
        if (!container) return;
        if (playerData.x == null || playerData.y == null) return;
        
        // 平滑移动到新位置
        this.tweens.add({
            targets: container,
            x: playerData.x,
            y: playerData.y,
            duration: 100,
            ease: 'Linear'
        });
        
        // 更新精灵方向
        const sprite = container.getAt(0) as Phaser.GameObjects.Sprite;
        if (sprite && playerData.direction) {
            if (playerData.direction === 'left') {
                sprite.setFlipX(true);
            } else if (playerData.direction === 'right') {
                sprite.setFlipX(false);
            }
            this.otherPlayerDirections.set(playerData.user_id, this.normalizeRemoteDirection(playerData.direction));
        }
        
        // 🐾 动态更新其他玩家真实宠物
        this.syncOtherPlayerPet(playerData.user_id, playerData);
    }
    
    /**
     * 移除其他玩家
     */
    private removeOtherPlayer(userId: number) {
        const container = this.otherPlayers.get(userId);
        if (container) {
            container.destroy();
            this.otherPlayers.delete(userId);
            this.otherPlayerDirections.delete(userId);
            
            const petFollower = this.otherPlayerPets.get(userId);
            if (petFollower) {
                petFollower.destroy();
                this.otherPlayerPets.delete(userId);
            }
            debugLog('[MainScene] Removed other player:', userId);
        }
    }
    
    /**
     * 发送位置更新（节流）
     */
    private sendPositionUpdate() {
        const now = Date.now();
        const timeSinceLastSend = now - this.lastPositionSent.time;
        
        // 检查是否需要发送（节流）
        if (timeSinceLastSend < this.positionUpdateThrottle) {
            return;
        }
        
        // 检查位置是否有显著变化
        const dx = Math.abs(this.player.x - this.lastPositionSent.x);
        const dy = Math.abs(this.player.y - this.lastPositionSent.y);
        
        if (dx < 5 && dy < 5) {
            return; // 位置变化太小，不发送
        }
        
        // 发送位置更新事件
        if (typeof window !== 'undefined') {
            const direction = this.player.flipX ? 'left' : 'right';
            
            const event = new CustomEvent('player-position-update', {
                detail: {
                    x: this.player.x,
                    y: this.player.y,
                    direction
                }
            });
            window.dispatchEvent(event);
            
            // 更新最后发送的位置和时间
            this.lastPositionSent = {
                x: this.player.x,
                y: this.player.y,
                time: now
            };
        }
    }
    
    /**
     * 重置键盘状态，防止按键残留
     */
    private resetKeyboardState() {
        // 🔥 清除当前激活的站点，防止 E 键误触发
        this.activeStationForInput = null;
        this.nearbyStation = null;
        
        if (this.input.keyboard) {
            // 重置所有方向键
            this.cursors.up.isDown = false;
            this.cursors.down.isDown = false;
            this.cursors.left.isDown = false;
            this.cursors.right.isDown = false;
            
            // 重置其他按键
            if (this.shiftKey) this.shiftKey.isDown = false;
            if (this.spaceKey) this.spaceKey.isDown = false;
            if (this.eKey) this.eKey.isDown = false;
            
            // 清除按键队列
            this.input.keyboard.resetKeys();
            
            // 🔥 重新启用键盘
            this.input.keyboard.enabled = true;
        }
        
        // 🔥 重新启用键盘控制
        this.keyboardEnabled = true;
        
        debugLog('[MainScene] 按键状态已重置，activeStationForInput 已清除');
    }
    
    // ==================== 宠物跟随系统方法 ====================
    
    /**
     * 🐾 初始化宠物跟随系统
     */
    private setupPetFollowerSystem() {
        // 创建宠物跟随器
        this.petFollower = new PetFollower(this, this.player.x - 80, this.player.y);
        
        // 加载当前宠物数据
        const petState = usePetStore.getState();
        if (petState.currentPet) {
            this.petFollower.setPet(petState.currentPet);
            debugLog('[MainScene] Pet follower initialized with:', petState.currentPet.name);
        }
        
        // 🔒 辅助函数：注册事件监听并记录引用（shutdown 时自动清理）
        const addTrackedListener = (event: string, handler: EventListener) => {
            window.addEventListener(event, handler);
            this.eventListeners.push({ event, handler });
        };
        
        // 监听宠物状态变化
        if (typeof window !== 'undefined') {
            addTrackedListener('pet-status-changed', ((event: CustomEvent) => {
                const pet = event.detail.pet;
                if (this.petFollower) {
                    this.petFollower.setPet(pet);
                    debugLog('[MainScene] Pet status updated:', pet);
                }
            }) as EventListener);
            
            // 监听宠物喂食事件（播放开心动画）
            addTrackedListener('pet-fed', (() => {
                if (this.petFollower) {
                    this.petFollower.playAnimation('happy');
                    debugLog('[MainScene] Pet fed, playing happy animation');
                }
            }) as EventListener);
            
            // 🎭 监听情绪变化事件
            addTrackedListener('pet-mood-changed', ((event: CustomEvent) => {
                const mood = event.detail.mood as PetMood;
                if (this.petFollower) {
                    this.petFollower.setMood(mood);
                    debugLog('[MainScene] Pet mood changed to:', mood);
                }
            }) as EventListener);
            
            // 🐾 监听宠物小屋打开/关闭事件
            addTrackedListener('pet-home-opened', (() => {
                if (this.petFollower) {
                    this.petFollower.setVisible(false);
                    debugLog('[MainScene] Pet home opened, hiding pet follower');
                }
            }) as EventListener);
            
            addTrackedListener('pet-home-closed', (() => {
                if (this.petFollower) {
                    this.petFollower.setVisible(true);
                    debugLog('[MainScene] Pet home closed, showing pet follower');
                }
            }) as EventListener);
        }
    }
}
