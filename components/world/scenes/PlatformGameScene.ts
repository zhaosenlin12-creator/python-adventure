import * as Phaser from 'phaser';
import { touchInputManager, TouchInputState } from '@/lib/input/TouchInputManager';
import { isMobileDevice } from '@/hooks/useDeviceType';
import { buildCampaignOverviewText, buildPlatformControlsText } from '@/lib/gameplayText';

// 生产环境禁用调试日志
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => { };

export default class PlatformGameScene extends Phaser.Scene {
    // 性能优化：纹理缓存
    private static textureCache = new Map<string, boolean>();

    // 清理纹理缓存（解决颜色异常问题）
    public static clearTextureCache() {
        PlatformGameScene.textureCache.clear();
    }

    private getObjectiveStatus(objective: any) {
        const type = objective?.type;
        const target = objective?.target ?? 0;

        if (type === 'defeat') {
            const status = this.getDefeatObjectiveStatus(target);
            const progress = status.total > 0 ? `(${status.completedCount}/${status.total})` : '';
            return { completed: status.completed, progress };
        }

        if (type === 'collect') {
            const required = target || this.totalItems || 0;
            const completed = required > 0 ? this.collectedItems >= required : this.collectedItems > 0;
            const progress = required > 0 ? `(${this.collectedItems}/${required})` : '';
            return { completed, progress };
        }

        if (type === 'survive') {
            const required = target || 0;
            const survived = Math.floor(this.timeElapsed || 0);
            const completed = required > 0 ? survived >= required : false;
            const progress = required > 0 ? `(${Math.min(survived, required)}/${required}s)` : '';
            return { completed, progress };
        }

        if (type === 'reach') {
            return { completed: this.goalReached, progress: '' };
        }

        return { completed: false, progress: '' };
    }

    private getDefeatObjectiveStatus(target: any) {
        if (target === 'boss1' && this.dualBossState) {
            return {
                completed: this.dualBossState.boss1Defeated,
                completedCount: this.dualBossState.boss1Defeated ? 1 : 0,
                total: 1,
            };
        }

        if (target === 'boss2') {
            if (this.dualBossState) {
                return {
                    completed: this.dualBossState.boss2Defeated,
                    completedCount: this.dualBossState.boss2Defeated ? 1 : 0,
                    total: 1,
                };
            }

            const secondBossDone = this.currentBossIndex === 2 && Boolean((this as any).bossDefeatedTriggered);
            return {
                completed: secondBossDone,
                completedCount: secondBossDone ? 1 : 0,
                total: 1,
            };
        }

        if (target === 'boss') {
            if (this.isDualBossLevel && this.secondBossConfig && !this.dualBossState) {
                const completedCount = this.sequentialBoss1Defeated ? 1 : 0;
                return {
                    completed: completedCount >= 1,
                    completedCount,
                    total: 1,
                };
            }

            const total = this.dualBossState ? 2 : 1;
            let completedCount = Math.min(this.defeatedEnemies, total);

            if (this.dualBossState) {
                completedCount =
                    (this.dualBossState.boss1Defeated ? 1 : 0)
                    + (this.dualBossState.boss2Defeated ? 1 : 0);
            }

            return {
                completed: completedCount >= total,
                completedCount,
                total,
            };
        }

        if (typeof target === 'number') {
            const total = target || this.totalEnemies || 0;
            const completedCount = total > 0 ? Math.min(this.defeatedEnemies, total) : this.defeatedEnemies;
            return {
                completed: total > 0 ? this.defeatedEnemies >= total : this.defeatedEnemies > 0,
                completedCount,
                total,
            };
        }

        const total = this.totalEnemies || 0;
        return {
            completed: total > 0 ? this.defeatedEnemies >= total : this.defeatedEnemies > 0,
            completedCount: Math.min(this.defeatedEnemies, total || this.defeatedEnemies),
            total,
        };
    }

    private updateObjectiveDisplay() {
        if (!this.objectiveText) return;
        const objectives = this.levelData?.objectives || [];
        if (objectives.length === 0) {
            this.objectiveText.setText('任务: 无');
            return;
        }

        const lines = objectives.map((objective: any) => {
            const status = this.getObjectiveStatus(objective);
            const flag = status.completed ? '✓' : '□';
            const progress = status.progress ? ` ${status.progress}` : '';
            return `${flag} ${objective.description}${progress}`;
        });

        const completedCount = objectives.filter((objective: any) => this.getObjectiveStatus(objective).completed).length;
        const header = `任务 ${completedCount}/${objectives.length}`;
        this.objectiveText.setText([header, ...lines].join('\n'));
        this.objectiveText.setColor(completedCount === objectives.length ? '#7CFC98' : '#FFFF88');
    }

    private getStableHorizontalDirection(enemy: Phaser.Physics.Arcade.Sprite, deadZone: number = 28) {
        const horizontalGap = this.player.x - enemy.x;
        const cachedDirection = (enemy as any).stableFacingDirection;

        if (Math.abs(horizontalGap) <= deadZone) {
            return cachedDirection || (horizontalGap >= 0 ? 1 : -1);
        }

        const nextDirection = horizontalGap >= 0 ? 1 : -1;
        (enemy as any).stableFacingDirection = nextDirection;
        return nextDirection;
    }

    // 音效辅助函数
    private playSound(soundId: string) {
        if (typeof window !== 'undefined' && (window as any).playGameSound) {
            (window as any).playGameSound(soundId);
        }
    }
    private player!: Phaser.Physics.Arcade.Sprite;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private movingPlatforms: Phaser.Physics.Arcade.Sprite[] = [];
    private autoMovingPlatforms: Phaser.Physics.Arcade.Sprite[] = [];  // 自动移动平台
    private conveyorPlatforms: { sprite: Phaser.GameObjects.Rectangle; data: any }[] = [];  // 🔥 战役9：传送带平台
    private bouncyPlatforms: { sprite: Phaser.GameObjects.Rectangle; data: any }[] = [];  // 🔥 创意工坊：弹跳平台
    private disappearingPlatforms: { sprite: Phaser.GameObjects.Rectangle; data: any; isVisible: boolean; timer: number }[] = [];  // 🔥 创意工坊：消失平台
    private windZonesData: { rect: Phaser.GameObjects.Rectangle; data: any }[] = [];  // 🔥 战役9：风力区域数据
    private explosionTraps: { sprite: Phaser.GameObjects.Arc; data: any; lastExplosion: number; isWarning: boolean }[] = [];  // 🔥 战役9：爆炸陷阱
    private gearChaserTraps: {
        sprite: Phaser.GameObjects.Container;
        data: any;
        homeX: number;
        homeY: number;
        state: 'idle' | 'chasing' | 'cooldown';
        stateStartedAt: number;
        lastHitAt: number;
    }[] = [];
    private expandingHazardTraps: {
        sprite: Phaser.GameObjects.Container;
        core: Phaser.GameObjects.Arc;
        ring: Phaser.GameObjects.Arc;
        data: any;
        state: 'idle' | 'warning' | 'cooldown';
        stateStartedAt: number;
        lastHitAt: number;
        currentRadius: number;
    }[] = [];
    private movingSpikeTraps: {
        sprite: Phaser.GameObjects.Container;
        data: any;
        startX: number;
        startY: number;
        direction: 1 | -1;
        lastHitAt: number;
    }[] = [];
    private enemies!: Phaser.Physics.Arcade.Group;
    private collectibles!: Phaser.Physics.Arcade.Group;
    private obstacles!: Phaser.Physics.Arcade.StaticGroup;
    private goal!: Phaser.GameObjects.Sprite;
    private goalGlow!: Phaser.GameObjects.Arc;  // 终点发光效果
    private bullets!: Phaser.Physics.Arcade.Group; // 子弹组
    private questionTriggers!: Phaser.Physics.Arcade.Group; // 答题触发点

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private attackKey!: Phaser.Input.Keyboard.Key;
    private moveKeys!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };
    private actionKeys!: {
        interact: Phaser.Input.Keyboard.Key;
        attack: Phaser.Input.Keyboard.Key;
        dash: Phaser.Input.Keyboard.Key;
        timeSlow: Phaser.Input.Keyboard.Key;
        shield: Phaser.Input.Keyboard.Key;
    };

    private playerHP: number = 100;
    private maxHP: number = 100;
    private score: number = 0;
    private defeatedEnemies: number = 0;
    private collectedItems: number = 0;
    private totalEnemies: number = 0;
    private totalItems: number = 0;
    private totalQuestions: number = 0;
    private correctQuestions: number = 0;

    private hpBar!: Phaser.GameObjects.Graphics;
    private scoreText!: Phaser.GameObjects.Text;
    private objectiveText!: Phaser.GameObjects.Text;
    private controlsHintText!: Phaser.GameObjects.Text;
    private skillStatusText!: Phaser.GameObjects.Text;
    private goalReached: boolean = false;
    private isLevelIntroActive: boolean = false;

    private levelData!: any;
    private isAttacking: boolean = false;
    private canAttack: boolean = true;
    private startTime: number = 0;
    private timeElapsed: number = 0;

    // 改进的角色控制变量
    private canDoubleJump: boolean = false;
    private hasDoubleJumped: boolean = false;
    private isDashing: boolean = false;
    private dashCooldown: number = 0;
    private coyoteTime: number = 0;
    private jumpBufferTime: number = 0;
    private wasOnGround: boolean = false;
    private isInvulnerable: boolean = false;
    private isGameOver: boolean = false;

    // Boss战相关属性
    private isBossLevel: boolean = false;
    private bossEnemy: Phaser.Physics.Arcade.Sprite | null = null;
    private bossMaxHP: number = 300;
    private bossHP: number = 300;
    private bossPhase: number = 1;
    private bossHPBar!: Phaser.GameObjects.Rectangle;
    private bossHPBarBg!: Phaser.GameObjects.Rectangle;
    private bossHPBarBorder!: Phaser.GameObjects.Rectangle;
    private bossHPText!: Phaser.GameObjects.Text;
    private bossNameText!: Phaser.GameObjects.Text;

    // 🔥 双Boss系统属性
    private isDualBossLevel: boolean = false;
    private currentBossIndex: number = 1;  // 1=第一个Boss, 2=第二个Boss
    private secondBossConfig: any = null;
    private isSpawningSecondBoss: boolean = false;
    private sequentialBoss1Defeated: boolean = false;

    // 🔥🔥🔥 战役9：同时存在的双Boss状态（requireBothDefeated模式）
    private dualBossState: {
        boss1: Phaser.Physics.Arcade.Sprite | null;
        boss2: Phaser.Physics.Arcade.Sprite | null;
        boss1HP: number;
        boss2HP: number;
        boss1MaxHP: number;
        boss2MaxHP: number;
        boss1Defeated: boolean;
        boss2Defeated: boolean;
        enraged: boolean;
    } | null = null;

    // 🔥🔥🔥 战役10：三Boss竞技场状态
    private tripleBossState: {
        bosses: Phaser.Physics.Arcade.Sprite[];
        bossConfigs: any[];
        defeatedCount: number;
        enraged: boolean;
        protectionActive: boolean;
        cooperativeAI: boolean;
    } | null = null;

    // 🔥 双Boss血条UI
    private boss2HPBar!: Phaser.GameObjects.Rectangle;
    private boss2HPBarBg!: Phaser.GameObjects.Rectangle;
    private boss2HPBarBorder!: Phaser.GameObjects.Rectangle;
    private boss2HPText!: Phaser.GameObjects.Text;
    private boss2NameText!: Phaser.GameObjects.Text;
    private laserGuardState: {
        laserActive: boolean;
        laserEndTime: number;
        lastLaserTime: number;
        lastStunTime: number;
        stunCooldown: number;
        laserCooldown: number;
    } = {
            laserActive: false,
            laserEndTime: 0,
            lastLaserTime: 0,
            lastStunTime: 0,
            stunCooldown: 12000,   // 🔥 优化：定身冷却从10秒增加到12秒
            laserCooldown: 8000    // 🔥 优化：激光冷却从6秒增加到8秒
        };

    // 玩家复活相关
    private playerLives: number = 3;
    private showingReviveModal: boolean = false;
    private isAnswering: boolean = false;  // 答题状态标记

    // 触控输入状态追踪（用于检测按键刚按下）
    private lastTouchState: TouchInputState = {
        left: false, right: false, up: false, down: false,
        jump: false, attack: false, interact: false, dash: false, timestamp: 0
    };

    // 🔥 战役8：量子实验室功能
    private portals: Map<string, { sprite: Phaser.GameObjects.Arc; data: any }> = new Map();
    private chemicalZones: { rect: Phaser.GameObjects.Rectangle; data: any }[] = [];
    private gravityZones: { rect: Phaser.GameObjects.Rectangle; data: any }[] = [];
    private lastTeleportTime: number = 0;
    private currentGravityMultiplier: number = 1;
    private playerSpeedBoost: number = 1;

    // 技能系统（从MainScene复刻）
    private playerSkills: string[] = [];
    private isGliding: boolean = false;
    private touchingWall: boolean = false;
    private timeSlowCooldown: number = 0;
    private timeSlowDuration: number = 0;
    private chemicalShieldCooldown: number = 0;
    private chemicalShieldDuration: number = 0;
    private chemicalShieldCharges: number = 0;
    private skillAura: Phaser.GameObjects.Arc | null = null;
    private worldTimeScaleApplied: boolean = false;

    constructor() {
        super({ key: 'PlatformGameScene' });
    }

    init(data: { level: any }) {
        this.levelData = data.level;
        this.playerHP = 100;
        this.maxHP = 100;
        this.score = 0;
        this.defeatedEnemies = 0;
        this.isGameOver = false;
        this.isAnswering = false;  // 重置答题状态
        this.collectedItems = 0;
        this.goalReached = false;
        this.isLevelIntroActive = false;
        this.startTime = Date.now();
        this.timeElapsed = 0;
        this.gearChaserTraps = [];
        this.expandingHazardTraps = [];
        this.movingSpikeTraps = [];

        // 🔥🔥🔥 清理纹理缓存，解决颜色异常问题 🔥🔥🔥
        PlatformGameScene.clearTextureCache();

        // 🔥🔥🔥 清理旧的子弹组，防止残留子弹 🔥🔥🔥
        if (this.bullets) {
            debugLog('[PlatformGameScene] 清理旧子弹组');
            this.bullets.clear(true, true);  // 清除所有子弹并销毁
            this.bullets = null as any;
        }

        // 从游戏状态获取玩家技能
        if (typeof window !== 'undefined') {
            try {
                const { useGameStore } = require('@/store/gameStore');
                const gameState = useGameStore.getState();
                this.playerSkills = gameState.skills || [];
                debugLog('[PlatformGameScene] 加载玩家技能:', this.playerSkills);
            } catch (e) {
                console.warn('[PlatformGameScene] 无法加载技能状态:', e);
                this.playerSkills = [];
            }
        }

        // 重置角色控制状态
        this.hasDoubleJumped = false;
        this.isDashing = false;
        this.dashCooldown = 0;
        this.coyoteTime = 0;
        this.jumpBufferTime = 0;
        this.wasOnGround = false;

        // 🔥🔥🔥 重置双Boss状态
        this.dualBossState = null;
        this.tripleBossState = null;  // 🔥 战役10三Boss状态
        this.isDualBossLevel = false;
        this.isBossLevel = false;
        this.bossEnemy = null;

        this.timeSlowCooldown = 0;
        this.timeSlowDuration = 0;
        this.chemicalShieldCooldown = 0;
        this.chemicalShieldDuration = 0;
        this.chemicalShieldCharges = 0;
        this.worldTimeScaleApplied = false;
        this.skillAura = null;

        // 🔥🔥🔥 重置顺序双Boss状态（战役7-5、8-5）
        this.currentBossIndex = 1;
        this.secondBossConfig = null;
        this.isSpawningSecondBoss = false;
        this.sequentialBoss1Defeated = false;
        (this as any).bossDefeatedTriggered = false;  // 重置Boss击败标志
        (this as any).bossQuizTriggered = false;  // 重置Boss答题标志

        if (this.hasSkill('shield')) {
            this.maxHP = 120;
            this.playerHP = this.maxHP;
        }
    }

    private hasSkill(skillId: string) {
        return this.playerSkills.includes(skillId);
    }

    private hasDashSkill() {
        return this.hasSkill('dash') || this.hasSkill('quantum_dash');
    }

    private hasChemicalShieldSkill() {
        return this.hasSkill('chemical_shield') || this.hasSkill('time_shield');
    }

    private getSkillCooldownMultiplier() {
        return this.hasSkill('science_master') ? 0.8 : 1;
    }

    private getDashCooldownSeconds() {
        const baseCooldown = this.hasSkill('quantum_dash') ? 0.75 : 1;
        return baseCooldown * this.getSkillCooldownMultiplier();
    }

    private getDashSpeed() {
        return this.hasSkill('quantum_dash') ? 680 : 500;
    }

    private getDashDurationMs() {
        return this.hasSkill('quantum_dash') ? 280 : 200;
    }

    private getTimeSlowCooldownSeconds() {
        const baseCooldown = this.hasSkill('time_mastery') ? 6.5 : 8;
        return baseCooldown * this.getSkillCooldownMultiplier();
    }

    private getTimeSlowDurationSeconds() {
        return this.hasSkill('time_mastery') ? 3.4 : 2.5;
    }

    private getTimeSlowFactor() {
        return this.hasSkill('time_mastery') ? 0.35 : 0.5;
    }

    private getChemicalShieldCooldownSeconds() {
        const baseCooldown = this.hasSkill('time_shield') ? 7 : 9;
        return baseCooldown * this.getSkillCooldownMultiplier();
    }

    private getChemicalShieldDurationSeconds() {
        return this.hasSkill('time_shield') ? 5.5 : 4;
    }

    private getChemicalShieldCharges() {
        if (this.hasSkill('time_shield')) return 3;
        if (this.hasSkill('science_master')) return 2;
        return 1;
    }

    create() {
        const { width, height } = this.cameras.main;

        // 🔥🔥🔥 首先重置相机状态，确保从编辑器切换过来时相机正常 🔥🔥🔥
        this.cameras.main.stopFollow();
        this.cameras.main.setZoom(1);
        this.cameras.main.setFollowOffset(0, 0);
        this.cameras.main.scrollX = 0;
        this.cameras.main.scrollY = 0;
        debugLog('[PlatformGameScene] 📷 create开始 - 相机状态已重置');

        // 🔥 修复移动端精灵抖动问题 - 启用像素取整
        this.cameras.main.setRoundPixels(true);

        debugLog('🔥🔥🔥 [PlatformGameScene] 版本: v1.0.6-MOBILE-FIX-20241214 🔥🔥🔥');
        debugLog('[PlatformGameScene] create 被调用');
        debugLog('[PlatformGameScene] levelData:', this.levelData);

        // 🔥🔥🔥 再次确保清理所有旧对象 🔥🔥🔥
        if (this.bullets) {
            debugLog('[PlatformGameScene] create: 清理残留子弹');
            this.bullets.clear(true, true);
        }
        if (this.enemies) {
            debugLog('[PlatformGameScene] create: 清理残留敌人');
            this.enemies.clear(true, true);
        }

        // 设置世界边界（兼容战役地图数据）
        const campaignMapData = (this.levelData as any).campaignMapData;
        const mapData = (this.levelData as any).map;
        debugLog('🔥🔥🔥 [v2025-12-03-21:03] 配置已更新！🔥🔥🔥');
        debugLog('[PlatformGameScene] campaignMapData:', campaignMapData);
        debugLog('[PlatformGameScene] mapData:', mapData);

        let worldWidth = 800;
        let worldHeight = 600;

        if (campaignMapData) {
            // 使用战役地图数据
            worldWidth = campaignMapData.width || 800;
            worldHeight = campaignMapData.height || 600;
        } else if (mapData) {
            // 使用标准地图数据
            worldWidth = mapData.width || 800;
            worldHeight = mapData.height || 600;
        }

        debugLog('[PlatformGameScene] 世界尺寸:', worldWidth, 'x', worldHeight);

        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        // 创建背景
        this.createBackground();

        // 创建平台
        this.createPlatforms();

        // 创建障碍物
        this.createObstacles();

        // 🔥 创建陷阱（战役7新增）
        this.createTraps();

        // 🔥 创建机关（战役7新增）
        this.createMechanisms();

        // 🔥 创建传送门（战役8新增）
        this.createPortals();

        // 🔥 创建化学区域（战役8新增）
        this.createChemicalZones();

        // 🔥 创建重力区域（战役8新增）
        this.createGravityZones();

        // 🔥 创建风力区域（战役9新增）
        this.createWindZones();

        // 🔥 创建爆炸陷阱（战役9新增）
        this.createExplosionTraps();

        // 创建敌人
        this.createEnemies();

        // 创建收集物
        this.createCollectibles();

        // 创建目标点
        this.createGoal();

        // 创建答题触发点
        this.createQuestionTriggers();

        // 创建自动移动平台
        this.createAutoMovingPlatforms();

        // 创建玩家
        this.createPlayer();

        // 创建子弹组
        this.bullets = this.physics.add.group();

        // 设置输入
        this.setupInput();

        // 创建UI
        this.createUI();

        // 设置碰撞
        this.setupCollisions();

        // 设置战役特殊功能
        this.setupCampaign6Features();

        // 监听复活事件
        if (typeof window !== 'undefined') {
            const handlePlayerRevive = (event: any) => {
                const { hpPercent } = event.detail;
                this.playerRevive(hpPercent);
            };

            const handlePlayerGameOver = () => {
                debugLog('[PlatformGameScene] 收到游戏失败事件');
                this.gameOver(false);
            };

            window.addEventListener('playerRevive', handlePlayerRevive);
            window.addEventListener('playerGameOver', handlePlayerGameOver);

            // 在场景销毁时移除监听并清理所有对象
            this.events.once('shutdown', () => {
                debugLog('[PlatformGameScene] 🔥 场景销毁，清理所有对象');
                window.removeEventListener('playerRevive', handlePlayerRevive);
                window.removeEventListener('playerGameOver', handlePlayerGameOver);
                this.deactivateTimeSlow();
                this.clearChemicalShield();

                // 🔥🔥🔥 重置相机状态，确保返回编辑器时相机正常 🔥🔥🔥
                this.cameras.main.stopFollow();
                this.cameras.main.setZoom(1);
                this.cameras.main.setFollowOffset(0, 0);
                this.cameras.main.scrollX = 0;
                this.cameras.main.scrollY = 0;
                debugLog('[PlatformGameScene] 📷 相机状态已重置');

                // 🔥🔥🔥 完全清理所有物理对象，防止残留 🔥🔥🔥
                if (this.bullets) {
                    this.bullets.clear(true, true);
                }
                if (this.enemies) {
                    this.enemies.clear(true, true);
                }
                if (this.collectibles) {
                    this.collectibles.clear(true, true);
                }
                if (this.questionTriggers) {
                    this.questionTriggers.clear(true, true);
                }

                // 清理所有碰撞检测
                this.physics.world.colliders.destroy();

                debugLog('[PlatformGameScene] ✅ 场景清理完成');
            });
        }

        // 🔥🔥🔥 相机跟随设置 - 修复自定义关卡相机问题 🔥🔥🔥
        debugLog('[PlatformGameScene] 📷 ========== 相机设置开始 ==========');
        debugLog('[PlatformGameScene] 📷 世界尺寸:', worldWidth, 'x', worldHeight);
        debugLog('[PlatformGameScene] 📷 玩家位置:', this.player.x, this.player.y);

        const cameraWidth = this.cameras.main.width;
        const cameraHeight = this.cameras.main.height;
        debugLog('[PlatformGameScene] 📷 相机尺寸:', cameraWidth, 'x', cameraHeight);

        // 🔥 检测是否为自定义关卡（测试模式）
        const isCustomLevel = (this.levelData as any).isCustomLevel || (this.levelData as any).isTestMode;
        debugLog('[PlatformGameScene] 📷 是否自定义关卡:', isCustomLevel);

        // 🔥🔥🔥 关键修复：先完全重置相机状态
        this.cameras.main.stopFollow();
        this.cameras.main.setZoom(1);
        this.cameras.main.setFollowOffset(0, 0);
        this.cameras.main.scrollX = 0;
        this.cameras.main.scrollY = 0;

        // 🔥🔥🔥 测试模式始终使用缩放1，跟随玩家
        // 不要缩放显示整个地图，这样玩家无法正常游玩
        const zoomLevel = 1;
        this.cameras.main.setZoom(zoomLevel);
        debugLog('[PlatformGameScene] 📷 应用缩放:', zoomLevel);

        // 🔥🔥🔥 关键修复：设置相机边界
        // 如果地图比相机小，不设置边界限制，让相机自由移动
        // 如果地图比相机大，设置边界为地图大小
        if (worldWidth > cameraWidth || worldHeight > cameraHeight) {
            // 地图比相机大，设置边界
            this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
            debugLog('[PlatformGameScene] 📷 相机边界（大地图）:', 0, 0, worldWidth, worldHeight);
        } else {
            // 地图比相机小或相等，不设置边界限制
            // 这样相机可以自由移动到玩家位置
            this.cameras.main.setBounds(0, 0, Math.max(worldWidth, cameraWidth), Math.max(worldHeight, cameraHeight));
            debugLog('[PlatformGameScene] 📷 相机边界（小地图）:', 0, 0, Math.max(worldWidth, cameraWidth), Math.max(worldHeight, cameraHeight));
        }

        // 🔥🔥🔥 关键修复：先将相机移动到玩家位置，再启用跟随
        this.cameras.main.centerOn(this.player.x, this.player.y);

        // 🔥🔥🔥 使用startFollow + lerp实现平滑跟随
        // lerp值越小越平滑，0.08-0.12是比较好的范围
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // 🔥 设置相机跟随偏移
        // 让玩家显示在屏幕中心偏上位置，方便看到前方
        const offsetY = (worldHeight > cameraHeight) ? -50 : 0;
        this.cameras.main.setFollowOffset(0, offsetY);

        // 🔥 启用像素取整防止抖动
        this.cameras.main.setRoundPixels(true);

        debugLog('[PlatformGameScene] 📷 相机跟随已启用 (lerp: 0.1, offsetY:', offsetY, ')');
        debugLog('[PlatformGameScene] 📷 ========== 相机设置完成 ==========');

        // 显示关卡信息
        this.showLevelInfo();
    }

    private getCampaignVisualTheme() {
        const campaignId = this.getCampaignId();

        const baseTheme = {
            skyTop: 0x0a1628,
            skyBottom: 0x0d1117,
            hill: 0x0f1d2e,
            grass: 0x1a3a1a,
            starPrimary: 0xFFFFFF,
            starSecondary: 0xB0E0FF,
            firefly: 0xAAFF44,
            platform: 0x2D5A27,
            platformBorder: 0x4A7C59,
            groundPlatform: 0x3B2F1E,
            groundBorder: 0x4A7C59,
            movingPlatform: 0xff6b35,
            movingPlatformBorder: 0xff8c42,
            backdrop: 'default',
        };

        switch (campaignId) {
            case 'campaign_11':
                return {
                    ...baseTheme,
                    skyTop: 0x09111f,
                    skyBottom: 0x140d18,
                    hill: 0x1a2333,
                    grass: 0x232014,
                    starPrimary: 0xDCEFFF,
                    starSecondary: 0x7FD6FF,
                    firefly: 0x9BE5FF,
                    platform: 0x48505E,
                    platformBorder: 0x7CA8C1,
                    groundPlatform: 0x3D3128,
                    groundBorder: 0x7A9FB8,
                    movingPlatform: 0x4C7BA2,
                    movingPlatformBorder: 0x8ACFFF,
                    backdrop: 'cave',
                };
            case 'campaign_12':
                return {
                    ...baseTheme,
                    skyTop: 0x071528,
                    skyBottom: 0x10304B,
                    hill: 0x0F2D42,
                    grass: 0x183C3A,
                    starPrimary: 0xE7FBFF,
                    starSecondary: 0x7DE3FF,
                    firefly: 0xC8F7FF,
                    platform: 0x396173,
                    platformBorder: 0x8BDBF3,
                    groundPlatform: 0x2D404C,
                    groundBorder: 0x7BD3EA,
                    movingPlatform: 0x2E8FB2,
                    movingPlatformBorder: 0x8BE8FF,
                    backdrop: 'waterfall',
                };
            case 'campaign_13':
                return {
                    ...baseTheme,
                    skyTop: 0x120C24,
                    skyBottom: 0x1B1A3A,
                    hill: 0x231B43,
                    grass: 0x20284E,
                    starPrimary: 0xF7F2FF,
                    starSecondary: 0xA2C4FF,
                    firefly: 0xD0C2FF,
                    platform: 0x4F5378,
                    platformBorder: 0xB7C8FF,
                    groundPlatform: 0x362E4D,
                    groundBorder: 0x9EB7F1,
                    movingPlatform: 0x7A6BFF,
                    movingPlatformBorder: 0xC8D2FF,
                    backdrop: 'mirror',
                };
            case 'campaign_14':
                return {
                    ...baseTheme,
                    skyTop: 0x0A2030,
                    skyBottom: 0x2C1D18,
                    hill: 0x1F3A45,
                    grass: 0x415735,
                    starPrimary: 0xFFF6DD,
                    starSecondary: 0x8DEBFF,
                    firefly: 0xFFE17A,
                    platform: 0x5A6C3D,
                    platformBorder: 0xE6C46B,
                    groundPlatform: 0x5A4330,
                    groundBorder: 0xDAB36A,
                    movingPlatform: 0xD47A2C,
                    movingPlatformBorder: 0xFFD27D,
                    backdrop: 'wind',
                };
            case 'campaign_15':
                return {
                    ...baseTheme,
                    skyTop: 0x161118,
                    skyBottom: 0x2A1E1A,
                    hill: 0x312822,
                    grass: 0x473928,
                    starPrimary: 0xFFF5D8,
                    starSecondary: 0xFFCFA8,
                    firefly: 0xFFD971,
                    platform: 0x7A5636,
                    platformBorder: 0xE4BE79,
                    groundPlatform: 0x5B3F2A,
                    groundBorder: 0xCDA667,
                    movingPlatform: 0xB9692E,
                    movingPlatformBorder: 0xF1C27D,
                    backdrop: 'academy',
                };
            case 'campaign_16':
                return {
                    ...baseTheme,
                    skyTop: 0x091623,
                    skyBottom: 0x1B2633,
                    hill: 0x1F2E3C,
                    grass: 0x273542,
                    starPrimary: 0xF6FBFF,
                    starSecondary: 0x9FD9FF,
                    firefly: 0xFFD36A,
                    platform: 0x5C6773,
                    platformBorder: 0xBBD7F1,
                    groundPlatform: 0x3E4954,
                    groundBorder: 0xAFC9DE,
                    movingPlatform: 0x6F8DA8,
                    movingPlatformBorder: 0xD8E8F8,
                    backdrop: 'dam',
                };
            default:
                return baseTheme;
        }
    }

    private drawCampaignBackdrop(theme: ReturnType<PlatformGameScene['getCampaignVisualTheme']>, worldWidth: number, worldHeight: number) {
        if (theme.backdrop === 'default') {
            return;
        }

        const graphics = this.add.graphics();
        graphics.setScrollFactor(1);
        graphics.setDepth(-70);

        if (theme.backdrop === 'cave') {
            graphics.fillStyle(0x1B2432, 0.86);
            for (let i = 0; i < 8; i++) {
                const x = 140 + i * (worldWidth / 8);
                graphics.fillEllipse(x, worldHeight * 0.33, 360, 210);
                graphics.fillRect(x - 180, worldHeight * 0.33, 360, worldHeight * 0.4);
            }
            graphics.fillStyle(0x6EB7D6, 0.16);
            for (let i = 0; i < 6; i++) {
                graphics.fillEllipse(260 + i * 620, worldHeight * 0.48, 220, 70);
            }
        } else if (theme.backdrop === 'waterfall') {
            graphics.fillStyle(0x173246, 0.72);
            graphics.fillRect(0, worldHeight * 0.18, worldWidth, worldHeight * 0.16);
            graphics.fillStyle(0x7FDFFF, 0.2);
            for (let i = 0; i < 7; i++) {
                const x = 220 + i * (worldWidth / 7);
                graphics.fillRect(x, worldHeight * 0.08, 90, worldHeight * 0.78);
                graphics.fillEllipse(x + 45, worldHeight * 0.82, 220, 64);
            }
            graphics.fillStyle(0xE6FCFF, 0.14);
            for (let i = 0; i < 10; i++) {
                graphics.fillEllipse(120 + i * 360, worldHeight * 0.78, 160, 36);
            }
        } else if (theme.backdrop === 'mirror') {
            graphics.fillStyle(0x2D3354, 0.55);
            for (let i = 0; i < 9; i++) {
                const x = 140 + i * (worldWidth / 9);
                graphics.fillRect(x, worldHeight * 0.12, 88, worldHeight * 0.72);
            }
            graphics.lineStyle(2, 0xBFD4FF, 0.32);
            for (let i = 0; i < 4; i++) {
                const cx = 420 + i * 920;
                graphics.strokeEllipse(cx, worldHeight * 0.34, 220, 300);
                graphics.strokeEllipse(cx, worldHeight * 0.34, 290, 370);
            }
        } else if (theme.backdrop === 'wind') {
            graphics.fillStyle(0x4E4B33, 0.38);
            graphics.beginPath();
            graphics.moveTo(0, worldHeight * 0.72);
            graphics.lineTo(worldWidth * 0.18, worldHeight * 0.58);
            graphics.lineTo(worldWidth * 0.34, worldHeight * 0.68);
            graphics.lineTo(worldWidth * 0.5, worldHeight * 0.5);
            graphics.lineTo(worldWidth * 0.7, worldHeight * 0.66);
            graphics.lineTo(worldWidth, worldHeight * 0.46);
            graphics.lineTo(worldWidth, worldHeight);
            graphics.lineTo(0, worldHeight);
            graphics.closePath();
            graphics.fillPath();

            graphics.lineStyle(2, 0xDCECC8, 0.24);
            for (let i = 0; i < 12; i++) {
                const x = 80 + i * 340;
                const y = worldHeight * (0.2 + (i % 4) * 0.08);
                graphics.lineBetween(x, y, x + 180, y - 22);
                graphics.lineBetween(x + 40, y + 24, x + 240, y + 2);
            }
        } else if (theme.backdrop === 'academy') {
            graphics.fillStyle(0x3E2B1F, 0.58);
            for (let i = 0; i < 7; i++) {
                const x = 180 + i * (worldWidth / 7);
                graphics.fillRect(x, worldHeight * 0.26, 34, worldHeight * 0.54);
                graphics.fillRect(x - 80, worldHeight * 0.22, 190, 18);
                graphics.fillRect(x - 80, worldHeight * 0.52, 190, 18);
            }
            graphics.fillStyle(0xF7D27A, 0.16);
            for (let i = 0; i < 6; i++) {
                graphics.fillCircle(260 + i * 760, worldHeight * 0.27, 42);
            }
        } else if (theme.backdrop === 'dam') {
            graphics.fillStyle(0x26323D, 0.86);
            graphics.fillRect(0, worldHeight * 0.1, worldWidth, worldHeight * 0.62);
            graphics.fillStyle(0x33424E, 0.92);
            for (let i = 0; i < 10; i++) {
                const x = i * (worldWidth / 10);
                graphics.fillRect(x + 20, worldHeight * 0.14, 120, worldHeight * 0.54);
            }
            graphics.fillStyle(0x96A7B8, 0.24);
            for (let i = 0; i < 8; i++) {
                graphics.fillRect(120 + i * 520, worldHeight * 0.18, 18, worldHeight * 0.46);
            }
            graphics.fillStyle(0xFFD36A, 0.2);
            for (let i = 0; i < 5; i++) {
                graphics.fillCircle(280 + i * 900, worldHeight * 0.2, 18);
            }
        }
    }

    private createBackground() {
        // 获取世界尺寸
        const campaignMapData = (this.levelData as any).campaignMapData;
        const mapData = (this.levelData as any).map;
        const visualTheme = this.getCampaignVisualTheme();

        let worldWidth = 800;
        let worldHeight = 600;

        if (campaignMapData) {
            worldWidth = campaignMapData.width || 800;
            worldHeight = campaignMapData.height || 600;
        } else if (mapData) {
            worldWidth = mapData.width || 800;
            worldHeight = mapData.height || 600;
        }

        debugLog('[PlatformGameScene] 🎨 创建背景 - 尺寸:', worldWidth, 'x', worldHeight);
        debugLog('[PlatformGameScene] 📦 campaignMapData:', campaignMapData);
        debugLog('[PlatformGameScene] 📦 mapData:', mapData);

        // 基础天空渐变
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(
            visualTheme.skyTop,
            visualTheme.skyTop,
            visualTheme.skyBottom,
            visualTheme.skyBottom,
            1
        );
        graphics.fillRect(0, 0, worldWidth, worldHeight);
        graphics.setScrollFactor(1);
        graphics.setDepth(-100);

        // 远景地形剪影
        const hillGraphics = this.add.graphics();
        hillGraphics.fillStyle(visualTheme.hill, 0.82);
        const hillBaseY = worldHeight * 0.65;
        hillGraphics.beginPath();
        hillGraphics.moveTo(0, hillBaseY);
        for (let hx = 0; hx <= worldWidth; hx += 2) {
            const hy = hillBaseY - Math.sin(hx * 0.003) * 40 - Math.sin(hx * 0.007) * 25 - Math.sin(hx * 0.015) * 12;
            hillGraphics.lineTo(hx, hy);
        }
        hillGraphics.lineTo(worldWidth, worldHeight);
        hillGraphics.lineTo(0, worldHeight);
        hillGraphics.closePath();
        hillGraphics.fillPath();
        hillGraphics.setScrollFactor(1);
        hillGraphics.setDepth(-90);

        // 前景地形层
        const grassGraphics = this.add.graphics();
        grassGraphics.fillStyle(visualTheme.grass, 0.7);
        const grassBaseY = worldHeight * 0.82;
        grassGraphics.beginPath();
        grassGraphics.moveTo(0, grassBaseY);
        for (let gx = 0; gx <= worldWidth; gx += 2) {
            const gy = grassBaseY - Math.sin(gx * 0.01) * 8 - Math.sin(gx * 0.025) * 5;
            grassGraphics.lineTo(gx, gy);
        }
        grassGraphics.lineTo(worldWidth, worldHeight);
        grassGraphics.lineTo(0, worldHeight);
        grassGraphics.closePath();
        grassGraphics.fillPath();
        grassGraphics.setScrollFactor(1);
        grassGraphics.setDepth(-80);

        this.drawCampaignBackdrop(visualTheme, worldWidth, worldHeight);

        // 星点 / 环境点光
        const starCount = Math.floor(worldWidth / 10);
        for (let i = 0; i < starCount; i++) {
            const sx = Math.random() * worldWidth;
            const sy = Math.random() * (worldHeight * 0.55);
            const size = Math.random() * 1.8 + 0.5;
            const starColor = Math.random() > 0.3 ? visualTheme.starPrimary : visualTheme.starSecondary;
            const starAlpha = Math.random() * 0.7 + 0.2;
            const star = this.add.circle(sx, sy, size, starColor, starAlpha);
            star.setScrollFactor(1);
            star.setDepth(-50);
            // 闪烁动画
            if (Math.random() > 0.6) {
                this.tweens.add({
                    targets: star,
                    alpha: starAlpha * 0.3,
                    duration: 1500 + Math.random() * 2000,
                    yoyo: true,
                    repeat: -1,
                    delay: Math.random() * 2000
                });
            }
        }

        // 环境粒子
        const fireflyCount = Math.max(6, Math.floor(worldWidth / 120));
        for (let i = 0; i < fireflyCount; i++) {
            const fx = Math.random() * worldWidth;
            const fy = worldHeight * 0.4 + Math.random() * (worldHeight * 0.5);
            const firefly = this.add.circle(fx, fy, 2.5, visualTheme.firefly, 0.7);
            firefly.setScrollFactor(1);
            firefly.setDepth(-40);
            this.tweens.add({
                targets: firefly,
                x: fx + (Math.random() - 0.5) * 80,
                y: fy + (Math.random() - 0.5) * 60,
                alpha: { from: 0.7, to: 0.15 },
                duration: 3000 + Math.random() * 3000,
                yoyo: true,
                repeat: -1,
                delay: Math.random() * 2000,
                ease: 'Sine.easeInOut'
            });
        }

        debugLog('[PlatformGameScene] 🎨 战役背景创建完成:', visualTheme.backdrop);
    }

    private createPlatforms() {
        this.platforms = this.physics.add.staticGroup();

        // 检查是否使用战役地图数据
        const campaignMapData = (this.levelData as any).campaignMapData;
        const platforms = campaignMapData ? campaignMapData.platforms : this.levelData.map.platforms;
        const visualTheme = this.getCampaignVisualTheme();

        debugLog('[PlatformGameScene] 创建平台，数量:', platforms.length);

        platforms.forEach((platform: any) => {
            if (platform.type === 'moving' && platform.movePath) {
                // 移动平台 - 使用 movePath[0] 作为初始位置
                const startX = platform.movePath[0].x;
                const startY = platform.movePath[0].y;
                const endX = platform.movePath[1].x;
                const endY = platform.movePath[1].y;
                const movingPlatform = this.physics.add.sprite(startX, startY, '');
                movingPlatform.setDisplaySize(platform.width, platform.height || 20);

                debugLog('[PlatformGameScene] 🔥 创建移动平台:', startX, startY, '→', endX, endY, '速度:', platform.moveSpeed);

                // 创建移动平台纹理（橙色，更醒目）
                const textureKey = `moving_platform_${this.getCampaignId()}_${platform.width}_${platform.height || 20}`;
                if (!this.textures.exists(textureKey)) {
                    const graphics = this.add.graphics();
                    graphics.fillStyle(visualTheme.movingPlatform, 1);
                    graphics.fillRect(0, 0, platform.width, platform.height || 20);
                    graphics.lineStyle(2, visualTheme.movingPlatformBorder, 1);
                    graphics.strokeRect(0, 0, platform.width, platform.height || 20);
                    graphics.generateTexture(textureKey, platform.width, platform.height || 20);
                    graphics.destroy();
                }

                movingPlatform.setTexture(textureKey);
                movingPlatform.body!.setAllowGravity(false);
                movingPlatform.body!.setImmovable(true);
                movingPlatform.setDepth(15); // 🔥 设置移动平台深度

                // 设置碰撞体大小与显示大小一致
                (movingPlatform.body as Phaser.Physics.Arcade.Body).setSize(platform.width, platform.height || 20);

                // 🔥🔥🔥 关键修复：禁用pushable，防止玩家从下方碰撞时影响平台速度
                (movingPlatform.body as Phaser.Physics.Arcade.Body).pushable = false;

                // 🔥🔥🔥 修复垂直移动平台穿模问题：使用物理速度而不是tween
                // 存储移动数据到平台对象上
                const moveSpeed = platform.moveSpeed || 100;
                const isVertical = Math.abs(endY - startY) > Math.abs(endX - startX);

                (movingPlatform as any).moveData = {
                    startX, startY, endX, endY,
                    moveSpeed,
                    isVertical,
                    direction: 1  // 1 = 向终点移动, -1 = 向起点移动
                };

                // 设置初始速度
                if (isVertical) {
                    const velY = endY > startY ? moveSpeed : -moveSpeed;
                    movingPlatform.setVelocityY(velY);
                    movingPlatform.setVelocityX(0);
                } else {
                    const velX = endX > startX ? moveSpeed : -moveSpeed;
                    movingPlatform.setVelocityX(velX);
                    movingPlatform.setVelocityY(0);
                }

                debugLog('[PlatformGameScene] 移动平台配置 - 垂直:', isVertical, '速度:', moveSpeed);

                this.movingPlatforms.push(movingPlatform);
            } else if (platform.conveyorSpeed !== undefined && platform.conveyorDirection !== undefined) {
                // 🔥 战役9：传送带平台
                const platformHeight = platform.height || 20;
                const conveyorColor = platform.conveyorDirection === 'right' ? 0x3498db : 0xe74c3c; // 蓝色向右，红色向左

                const rect = this.add.rectangle(
                    platform.x + platform.width / 2,
                    platform.y + platformHeight / 2,
                    platform.width,
                    platformHeight,
                    conveyorColor
                );
                rect.setStrokeStyle(2, 0xffffff);
                rect.setDepth(15); // 🔥 设置传送带深度
                this.platforms.add(rect);

                // 添加传送带方向指示箭头
                const arrowText = platform.conveyorDirection === 'right' ? '→→→' : '←←←';
                const arrow = this.add.text(
                    platform.x + platform.width / 2,
                    platform.y + platformHeight / 2,
                    arrowText,
                    { fontSize: '14px', color: '#ffffff' }
                ).setOrigin(0.5);

                // 箭头动画
                this.tweens.add({
                    targets: arrow,
                    x: arrow.x + (platform.conveyorDirection === 'right' ? 10 : -10),
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });

                // 存储传送带数据
                this.conveyorPlatforms.push({
                    sprite: rect,
                    data: {
                        x: platform.x,
                        y: platform.y,
                        width: platform.width,
                        height: platformHeight,
                        conveyorSpeed: platform.conveyorSpeed,
                        conveyorDirection: platform.conveyorDirection
                    }
                });

                debugLog('[PlatformGameScene] 🔥 创建传送带平台:', platform.x, platform.y, '方向:', platform.conveyorDirection, '速度:', platform.conveyorSpeed);
            } else if (platform.type === 'bouncy' || platform.bounceForce !== undefined) {
                // 🔥 创意工坊：弹跳平台
                const platformHeight = platform.height || 20;
                const bounceForce = platform.bounceForce || 800;

                const rect = this.add.rectangle(
                    platform.x + platform.width / 2,
                    platform.y + platformHeight / 2,
                    platform.width,
                    platformHeight,
                    0x00ff88  // 绿色弹跳平台
                );
                rect.setStrokeStyle(3, 0x00ffaa);
                rect.setDepth(15);
                this.platforms.add(rect);

                // 添加弹跳指示
                const bounceText = this.add.text(
                    platform.x + platform.width / 2,
                    platform.y + platformHeight / 2,
                    '🔼',
                    { fontSize: '16px' }
                ).setOrigin(0.5);

                // 弹跳动画
                this.tweens.add({
                    targets: bounceText,
                    y: bounceText.y - 5,
                    duration: 300,
                    yoyo: true,
                    repeat: -1
                });

                // 存储弹跳平台数据
                this.bouncyPlatforms.push({
                    sprite: rect,
                    data: {
                        x: platform.x,
                        y: platform.y,
                        width: platform.width,
                        height: platformHeight,
                        bounceForce: bounceForce
                    }
                });

                debugLog('[PlatformGameScene] 🔥 创建弹跳平台:', platform.x, platform.y, '弹力:', bounceForce);
            } else if (platform.type === 'disappearing' || platform.disappearTime !== undefined) {
                // 🔥 创意工坊：消失平台
                const platformHeight = platform.height || 20;
                const disappearTime = platform.disappearTime || 1000;

                const rect = this.add.rectangle(
                    platform.x + platform.width / 2,
                    platform.y + platformHeight / 2,
                    platform.width,
                    platformHeight,
                    0x9966ff  // 紫色消失平台
                );
                rect.setStrokeStyle(2, 0xcc99ff);
                rect.setDepth(15);
                rect.setAlpha(0.8);
                this.platforms.add(rect);

                // 添加消失指示
                const ghostText = this.add.text(
                    platform.x + platform.width / 2,
                    platform.y + platformHeight / 2,
                    '👻',
                    { fontSize: '14px' }
                ).setOrigin(0.5);

                // 闪烁动画提示
                this.tweens.add({
                    targets: [rect, ghostText],
                    alpha: { from: 0.8, to: 0.5 },
                    duration: 800,
                    yoyo: true,
                    repeat: -1
                });

                // 存储消失平台数据
                this.disappearingPlatforms.push({
                    sprite: rect,
                    data: {
                        x: platform.x,
                        y: platform.y,
                        width: platform.width,
                        height: platformHeight,
                        disappearTime: disappearTime
                    },
                    isVisible: true,
                    timer: 0
                });

                debugLog('[PlatformGameScene] 🔥 创建消失平台:', platform.x, platform.y, '消失时间:', disappearTime);
            } else {
                // 标准平台：按战役主题切换配色
                const platformHeight = platform.height || 20;
                let platformColor = visualTheme.platform;
                let borderColor = visualTheme.platformBorder;
                if (platform.type === 'ground') {
                    platformColor = visualTheme.groundPlatform;
                    borderColor = visualTheme.groundBorder;
                }

                const rect = this.add.rectangle(
                    platform.x + platform.width / 2,
                    platform.y + platformHeight / 2,
                    platform.width,
                    platformHeight,
                    platformColor
                );
                rect.setStrokeStyle(2, borderColor);
                rect.setDepth(10);
                this.platforms.add(rect);
            }
        });

        this.platforms.refresh();
    }

    private createObstacles() {
        this.obstacles = this.physics.add.staticGroup();

        const campaignMapData = (this.levelData as any).campaignMapData;
        const obstacles = campaignMapData ? [] : this.levelData.map.obstacles;

        obstacles.forEach((obstacle: any) => {
            let color = 0xff0000;
            let emoji = '⚠️';

            switch (obstacle.type) {
                case 'spike':
                    color = 0xff4444;
                    emoji = '🔺';
                    break;
                case 'fire':
                    color = 0xff6600;
                    emoji = '🔥';
                    break;
                case 'pit':
                    color = 0x000000;
                    emoji = '🕳️';
                    break;
                case 'laser':
                    color = 0xff00ff;
                    emoji = '⚡';
                    break;
            }

            const obstacleSprite = this.add.rectangle(
                obstacle.x + obstacle.width / 2,
                obstacle.y + obstacle.height / 2,
                obstacle.width,
                obstacle.height,
                color,
                0.7
            );

            const text = this.add.text(
                obstacle.x + obstacle.width / 2,
                obstacle.y + obstacle.height / 2,
                emoji,
                { fontSize: '20px' }
            ).setOrigin(0.5);

            obstacleSprite.setDepth(20); // 🔥 设置障碍物深度
            text.setDepth(21); // 🔥 障碍物文字在障碍物之上
            this.obstacles.add(obstacleSprite);
            (obstacleSprite as any).damage = obstacle.damage;
            (obstacleSprite as any).obstacleType = obstacle.type;
            (obstacleSprite as any).emojiText = text;
        });
    }

    private createTraps() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        const traps = campaignMapData?.traps || [];

        if (traps.length === 0) {
            debugLog('[PlatformGameScene] 没有陷阱');
            return;
        }

        debugLog('[PlatformGameScene] 🔥 创建陷阱:', traps.length, '个');

        traps.forEach((trap: any) => {
            if (trap.type === 'gear_chaser') {
                this.createGearChaserTrap(trap);
                return;
            }

            if (trap.type === 'expanding_hazard') {
                this.createExpandingHazardTrap(trap);
                return;
            }

            if (trap.type === 'moving_spike') {
                this.createMovingSpikeTrap(trap);
                return;
            }

            let color = 0xff0000;
            let emoji = '⚡';

            switch (trap.type) {
                case 'spike':
                    color = 0xff4444;
                    emoji = '🔺';
                    break;
                case 'fire':
                    color = 0xff6600;
                    emoji = '🔥';
                    break;
                case 'electric':
                    color = 0xff00ff;
                    emoji = '⚡';
                    break;
            }

            const trapSprite = this.add.rectangle(
                trap.x,
                trap.y,
                40,
                40,
                color,
                0.7
            );

            const text = this.add.text(
                trap.x,
                trap.y,
                emoji,
                { fontSize: '24px' }
            ).setOrigin(0.5);

            trapSprite.setDepth(20); // 🔥 设置陷阱深度
            text.setDepth(21); // 🔥 陷阱文字在陷阱之上
            this.obstacles.add(trapSprite);
            (trapSprite as any).damage = trap.damage;
            (trapSprite as any).trapType = trap.type;
            (trapSprite as any).emojiText = text;
            (trapSprite as any).pattern = trap.pattern;

            // 周期性闪烁效果（战役7：慢节奏，4秒显示，4秒隐藏）
            if (trap.pattern === 'periodic') {
                const campaignId = this.getCampaignId();
                const duration = campaignId === 'campaign_7' ? 4000 : 1000; // 战役7使用4秒周期

                this.tweens.add({
                    targets: [trapSprite, text],
                    alpha: 0.1,  // 隐藏时几乎透明
                    duration: duration,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Linear'
                });
            }
        });

        debugLog('[PlatformGameScene] ✅ 陷阱创建完成');
    }

    private createGearChaserTrap(trap: any) {
        const radius = trap.radius || 18;
        const theme = trap.visualTheme || 'bronze';
        const palette = theme === 'storm'
            ? { body: 0x5A7CA7, accent: 0xBEE7FF, glow: 0x9CE8FF }
            : theme === 'forge'
                ? { body: 0x7A5134, accent: 0xF4C56D, glow: 0xFFD899 }
                : { body: 0x6D553A, accent: 0xE7BE72, glow: 0xFFE2A4 };

        const graphics = this.add.graphics();
        graphics.fillStyle(palette.body, 1);
        for (let index = 0; index < 8; index += 1) {
            const angle = (Math.PI * 2 * index) / 8;
            const toothX = 32 + Math.cos(angle) * 18;
            const toothY = 32 + Math.sin(angle) * 18;
            graphics.fillRect(toothX - 4, toothY - 4, 8, 8);
        }
        graphics.fillCircle(32, 32, 18);
        graphics.fillStyle(palette.accent, 1);
        graphics.fillCircle(32, 32, 10);
        graphics.lineStyle(3, 0x1d2635, 0.9);
        graphics.strokeCircle(32, 32, 19);
        const textureKey = `gearTrap_${theme}`;
        if (!this.textures.exists(textureKey)) {
            graphics.generateTexture(textureKey, 64, 64);
        }
        graphics.destroy();

        const sprite = this.add.image(trap.x, trap.y, textureKey).setDepth(42).setAlpha(0.96);
        sprite.setDisplaySize(radius * 2.2, radius * 2.2);
        const glow = this.add.circle(0, 0, radius + 8, palette.glow, 0.15);
        const gear = this.add.container(trap.x, trap.y, [glow, sprite]).setDepth(42);
        gear.setScale(0.9);

        this.gearChaserTraps.push({
            sprite: gear,
            data: {
                ...trap,
                radius,
                triggerRadius: trap.triggerRadius || 170,
                speed: trap.speed || 170,
                activeDuration: trap.activeDuration || 2800,
                cooldown: trap.cooldown || 2200,
            },
            homeX: trap.x,
            homeY: trap.y,
            state: 'idle',
            stateStartedAt: Date.now(),
            lastHitAt: 0,
        });
    }

    private createExpandingHazardTrap(trap: any) {
        const baseRadius = trap.radius || 14;
        const theme = trap.visualTheme || 'alert';
        const palette = theme === 'pulse'
            ? { core: 0x7C5CFF, ring: 0xC9BBFF }
            : theme === 'frost'
                ? { core: 0x4AC8FF, ring: 0xC3F1FF }
                : { core: 0xFF6B4A, ring: 0xFFD4A3 };

        const core = this.add.circle(0, 0, baseRadius, palette.core, 0.82);
        core.setStrokeStyle(2, 0xFFFFFF, 0.25);
        const ring = this.add.circle(0, 0, baseRadius + 6, palette.ring, 0.12);
        ring.setStrokeStyle(3, palette.ring, 0.65);
        const sprite = this.add.container(trap.x, trap.y, [ring, core]).setDepth(41);

        this.expandingHazardTraps.push({
            sprite,
            core,
            ring,
            data: {
                ...trap,
                radius: baseRadius,
                maxRadius: trap.maxRadius || 54,
                triggerRadius: trap.triggerRadius || 150,
                growDuration: trap.growDuration || 520,
                activeDuration: trap.activeDuration || 1500,
                cooldown: trap.cooldown || 2200,
            },
            state: 'idle',
            stateStartedAt: Date.now(),
            lastHitAt: 0,
            currentRadius: baseRadius,
        });
    }

    private createMovingSpikeTrap(trap: any) {
        const width = trap.width || 54;
        const height = trap.height || 28;
        const theme = trap.visualTheme || 'steel';
        const fillColor = theme === 'void' ? 0x7C3AED : theme === 'storm' ? 0x3AA6D0 : 0xD64545;
        const accentColor = theme === 'void' ? 0xDDD6FE : theme === 'storm' ? 0xD7F3FF : 0xFFE6E6;

        const graphics = this.add.graphics();
        graphics.fillStyle(fillColor, 1);
        const spikeCount = Math.max(3, Math.floor(width / 12));
        const spikeWidth = width / spikeCount;
        for (let index = 0; index < spikeCount; index += 1) {
            const left = index * spikeWidth;
            graphics.beginPath();
            graphics.moveTo(left, height);
            graphics.lineTo(left + spikeWidth / 2, 0);
            graphics.lineTo(left + spikeWidth, height);
            graphics.closePath();
            graphics.fillPath();
        }
        graphics.lineStyle(2, accentColor, 0.8);
        graphics.strokeRect(0, height - 6, width, 6);
        const textureKey = `movingSpike_${theme}_${width}_${height}`;
        if (!this.textures.exists(textureKey)) {
            graphics.generateTexture(textureKey, width, height);
        }
        graphics.destroy();

        const image = this.add.image(0, 0, textureKey);
        const aura = this.add.rectangle(0, 0, width + 10, height + 10, accentColor, 0.08);
        const sprite = this.add.container(trap.x, trap.y, [aura, image]).setDepth(41);

        this.movingSpikeTraps.push({
            sprite,
            data: {
                ...trap,
                width,
                height,
                axis: trap.axis || 'x',
                speed: trap.speed || 120,
                moveDistance: trap.moveDistance || 180,
            },
            startX: trap.x,
            startY: trap.y,
            direction: 1,
            lastHitAt: 0,
        });
    }

    private createMechanisms() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        const mechanisms = campaignMapData?.mechanisms || [];

        if (mechanisms.length === 0) {
            debugLog('[PlatformGameScene] 没有机关');
            return;
        }

        debugLog('[PlatformGameScene] 🔧 创建机关:', mechanisms.length, '个');

        mechanisms.forEach((mechanism: any) => {
            if (mechanism.type === 'gravity_zone') {
                // 🎊 新年主题：祥云重力区域
                const gravityMultiplier = mechanism.gravityMultiplier ?? -1;  // 默认反重力

                const zone = this.add.rectangle(
                    mechanism.x + mechanism.width / 2,
                    mechanism.y + mechanism.height / 2,
                    mechanism.width,
                    mechanism.height,
                    gravityMultiplier < 0 ? 0xFFD700 : 0xDC143C,  // 反重力金色，正常红色
                    0.25
                );

                const arrow = gravityMultiplier < 0 ? '☁️⬆️' : '☁️⬇️';
                const text = this.add.text(
                    mechanism.x + mechanism.width / 2,
                    mechanism.y + mechanism.height / 2,
                    arrow,
                    { fontSize: '24px' }
                ).setOrigin(0.5);

                // 🔥 关键：存储到gravityZones数组，这样update循环才能检测到
                this.gravityZones.push({
                    rect: zone,
                    data: {
                        x: mechanism.x,
                        y: mechanism.y,
                        width: mechanism.width,
                        height: mechanism.height,
                        gravityMultiplier: gravityMultiplier
                    }
                });

                // 闪烁效果
                this.tweens.add({
                    targets: [zone, text],
                    alpha: { from: 0.2, to: 0.5 },
                    duration: 1500,
                    yoyo: true,
                    repeat: -1
                });

                debugLog('[PlatformGameScene] 🔥 创建重力区域:', mechanism.x, mechanism.y, '重力倍数:', gravityMultiplier);
            } else if (mechanism.type === 'wind') {
                // 🎊 新年主题：祥云风力区域
                // 🔥 修复：使用 windDirection 而不是 effect.direction
                const direction = mechanism.windDirection || mechanism.effect?.direction || 'up';
                const windForce = mechanism.windForce || 300;

                const zone = this.add.rectangle(
                    mechanism.x + mechanism.width / 2,
                    mechanism.y + mechanism.height / 2,
                    mechanism.width,
                    mechanism.height,
                    0x87CEEB,  // 天蓝色风力区域
                    0.3
                );

                let emoji = '⬆️';
                if (direction === 'left') emoji = '⬅️';
                else if (direction === 'right') emoji = '➡️';
                else if (direction === 'down') emoji = '⬇️';

                const text = this.add.text(
                    mechanism.x + mechanism.width / 2,
                    mechanism.y + mechanism.height / 2,
                    emoji + ' ' + windForce,
                    { fontSize: '16px', color: '#ffffff' }
                ).setOrigin(0.5);

                // 🔥 关键：存储到windZonesData数组，这样update循环才能检测到
                this.windZonesData.push({
                    rect: zone,
                    data: {
                        x: mechanism.x,
                        y: mechanism.y,
                        width: mechanism.width,
                        height: mechanism.height,
                        direction: direction,
                        windForce: windForce
                    }
                });

                // 风力动画
                this.tweens.add({
                    targets: text,
                    x: direction === 'right' ? text.x + 10 : direction === 'left' ? text.x - 10 : text.x,
                    y: direction === 'down' ? text.y + 10 : direction === 'up' ? text.y - 10 : text.y,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });

                debugLog('[PlatformGameScene] 🔥 创建风力区域:', mechanism.x, mechanism.y, '方向:', direction, '风力:', windForce);
            } else if (mechanism.type === 'portal') {
                // 🔥 创意工坊：传送门
                const portal = this.add.circle(
                    mechanism.x + (mechanism.width || 64) / 2,
                    mechanism.y + (mechanism.height || 64) / 2,
                    30,
                    0x9933ff,
                    0.7
                );

                const text = this.add.text(
                    mechanism.x + (mechanism.width || 64) / 2,
                    mechanism.y + (mechanism.height || 64) / 2,
                    '🌀',
                    { fontSize: '32px' }
                ).setOrigin(0.5);

                // 旋转动画
                this.tweens.add({
                    targets: text,
                    angle: 360,
                    duration: 2000,
                    repeat: -1
                });

                // 存储传送门数据
                this.portals.set(mechanism.id || `portal_${mechanism.x}_${mechanism.y}`, {
                    sprite: portal,
                    data: {
                        x: mechanism.x,
                        y: mechanism.y,
                        width: mechanism.width || 64,
                        height: mechanism.height || 64,
                        linkedTo: mechanism.linkedTo
                    }
                });

                debugLog('[PlatformGameScene] 🔥 创建传送门:', mechanism.x, mechanism.y, '链接到:', mechanism.linkedTo);
            }
        });

        debugLog('[PlatformGameScene] ✅ 机关创建完成');
    }

    // 🌿 春意夜晚：自然传送门
    private createPortals() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        const portalsData = campaignMapData?.portals || [];

        if (portalsData.length === 0) return;

        debugLog('[PlatformGameScene] 🌸 创建传送门:', portalsData.length, '个');

        portalsData.forEach((portal: any) => {
            // 🌿 自然配色
            const colors: Record<string, number> = {
                blue: 0x4488CC,    // 湖蓝
                orange: 0xCC8844,  // 唐棕
                green: 0x44AA66,   // 翠绿
                purple: 0x8866AA   // 藤紫
            };
            const color = colors[portal.color] || 0x44AA66;

            const portalSprite = this.add.circle(portal.x, portal.y, 35, color, 0.6);
            portalSprite.setStrokeStyle(4, 0x88CCAA, 0.9);
            portalSprite.setDepth(5);

            const innerCircle = this.add.circle(portal.x, portal.y, 20, 0xAAFFCC, 0.6);
            innerCircle.setDepth(6);

            this.tweens.add({
                targets: portalSprite,
                scaleX: 1.3,
                scaleY: 1.3,
                alpha: 0.4,
                duration: 1200,
                yoyo: true,
                repeat: -1
            });

            this.tweens.add({
                targets: innerCircle,
                angle: 360,
                duration: 3000,
                repeat: -1
            });

            const label = this.add.text(portal.x, portal.y - 50, '🌸', {
                fontSize: '24px'
            }).setOrigin(0.5).setDepth(7);

            this.portals.set(portal.id, {
                sprite: portalSprite,
                data: portal
            });
        });

        debugLog('[PlatformGameScene] ✅ 传送门创建完成');
    }

    // 🌿 春意夜晚：自然区域
    private createChemicalZones() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        const zonesData = campaignMapData?.chemicalZones || [];

        if (zonesData.length === 0) return;

        debugLog('[PlatformGameScene] 🌿 创建自然区域:', zonesData.length, '个');

        zonesData.forEach((zone: any) => {
            let themeColor = zone.color;
            if (zone.type === 'acid') themeColor = 0x44AA00;        // 毒液绿
            else if (zone.type === 'poison') themeColor = 0x6B3FA0;  // 毒紫
            else if (zone.type === 'heal') themeColor = 0x44AADD;    // 治愈蓝
            else if (zone.type === 'speed') themeColor = 0xDDAA44;   // 加速金

            const rect = this.add.rectangle(
                zone.x + zone.width / 2,
                zone.y + zone.height / 2,
                zone.width,
                zone.height,
                themeColor,
                0.3
            );
            rect.setStrokeStyle(2, themeColor, 0.6);
            rect.setDepth(1);

            let emoji = '🌿';
            switch (zone.type) {
                case 'acid': emoji = '☢️ 酸'; break;
                case 'poison': emoji = '💀 毒'; break;
                case 'heal': emoji = '💚 治愈'; break;
                case 'speed': emoji = '⚡ 加速'; break;
                case 'synthesis': emoji = '🧪 合成'; break;
            }

            const text = this.add.text(
                zone.x + zone.width / 2,
                zone.y + 20,
                emoji,
                { fontSize: '16px', color: '#B0E0FF' }
            ).setOrigin(0.5).setDepth(2);

            this.tweens.add({
                targets: rect,
                alpha: 0.15,
                duration: 1500,
                yoyo: true,
                repeat: -1
            });

            this.chemicalZones.push({ rect, data: zone });
        });

        debugLog('[PlatformGameScene] ✅ 自然区域创建完成');
    }

    // 🌿 春意夜晚：重力区域
    private createGravityZones() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        const zonesData = campaignMapData?.gravityZones || [];

        if (zonesData.length === 0) return;

        debugLog('[PlatformGameScene] 🌌 创建重力区域:', zonesData.length, '个');

        zonesData.forEach((zone: any) => {
            const color = zone.gravityMultiplier < 0 ? 0x66BBEE : 0x9966CC;  // 反重力天蓝，正常淡紫

            const rect = this.add.rectangle(
                zone.x + zone.width / 2,
                zone.y + zone.height / 2,
                zone.width,
                zone.height,
                color,
                0.25
            );
            rect.setStrokeStyle(3, color, 0.5);
            rect.setDepth(1);

            const arrow = zone.gravityMultiplier < 0 ? '⬆️ 上升' : '⬇️ 下降';
            const text = this.add.text(
                zone.x + zone.width / 2,
                zone.y + 20,
                arrow,
                { fontSize: '16px', color: '#B0E0FF' }
            ).setOrigin(0.5).setDepth(2);

            this.tweens.add({
                targets: rect,
                alpha: 0.1,
                duration: 2000,
                yoyo: true,
                repeat: -1
            });

            this.gravityZones.push({ rect, data: zone });
        });

        debugLog('[PlatformGameScene] ✅ 重力区域创建完成');
    }

    // 🌿 春意夜晚：风力区域
    private createWindZones() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        const zonesData = campaignMapData?.windZones || [];

        if (zonesData.length === 0) return;

        debugLog('[PlatformGameScene] 🍃 创建风力区域:', zonesData.length, '个');

        zonesData.forEach((zone: any) => {
            let color = 0x66CCAA;  // 默认薄荷绿
            if (zone.direction === 'up') color = 0x88DDCC;      // 淡青（向上）
            else if (zone.direction === 'down') color = 0x5599AA;  // 深青（向下）

            const rect = this.add.rectangle(
                zone.x + zone.width / 2,
                zone.y + zone.height / 2,
                zone.width,
                zone.height,
                color,
                0.25
            );
            rect.setStrokeStyle(2, color, 0.5);
            rect.setDepth(1);

            let emoji = '🍃';
            if (zone.direction === 'up') emoji = '🍃⬆️';
            else if (zone.direction === 'down') emoji = '🍃⬇️';
            else if (zone.direction === 'left') emoji = '🍃⬅️';
            else emoji = '🍃➡️';

            const text = this.add.text(
                zone.x + zone.width / 2,
                zone.y + zone.height / 2,
                emoji + ' ' + zone.windForce,
                { fontSize: '14px', color: '#B0E0FF' }
            ).setOrigin(0.5).setDepth(2);

            const moveAmount = 15;
            let targetX = text.x;
            let targetY = text.y;
            if (zone.direction === 'right') targetX += moveAmount;
            else if (zone.direction === 'left') targetX -= moveAmount;
            else if (zone.direction === 'up') targetY -= moveAmount;
            else if (zone.direction === 'down') targetY += moveAmount;

            this.tweens.add({
                targets: text,
                x: targetX,
                y: targetY,
                duration: 800,
                yoyo: true,
                repeat: -1
            });

            this.windZonesData.push({ rect, data: zone });
        });

        debugLog('[PlatformGameScene] ✅ 风力区域创建完成');
    }

    // 🔥 战役9：创建爆炸陷阱
    private createExplosionTraps() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        const trapsData = campaignMapData?.explosionTraps || [];

        if (trapsData.length === 0) return;

        debugLog('[PlatformGameScene] 💥 创建爆炸陷阱:', trapsData.length, '个');

        trapsData.forEach((trap: any) => {
            const sprite = this.add.circle(trap.x, trap.y, 20, 0xff6600, 0.6);
            sprite.setStrokeStyle(3, 0xff0000, 0.8);
            sprite.setDepth(5);

            // 添加警告图标
            const icon = this.add.text(trap.x, trap.y, '💥', {
                fontSize: '20px'
            }).setOrigin(0.5).setDepth(6);

            // 脉冲动画
            this.tweens.add({
                targets: sprite,
                scale: 1.2,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });

            this.explosionTraps.push({
                sprite,
                data: trap,
                lastExplosion: Date.now() - trap.cooldownTime + 2000, // 2秒后第一次爆炸
                isWarning: false
            });
        });

        debugLog('[PlatformGameScene] ✅ 爆炸陷阱创建完成');
    }

    private createEnemies() {
        this.enemies = this.physics.add.group();

        const campaignMapData = (this.levelData as any).campaignMapData;
        const enemies = campaignMapData ? (campaignMapData.enemies || []) : this.levelData.map.enemies;

        this.totalEnemies = enemies.length; // 记录总敌人数
        debugLog('[PlatformGameScene] 创建敌人，数量:', enemies.length);

        enemies.forEach((enemyData: any) => {
            const enemy = this.enemies.create(enemyData.x, enemyData.y, '');

            // 🔥 存储敌人配置参数（创意工坊传入的patrolDistance和moveSpeed）
            (enemy as any).enemyConfig = {
                patrolDistance: enemyData.patrolDistance,
                moveSpeed: enemyData.moveSpeed,
                // 🔥 创意工坊 Boss 技能配置
                skills: enemyData.skills,
                hp: enemyData.hp,
                defeatCondition: enemyData.defeatCondition,
            };

            // 根据类型创建不同的敌人图形
            let textureName = '';
            let size = 32;
            let damage = 1;
            const campaignId = this.getCampaignId();

            switch (enemyData.type) {
                case 'slime':
                case 'basic':
                    textureName = this.createSlimeTexture();
                    size = 32;
                    damage = 1;
                    break;
                case 'bat':
                    textureName = this.createBatTexture();
                    size = 28;
                    damage = 1;
                    break;
                case 'robot':
                    textureName = this.createRobotTexture();
                    size = 36;
                    damage = 2;
                    break;
                case 'turret':
                    textureName = this.createTurretTexture();
                    size = 40;
                    damage = 2;
                    break;
                case 'acid_turret':
                    // 🔥 战役9：酸液喷射怪
                    textureName = this.createAcidTurretTexture();
                    size = 45;
                    damage = 2;
                    break;
                case 'boss':
                    // 根据战役ID创建不同的Boss
                    textureName = this.createBossTexture(campaignId);
                    size = this.getBossSize(campaignId);
                    damage = 3;
                    break;
                default:
                    textureName = this.createSlimeTexture();
                    size = 32;
                    damage = 1;
                    break;
            }

            enemy.setTexture(textureName);
            enemy.setDisplaySize(size, size);
            (enemy as any).damage = enemyData.damage || damage;
            (enemy as any).enemyType = enemyData.type;

            // 🔥 设置敌人深度，防止与其他元素重叠时闪烁
            enemy.setDepth(50);

            // 🔥🔥🔥 修复移动端精灵抖动/闪烁问题
            // 1. 禁用亚像素渲染，使用整数像素位置
            const body = enemy.body as Phaser.Physics.Arcade.Body;
            if (body) {
                // 禁用物理body的亚像素移动
                body.setAllowGravity(false);  // 先禁用重力，后面根据类型重新设置
            }

            // 检查是否是Boss
            if (enemyData.type === 'boss') {
                this.isBossLevel = true;
                this.bossPhase = 1;

                // 🔥 检测Boss配置
                const bossConfig = (this.levelData as any).campaignMapData?.bossConfig || (this.levelData as any).bossConfig;

                // 🔥🔥🔥 战役10：三Boss竞技场模式
                if (bossConfig && bossConfig.mode === 'triple_boss_arena') {
                    this.isDualBossLevel = true;  // 复用双Boss标记

                    // 初始化三Boss状态
                    if (!this.tripleBossState) {
                        this.tripleBossState = {
                            bosses: [],
                            bossConfigs: [bossConfig.boss1, bossConfig.boss2, bossConfig.boss3],
                            defeatedCount: 0,
                            enraged: false,
                            protectionActive: false,
                            cooperativeAI: bossConfig.cooperativeAI || true
                        };
                        debugLog('[Boss] 🔥🔥🔥 战役10三Boss竞技场模式！');
                    }

                    // 根据bossIndex分配Boss配置
                    const bossIndex = (enemyData as any).bossIndex || (this.tripleBossState.bosses.length + 1);
                    const thisBossConfig = this.tripleBossState.bossConfigs[bossIndex - 1];

                    if (thisBossConfig) {
                        (enemy as any).bossIndex = bossIndex;
                        (enemy as any).bossId = thisBossConfig.id;
                        (enemy as any).bossName = thisBossConfig.name;
                        (enemy as any).bossConfig = thisBossConfig;
                        (enemy as any).bossHP = thisBossConfig.hp;
                        (enemy as any).bossMaxHP = thisBossConfig.hp;
                        (enemy as any).aiType = thisBossConfig.aiType;
                        (enemy as any).chaseSpeed = thisBossConfig.chaseSpeed || 100;
                        (enemy as any).attackRange = thisBossConfig.attackRange || 200;
                        (enemy as any).keepDistance = thisBossConfig.keepDistance || 0;
                        (enemy as any).canTeleport = thisBossConfig.canTeleport || false;
                        (enemy as any).defeated = false;

                        // 设置Boss颜色
                        if (thisBossConfig.color) {
                            enemy.setTint(thisBossConfig.color);
                        }

                        this.tripleBossState.bosses.push(enemy);

                        // 第一个Boss作为主Boss引用
                        if (bossIndex === 1) {
                            this.bossEnemy = enemy;
                            this.bossMaxHP = thisBossConfig.hp;
                            this.bossHP = thisBossConfig.hp;
                        }

                        debugLog(`[Boss] ${thisBossConfig.name}已创建，HP:${thisBossConfig.hp}，AI类型:${thisBossConfig.aiType}`);
                    }
                } else if (bossConfig && bossConfig.type === 'dual') {
                    this.isDualBossLevel = true;

                    // 🔥🔥🔥 战役9特殊处理：同时存在的双Boss（requireBothDefeated模式）
                    if (bossConfig.requireBothDefeated) {
                        // 初始化双Boss追踪
                        if (!this.dualBossState) {
                            this.dualBossState = {
                                boss1: null,
                                boss2: null,
                                boss1HP: bossConfig.phase1Boss?.hp || 450,
                                boss2HP: bossConfig.phase2Boss?.hp || 450,
                                boss1MaxHP: bossConfig.phase1Boss?.hp || 450,
                                boss2MaxHP: bossConfig.phase2Boss?.hp || 450,
                                boss1Defeated: false,
                                boss2Defeated: false,
                                enraged: false
                            };
                            debugLog('[Boss] 🔥🔥🔥 战役9双Boss模式！必须击败两个Boss！');
                        }

                        // 分配Boss到对应槽位
                        if (!this.dualBossState.boss1) {
                            this.dualBossState.boss1 = enemy;
                            (enemy as any).bossIndex = 1;
                            (enemy as any).bossName = bossConfig.phase1Boss?.name || '酸液博士';
                            (enemy as any).bossConfig = bossConfig.phase1Boss || null;
                            this.bossMaxHP = this.dualBossState.boss1MaxHP;
                            this.bossHP = this.dualBossState.boss1HP;
                            this.bossEnemy = enemy;
                            this.applyBossVisual(enemy, campaignId, bossConfig.phase1Boss || null, 1);
                            debugLog('[Boss] 酸液博士已创建，HP:', this.dualBossState.boss1MaxHP);
                        } else if (!this.dualBossState.boss2) {
                            this.dualBossState.boss2 = enemy;
                            (enemy as any).bossIndex = 2;
                            (enemy as any).bossName = bossConfig.phase2Boss?.name || '气体博士';
                            (enemy as any).bossConfig = bossConfig.phase2Boss || null;
                            this.applyBossVisual(enemy, campaignId, bossConfig.phase2Boss || null, 2);
                            debugLog('[Boss] 气体博士已创建，HP:', this.dualBossState.boss2MaxHP);
                        }
                    } else {
                        // 原有的顺序双Boss模式
                        this.currentBossIndex = 1;
                        this.secondBossConfig = bossConfig.secondBoss;
                        this.bossMaxHP = bossConfig.hp || 400;
                        this.bossEnemy = enemy;
                        (enemy as any).bossConfig = bossConfig.phase1Boss || null;
                        this.applyBossVisual(enemy, campaignId, bossConfig.phase1Boss || null, 1);
                        debugLog('[Boss] 🔥 双Boss关卡（顺序模式）！第一个Boss HP:', this.bossMaxHP);
                    }
                } else {
                    this.bossEnemy = enemy;

                    // 🔥🔥🔥 创意工坊 Boss：使用传入的 hp 配置
                    const customBossHP = (enemy as any).enemyConfig?.hp;
                    if (customBossHP && customBossHP > 0) {
                        this.bossMaxHP = customBossHP;
                        debugLog('[Boss] 🔥 创意工坊Boss HP:', customBossHP);
                    } else {
                        this.bossMaxHP = 300;  // 默认血量
                    }

                    // 🔥 存储击败条件和答题配置（同时保存到场景级别，防止Boss消失后无法读取）
                    const defeatCondition = (enemy as any).enemyConfig?.defeatCondition || 'combat';
                    const questionsRequired = (enemy as any).enemyConfig?.questionsRequired || 3;
                    (enemy as any).defeatCondition = defeatCondition;
                    (enemy as any).questionsRequired = questionsRequired;
                    (enemy as any).questionsAnswered = 0;

                    // 🔥🔥🔥 保存到场景级别，Boss消失后仍可读取
                    (this as any).savedDefeatCondition = defeatCondition;
                    (this as any).savedQuestionsRequired = questionsRequired;
                    debugLog('[Boss] 🔥 击败条件:', defeatCondition, '需要答题数:', questionsRequired);

                    this.applyBossVisual(enemy, campaignId, bossConfig || null, 1);
                }
                this.bossHP = this.bossMaxHP;

                // 设置Boss深度，确保在其他物体上方
                enemy.setDepth(100);

                // 给Boss添加唯一ID，用于AI识别
                (enemy as any).enemyId = 'boss_' + Date.now();

                // Boss不受世界边界限制，可以自由移动
                enemy.setCollideWorldBounds(false);

                // Boss禁用重力，完全由AI控制移动（避免卡在平台上）
                (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

                // 记录Boss的初始位置，用于AI巡逻和防止掉落
                (enemy as any).initialY = enemyData.y;
                (enemy as any).initialX = enemyData.x;
                (enemy as any).maxFallDistance = 150;  // 最大下落距离
                (enemy as any).patrolRangeX = 300;  // 横向巡逻范围

                // 创建Boss血量条
                this.createBossHealthBar();

                debugLog('[Boss] Boss已创建（无重力模式），HP:', this.bossMaxHP, '位置:', enemyData.x, enemyData.y);
            }

            // 添加浮动动画（Boss不添加，避免影响移动）
            // 🔥 移动端优化：减小浮动幅度，使用更平滑的动画
            if (enemyData.type === 'bat') {
                const floatY = Math.round(enemyData.y - 3);  // 🔥 减小浮动幅度（原来是5）
                this.tweens.add({
                    targets: enemy,
                    y: floatY,
                    duration: 1500 + Math.random() * 500,  // 🔥 延长动画时间，更平滑
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }

            debugLog('[PlatformGameScene] 创建敌人:', enemyData.type, '位置:', enemyData.x, enemyData.y);
        });
    }

    private createCollectibles() {
        this.collectibles = this.physics.add.group();

        const campaignMapData = (this.levelData as any).campaignMapData;
        const collectibles = campaignMapData ? (campaignMapData.collectibles || []) : this.levelData.map.collectibles;

        this.totalItems = collectibles.length; // 记录总物品数

        collectibles.forEach((item: any) => {
            const collectible = this.collectibles.create(item.x, item.y, '');

            let textureName = '';

            switch (item.type) {
                case 'coin':
                    textureName = this.createCoinTexture();
                    break;
                case 'gem':
                    textureName = this.createGemTexture();
                    break;
                case 'key':
                    textureName = this.createKeyTexture();
                    break;
                case 'clue':
                    textureName = this.createClueTexture();
                    break;
                case 'dash_star':
                    // 🔥 战役8：冲刺星星
                    textureName = this.createDashStarTexture();
                    break;
                case 'health_pack':
                    // 🔥 战役9：爱心血包
                    textureName = this.createHeartTexture();
                    break;
                default:
                    textureName = this.createCoinTexture();
                    break;
            }

            collectible.setTexture(textureName);
            collectible.setDisplaySize(20, 20);
            (collectible as any).value = item.value;
            (collectible as any).itemType = item.type;

            // 🔥 设置收集物深度，防止与其他元素重叠时闪烁
            collectible.setDepth(40);

            // 禁用物理碰撞的重力和速度，防止抖动
            const body = collectible.body as Phaser.Physics.Arcade.Body;
            if (body) {
                body.setAllowGravity(false);
                body.setImmovable(true);
                body.setVelocity(0, 0);
            }

            // 根据类型添加不同动画
            if (item.type === 'health_pack') {
                // 🔥 爱心血包：脉动效果（心跳）
                this.tweens.add({
                    targets: collectible,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                // 轻微浮动
                this.tweens.add({
                    targets: collectible,
                    y: item.y - 5,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else {
                // 其他收集物：浮动和旋转动画
                this.tweens.add({
                    targets: collectible,
                    y: item.y - 10,
                    angle: 360,
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
    }

    private createGoal() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        const goalPos = campaignMapData ? campaignMapData.goal : this.levelData.map.goalPosition;
        const { x, y } = goalPos;

        // 🌿 春意夜晚：发光花朵终点
        const flagGraphics = this.add.graphics();

        // 花茎（绿色）
        flagGraphics.fillStyle(0x2D8A4E, 1);
        flagGraphics.fillRect(18, 30, 4, 16);

        // 叶子（绿色）
        flagGraphics.fillStyle(0x44AA66, 1);
        flagGraphics.fillEllipse(14, 38, 10, 6);
        flagGraphics.fillEllipse(26, 35, 10, 6);

        // 花瓣（淡粉色）
        flagGraphics.fillStyle(0xFF99BB, 1);
        flagGraphics.fillEllipse(20, 14, 10, 8);
        flagGraphics.fillEllipse(12, 20, 8, 10);
        flagGraphics.fillEllipse(28, 20, 8, 10);
        flagGraphics.fillEllipse(14, 28, 10, 8);
        flagGraphics.fillEllipse(26, 28, 10, 8);

        // 花蕊（金色）
        flagGraphics.fillStyle(0xFFDD44, 1);
        flagGraphics.fillCircle(20, 22, 5);

        flagGraphics.generateTexture('goalFlag', 40, 48);
        flagGraphics.destroy();

        this.goal = this.physics.add.sprite(x, y, 'goalFlag');
        this.goal.setDisplaySize(30, 36);
        (this.goal.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        // 淡绿发光效果
        this.goalGlow = this.add.circle(x, y, 25, 0x7CFC00, 0.35);
        this.tweens.add({
            targets: this.goalGlow,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0.1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // 如果是Boss关卡，初始时隐藏终点和发光效果，并禁用物理体
        if (this.isBossLevel) {
            this.goal.setVisible(false);
            this.goalGlow.setVisible(false);
            // 完全禁用Boss关卡的goal物理体
            (this.goal.body as Phaser.Physics.Arcade.Body).enable = false;
            debugLog('[PlatformGameScene] Boss关卡，终点隐藏并禁用物理体');
        } else {
            // 如果目标是击败敌人，初始时隐藏终点
            const objective = this.levelData.objectives[0];
            if (objective.type === 'defeat') {
                this.goal.setVisible(false);
                this.goalGlow.setVisible(false);
                debugLog('[PlatformGameScene] 目标是击败敌人，终点和发光效果初始隐藏');
            }
        }

        // 旗帜飘动动画
        this.tweens.add({
            targets: this.goal,
            angle: -5,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private createQuestionTriggers() {
        this.questionTriggers = this.physics.add.group();

        const campaignMapData = (this.levelData as any).campaignMapData;
        const triggers = campaignMapData?.questionTriggers || [];

        if (triggers.length === 0) {
            debugLog('[PlatformGameScene] 没有答题触发点');
            return;
        }

        triggers.forEach((trigger: any) => {
            const questionTrigger = this.questionTriggers.create(trigger.x, trigger.y, '');
            questionTrigger.setDisplaySize(40, 40);
            (questionTrigger.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

            // 创建书本图标
            const bookGraphics = this.add.graphics();
            bookGraphics.fillStyle(0x8b4513, 1);
            bookGraphics.fillRect(0, 0, 30, 40);
            bookGraphics.fillStyle(0xffeecc, 1);
            bookGraphics.fillRect(2, 2, 26, 36);
            bookGraphics.lineStyle(2, 0x000000, 0.5);
            bookGraphics.lineBetween(15, 10, 15, 30);
            bookGraphics.strokeRect(0, 0, 30, 40);
            bookGraphics.generateTexture('questionBook', 30, 40);
            bookGraphics.destroy();

            questionTrigger.setTexture('questionBook');

            // 存储题目ID和奖励信息
            (questionTrigger as any).questionId = trigger.questionId;
            (questionTrigger as any).reward = trigger.reward;
            (questionTrigger as any).rewardData = trigger.rewardData;
            (questionTrigger as any).answered = false;

            // 添加浮动动画
            this.tweens.add({
                targets: questionTrigger,
                y: trigger.y - 10,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // 添加问号文字
            const questionMark = this.add.text(trigger.x, trigger.y - 50, '?', {
                fontSize: '32px',
                color: '#ffff00',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: questionMark,
                y: trigger.y - 60,
                alpha: 0.6,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });

            (questionTrigger as any).questionMark = questionMark;

            debugLog('[PlatformGameScene] 创建答题触发点:', trigger.questionId, '位置:', trigger.x, trigger.y);
        });
    }

    private createAutoMovingPlatforms() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        const autoPlatforms = campaignMapData?.autoMovingPlatforms || [];
        const visualTheme = this.getCampaignVisualTheme();

        if (autoPlatforms.length === 0) {
            debugLog('[PlatformGameScene] 没有自动移动平台');
            return;
        }

        autoPlatforms.forEach((platformData: any) => {
            const platform = this.physics.add.sprite(platformData.startX, platformData.y, '');

            // 性能优化：使用纹理缓存
            const textureKey = `autoPlatform_${this.getCampaignId()}_${platformData.width}`;
            if (!PlatformGameScene.textureCache.has(textureKey)) {
                const graphics = this.add.graphics();
                graphics.fillStyle(visualTheme.movingPlatform, 1);
                graphics.fillRect(0, 0, platformData.width, 20);
                graphics.lineStyle(2, visualTheme.movingPlatformBorder, 1);
                graphics.strokeRect(0, 0, platformData.width, 20);
                graphics.generateTexture(textureKey, platformData.width, 20);
                graphics.destroy();

                PlatformGameScene.textureCache.set(textureKey, true);
                debugLog('[性能] 创建纹理缓存:', textureKey);
            }

            platform.setTexture(textureKey);
            platform.setDisplaySize(platformData.width, 20);

            // 🔥🔥🔥 修复移动平台碰撞体问题 - 碰撞体必须与视觉大小一致
            platform.setImmovable(true);
            (platform.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

            // 🔥🔥🔥 关键修复：Phaser sprite默认以中心为原点
            // 纹理大小是platformData.width x 20，sprite显示大小也是platformData.width x 20
            // 但body默认是基于纹理原始大小的，需要重新设置
            // 由于sprite以中心为原点，body也需要居中
            const bodyWidth = platformData.width;
            const bodyHeight = 20;
            (platform.body as Phaser.Physics.Arcade.Body).setSize(bodyWidth, bodyHeight);
            // 🔥 关键：由于setDisplaySize不会自动调整body，需要手动设置
            // body的offset是相对于sprite左上角的，sprite中心在(width/2, height/2)
            // 所以body需要从(0,0)开始才能与视觉对齐
            (platform.body as Phaser.Physics.Arcade.Body).setOffset(0, 0);

            // 🔥 确保sprite的origin是中心(0.5, 0.5)，这是默认值
            platform.setOrigin(0.5, 0.5);

            // 存储平台数据（支持垂直移动和触发启动）
            (platform as any).autoData = {
                speed: platformData.speed,
                endX: platformData.endX,
                startX: platformData.startX,
                endY: (platformData as any).endY,  // 战役7新增
                startY: platformData.y,
                triggerOnPlayerLand: platformData.triggerOnPlayerLand || false,  // 战役10新增：玩家跳上后才启动
                isActivated: !platformData.triggerOnPlayerLand,  // 如果不需要触发，则默认激活
                currentSpeed: platformData.triggerOnPlayerLand ? 0 : platformData.speed  // 初始速度
            };

            this.autoMovingPlatforms.push(platform);

            const moveType = (platformData as any).endY !== undefined ? '垂直' : '水平';
            const endPos = (platformData as any).endY !== undefined ?
                `y: ${platformData.y} → ${(platformData as any).endY}` :
                `x: ${platformData.startX} → ${platformData.endX}`;
            const triggerInfo = platformData.triggerOnPlayerLand ? ' [等待玩家跳上启动]' : '';
            debugLog('[PlatformGameScene] 🚂 创建自动移动平台 (' + moveType + '):', endPos, '速度:', platformData.speed, triggerInfo);
        });
    }

    private createPlayer() {
        const campaignMapData = (this.levelData as any).campaignMapData;
        // 🔥🔥🔥 修复：正确获取地图高度，而不是硬编码600
        const worldHeight = campaignMapData ? (campaignMapData.height || 600) : (this.levelData.map?.height || 600);
        const groundY = worldHeight - 32;
        debugLog('[PlatformGameScene] 🎮 createPlayer - worldHeight:', worldHeight, 'groundY:', groundY);

        // 🎊 新年主题：超萌新年福娃角色（小朋友喜欢的可爱设计）
        const playerGraphics = this.add.graphics();
        const centerX = 32;
        const centerY = 32;
        const radius = 26;

        // 🎊 身体（红色圆润身体）- 像个小福娃
        playerGraphics.fillGradientStyle(0xE8363B, 0xE8363B, 0xC41E3A, 0xC41E3A, 1);
        playerGraphics.fillCircle(centerX, centerY + 2, radius);

        // 🎊 金色虎头帽（更可爱的设计）
        // 帽子主体
        playerGraphics.fillStyle(0xFFD700, 1);
        playerGraphics.fillEllipse(centerX, centerY - 18, 40, 18);
        // 虎耳朵（圆润）
        playerGraphics.fillCircle(centerX - 16, centerY - 24, 10);
        playerGraphics.fillCircle(centerX + 16, centerY - 24, 10);
        // 耳朵内部（橙色）
        playerGraphics.fillStyle(0xFF8C00, 1);
        playerGraphics.fillCircle(centerX - 16, centerY - 24, 5);
        playerGraphics.fillCircle(centerX + 16, centerY - 24, 5);
        // 帽子上的"王"字装饰
        playerGraphics.fillStyle(0x8B0000, 1);
        playerGraphics.fillRect(centerX - 6, centerY - 22, 12, 3);
        playerGraphics.fillRect(centerX - 2, centerY - 22, 4, 10);

        // 🎊 超大可爱眼睛（卡通风格）
        // 眼白
        playerGraphics.fillStyle(0xffffff, 1);
        playerGraphics.fillEllipse(centerX - 10, centerY - 2, 12, 14);
        playerGraphics.fillEllipse(centerX + 10, centerY - 2, 12, 14);
        // 眼珠（大而圆）
        playerGraphics.fillStyle(0x2D1B0E, 1);
        playerGraphics.fillCircle(centerX - 8, centerY - 1, 5);
        playerGraphics.fillCircle(centerX + 8, centerY - 1, 5);
        // 眼睛高光（让眼睛更有神）
        playerGraphics.fillStyle(0xffffff, 1);
        playerGraphics.fillCircle(centerX - 10, centerY - 3, 2);
        playerGraphics.fillCircle(centerX + 6, centerY - 3, 2);

        // 🎊 粉嫩腮红（更大更明显）
        playerGraphics.fillStyle(0xFFB6C1, 0.7);
        playerGraphics.fillEllipse(centerX - 18, centerY + 6, 8, 5);
        playerGraphics.fillEllipse(centerX + 18, centerY + 6, 8, 5);

        // 🎊 可爱小嘴巴（微笑弧线）
        playerGraphics.lineStyle(2, 0x8B0000, 1);
        playerGraphics.beginPath();
        playerGraphics.arc(centerX, centerY + 10, 8, 0.3, Math.PI - 0.3);
        playerGraphics.strokePath();

        // 🎊 小鼻子
        playerGraphics.fillStyle(0xFFB6C1, 1);
        playerGraphics.fillCircle(centerX, centerY + 5, 3);

        // 🎊 金色发光边缘（闪闪发光）
        playerGraphics.lineStyle(3, 0xFFD700, 0.9);
        playerGraphics.strokeCircle(centerX, centerY + 2, radius + 3);

        // 将图形转换为纹理（64x64）
        playerGraphics.generateTexture('playerChar', 64, 64);
        playerGraphics.destroy();

        // 创建玩家物理体
        // 使用campaignMapData的startPosition，如果没有则使用默认值
        const campaignMapDataForPlayer = (this.levelData as any).campaignMapData;
        const mapData = this.levelData.map;
        let startX = 100;
        let startY = groundY - 100;

        if (campaignMapDataForPlayer && campaignMapDataForPlayer.startPosition) {
            startX = campaignMapDataForPlayer.startPosition.x;
            startY = campaignMapDataForPlayer.startPosition.y;
            debugLog('🔥🔥🔥 [v2025-12-03-21:03] 使用战役地图起始位置:', startX, startY, '🔥🔥🔥');
        } else if (mapData && mapData.startPosition) {
            startX = mapData.startPosition.x;
            startY = mapData.startPosition.y;
            debugLog('[PlatformGameScene] 使用地图起始位置:', startX, startY);
        } else {
            debugLog('[PlatformGameScene] 使用默认起始位置:', startX, startY);
        }

        this.player = this.physics.add.sprite(startX, startY, 'playerChar');
        debugLog('🔥🔥🔥 [v21:22] 玩家创建后的实际位置:', this.player.x, this.player.y, '🔥🔥🔥');

        // 🔥 v2.1.12: 支持自定义玩家大小（用于特殊关卡）
        const playerScale = campaignMapData?.playerScale || 1.0;
        const baseSize = 40;
        const displaySize = baseSize * playerScale;

        // 🔥 显示大小（根据playerScale缩放）
        this.player.setDisplaySize(displaySize, displaySize);

        // 🔥 碰撞体（比显示大15像素 * scale）
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const collisionSize = (baseSize + 15) * playerScale;
        body.setSize(collisionSize, collisionSize);
        body.setOffset((64 - collisionSize) / 2, (64 - collisionSize) / 2);

        if (playerScale !== 1.0) {
            debugLog(`🔥 [v2.1.12] 玩家大小缩放: ${playerScale}x, 显示: ${displaySize}px, 碰撞: ${collisionSize}px`);
        }

        this.player.setBounce(0.1);
        this.player.setData('velocityBeforeGlide', 0);

        // 🔥 设置玩家深度，确保在敌人和收集物之上
        this.player.setDepth(60);

        debugLog('🔥🔥🔥 [2025-12-03 17:46] 玩家碰撞体已设置 🔥🔥🔥');
        debugLog('[PlatformGameScene] 📍 显示位置:', this.player.x, this.player.y);
        debugLog('[PlatformGameScene] 📦 显示大小:', this.player.displayWidth, 'x', this.player.displayHeight);
        debugLog('[PlatformGameScene] 💥 碰撞体大小:', body.width, 'x', body.height);
        debugLog('[PlatformGameScene] 📌 碰撞体偏移:', body.offset.x, body.offset.y);
        debugLog('🔥🔥🔥 如果看到这个说明代码已更新！🔥🔥🔥');
    }

    private setupInput() {
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
            this.moveKeys = this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D,
            }) as typeof this.moveKeys;
            this.actionKeys = this.input.keyboard.addKeys({
                interact: Phaser.Input.Keyboard.KeyCodes.F,
                attack: Phaser.Input.Keyboard.KeyCodes.G,
                dash: Phaser.Input.Keyboard.KeyCodes.H,
                timeSlow: Phaser.Input.Keyboard.KeyCodes.J,
                shield: Phaser.Input.Keyboard.KeyCodes.K,
            }) as typeof this.actionKeys;
        }
    }

    private createUI() {
        const { width, height } = this.cameras.main;
        const isMobile = isMobileDevice();

        // 🔥 移动端UI缩放
        const uiScale = isMobile ? 0.85 : 1;
        const fontSize = isMobile ? '16px' : '20px';
        const smallFontSize = isMobile ? '13px' : '16px';
        const tinyFontSize = isMobile ? '11px' : '14px';

        // HP条
        this.hpBar = this.add.graphics();
        this.hpBar.setScrollFactor(0);
        this.updateHPBar();

        // 分数
        this.scoreText = this.add.text(20, 50, `分数: ${this.score}`, {
            fontSize: fontSize,
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0);

        // 目标
        this.objectiveText = this.add.text(20, isMobile ? 75 : 80, '', {
            fontSize: smallFontSize,
            color: '#ffff00',
            backgroundColor: '#000000aa',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0);
        this.objectiveText.setLineSpacing(4);
        this.updateObjectiveDisplay();

        // 技能提示（底部）- 移动端简化或隐藏
        if (!isMobile) {
            this.controlsHintText = this.add.text(width / 2, height - 12, buildPlatformControlsText({
                hasDoubleJump: this.playerSkills.includes('double_jump'),
                hasDash: this.hasDashSkill(),
                isQuantumDash: this.hasSkill('quantum_dash'),
                hasGlide: this.playerSkills.includes('glide'),
                hasWallJump: this.playerSkills.includes('wall_jump'),
                hasTimeSlow: this.hasSkill('time_slow'),
                hasShield: this.hasChemicalShieldSkill(),
            }), {
                fontSize: '10px',
                color: '#00ff00',
                align: 'center',
                stroke: '#04110a',
                strokeThickness: 4,
            }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(2000);
            this.refreshControlsHintLayout();
        }
        // 移动端不显示键盘提示，因为有虚拟控制器

        this.skillStatusText = this.add.text(width - 18, 18, '', {
            fontSize: tinyFontSize,
            color: '#8ff7ff',
            backgroundColor: '#000000aa',
            padding: { x: 8, y: 5 },
            align: 'right'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000);
        this.updateSkillStatusDisplay();
    }

    private fitBottomHintText(
        textObject: Phaser.GameObjects.Text,
        maxWidth: number,
        preferredFontSize = 10,
        minFontSize = 8
    ) {
        let nextFontSize = preferredFontSize;
        textObject.setFontSize(`${nextFontSize}px`);

        while (nextFontSize > minFontSize && textObject.width > maxWidth) {
            nextFontSize -= 1;
            textObject.setFontSize(`${nextFontSize}px`);
        }
    }

    private refreshControlsHintLayout() {
        if (!this.controlsHintText) return;

        const { width, height } = this.cameras.main;
        this.controlsHintText.setPosition(width / 2, height - 12);
        this.fitBottomHintText(this.controlsHintText, Math.max(280, width - 40));
    }

    private updateSkillStatusDisplay() {
        if (!this.skillStatusText) return;

        const lines: string[] = [];
        const isMobile = isMobileDevice();
        const activeSkillKey = isMobile ? '技能键' : 'J';
        const shieldSkillKey = isMobile ? '技能键' : 'K';

        if (this.hasSkill('time_slow')) {
            const status = this.timeSlowDuration > 0
                ? `进行中 ${this.timeSlowDuration.toFixed(1)}s`
                : this.timeSlowCooldown > 0
                    ? `冷却 ${this.timeSlowCooldown.toFixed(1)}s`
                    : '就绪';
            lines.push(`${activeSkillKey} 时间减速 ${status}`);
        }

        if (this.hasChemicalShieldSkill()) {
            const shieldLabel = this.chemicalShieldDuration > 0
                ? `护盾 ${this.chemicalShieldCharges}层`
                : this.chemicalShieldCooldown > 0
                    ? `冷却 ${this.chemicalShieldCooldown.toFixed(1)}s`
                    : '就绪';
            lines.push(`${shieldSkillKey} 化学护盾 ${shieldLabel}`);
        }

        if (this.hasSkill('science_master')) {
            lines.push('被动 科学大师 冷却缩短');
        }

        if (isMobile && this.hasChemicalShieldSkill() && this.hasSkill('time_slow')) {
            lines.push('技能键：先开盾，再减速');
        }

        this.skillStatusText.setText(lines.join('\n'));
        this.skillStatusText.setVisible(lines.length > 0);
    }

    private activateTimeSlow() {
        if (!this.hasSkill('time_slow') || this.timeSlowCooldown > 0 || this.timeSlowDuration > 0) {
            return;
        }

        this.timeSlowDuration = this.getTimeSlowDurationSeconds();
        this.timeSlowCooldown = this.getTimeSlowCooldownSeconds();
        this.updateSkillStatusDisplay();

        const timeScale = this.getTimeSlowFactor();
        this.physics.world.timeScale = timeScale;
        this.time.timeScale = timeScale;
        this.tweens.timeScale = timeScale;
        this.worldTimeScaleApplied = true;

        const burst = this.add.circle(this.player.x, this.player.y, 36, 0x7dd3fc, 0.28);
        burst.setDepth(95);
        this.tweens.add({
            targets: burst,
            scaleX: 2.4,
            scaleY: 2.4,
            alpha: 0,
            duration: 420,
            onComplete: () => burst.destroy()
        });

        const title = this.add.text(this.player.x, this.player.y - 58, '⏳ 时间放慢', {
            fontSize: '20px',
            color: '#fde68a',
            stroke: '#0f172a',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(120);
        this.tweens.add({
            targets: title,
            y: title.y - 26,
            alpha: 0,
            duration: 650,
            onComplete: () => title.destroy()
        });
    }

    private deactivateTimeSlow() {
        if (!this.worldTimeScaleApplied) {
            return;
        }

        this.physics.world.timeScale = 1;
        this.time.timeScale = 1;
        this.tweens.timeScale = 1;
        this.worldTimeScaleApplied = false;
        this.updateSkillStatusDisplay();
    }

    private activateChemicalShield() {
        if (!this.hasChemicalShieldSkill() || this.chemicalShieldCooldown > 0 || this.chemicalShieldDuration > 0) {
            return;
        }

        this.chemicalShieldDuration = this.getChemicalShieldDurationSeconds();
        this.chemicalShieldCooldown = this.getChemicalShieldCooldownSeconds();
        this.chemicalShieldCharges = this.getChemicalShieldCharges();
        this.updateSkillStatusDisplay();

        if (!this.skillAura) {
            this.skillAura = this.add.circle(this.player.x, this.player.y, 34, 0x38bdf8, 0.18);
            this.skillAura.setStrokeStyle(3, 0x67e8f9, 0.95);
            this.skillAura.setDepth(94);
            this.tweens.add({
                targets: this.skillAura,
                scaleX: 1.08,
                scaleY: 1.08,
                alpha: 0.28,
                duration: 480,
                yoyo: true,
                repeat: -1
            });
        }

        const shieldText = this.add.text(this.player.x, this.player.y - 58, '🛡️ 护盾展开', {
            fontSize: '20px',
            color: '#bfdbfe',
            stroke: '#082f49',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(120);
        this.tweens.add({
            targets: shieldText,
            y: shieldText.y - 20,
            alpha: 0,
            duration: 650,
            onComplete: () => shieldText.destroy()
        });
    }

    private clearChemicalShield() {
        this.chemicalShieldDuration = 0;
        this.chemicalShieldCharges = 0;
        if (this.skillAura) {
            this.skillAura.destroy();
            this.skillAura = null;
        }
        this.updateSkillStatusDisplay();
    }

    private absorbIncomingDamage(source: 'damage' | 'chemical') {
        if (this.chemicalShieldDuration <= 0 || this.chemicalShieldCharges <= 0) {
            return false;
        }

        this.chemicalShieldCharges -= 1;
        this.player.setTint(source === 'chemical' ? 0x7dd3fc : 0x67e8f9);
        this.time.delayedCall(120, () => {
            if (this.player?.active) {
                this.player.clearTint();
            }
        });

        const blockText = this.add.text(this.player.x, this.player.y - 36, '护盾抵消', {
            fontSize: '16px',
            color: '#7dd3fc',
            stroke: '#082f49',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(120);
        this.tweens.add({
            targets: blockText,
            y: blockText.y - 24,
            alpha: 0,
            duration: 420,
            onComplete: () => blockText.destroy()
        });

        if (this.chemicalShieldCharges <= 0) {
            this.clearChemicalShield();
        } else {
            this.updateSkillStatusDisplay();
        }

        return true;
    }

    private getLevelBossConfig() {
        return (this.levelData as any).campaignMapData?.bossConfig || (this.levelData as any).bossConfig || null;
    }

    private getDualBossDisplayNames() {
        const bossConfig = this.getLevelBossConfig();
        return {
            boss1: bossConfig?.phase1Boss?.name || '左门神',
            boss2: bossConfig?.phase2Boss?.name || '右门神',
        };
    }

    private getSecondBossDisplayName() {
        return this.secondBossConfig?.name || '激光守卫';
    }

    private runConfiguredDualBossSkills(
        enemy: Phaser.Physics.Arcade.Sprite,
        bossIndex: number,
        bossHPPercent: number,
        aiData: any,
        now: number
    ) {
        const dualBossConfig = this.getLevelBossConfig();
        if (!dualBossConfig || dualBossConfig.type !== 'dual' || !dualBossConfig.requireBothDefeated) {
            return;
        }

        const bossConfig = bossIndex === 1 ? dualBossConfig.phase1Boss : dualBossConfig.phase2Boss;
        if (!bossConfig) {
            return;
        }

        const attacks = new Set<string>(bossConfig.attacks || []);
        const cooldownMultiplier = this.dualBossState?.enraged ? 0.5 : 1;
        const tryUseSkill = (key: string, cooldown: number, action: () => void) => {
            const stampKey = `dualBoss_${key}`;
            if (!aiData[stampKey]) {
                aiData[stampKey] = 0;
            }
            if (now - aiData[stampKey] > cooldown * cooldownMultiplier) {
                action();
                aiData[stampKey] = now;
            }
        };

        if (attacks.has('acid_pool')) {
            tryUseSkill('acidPool', 3200, () => this.bossAcidPool(enemy));
        }
        if (attacks.has('acid_spray')) {
            tryUseSkill('acidSpray', 4200, () => this.bossAcidSpray(enemy));
        }
        if (attacks.has('poison_cloud')) {
            tryUseSkill('poisonCloud', 4200, () => this.bossPoisonCloud(enemy));
        }
        if (attacks.has('gas_burst')) {
            tryUseSkill('gasBurst', 5200, () => this.bossGasBurst(enemy));
        }
        if (attacks.has('projectile')) {
            tryUseSkill('projectile', 2200, () => this.enemyShoot(enemy));
        }
        if (attacks.has('projectile_spread')) {
            tryUseSkill('projectileSpread', 3400, () =>
                this.bossRedSpreadShot(enemy, 5, 16, (enemy as any).bossName || 'Boss')
            );
        }
        if (attacks.has('summon')) {
            tryUseSkill('summon', 12000, () => this.bossSpawnMinions(enemy));
        }

        const dualState: any = this.dualBossState as any;
        const canUseCombinedAttack =
            !!dualBossConfig.combinedAttack &&
            !!dualState &&
            !this.dualBossState?.boss1Defeated &&
            !this.dualBossState?.boss2Defeated &&
            bossHPPercent < 0.55;

        if (canUseCombinedAttack) {
            if (!dualState.lastCombinedAttackTime) {
                dualState.lastCombinedAttackTime = 0;
            }
            const comboCooldown = (dualBossConfig.combinedAttack.cooldown || 10000) * cooldownMultiplier;
            if (now - dualState.lastCombinedAttackTime > comboCooldown) {
                this.bossChemicalReaction(enemy);
                dualState.lastCombinedAttackTime = now;
            }
        }
    }

    private createBossHealthBar() {
        const { width } = this.cameras.main;
        const isMobile = isMobileDevice();

        // 获取Boss名称
        const campaignId = this.getCampaignId();

        // 🔥🔥🔥 战役9双Boss模式：创建两个血条
        if (this.dualBossState) {
            debugLog('[Boss] 🔥 创建双Boss血条UI');
            const { boss1, boss2 } = this.getDualBossDisplayNames();

            const barWidth = isMobile ? 180 : 240;
            const barHeight = isMobile ? 20 : 25;
            const gap = 20;
            const totalWidth = barWidth * 2 + gap;
            const startX = width / 2 - totalWidth / 2;
            const y = isMobile ? 50 : 60;

            // 🎊 新年主题：Boss1 血条（左门神）
            const boss1Name = boss1;
            this.bossNameText = this.add.text(startX + barWidth / 2, y - 20, boss1Name, {
                fontSize: isMobile ? '14px' : '16px',
                color: '#FFD700',  // 金色
                fontStyle: 'bold',
                stroke: '#8B0000',  // 深红描边
                strokeThickness: 3
            }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

            this.bossHPBarBg = this.add.rectangle(startX, y, barWidth, barHeight, 0x2D0A0A, 0.8);  // 暗红背景
            this.bossHPBarBg.setOrigin(0, 0).setScrollFactor(0).setDepth(1000);

            this.bossHPBar = this.add.rectangle(startX, y, barWidth, barHeight, 0xDC143C);  // 中国红
            this.bossHPBar.setOrigin(0, 0).setScrollFactor(0).setDepth(1001);

            this.bossHPBarBorder = this.add.rectangle(startX, y, barWidth, barHeight);
            this.bossHPBarBorder.setStrokeStyle(3, 0xFFD700, 1);  // 金色边框
            this.bossHPBarBorder.setOrigin(0, 0).setScrollFactor(0).setDepth(1002);
            this.bossHPBarBorder.setFillStyle(0x000000, 0);

            this.bossHPText = this.add.text(
                startX + barWidth / 2, y + barHeight / 2,
                `${this.dualBossState.boss1HP}/${this.dualBossState.boss1MaxHP}`,
                { fontSize: '14px', color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(1003);

            // 🎊 新年主题：Boss2 血条（右门神）
            const boss2X = startX + barWidth + gap;
            const boss2Name = boss2;
            this.boss2NameText = this.add.text(boss2X + barWidth / 2, y - 20, boss2Name, {
                fontSize: isMobile ? '14px' : '16px',
                color: '#FFD700',  // 金色
                fontStyle: 'bold',
                stroke: '#8B0000',  // 深红描边
                strokeThickness: 3
            }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

            this.boss2HPBarBg = this.add.rectangle(boss2X, y, barWidth, barHeight, 0x2D0A0A, 0.8);  // 暗红背景
            this.boss2HPBarBg.setOrigin(0, 0).setScrollFactor(0).setDepth(1000);

            this.boss2HPBar = this.add.rectangle(boss2X, y, barWidth, barHeight, 0x8B0000);  // 深红
            this.boss2HPBar.setOrigin(0, 0).setScrollFactor(0).setDepth(1001);

            this.boss2HPBarBorder = this.add.rectangle(boss2X, y, barWidth, barHeight);
            this.boss2HPBarBorder.setStrokeStyle(3, 0xFFD700, 1);  // 金色边框
            this.boss2HPBarBorder.setOrigin(0, 0).setScrollFactor(0).setDepth(1002);
            this.boss2HPBarBorder.setFillStyle(0x000000, 0);

            this.boss2HPText = this.add.text(
                boss2X + barWidth / 2, y + barHeight / 2,
                `${this.dualBossState.boss2HP}/${this.dualBossState.boss2MaxHP}`,
                { fontSize: '14px', color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(1003);

            // 双Boss战斗开始对话
            this.time.delayedCall(500, () => {
                this.showBossDialogue(boss1Name, '先找真路。', 1600);
                this.playSound('boss_appear');
            });
            this.time.delayedCall(2500, () => {
                this.showBossDialogue(boss2Name, '别想硬闯。', 1600);
            });

            debugLog('[Boss] 双Boss血条UI创建完成');
            return;
        }

        // 🔥 原有单Boss血条逻辑
        const barWidth = isMobile ? Math.min(400, width - 40) : 500;
        const barHeight = isMobile ? 24 : 30;
        const x = width / 2 - barWidth / 2;
        const y = isMobile ? 50 : 60;

        const bossName = this.getLevelBossConfig()?.phase1Boss?.name || this.getBossName(campaignId);

        // Boss名称 - 移动端字体稍小
        this.bossNameText = this.add.text(width / 2, y - (isMobile ? 20 : 25), bossName, {
            fontSize: isMobile ? '18px' : '24px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: isMobile ? 3 : 4
        });
        this.bossNameText.setOrigin(0.5);
        this.bossNameText.setScrollFactor(0);
        this.bossNameText.setDepth(1000);

        // 背景
        this.bossHPBarBg = this.add.rectangle(x, y, barWidth, barHeight, 0x000000, 0.7);
        this.bossHPBarBg.setOrigin(0, 0);
        this.bossHPBarBg.setScrollFactor(0);
        this.bossHPBarBg.setDepth(1000);

        // 血条
        this.bossHPBar = this.add.rectangle(x, y, barWidth, barHeight, 0xff0000);
        this.bossHPBar.setOrigin(0, 0);
        this.bossHPBar.setScrollFactor(0);
        this.bossHPBar.setDepth(1001);

        // 边框
        this.bossHPBarBorder = this.add.rectangle(x, y, barWidth, barHeight);
        this.bossHPBarBorder.setStrokeStyle(3, 0xffff00, 1);
        this.bossHPBarBorder.setOrigin(0, 0);
        this.bossHPBarBorder.setScrollFactor(0);
        this.bossHPBarBorder.setDepth(1002);
        this.bossHPBarBorder.setFillStyle(0x000000, 0);

        // 文字
        this.bossHPText = this.add.text(
            width / 2,
            y + barHeight / 2,
            `${this.bossHP}/${this.bossMaxHP}`,
            {
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        this.bossHPText.setOrigin(0.5);
        this.bossHPText.setScrollFactor(0);
        this.bossHPText.setDepth(1003);

        debugLog('[Boss] Boss血量条已创建');

        // Boss战斗开始对话
        const bossDialogues: { [key: string]: string } = {
            'campaign_1': '古街守护者：这里是禁地，退下！',
            'campaign_2': '科技机器人：入侵者检测，启动防御程序！',
            'campaign_3': '水流巨兽：水之力量，不可阻挡！',
            'campaign_4': '古代战将：来者何人，报上名来！',
            'campaign_5': '时间守护者：时间的长河，由我守护！'
        };

        const bossNames: { [key: string]: string } = {
            'campaign_1': '古街守护者',
            'campaign_2': '科技机器人',
            'campaign_3': '水流巨兽',
            'campaign_4': '古代战将',
            'campaign_5': '时间守护者'
        };

        if (bossDialogues[campaignId]) {
            this.time.delayedCall(500, () => {
                this.showBossDialogue(bossNames[campaignId], bossDialogues[campaignId], 3000);
                this.playSound('boss_appear');
            });
        }
    }

    private updateBossHP(damage: number, targetBoss?: Phaser.Physics.Arcade.Sprite) {
        if (!this.isBossLevel || !this.bossEnemy) return;

        debugLog('[Boss] updateBossHP被调用！伤害:', damage);

        // 🔥🔥🔥 战役10三Boss模式：分别处理三个Boss的伤害
        if (this.tripleBossState && targetBoss) {
            const bossIndex = (targetBoss as any).bossIndex;
            const bossConfig = (targetBoss as any).bossConfig;

            if (!bossIndex || (targetBoss as any).defeated) {
                debugLog('[Boss] 三Boss模式：无效目标或已被击败');
                return;
            }

            // 扣血
            (targetBoss as any).bossHP = Math.max(0, (targetBoss as any).bossHP - damage);
            const hpPercent = (targetBoss as any).bossHP / (targetBoss as any).bossMaxHP;

            debugLog(`[Boss] ${(targetBoss as any).bossName}受到${damage}伤害，剩余HP: ${(targetBoss as any).bossHP}/${(targetBoss as any).bossMaxHP}`);

            // 更新对应的血条（根据bossIndex）
            this.updateTripleBossHealthBar(bossIndex, hpPercent, (targetBoss as any).bossHP, (targetBoss as any).bossMaxHP);

            // 检查是否被击败
            if ((targetBoss as any).bossHP <= 0) {
                this.onTripleBossDefeated(targetBoss, bossIndex);
            }

            return;  // 三Boss模式处理完毕
        }

        // 🔥🔥🔥 战役9双Boss模式：分别处理两个Boss的伤害
        // 🔥 修复：只要dualBossState存在就进入双Boss逻辑，不要求两个Boss都存在
        if (this.dualBossState) {
            // 确定攻击的是哪个Boss
            let hitBoss1 = false;
            let hitBoss2 = false;

            if (targetBoss) {
                // 如果指定了目标Boss
                hitBoss1 = !!(this.dualBossState.boss1 && targetBoss === this.dualBossState.boss1);
                hitBoss2 = !!(this.dualBossState.boss2 && targetBoss === this.dualBossState.boss2);
            } else {
                // 根据玩家位置判断攻击哪个Boss（攻击距离更近的存活Boss）
                const playerX = this.player.x;
                const boss1Alive = this.dualBossState.boss1 && !this.dualBossState.boss1Defeated;
                const boss2Alive = this.dualBossState.boss2 && !this.dualBossState.boss2Defeated;

                if (boss1Alive && boss2Alive) {
                    const boss1X = this.dualBossState.boss1!.x;
                    const boss2X = this.dualBossState.boss2!.x;
                    const dist1 = Math.abs(playerX - boss1X);
                    const dist2 = Math.abs(playerX - boss2X);
                    hitBoss1 = dist1 <= dist2;
                    hitBoss2 = !hitBoss1;
                } else if (boss1Alive) {
                    hitBoss1 = true;
                } else if (boss2Alive) {
                    hitBoss2 = true;
                }
            }

            debugLog(`[Boss] 双Boss伤害判定: hitBoss1=${hitBoss1}, hitBoss2=${hitBoss2}, boss1Defeated=${this.dualBossState.boss1Defeated}, boss2Defeated=${this.dualBossState.boss2Defeated}`);

            // 处理Boss1伤害
            if (hitBoss1 && !this.dualBossState.boss1Defeated) {
                this.dualBossState.boss1HP = Math.max(0, this.dualBossState.boss1HP - damage);
                const hp1Percent = this.dualBossState.boss1HP / this.dualBossState.boss1MaxHP;

                // 更新Boss1血条
                if (this.bossHPBar) {
                    this.bossHPBar.width = 240 * hp1Percent;
                    this.bossHPText.setText(`${this.dualBossState.boss1HP}/${this.dualBossState.boss1MaxHP}`);

                    // 🎊 新年主题：红金配色血条
                    if (hp1Percent > 0.6) this.bossHPBar.setFillStyle(0xDC143C);  // 中国红
                    else if (hp1Percent > 0.3) this.bossHPBar.setFillStyle(0xFF6B6B);  // 浅红
                    else this.bossHPBar.setFillStyle(0x8B0000);  // 深红
                }

                debugLog(`[Boss] 酸液博士受到${damage}伤害，剩余HP: ${this.dualBossState.boss1HP}/${this.dualBossState.boss1MaxHP}`);

                // 检查Boss1是否被击败
                if (this.dualBossState.boss1HP <= 0) {
                    this.dualBossState.boss1Defeated = true;
                    this.onDualBossDefeated(1);
                }
            }

            // 处理Boss2伤害
            if (hitBoss2 && !this.dualBossState.boss2Defeated) {
                this.dualBossState.boss2HP = Math.max(0, this.dualBossState.boss2HP - damage);
                const hp2Percent = this.dualBossState.boss2HP / this.dualBossState.boss2MaxHP;

                // 更新Boss2血条
                if (this.boss2HPBar) {
                    this.boss2HPBar.width = 240 * hp2Percent;
                    this.boss2HPText.setText(`${this.dualBossState.boss2HP}/${this.dualBossState.boss2MaxHP}`);

                    // 🎊 新年主题：红金配色血条
                    if (hp2Percent > 0.6) this.boss2HPBar.setFillStyle(0x8B0000);  // 深红
                    else if (hp2Percent > 0.3) this.boss2HPBar.setFillStyle(0xB22222);  // 火砖红
                    else this.boss2HPBar.setFillStyle(0x800000);  // 栗色
                }

                debugLog(`[Boss] 气体博士受到${damage}伤害，剩余HP: ${this.dualBossState.boss2HP}/${this.dualBossState.boss2MaxHP}`);

                // 检查Boss2是否被击败
                if (this.dualBossState.boss2HP <= 0) {
                    this.dualBossState.boss2Defeated = true;
                    this.onDualBossDefeated(2);
                }
            }

            return;  // 双Boss模式处理完毕
        }

        // 🔥 原有单Boss逻辑
        this.bossHP = Math.max(0, this.bossHP - damage);
        const hpPercent = this.bossHP / this.bossMaxHP;

        // 更新血条宽度
        this.bossHPBar.width = 500 * hpPercent;
        this.bossHPText.setText(`${this.bossHP}/${this.bossMaxHP}`);

        // 血条颜色变化
        if (hpPercent > 0.6) {
            this.bossHPBar.setFillStyle(0xff0000); // 红色
        } else if (hpPercent > 0.3) {
            this.bossHPBar.setFillStyle(0xff8800); // 橙色
        } else {
            this.bossHPBar.setFillStyle(0xffff00); // 黄色
        }

        debugLog(`[Boss] Boss受到${damage}伤害，剩余HP: ${this.bossHP}/${this.bossMaxHP}`);

        // 检查阶段转换
        if (this.bossHP <= this.bossMaxHP * 0.66 && this.bossPhase === 1) {
            this.enterBossPhase2();
        } else if (this.bossHP <= this.bossMaxHP * 0.33 && this.bossPhase === 2) {
            this.enterBossPhase3();
        } else if (this.bossHP <= 0) {
            this.bossDefeated();
        }
    }

    // 🔥🔥🔥 战役9：双Boss被击败处理
    private onDualBossDefeated(bossIndex: number) {
        if (!this.dualBossState) return;

        const { boss1, boss2 } = this.getDualBossDisplayNames();
        const bossName = bossIndex === 1 ? boss1 : boss2;
        debugLog(`[Boss] 🔥 ${bossName}被击败！`);
        this.playSound('boss_defeated');

        // 获取被击败的Boss
        const defeatedBoss = bossIndex === 1 ? this.dualBossState.boss1 : this.dualBossState.boss2;

        // Boss死亡动画
        if (defeatedBoss) {
            this.tweens.add({
                targets: defeatedBoss,
                alpha: 0,
                scale: 0,
                angle: 360,
                duration: 1000,
                onComplete: () => {
                    defeatedBoss.destroy();
                    if (bossIndex === 1) {
                        this.dualBossState!.boss1 = null;
                    } else {
                        this.dualBossState!.boss2 = null;
                    }
                }
            });
        }

        // 隐藏对应的血条
        if (bossIndex === 1 && this.bossHPBar) {
            this.tweens.add({
                targets: [this.bossHPBar, this.bossHPBarBg, this.bossHPBarBorder, this.bossHPText, this.bossNameText],
                alpha: 0.3,
                duration: 500
            });
        } else if (bossIndex === 2 && this.boss2HPBar) {
            this.tweens.add({
                targets: [this.boss2HPBar, this.boss2HPBarBg, this.boss2HPBarBorder, this.boss2HPText, this.boss2NameText],
                alpha: 0.3,
                duration: 500
            });
        }

        // 检查是否两个Boss都被击败
        if (this.dualBossState.boss1Defeated && this.dualBossState.boss2Defeated) {
            debugLog('[Boss] 🎉🎉🎉 两个Boss都被击败！战斗胜利！');

            // 显示胜利提示
            const victoryText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                '🎉 双Boss击败！\n战斗胜利！',
                {
                    fontSize: '48px',
                    color: '#00ff00',
                    align: 'center',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 6
                }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

            this.tweens.add({
                targets: victoryText,
                scale: 1.2,
                duration: 500,
                yoyo: true,
                repeat: 2,
                onComplete: () => {
                    victoryText.destroy();
                    this.gameOver(true);
                }
            });
        } else {
            // 另一个Boss狂暴！
            const survivingBossName = bossIndex === 1 ? boss2 : boss1;
            this.dualBossState.enraged = true;

            // 显示狂暴提示
            const enrageText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                `⚠️ ${survivingBossName}狂暴了！\n攻击速度和伤害提升！`,
                {
                    fontSize: '32px',
                    color: '#ff0000',
                    align: 'center',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

            this.tweens.add({
                targets: enrageText,
                alpha: 0,
                y: enrageText.y - 50,
                duration: 3000,
                onComplete: () => enrageText.destroy()
            });

            // 狂暴视觉效果
            const survivingBoss = bossIndex === 1 ? this.dualBossState.boss2 : this.dualBossState.boss1;
            if (survivingBoss) {
                survivingBoss.setTint(0xff0000);
                this.tweens.add({
                    targets: survivingBoss,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: 3
                });
            }

            debugLog(`[Boss] 🔥 ${survivingBossName}进入狂暴状态！`);
        }
    }

    // 🔥🔥🔥 战役10：三Boss血条更新
    private updateTripleBossHealthBar(bossIndex: number, hpPercent: number, currentHP: number, maxHP: number) {
        // 根据bossIndex更新对应的血条
        // bossIndex 1 = 主血条, 2 = 第二血条, 3 = 需要创建第三血条
        if (bossIndex === 1 && this.bossHPBar) {
            this.bossHPBar.width = 200 * hpPercent;
            if (this.bossHPText) this.bossHPText.setText(`${currentHP}/${maxHP}`);
            // 颜色变化
            if (hpPercent > 0.6) this.bossHPBar.setFillStyle(0xe8363b);
            else if (hpPercent > 0.3) this.bossHPBar.setFillStyle(0xff6b6b);
            else this.bossHPBar.setFillStyle(0x8b0000);
        } else if (bossIndex === 2 && this.boss2HPBar) {
            this.boss2HPBar.width = 200 * hpPercent;
            if (this.boss2HPText) this.boss2HPText.setText(`${currentHP}/${maxHP}`);
            if (hpPercent > 0.6) this.boss2HPBar.setFillStyle(0xffd700);
            else if (hpPercent > 0.3) this.boss2HPBar.setFillStyle(0xffaa00);
            else this.boss2HPBar.setFillStyle(0xff6600);
        } else if (bossIndex === 3 && (this as any).boss3HPBar) {
            (this as any).boss3HPBar.width = 200 * hpPercent;
            if ((this as any).boss3HPText) (this as any).boss3HPText.setText(`${currentHP}/${maxHP}`);
            if (hpPercent > 0.6) (this as any).boss3HPBar.setFillStyle(0x9932cc);
            else if (hpPercent > 0.3) (this as any).boss3HPBar.setFillStyle(0xba55d3);
            else (this as any).boss3HPBar.setFillStyle(0x800080);
        }
    }

    // 🔥🔥🔥 战役10：三Boss被击败处理
    private onTripleBossDefeated(boss: Phaser.Physics.Arcade.Sprite, bossIndex: number) {
        if (!this.tripleBossState) return;

        const bossName = (boss as any).bossName || `Boss${bossIndex}`;
        debugLog(`[Boss] 🔥 ${bossName}被击败！`);
        this.playSound('boss_defeated');

        // 标记为已击败
        (boss as any).defeated = true;
        this.tripleBossState.defeatedCount++;

        // Boss死亡动画
        this.tweens.add({
            targets: boss,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                boss.destroy();
            }
        });

        // 击败奖励
        const reward = (boss as any).bossConfig?.defeatReward;
        if (reward) {
            if (reward.hp) {
                this.playerHP = Math.min(this.maxHP, this.playerHP + reward.hp);
                this.updateHPBar();
            }
            if (reward.coins) {
                this.score += reward.coins;
                if (this.scoreText) this.scoreText.setText(`分数: ${this.score}`);
            }
        }

        // 显示击败提示
        const defeatText = this.add.text(
            boss.x, boss.y - 50,
            `💀 ${bossName}被击败！`,
            { fontSize: '24px', color: '#00ff00', stroke: '#000000', strokeThickness: 3 }
        ).setOrigin(0.5).setDepth(2000);

        this.tweens.add({
            targets: defeatText,
            y: defeatText.y - 80,
            alpha: 0,
            duration: 2000,
            onComplete: () => defeatText.destroy()
        });

        // 🔥🔥🔥 检查是否所有Boss都被击败
        const allDefeated = this.tripleBossState.defeatedCount >= 3;
        const aliveBosses = this.tripleBossState.bosses.filter(b => b.active && !(b as any).defeated);

        debugLog(`[Boss] 已击败${this.tripleBossState.defeatedCount}个Boss，剩余${aliveBosses.length}个`);

        if (allDefeated || aliveBosses.length === 0) {
            // 🎉 所有Boss都被击败！
            debugLog('[Boss] 🎉🎉🎉 所有三个Boss都被击败！战斗胜利！');

            const victoryText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                '🎉 三Boss全部击败！\n🏆 成为时空列车大师！',
                {
                    fontSize: '40px',
                    color: '#ffd700',
                    align: 'center',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 6
                }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

            this.tweens.add({
                targets: victoryText,
                scale: 1.2,
                duration: 500,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    victoryText.destroy();
                    this.gameOver(true);
                }
            });
        } else {
            // 剩余Boss狂暴！
            this.tripleBossState.enraged = true;

            const enrageText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 - 100,
                `⚠️ 剩余${aliveBosses.length}个Boss狂暴了！`,
                {
                    fontSize: '28px',
                    color: '#ff0000',
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

            this.tweens.add({
                targets: enrageText,
                alpha: 0,
                y: enrageText.y - 50,
                duration: 2500,
                onComplete: () => enrageText.destroy()
            });

            // 狂暴视觉效果
            aliveBosses.forEach(b => {
                b.setTint(0xff0000);
                this.tweens.add({
                    targets: b,
                    scaleX: 1.15,
                    scaleY: 1.15,
                    duration: 400,
                    yoyo: true,
                    repeat: 2
                });
            });
        }
    }

    private enterBossPhase2() {
        this.bossPhase = 2;
        debugLog('[Boss] 进入第2阶段！');
        this.playSound('boss_phase_change');

        // Boss阶段对话
        const campaignId = this.getCampaignId();
        const phase2Dialogues: { [key: string]: { name: string, text: string } } = {
            'campaign_1': { name: '古街守护者', text: '还有两下子！' },
            'campaign_2': { name: '科技机器人', text: '启动战斗模式！' },
            'campaign_3': { name: '水流巨兽', text: '水之怒！' },
            'campaign_4': { name: '古代战将', text: '让你见识真正的战技！' },
            'campaign_5': { name: '时间守护者', text: '时间加速！' }
        };

        if (phase2Dialogues[campaignId]) {
            this.showBossDialogue(phase2Dialogues[campaignId].name, phase2Dialogues[campaignId].text, 2000);
        }

        // 显示提示
        const phaseText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            '⚠️ Boss进入第2阶段！\n攻击速度提升！',
            {
                fontSize: '32px',
                color: '#ff8800',
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        phaseText.setOrigin(0.5);
        phaseText.setScrollFactor(0);
        phaseText.setDepth(2000);

        this.tweens.add({
            targets: phaseText,
            alpha: 0,
            y: phaseText.y - 50,
            duration: 2000,
            onComplete: () => phaseText.destroy()
        });

        // Boss样式升级 - 阶段2
        if (this.bossEnemy) {
            // 体型增大10%
            this.tweens.add({
                targets: this.bossEnemy,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 500,
                ease: 'Back.easeOut'
            });

            // 橙色发光效果
            this.bossEnemy.setTint(0xff8800);
        }
    }

    private enterBossPhase3() {
        this.bossPhase = 3;
        debugLog('[Boss] 进入第3阶段（狂暴）！');
        this.playSound('boss_phase_change');
        this.playSound('boss_roar');  // 狂暴咆哮音效

        // Boss狂暴对话
        const campaignId = this.getCampaignId();
        const phase3Dialogues: { [key: string]: { name: string, text: string } } = {
            'campaign_1': { name: '古街守护者', text: '不可能！' },
            'campaign_2': { name: '科技机器人', text: '启动最终武器！' },
            'campaign_3': { name: '水流巨兽', text: '水之狂暴！' },
            'campaign_4': { name: '古代战将', text: '决一死战！' },
            'campaign_5': { name: '时间守护者', text: '时空扭曲！' }
        };

        if (phase3Dialogues[campaignId]) {
            this.showBossDialogue(phase3Dialogues[campaignId].name, phase3Dialogues[campaignId].text, 2000);
        }

        // 显示提示
        const phaseText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            '🔥 Boss狂暴了！\n攻击更加猛烈！',
            {
                fontSize: '36px',
                color: '#ff0000',
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        phaseText.setOrigin(0.5);
        phaseText.setScrollFactor(0);
        phaseText.setDepth(2000);

        // 闪烁效果
        this.tweens.add({
            targets: phaseText,
            alpha: 0,
            y: phaseText.y - 50,
            duration: 2500,
            onComplete: () => phaseText.destroy()
        });

        // 屏幕震动效果
        this.cameras.main.shake(500, 0.01);

        // Boss样式升级 - 阶段3（狂暴）
        if (this.bossEnemy) {
            // 体型再增大20%（总计1.5倍）
            this.tweens.add({
                targets: this.bossEnemy,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 600,
                ease: 'Back.easeOut'
            });

            // 红色发光效果
            this.bossEnemy.setTint(0xff0000);

            // 红色爆炸冲击波
            for (let i = 0; i < 3; i++) {
                this.time.delayedCall(i * 200, () => {
                    if (this.bossEnemy && this.bossEnemy.active) {
                        const shockwave = this.add.circle(this.bossEnemy.x, this.bossEnemy.y, 50, 0xff0000, 0.6);
                        shockwave.setDepth(99);
                        this.tweens.add({
                            targets: shockwave,
                            scale: 5,
                            alpha: 0,
                            duration: 800,
                            ease: 'Power2',
                            onComplete: () => shockwave.destroy()
                        });
                    }
                });
            }

            // 红色光环效果
            const glowRing = this.add.circle(this.bossEnemy.x, this.bossEnemy.y, 80, 0xff0000, 0.4);
            glowRing.setDepth(99);

            this.tweens.add({
                targets: glowRing,
                scaleX: 1.8,
                scaleY: 1.8,
                alpha: 0,
                duration: 800,
                repeat: -1,
                yoyo: true
            });

            // 保存光环引用
            (this.bossEnemy as any).glowRing = glowRing;
        }
    }

    private bossDefeated() {
        debugLog('[Boss] Boss被击败！当前Boss索引:', this.currentBossIndex, '双Boss关卡:', this.isDualBossLevel, '第二Boss配置:', !!this.secondBossConfig);

        // 🔥🔥🔥 战役9双Boss模式：不在这里处理，由onDualBossDefeated处理
        if (this.dualBossState) {
            debugLog('[Boss] 双Boss模式（同时存在），跳过bossDefeated，由onDualBossDefeated处理');
            return;
        }

        // 🔥🔥🔥 战役7-5、8-5顺序双Boss模式：第一个Boss被击败后生成第二个Boss
        if (this.isDualBossLevel && this.currentBossIndex === 1 && this.secondBossConfig && !this.isSpawningSecondBoss) {
            debugLog('[Boss] 🔥🔥🔥 顺序双Boss模式：第一个Boss被击败，准备生成第二个Boss！');
            this.isSpawningSecondBoss = true;
            this.sequentialBoss1Defeated = true;

            this.playSound('boss_defeated');

            // 🔥 禁用第一个Boss并播放消失动画
            if (this.bossEnemy) {
                (this.bossEnemy as any).canAttack = false;
                (this.bossEnemy as any).isDefeated = true;
                this.bossEnemy.setVelocity(0, 0);
                if (this.bossEnemy.body) {
                    (this.bossEnemy.body as Phaser.Physics.Arcade.Body).setEnable(false);
                }

                // Boss消失动画
                this.tweens.add({
                    targets: this.bossEnemy,
                    alpha: 0,
                    scale: 0,
                    angle: 360,
                    duration: 800,
                    onComplete: () => {
                        if (this.bossEnemy) {
                            this.bossEnemy.destroy();
                            this.bossEnemy = null;
                        }
                    }
                });
            }

            // 🔥 隐藏第一个Boss的血量条
            if (this.bossHPBar) {
                this.tweens.add({
                    targets: [this.bossHPBar, this.bossHPBarBg, this.bossHPBarBorder, this.bossHPText, this.bossNameText],
                    alpha: 0,
                    duration: 500
                });
            }

            // 显示过渡提示
            const { width, height } = this.cameras.main;
            const bossName = this.secondBossConfig.name || '激光守卫';
            const warningText = this.add.text(width / 2, height / 2, `⚠️ 警告：${bossName}即将出现！`, {
                fontSize: '32px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

            this.tweens.add({
                targets: warningText,
                alpha: 0,
                duration: 2000,
                onComplete: () => warningText.destroy()
            });

            // 延迟生成第二个Boss
            const spawnDelay = this.secondBossConfig.spawnDelay || 2000;
            debugLog('[Boss] 🔥 将在', spawnDelay, 'ms后生成第二个Boss');
            this.time.delayedCall(spawnDelay, () => {
                this.spawnSecondBoss();
            });

            return;  // 🔥🔥🔥 关键：不触发通关，等待第二个Boss
        }

        // 🔥🔥🔥 防止重复触发（只在非双Boss模式或第二个Boss被击败时检查）
        if ((this as any).bossDefeatedTriggered) {
            debugLog('[Boss] bossDefeated已触发过，跳过');
            return;
        }
        (this as any).bossDefeatedTriggered = true;

        this.playSound('boss_defeated');

        // 🔥🔥🔥 立即禁用Boss攻击和移动，并让Boss消失
        if (this.bossEnemy) {
            (this.bossEnemy as any).canAttack = false;
            (this.bossEnemy as any).isDefeated = true;
            this.bossEnemy.setVelocity(0, 0);
            if (this.bossEnemy.body) {
                (this.bossEnemy.body as Phaser.Physics.Arcade.Body).setEnable(false);
            }

            // 🔥 Boss消失动画
            this.tweens.add({
                targets: this.bossEnemy,
                alpha: 0,
                scale: 0,
                angle: 360,
                duration: 800,
                onComplete: () => {
                    if (this.bossEnemy) {
                        this.bossEnemy.destroy();
                        this.bossEnemy = null;
                    }
                }
            });
        }

        // 🔥 隐藏Boss血量条
        if (this.bossHPBar) {
            this.tweens.add({
                targets: [this.bossHPBar, this.bossHPBarBg, this.bossHPBarBorder, this.bossHPText, this.bossNameText],
                alpha: 0,
                duration: 500
            });
        }

        // 🔥🔥🔥 创意工坊：检查击败条件
        const isCustomLevel = (this.levelData as any).isCustomLevel || (this.levelData as any).isTestMode;
        const defeatCondition = (this as any).savedDefeatCondition || 'combat';
        const questionsRequired = (this as any).savedQuestionsRequired || 3;
        const customQuestions = (this.levelData as any).questions || [];

        debugLog('[Boss] 击败条件:', defeatCondition, '需要答题数:', questionsRequired, '题库数量:', customQuestions.length);

        // 🔥 混合模式或答题模式：Boss消失后开始答题
        if (isCustomLevel && (defeatCondition === 'quiz' || defeatCondition === 'hybrid') && customQuestions.length > 0) {
            debugLog('[Boss] 🔥 创意工坊Boss答题模式！Boss已消失，开始答题');

            // 延迟一点开始答题，让Boss消失动画播放
            this.time.delayedCall(500, () => {
                this.triggerBossQuiz(questionsRequired, customQuestions);
            });
            return;
        }

        // 纯战斗模式：Boss消失后直接通关
        debugLog('[Boss] 纯战斗模式，Boss消失后直接通关');
        this.defeatedEnemies++;
        this.time.delayedCall(1000, () => {
            this.gameOver(true);
        });
    }

    // 🔥🔥🔥 创意工坊：Boss答题模式（Boss已消失，答题决定通关）
    private triggerBossQuiz(questionsRequired: number, questions: any[]) {
        debugLog('[Boss] 触发Boss答题，需要答对:', questionsRequired, '题');

        // 🔥🔥🔥 防止重复触发
        if ((this as any).bossQuizTriggered) {
            debugLog('[Boss] Boss答题已触发过，跳过');
            return;
        }
        (this as any).bossQuizTriggered = true;

        // 暂停游戏物理
        this.physics.pause();
        this.isAnswering = true;

        let correctCount = 0;
        let isQuizActive = true;

        const askNextQuestion = () => {
            if (!isQuizActive) return;

            // 答对足够题目，通关！
            if (correctCount >= questionsRequired) {
                debugLog('[Boss] 🎉 答题成功！通关！');
                isQuizActive = false;
                this.physics.resume();
                this.isAnswering = false;

                // 显示通关提示
                const successText = this.add.text(
                    this.cameras.main.width / 2,
                    this.cameras.main.height / 2,
                    '🎉 挑战成功！',
                    { fontSize: '32px', color: '#00ff00', stroke: '#000', strokeThickness: 4 }
                ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

                this.tweens.add({
                    targets: successText,
                    alpha: 0,
                    y: successText.y - 50,
                    duration: 1500,
                    onComplete: () => {
                        successText.destroy();
                        this.defeatedEnemies++;
                        this.gameOver(true);
                    }
                });
                return;
            }

            // 随机选择一道题
            const randomIndex = Math.floor(Math.random() * questions.length);
            const question = questions[randomIndex];

            // 触发答题事件
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('customLevelQuiz', {
                    detail: {
                        question,
                        isBossQuiz: true,
                        onCorrect: () => {
                            if (!isQuizActive) return;
                            correctCount++;
                            debugLog('[Boss] 答对！进度:', correctCount, '/', questionsRequired);

                            // 显示进度提示
                            const progressText = this.add.text(
                                this.cameras.main.width / 2,
                                this.cameras.main.height / 2,
                                `✅ 答对了！(${correctCount}/${questionsRequired})`,
                                { fontSize: '24px', color: '#00ff00', stroke: '#000', strokeThickness: 3 }
                            ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

                            this.tweens.add({
                                targets: progressText,
                                alpha: 0,
                                y: progressText.y - 50,
                                duration: 1000,
                                onComplete: () => {
                                    progressText.destroy();
                                    this.time.delayedCall(300, askNextQuestion);
                                }
                            });
                        },
                        onWrong: () => {
                            if (!isQuizActive) return;
                            debugLog('[Boss] 答错！挑战失败！');
                            isQuizActive = false;

                            this.physics.resume();
                            this.isAnswering = false;

                            // 显示失败提示
                            const failText = this.add.text(
                                this.cameras.main.width / 2,
                                this.cameras.main.height / 2,
                                '❌ 答错了！挑战失败！',
                                { fontSize: '24px', color: '#ff0000', stroke: '#000', strokeThickness: 3 }
                            ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

                            this.tweens.add({
                                targets: failText,
                                alpha: 0,
                                duration: 2000,
                                onComplete: () => {
                                    failText.destroy();
                                    // 游戏失败
                                    this.gameOver(false);
                                }
                            });
                        }
                    }
                }));
            }
        };

        // 开始第一题
        this.time.delayedCall(300, askNextQuestion);
    }

    // 🔥 Boss死亡动画
    private performBossDeathAnimation() {
        // Boss死亡动画
        if (this.bossEnemy) {
            this.tweens.add({
                targets: this.bossEnemy,
                alpha: 0,
                scale: 0,
                angle: 360,
                duration: 1000,
                onComplete: () => {
                    if (this.bossEnemy) {
                        this.bossEnemy.destroy();
                        this.bossEnemy = null;
                    }
                }
            });
        }

        // 🔥 双Boss系统（顺序模式）：检查是否需要生成第二个Boss
        if (this.isDualBossLevel && this.currentBossIndex === 1 && this.secondBossConfig) {
            debugLog('[Boss] 🔥 第一个Boss被击败，准备生成第二个Boss！');
            this.isSpawningSecondBoss = true;

            // 显示过渡提示
            const { width, height } = this.cameras.main;
            const warningText = this.add.text(width / 2, height / 2, `⚠️ 警告：${this.getSecondBossDisplayName()}即将出现！`, {
                fontSize: '32px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

            this.tweens.add({
                targets: warningText,
                alpha: 0,
                duration: 2000,
                onComplete: () => warningText.destroy()
            });

            // 延迟生成第二个Boss
            const spawnDelay = this.secondBossConfig.spawnDelay || 2000;
            this.time.delayedCall(spawnDelay, () => {
                this.spawnSecondBoss();
            });

            return;  // 不触发通关
        }

        // 隐藏Boss血量条
        if (this.bossHPBar) {
            this.tweens.add({
                targets: [this.bossHPBar, this.bossHPBarBg, this.bossHPBarBorder, this.bossHPText, this.bossNameText],
                alpha: 0,
                duration: 500
            });
        }

        // Boss关卡：直接通关，不显示终点
        debugLog('[Boss] Boss关卡直接通关！');
        this.defeatedEnemies++;

        // 延迟1.5秒后触发通关
        this.time.delayedCall(1500, () => {
            this.gameOver(true);
        });
    }

    // 🔥 生成第二个Boss（激光守卫）
    private spawnSecondBoss() {
        if (!this.secondBossConfig) return;

        const secondBossName = this.getSecondBossDisplayName();
        debugLog(`[Boss] 🔥 生成第二个Boss: ${secondBossName}`);
        this.playSound('boss_appear');

        this.currentBossIndex = 2;
        this.isSpawningSecondBoss = false;

        // 获取生成位置
        const spawnPos = this.secondBossConfig.spawnPosition || { x: 1400, y: 500 };
        const campaignId = this.getCampaignId();
        const visualTheme = this.secondBossConfig.visualTheme || 'default';
        const textureName = visualTheme === 'laser_guard_default'
            ? this.createLaserGuardTexture()
            : this.createBossTexture(campaignId, visualTheme);

        // 创建第二个Boss
        const boss2 = this.enemies.create(spawnPos.x, spawnPos.y, textureName);
        boss2.setDisplaySize(this.secondBossConfig.size || 80, this.secondBossConfig.size || 80);
        (boss2 as any).damage = 3;
        (boss2 as any).enemyType = 'boss';
        (boss2 as any).isLaserGuard = true;  // 标记为激光守卫
        (boss2 as any).bossName = secondBossName;
        (boss2 as any).bossConfig = this.secondBossConfig;

        if (this.secondBossConfig.tint) {
            boss2.setTint(this.secondBossConfig.tint);
        }

        this.bossEnemy = boss2;
        this.bossMaxHP = this.secondBossConfig.hp || 600;
        this.bossHP = this.bossMaxHP;
        this.bossPhase = 1;

        // 设置Boss属性
        boss2.setDepth(100);
        (boss2 as any).enemyId = 'laser_guard_' + Date.now();
        boss2.setCollideWorldBounds(false);
        (boss2.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (boss2 as any).initialY = spawnPos.y;
        (boss2 as any).initialX = spawnPos.x;
        (boss2 as any).maxFallDistance = 200;
        (boss2 as any).patrolRangeX = 400;

        // 重置激光守卫状态 - 🔥 设置初始延迟，不要一出场就攻击！
        const now = Date.now();
        this.laserGuardState = {
            laserActive: false,
            laserEndTime: 0,
            lastLaserTime: now - 5000,  // 🔥 出场后3秒才能第一次激光（冷却8秒-5秒=3秒延迟）
            lastStunTime: now - 8000,   // 🔥 出场后4秒才能第一次定身（冷却12秒-8秒=4秒延迟）
            stunCooldown: this.secondBossConfig.specialAbilities?.stunCooldown || 12000,  // 🔥 定身冷却12秒
            laserCooldown: this.secondBossConfig.specialAbilities?.laserCooldown || 8000   // 🔥 激光冷却8秒
        };

        // 更新Boss血量条
        this.updateBossHealthBarForSecondBoss();

        // 出场特效
        boss2.setAlpha(0);
        boss2.setScale(0);
        this.tweens.add({
            targets: boss2,
            alpha: 1,
            scale: 1,
            duration: 1000,
            ease: 'Back.easeOut'
        });

        // 出场闪电特效
        const lightning = this.add.graphics();
        lightning.lineStyle(4, 0xff0000, 1);
        for (let i = 0; i < 5; i++) {
            const startX = spawnPos.x + Phaser.Math.Between(-100, 100);
            const startY = 0;
            lightning.lineBetween(startX, startY, spawnPos.x, spawnPos.y);
        }
        this.tweens.add({
            targets: lightning,
            alpha: 0,
            duration: 500,
            onComplete: () => lightning.destroy()
        });

        // Boss台词
        this.showBossDialogue(secondBossName, '第二阶段开始。', 2200);
    }

    // 🔥 创建激光守卫纹理
    private createLaserGuardTexture(): string {
        const textureName = 'laserGuardBoss';
        if (this.textures.exists(textureName)) {
            return textureName;
        }

        const graphics = this.add.graphics();

        // 主体 - 红橙色机械风格
        graphics.fillGradientStyle(0xff4500, 0xff4500, 0xff0000, 0xff0000, 1);
        graphics.fillCircle(24, 24, 22);

        // 激光眼睛
        graphics.fillStyle(0xff0000, 1);
        graphics.fillCircle(16, 18, 6);
        graphics.fillCircle(32, 18, 6);

        // 眼睛发光效果
        graphics.fillStyle(0xffff00, 1);
        graphics.fillCircle(16, 18, 3);
        graphics.fillCircle(32, 18, 3);

        // 激光发射器（嘴巴位置）
        graphics.fillStyle(0xff0000, 1);
        graphics.fillRect(18, 30, 12, 6);

        // 机械边框
        graphics.lineStyle(3, 0xffff00, 1);
        graphics.strokeCircle(24, 24, 22);

        graphics.generateTexture(textureName, 48, 48);
        graphics.destroy();
        return textureName;
    }

    // 🔥 更新第二个Boss的血量条
    private updateBossHealthBarForSecondBoss() {
        // 更新Boss名称
        if (this.bossNameText) {
            this.bossNameText.setText(this.getSecondBossDisplayName());
            this.bossNameText.setColor('#ff4500');
        }

        // 重置血量条
        if (this.bossHPBar) {
            this.bossHPBar.width = 500;
            this.bossHPBar.setFillStyle(0xff4500);
            this.bossHPBar.setAlpha(1);
        }
        if (this.bossHPBarBg) this.bossHPBarBg.setAlpha(1);
        if (this.bossHPBarBorder) this.bossHPBarBorder.setAlpha(1);
        if (this.bossHPText) {
            this.bossHPText.setText(`${this.bossHP}/${this.bossMaxHP}`);
            this.bossHPText.setAlpha(1);
        }
        if (this.bossNameText) this.bossNameText.setAlpha(1);
    }

    private updateHPBar() {
        this.hpBar.clear();
        this.hpBar.fillStyle(0x000000, 0.5);
        this.hpBar.fillRect(20, 20, 200, 20);
        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(20, 20, 200 * (this.playerHP / this.maxHP), 20);
        this.hpBar.lineStyle(2, 0xffffff, 1);
        this.hpBar.strokeRect(20, 20, 200, 20);
    }

    private setupCollisions() {
        debugLog('[PlatformGameScene] 🔥 设置碰撞检测');

        // 玩家与平台
        this.physics.add.collider(this.player, this.platforms);
        this.movingPlatforms.forEach(platform => {
            this.physics.add.collider(this.player, platform);
        });
        this.autoMovingPlatforms.forEach(platform => {
            this.physics.add.collider(this.player, platform);
        });

        // 敌人与平台（让敌人站在平台上）
        this.physics.add.collider(this.enemies, this.platforms);
        this.movingPlatforms.forEach(platform => {
            this.physics.add.collider(this.enemies, platform);
        });
        this.autoMovingPlatforms.forEach(platform => {
            this.physics.add.collider(this.enemies, platform);
        });

        // 玩家与收集物
        this.physics.add.overlap(this.player, this.collectibles, this.collectItem as any, undefined, this);

        // 玩家与答题触发点
        this.physics.add.overlap(this.player, this.questionTriggers, this.triggerQuestion as any, undefined, this);

        // 玩家与障碍物
        this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle as any, undefined, this);

        // 玩家与敌人
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy as any, undefined, this);

        // 🔥🔥🔥 子弹与敌人 - 这是唯一能伤害敌人的方式 🔥🔥🔥
        debugLog('[PlatformGameScene] 🔥 设置子弹与敌人的碰撞检测');
        this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitEnemy as any, undefined, this);

        // 玩家与目标
        this.physics.add.overlap(this.player, this.goal, this.reachGoal as any, undefined, this);

        debugLog('[PlatformGameScene] ✅ 碰撞检测设置完成');
    }

    private showLevelInfo() {
        const { width, height } = this.cameras.main;
        this.isLevelIntroActive = true;
        this.physics.world.pause();
        const overlayDepth = 2400;

        const quizCount = Array.isArray((this.levelData as any)?.questions)
            ? (this.levelData as any).questions.length
            : 0;
        const clearanceRule = `玩法规则：${buildCampaignOverviewText(quizCount)}`;
        const bg = this.add.rectangle(width / 2, height / 2, width - 100, 388, 0x000000, 0.92);
        bg.setScrollFactor(0);
        bg.setDepth(overlayDepth);
        bg.setStrokeStyle(2, 0x334155, 0.95);

        const title = this.add.text(width / 2, height / 2 - 80, this.levelData.title, {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(overlayDepth + 1);

        const story = this.add.text(width / 2, height / 2 - 20, this.levelData.story || this.levelData.description || '', {
            fontSize: '18px',
            color: '#cccccc',
            wordWrap: { width: width - 150 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(overlayDepth + 1);

        const ruleText = this.add.text(width / 2, height / 2 + 54, clearanceRule, {
            fontSize: '16px',
            color: '#7dd3fc',
            fontStyle: 'bold',
            wordWrap: { width: width - 180 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(overlayDepth + 1);

        const startBtn = this.add.text(width / 2, height / 2 + 126, '开始挑战', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#00ff00',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(overlayDepth + 1).setInteractive();

        startBtn.on('pointerdown', () => {
            bg.destroy();
            title.destroy();
            story.destroy();
            ruleText.destroy();
            startBtn.destroy();
            this.isLevelIntroActive = false;
            this.physics.world.resume();

            // 🔥 相机跟随在update中自动处理
            debugLog('[PlatformGameScene] 🎮 点击开始挑战，相机将在update中跟随');
        });
    }

    update() {
        if (!this.player || !this.cursors) return;
        if (this.isLevelIntroActive) return;

        // 🔥🔥🔥 创意工坊：确保相机始终跟随玩家
        const isCustomLevel = (this.levelData as any).isCustomLevel || (this.levelData as any).isTestMode;
        if (isCustomLevel && this.cameras.main) {
            // 检查相机是否正在跟随玩家（通过检查 _follow 属性）
            const camera = this.cameras.main as any;
            if (!camera._follow || camera._follow !== this.player) {
                debugLog('[PlatformGameScene] 📷 相机跟随丢失，重新启用');
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            }
        }

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const onGround = body.touching.down;
        const deltaTime = this.game.loop.delta / 1000;

        // 获取触控输入状态
        const touchState = touchInputManager.getState();

        // 合并键盘和触控输入
        const inputLeft = this.cursors.left.isDown || this.moveKeys.left.isDown || touchState.left;
        const inputRight = this.cursors.right.isDown || this.moveKeys.right.isDown || touchState.right;
        const inputUp = this.cursors.up.isDown || this.moveKeys.up.isDown || touchState.up;
        const inputDown = this.cursors.down.isDown || this.moveKeys.down.isDown || touchState.down;

        // 更新计时器
        if (this.dashCooldown > 0) this.dashCooldown -= deltaTime;
        if (this.coyoteTime > 0) this.coyoteTime -= deltaTime;
        if (this.jumpBufferTime > 0) this.jumpBufferTime -= deltaTime;
        if (this.timeSlowCooldown > 0) this.timeSlowCooldown -= deltaTime;
        if (this.chemicalShieldCooldown > 0) this.chemicalShieldCooldown -= deltaTime;
        if (this.timeSlowDuration > 0) {
            this.timeSlowDuration -= deltaTime;
            if (this.timeSlowDuration <= 0) {
                this.timeSlowDuration = 0;
                this.deactivateTimeSlow();
            }
        }
        if (this.chemicalShieldDuration > 0) {
            this.chemicalShieldDuration -= deltaTime;
            if (this.chemicalShieldDuration <= 0) {
                this.clearChemicalShield();
            }
        }

        if (this.skillAura?.active) {
            this.skillAura.setPosition(this.player.x, this.player.y);
            this.skillAura.setAlpha(this.chemicalShieldDuration > 0 ? 0.22 : 0.1);
        }

        // 检测墙壁接触（技能系统）
        this.touchingWall = body.touching.left || body.touching.right;

        // Coyote Time
        if (this.wasOnGround && !onGround) {
            this.coyoteTime = 0.1;
        }

        // 重置二段跳和滑翔
        if (onGround) {
            this.hasDoubleJumped = false;
            this.isGliding = false;
        }

        // 玩家移动 - 使用合并后的输入
        const moveSpeed = this.isDashing ? 400 : 250;
        const acceleration = onGround ? 0.8 : 0.6;

        if (inputLeft) {
            const targetVel = -moveSpeed;
            const currentVel = body.velocity.x;
            const newVel = Phaser.Math.Linear(currentVel, targetVel, acceleration);
            this.player.setVelocityX(newVel);
            this.player.setFlipX(true);  // 朝左
        } else if (inputRight) {
            const targetVel = moveSpeed;
            const currentVel = body.velocity.x;
            const newVel = Phaser.Math.Linear(currentVel, targetVel, acceleration);
            this.player.setVelocityX(newVel);
            this.player.setFlipX(false);  // 朝右
        } else {
            const friction = onGround ? 0.85 : 0.95;
            this.player.setVelocityX(body.velocity.x * friction);
        }

        // 【战役6-1：风区冲刺系统】- 战役7禁用
        const campaignId = this.getCampaignId();
        if (campaignId !== 'campaign_7' && (this.player as any).windZones) {
            const windResistance = this.hasSkill('windControl') ? 0.55 : 1;
            (this.player as any).windZones.forEach((windZone: any) => {
                // 检测玩家是否在风区内
                const inWindZone = this.player.x >= windZone.x &&
                    this.player.x <= windZone.x + windZone.width &&
                    this.player.y >= windZone.y &&
                    this.player.y <= windZone.y + windZone.height;

                // 玩家进入风区时的处理
                if (inWindZone) {
                    // 首次进入风区
                    if (!windZone.playerInside) {
                        windZone.playerInside = true;
                        // 🎊 新年主题：金色风区高亮
                        windZone.visualZone.setFillStyle(0xFFD700, 0.6);

                        // 显示提示文本
                        const hintText = this.add.text(
                            this.player.x,
                            this.player.y - 70,
                            '💨 跳跃可减弱风力！',
                            { fontSize: '24px', color: '#00ffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }
                        );
                        hintText.setOrigin(0.5);
                        hintText.setDepth(2000);

                        // 文字淡出
                        this.tweens.add({
                            targets: hintText,
                            y: hintText.y - 30,
                            alpha: 0,
                            duration: 2000,
                            onComplete: () => hintText.destroy()
                        });
                    }

                    // 🔥 战役6原始风力系统（恢复）
                    // 地面时：强制设置速度（无法对抗，必须跳起来）
                    // 空中时：施加极小的推力（艰难前进）
                    const isInAir = !onGround;

                    if (!isInAir) {
                        // 在地面时：强制设置速度（无法对抗）
                        const dashSpeed = windZone.direction === 'right' ?
                            windZone.windForce * windResistance :
                            -windZone.windForce * windResistance;
                        body.setVelocityX(dashSpeed);
                    } else {
                        // 在空中时：施加强推力（更艰难前进，高难度）
                        // 🔥🔥 再次加强空中阻力：1000风力 = 10推力，2000风力 = 20推力
                        const windPushBase = (windZone.windForce / 1000) * 10 * windResistance;
                        const windPush = windZone.direction === 'right' ? windPushBase : -windPushBase;
                        const currentVelX = body.velocity.x;
                        const newVelX = currentVelX + windPush;

                        // 限制最大速度（空中被推的最大速度）
                        const maxSpeed = 350;
                        const clampedVelX = Phaser.Math.Clamp(newVelX, -maxSpeed, maxSpeed);
                        body.setVelocityX(clampedVelX);
                    }

                } else if (!inWindZone && windZone.playerInside) {
                    // 离开风区
                    windZone.playerInside = false;
                    windZone.visualZone.setFillStyle(0xFFD700, 0.3);  // 🎊 金色
                }
            });
        }

        // 🔥 反重力系统
        const isReversedGravity = this.currentGravityMultiplier < 0;

        // 检测触控跳跃按钮刚按下（上一帧未按，这一帧按下）
        const touchJumpJustPressed = touchState.jump && !this.lastTouchState.jump;
        const touchUpJustPressed = touchState.up && !this.lastTouchState.up;
        const touchDownJustPressed = touchState.down && !this.lastTouchState.down;

        // Jump Buffer - 正常用上键，反重力用下键
        if (isReversedGravity) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.moveKeys.down) || touchDownJustPressed || touchJumpJustPressed) {
                this.jumpBufferTime = 0.1;
            }
        } else {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.moveKeys.up) || touchUpJustPressed || touchJumpJustPressed) {
                this.jumpBufferTime = 0.1;
            }
        }

        // 🔥 反重力时：只要速度很小就可以跳（简化检测）
        const canJumpReversed = isReversedGravity && Math.abs(body.velocity.y) < 100;
        const canJump = isReversedGravity ? canJumpReversed : (onGround || this.coyoteTime > 0);

        // 🔥 反重力时重置二段跳
        if (isReversedGravity && canJumpReversed) {
            this.hasDoubleJumped = false;
        }

        // 跳跃逻辑
        if (this.jumpBufferTime > 0) {
            if (canJump) {
                // 普通跳跃 - 反重力时向下跳
                const jumpVelocity = isReversedGravity ? 450 : -420;
                this.player.setVelocityY(jumpVelocity);
                this.jumpBufferTime = 0;
                this.coyoteTime = 0;
                this.hasDoubleJumped = false;
                this.playSound('player_jump');
            } else if (this.playerSkills.includes('wall_jump') && this.touchingWall) {
                // 墙跳
                this.performWallJump();
                this.jumpBufferTime = 0;
                this.playSound('player_jump');
            } else if (this.playerSkills.includes('double_jump') && !this.hasDoubleJumped) {
                // 二段跳 - 反重力时向下跳
                const doubleJumpVelocity = isReversedGravity ? 400 : -380;
                this.player.setVelocityY(doubleJumpVelocity);
                this.hasDoubleJumped = true;
                this.jumpBufferTime = 0;
                this.createDoubleJumpParticles();
                this.playSound('player_jump');
            }
        }

        // 滑翔技能 - 支持触控
        if (this.playerSkills.includes('glide') &&
            (inputUp || touchState.jump) &&
            !onGround &&
            body.velocity.y > 0) {
            this.isGliding = true;
            body.velocity.y = Math.min(body.velocity.y, 100); // 减慢下落速度
        } else {
            this.isGliding = false;
        }

        // 冲刺技能（检查是否解锁）- 支持触控
        const touchDashJustPressed = touchState.dash && !this.lastTouchState.dash;
        const touchInteractJustPressed = touchState.interact && !this.lastTouchState.interact;
        if ((Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.actionKeys.dash) || touchDashJustPressed) &&
            this.hasDashSkill() &&
            this.dashCooldown <= 0 &&
            !this.isDashing) {
            this.performDash();
        }

        if (Phaser.Input.Keyboard.JustDown(this.actionKeys.timeSlow) && this.hasSkill('time_slow')) {
            this.activateTimeSlow();
        }

        if (Phaser.Input.Keyboard.JustDown(this.actionKeys.shield) && this.hasChemicalShieldSkill()) {
            this.activateChemicalShield();
        }

        if (touchInteractJustPressed) {
            if (this.hasChemicalShieldSkill() && this.chemicalShieldCooldown <= 0 && this.chemicalShieldDuration <= 0) {
                this.activateChemicalShield();
            } else if (this.hasSkill('time_slow') && this.timeSlowCooldown <= 0 && this.timeSlowDuration <= 0) {
                this.activateTimeSlow();
            }
        }

        // G主攻击（兼容 X）- 支持触控
        const touchAttackJustPressed = touchState.attack && !this.lastTouchState.attack;
        if ((Phaser.Input.Keyboard.JustDown(this.attackKey) || Phaser.Input.Keyboard.JustDown(this.actionKeys.attack) || touchAttackJustPressed) && this.canAttack && !this.isAttacking) {
            this.performAttack();
        }

        this.wasOnGround = onGround;

        // 更新触控状态追踪（用于下一帧检测JustDown）
        this.lastTouchState = { ...touchState };
        this.updateSkillStatusDisplay();

        // 检测玩家是否掉落到世界外（使用实际世界高度）
        const worldHeight = this.physics.world.bounds.height || 600;
        if (!this.isGameOver && this.player.y > worldHeight + 50) {
            debugLog('[PlatformGameScene] 玩家掉落，y坐标:', this.player.y, '世界高度:', worldHeight);
            this.isGameOver = true;
            // 播放掉落音效
            this.playSound('player_hurt');
            // 自动触发游戏失败
            this.gameOver(false);
        }

        // 更新子弹位置（保留子弹的图形更新）
        this.bullets.children.entries.forEach((bullet: any) => {
            if (bullet.graphics) {
                bullet.graphics.setPosition(bullet.x, bullet.y);
            }
            if (bullet.emojiText) {
                bullet.emojiText.setPosition(bullet.x, bullet.y);
            }
        });

        // 更新敌人AI
        this.updateEnemyAI();

        // 🔥 更新创意工坊移动平台（使用物理速度）
        this.updateMovingPlatforms();

        // 更新自动移动平台
        this.updateAutoMovingPlatforms();

        // 🔥 战役8：检查传送门
        this.checkPortalTeleport();

        // 🔥 战役8：检查化学区域效果
        this.checkChemicalZoneEffects();

        // 🔥 战役8：检查重力区域
        this.checkGravityZones();

        // 🔥 战役9：检查传送带效果
        this.checkConveyorBeltEffects();

        // 🔥 创意工坊：检查弹跳平台效果
        this.checkBouncyPlatformEffects();

        // 🔥 战役9：检查风力区域效果
        this.checkWindZoneEffects();

        // 🔥 战役9：更新爆炸陷阱
        this.updateExplosionTraps();

        // 🔥 新增动态机关：追击齿轮、扩张脉冲、巡航尖刺
        this.updateDynamicTraps(deltaTime);

        // 🔥 相机跟随由startFollow自动处理，不需要每帧centerOn
        // 这样可以避免抖动问题
    }

    // 🔥🔥🔥 更新创意工坊移动平台（使用物理速度，修复垂直移动穿模问题）
    private updateMovingPlatforms() {
        if (!this.player || this.movingPlatforms.length === 0) return;

        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

        this.movingPlatforms.forEach((platform: any) => {
            if (!platform.active) return;

            const moveData = platform.moveData;
            if (!moveData) return;  // 没有moveData说明是战役模式的tween平台，跳过

            const { startX, startY, endX, endY, moveSpeed, isVertical } = moveData;
            const platformBody = platform.body as Phaser.Physics.Arcade.Body;

            // 保存上一帧位置（用于计算玩家跟随的增量）
            const prevX = platform.x;
            const prevY = platform.y;

            // 🔥🔥🔥 关键修复：每帧强制恢复平台速度，防止碰撞导致速度丢失
            // 这解决了玩家从下方碰撞平台时平台被卡住的问题
            if (isVertical) {
                const expectedVelY = moveData.direction === 1
                    ? (endY > startY ? moveSpeed : -moveSpeed)
                    : (endY > startY ? -moveSpeed : moveSpeed);
                // 如果速度被碰撞影响，强制恢复
                if (Math.abs(platformBody.velocity.y - expectedVelY) > 1) {
                    platformBody.setVelocityY(expectedVelY);
                }
                platformBody.setVelocityX(0);
            } else {
                const expectedVelX = moveData.direction === 1
                    ? (endX > startX ? moveSpeed : -moveSpeed)
                    : (endX > startX ? -moveSpeed : moveSpeed);
                // 如果速度被碰撞影响，强制恢复
                if (Math.abs(platformBody.velocity.x - expectedVelX) > 1) {
                    platformBody.setVelocityX(expectedVelX);
                }
                platformBody.setVelocityY(0);
            }

            // 检查是否到达边界，需要反向
            if (isVertical) {
                // 垂直移动
                if (moveData.direction === 1) {
                    // 向终点移动
                    if ((endY > startY && platform.y >= endY) || (endY < startY && platform.y <= endY)) {
                        moveData.direction = -1;
                        const velY = endY > startY ? -moveSpeed : moveSpeed;
                        platform.setVelocityY(velY);
                    }
                } else {
                    // 向起点移动
                    if ((endY > startY && platform.y <= startY) || (endY < startY && platform.y >= startY)) {
                        moveData.direction = 1;
                        const velY = endY > startY ? moveSpeed : -moveSpeed;
                        platform.setVelocityY(velY);
                    }
                }
            } else {
                // 水平移动
                if (moveData.direction === 1) {
                    // 向终点移动
                    if ((endX > startX && platform.x >= endX) || (endX < startX && platform.x <= endX)) {
                        moveData.direction = -1;
                        const velX = endX > startX ? -moveSpeed : moveSpeed;
                        platform.setVelocityX(velX);
                    }
                } else {
                    // 向起点移动
                    if ((endX > startX && platform.x <= startX) || (endX < startX && platform.x >= startX)) {
                        moveData.direction = 1;
                        const velX = endX > startX ? moveSpeed : -moveSpeed;
                        platform.setVelocityX(velX);
                    }
                }
            }

            // 🔥 关键：如果玩家站在移动平台上，让玩家跟随平台移动（使用位置增量，不影响跳跃）
            if (playerBody && playerBody.touching.down) {
                const playerBottom = this.player.y + playerBody.height / 2;
                const platformTop = platform.y - platformBody.height / 2;
                const playerLeft = this.player.x - playerBody.width / 2;
                const playerRight = this.player.x + playerBody.width / 2;
                const platformLeft = platform.x - platformBody.width / 2;
                const platformRight = platform.x + platformBody.width / 2;

                // 检查玩家是否在平台上方且水平重叠
                const verticallyAligned = Math.abs(playerBottom - platformTop) < 20;
                const horizontalOverlap = playerRight > platformLeft && playerLeft < platformRight;

                if (verticallyAligned && horizontalOverlap) {
                    // 🔥 使用位置增量让玩家跟随，不会影响玩家的跳跃能力
                    const deltaX = platform.x - prevX;
                    const deltaY = platform.y - prevY;
                    if (Math.abs(deltaX) > 0.01) {
                        this.player.x += deltaX;
                    }
                    if (Math.abs(deltaY) > 0.01) {
                        this.player.y += deltaY;
                    }
                }
            }
        });
    }

    private updateAutoMovingPlatforms() {
        if (!this.player || this.autoMovingPlatforms.length === 0) return;

        this.autoMovingPlatforms.forEach((platform: any) => {
            if (!platform.active) return;

            const autoData = platform.autoData;
            if (!autoData) return;

            // 检查玩家是否站在平台上
            const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
            const platformBody = platform.body as Phaser.Physics.Arcade.Body;
            const playerOnPlatform = playerBody && platformBody && playerBody.touching.down && platformBody.touching.up;

            // 🚂 战役10新增：玩家跳上后才启动
            if (autoData.triggerOnPlayerLand && !autoData.isActivated) {
                if (playerOnPlatform) {
                    autoData.isActivated = true;
                    autoData.currentSpeed = autoData.speed;
                    autoData.activationTime = Date.now();
                    debugLog('[PlatformGameScene] 🚂 列车启动！玩家跳上平台，开始移动');
                } else {
                    // 平台未激活，保持静止
                    return;
                }
            }

            // 获取当前速度（支持速度控制道具）
            const currentSpeed = autoData.currentSpeed || autoData.speed;
            if (currentSpeed === 0) return;  // 速度为0时不移动

            // 🔥 支持垂直移动（战役7新增）
            if (autoData.endY !== undefined && autoData.endY !== autoData.startY) {
                // 垂直移动平台 - 使用像素/秒的速度
                const distance = Math.abs(autoData.endY - autoData.startY);
                const duration = distance / (currentSpeed * 50); // speed * 50 = 像素/秒
                const progress = ((Date.now() / 1000) / duration) % 2; // 0-2的循环

                const prevY = platform.y;

                if (progress < 1) {
                    // 向下移动（从startY到endY）
                    platform.y = autoData.startY + (autoData.endY - autoData.startY) * progress;
                } else {
                    // 向上移动（从endY到startY）
                    platform.y = autoData.endY + (autoData.startY - autoData.endY) * (progress - 1);
                }

                // 如果玩家站在平台上，也跟着移动
                if (playerOnPlatform) {
                    const deltaY = platform.y - prevY;
                    this.player.y += deltaY;
                }
            } else {
                // 🚂 战役10：列车追逐模式 - 单向移动到终点
                if (autoData.triggerOnPlayerLand) {
                    // 列车模式：单向移动，不返回
                    const prevX = platform.x;
                    const pixelsPerFrame = currentSpeed * 50 / 60;  // 每帧移动的像素数

                    // 向右移动
                    platform.x += pixelsPerFrame;

                    // 到达终点后停止
                    if (platform.x >= autoData.endX) {
                        platform.x = autoData.endX;
                        autoData.currentSpeed = 0;
                        debugLog('[PlatformGameScene] 🚂 列车到达终点！');
                    }

                    // 如果玩家站在平台上，也跟着移动
                    if (playerOnPlatform) {
                        const deltaX = platform.x - prevX;
                        this.player.x += deltaX;
                    }
                } else {
                    // 🔥 水平移动平台（战役7-2：左右往返移动）
                    const distance = Math.abs(autoData.endX - autoData.startX);
                    const duration = distance / (currentSpeed * 50); // speed * 50 = 像素/秒
                    const progress = ((Date.now() / 1000) / duration) % 2; // 0-2的循环

                    const prevX = platform.x;

                    if (progress < 1) {
                        // 向右移动（从startX到endX）
                        platform.x = autoData.startX + (autoData.endX - autoData.startX) * progress;
                    } else {
                        // 向左移动（从endX到startX）
                        platform.x = autoData.endX + (autoData.startX - autoData.endX) * (progress - 1);
                    }

                    // 如果玩家站在平台上，也跟着移动
                    if (playerOnPlatform) {
                        const deltaX = platform.x - prevX;
                        this.player.x += deltaX;
                    }
                }
            }
        });
    }

    // 🔥 战役8：检查传送门传送
    private checkPortalTeleport() {
        if (this.portals.size === 0 || !this.player) return;

        const now = Date.now();
        if (now - this.lastTeleportTime < 500) return;  // 传送冷却

        for (const [id, portal] of this.portals) {
            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                portal.data.x, portal.data.y
            );

            if (dist < 40) {  // 进入传送门范围
                const linkedPortal = this.portals.get(portal.data.linkedTo);
                if (linkedPortal) {
                    this.lastTeleportTime = now;

                    // 传送音效
                    this.playSound('portal_teleport');

                    // 传送特效
                    const flash1 = this.add.circle(portal.data.x, portal.data.y, 50, 0xffffff, 0.8);
                    const flash2 = this.add.circle(linkedPortal.data.x, linkedPortal.data.y, 50, 0xffffff, 0.8);

                    this.tweens.add({
                        targets: [flash1, flash2],
                        scaleX: 2,
                        scaleY: 2,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            flash1.destroy();
                            flash2.destroy();
                        }
                    });

                    // 传送玩家
                    this.player.setPosition(linkedPortal.data.x, linkedPortal.data.y);
                    debugLog('[传送门] 从', id, '传送到', portal.data.linkedTo);
                    break;
                }
            }
        }
    }

    // 🔥 战役8：检查化学区域效果
    private lastChemicalDamageTime: number = 0;
    private checkChemicalZoneEffects() {
        if (this.chemicalZones.length === 0 || !this.player) return;

        let inSpeedZone = false;
        const now = Date.now();

        for (const zone of this.chemicalZones) {
            const { x, y, width, height, type, damage, healAmount, speedBoost } = zone.data;

            if (this.player.x >= x && this.player.x <= x + width &&
                this.player.y >= y && this.player.y <= y + height) {

                switch (type) {
                    case 'acid':
                        // 酸液：每500ms造成一次伤害（更频繁）
                        if (now - this.lastChemicalDamageTime > 500) {
                            if (!this.absorbIncomingDamage('chemical')) {
                                this.takeDamage(damage || 15);
                            }
                            this.lastChemicalDamageTime = now;
                            // 🎊 新年主题：辣椒酱视觉效果
                            const acidEffect = this.add.circle(this.player.x, this.player.y, 25, 0xDC143C, 0.6);
                            this.tweens.add({
                                targets: acidEffect,
                                alpha: 0,
                                scaleX: 1.5,
                                scaleY: 1.5,
                                duration: 300,
                                onComplete: () => acidEffect.destroy()
                            });
                        }
                        break;
                    case 'poison':
                        // 毒气：每300ms造成小伤害
                        if (now - this.lastChemicalDamageTime > 300) {
                            if (!this.absorbIncomingDamage('chemical')) {
                                this.takeDamage(damage || 5);
                            }
                            this.lastChemicalDamageTime = now;
                            // 毒气视觉效果
                            const poisonEffect = this.add.circle(this.player.x, this.player.y, 20, 0x9932cc, 0.5);
                            this.tweens.add({
                                targets: poisonEffect,
                                alpha: 0,
                                y: this.player.y - 30,
                                duration: 400,
                                onComplete: () => poisonEffect.destroy()
                            });
                        }
                        break;
                    case 'heal':
                        // 治疗：每500ms恢复HP
                        if (now - this.lastChemicalDamageTime > 500 && this.playerHP < this.maxHP) {
                            this.playerHP = Math.min(this.maxHP, this.playerHP + (healAmount || 3));
                            this.updateHPBar();
                            this.lastChemicalDamageTime = now;
                            // 治疗视觉效果
                            const healEffect = this.add.text(this.player.x, this.player.y - 30, '+' + (healAmount || 3), {
                                fontSize: '16px',
                                color: '#00ff00'
                            }).setOrigin(0.5);
                            this.tweens.add({
                                targets: healEffect,
                                alpha: 0,
                                y: this.player.y - 60,
                                duration: 500,
                                onComplete: () => healEffect.destroy()
                            });
                        }
                        break;
                    case 'speed':
                        // 加速区
                        inSpeedZone = true;
                        this.playerSpeedBoost = speedBoost || 1.5;
                        break;
                }
            }
        }

        // 离开加速区后恢复正常速度
        if (!inSpeedZone && this.playerSpeedBoost !== 1) {
            this.playerSpeedBoost = 1;
        }
    }

    // 🔥 战役8：检查重力区域
    private checkGravityZones() {
        if (this.gravityZones.length === 0 || !this.player) return;

        let inGravityZone = false;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        for (const zone of this.gravityZones) {
            const { x, y, width, height } = zone.data;
            // 🔥 v2.1.12: 兼容 gravityMultiplier 和 inverted 两种写法
            const gravityMultiplier = zone.data.gravityMultiplier ?? (zone.data.inverted ? -1 : 1);

            if (this.player.x >= x && this.player.x <= x + width &&
                this.player.y >= y && this.player.y <= y + height) {

                inGravityZone = true;

                if (this.currentGravityMultiplier !== gravityMultiplier) {
                    this.currentGravityMultiplier = gravityMultiplier;

                    // 🔥 设置强力反重力（-800让玩家快速"掉"到天花板）
                    const gravityStrength = 800;
                    body.setGravityY(gravityStrength * gravityMultiplier);

                    // 翻转玩家图像
                    this.player.setFlipY(gravityMultiplier < 0);

                    // 进入反重力区域时给一个初始向上的速度
                    if (gravityMultiplier < 0) {
                        body.setVelocityY(-200);  // 向上推一下
                    }

                    this.playSound('gravity_change');

                    // 显示提示
                    const text = this.add.text(this.player.x, this.player.y - 30,
                        gravityMultiplier < 0 ? '⬆️ 反重力!' : '⬇️ 正常重力', {
                        fontSize: '16px',
                        color: gravityMultiplier < 0 ? '#ff00ff' : '#00ff00'
                    }).setOrigin(0.5);
                    this.tweens.add({
                        targets: text,
                        y: text.y - 30,
                        alpha: 0,
                        duration: 800,
                        onComplete: () => text.destroy()
                    });
                }
                break;
            }
        }

        // 离开重力区域后恢复正常
        if (!inGravityZone && this.currentGravityMultiplier !== 1) {
            this.currentGravityMultiplier = 1;
            body.setGravityY(800);  // 恢复正常重力
            this.player.setFlipY(false);
        }
    }

    // 战役9：检查传送带效果
    private checkConveyorBeltEffects() {
        if (this.conveyorPlatforms.length === 0 || !this.player) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        const onGround = body.touching.down;
        if (!onGround) return; // 只有站在地面上才受传送带影响

        const playerBottom = this.player.y + 24; // 玩家底部位置（假设玩家高度48）
        const playerLeft = this.player.x - 16;   // 玩家左边（假设玩家宽度32）
        const playerRight = this.player.x + 16;  // 玩家右边

        for (const conveyor of this.conveyorPlatforms) {
            const { x, y, width, height, conveyorSpeed, conveyorDirection } = conveyor.data;

            // 检查玩家是否站在传送带上
            const platformTop = y;
            const platformBottom = y + height;
            const platformLeft = x;
            const platformRight = x + width;

            // 垂直对齐检查（玩家底部接近平台顶部）
            const verticallyAligned = Math.abs(playerBottom - platformTop) < 10;

            // 水平重叠检查
            const horizontallyOverlapping = playerRight > platformLeft && playerLeft < platformRight;

            if (verticallyAligned && horizontallyOverlapping) {
                // 应用传送带推力
                const direction = conveyorDirection === 'right' ? 1 : -1;
                const conveyorForce = conveyorSpeed * direction;

                // 将传送带速度添加到玩家当前速度
                const currentVelX = body.velocity.x;
                const newVelX = currentVelX + conveyorForce * 0.1; // 0.1是平滑因子
                body.setVelocityX(newVelX);

                break; // 一次只处理一个传送带
            }
        }
    }

    // 🔥 创意工坊：检查弹跳平台效果（独立函数，不依赖onGround）
    private checkBouncyPlatformEffects() {
        if (this.bouncyPlatforms.length === 0 || !this.player) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        // 弹跳平台只在玩家下落时触发（velocity.y >= 0）
        if (body.velocity.y < 0) return;

        const playerBottom = this.player.y + 24;
        const playerLeft = this.player.x - 16;
        const playerRight = this.player.x + 16;

        for (const bouncy of this.bouncyPlatforms) {
            const { x, y, width, height, bounceForce } = bouncy.data;

            // 检查玩家是否接触弹跳平台顶部
            const platformTop = y;
            const platformLeft = x;
            const platformRight = x + width;

            // 垂直对齐检查（玩家底部接近平台顶部，容差15像素）
            const verticallyAligned = Math.abs(playerBottom - platformTop) < 15;

            // 水平重叠检查
            const horizontallyOverlapping = playerRight > platformLeft && playerLeft < platformRight;

            if (verticallyAligned && horizontallyOverlapping) {
                // 应用弹跳力
                body.setVelocityY(-bounceForce);

                // 弹跳视觉反馈
                this.tweens.add({
                    targets: bouncy.sprite,
                    scaleY: 0.7,
                    duration: 100,
                    yoyo: true
                });

                debugLog('[PlatformGameScene] 🔼 弹跳! 力度:', bounceForce);
                break;
            }
        }

        // 🔥 创意工坊：消失平台效果
        for (const disappearing of this.disappearingPlatforms) {
            const { x, y, width, height, disappearTime } = disappearing.data;

            // 检查玩家是否站在消失平台上
            const platformTop = y;
            const platformLeft = x;
            const platformRight = x + width;

            // 垂直对齐检查
            const verticallyAligned = Math.abs(playerBottom - platformTop) < 10;

            // 水平重叠检查
            const horizontallyOverlapping = playerRight > platformLeft && playerLeft < platformRight;

            if (verticallyAligned && horizontallyOverlapping && disappearing.isVisible) {
                // 开始消失计时
                if (disappearing.timer === 0) {
                    disappearing.timer = this.time.now;

                    // 开始闪烁警告
                    this.tweens.add({
                        targets: disappearing.sprite,
                        alpha: { from: 0.8, to: 0.2 },
                        duration: 100,
                        yoyo: true,
                        repeat: Math.floor(disappearTime / 200)
                    });
                }

                // 检查是否应该消失
                if (this.time.now - disappearing.timer >= disappearTime) {
                    disappearing.isVisible = false;
                    disappearing.sprite.setVisible(false);

                    // 从碰撞组中移除
                    this.platforms.remove(disappearing.sprite, true, false);

                    debugLog('[PlatformGameScene] 👻 平台消失!');

                    // 3秒后重新出现
                    this.time.delayedCall(3000, () => {
                        disappearing.isVisible = true;
                        disappearing.timer = 0;
                        disappearing.sprite.setVisible(true);
                        disappearing.sprite.setAlpha(0.8);
                        this.platforms.add(disappearing.sprite);
                        this.platforms.refresh();
                        debugLog('[PlatformGameScene] 👻 平台重新出现!');
                    });
                }
            }
        }
    }

    private damagePlayerFromDynamicTrap(sourceX: number, damage: number, lastHitAtRef: { lastHitAt: number }) {
        const now = Date.now();
        if (this.isInvulnerable || now - lastHitAtRef.lastHitAt < 900) {
            return;
        }

        lastHitAtRef.lastHitAt = now;
        this.takeDamage(damage);
        if (this.player?.active) {
            const knockbackDirection = this.player.x < sourceX ? -1 : 1;
            this.player.setVelocityX(knockbackDirection * 220);
            this.player.setVelocityY(-120);
        }
    }

    private updateDynamicTraps(deltaTime: number) {
        if (!this.player?.active) {
            return;
        }

        const playerBounds = this.player.getBounds();
        const now = Date.now();

        for (const trap of this.gearChaserTraps) {
            if (!trap.sprite.active) continue;

            const distanceToPlayer = Phaser.Math.Distance.Between(trap.sprite.x, trap.sprite.y, this.player.x, this.player.y);
            const { triggerRadius, speed, activeDuration, cooldown, radius, damage } = trap.data;

            if (trap.state === 'idle' && distanceToPlayer <= triggerRadius) {
                trap.state = 'chasing';
                trap.stateStartedAt = now;
                this.tweens.add({
                    targets: trap.sprite,
                    scaleX: 1.12,
                    scaleY: 1.12,
                    duration: 160,
                    yoyo: true,
                    repeat: 1,
                });
            }

            if (trap.state === 'chasing') {
                const angle = Phaser.Math.Angle.Between(trap.sprite.x, trap.sprite.y, this.player.x, this.player.y);
                trap.sprite.x += Math.cos(angle) * speed * deltaTime;
                trap.sprite.y += Math.sin(angle) * speed * deltaTime;
                trap.sprite.rotation += 5.4 * deltaTime;

                const trapBounds = new Phaser.Geom.Circle(trap.sprite.x, trap.sprite.y, radius + 10);
                if (Phaser.Geom.Intersects.CircleToRectangle(trapBounds, playerBounds)) {
                    this.damagePlayerFromDynamicTrap(trap.sprite.x, damage, trap);
                }

                if (now - trap.stateStartedAt >= activeDuration) {
                    trap.state = 'cooldown';
                    trap.stateStartedAt = now;
                }
            } else if (trap.state === 'cooldown') {
                trap.sprite.x = Phaser.Math.Linear(trap.sprite.x, trap.homeX, Math.min(1, deltaTime * 3.2));
                trap.sprite.y = Phaser.Math.Linear(trap.sprite.y, trap.homeY, Math.min(1, deltaTime * 3.2));
                trap.sprite.rotation = Phaser.Math.Linear(trap.sprite.rotation, 0, Math.min(1, deltaTime * 4));
                if (now - trap.stateStartedAt >= cooldown && Phaser.Math.Distance.Between(trap.sprite.x, trap.sprite.y, trap.homeX, trap.homeY) < 6) {
                    trap.state = 'idle';
                    trap.sprite.setPosition(trap.homeX, trap.homeY);
                }
            }
        }

        for (const trap of this.expandingHazardTraps) {
            if (!trap.sprite.active) continue;

            const { radius, maxRadius, triggerRadius, growDuration, activeDuration, cooldown, damage } = trap.data;
            const distanceToPlayer = Phaser.Math.Distance.Between(trap.sprite.x, trap.sprite.y, this.player.x, this.player.y);

            if (trap.state === 'idle' && distanceToPlayer <= triggerRadius) {
                trap.state = 'warning';
                trap.stateStartedAt = now;
            }

            if (trap.state === 'warning') {
                const growProgress = Math.min(1, (now - trap.stateStartedAt) / growDuration);
                trap.currentRadius = Phaser.Math.Linear(radius, maxRadius, growProgress);
                const scale = trap.currentRadius / radius;
                trap.sprite.setScale(scale);
                trap.core.setAlpha(0.7 + growProgress * 0.2);
                trap.ring.setAlpha(0.24 + growProgress * 0.26);
                trap.ring.rotation += 1.8 * deltaTime;

                const blastCircle = new Phaser.Geom.Circle(trap.sprite.x, trap.sprite.y, trap.currentRadius);
                if (Phaser.Geom.Intersects.CircleToRectangle(blastCircle, playerBounds)) {
                    this.damagePlayerFromDynamicTrap(trap.sprite.x, damage, trap);
                }

                if (now - trap.stateStartedAt >= activeDuration) {
                    trap.state = 'cooldown';
                    trap.stateStartedAt = now;
                }
            } else if (trap.state === 'cooldown') {
                trap.currentRadius = Phaser.Math.Linear(trap.currentRadius, radius, Math.min(1, deltaTime * 4));
                const scale = trap.currentRadius / radius;
                trap.sprite.setScale(scale);
                trap.core.setAlpha(0.82);
                trap.ring.setAlpha(0.18);
                if (now - trap.stateStartedAt >= cooldown && Math.abs(trap.currentRadius - radius) < 1) {
                    trap.currentRadius = radius;
                    trap.sprite.setScale(1);
                    trap.state = 'idle';
                }
            }
        }

        for (const trap of this.movingSpikeTraps) {
            if (!trap.sprite.active) continue;

            const { axis, speed, moveDistance, width, height, damage } = trap.data;
            const delta = speed * deltaTime * trap.direction;

            if (axis === 'y') {
                trap.sprite.y += delta;
                if (Math.abs(trap.sprite.y - trap.startY) >= moveDistance) {
                    trap.sprite.y = trap.startY + moveDistance * trap.direction;
                    trap.direction *= -1;
                }
            } else {
                trap.sprite.x += delta;
                if (Math.abs(trap.sprite.x - trap.startX) >= moveDistance) {
                    trap.sprite.x = trap.startX + moveDistance * trap.direction;
                    trap.direction *= -1;
                }
            }

            trap.sprite.rotation = axis === 'y' ? 0 : trap.direction * 0.05;

            const rect = new Phaser.Geom.Rectangle(
                trap.sprite.x - width / 2,
                trap.sprite.y - height / 2,
                width,
                height,
            );
            if (Phaser.Geom.Intersects.RectangleToRectangle(rect, playerBounds)) {
                this.damagePlayerFromDynamicTrap(trap.sprite.x, damage, trap);
            }
        }
    }

    // 🔥 战役9：检查风力区域效果
    private checkWindZoneEffects() {
        // 🔥🔥🔥 这个函数处理风力区域效果
        // 战役6的风力由 (this.player as any).windZones 单独处理
        if (this.windZonesData.length === 0 || !this.player) return;

        // 🔥 战役9、战役10和自定义关卡都使用这个风力系统
        const campaignId = this.getCampaignId();
        const isCustomLevel = (this.levelData as any).isCustomLevel || (this.levelData as any).isTestMode;
        if (campaignId !== 'campaign_9' && campaignId !== 'campaign_10' && !isCustomLevel) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        // 🔥 追踪玩家是否在任何风力区域内
        let inAnyWindZone = false;
        let wasInWindZone = (this.player as any).wasInWindZone || false;

        // 🔥 检测玩家是否在空中（跳跃状态）
        const onGround = body.blocked.down || body.touching.down;
        const isInAir = !onGround;
        const windResistance = this.hasSkill('windControl') ? 0.58 : 1;

        for (const windZone of this.windZonesData) {
            const { x, y, width, height, direction, windForce } = windZone.data;

            // 检查玩家是否在风力区域内
            if (this.player.x >= x && this.player.x <= x + width &&
                this.player.y >= y && this.player.y <= y + height) {

                inAnyWindZone = true;

                // 🔥🔥🔥 风力设置
                // 战役9/10：强力风（乘数18），空中减弱到60%
                // 创意工坊：地面强推力，空中大幅减弱让玩家可以艰难跳跃进入风区
                let forceMultiplier: number;
                if (isCustomLevel) {
                    // 创意工坊：地面强推力，空中大幅减弱
                    // 地面：windForce * 5 = 强推力，会被吹走
                    // 空中：windForce * 5 * 0.05 = windForce * 0.25 = 很弱的阻力，可以艰难前进
                    const airMultiplier = isInAir ? 0.05 : 1.0;
                    forceMultiplier = windForce * 5 * airMultiplier * windResistance;
                } else {
                    // 战役9/10：强力风，空中减弱到60%
                    const airMultiplier = isInAir ? 0.6 : 1.0;
                    forceMultiplier = windForce * 18 * airMultiplier * windResistance;
                }

                switch (direction) {
                    case 'up':
                        // 向上风：让玩家飞起来！
                        body.setVelocityY(body.velocity.y - forceMultiplier);
                        break;
                    case 'down':
                        body.setVelocityY(body.velocity.y + forceMultiplier);
                        break;
                    case 'left':
                        body.setVelocityX(body.velocity.x - forceMultiplier);
                        break;
                    case 'right':
                        body.setVelocityX(body.velocity.x + forceMultiplier);
                        break;
                }
            }
        }

        // 🔥 离开风力区域后的处理
        if (wasInWindZone && !inAnyWindZone) {
            // 创意工坊不需要特殊处理，战役模式才需要快速下落
            if (!isCustomLevel) {
                const currentVelX = body.velocity.x;
                if (Math.abs(currentVelX) > 300) {
                    body.setVelocityX(currentVelX > 0 ? 300 : -300);
                }
                if (body.velocity.y < 0) {
                    body.setVelocityY(50);
                }
            }
        }

        // 记录状态
        (this.player as any).wasInWindZone = inAnyWindZone;
    }

    // 🔥 战役9：更新爆炸陷阱
    private updateExplosionTraps() {
        if (this.explosionTraps.length === 0 || !this.player) return;

        const now = Date.now();

        for (const trap of this.explosionTraps) {
            const { x, y, damage, blastRadius, warningTime, cooldownTime } = trap.data;
            const timeSinceLastExplosion = now - trap.lastExplosion;

            // 检查是否应该显示警告
            if (timeSinceLastExplosion >= cooldownTime - warningTime && !trap.isWarning) {
                trap.isWarning = true;
                trap.sprite.setFillStyle(0xff0000, 0.8); // 红色警告

                // 闪烁效果
                this.tweens.add({
                    targets: trap.sprite,
                    alpha: 0.3,
                    duration: 200,
                    yoyo: true,
                    repeat: Math.floor(warningTime / 400)
                });
            }

            // 检查是否应该爆炸
            if (timeSinceLastExplosion >= cooldownTime) {
                trap.lastExplosion = now;
                trap.isWarning = false;
                trap.sprite.setFillStyle(0xff6600, 0.6); // 恢复橙色

                // 创建爆炸效果
                const explosion = this.add.circle(x, y, blastRadius, 0xff4400, 0.7);
                this.tweens.add({
                    targets: explosion,
                    scale: 1.5,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => explosion.destroy()
                });

                // 检查玩家是否在爆炸范围内
                const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
                if (distance <= blastRadius && !this.isInvulnerable) {
                    this.takeDamage(damage);
                    debugLog('[爆炸陷阱] 玩家受到爆炸伤害:', damage);
                }

                this.playSound('boss_charge'); // 使用现有音效
            }
        }
    }

    private updateEnemyAI() {
        this.enemies.children.entries.forEach((enemy: any) => {
            if (!enemy.active) return;

            const enemyType = enemy.enemyType;

            // 初始化敌人AI数据 - 🔥 使用传入的参数
            if (!enemy.aiData) {
                // 从敌人数据中获取配置（创意工坊传入的参数）
                const enemyConfig = (enemy as any).enemyConfig || {};
                const configPatrolDistance = enemyConfig.patrolDistance;
                const configMoveSpeed = enemyConfig.moveSpeed;

                enemy.aiData = {
                    direction: 1,
                    patrolDistance: configPatrolDistance || (enemyType === 'boss' ? 300 : 150),
                    moveSpeed: configMoveSpeed || (enemyType === 'boss' ? 100 : 60),  // 🔥 新增：存储移动速度
                    startX: enemy.x,
                    chaseRange: enemyType === 'boss' ? 1000 : 200,  // 🔥 Boss追击范围非常大，确保能看到玩家
                    attackRange: enemyType === 'boss' ? 250 : 150,
                    lastAttackTime: 0,
                    isActive: true,  // Boss一开始就激活
                    attackPattern: 0,  // Boss攻击模式
                    alwaysActive: enemyType === 'boss'  // 🔥 Boss永远激活
                };
            }

            const aiData = enemy.aiData;
            const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            const moveSpeed = aiData.moveSpeed || 60;  // 🔥 使用配置的移动速度

            switch (enemyType) {
                case 'basic':
                case 'slime':
                    // 基础怪物：左右巡逻
                    {
                        const leftBound = aiData.startX - aiData.patrolDistance;
                        const rightBound = aiData.startX + aiData.patrolDistance;

                        if (enemy.x <= leftBound) {
                            enemy.x = leftBound;
                            aiData.direction = 1;
                        } else if (enemy.x >= rightBound) {
                            enemy.x = rightBound;
                            aiData.direction = -1;
                        }
                    }
                    enemy.setVelocityX(aiData.direction * moveSpeed);  // 🔥 使用配置的速度
                    enemy.setFlipX(aiData.direction < 0);
                    break;

                case 'bat':
                    // 蝙蝠：飞行追击玩家
                    if (distanceToPlayer < aiData.chaseRange) {
                        const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
                        enemy.setVelocityX(Math.cos(angleToPlayer) * (moveSpeed * 1.3));  // 🔥 蝙蝠稍快
                        enemy.setVelocityY(Math.sin(angleToPlayer) * (moveSpeed * 1.3));
                        enemy.setFlipX(this.player.x < enemy.x);
                    } else {
                        enemy.setVelocityX(0);
                        enemy.setVelocityY(0);
                    }
                    break;

                case 'robot':
                    // 机器人：巡逻+远程攻击
                    {
                        const leftBound = aiData.startX - aiData.patrolDistance;
                        const rightBound = aiData.startX + aiData.patrolDistance;

                        if (enemy.x <= leftBound) {
                            enemy.x = leftBound;
                            aiData.direction = 1;
                        } else if (enemy.x >= rightBound) {
                            enemy.x = rightBound;
                            aiData.direction = -1;
                        }
                    }
                    enemy.setVelocityX(aiData.direction * moveSpeed);  // 🔥 使用配置的速度
                    enemy.setFlipX(aiData.direction < 0);

                    // 远程攻击
                    if (distanceToPlayer < aiData.attackRange && Date.now() - aiData.lastAttackTime > 2000) {
                        this.enemyShoot(enemy);
                        aiData.lastAttackTime = Date.now();
                    }
                    break;

                case 'turret':
                    // 炮塔：固定位置，全域攻击
                    enemy.setVelocityX(0);
                    enemy.setVelocityY(0);

                    // 炮塔不受重力影响
                    if (enemy.body) {
                        (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
                    }

                    // 全域攻击：无视距离，定期发射追踪弹
                    const turretCooldown = 3000; // 3秒冷却
                    if (Date.now() - aiData.lastAttackTime > turretCooldown) {
                        this.turretShoot(enemy);
                        aiData.lastAttackTime = Date.now();
                    }

                    // 炮管旋转指向玩家
                    const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
                    enemy.setRotation(angleToPlayer);
                    break;

                case 'acid_turret':
                    // 🔥 战役9：酸液喷射怪 - 固定位置，定期发射酸液弹
                    enemy.setVelocityX(0);
                    enemy.setVelocityY(0);

                    if (enemy.body) {
                        (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
                    }

                    // 酸液喷射：2.5秒冷却，发射酸液弹
                    const acidTurretCooldown = 2500;
                    if (Date.now() - aiData.lastAttackTime > acidTurretCooldown) {
                        this.acidTurretShoot(enemy);
                        aiData.lastAttackTime = Date.now();
                    }

                    // 指向玩家
                    const acidAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
                    enemy.setRotation(acidAngle);
                    break;

                case 'boss':
                    // Boss：智能追击+多种攻击+阶段变化（无重力模式）
                    // 🔥🔥🔥 双Boss模式：根据当前Boss计算HP百分比
                    let bossHPPercent = this.bossHP / this.bossMaxHP;
                    if (this.dualBossState) {
                        const bossIndex = (enemy as any).bossIndex;
                        if (bossIndex === 1 && !this.dualBossState.boss1Defeated) {
                            bossHPPercent = this.dualBossState.boss1HP / this.dualBossState.boss1MaxHP;
                        } else if (bossIndex === 2 && !this.dualBossState.boss2Defeated) {
                            bossHPPercent = this.dualBossState.boss2HP / this.dualBossState.boss2MaxHP;
                        } else {
                            // Boss已被击败，跳过AI更新
                            return;
                        }
                        // 狂暴状态下攻击更频繁
                        if (this.dualBossState.enraged) {
                            bossHPPercent = Math.min(bossHPPercent, 0.25); // 强制进入狂暴阶段
                        }
                    }

                    let bossPhase = 1;
                    if (bossHPPercent < 0.3) {
                        bossPhase = 3;  // 狂暴阶段
                    } else if (bossHPPercent < 0.6) {
                        bossPhase = 2;  // 愤怒阶段
                    }

                    // 根据阶段调整速度和攻击频率
                    const phaseSpeedMultiplier = bossPhase === 3 ? 2.0 : (bossPhase === 2 ? 1.5 : 1.0);
                    const phaseAttackCooldown = bossPhase === 3 ? 600 : (bossPhase === 2 ? 1000 : 1500);

                    // 初始化AI数据
                    if (!aiData.attackCount) aiData.attackCount = 0;
                    if (!aiData.lastHitTime) aiData.lastHitTime = 0;
                    if (!aiData.dodgeDirection) aiData.dodgeDirection = 1;
                    if (!aiData.isRetreating) aiData.isRetreating = false;

                    // 检查是否刚被攻击（受击反应）
                    const timeSinceHit = Date.now() - aiData.lastHitTime;
                    const justGotHit = timeSinceHit < 500;  // 被击中后500ms内

                    // 战术撤退判断（血量低于40%时偶尔撤退，但有冷却时间）
                    if (!aiData.lastRetreatCheck) aiData.lastRetreatCheck = 0;
                    const retreatCheckInterval = 3000; // 每3秒才检查一次是否撤退
                    if (bossHPPercent < 0.4 && !aiData.isRetreating &&
                        Date.now() - aiData.lastRetreatCheck > retreatCheckInterval &&
                        Math.random() < 0.2) {
                        aiData.isRetreating = true;
                        aiData.retreatEndTime = Date.now() + 1500;  // 撤退1.5秒
                        aiData.lastRetreatCheck = Date.now();
                    }

                    // 撤退结束判断
                    if (aiData.isRetreating && Date.now() > aiData.retreatEndTime) {
                        aiData.isRetreating = false;
                    }

                    // 🔥🔥🔥 双Boss分离逻辑：保持两个Boss之间的距离（仅在太近时生效）
                    let separationForce = 0;
                    if (this.dualBossState) {
                        const bossIndex = (enemy as any).bossIndex;
                        const otherBoss = bossIndex === 1 ? this.dualBossState.boss2 : this.dualBossState.boss1;
                        const otherDefeated = bossIndex === 1 ? this.dualBossState.boss2Defeated : this.dualBossState.boss1Defeated;

                        if (otherBoss && !otherDefeated) {
                            const distToOther = Math.abs(enemy.x - otherBoss.x);
                            const minSeparation = 200; // 最小分离距离（减小，让Boss更容易追击玩家）

                            if (distToOther < minSeparation) {
                                // 太近了，需要分开（但力度减小，不要影响追击）
                                separationForce = (minSeparation - distToOther) * 0.3;
                                if (enemy.x < otherBoss.x) {
                                    separationForce = -separationForce; // 向左推
                                }
                            }
                            // 🔥 移除强制方向偏好，让Boss自由追击玩家
                        }
                    }

                    // 🔥 Boss始终主动移动（无论玩家是否在范围内）
                    // 🔥🔥🔥 战役9双Boss：强制始终追击，不受距离限制
                    const campaignId = this.getCampaignId();
                    const levelBossConfig = this.getLevelBossConfig();
                    const useAdvancedDualBossAI =
                        !!this.dualBossState &&
                        levelBossConfig?.type === 'dual' &&
                        levelBossConfig?.requireBothDefeated;
                    const effectiveChaseRange = useAdvancedDualBossAI ? 3000 : aiData.chaseRange;
                    const inChaseRange = distanceToPlayer < effectiveChaseRange;

                    if (inChaseRange) {
                        // 🔥🔥🔥 战役9双Boss专用AI：完全重写，确保追击玩家
                        if (useAdvancedDualBossAI) {
                            const bossIndex = (enemy as any).bossIndex;
                            const isEnraged = this.dualBossState!.enraged;
                            const c9SpeedMult = isEnraged ? 1.6 : 1.0;

                            // 🔥🔥🔥 核心：计算玩家方向（玩家在Boss左边=-1，右边=1）
                            const playerX = this.player.x;
                            const playerY = this.player.y;
                            const bossX = enemy.x;
                            const bossY = enemy.y;

                            // 玩家在Boss的哪个方向
                            const toPlayerDir = playerX > bossX ? 1 : -1;

                            // 🔥 调试日志（每秒打印一次）
                            if (!aiData.lastDebugTime || Date.now() - aiData.lastDebugTime > 1000) {
                                debugLog(`[战役9 Boss${bossIndex}] 玩家位置:(${Math.floor(playerX)},${Math.floor(playerY)}) Boss位置:(${Math.floor(bossX)},${Math.floor(bossY)}) 方向:${toPlayerDir} 距离:${Math.floor(distanceToPlayer)}`);
                                aiData.lastDebugTime = Date.now();
                            }

                            // 🔥🔥🔥 简单直接的追击逻辑：始终向玩家移动
                            const chaseSpeed = (bossIndex === 1 ? 120 : 100) * c9SpeedMult * phaseSpeedMultiplier;

                            // 受击闪避优先
                            if (justGotHit) {
                                const dodgeDir = Math.random() > 0.5 ? 1 : -1;
                                enemy.setVelocityX(dodgeDir * 180);
                                enemy.setVelocityY(-80);
                                debugLog(`[战役9 Boss${bossIndex}] 受击闪避！`);
                            }
                            // 战术撤退
                            else if (aiData.isRetreating) {
                                enemy.setVelocityX(-toPlayerDir * 100 * c9SpeedMult);
                                enemy.setVelocityY(Math.sin(Date.now() / 200) * 50);
                            }
                            // 🔥🔥🔥 正常追击：直接向玩家方向移动
                            else {
                                // 距离太近时后退一点
                                if (distanceToPlayer < 100) {
                                    const backSpeed = -toPlayerDir * chaseSpeed * 0.3;
                                    enemy.setVelocityX(backSpeed);
                                    debugLog(`[战役9 Boss${bossIndex}] 太近后退 速度:${Math.floor(backSpeed)}`);
                                } else {
                                    // 🔥 核心追击：向玩家方向移动
                                    const moveSpeed = toPlayerDir * chaseSpeed;
                                    enemy.setVelocityX(moveSpeed);
                                    // 每秒打印一次速度
                                    if (!aiData.lastSpeedLog || Date.now() - aiData.lastSpeedLog > 1000) {
                                        debugLog(`[战役9 Boss${bossIndex}] 追击中 速度:${Math.floor(moveSpeed)} 实际速度:${Math.floor(enemy.body.velocity.x)}`);
                                        aiData.lastSpeedLog = Date.now();
                                    }
                                }
                            }

                            // 面向玩家
                            enemy.setFlipX(toPlayerDir < 0);

                            // Y轴跟随
                            const yDiff = playerY - bossY;
                            if (Math.abs(yDiff) > 40) {
                                const ySpeed = Math.min(Math.abs(yDiff) * 0.8, 100 * c9SpeedMult);
                                enemy.setVelocityY(yDiff > 0 ? ySpeed : -ySpeed);
                            } else {
                                enemy.setVelocityY(0);
                            }

                            // 🔥🔥🔥 可复用的双Boss技能攻击（不再锁死在战役9）
                            const now = Date.now();
                            this.runConfiguredDualBossSkills(enemy, bossIndex, bossHPPercent, aiData, now);
                        } else {
                            // 🔥 非战役9的通用Boss AI
                            const horizontalGap = this.player.x - enemy.x;
                            const yDistance = this.player.y - enemy.y;
                            if (!aiData.facingDirection) {
                                aiData.facingDirection = horizontalGap >= 0 ? 1 : -1;
                            }
                            if (horizontalGap > 56) {
                                aiData.facingDirection = 1;
                            } else if (horizontalGap < -56) {
                                aiData.facingDirection = -1;
                            }
                            const direction = aiData.facingDirection;
                            const isWithinStableAttackZone =
                                Math.abs(horizontalGap) < 42 && Math.abs(yDistance) < 72;

                            // 🔥 分离力只在非常近时才影响方向，且不完全覆盖追击方向
                            // 改为：分离力作为速度调整，而不是方向覆盖
                            let separationAdjust = 0;
                            if (Math.abs(separationForce) > 50) {
                                // 只有在非常近时才调整，且只是减速而不是改变方向
                                separationAdjust = separationForce * 0.3;
                            }

                            // 智能行为判断
                            if (justGotHit) {
                                // 受击反应：快速闪避
                                const dodgeSpeed = 180 * phaseSpeedMultiplier;
                                // 随机选择闪避方向（避免被预判）
                                if (Math.random() < 0.3) {
                                    aiData.dodgeDirection *= -1;  // 30%概率改变方向
                                }
                                enemy.setVelocityX(-direction * dodgeSpeed * aiData.dodgeDirection);
                                enemy.setVelocityY(-80);  // 向上跳起
                                debugLog('[Boss] 受击闪避！');
                            } else if (aiData.isRetreating) {
                                // 战术撤退：拉开距离
                                const retreatSpeed = 150 * phaseSpeedMultiplier;
                                enemy.setVelocityX(-direction * retreatSpeed);
                                // 撤退时上下移动，难以预判
                                const yOscillate = Math.sin(Date.now() / 200) * 60;
                                enemy.setVelocityY(yOscillate);
                                debugLog('[Boss] 战术撤退中...');
                            } else if (isWithinStableAttackZone) {
                                // 进入近身稳定区后停住，避免贴脸时反复横跳
                                enemy.setVelocityX(0);
                                enemy.setFlipX(direction < 0);
                                if (Math.abs(yDistance) > 50) {
                                    const ySpeed = Math.min(Math.abs(yDistance) * 0.5, 60 * phaseSpeedMultiplier);
                                    enemy.setVelocityY(yDistance > 0 ? ySpeed : -ySpeed);
                                } else {
                                    enemy.setVelocityY(0);
                                }
                            } else if (distanceToPlayer < 80) {
                                // 距离太近：后退并攻击（防止被卡距离）
                                const backoffSpeed = 100 * phaseSpeedMultiplier;
                                enemy.setVelocityX(-direction * backoffSpeed);
                                enemy.setFlipX(direction < 0);
                                // 后退时Y轴保持跟随
                                if (Math.abs(yDistance) > 50) {
                                    const ySpeed = Math.min(Math.abs(yDistance) * 0.5, 60 * phaseSpeedMultiplier);
                                    enemy.setVelocityY(yDistance > 0 ? ySpeed : -ySpeed);
                                } else {
                                    enemy.setVelocityY(0);
                                }
                            } else {
                                // 正常追击
                                const baseSpeed = distanceToPlayer < 300 ? 120 : 80;
                                const speed = baseSpeed * phaseSpeedMultiplier;
                                enemy.setVelocityX(direction * speed);
                                enemy.setFlipX(direction < 0);

                                // Y轴跟随（无重力模式下需要手动控制）
                                if (Math.abs(yDistance) > 50) {
                                    const ySpeed = Math.min(Math.abs(yDistance) * 0.5, 60 * phaseSpeedMultiplier);
                                    enemy.setVelocityY(yDistance > 0 ? ySpeed : -ySpeed);
                                } else {
                                    enemy.setVelocityY(0);
                                }
                            }

                            // Boss多种攻击模式（增大攻击范围，确保Boss能释放技能）
                            const effectiveAttackRange = Math.max(aiData.attackRange, 500); // 至少500的攻击范围
                            if (distanceToPlayer < effectiveAttackRange && Date.now() - aiData.lastAttackTime > phaseAttackCooldown) {
                                aiData.attackCount++;

                                // Boss特殊技能判断
                                const campaignId = this.getCampaignId();

                                // 战役1 Boss：瞬移到玩家身后（血量<60%，8秒冷却）
                                if (campaignId === 'campaign_1' && bossHPPercent < 0.6) {
                                    if (!aiData.lastTeleportTime) aiData.lastTeleportTime = 0;
                                    if (Date.now() - aiData.lastTeleportTime > 8000) {
                                        this.bossTeleportBehindPlayer(enemy);
                                        aiData.lastTeleportTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役1 Boss：影分身术（血量<40%，12秒冷却）
                                if (campaignId === 'campaign_1' && bossHPPercent < 0.4) {
                                    if (!aiData.lastCloneTime) aiData.lastCloneTime = 0;
                                    if (Date.now() - aiData.lastCloneTime > 12000) {
                                        this.bossShadowClone(enemy);
                                        aiData.lastCloneTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役1 Boss：隐身术（血量<20%，15秒冷却）
                                if (campaignId === 'campaign_1' && bossHPPercent < 0.2) {
                                    if (!aiData.lastInvisTime) aiData.lastInvisTime = 0;
                                    if (Date.now() - aiData.lastInvisTime > 15000) {
                                        this.bossInvisibility(enemy);
                                        aiData.lastInvisTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 🔥 战役1 Boss：红色散弹（8秒冷却，血量<75%时使用）
                                if (campaignId === 'campaign_1' && bossHPPercent < 0.75) {
                                    if (!aiData.lastSpread1Time) aiData.lastSpread1Time = 0;
                                    if (Date.now() - aiData.lastSpread1Time > 8000) {
                                        this.bossRedSpreadShot(enemy, 5, 12, '古街守护者');
                                        this.showBossDialogue('古街守护者', '影刃散射！🌙', 1000);
                                        aiData.lastSpread1Time = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役2 Boss：激光扫射（血量<50%，10秒冷却）
                                if (campaignId === 'campaign_2' && bossHPPercent < 0.5) {
                                    if (!aiData.lastLaserTime) aiData.lastLaserTime = 0;
                                    if (Date.now() - aiData.lastLaserTime > 10000) {
                                        this.bossLaserSweep(enemy);
                                        aiData.lastLaserTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役2 Boss：电磁定身（血量<30%，12秒冷却）
                                if (campaignId === 'campaign_2' && bossHPPercent < 0.3) {
                                    if (!aiData.lastStunTime) aiData.lastStunTime = 0;
                                    if (Date.now() - aiData.lastStunTime > 12000) {
                                        this.bossEMPStun(enemy);
                                        aiData.lastStunTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 🔥 战役2 Boss：红色散弹（7秒冷却，血量<70%时使用）
                                if (campaignId === 'campaign_2' && bossHPPercent < 0.7) {
                                    if (!aiData.lastSpread2Time) aiData.lastSpread2Time = 0;
                                    if (Date.now() - aiData.lastSpread2Time > 7000) {
                                        this.bossRedSpreadShot(enemy, 5, 14, '机械守卫');
                                        this.showBossDialogue('机械守卫', '电磁风暴！⚡', 1000);
                                        aiData.lastSpread2Time = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役3 Boss：水流冲击波（血量<30%，8秒冷却）
                                if (campaignId === 'campaign_3' && bossHPPercent < 0.3) {
                                    if (!aiData.lastWaveTime) aiData.lastWaveTime = 0;
                                    if (Date.now() - aiData.lastWaveTime > 8000) {
                                        this.bossWaterWave(enemy);
                                        aiData.lastWaveTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役3 Boss：水牢笼（血量<40%，10秒冷却）
                                if (campaignId === 'campaign_3' && bossHPPercent < 0.4) {
                                    if (!aiData.lastPrisonTime) aiData.lastPrisonTime = 0;
                                    if (Date.now() - aiData.lastPrisonTime > 10000) {
                                        this.bossWaterPrison(enemy);
                                        aiData.lastPrisonTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役3 Boss：水之治愈（血量<25%，20秒冷却）
                                if (campaignId === 'campaign_3' && bossHPPercent < 0.25) {
                                    if (!aiData.lastHealTime) aiData.lastHealTime = 0;
                                    if (Date.now() - aiData.lastHealTime > 20000) {
                                        this.bossWaterHeal(enemy);
                                        aiData.lastHealTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 🔥 战役3 Boss：红色散弹（6秒冷却，血量<65%时使用）
                                if (campaignId === 'campaign_3' && bossHPPercent < 0.65) {
                                    if (!aiData.lastSpread3Time) aiData.lastSpread3Time = 0;
                                    if (Date.now() - aiData.lastSpread3Time > 6000) {
                                        this.bossRedSpreadShot(enemy, 5, 16, '水域守护者');
                                        this.showBossDialogue('水域守护者', '水流喷射！💧', 1000);
                                        aiData.lastSpread3Time = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役4 Boss：战阵冲锋（血量<50%，9秒冷却）
                                if (campaignId === 'campaign_4' && bossHPPercent < 0.5) {
                                    if (!aiData.lastChargeTime) aiData.lastChargeTime = 0;
                                    if (Date.now() - aiData.lastChargeTime > 9000) {
                                        this.bossWarCharge(enemy);
                                        aiData.lastChargeTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役4 Boss：盾牌格挡（血量<35%，12秒冷却）
                                if (campaignId === 'campaign_4' && bossHPPercent < 0.35) {
                                    if (!aiData.lastShieldTime) aiData.lastShieldTime = 0;
                                    if (Date.now() - aiData.lastShieldTime > 12000) {
                                        this.bossShieldBlock(enemy);
                                        aiData.lastShieldTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役4 Boss：狂暴冲锋（血量<20%，15秒冷却）
                                if (campaignId === 'campaign_4' && bossHPPercent < 0.2) {
                                    if (!aiData.lastBerserkerTime) aiData.lastBerserkerTime = 0;
                                    if (Date.now() - aiData.lastBerserkerTime > 15000) {
                                        this.bossBerserkerCharge(enemy);
                                        aiData.lastBerserkerTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役4 Boss：召唤士兵（血量<30%，每8次攻击）
                                if (campaignId === 'campaign_4' && bossHPPercent < 0.3 && aiData.attackCount % 8 === 0) {
                                    this.bossSummonSoldiers(enemy);
                                    aiData.lastAttackTime = Date.now();
                                }

                                // 🔥 战役4 Boss：红色散弹（5.5秒冷却，血量<60%时使用）
                                if (campaignId === 'campaign_4' && bossHPPercent < 0.6) {
                                    if (!aiData.lastSpread4Time) aiData.lastSpread4Time = 0;
                                    if (Date.now() - aiData.lastSpread4Time > 5500) {
                                        this.bossRedSpreadShot(enemy, 6, 18, '战争领主');
                                        this.showBossDialogue('战争领主', '箭雨覆盖！🏹', 1000);
                                        aiData.lastSpread4Time = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役5 Boss：时间减速（血量<50%，10秒冷却）
                                if (campaignId === 'campaign_5' && bossHPPercent < 0.5) {
                                    if (!aiData.lastSlowTime) aiData.lastSlowTime = 0;
                                    if (Date.now() - aiData.lastSlowTime > 10000) {
                                        this.bossTimeSlow(enemy);
                                        aiData.lastSlowTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役5 Boss：时空停滞（血量<35%，13秒冷却）
                                if (campaignId === 'campaign_5' && bossHPPercent < 0.35) {
                                    if (!aiData.lastFreezeTime) aiData.lastFreezeTime = 0;
                                    if (Date.now() - aiData.lastFreezeTime > 13000) {
                                        this.bossTimeFreeze(enemy);
                                        aiData.lastFreezeTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役5 Boss：时间分身（血量<20%，18秒冷却）
                                if (campaignId === 'campaign_5' && bossHPPercent < 0.2) {
                                    if (!aiData.lastTimeCloneTime) aiData.lastTimeCloneTime = 0;
                                    if (Date.now() - aiData.lastTimeCloneTime > 18000) {
                                        this.bossTimeClone(enemy);
                                        aiData.lastTimeCloneTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 战役5 Boss：时间倒流（血量<25%，15秒冷却）
                                if (campaignId === 'campaign_5' && bossHPPercent < 0.25) {
                                    if (!aiData.lastRewindTime) aiData.lastRewindTime = 0;
                                    if (Date.now() - aiData.lastRewindTime > 15000) {
                                        this.bossTimeRewind(enemy);
                                        aiData.lastRewindTime = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 🔥 战役5 Boss：红色散弹（5秒冷却，血量<55%时使用）
                                if (campaignId === 'campaign_5' && bossHPPercent < 0.55) {
                                    if (!aiData.lastSpread5Time) aiData.lastSpread5Time = 0;
                                    if (Date.now() - aiData.lastSpread5Time > 5000) {
                                        this.bossRedSpreadShot(enemy, 6, 20, '时间守护者');
                                        this.showBossDialogue('时间守护者', '时空裂隙！⏰', 1000);
                                        aiData.lastSpread5Time = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 🔥🔥🔥 战役6 Boss：桥塔守护者特殊技能 🔥🔥🔥
                                if (campaignId === 'campaign_6') {
                                    const now = Date.now();

                                    // 定身术（8秒冷却，血量<70%时使用）
                                    if (bossHPPercent < 0.7) {
                                        if (!aiData.lastStun6Time) aiData.lastStun6Time = 0;
                                        if (now - aiData.lastStun6Time > 8000) {
                                            this.bossStunPlayer(enemy, 1500);
                                            aiData.lastStun6Time = now;
                                            aiData.lastAttackTime = now;
                                        }
                                    }

                                    // 🔥 红色散弹（5秒冷却，血量<80%时使用）
                                    if (bossHPPercent < 0.8) {
                                        if (!aiData.lastSpread6Time) aiData.lastSpread6Time = 0;
                                        if (now - aiData.lastSpread6Time > 5000) {
                                            this.bossRedSpreadShot(enemy, 6, 22, '桥塔守护者');
                                            this.showBossDialogue('桥塔守护者', '风暴来袭！💨', 1000);
                                            aiData.lastSpread6Time = now;
                                            aiData.lastAttackTime = now;
                                        }
                                    }

                                    // 召唤小怪（12秒冷却，血量<50%时使用）
                                    if (bossHPPercent < 0.5) {
                                        if (!aiData.lastSummon6Time) aiData.lastSummon6Time = 0;
                                        if (now - aiData.lastSummon6Time > 12000) {
                                            this.bossSpawnMinions(enemy);
                                            aiData.lastSummon6Time = now;
                                            aiData.lastAttackTime = now;
                                        }
                                    }

                                    // 狂暴冲锋（10秒冷却，血量<30%时使用）
                                    if (bossHPPercent < 0.3) {
                                        if (!aiData.lastCharge6Time) aiData.lastCharge6Time = 0;
                                        if (now - aiData.lastCharge6Time > 10000) {
                                            this.bossWarCharge(enemy);
                                            aiData.lastCharge6Time = now;
                                            aiData.lastAttackTime = now;
                                        }
                                    }
                                }

                                // 🔥 战役7 Boss：激光扫射（血量<50%，8秒冷却）
                                if (campaignId === 'campaign_7' && bossHPPercent < 0.5) {
                                    if (!aiData.lastLaser7Time) aiData.lastLaser7Time = 0;
                                    if (Date.now() - aiData.lastLaser7Time > 8000) {
                                        this.bossLaserSweep(enemy);
                                        aiData.lastLaser7Time = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 🔥 战役7 Boss：召唤机器人（血量<40%，10秒冷却）
                                if (campaignId === 'campaign_7' && bossHPPercent < 0.4) {
                                    if (!aiData.lastSummon7Time) aiData.lastSummon7Time = 0;
                                    if (Date.now() - aiData.lastSummon7Time > 10000) {
                                        this.bossSpawnMinions(enemy);
                                        aiData.lastSummon7Time = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 🔥 战役7 Boss：电磁定身（血量<30%，12秒冷却）
                                if (campaignId === 'campaign_7' && bossHPPercent < 0.3) {
                                    if (!aiData.lastStun7Time) aiData.lastStun7Time = 0;
                                    if (Date.now() - aiData.lastStun7Time > 12000) {
                                        this.bossEMPStun(enemy);
                                        aiData.lastStun7Time = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 🔥 战役7 Boss：红色散弹（4.5秒冷却，血量<60%时使用）
                                if (campaignId === 'campaign_7' && bossHPPercent < 0.6) {
                                    if (!aiData.lastSpread7Time) aiData.lastSpread7Time = 0;
                                    if (Date.now() - aiData.lastSpread7Time > 4500) {
                                        this.bossRedSpreadShot(enemy, 7, 24, '量子守护者');
                                        this.showBossDialogue('量子守护者', '量子散射！🔬', 1000);
                                        aiData.lastSpread7Time = Date.now();
                                        aiData.lastAttackTime = Date.now();
                                    }
                                }

                                // 🔥🔥🔥 战役8 Boss：分子怪博士特殊技能 🔥🔥🔥
                                if (campaignId === 'campaign_8') {
                                    const now = Date.now();

                                    // 毒气云攻击（4秒冷却）- 释放毒气云
                                    if (!aiData.lastPoisonCloud8Time) aiData.lastPoisonCloud8Time = 0;
                                    if (now - aiData.lastPoisonCloud8Time > 4000) {
                                        this.bossPoisonCloud(enemy);
                                        aiData.lastPoisonCloud8Time = now;
                                        aiData.lastAttackTime = now;
                                        debugLog('[战役8 Boss] 释放毒气云！');
                                    }

                                    // 酸液喷射（5秒冷却）
                                    if (!aiData.lastAcidSpray8Time) aiData.lastAcidSpray8Time = 0;
                                    if (now - aiData.lastAcidSpray8Time > 5000) {
                                        this.bossAcidSpray(enemy);
                                        aiData.lastAcidSpray8Time = now;
                                        aiData.lastAttackTime = now;
                                        debugLog('[战役8 Boss] 释放酸液喷射！');
                                    }

                                    // 召唤分子怪（血量<60%，8秒冷却）
                                    if (bossHPPercent < 0.6) {
                                        if (!aiData.lastSummon8Time) aiData.lastSummon8Time = 0;
                                        if (now - aiData.lastSummon8Time > 8000) {
                                            this.bossSpawnMinions(enemy);
                                            aiData.lastSummon8Time = now;
                                            aiData.lastAttackTime = now;
                                            debugLog('[战役8 Boss] 召唤分子怪！');
                                        }
                                    }

                                    // 激光扫射（血量<40%，6秒冷却）
                                    if (bossHPPercent < 0.4) {
                                        if (!aiData.lastLaser8Time) aiData.lastLaser8Time = 0;
                                        if (now - aiData.lastLaser8Time > 6000) {
                                            this.bossLaserSweep(enemy);
                                            aiData.lastLaser8Time = now;
                                            aiData.lastAttackTime = now;
                                            debugLog('[战役8 Boss] 激光扫射！');
                                        }
                                    }

                                    // 普通射击（2秒冷却）
                                    if (!aiData.lastShoot8Time) aiData.lastShoot8Time = 0;
                                    if (now - aiData.lastShoot8Time > 2000) {
                                        this.enemyShoot(enemy);
                                        this.enemyShoot(enemy, 10);
                                        this.enemyShoot(enemy, -10);
                                        aiData.lastShoot8Time = now;
                                    }
                                }

                                // 🔥🔥🔥 战役9 Boss：酸液博士 & 气体博士特殊技能 🔥🔥🔥
                                if (campaignId === 'campaign_9') {
                                    const now = Date.now();
                                    const bossIndex = (enemy as any).bossIndex || 1;
                                    const isEnraged = this.dualBossState?.enraged || false;

                                    // 狂暴状态下冷却时间减半
                                    const cooldownMultiplier = isEnraged ? 0.5 : 1;

                                    // 🔥 酸液博士技能（bossIndex === 1）
                                    if (bossIndex === 1) {
                                        // 酸液池攻击（5秒冷却）- 在玩家位置创建酸液池
                                        if (!aiData.lastAcidPoolTime) aiData.lastAcidPoolTime = 0;
                                        if (now - aiData.lastAcidPoolTime > 5000 * cooldownMultiplier) {
                                            this.bossAcidPool(enemy);
                                            aiData.lastAcidPoolTime = now;
                                            aiData.lastAttackTime = now;
                                        }

                                        // 酸液喷射（4秒冷却，血量<60%）- 扇形酸液攻击
                                        if (bossHPPercent < 0.6) {
                                            if (!aiData.lastAcidSprayTime) aiData.lastAcidSprayTime = 0;
                                            if (now - aiData.lastAcidSprayTime > 4000 * cooldownMultiplier) {
                                                this.bossAcidSpray(enemy);
                                                aiData.lastAcidSprayTime = now;
                                                aiData.lastAttackTime = now;
                                            }
                                        }
                                    }

                                    // 🔥 气体博士技能（bossIndex === 2）
                                    if (bossIndex === 2) {
                                        // 毒气云攻击（6秒冷却）- 释放追踪毒气云
                                        if (!aiData.lastPoisonCloudTime) aiData.lastPoisonCloudTime = 0;
                                        if (now - aiData.lastPoisonCloudTime > 6000 * cooldownMultiplier) {
                                            this.bossPoisonCloud(enemy);
                                            aiData.lastPoisonCloudTime = now;
                                            aiData.lastAttackTime = now;
                                        }

                                        // 气体爆发（7秒冷却，血量<40%）- 大范围毒气爆发
                                        if (bossHPPercent < 0.4) {
                                            if (!aiData.lastGasBurstTime) aiData.lastGasBurstTime = 0;
                                            if (now - aiData.lastGasBurstTime > 7000 * cooldownMultiplier) {
                                                this.bossGasBurst(enemy);
                                                aiData.lastGasBurstTime = now;
                                                aiData.lastAttackTime = now;
                                            }
                                        }
                                    }

                                    // 🔥 化学反应终极技能（两个Boss都可以触发，但需要血量<25%）
                                    if (bossHPPercent < 0.25) {
                                        if (!aiData.lastChemicalReactionTime) aiData.lastChemicalReactionTime = 0;
                                        if (now - aiData.lastChemicalReactionTime > 12000 * cooldownMultiplier) {
                                            this.bossChemicalReaction(enemy);
                                            aiData.lastChemicalReactionTime = now;
                                            aiData.lastAttackTime = now;
                                        }
                                    }
                                }

                                // 🔥🔥🔥 战役10：三Boss竞技场智能AI 🔥🔥🔥
                                if (this.tripleBossState && !(enemy as any).defeated) {
                                    const now = Date.now();
                                    const bossIndex = (enemy as any).bossIndex || 1;
                                    const isEnraged = this.tripleBossState.enraged;
                                    const cooldownMult = isEnraged ? 0.5 : 1;
                                    const speedMult = isEnraged ? 1.4 : 1;

                                    // 🔥🔥🔥 Boss激活延迟：给玩家5秒准备时间
                                    if (!aiData.activationTime) aiData.activationTime = now;
                                    const timeSinceStart = now - aiData.activationTime;
                                    const activationDelay = 5000; // 5秒激活延迟

                                    // 🔥 Boss激活延迟检查
                                    const bossActivated = timeSinceStart >= activationDelay;

                                    if (!bossActivated) {
                                        // Boss还在等待激活，保持静止
                                        enemy.setVelocityX(0);
                                        enemy.setVelocityY(0);
                                        // 闪烁提示即将激活
                                        enemy.setAlpha(Math.floor(timeSinceStart / 500) % 2 === 0 ? 0.7 : 1);
                                    } else {
                                        // Boss已激活，恢复正常
                                        enemy.setAlpha(1);

                                        // 🔥 智能状态机：观察→接近→攻击→撤退→观察
                                        if (!aiData.aiState) aiData.aiState = 'observe';
                                        if (!aiData.stateTimer) aiData.stateTimer = now;
                                        if (!aiData.targetX) aiData.targetX = enemy.x;
                                        if (!aiData.targetY) aiData.targetY = enemy.y;

                                        const stateTime = now - aiData.stateTimer;
                                        const bossHP = (enemy as any).bossHP || 100;
                                        const bossMaxHP = (enemy as any).bossMaxHP || 100;
                                        const hpPercent = bossHP / bossMaxHP;

                                        // 🔥 状态转换逻辑
                                        if (aiData.aiState === 'observe' && stateTime > 1500) {
                                            // 观察后决定行动
                                            if (distanceToPlayer < 400) {
                                                aiData.aiState = 'attack';
                                            } else {
                                                aiData.aiState = 'approach';
                                            }
                                            aiData.stateTimer = now;
                                        } else if (aiData.aiState === 'approach' && (distanceToPlayer < 250 || stateTime > 3000)) {
                                            aiData.aiState = 'attack';
                                            aiData.stateTimer = now;
                                        } else if (aiData.aiState === 'attack' && stateTime > 2500) {
                                            // 攻击后撤退或继续
                                            aiData.aiState = hpPercent < 0.4 ? 'retreat' : 'observe';
                                            aiData.stateTimer = now;
                                        } else if (aiData.aiState === 'retreat' && stateTime > 2000) {
                                            aiData.aiState = 'observe';
                                            aiData.stateTimer = now;
                                        }

                                        // 🔥 根据状态执行行为
                                        const direction = this.getStableHorizontalDirection(enemy, aiData.aiState === 'attack' ? 42 : 28);

                                        if (aiData.aiState === 'observe') {
                                            // 观察：缓慢移动，面向玩家
                                            enemy.setVelocityX(direction * 30 * speedMult);
                                            enemy.setFlipX(direction < 0);
                                        } else if (aiData.aiState === 'approach') {
                                            // 接近：快速追向玩家
                                            const chaseSpeed = (enemy as any).chaseSpeed || 100;
                                            enemy.setVelocityX(direction * chaseSpeed * speedMult);
                                            enemy.setFlipX(direction < 0);
                                            // Y轴跟随
                                            const yDiff = this.player.y - enemy.y;
                                            if (Math.abs(yDiff) > 60) {
                                                enemy.setVelocityY(yDiff > 0 ? 60 * speedMult : -60 * speedMult);
                                            }
                                        } else if (aiData.aiState === 'attack') {
                                            // 攻击：保持一个稳定死区，避免贴脸时来回抖动
                                            const horizontalGap = this.player.x - enemy.x;
                                            const isWithinAttackDeadZone = Math.abs(horizontalGap) < 36;
                                            enemy.setVelocityX(isWithinAttackDeadZone ? 0 : direction * 45 * speedMult);
                                            enemy.setFlipX(direction < 0);
                                        } else if (aiData.aiState === 'retreat') {
                                            // 撤退：远离玩家
                                            enemy.setVelocityX(-direction * 120 * speedMult);
                                            // 随机Y轴移动，难以预判
                                            enemy.setVelocityY(Math.sin(now / 200) * 80);
                                        }

                                        // 🔥🔥🔥 检票长（近战型）- bossIndex 1
                                        if (bossIndex === 1 && aiData.aiState === 'attack') {
                                            // 闸门冲击（近距离快速冲撞）
                                            if (!aiData.lastGateSlamTime) aiData.lastGateSlamTime = 0;
                                            if (distanceToPlayer < 300 && now - aiData.lastGateSlamTime > 2500 * cooldownMult) {
                                                this.bossGateSlam(enemy);
                                                aiData.lastGateSlamTime = now;
                                            }
                                            // 票据风暴（扇形弹幕）
                                            if (!aiData.lastTicketStormTime) aiData.lastTicketStormTime = 0;
                                            if (now - aiData.lastTicketStormTime > 3000 * cooldownMult) {
                                                this.bossTicketStorm(enemy);
                                                aiData.lastTicketStormTime = now;
                                            }
                                            // 定身术（血量<50%，更频繁）
                                            if (hpPercent < 0.5) {
                                                if (!aiData.lastStunTime) aiData.lastStunTime = 0;
                                                if (now - aiData.lastStunTime > 6000 * cooldownMult) {
                                                    this.bossStunPlayer(enemy, 1800);
                                                    aiData.lastStunTime = now;
                                                }
                                            }
                                            // 连续冲击（血量<25%）
                                            if (hpPercent < 0.25) {
                                                if (!aiData.lastComboTime) aiData.lastComboTime = 0;
                                                if (now - aiData.lastComboTime > 4000 * cooldownMult) {
                                                    // 连续3次冲击
                                                    this.bossGateSlam(enemy);
                                                    this.time.delayedCall(400, () => this.bossGateSlam(enemy));
                                                    this.time.delayedCall(800, () => this.bossGateSlam(enemy));
                                                    aiData.lastComboTime = now;
                                                }
                                            }
                                        }

                                        // 🔥🔥🔥 站台长（召唤型）- bossIndex 2
                                        if (bossIndex === 2) {
                                            // 保持距离策略
                                            const keepDist = 300;
                                            if (distanceToPlayer < keepDist) {
                                                const retreatDir = this.player.x > enemy.x ? -1 : 1;
                                                enemy.setVelocityX(retreatDir * 100 * speedMult);
                                            }

                                            if (aiData.aiState === 'attack' || aiData.aiState === 'observe') {
                                                // 列车冲撞（召唤列车）
                                                if (!aiData.lastTrainChargeTime) aiData.lastTrainChargeTime = 0;
                                                if (now - aiData.lastTrainChargeTime > 5000 * cooldownMult) {
                                                    this.bossTrainCharge(enemy);
                                                    aiData.lastTrainChargeTime = now;
                                                }
                                                // 站台震荡（地面冲击波）
                                                if (!aiData.lastGroundPoundTime) aiData.lastGroundPoundTime = 0;
                                                if (distanceToPlayer < 400 && now - aiData.lastGroundPoundTime > 3000 * cooldownMult) {
                                                    this.bossGroundPound(enemy);
                                                    aiData.lastGroundPoundTime = now;
                                                }
                                                // 磁力推拉（血量<60%）
                                                if (hpPercent < 0.6) {
                                                    if (!aiData.lastMagneticTime) aiData.lastMagneticTime = 0;
                                                    if (now - aiData.lastMagneticTime > 4000 * cooldownMult) {
                                                        this.bossMagneticPull(enemy);
                                                        aiData.lastMagneticTime = now;
                                                    }
                                                }
                                                // 双列车（血量<30%）
                                                if (hpPercent < 0.3) {
                                                    if (!aiData.lastDoubleTrainTime) aiData.lastDoubleTrainTime = 0;
                                                    if (now - aiData.lastDoubleTrainTime > 6000 * cooldownMult) {
                                                        this.bossTrainCharge(enemy);
                                                        this.time.delayedCall(600, () => this.bossTrainCharge(enemy));
                                                        aiData.lastDoubleTrainTime = now;
                                                    }
                                                }
                                            }
                                        }

                                        // 🔥🔥🔥 列车长（控制型）- bossIndex 3
                                        if (bossIndex === 3) {
                                            if (aiData.aiState === 'attack' || aiData.aiState === 'observe') {
                                                // 时空裂隙（创建伤害区域）
                                                if (!aiData.lastTimeRiftTime) aiData.lastTimeRiftTime = 0;
                                                if (now - aiData.lastTimeRiftTime > 3500 * cooldownMult) {
                                                    this.bossTimeRift(enemy);
                                                    aiData.lastTimeRiftTime = now;
                                                }
                                                // 传送打击（瞬移到玩家身后攻击）
                                                if (!aiData.lastTeleportStrikeTime) aiData.lastTeleportStrikeTime = 0;
                                                if (now - aiData.lastTeleportStrikeTime > 5000 * cooldownMult) {
                                                    this.bossTeleportStrike(enemy);
                                                    aiData.lastTeleportStrikeTime = now;
                                                }
                                                // 时间冻结（血量<50%）
                                                if (hpPercent < 0.5) {
                                                    if (!aiData.lastTimeFreezeTime) aiData.lastTimeFreezeTime = 0;
                                                    if (now - aiData.lastTimeFreezeTime > 8000 * cooldownMult) {
                                                        this.bossTimeFreeze(enemy);
                                                        aiData.lastTimeFreezeTime = now;
                                                    }
                                                }
                                                // 列车幻影（血量<30%）
                                                if (hpPercent < 0.3) {
                                                    if (!aiData.lastPhantomTrainTime) aiData.lastPhantomTrainTime = 0;
                                                    if (now - aiData.lastPhantomTrainTime > 6000 * cooldownMult) {
                                                        this.bossPhantomTrain(enemy);
                                                        aiData.lastPhantomTrainTime = now;
                                                    }
                                                }
                                                // 终极时停（血量<15%）
                                                if (hpPercent < 0.15) {
                                                    if (!aiData.lastUltimateTime) aiData.lastUltimateTime = 0;
                                                    if (now - aiData.lastUltimateTime > 12000 * cooldownMult) {
                                                        this.bossTimeFreeze(enemy);
                                                        this.time.delayedCall(500, () => this.bossTeleportStrike(enemy));
                                                        this.time.delayedCall(1000, () => this.bossPhantomTrain(enemy));
                                                        aiData.lastUltimateTime = now;
                                                    }
                                                }
                                            }
                                        }

                                        // 🔥 协同攻击：夹击策略
                                        const aliveBosses = this.tripleBossState.bosses.filter(b => b.active && !(b as any).defeated);
                                        if (aliveBosses.length >= 2) {
                                            // 检测玩家是否被包围
                                            const playerX = this.player.x;
                                            const bossesLeft = aliveBosses.filter(b => b.x < playerX).length;
                                            const bossesRight = aliveBosses.filter(b => b.x > playerX).length;
                                            const isSurrounded = bossesLeft > 0 && bossesRight > 0;

                                            if (isSurrounded && !aiData.lastCoopAttackTime) aiData.lastCoopAttackTime = 0;
                                            if (isSurrounded && now - aiData.lastCoopAttackTime > 12000) {
                                                this.triggerCooperativeAttack();
                                                aiData.lastCoopAttackTime = now;
                                            }

                                            // 保护受伤同伴
                                            const woundedAlly = aliveBosses.find(b => b !== enemy && (b as any).bossHP / (b as any).bossMaxHP < 0.25);
                                            if (woundedAlly && !aiData.isProtecting) {
                                                aiData.isProtecting = true;
                                                // 移动到受伤同伴附近
                                                aiData.targetX = woundedAlly.x;
                                                aiData.targetY = woundedAlly.y;
                                                debugLog(`[Boss] ${(enemy as any).bossName}保护受伤的${(woundedAlly as any).bossName}！`);
                                            }
                                        }
                                    } // 结束bossActivated的else块
                                }

                                // 🔥🔥🔥 激光守卫特殊技能（第二个Boss）
                                if ((enemy as any).isLaserGuard && this.currentBossIndex === 2) {
                                    const now = Date.now();

                                    // 持续激光攻击（6秒冷却）
                                    if (!this.laserGuardState.laserActive &&
                                        now - this.laserGuardState.lastLaserTime > this.laserGuardState.laserCooldown) {
                                        this.laserGuardContinuousLaser(enemy);
                                        this.laserGuardState.lastLaserTime = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // 定身技能（10秒冷却，血量<70%时使用）
                                    if (bossHPPercent < 0.7 &&
                                        now - this.laserGuardState.lastStunTime > this.laserGuardState.stunCooldown) {
                                        this.laserGuardStunPlayer(enemy);
                                        this.laserGuardState.lastStunTime = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // 智能AI：血量低时更积极撤退
                                    if (bossHPPercent < 0.25 && !aiData.isRetreating && Math.random() < 0.2) {
                                        aiData.isRetreating = true;
                                        aiData.retreatEndTime = now + 3000;
                                        debugLog('[激光守卫] 血量过低，紧急撤退！');
                                    }
                                }

                                // 🔥🔥🔥 创意工坊 Boss 技能系统 🔥🔥🔥
                                const isCustomLevel = (this.levelData as any).isCustomLevel || (this.levelData as any).isTestMode;
                                const bossSkills = (enemy as any).enemyConfig?.skills;

                                if (isCustomLevel && bossSkills) {
                                    const now = Date.now();

                                    // 初始化技能冷却时间
                                    if (!aiData.skillCooldowns) {
                                        aiData.skillCooldowns = {
                                            shoot: 0,
                                            tripleShot: 0,
                                            laser: 0,
                                            charge: 0,
                                            teleport: 0,
                                            shockwave: 0,
                                            summonMinions: 0,
                                            shield: 0,
                                        };
                                    }

                                    // 🎯 远程射击（2秒冷却）
                                    if (bossSkills.shoot && now - aiData.skillCooldowns.shoot > 2000) {
                                        this.enemyShoot(enemy);
                                        aiData.skillCooldowns.shoot = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // 🎯 三连发（4秒冷却）
                                    if (bossSkills.tripleShot && now - aiData.skillCooldowns.tripleShot > 4000) {
                                        this.enemyShoot(enemy, -15);
                                        this.enemyShoot(enemy, 0);
                                        this.enemyShoot(enemy, 15);
                                        aiData.skillCooldowns.tripleShot = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // ⚡ 激光扫射（8秒冷却，血量<60%时使用）
                                    if (bossSkills.laser && bossHPPercent < 0.6 && now - aiData.skillCooldowns.laser > 8000) {
                                        this.bossLaserSweep(enemy);
                                        aiData.skillCooldowns.laser = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // 🏃 冲刺攻击（6秒冷却）
                                    if (bossSkills.charge && now - aiData.skillCooldowns.charge > 6000) {
                                        this.bossWarCharge(enemy);
                                        aiData.skillCooldowns.charge = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // 🌀 瞬移（10秒冷却，血量<50%时使用）
                                    if (bossSkills.teleport && bossHPPercent < 0.5 && now - aiData.skillCooldowns.teleport > 10000) {
                                        this.bossTeleportBehindPlayer(enemy);
                                        aiData.skillCooldowns.teleport = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // 💥 冲击波（7秒冷却，血量<40%时使用）
                                    if (bossSkills.shockwave && bossHPPercent < 0.4 && now - aiData.skillCooldowns.shockwave > 7000) {
                                        this.bossShockwave(enemy);
                                        aiData.skillCooldowns.shockwave = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // 👾 召唤小怪（12秒冷却，血量<50%时使用）
                                    if (bossSkills.summonMinions && bossHPPercent < 0.5 && now - aiData.skillCooldowns.summonMinions > 12000) {
                                        this.bossSpawnMinions(enemy);
                                        aiData.skillCooldowns.summonMinions = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // 🛡️ 护盾（15秒冷却，血量<30%时使用）
                                    if (bossSkills.shield && bossHPPercent < 0.3 && now - aiData.skillCooldowns.shield > 15000) {
                                        this.bossShield(enemy);
                                        aiData.skillCooldowns.shield = now;
                                        aiData.lastAttackTime = now;
                                    }

                                    // 🔥 狂暴（血量<30%时自动触发，增强攻击）
                                    if (bossSkills.enrage && bossHPPercent < 0.3 && !aiData.isEnraged) {
                                        aiData.isEnraged = true;
                                        enemy.setTint(0xff0000);
                                        // 狂暴视觉效果
                                        const enrageEffect = this.add.circle(enemy.x, enemy.y, 60, 0xff0000, 0.5);
                                        this.tweens.add({
                                            targets: enrageEffect,
                                            scale: 2,
                                            alpha: 0,
                                            duration: 1000,
                                            onComplete: () => enrageEffect.destroy()
                                        });
                                        debugLog('[创意工坊Boss] 进入狂暴状态！');
                                    }
                                }

                                // 战役3 Boss：召唤小怪（血量<50%时）
                                const shouldSummon = campaignId === 'campaign_3' && bossHPPercent < 0.5 && aiData.attackCount % 6 === 0;
                                if (shouldSummon) {
                                    this.bossSpawnMinions(enemy);
                                    aiData.lastAttackTime = Date.now();
                                } else {

                                    const attackType = aiData.attackCount % 4;  // 4种攻击模式循环

                                    if (distanceToPlayer < 100) {
                                        // 近距离攻击
                                        if (attackType === 0) {
                                            // 冲撞攻击
                                            enemy.setVelocityX(direction * 250 * phaseSpeedMultiplier);
                                        } else if (attackType === 1) {
                                            // 跳跃冲撞
                                            enemy.setVelocityX(direction * 200 * phaseSpeedMultiplier);
                                            enemy.setVelocityY(-150);
                                        }
                                    } else {
                                        // 远距离攻击
                                        if (attackType === 0 || attackType === 2) {
                                            // 单发射击
                                            this.enemyShoot(enemy);
                                        } else if (attackType === 1) {
                                            // 扇形射击（3发）
                                            this.enemyShoot(enemy, -15);  // 向上偏移
                                            this.enemyShoot(enemy, 0);    // 正前方
                                            this.enemyShoot(enemy, 15);   // 向下偏移
                                        } else if (attackType === 3) {
                                            // 连续射击
                                            this.enemyShoot(enemy);
                                            setTimeout(() => this.enemyShoot(enemy), 150);
                                            setTimeout(() => this.enemyShoot(enemy), 300);
                                            if (bossPhase === 3) {
                                                setTimeout(() => this.enemyShoot(enemy), 450);
                                                setTimeout(() => this.enemyShoot(enemy), 600);
                                            }
                                        }
                                    }
                                    aiData.lastAttackTime = Date.now();
                                }  // 关闭shouldSummon的else
                            }
                        } // 🔥 关闭战役9双Boss专用AI的else分支
                    } else {
                        // 玩家不在范围内，Boss主动巡逻
                        // 确保Boss有初始方向
                        if (!aiData.direction || aiData.direction === 0) {
                            aiData.direction = 1;
                        }

                        // 检查是否到达巡逻边界
                        const initialX = (enemy as any).initialX || enemy.x;
                        const patrolRangeX = (enemy as any).patrolRangeX || 300;

                        if (Math.abs(enemy.x - initialX) > patrolRangeX) {
                            aiData.direction *= -1;
                        }

                        const patrolSpeed = 80 * phaseSpeedMultiplier;  // 🔥 提高巡逻速度
                        enemy.setVelocityX(aiData.direction * patrolSpeed);
                        enemy.setFlipX(aiData.direction < 0);

                        // 巡逻时保持在初始高度
                        const initialY = (enemy as any).initialY || enemy.y;
                        const yDiff = initialY - enemy.y;
                        if (Math.abs(yDiff) > 10) {
                            enemy.setVelocityY(yDiff > 0 ? 40 : -40);  // 🔥 提高Y轴速度
                        } else {
                            enemy.setVelocityY(0);
                        }
                    }

                    // 阶段变化时的视觉效果
                    if (bossPhase !== this.bossPhase) {
                        this.bossPhase = bossPhase;
                        // 添加视觉效果
                        const flash = this.add.circle(enemy.x, enemy.y, 80, 0xff0000, 0.6);
                        this.tweens.add({
                            targets: flash,
                            alpha: 0,
                            scaleX: 2.5,
                            scaleY: 2.5,
                            duration: 600,
                            onComplete: () => flash.destroy()
                        });
                    }

                    // 🔥🔥🔥 限制Boss活动范围（防止飞出窗口）- 使用速度控制避免抖动
                    // Y轴限制 - 通过速度反弹而不是直接设置位置
                    const minY = (enemy as any).initialY - 200;
                    const maxY = (enemy as any).initialY + (enemy as any).maxFallDistance;
                    if (enemy.y < minY) {
                        enemy.body.y = minY;  // 使用body.y而不是enemy.y
                        if (enemy.body.velocity.y < 0) {
                            enemy.setVelocityY(Math.abs(enemy.body.velocity.y) * 0.5);  // 柔和反弹
                        }
                    }
                    if (enemy.y > maxY) {
                        enemy.body.y = maxY;
                        if (enemy.body.velocity.y > 0) {
                            enemy.setVelocityY(-Math.abs(enemy.body.velocity.y) * 0.5);
                        }
                    }

                    // 🔥🔥🔥 X轴限制：使用实际地图边界，防止Boss飞出地图
                    const campaignMapData = (this.levelData as any).campaignMapData;
                    const mapWidth = campaignMapData?.width || this.levelData?.map?.width || 2400;
                    const bossMarginX = 50; // 🔥 减小边距，让Boss更靠近边界

                    // 🔥 强制限制Boss位置在地图范围内
                    if (enemy.x < bossMarginX) {
                        enemy.x = bossMarginX;
                        enemy.setVelocityX(Math.abs(enemy.body.velocity.x) * 0.5); // 反弹回来
                    }
                    if (enemy.x > mapWidth - bossMarginX) {
                        enemy.x = mapWidth - bossMarginX;
                        enemy.setVelocityX(-Math.abs(enemy.body.velocity.x) * 0.5); // 反弹回来
                    }

                    // 🔥 Y轴也要限制，防止Boss飞到屏幕外
                    const mapHeight = campaignMapData?.height || 600;
                    if (enemy.y < 50) {
                        enemy.y = 50;
                        enemy.setVelocityY(Math.abs(enemy.body.velocity.y) * 0.5);
                    }
                    if (enemy.y > mapHeight - 50) {
                        enemy.y = mapHeight - 50;
                        enemy.setVelocityY(-Math.abs(enemy.body.velocity.y) * 0.5);
                    }
                    break;
            }
        });
    }

    // Boss瞬移到玩家身后技能
    private bossTeleportBehindPlayer(boss: any) {
        debugLog('[Boss] 瞬移到玩家身后！');

        // 播放瞬移音效
        this.playSound('boss_teleport');

        // Boss台词
        this.showBossDialogue('古街守护者', '神出鬼没！', 1500);

        // 消失特效
        const disappearEffect = this.add.circle(boss.x, boss.y, 50, 0xffd700, 0.7);
        this.tweens.add({
            targets: disappearEffect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => disappearEffect.destroy()
        });

        // Boss暂时隐藏
        boss.setAlpha(0);

        // 计算玩家身后位置
        const playerDirection = this.player.flipX ? 1 : -1;  // 玩家面向方向
        const behindDistance = 100;  // 在玩家身后100px
        const newX = this.player.x + (playerDirection * behindDistance);
        const newY = this.player.y;

        // 延迟300ms后瞬移
        this.time.delayedCall(300, () => {
            boss.setPosition(newX, newY);
            boss.setVelocity(0, 0);

            // 出现特效
            const appearEffect = this.add.circle(newX, newY, 50, 0xffd700, 0.7);
            this.tweens.add({
                targets: appearEffect,
                scaleX: 0,
                scaleY: 0,
                alpha: 0,
                duration: 300,
                onComplete: () => appearEffect.destroy()
            });

            // Boss重新显示
            boss.setAlpha(1);

            // 金色闪光
            boss.setTint(0xffd700);
            this.time.delayedCall(200, () => {
                if (boss.active) {
                    if (this.bossPhase === 3) {
                        boss.setTint(0xff0000);
                    } else {
                        boss.clearTint();
                    }
                }
            });
        });
    }

    // 🔥🔥🔥 战役10 Boss技能函数 🔥🔥🔥

    // 检票长：闸门冲击 - 快速冲向玩家
    private bossGateSlam(boss: any) {
        debugLog('[Boss] 检票长使用闸门冲击！');
        this.playSound('boss_charge');
        this.showBossDialogue('检票长', '闸门冲击！🚪', 1000);

        const direction = this.player.x > boss.x ? 1 : -1;
        boss.setVelocityX(direction * 350);
        boss.setTint(0xff4444);

        this.time.delayedCall(500, () => {
            if (boss.active) boss.clearTint();
        });
    }

    // 检票长：票据风暴 - 扇形弹幕
    private bossTicketStorm(boss: any) {
        debugLog('[Boss] 检票长使用票据风暴！');
        this.playSound('boss_attack');

        for (let i = -2; i <= 2; i++) {
            this.enemyShoot(boss, i * 15);
        }
    }

    // 站台长：列车冲撞 - 召唤列车从一侧冲过
    private bossTrainCharge(boss: any) {
        debugLog('[Boss] 站台长召唤列车冲撞！');
        this.playSound('boss_summon');
        this.showBossDialogue('站台长', '列车来了！🚂', 1500);

        // 警告线
        const warningY = this.player.y;
        const warning = this.add.rectangle(1200, warningY, 2400, 60, 0xff0000, 0.3);
        this.tweens.add({
            targets: warning,
            alpha: 0.6,
            yoyo: true,
            repeat: 3,
            duration: 200,
            onComplete: () => warning.destroy()
        });

        // 延迟后列车冲过
        this.time.delayedCall(800, () => {
            const train = this.add.rectangle(-100, warningY, 300, 50, 0xffd700);
            train.setStrokeStyle(3, 0x8b4513);

            this.tweens.add({
                targets: train,
                x: 2500,
                duration: 1200,
                ease: 'Linear',
                onUpdate: () => {
                    // 检测碰撞
                    if (Math.abs(this.player.y - warningY) < 40 &&
                        this.player.x > train.x - 150 && this.player.x < train.x + 150) {
                        this.takeDamage(35);
                    }
                },
                onComplete: () => train.destroy()
            });
        });
    }

    // 站台长：站台震荡 - 地面冲击波
    private bossGroundPound(boss: any) {
        debugLog('[Boss] 站台长使用站台震荡！');
        this.playSound('boss_wave');

        // 震荡波
        const wave = this.add.circle(boss.x, boss.y + 40, 30, 0xffd700, 0.7);
        this.tweens.add({
            targets: wave,
            scaleX: 8,
            scaleY: 2,
            alpha: 0,
            duration: 600,
            onUpdate: () => {
                const dist = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
                if (dist < wave.scaleX * 30 && dist > (wave.scaleX - 1) * 30) {
                    this.takeDamage(22);
                }
            },
            onComplete: () => wave.destroy()
        });
    }

    // 站台长：磁力推拉 - 把玩家拉向或推离
    private bossMagneticPull(boss: any) {
        debugLog('[Boss] 站台长使用磁力推拉！');
        this.playSound('boss_special');
        this.showBossDialogue('站台长', '磁力控制！🧲', 1200);

        const pullOrPush = Math.random() > 0.5 ? 1 : -1;  // 随机拉或推
        const direction = this.player.x > boss.x ? pullOrPush : -pullOrPush;

        // 磁力效果
        const magnetEffect = this.add.circle(boss.x, boss.y, 50, 0x00ffff, 0.5);
        this.tweens.add({
            targets: magnetEffect,
            scaleX: 6,
            scaleY: 6,
            alpha: 0,
            duration: 800,
            onComplete: () => magnetEffect.destroy()
        });

        // 推拉玩家
        this.player.setVelocityX(direction * 400);
        this.takeDamage(15);
    }

    // 列车长：时空裂隙 - 创建持续伤害区域
    private bossTimeRift(boss: any) {
        debugLog('[Boss] 列车长使用时空裂隙！');
        this.playSound('boss_wave');

        const riftX = this.player.x;
        const riftY = this.player.y;

        // 裂隙效果
        const rift = this.add.circle(riftX, riftY, 60, 0x9932cc, 0.6);
        rift.setStrokeStyle(3, 0xff00ff);

        const duration = 3000;
        const startTime = Date.now();

        const riftUpdate = () => {
            if (Date.now() - startTime > duration || !rift.active) {
                rift.destroy();
                return;
            }
            const dist = Phaser.Math.Distance.Between(riftX, riftY, this.player.x, this.player.y);
            if (dist < 60) {
                this.takeDamage(8);
            }
            this.time.delayedCall(300, riftUpdate);
        };
        riftUpdate();

        // 脉冲动画
        this.tweens.add({
            targets: rift,
            scaleX: 1.3,
            scaleY: 1.3,
            yoyo: true,
            repeat: -1,
            duration: 400
        });

        this.time.delayedCall(duration, () => rift.destroy());
    }

    // 列车长：传送打击 - 瞬移到玩家身后攻击
    private bossTeleportStrike(boss: any) {
        debugLog('[Boss] 列车长使用传送打击！');
        this.playSound('boss_teleport');
        this.showBossDialogue('列车长', '时空穿梭！⏰', 1000);

        // 消失特效
        const disappear = this.add.circle(boss.x, boss.y, 40, 0x9932cc, 0.8);
        this.tweens.add({
            targets: disappear,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => disappear.destroy()
        });

        boss.setAlpha(0);

        // 传送到玩家身后
        this.time.delayedCall(400, () => {
            const behindX = this.player.x + (this.player.flipX ? 100 : -100);
            boss.setPosition(behindX, this.player.y);
            boss.setAlpha(1);

            // 出现特效
            const appear = this.add.circle(boss.x, boss.y, 40, 0x9932cc, 0.8);
            this.tweens.add({
                targets: appear,
                scaleX: 0,
                scaleY: 0,
                duration: 300,
                onComplete: () => appear.destroy()
            });

            // 立即攻击
            this.enemyShoot(boss);
            this.takeDamage(40);
        });
    }

    // 列车长：列车幻影 - 召唤多个幻影列车
    private bossPhantomTrain(boss: any) {
        debugLog('[Boss] 列车长使用列车幻影！');
        this.playSound('boss_summon');
        this.showBossDialogue('列车长', '幻影列车！👻🚂', 1500);

        // 召唤3个幻影列车从不同方向
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 500, () => {
                const startX = Math.random() > 0.5 ? -100 : 2500;
                const targetY = 300 + i * 200;

                const phantom = this.add.rectangle(startX, targetY, 200, 40, 0x9932cc, 0.6);
                phantom.setStrokeStyle(2, 0xff00ff);

                this.tweens.add({
                    targets: phantom,
                    x: startX < 0 ? 2500 : -100,
                    duration: 1500,
                    ease: 'Linear',
                    onUpdate: () => {
                        if (Math.abs(this.player.y - targetY) < 30 &&
                            this.player.x > phantom.x - 100 && this.player.x < phantom.x + 100) {
                            this.takeDamage(25);
                        }
                    },
                    onComplete: () => phantom.destroy()
                });
            });
        }
    }

    // 定身玩家
    private bossStunPlayer(boss: any, duration: number) {
        debugLog('[Boss] 使用定身术！');
        this.playSound('boss_stun');
        this.showBossDialogue((boss as any).bossName || 'Boss', '定住！🔒', 1000);

        // 定身效果
        const stunEffect = this.add.circle(this.player.x, this.player.y, 40, 0xffff00, 0.5);
        this.player.setVelocity(0, 0);
        (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        this.time.delayedCall(duration, () => {
            stunEffect.destroy();
            (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        });
    }

    // 协同攻击
    private triggerCooperativeAttack() {
        if (!this.tripleBossState) return;

        debugLog('[Boss] 🔥 触发协同攻击！');
        this.playSound('boss_special');

        // 所有存活Boss同时攻击
        this.tripleBossState.bosses.forEach(boss => {
            if (boss.active && !(boss as any).defeated) {
                // 每个Boss发射弹幕
                for (let i = -1; i <= 1; i++) {
                    this.enemyShoot(boss, i * 20);
                }
            }
        });

        // 屏幕震动
        this.cameras.main.shake(300, 0.01);

        // 警告文字
        const warning = this.add.text(1200, 400, '⚠️ 协同攻击！', {
            fontSize: '32px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: warning,
            alpha: 0,
            y: 350,
            duration: 1500,
            onComplete: () => warning.destroy()
        });
    }

    // 🔥🔥🔥 战役9 Boss技能：酸液池 - 在玩家位置创建持续伤害区域
    private bossAcidPool(boss: any) {
        const bossName = (boss as any).bossName || 'Boss';
        debugLog(`[Boss] ${bossName}释放酸液池！`);
        this.playSound('boss_wave');

        // Boss台词
        this.showBossDialogue(bossName, '站稳脚下。', 1500);

        // 在玩家当前位置创建酸液池
        const poolX = this.player.x;
        const poolY = this.player.y + 30;
        const poolWidth = 150;
        const poolHeight = 40;

        // 警告特效
        const warning = this.add.rectangle(poolX, poolY, poolWidth, poolHeight, 0xff0000, 0.3);
        this.tweens.add({
            targets: warning,
            alpha: 0.6,
            yoyo: true,
            repeat: 2,
            duration: 200,
            onComplete: () => warning.destroy()
        });

        // 延迟后创建酸液池
        this.time.delayedCall(600, () => {
            // 🎊 新年主题：辣椒酱池
            const acidPool = this.add.rectangle(poolX, poolY, poolWidth, poolHeight, 0xDC143C, 0.7);
            acidPool.setStrokeStyle(2, 0x8B0000);

            // 酸液池持续5秒
            const duration = 5000;
            const startTime = Date.now();
            const damageInterval = 500;
            let lastDamageTime = 0;

            const acidUpdate = () => {
                if (Date.now() - startTime > duration) {
                    acidPool.destroy();
                    return;
                }

                // 检测玩家是否在酸液池中
                if (this.player.active) {
                    const playerBounds = this.player.getBounds();
                    const poolBounds = acidPool.getBounds();
                    if (Phaser.Geom.Rectangle.Overlaps(playerBounds, poolBounds)) {
                        if (Date.now() - lastDamageTime > damageInterval) {
                            this.takeDamage(18);
                            lastDamageTime = Date.now();
                            debugLog('[Boss] 玩家踩到酸液池！受到18点伤害');
                        }
                    }
                }

                this.time.delayedCall(100, acidUpdate);
            };
            acidUpdate();

            // 冒泡特效
            this.time.addEvent({
                delay: 300,
                repeat: Math.floor(duration / 300),
                callback: () => {
                    if (!acidPool.active) return;
                    const bubble = this.add.circle(
                        poolX + Phaser.Math.Between(-60, 60),
                        poolY,
                        Phaser.Math.Between(3, 8),
                        0xDC143C, 0.8  // 🎊 红色
                    );
                    this.tweens.add({
                        targets: bubble,
                        y: bubble.y - 30,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => bubble.destroy()
                    });
                }
            });
        });
    }

    // 🔥🔥🔥 战役9 Boss技能：毒气云 - 追踪玩家的毒气
    private bossPoisonCloud(boss: any) {
        const bossName = (boss as any).bossName || 'Boss';
        debugLog(`[Boss] ${bossName}释放毒气云！`);
        this.playSound('boss_wave');

        this.showBossDialogue(bossName, '躲开追踪云。', 1500);

        // 创建追踪毒气云
        const cloud = this.add.circle(boss.x, boss.y - 50, 60, 0x9932cc, 0.6);
        cloud.setStrokeStyle(3, 0x660099);

        const cloudText = this.add.text(cloud.x, cloud.y, '☠️', {
            fontSize: '24px'
        }).setOrigin(0.5);

        const duration = 6000;
        const startTime = Date.now();
        const speed = 80;
        let lastDamageTime = 0;

        const cloudUpdate = () => {
            if (Date.now() - startTime > duration || !this.player.active) {
                cloud.destroy();
                cloudText.destroy();
                return;
            }

            // 追踪玩家
            const dx = this.player.x - cloud.x;
            const dy = this.player.y - cloud.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 10) {
                cloud.x += (dx / dist) * speed * 0.016;
                cloud.y += (dy / dist) * speed * 0.016;
                cloudText.x = cloud.x;
                cloudText.y = cloud.y;
            }

            // 检测碰撞
            if (dist < 70) {
                if (Date.now() - lastDamageTime > 800) {
                    this.takeDamage(10);
                    lastDamageTime = Date.now();
                    debugLog('[Boss] 玩家被毒气云击中！受到10点伤害');
                }
            }

            this.time.delayedCall(16, cloudUpdate);
        };
        cloudUpdate();
    }

    // 🔥🔥🔥 通用Boss技能：红色散弹攻击 - 向玩家方向发射扇形红色弹丸
    private bossRedSpreadShot(boss: any, bulletCount: number = 5, damage: number = 15, bossName: string = 'Boss') {
        // 🔥 安全检查：确保boss和player都存在且有效
        if (!boss || !boss.active || !this.player || !this.player.active) {
            debugLog('[Boss] 红色散弹取消：boss或player无效');
            return;
        }

        debugLog(`[Boss] ${bossName}发射红色散弹！`);
        this.playSound('boss_laser'); // 使用激光音效

        const direction = this.player.x > boss.x ? 1 : -1;
        // 根据弹丸数量计算角度分布
        const angleStep = 60 / (bulletCount - 1); // 总共60度范围
        const startAngle = -30; // 从-30度开始

        for (let i = 0; i < bulletCount; i++) {
            this.time.delayedCall(i * 80, () => {
                if (!boss.active) return;

                const angleOffset = startAngle + i * angleStep;
                const baseAngle = direction > 0 ? 0 : 180;
                const angle = Phaser.Math.DegToRad(baseAngle + angleOffset);
                const speed = 280;

                // 🎊 红色弹丸
                const projectile = this.add.circle(boss.x, boss.y, 8, 0xDC143C, 0.9);
                projectile.setStrokeStyle(2, 0x8B0000);
                projectile.setDepth(80);

                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;

                const startTime = Date.now();
                const projectileUpdate = () => {
                    if (!projectile.active || Date.now() - startTime > 2500) {
                        if (projectile.active) projectile.destroy();
                        return;
                    }

                    projectile.x += vx * 0.016;
                    projectile.y += vy * 0.016;

                    // 检测碰撞
                    if (this.player && this.player.active) {
                        const dist = Phaser.Math.Distance.Between(projectile.x, projectile.y, this.player.x, this.player.y);
                        if (dist < 30) {
                            this.takeDamage(damage);
                            projectile.destroy();
                            debugLog(`[Boss] 玩家被${bossName}红色散弹击中！受到${damage}点伤害`);
                            return;
                        }
                    }

                    this.time.delayedCall(16, projectileUpdate);
                };
                projectileUpdate();
            });
        }
    }

    // 🔥🔥🔥 战役9 Boss技能：酸液喷射 - 扇形酸液攻击
    private bossAcidSpray(boss: any) {
        const bossName = (boss as any).bossName || 'Boss';
        debugLog(`[Boss] ${bossName}酸液喷射！`);
        this.playSound('boss_laser');

        this.showBossDialogue(bossName, '别站直线。', 1200);

        const direction = this.player.x > boss.x ? 1 : -1;
        const angles = [-30, -15, 0, 15, 30];

        angles.forEach((angleOffset, index) => {
            this.time.delayedCall(index * 100, () => {
                if (!boss.active) return;

                const baseAngle = direction > 0 ? 0 : 180;
                const angle = Phaser.Math.DegToRad(baseAngle + angleOffset);
                const speed = 300;

                // 🎊 新年主题：红色弹丸
                const projectile = this.add.circle(boss.x, boss.y, 8, 0xDC143C, 0.9);
                projectile.setStrokeStyle(2, 0x8B0000);

                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;

                const startTime = Date.now();
                const projectileUpdate = () => {
                    if (Date.now() - startTime > 2000) {
                        projectile.destroy();
                        return;
                    }

                    projectile.x += vx * 0.016;
                    projectile.y += vy * 0.016;

                    // 检测碰撞
                    if (this.player.active) {
                        const dist = Phaser.Math.Distance.Between(projectile.x, projectile.y, this.player.x, this.player.y);
                        if (dist < 30) {
                            this.takeDamage(28);
                            projectile.destroy();
                            debugLog('[Boss] 玩家被酸液喷射击中！受到28点伤害');
                            return;
                        }
                    }

                    this.time.delayedCall(16, projectileUpdate);
                };
                projectileUpdate();
            });
        });
    }

    // 🔥🔥🔥 战役9 Boss技能：气体爆发 - 大范围毒气爆发
    private bossGasBurst(boss: any) {
        const bossName = (boss as any).bossName || 'Boss';
        debugLog(`[Boss] ${bossName}气体爆发！`);
        this.playSound('boss_wave');

        this.showBossDialogue(bossName, '全场压制。', 1500);

        // 蓄力警告
        const warning = this.add.circle(boss.x, boss.y, 30, 0x9932cc, 0.5);
        this.tweens.add({
            targets: warning,
            scaleX: 8,
            scaleY: 8,
            alpha: 0.2,
            duration: 1500,
            onComplete: () => warning.destroy()
        });

        const warningText = this.add.text(boss.x, boss.y - 100, '⚠️ 毒气爆发蓄力中！', {
            fontSize: '20px',
            color: '#9932cc',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: warningText,
            alpha: 0,
            duration: 1500,
            onComplete: () => warningText.destroy()
        });

        // 延迟后爆发
        this.time.delayedCall(1500, () => {
            if (!boss.active) return;

            // 创建大范围毒气
            const burst = this.add.circle(boss.x, boss.y, 200, 0x9932cc, 0.4);

            // 检测玩家是否在范围内
            const dist = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
            if (dist < 200) {
                this.takeDamage(22);
                debugLog('[Boss] 玩家被气体爆发击中！受到22点伤害');
            }

            this.tweens.add({
                targets: burst,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: 1000,
                onComplete: () => burst.destroy()
            });
        });
    }

    // 🔥🔥🔥 战役9 Boss技能：化学反应 - 终极技能
    private bossChemicalReaction(boss: any) {
        debugLog('[Boss] 化学反应终极技能！');
        this.playSound('boss_laser');

        this.showBossDialogue('双Boss', '化学反应！酸碱中和大爆炸！💥', 2000);

        // 全屏警告
        const { width, height } = this.cameras.main;
        const fullWarning = this.add.rectangle(width / 2, height / 2, width, height, 0xff00ff, 0.3)
            .setScrollFactor(0).setDepth(1500);

        const warningText = this.add.text(width / 2, height / 2, '⚠️ 化学反应！找掩护！⚠️', {
            fontSize: '32px',
            color: '#ff00ff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1501);

        this.tweens.add({
            targets: [fullWarning, warningText],
            alpha: 0,
            duration: 2000,
            onComplete: () => {
                fullWarning.destroy();
                warningText.destroy();
            }
        });

        // 延迟后爆炸
        this.time.delayedCall(2000, () => {
            if (!boss.active) return;

            // 多点爆炸
            const explosionPoints = [
                { x: boss.x - 200, y: boss.y },
                { x: boss.x + 200, y: boss.y },
                { x: boss.x, y: boss.y - 150 },
                { x: boss.x, y: boss.y + 150 },
                { x: boss.x, y: boss.y }
            ];

            explosionPoints.forEach((point, index) => {
                this.time.delayedCall(index * 200, () => {
                    const explosion = this.add.circle(point.x, point.y, 100, 0xff00ff, 0.6);

                    // 检测伤害
                    const dist = Phaser.Math.Distance.Between(point.x, point.y, this.player.x, this.player.y);
                    if (dist < 120) {
                        this.takeDamage(45);
                        debugLog('[Boss] 玩家被化学反应击中！受到45点伤害');
                    }

                    this.tweens.add({
                        targets: explosion,
                        scaleX: 2,
                        scaleY: 2,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => explosion.destroy()
                    });
                });
            });
        });
    }

    // Boss激光扫射技能 - 🔥 360度旋转激光
    private bossLaserSweep(boss: any) {
        debugLog('[Boss] 360度激光扫射！');

        // 播放激光音效
        this.playSound('boss_laser');

        // Boss台词
        this.showBossDialogue('美食大厨', '360度激光扫射！躲好了！', 1500);

        // 蓄力特效 - 红色警告圈
        const chargeEffect = this.add.circle(boss.x, boss.y, 50, 0xff0000, 0.6);
        const warningText = this.add.text(boss.x, boss.y - 80, '⚠️ 激光蓄力中！', {
            fontSize: '18px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: chargeEffect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 800,
            onComplete: () => chargeEffect.destroy()
        });

        this.tweens.add({
            targets: warningText,
            alpha: 0,
            y: warningText.y - 30,
            duration: 800,
            onComplete: () => warningText.destroy()
        });

        // 延迟800ms后发射激光
        this.time.delayedCall(800, () => {
            if (!boss.active) return;

            // 🔥 360度旋转激光（持续4秒，转2圈）
            const laserDuration = 4000;
            const rotationSpeed = Math.PI * 1;  // 每秒转180度，4秒转2圈
            const laserLength = 450;

            // 创建激光线
            const laser = this.add.graphics();
            let currentAngle = 0;
            let lastDamageTime = 0;

            const startTime = Date.now();
            const laserUpdate = () => {
                if (!boss.active || !this.player.active) {
                    laser.destroy();
                    return;
                }

                const elapsed = Date.now() - startTime;
                if (elapsed > laserDuration) {
                    laser.destroy();
                    debugLog('[Boss] 360度激光扫射结束');
                    return;
                }

                // 🔥 360度旋转
                currentAngle += rotationSpeed * 0.016;  // 每帧约16ms

                // 计算激光终点
                const endX = boss.x + Math.cos(currentAngle) * laserLength;
                const endY = boss.y + Math.sin(currentAngle) * laserLength;

                // 绘制激光
                laser.clear();
                // 外层光晕
                laser.lineStyle(14, 0xff0000, 0.3);
                laser.lineBetween(boss.x, boss.y, endX, endY);
                // 主激光
                laser.lineStyle(8, 0xff0000, 0.8);
                laser.lineBetween(boss.x, boss.y, endX, endY);
                // 激光核心
                laser.lineStyle(3, 0xffff00, 1);
                laser.lineBetween(boss.x, boss.y, endX, endY);

                // 检测激光是否击中玩家（每250ms检测一次伤害）
                const now = Date.now();
                if (now - lastDamageTime > 250) {
                    const distToBoss = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);

                    if (distToBoss < laserLength) {
                        // 计算玩家到激光线的距离
                        const playerToBossX = this.player.x - boss.x;
                        const playerToBossY = this.player.y - boss.y;
                        const laserDirX = Math.cos(currentAngle);
                        const laserDirY = Math.sin(currentAngle);

                        // 点到直线的距离
                        const crossProduct = Math.abs(playerToBossX * laserDirY - playerToBossY * laserDirX);
                        const dotProduct = playerToBossX * laserDirX + playerToBossY * laserDirY;

                        // 玩家在激光前方且距离激光线<35像素
                        if (crossProduct < 35 && dotProduct > 0) {
                            this.takeDamage(8);  // 每次造成8点伤害
                            lastDamageTime = now;

                            // 击中特效
                            const hitEffect = this.add.circle(this.player.x, this.player.y, 20, 0xff0000, 0.7);
                            this.tweens.add({
                                targets: hitEffect,
                                alpha: 0,
                                scaleX: 2,
                                scaleY: 2,
                                duration: 200,
                                onComplete: () => hitEffect.destroy()
                            });
                        }
                    }
                }

                this.time.delayedCall(16, laserUpdate);  // 60fps更新
            };

            laserUpdate();
        });
    }

    // Boss电磁定身技能
    private bossEMPStun(boss: any) {
        debugLog('[Boss] 电磁定身！');

        // 播放EMP音效
        this.playSound('boss_emp');

        // Boss台词
        this.showBossDialogue('科技机器人', '电磁脉冲！', 1200);

        // 🎊 新年主题：金光波纹特效
        const empWave = this.add.circle(boss.x, boss.y, 50, 0xFFD700, 0.7);
        this.tweens.add({
            targets: empWave,
            scaleX: 4,
            scaleY: 4,
            alpha: 0,
            duration: 800,
            onComplete: () => empWave.destroy()
        });

        // 检测是否击中玩家
        const distToPlayer = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
        if (distToPlayer < 300) {
            debugLog('[Boss] 玩家被定身！');

            // 玩家定身效果
            if (this.player.body) {
                this.player.setVelocity(0, 0);
            }

            // 🎊 新年主题：金色光环环绕玩家
            const stunEffect = this.add.circle(this.player.x, this.player.y, 40, 0xFFD700, 0.5);
            this.tweens.add({
                targets: stunEffect,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.2,
                duration: 300,
                yoyo: true,
                repeat: 6  // 2秒（300ms * 2 * 6 = 3.6秒，实际2秒）
            });

            // 禁用玩家控制
            if (this.input.keyboard) {
                this.input.keyboard.enabled = false;
            }

            // 2秒后恢复
            this.time.delayedCall(2000, () => {
                if (this.input.keyboard) {
                    this.input.keyboard.enabled = true;
                }
                stunEffect.destroy();
                debugLog('[Boss] 定身效果结束');
            });
        }
    }

    // 🔥🔥🔥 激光守卫 - 持续激光攻击（追踪玩家）
    private laserGuardContinuousLaser(boss: any) {
        const bossName = (boss as any).bossName || this.getSecondBossDisplayName();
        debugLog(`[${bossName}] 持续激光攻击！`);

        this.playSound('boss_laser');
        this.showBossDialogue(bossName, '激光锁定。', 2000);

        // 标记激光激活
        this.laserGuardState.laserActive = true;
        const laserDuration = this.secondBossConfig?.specialAbilities?.laserDuration || 4000;
        this.laserGuardState.laserEndTime = Date.now() + laserDuration;

        // 预警效果（800ms）
        const warningLine = this.add.graphics();
        warningLine.lineStyle(4, 0xffff00, 0.6);

        const updateWarning = () => {
            if (!boss.active || !this.player.active) {
                warningLine.destroy();
                return;
            }
            warningLine.clear();
            warningLine.lineStyle(4, 0xffff00, 0.6);
            warningLine.lineBetween(boss.x, boss.y, this.player.x, this.player.y);
        };

        const warningInterval = setInterval(updateWarning, 16);

        // 800ms后开始真正的激光
        this.time.delayedCall(800, () => {
            clearInterval(warningInterval);
            warningLine.destroy();

            if (!boss.active) {
                this.laserGuardState.laserActive = false;
                return;
            }

            // 创建持续激光
            const laser = this.add.graphics();
            const startTime = Date.now();
            const actualDuration = laserDuration - 800;  // 减去预警时间

            const updateLaser = () => {
                if (!boss.active || !this.player.active) {
                    laser.destroy();
                    this.laserGuardState.laserActive = false;
                    return;
                }

                const elapsed = Date.now() - startTime;
                if (elapsed > actualDuration) {
                    laser.destroy();
                    this.laserGuardState.laserActive = false;
                    debugLog(`[${bossName}] 激光攻击结束`);
                    return;
                }

                // 绘制激光（从Boss指向玩家）
                laser.clear();
                laser.lineStyle(8, 0xff0000, 0.9);
                laser.lineBetween(boss.x, boss.y, this.player.x, this.player.y);

                // 激光核心（更亮）
                laser.lineStyle(3, 0xffff00, 1);
                laser.lineBetween(boss.x, boss.y, this.player.x, this.player.y);

                // 检测激光是否击中玩家（每300ms造成一次伤害，降低频率）
                if (elapsed % 300 < 20) {
                    const distToPlayer = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
                    // 🔥 优化：距离超过350就不造成伤害，给玩家逃跑空间
                    if (distToPlayer < 350) {
                        // 🔥 优化：伤害从12降到6，更容易存活
                        this.takeDamage(6);

                        // 击中特效
                        const hitEffect = this.add.circle(this.player.x, this.player.y, 20, 0xff0000, 0.7);
                        this.tweens.add({
                            targets: hitEffect,
                            alpha: 0,
                            scaleX: 2,
                            scaleY: 2,
                            duration: 200,
                            onComplete: () => hitEffect.destroy()
                        });
                    }
                }

                this.time.delayedCall(16, updateLaser);
            };

            updateLaser();
        });
    }

    // 🔥🔥🔥 激光守卫 - 定身玩家技能
    private laserGuardStunPlayer(boss: any) {
        const bossName = (boss as any).bossName || this.getSecondBossDisplayName();
        debugLog(`[${bossName}] 定身技能！`);

        this.playSound('boss_emp');
        this.showBossDialogue(bossName, '定身锁定。', 1500);

        // 🔥 优化：检测范围从250降到180，更容易躲避
        const stunRange = 180;
        const distToPlayer = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);

        // 🎊 新年主题：金光波特效
        const empWave = this.add.circle(boss.x, boss.y, 30, 0xFFD700, 0.8);
        this.tweens.add({
            targets: empWave,
            scaleX: stunRange / 30,
            scaleY: stunRange / 30,
            alpha: 0,
            duration: 600,
            onComplete: () => empWave.destroy()
        });

        if (distToPlayer < stunRange) {
            debugLog(`[${bossName}] 玩家被定身！`);

            // 🔥 优化：定身时间从1500降到1000（1秒），更容易恢复
            const stunDuration = this.secondBossConfig?.specialAbilities?.stunDuration || 1000;

            // 停止玩家移动
            if (this.player.body) {
                this.player.setVelocity(0, 0);
            }

            // 🎊 新年主题：金色定身效果
            const stunEffect = this.add.circle(this.player.x, this.player.y, 35, 0xFFD700, 0.5);
            const stunText = this.add.text(this.player.x, this.player.y - 50, '⚡ 定身！', {
                fontSize: '20px',
                color: '#00ffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // 电流环绕效果
            this.tweens.add({
                targets: stunEffect,
                scaleX: 1.3,
                scaleY: 1.3,
                alpha: 0.3,
                duration: 200,
                yoyo: true,
                repeat: Math.floor(stunDuration / 400)
            });

            // 禁用玩家控制
            if (this.input.keyboard) {
                this.input.keyboard.enabled = false;
            }

            // 定身结束后恢复
            this.time.delayedCall(stunDuration, () => {
                if (this.input.keyboard) {
                    this.input.keyboard.enabled = true;
                }
                stunEffect.destroy();
                stunText.destroy();
                debugLog('[激光守卫] 定身效果结束');
            });
        }
    }

    // Boss水流冲击波技能
    private bossWaterWave(boss: any) {
        debugLog('[Boss] 水流冲击波！');

        // 播放冲击波音效
        this.playSound('boss_wave');

        // Boss台词
        this.showBossDialogue('水流巨兽', '水流冲击！', 1500);

        // 🎊 新年主题：Boss蓄力动画
        boss.setTint(0xFFD700);  // 金色

        // 蓄力特效
        const chargeEffect = this.add.circle(boss.x, boss.y, 50, 0xFFD700, 0.7);
        this.tweens.add({
            targets: chargeEffect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 600,
            onComplete: () => chargeEffect.destroy()
        });

        // 延迟600ms后释放冲击波
        this.time.delayedCall(600, () => {
            // 恢复Boss颜色
            if (boss.active) {
                if (this.bossPhase === 3) {
                    boss.setTint(0xff0000);
                } else {
                    boss.clearTint();
                }
            }

            // 创建3层冲击波
            for (let i = 0; i < 3; i++) {
                this.time.delayedCall(i * 200, () => {
                    const wave = this.add.circle(boss.x, boss.y, 50, 0x00aaff, 0.6);

                    // 冲击波扩散动画
                    this.tweens.add({
                        targets: wave,
                        scaleX: 6,
                        scaleY: 6,
                        alpha: 0,
                        duration: 1000,
                        ease: 'Cubic.easeOut',
                        onComplete: () => wave.destroy()
                    });

                    // 检测冲击波是否击中玩家
                    const checkHit = () => {
                        if (!wave.active || !this.player.active) return;

                        const waveRadius = wave.scaleX * 50;
                        const distToPlayer = Phaser.Math.Distance.Between(
                            boss.x, boss.y,
                            this.player.x, this.player.y
                        );

                        // 如果玩家在冲击波范围内
                        if (distToPlayer < waveRadius && distToPlayer > waveRadius - 50) {
                            // 击退玩家
                            const angle = Phaser.Math.Angle.Between(
                                boss.x, boss.y,
                                this.player.x, this.player.y
                            );
                            const knockbackForce = 400;
                            if (this.player.body) {
                                this.player.setVelocity(
                                    Math.cos(angle) * knockbackForce,
                                    Math.sin(angle) * knockbackForce - 100  // 向上击飞
                                );
                            }

                            // 造成伤害
                            this.takeDamage(15);

                            // 不再检测
                            return;
                        }

                        // 继续检测
                        if (wave.active) {
                            this.time.delayedCall(16, checkHit);
                        }
                    };

                    checkHit();
                });
            }
        });
    }

    // Boss战阵冲锋技能
    private bossWarCharge(boss: any) {
        debugLog('[Boss] 战阵冲锋！');

        // 播放冲锋音效
        this.playSound('boss_charge');

        // Boss台词
        this.showBossDialogue('古代战将', '冲锋！', 1200);

        // 蓄力特效
        boss.setTint(0xff6600);
        const chargeEffect = this.add.circle(boss.x, boss.y, 60, 0xff6600, 0.7);
        this.tweens.add({
            targets: chargeEffect,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 500,
            onComplete: () => chargeEffect.destroy()
        });

        // 延迟500ms后冲锋
        this.time.delayedCall(500, () => {
            // 恢复Boss颜色
            if (boss.active) {
                if (this.bossPhase === 3) {
                    boss.setTint(0xff0000);
                } else {
                    boss.clearTint();
                }
            }

            // 计算冲锋方向
            const angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
            const chargeSpeed = 600;

            // Boss快速冲锋
            if (boss.body) {
                boss.setVelocity(
                    Math.cos(angle) * chargeSpeed,
                    Math.sin(angle) * chargeSpeed
                );
            }

            // 冲锋尾迹特效
            const trailInterval = setInterval(() => {
                if (!boss.active) {
                    clearInterval(trailInterval);
                    return;
                }

                const trail = this.add.circle(boss.x, boss.y, 20, 0xff6600, 0.5);
                this.tweens.add({
                    targets: trail,
                    alpha: 0,
                    scale: 0,
                    duration: 300,
                    onComplete: () => trail.destroy()
                });
            }, 50);

            // 1秒后停止冲锋
            this.time.delayedCall(1000, () => {
                clearInterval(trailInterval);
                if (boss.body) {
                    boss.setVelocity(0, 0);
                }
            });
        });
    }

    // Boss召唤士兵技能
    private bossSummonSoldiers(boss: any) {
        debugLog('[Boss] 召唤士兵！');

        // 播放召唤音效
        this.playSound('boss_summon');

        // Boss台词
        this.showBossDialogue('古代战将', '士兵，集结！', 1500);

        // 召唤特效
        const summonEffect = this.add.circle(boss.x, boss.y, 70, 0xffaa00, 0.6);
        this.tweens.add({
            targets: summonEffect,
            scaleX: 2.5,
            scaleY: 2.5,
            alpha: 0,
            duration: 800,
            onComplete: () => summonEffect.destroy()
        });

        // 召唤3-4个士兵
        const soldierCount = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < soldierCount; i++) {
            setTimeout(() => {
                const offsetX = (Math.random() - 0.5) * 250;
                const offsetY = (Math.random() - 0.5) * 120;
                const soldierX = boss.x + offsetX;
                const soldierY = boss.y + offsetY;

                const soldier = this.enemies.create(soldierX, soldierY, '');
                soldier.setTexture(this.createSlimeTexture());
                soldier.setDisplaySize(36, 36);
                (soldier as any).damage = 12;
                (soldier as any).enemyType = 'slime';
                (soldier as any).isBossSoldier = true;

                // 士兵emoji
                const soldierEmoji = this.add.text(soldierX, soldierY, '⚔️', {
                    fontSize: '28px'
                }).setOrigin(0.5);
                (soldier as any).emojiText = soldierEmoji;

                // 生成特效
                const spawnEffect = this.add.circle(soldierX, soldierY, 35, 0xffaa00, 0.8);
                this.tweens.add({
                    targets: spawnEffect,
                    scaleX: 2,
                    scaleY: 2,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => spawnEffect.destroy()
                });

                // 出现动画
                soldier.setScale(0);
                this.tweens.add({
                    targets: soldier,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 350,
                    ease: 'Back.easeOut'
                });
            }, i * 250);
        }
    }

    // Boss时间减速技能
    private bossTimeSlow(boss: any) {
        debugLog('[Boss] 时间减速！');

        // 播放时间音效
        this.playSound('boss_time');

        // Boss台词
        this.showBossDialogue('时间守护者', '时间减速！', 1500);

        // 时间波纹特效
        const timeWave = this.add.circle(boss.x, boss.y, 60, 0x9966ff, 0.7);
        this.tweens.add({
            targets: timeWave,
            scaleX: 5,
            scaleY: 5,
            alpha: 0,
            duration: 1000,
            onComplete: () => timeWave.destroy()
        });

        // 检测范围
        const distToPlayer = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
        if (distToPlayer < 350) {
            debugLog('[Boss] 玩家被减速！');

            // 紫色时间场环绕玩家
            const slowEffect = this.add.circle(this.player.x, this.player.y, 45, 0x9966ff, 0.4);
            this.tweens.add({
                targets: slowEffect,
                scaleX: 1.3,
                scaleY: 1.3,
                alpha: 0.1,
                duration: 400,
                yoyo: true,
                repeat: 7  // 3秒
            });

            // 玩家移动速度减半3秒
            const originalSpeed = 250;
            const slowedSpeed = 125;

            // 标记玩家被减速
            (this.player as any).isSlowed = true;
            (this.player as any).slowedSpeed = slowedSpeed;

            // 3秒后恢复
            this.time.delayedCall(3000, () => {
                (this.player as any).isSlowed = false;
                slowEffect.destroy();
                debugLog('[Boss] 减速效果结束');
            });
        }
    }

    // Boss时间倒流技能
    private bossTimeRewind(boss: any) {
        debugLog('[Boss] 时间倒流！');

        // 播放倒流音效
        this.playSound('boss_rewind');

        // Boss台词
        this.showBossDialogue('时间守护者', '时光倒流！', 1800);

        // 时间倒流特效
        const rewindEffect = this.add.circle(boss.x, boss.y, 80, 0xff00ff, 0.8);
        this.tweens.add({
            targets: rewindEffect,
            scaleX: 0.5,
            scaleY: 0.5,
            alpha: 0,
            duration: 800,
            onComplete: () => rewindEffect.destroy()
        });

        // Boss回复20%血量
        const healAmount = Math.floor(this.bossMaxHP * 0.2);
        this.bossHP = Math.min(this.bossHP + healAmount, this.bossMaxHP);

        // 更新血条显示
        const hpPercent = this.bossHP / this.bossMaxHP;
        this.bossHPBar.width = 500 * hpPercent;
        this.bossHPText.setText(`${this.bossHP}/${this.bossMaxHP}`);

        // 治疗数字特效
        const healText = this.add.text(boss.x, boss.y - 50, `+${healAmount}`, {
            fontSize: '32px',
            color: '#ff00ff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: healText,
            y: boss.y - 100,
            alpha: 0,
            duration: 1500,
            onComplete: () => healText.destroy()
        });

        debugLog(`[Boss] 时间倒流回复${healAmount}HP，当前HP: ${this.bossHP}/${this.bossMaxHP}`);
    }

    // ========== 新增Boss技能 ==========

    // Boss影分身术（战役1）
    private bossShadowClone(boss: any) {
        debugLog('[Boss] 影分身术！');
        this.playSound('boss_summon');
        this.showBossDialogue('古街守护者', '影分身之术！', 1500);

        // 创建2个分身
        for (let i = 0; i < 2; i++) {
            const angle = (i / 2) * Math.PI * 2;
            const distance = 150;
            const cloneX = boss.x + Math.cos(angle) * distance;
            const cloneY = boss.y + Math.sin(angle) * distance;

            const spawnEffect = this.add.circle(cloneX, cloneY, 50, 0x9966ff, 0.8);
            this.tweens.add({
                targets: spawnEffect,
                scaleX: 0,
                scaleY: 0,
                alpha: 0,
                duration: 300,
                onComplete: () => spawnEffect.destroy()
            });

            const clone = this.enemies.create(cloneX, cloneY, boss.texture.key);
            clone.setDisplaySize(boss.displayWidth * 0.8, boss.displayHeight * 0.8);
            clone.setTint(0x9966ff);
            clone.setAlpha(0.7);
            (clone as any).enemyType = 'clone';
            (clone as any).damage = 10;

            this.time.delayedCall(5000, () => {
                if (clone.active) {
                    const fadeEffect = this.add.circle(clone.x, clone.y, 40, 0x9966ff, 0.6);
                    this.tweens.add({
                        targets: fadeEffect,
                        scaleX: 2,
                        scaleY: 2,
                        alpha: 0,
                        duration: 400,
                        onComplete: () => fadeEffect.destroy()
                    });
                    clone.destroy();
                }
            });
        }
    }

    // Boss隐身术（战役1）
    private bossInvisibility(boss: any) {
        debugLog('[Boss] 隐身术！');
        this.playSound('boss_teleport');
        this.showBossDialogue('古街守护者', '看不见我了吧！', 1500);

        const invisEffect = this.add.circle(boss.x, boss.y, 60, 0xFFD700, 0.6);  // 🎊 金色
        this.tweens.add({
            targets: invisEffect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 500,
            onComplete: () => invisEffect.destroy()
        });

        boss.setAlpha(0.3);

        const offsetX = (Math.random() - 0.5) * 200;
        const offsetY = -100 - Math.random() * 100;
        const targetX = this.player.x + offsetX;
        const targetY = this.player.y + offsetY;

        this.tweens.add({
            targets: boss,
            x: targetX,
            y: targetY,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        this.time.delayedCall(3000, () => {
            if (boss.active) {
                const appearEffect = this.add.circle(boss.x, boss.y, 50, 0xffd700, 0.8);
                this.tweens.add({
                    targets: appearEffect,
                    scaleX: 2,
                    scaleY: 2,
                    alpha: 0,
                    duration: 400,
                    onComplete: () => appearEffect.destroy()
                });

                boss.setAlpha(1);
                const direction = this.player.x > boss.x ? 1 : -1;
                boss.setVelocityX(direction * 300);
                boss.setVelocityY(-200);
            }
        });
    }

    // Boss水牢笼（战役3）
    private bossWaterPrison(boss: any) {
        debugLog('[Boss] 水牢笼！');
        this.playSound('boss_wave');
        this.showBossDialogue('水流巨兽', '水之牢笼！', 1500);

        const distToPlayer = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
        if (distToPlayer < 400) {
            const prisonCircle = this.add.circle(this.player.x, this.player.y, 60, 0x00aaff, 0.3);
            prisonCircle.setStrokeStyle(4, 0x0066ff, 0.8);
            prisonCircle.setDepth(99);

            const droplets: any[] = [];
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const droplet = this.add.circle(
                    this.player.x + Math.cos(angle) * 60,
                    this.player.y + Math.sin(angle) * 60,
                    4,
                    0xFFD700,  // 🎊 金色
                    0.8
                );
                droplet.setDepth(100);
                droplets.push(droplet);
            }

            this.player.setVelocity(0, 0);
            (this.player as any).isPrisoned = true;

            let damageCount = 0;
            const damageInterval = this.time.addEvent({
                delay: 500,
                callback: () => {
                    if ((this.player as any).isPrisoned) {
                        this.takeDamage(5);
                        damageCount++;
                        if (damageCount >= 6) damageInterval.remove();
                    }
                },
                loop: true
            });

            this.time.delayedCall(3000, () => {
                (this.player as any).isPrisoned = false;
                prisonCircle.destroy();
                droplets.forEach(d => d.destroy());
            });
        }
    }

    // Boss水之治愈（战役3）
    private bossWaterHeal(boss: any) {
        debugLog('[Boss] 水之治愈！');
        this.playSound('boss_summon');
        this.showBossDialogue('水流巨兽', '水之治愈！', 1500);

        const healCircle = this.add.circle(boss.x, boss.y, 80, 0x00ff88, 0.6);
        this.tweens.add({
            targets: healCircle,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 1000,
            repeat: 2,
            onComplete: () => healCircle.destroy()
        });

        const healAmount = Math.floor(this.bossMaxHP * 0.15);
        this.bossHP = Math.min(this.bossHP + healAmount, this.bossMaxHP);

        const hpPercent = this.bossHP / this.bossMaxHP;
        this.bossHPBar.width = 500 * hpPercent;
        this.bossHPText.setText(`${this.bossHP}/${this.bossMaxHP}`);

        const healText = this.add.text(boss.x, boss.y - 50, `+${healAmount}`, {
            fontSize: '32px',
            color: '#00ff88',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: healText,
            y: boss.y - 100,
            alpha: 0,
            duration: 1500,
            onComplete: () => healText.destroy()
        });
    }

    // Boss盾牌格挡（战役4）
    private bossShieldBlock(boss: any) {
        debugLog('[Boss] 盾牌格挡！');
        this.playSound('boss_charge');
        this.showBossDialogue('古代战将', '盾牌防御！', 1500);

        const shield = this.add.circle(boss.x, boss.y, 70, 0xffd700, 0.4);
        shield.setStrokeStyle(6, 0xffaa00, 0.9);
        shield.setDepth(99);

        this.tweens.add({
            targets: shield,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.2,
            duration: 300,
            yoyo: true,
            repeat: 9
        });

        (boss as any).isInvincible = true;
        boss.setTint(0xffd700);

        this.time.delayedCall(3000, () => {
            (boss as any).isInvincible = false;
            if (this.bossPhase === 3) {
                boss.setTint(0xff0000);
            } else if (this.bossPhase === 2) {
                boss.setTint(0xff8800);
            } else {
                boss.clearTint();
            }
            shield.destroy();
        });
    }

    // 🔥 创意工坊：Boss冲击波技能
    private bossShockwave(boss: any) {
        debugLog('[创意工坊Boss] 冲击波攻击！');
        this.playSound('boss_charge');

        // 创建多层冲击波
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 200, () => {
                if (!boss.active) return;

                const shockwave = this.add.circle(boss.x, boss.y, 50, 0xff4444, 0.6);
                shockwave.setStrokeStyle(4, 0xff0000, 0.8);
                shockwave.setDepth(99);

                this.tweens.add({
                    targets: shockwave,
                    scale: 4,
                    alpha: 0,
                    duration: 800,
                    ease: 'Power2',
                    onUpdate: () => {
                        // 检测玩家是否在冲击波范围内
                        const dist = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
                        const currentRadius = 50 * shockwave.scale;
                        if (dist < currentRadius && dist > currentRadius - 30 && !this.isInvulnerable) {
                            this.takeDamage(15);
                        }
                    },
                    onComplete: () => shockwave.destroy()
                });
            });
        }
    }

    // 🔥 创意工坊：Boss护盾技能
    private bossShield(boss: any) {
        debugLog('[创意工坊Boss] 护盾激活！');
        this.playSound('boss_charge');

        // 创建护盾视觉效果
        const shield = this.add.circle(boss.x, boss.y, 60, 0x00ffff, 0.3);
        shield.setStrokeStyle(4, 0x00ffff, 0.8);
        shield.setDepth(99);

        // 护盾跟随Boss
        const updateShield = () => {
            if (shield.active && boss.active) {
                shield.setPosition(boss.x, boss.y);
            }
        };

        // 每帧更新护盾位置
        const shieldUpdate = this.time.addEvent({
            delay: 16,
            callback: updateShield,
            loop: true
        });

        // 护盾脉冲动画
        this.tweens.add({
            targets: shield,
            scale: 1.2,
            alpha: 0.5,
            duration: 500,
            yoyo: true,
            repeat: 5
        });

        // 设置Boss无敌状态
        (boss as any).isInvincible = true;
        boss.setTint(0x00ffff);

        // 3秒后移除护盾
        this.time.delayedCall(3000, () => {
            (boss as any).isInvincible = false;
            shieldUpdate.destroy();

            // 恢复Boss颜色
            if (boss.active) {
                if ((boss as any).aiData?.isEnraged) {
                    boss.setTint(0xff0000);
                } else if (this.bossPhase === 3) {
                    boss.setTint(0xff0000);
                } else if (this.bossPhase === 2) {
                    boss.setTint(0xff8800);
                } else {
                    boss.clearTint();
                }
            }
            shield.destroy();
        });
    }

    // Boss狂暴冲锋（战役4）
    private bossBerserkerCharge(boss: any) {
        debugLog('[Boss] 狂暴冲锋！');
        this.playSound('boss_charge');
        this.showBossDialogue('古代战将', '狂暴冲锋！', 1500);

        let chargeCount = 0;
        const performCharge = () => {
            if (chargeCount >= 3 || !boss.active) return;
            chargeCount++;

            const chargeEffect = this.add.circle(boss.x, boss.y, 50, 0xff0000, 0.7);
            this.tweens.add({
                targets: chargeEffect,
                scaleX: 0.5,
                scaleY: 0.5,
                alpha: 0,
                duration: 300,
                onComplete: () => chargeEffect.destroy()
            });

            const direction = this.player.x > boss.x ? 1 : -1;
            boss.setFlipX(direction < 0);
            boss.setVelocityX(direction * 600);
            boss.setVelocityY(-150);

            this.time.delayedCall(800, performCharge);
        };

        performCharge();
    }

    // Boss时空停滞（战役5）
    private bossTimeFreeze(boss: any) {
        debugLog('[Boss] 时空停滞！');
        this.playSound('boss_time');
        this.showBossDialogue('时间守护者', '时空停滞！', 1500);

        const freezeCircle = this.add.circle(boss.x, boss.y, 100, 0xFFD700, 0.5);  // 🎊 金色
        this.tweens.add({
            targets: freezeCircle,
            scaleX: 4,
            scaleY: 4,
            alpha: 0,
            duration: 800
        });

        const distToPlayer = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
        if (distToPlayer < 400) {
            const iceEffect = this.add.circle(this.player.x, this.player.y, 50, 0x88ffff, 0.5);
            iceEffect.setStrokeStyle(4, 0xFFD700, 0.9);  // 🎊 金色边框
            iceEffect.setDepth(99);

            this.player.setVelocity(0, 0);
            (this.player as any).isFrozen = true;
            this.player.setTint(0x88ffff);

            this.time.delayedCall(2500, () => {
                (this.player as any).isFrozen = false;
                this.player.clearTint();
                iceEffect.destroy();
                freezeCircle.destroy();
            });
        } else {
            freezeCircle.destroy();
        }
    }

    // Boss时间分身（战役5）
    private bossTimeClone(boss: any) {
        debugLog('[Boss] 时间分身！');
        this.playSound('boss_rewind');
        this.showBossDialogue('时间守护者', '召唤过去的我！', 1800);

        const clonePositions = [
            { x: boss.x - 150, y: boss.y },
            { x: boss.x + 150, y: boss.y }
        ];

        clonePositions.forEach((pos) => {
            const riftEffect = this.add.circle(pos.x, pos.y, 60, 0xff00ff, 0.8);
            this.tweens.add({
                targets: riftEffect,
                scaleX: 0,
                scaleY: 0,
                alpha: 0,
                duration: 500,
                onComplete: () => riftEffect.destroy()
            });

            this.time.delayedCall(500, () => {
                const clone = this.enemies.create(pos.x, pos.y, boss.texture.key);
                clone.setDisplaySize(boss.displayWidth * 0.85, boss.displayHeight * 0.85);
                clone.setTint(0xff00ff);
                clone.setAlpha(0.8);
                (clone as any).enemyType = 'time_clone';
                (clone as any).damage = 15;

                this.time.delayedCall(6000, () => {
                    if (clone.active) {
                        const fadeEffect = this.add.circle(clone.x, clone.y, 50, 0xff00ff, 0.7);
                        this.tweens.add({
                            targets: fadeEffect,
                            scaleX: 2.5,
                            scaleY: 2.5,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => fadeEffect.destroy()
                        });
                        clone.destroy();
                    }
                });
            });
        });
    }

    // Boss对话系统
    private showBossDialogue(bossName: string, text: string, duration: number = 2000) {
        // 创建对话框背景
        const dialogBg = this.add.rectangle(
            this.cameras.main.centerX,
            100,
            600,
            80,
            0x000000,
            0.8
        ).setScrollFactor(0).setDepth(1999);

        // Boss名字
        const nameText = this.add.text(
            this.cameras.main.centerX - 280,
            75,
            bossName,
            {
                fontSize: '20px',
                color: '#ffd700',
                fontStyle: 'bold'
            }
        ).setScrollFactor(0).setDepth(2000);

        // 对话内容
        const dialogText = this.add.text(
            this.cameras.main.centerX - 280,
            105,
            text,
            {
                fontSize: '18px',
                color: '#ffffff'
            }
        ).setScrollFactor(0).setDepth(2000);

        // 淡入动画
        dialogBg.setAlpha(0);
        nameText.setAlpha(0);
        dialogText.setAlpha(0);

        this.tweens.add({
            targets: [dialogBg, nameText, dialogText],
            alpha: 1,
            duration: 200
        });

        // 延迟后淡出
        this.time.delayedCall(duration, () => {
            this.tweens.add({
                targets: [dialogBg, nameText, dialogText],
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    dialogBg.destroy();
                    nameText.destroy();
                    dialogText.destroy();
                }
            });
        });
    }

    // Boss召唤小怪技能
    private bossSpawnMinions(boss: any) {
        debugLog('[Boss] 召唤小怪！');

        // 播放召唤音效
        this.playSound('boss_summon');

        // Boss台词
        this.showBossDialogue('水流巨兽', '水灵，听我号令！', 1500);

        // 🎊 新年主题：召唤特效
        const summonEffect = this.add.circle(boss.x, boss.y, 80, 0xDC143C, 0.5);  // 红色
        this.tweens.add({
            targets: summonEffect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 800,
            onComplete: () => summonEffect.destroy()
        });

        // 召唤2-3个小怪
        const minionCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < minionCount; i++) {
            setTimeout(() => {
                // 在Boss周围随机位置生成小怪
                const offsetX = (Math.random() - 0.5) * 200;
                const offsetY = (Math.random() - 0.5) * 100;
                const minionX = boss.x + offsetX;
                const minionY = boss.y + offsetY;

                const minion = this.enemies.create(minionX, minionY, '');
                minion.setTexture(this.createSlimeTexture());
                minion.setDisplaySize(32, 32);
                (minion as any).damage = 10;
                (minion as any).enemyType = 'slime';  // 使用slime类型，会自动追击
                (minion as any).isBossMinion = true;

                // 添加小怪emoji显示
                const minionEmoji = this.add.text(minionX, minionY, '💧', {
                    fontSize: '24px'
                }).setOrigin(0.5);
                (minion as any).emojiText = minionEmoji;

                // 🎊 新年主题：小怪生成特效
                const spawnEffect = this.add.circle(minionX, minionY, 30, 0xFFD700, 0.8);  // 金色
                this.tweens.add({
                    targets: spawnEffect,
                    scaleX: 2,
                    scaleY: 2,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => spawnEffect.destroy()
                });

                // 小怪出现动画
                minion.setScale(0);
                this.tweens.add({
                    targets: minion,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 300,
                    ease: 'Back.easeOut'
                });

                debugLog('[Boss] 召唤小怪完成:', i + 1);
            }, i * 300);  // 每个小怪间隔300ms生成
        }
    }

    private enemyShoot(enemy: any, angleOffset: number = 0) {
        // 🔥 安全检查：确保敌人和玩家都存在
        if (!enemy || !enemy.active || !this.player || !this.player.active) {
            return;
        }

        // 敌人发射子弹（支持角度偏移）
        const bullet = this.physics.add.sprite(enemy.x, enemy.y, '');
        bullet.setDisplaySize(10, 10);

        // 创建敌人子弹图形（红色）
        const bulletGraphics = this.add.graphics();
        bulletGraphics.fillStyle(0xff0000, 1);
        bulletGraphics.fillCircle(0, 0, 5);
        bulletGraphics.setPosition(bullet.x, bullet.y);
        (bullet as any).graphics = bulletGraphics;

        // 计算射向玩家的方向，加上角度偏移
        const baseAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const angle = baseAngle + (angleOffset * Math.PI / 180);  // 转换为弧度
        bullet.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);

        // 敌人子弹碰到玩家造成伤害
        this.physics.add.overlap(bullet, this.player, (b: any, p: any) => {
            if (!this.isInvulnerable) {
                this.takeDamage(10);
            }
            if (b.graphics) b.graphics.destroy();
            b.destroy();
        });

        // 2秒后销毁
        this.time.delayedCall(2000, () => {
            if (bullet.active) {
                if ((bullet as any).graphics) (bullet as any).graphics.destroy();
                bullet.destroy();
            }
        });
    }

    private performDash() {
        this.isDashing = true;
        this.dashCooldown = this.getDashCooldownSeconds();
        const isQuantumDash = this.hasSkill('quantum_dash');
        const dashSpeed = this.getDashSpeed();
        const dashDuration = this.getDashDurationMs();
        this.isInvulnerable = isQuantumDash;

        // 获取触控输入状态
        const touchState = touchInputManager.getState();

        let dashDirection = 1;
        if (this.cursors.left.isDown || this.moveKeys.left.isDown || touchState.left) {
            dashDirection = -1;
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown || this.moveKeys.right.isDown || touchState.right) {
            dashDirection = 1;
            this.player.setFlipX(false);
        } else {
            dashDirection = this.player.flipX ? -1 : 1;
        }

        this.player.setVelocityX(dashDirection * dashSpeed);
        this.player.setVelocityY(0);

        // 创建冲刺残影效果
        this.createDashAfterimage(dashDirection);

        // 播放冲刺音效
        if (this.cache.audio.exists('jump')) {
            try {
                this.sound.play('jump', { volume: 0.5, rate: 1.5 });
            } catch (e) {
                // 音效播放失败，忽略
            }
        }

        // 冲刺粒子效果
        this.createDashParticles(dashDirection);

        if (isQuantumDash) {
            this.player.setTint(0x22d3ee);
        }

        this.time.delayedCall(dashDuration, () => {
            this.isDashing = false;
            if (isQuantumDash) {
                this.isInvulnerable = false;
                if (this.player?.active) {
                    this.player.clearTint();
                }
            }
        });
    }

    // 🔥 战役8：冲刺星星触发的特殊冲刺（更强力，持续更久）
    private triggerDashStar() {
        this.isDashing = true;
        this.isInvulnerable = true;  // 冲刺期间无敌

        // 根据玩家朝向决定冲刺方向
        let dashDirection = this.player.flipX ? -1 : 1;

        // 如果按着方向键，使用方向键方向（支持触控）
        const touchState = touchInputManager.getState();
        if (this.cursors.left.isDown || this.moveKeys.left.isDown || touchState.left) {
            dashDirection = -1;
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown || this.moveKeys.right.isDown || touchState.right) {
            dashDirection = 1;
            this.player.setFlipX(false);
        }

        // 更强力的冲刺速度
        this.player.setVelocityX(dashDirection * 600);
        this.player.setVelocityY(-100);  // 轻微上升

        // 金色特效
        this.player.setTint(0xffff00);

        // 创建星星轨迹
        for (let i = 0; i < 8; i++) {
            this.time.delayedCall(i * 40, () => {
                const star = this.add.text(this.player.x, this.player.y, '⭐', {
                    fontSize: '20px'
                }).setOrigin(0.5);

                this.tweens.add({
                    targets: star,
                    alpha: 0,
                    scale: 0.5,
                    duration: 400,
                    onComplete: () => star.destroy()
                });
            });
        }

        // 冲刺持续350ms（比普通冲刺更久）
        this.time.delayedCall(350, () => {
            this.isDashing = false;
            this.isInvulnerable = false;
            this.player.clearTint();
        });
    }

    private createDashAfterimage(direction: number) {
        // 创建5个残影
        for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 30, () => {
                const afterimage = this.add.sprite(this.player.x, this.player.y, 'playerChar');
                afterimage.setAlpha(0.6 - i * 0.1);
                afterimage.setTint(0xFFD700);  // 🎊 金色残影
                afterimage.setFlipX(this.player.flipX);

                this.tweens.add({
                    targets: afterimage,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => afterimage.destroy()
                });
            });
        }
    }

    private createDashParticles(direction: number) {
        // 创建冲刺粒子
        for (let i = 0; i < 10; i++) {
            const particle = this.add.circle(
                this.player.x - direction * 10,
                this.player.y + (Math.random() - 0.5) * 20,
                2 + Math.random() * 3,
                0x4ecdc4,
                0.8
            );

            this.tweens.add({
                targets: particle,
                x: particle.x - direction * (50 + Math.random() * 50),
                y: particle.y + (Math.random() - 0.5) * 30,
                alpha: 0,
                scale: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    private createDoubleJumpParticles() {
        // 创建二段跳特效
        debugLog('[PlatformGameScene] 触发二段跳特效');

        // 🎊 新年主题：金色扩散波
        const wave = this.add.circle(this.player.x, this.player.y, 10, 0xFFD700, 0.6);
        this.tweens.add({
            targets: wave,
            scale: 3,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => wave.destroy()
        });

        // 创建星星粒子
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            const particle = this.add.circle(
                this.player.x,
                this.player.y,
                3 + Math.random() * 2,
                0xffff00,
                0.9
            );

            this.tweens.add({
                targets: particle,
                x: this.player.x + Math.cos(angle) * distance,
                y: this.player.y + Math.sin(angle) * distance,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    private performAttack() {
        if (!this.canAttack) return;

        this.canAttack = false;
        debugLog('[PlatformGameScene] 发射子弹!');
        this.playSound('player_attack');  // 播放攻击音效

        // 创建子弹（马里奥风格的火球）
        const bulletX = this.player.x;
        const bulletY = this.player.y;
        const direction = this.player.flipX ? -1 : 1;

        // 创建子弹精灵
        const bullet = this.bullets.create(bulletX, bulletY, '');
        bullet.setDisplaySize(16, 16);
        bullet.setCircle(8); // 圆形碰撞体

        // 子弹外观（黄色火球）
        const bulletGraphics = this.add.circle(bulletX, bulletY, 8, 0xffff00, 1);
        bulletGraphics.setStrokeStyle(2, 0xff8800);
        (bullet as any).graphics = bulletGraphics;

        // 添加火球emoji
        const bulletEmoji = this.add.text(bulletX, bulletY, '⚡', { fontSize: '16px' }).setOrigin(0.5);
        (bullet as any).emojiText = bulletEmoji;

        // 设置子弹速度（水平+轻微抛物线）
        bullet.setVelocityX(direction * 400);
        bullet.setVelocityY(-50); // 轻微向上
        bullet.setGravityY(300); // 添加重力，形成抛物线

        // 子弹旋转动画
        this.tweens.add({
            targets: [bulletGraphics, bulletEmoji],
            angle: 360,
            duration: 1000,
            repeat: -1
        });

        // 2秒后销毁子弹
        this.time.delayedCall(2000, () => {
            if (bullet.active) {
                if (bulletGraphics) bulletGraphics.destroy();
                if (bulletEmoji) bulletEmoji.destroy();
                bullet.destroy();
            }
        });

        // 攻击冷却0.3秒
        this.time.delayedCall(300, () => {
            this.canAttack = true;
        });
    }

    private bulletHitEnemy(bullet: any, enemy: any) {
        if (!bullet.active || !enemy.active) return;

        // 🔥🔥🔥 防止重复击中：检查子弹是否已经击中过 🔥🔥🔥
        if (bullet.hasHit) {
            debugLog('[PlatformGameScene] ⚠️ 子弹已经击中过，忽略重复碰撞');
            return;
        }
        bullet.hasHit = true;  // 标记子弹已击中

        debugLog('[PlatformGameScene] 子弹击中敌人!');
        this.playSound('enemy_hit');  // 播放击中敌人音效

        // 销毁子弹
        if (bullet.graphics) bullet.graphics.destroy();
        if (bullet.emojiText) bullet.emojiText.destroy();
        bullet.destroy();

        // 检查是否是Boss
        const isBoss = (enemy as any).enemyType === 'boss';

        if (isBoss && this.isBossLevel) {
            // 🔥🔥🔥 双Boss模式：传递被击中的Boss给updateBossHP
            this.updateBossHP(50, enemy); // Boss受到50伤害，传递目标Boss

            // 记录受击时间，触发AI闪避反应
            if ((enemy as any).aiData) {
                (enemy as any).aiData.lastHitTime = Date.now();
            }

            // Boss受击特效
            enemy.setTint(0xffffff);
            this.time.delayedCall(100, () => {
                if (enemy.active) {
                    // 🔥 双Boss模式：检查是否狂暴
                    const isEnraged = this.dualBossState?.enraged || this.bossPhase === 3;
                    if (isEnraged) {
                        enemy.setTint(0xff0000); // 狂暴阶段保持红色
                    } else {
                        enemy.clearTint();
                    }
                }
            });
        } else {
            // 普通敌人直接击败
            if (enemy.emojiText) {
                enemy.emojiText.destroy();
            }
            enemy.destroy();

            this.defeatedEnemies++;
            this.score += 100;
            this.scoreText.setText(`分数: ${this.score}`);
        }

        // 击败特效
        const hitEffect = this.add.circle(enemy.x, enemy.y, 30, 0xff0000, 0.6);
        this.tweens.add({
            targets: hitEffect,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: () => hitEffect.destroy()
        });

        // 检查是否完成击败敌人的目标
        this.checkObjectives();
    }

    private collectItem(player: any, collectible: any) {
        if (!collectible.active) return;

        const itemType = (collectible as any).itemType;
        const value = (collectible as any).value || 1;

        switch (itemType) {
            case 'coin':
                this.score += value * 10;
                this.collectedItems++;
                this.playSound('collect_coin');  // 播放收集金币音效
                break;
            case 'gem':
                this.score += value * 50;
                this.collectedItems++;
                this.playSound('collect_gem');  // 播放收集宝石音效
                break;
            case 'key':
                this.collectedItems++;
                break;
            case 'clue':
                this.collectedItems++;
                break;
            case 'dash_star':
                // 🔥 战役8：冲刺星星 - 捡到后立即触发冲刺！
                this.score += value * 30;
                this.collectedItems++;
                this.playSound('collect_gem');
                // 显示提示
                const dashText = this.add.text(player.x, player.y - 50, '⭐ 冲刺！', {
                    fontSize: '20px',
                    color: '#ffff00',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);
                this.tweens.add({
                    targets: dashText,
                    y: player.y - 100,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => dashText.destroy()
                });

                // 触发冲刺效果
                this.triggerDashStar();
                break;
            case 'health_pack':
                // 🔥 v2.2.0: 血包收集物 - 一次性回血道具
                // 修改：回血量改为 10-20 之间的随机数
                const healAmount = 10 + Math.floor(Math.random() * 11);
                const oldHP = this.playerHP;
                this.playerHP = Math.min(this.maxHP, this.playerHP + healAmount);
                const actualHeal = this.playerHP - oldHP;
                this.collectedItems++;
                this.playSound('collect_gem');
                // 更新HP显示
                this.updateHPBar();

                // 显示回血提示
                const healText = this.add.text(player.x, player.y - 50, `+${actualHeal} HP`, {
                    fontSize: '18px',
                    color: '#00ff00',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);
                this.tweens.add({
                    targets: healText,
                    y: player.y - 100,
                    alpha: 0,
                    duration: 1200,
                    onComplete: () => healText.destroy()
                });
                break;
            default:
                this.score += value;
                this.collectedItems++;
                break;
        }

        this.scoreText.setText(`分数: ${this.score}`);

        if ((collectible as any).emojiText) {
            (collectible as any).emojiText.destroy();
        }
        collectible.destroy();

        this.checkObjectives();
    }

    private hitObstacle(player: any, obstacle: any) {
        // 🔥 战役7：周期性激光只在可见时造成伤害
        if (obstacle.pattern === 'periodic' && obstacle.alpha < 0.5) {
            return; // 激光隐藏时不造成伤害
        }
        this.takeDamage(obstacle.damage);
    }

    private hitEnemy(player: any, enemy: any) {
        if (!enemy.active || this.isDashing || this.isInvulnerable) return;

        // 玩家碰到敌人只会受伤，不会对敌人造成任何伤害
        // 根据敌人类型设置玩家受到的伤害
        let damage = 10;
        const enemyType = (enemy as any).enemyType;
        if (enemyType === 'boss') {
            damage = 20;
        } else if (enemyType === 'robot') {
            damage = 15;
        }

        this.playerHP = Math.max(0, this.playerHP - damage);
        this.updateHPBar();
        this.playSound('player_hurt');  // 播放受伤音效

        debugLog(`[PlatformGameScene] 玩家HP: ${this.playerHP}/${this.maxHP}`);

        const knockbackDirection = player.x < enemy.x ? -1 : 1;
        player.setVelocityX(knockbackDirection * 200);
        player.setVelocityY(-100);

        this.isInvulnerable = true;
        player.setTint(0xff0000);

        this.time.delayedCall(1000, () => {
            this.isInvulnerable = false;
            player.clearTint();
        });

        if (this.playerHP <= 0) {
            debugLog('[PlatformGameScene] 玩家死亡！');
            this.playerDeath();
        }
    }

    private takeDamage(damage: number) {
        // 🔥 安全检查：确保玩家存在且游戏未结束
        if (!this.player || !this.player.active || this.isGameOver) {
            return;
        }

        if (this.absorbIncomingDamage('damage')) {
            return;
        }

        this.playerHP -= damage;
        this.updateHPBar();

        // 🔥 安全检查：确保玩家仍然存在
        if (this.player && this.player.active) {
            this.player.setTint(0xff0000);
            this.time.delayedCall(200, () => {
                if (this.player && this.player.active) {
                    this.player.setTint(0xFFD700);  // 🎊 金色闪烁
                }
            });
            this.time.delayedCall(400, () => {
                if (this.player && this.player.active) {
                    this.player.clearTint();
                }
            });
        }

        if (this.playerHP <= 0) {
            this.playerDeath();
        }
    }

    private playerDeath() {
        debugLog('[PlatformGameScene] 触发玩家死亡事件');

        // 暂停游戏
        this.physics.pause();

        // 触发死亡事件，通知React组件
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('playerDeath');
            window.dispatchEvent(event);
        }
    }

    private playerRevive(hpPercent: number) {
        debugLog('[PlatformGameScene] 玩家复活，恢复HP:', hpPercent * 100 + '%');

        // 🔥 安全检查：确保玩家存在
        if (!this.player) {
            console.error('[PlatformGameScene] 玩家不存在，无法复活');
            return;
        }

        // 恢复HP
        this.playerHP = Math.floor(this.maxHP * hpPercent);
        this.updateHPBar();

        // 重置玩家位置到起点
        const campaignMapData = (this.levelData as any).campaignMapData;
        const startPos = campaignMapData ?
            (campaignMapData.startPosition || { x: 100, y: 450 }) :
            (this.levelData.map?.startPosition || { x: 100, y: 450 });

        // 完全重置玩家状态
        this.player.setPosition(startPos.x, startPos.y);
        this.player.setVelocity(0, 0);
        this.player.setAcceleration(0, 0);
        this.player.clearTint();
        this.player.setAlpha(1);
        this.player.setActive(true);
        this.player.setVisible(true);

        // 重置玩家物理属性
        if (this.player.body) {
            (this.player.body as Phaser.Physics.Arcade.Body).enable = true;
            (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        }

        debugLog('[PlatformGameScene] 玩家复活位置:', startPos);

        // 立即更新摄像机位置，确保玩家在视野内
        this.cameras.main.centerOn(startPos.x, startPos.y);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // 恢复游戏物理引擎
        this.physics.resume();

        // 播放复活音效
        this.playSound('player_revive');

        // 无敌时间（5秒）
        this.isInvulnerable = true;

        // 闪烁效果
        let blinkCount = 0;
        const blinkInterval = this.time.addEvent({
            delay: 200,
            callback: () => {
                this.player.setAlpha(this.player.alpha === 1 ? 0.3 : 1);
                blinkCount++;
                if (blinkCount >= 25) { // 5秒 = 25次闪烁
                    blinkInterval.remove();
                    this.player.setAlpha(1);
                    this.isInvulnerable = false;
                    debugLog('[PlatformGameScene] 无敌时间结束');
                }
            },
            loop: true
        });

        debugLog('[PlatformGameScene] 复活完成，游戏继续！');
    }

    private checkObjectives() {
        // 检查目标完成情况
        const objectives = this.levelData?.objectives || [];
        if (objectives.length === 0) return;

        const nonReachCompleted = objectives
            .filter((objective: any) => objective.type !== 'reach')
            .every((objective: any) => this.getObjectiveStatus(objective).completed);

        if (nonReachCompleted) {
            debugLog('[PlatformGameScene] 目标完成，显示终点!');
            this.goal.setVisible(true);
            const goalText = (this.goal as any).emojiText;
            if (goalText) {
                goalText.setVisible(true);
            }
        }

        this.updateObjectiveDisplay();
    }

    private reachGoal(player: any, goal: any) {
        // 🔥 检测是否为创意工坊测试模式
        const isCustomLevel = (this.levelData as any).isCustomLevel || (this.levelData as any).isTestMode;
        const customQuestions = (this.levelData as any).questions || [];

        if (isCustomLevel && customQuestions.length > 0) {
            // 🔥 创意工坊测试模式：到达终点触发答题
            debugLog('[PlatformGameScene] 🎯 创意工坊测试模式 - 到达终点，触发答题');
            this.triggerCustomLevelQuiz();
            return;
        }

        // 检查目标是否完成
        const objective = this.levelData.objectives[0];

        if (objective.type === 'defeat') {
            const status = this.getDefeatObjectiveStatus(objective.target);
            if (!status.completed) {
                debugLog('[PlatformGameScene] 还有敌人未击败，无法通关！', status.completedCount, '/', status.total);
                return; // 不触发通关
            }
        } else if (objective.type === 'collect') {
            // 如果目标是收集，检查是否收集完成
            const requiredItems = objective.target || 0;
            if (this.collectedItems < requiredItems) {
                debugLog('[PlatformGameScene] 还有物品未收集，无法通关！');
                return;
            }
        }

        // 🔥 创意工坊测试模式：没有题目时直接显示通关提示
        if (isCustomLevel) {
            debugLog('[PlatformGameScene] 🎯 创意工坊测试模式 - 无题目，直接通关');
            this.showTestModeComplete();
            return;
        }

        // 目标完成，触发通关
        debugLog('[PlatformGameScene] 目标完成，触发通关！');
        this.goalReached = true;
        this.updateObjectiveDisplay();
        this.gameOver(true);
    }

    // 🔥 创意工坊：触发自定义题库答题
    private triggerCustomLevelQuiz() {
        const customQuestions = (this.levelData as any).questions || [];
        if (customQuestions.length === 0) {
            this.showTestModeComplete();
            return;
        }

        // 暂停游戏
        this.physics.pause();
        this.player.setVelocity(0, 0);

        // 随机选择一道题
        const randomIndex = Math.floor(Math.random() * customQuestions.length);
        const question = customQuestions[randomIndex];

        // 发送答题事件
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('customLevelQuiz', {
                detail: {
                    question,
                    isGoalQuiz: true,  // 标记是终点答题
                    onCorrect: () => {
                        // 答对：显示通关提示
                        this.showTestModeComplete();
                    },
                    onWrong: () => {
                        // 答错：继续游戏，玩家需要重新到达终点
                        this.physics.resume();
                        // 将玩家推回一点距离
                        this.player.setVelocityX(-200);
                    }
                }
            }));
        }
    }

    // 🔥 创意工坊：显示测试通关提示
    private showTestModeComplete() {
        this.physics.pause();
        this.player.setVelocity(0, 0);

        // 发送测试通关事件（不自动退出）
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('testModeComplete', {
                detail: {
                    success: true,
                    score: this.score,
                    timeElapsed: this.timeElapsed,
                    message: '🎉 测试通关！点击"退出测试"返回编辑器继续完善关卡'
                }
            }));
        }
    }

    private gameOver(success: boolean) {
        if (this.isGameOver && !success) {
            // 已经触发过失败，不重复触发
            return;
        }
        this.isGameOver = true;

        if (success) {
            this.goalReached = true;
            this.updateObjectiveDisplay();
        }

        let finalScore = this.score;
        if (success) {
            const timeBonus = Math.max(0, 300 - this.timeElapsed);
            const hpBonus = Math.floor((this.playerHP / this.maxHP) * 100);
            finalScore += timeBonus + hpBonus;
        }

        const completedObjectives = [];
        for (const objective of this.levelData.objectives) {
            if (objective.type === 'reach') {
                completedObjectives.push(objective.description);
            } else if (objective.type === 'defeat' && this.defeatedEnemies >= (objective.target || 0)) {
                completedObjectives.push(`${objective.description} (${this.defeatedEnemies}/${objective.target})`);
            } else if (objective.type === 'collect' && this.collectedItems >= (objective.target || 0)) {
                completedObjectives.push(`${objective.description} (${this.collectedItems}/${objective.target})`);
            }
        }

        if (typeof window !== 'undefined') {
            const event = new CustomEvent('platformLevelComplete', {
                detail: {
                    success,
                    score: finalScore,
                    baseScore: this.score,
                    timeElapsed: this.timeElapsed,
                    playerHP: this.playerHP,
                    maxHP: this.maxHP,
                    defeatedEnemies: this.defeatedEnemies,
                    collectedItems: this.collectedItems,
                    completedObjectives,
                    // 添加完整数据用于星级计算
                    questionsCorrect: this.correctQuestions,
                    questionsTotal: this.totalQuestions,
                    itemsCollected: this.collectedItems,
                    itemsTotal: this.totalItems,
                    hpRemaining: this.playerHP,
                    hpTotal: this.maxHP,
                    enemiesDefeated: this.defeatedEnemies,
                    enemiesTotal: this.totalEnemies
                }
            });
            window.dispatchEvent(event);
        }
    }

    // 技能方法（从MainScene复刻）
    private performWallJump() {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const jumpDirection = body.touching.left ? 1 : -1;
        this.player.setVelocityX(jumpDirection * 300);
        this.player.setVelocityY(-350);
        this.hasDoubleJumped = false; // 墙跳后重置二段跳
    }

    // 创建敌人纹理
    private createSlimeTexture(): string {
        // 🎊 新年主题：超萌年糕怪（Q弹可爱）
        const graphics = this.add.graphics();
        // 🎊 白色/粉色Q弹年糕身体
        graphics.fillGradientStyle(0xFFF5EE, 0xFFF5EE, 0xFFE4E1, 0xFFE4E1, 1);
        graphics.fillEllipse(16, 18, 26, 18);
        // 🎊 红色新年腰带（金色边）
        graphics.fillStyle(0xE8363B, 1);
        graphics.fillRect(5, 16, 22, 5);
        graphics.lineStyle(1, 0xFFD700, 1);
        graphics.strokeRect(5, 16, 22, 5);
        // 🎊 腰带上的金色"福"字装饰
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillCircle(16, 18, 2);
        // 🎊 超大可爱眼睛
        graphics.fillStyle(0xffffff, 1);
        graphics.fillEllipse(10, 12, 7, 8);
        graphics.fillEllipse(22, 12, 7, 8);
        graphics.fillStyle(0x2D1B0E, 1);
        graphics.fillCircle(10, 13, 3);
        graphics.fillCircle(22, 13, 3);
        // 眼睛高光
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(9, 11, 1);
        graphics.fillCircle(21, 11, 1);
        // 🎊 粉嫩腮红
        graphics.fillStyle(0xFFB6C1, 0.8);
        graphics.fillEllipse(4, 14, 4, 3);
        graphics.fillEllipse(28, 14, 4, 3);
        // 🎊 可爱小嘴
        graphics.lineStyle(1, 0xE8363B, 1);
        graphics.beginPath();
        graphics.arc(16, 22, 4, 0.2, Math.PI - 0.2);
        graphics.strokePath();
        graphics.generateTexture('slimeEnemy', 32, 32);
        graphics.destroy();
        return 'slimeEnemy';
    }

    private createBatTexture(): string {
        // 🎊 新年主题：超萌蝙蝠福（福气满满的小蝙蝠）
        const graphics = this.add.graphics();
        // 🎊 红色圆润身体
        graphics.fillStyle(0xE8363B, 1);
        graphics.fillEllipse(14, 14, 18, 14);
        // 🎊 可爱的红色翅膀（圆润设计）
        graphics.fillStyle(0xC41E3A, 1);
        graphics.fillEllipse(4, 14, 8, 10);
        graphics.fillEllipse(24, 14, 8, 10);
        // 🎊 超大可爱眼睛
        graphics.fillStyle(0xffffff, 1);
        graphics.fillEllipse(10, 11, 6, 7);
        graphics.fillEllipse(18, 11, 6, 7);
        graphics.fillStyle(0x2D1B0E, 1);
        graphics.fillCircle(10, 12, 2);
        graphics.fillCircle(18, 12, 2);
        // 眼睛高光
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(9, 10, 1);
        graphics.fillCircle(17, 10, 1);
        // 🎊 金色"福"字装饰
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillCircle(14, 17, 4);
        graphics.fillStyle(0xE8363B, 1);
        graphics.fillRect(12, 16, 4, 1);
        graphics.fillRect(13, 15, 2, 4);
        // 🎊 小耳朵
        graphics.fillStyle(0xE8363B, 1);
        graphics.fillTriangle(8, 4, 6, 10, 10, 10);
        graphics.fillTriangle(20, 4, 18, 10, 22, 10);
        graphics.generateTexture('batEnemy', 28, 28);
        graphics.destroy();
        return 'batEnemy';
    }

    private createRobotTexture(): string {
        // 🎊 新年主题：舞狮机器人
        const graphics = this.add.graphics();
        // 红色狮头主体
        graphics.fillStyle(0xDC143C, 1);
        graphics.fillRect(6, 8, 24, 24);
        // 金色鬃毛装饰（更蓬松）
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillRect(2, 4, 32, 6);   // 顶部鬃毛（更宽）
        graphics.fillRect(2, 8, 6, 22);   // 左侧鬃毛
        graphics.fillRect(28, 8, 6, 22);  // 右侧鬃毛
        // 大眼睛（对称位置）
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(13, 16, 5);
        graphics.fillCircle(23, 16, 5);
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(13, 16, 3);
        graphics.fillCircle(23, 16, 3);
        // 金色大嘴巴（狮子特征）
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillRect(8, 24, 20, 6);
        // 红色舌头
        graphics.fillStyle(0xFF6B6B, 1);
        graphics.fillCircle(18, 28, 3);
        // 金色边框
        graphics.lineStyle(2, 0xFFD700, 1);
        graphics.strokeRect(6, 8, 24, 24);
        graphics.generateTexture('robotEnemy', 36, 36);
        graphics.destroy();
        return 'robotEnemy';
    }

    private createTurretTexture(): string {
        // 🎊 新年主题：鞭炮炮塔
        const graphics = this.add.graphics();
        // 金色底座
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillRect(8, 28, 24, 8);
        // 红色鞭炮主体
        graphics.fillStyle(0xDC143C, 1);
        graphics.fillRect(12, 8, 16, 22);
        // 金色装饰环
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillRect(10, 12, 20, 3);
        graphics.fillRect(10, 22, 20, 3);
        // 引线（黄色）
        graphics.fillStyle(0xFFFF00, 1);
        graphics.fillRect(18, 2, 4, 8);
        // 火花
        graphics.fillStyle(0xFF8C00, 1);
        graphics.fillCircle(20, 4, 3);
        // 金色边框
        graphics.lineStyle(2, 0xFFD700, 1);
        graphics.strokeRect(12, 8, 16, 22);
        graphics.generateTexture('turretEnemy', 40, 40);
        graphics.destroy();
        return 'turretEnemy';
    }

    private applyBossVisual(
        enemy: Phaser.Physics.Arcade.Sprite,
        campaignId: string,
        bossConfig: any,
        bossIndex: number,
    ) {
        const visualTheme = bossConfig?.visualTheme || (bossIndex === 2 ? 'variant_b' : 'default');
        const textureName = this.createBossTexture(campaignId, visualTheme);
        const size = bossConfig?.size || this.getBossSize(campaignId);
        enemy.setTexture(textureName);
        enemy.setDisplaySize(size, size);

        if (bossConfig?.tint) {
            enemy.setTint(bossConfig.tint);
        } else {
            enemy.clearTint();
        }
    }

    private getBossAppearance(campaignId: string, visualTheme: string) {
        const appearanceMap: Record<string, {
            shape: 'mask' | 'wave' | 'prism' | 'drum' | 'forge' | 'gate' | 'beast';
            body: number;
            accent: number;
            glow: number;
            outline: number;
            eye: number;
        }> = {
            'campaign_11:default': { shape: 'mask', body: 0x50606B, accent: 0xA6D8FF, glow: 0xC8F2FF, outline: 0x1E2A33, eye: 0x9BE9FF },
            'campaign_11:echo': { shape: 'mask', body: 0x364656, accent: 0x8B7BFF, glow: 0xD5CCFF, outline: 0x17202A, eye: 0xC5BEFF },
            'campaign_12:default': { shape: 'wave', body: 0x2C7697, accent: 0xC0F4FF, glow: 0x7DE7FF, outline: 0x173847, eye: 0xF1FFFF },
            'campaign_12:current': { shape: 'wave', body: 0x1F8AB2, accent: 0x8AE8FF, glow: 0xCBFAFF, outline: 0x15394C, eye: 0xF4FEFF },
            'campaign_13:default': { shape: 'prism', body: 0x6760A8, accent: 0xD4D8FF, glow: 0x8EE9FF, outline: 0x231E45, eye: 0xF7FBFF },
            'campaign_13:mirror_left': { shape: 'prism', body: 0x6674D4, accent: 0xEEF1FF, glow: 0xA9E9FF, outline: 0x24285E, eye: 0xFFFFFF },
            'campaign_13:mirror_right': { shape: 'prism', body: 0x7A58D6, accent: 0xF3E4FF, glow: 0xFFC3F2, outline: 0x381D63, eye: 0xFFFFFF },
            'campaign_14:default': { shape: 'drum', body: 0xB66A2D, accent: 0xFFE2A1, glow: 0xFFF3C7, outline: 0x4F2D18, eye: 0xF7FFFA },
            'campaign_14:wind_guard': { shape: 'drum', body: 0x7EA74E, accent: 0xE7FFB2, glow: 0xD7FFE8, outline: 0x263B1B, eye: 0xF9FFF2 },
            'campaign_14:beat_guard': { shape: 'drum', body: 0xC9782E, accent: 0xFFE1A6, glow: 0xFFD7B0, outline: 0x5B2F18, eye: 0xFFFDF4 },
            'campaign_15:default': { shape: 'forge', body: 0x7A5436, accent: 0xE8C376, glow: 0xFFE6B2, outline: 0x2D1C12, eye: 0xFFF7D9 },
            'campaign_15:forge_scribe': { shape: 'forge', body: 0x845232, accent: 0xF6CC78, glow: 0xFFE0A6, outline: 0x341F12, eye: 0xFFF5DA },
            'campaign_15:shift_judge': { shape: 'forge', body: 0x4D6A88, accent: 0xD9F0FF, glow: 0xAEE7FF, outline: 0x1D2A38, eye: 0xF5FDFF },
            'campaign_16:default': { shape: 'gate', body: 0x49657B, accent: 0xB7E7FF, glow: 0xD8F4FF, outline: 0x172634, eye: 0xF8FDFF },
            'campaign_16:gate_commander': { shape: 'gate', body: 0x5A7D96, accent: 0xCFF3FF, glow: 0xDDF8FF, outline: 0x193042, eye: 0xF9FEFF },
            'campaign_16:gate_core': { shape: 'gate', body: 0x8070CE, accent: 0xE8E0FF, glow: 0xC6EBFF, outline: 0x262152, eye: 0xFFFFFF },
        };

        return appearanceMap[`${campaignId}:${visualTheme}`]
            || appearanceMap[`${campaignId}:default`]
            || { shape: 'beast', body: 0xD53B40, accent: 0xFFD36B, glow: 0xFFE79A, outline: 0x5A1717, eye: 0xFFFFFF };
    }

    private createBossTexture(campaignId: string = 'campaign_1', visualTheme: string = 'default'): string {
        const textureName = `bossEnemy_${campaignId}_${visualTheme}`;
        if (this.textures.exists(textureName)) {
            return textureName;
        }

        const appearance = this.getBossAppearance(campaignId, visualTheme);
        const graphics = this.add.graphics();
        graphics.clear();

        switch (appearance.shape) {
            case 'mask':
                graphics.fillStyle(appearance.body, 1);
                graphics.fillRoundedRect(10, 10, 44, 38, 12);
                graphics.fillStyle(appearance.accent, 0.85);
                graphics.fillTriangle(18, 10, 14, 2, 26, 8);
                graphics.fillTriangle(46, 10, 38, 8, 50, 2);
                graphics.fillStyle(appearance.glow, 0.18);
                graphics.fillEllipse(32, 26, 34, 24);
                break;
            case 'wave':
                graphics.fillStyle(appearance.body, 1);
                graphics.fillEllipse(32, 34, 38, 30);
                graphics.fillTriangle(14, 24, 2, 18, 10, 38);
                graphics.fillTriangle(50, 24, 62, 18, 54, 38);
                graphics.fillStyle(appearance.accent, 0.8);
                graphics.fillEllipse(32, 20, 30, 14);
                break;
            case 'prism':
                graphics.fillStyle(appearance.body, 1);
                graphics.beginPath();
                graphics.moveTo(32, 4);
                graphics.lineTo(54, 22);
                graphics.lineTo(44, 54);
                graphics.lineTo(20, 54);
                graphics.lineTo(10, 22);
                graphics.closePath();
                graphics.fillPath();
                graphics.fillStyle(appearance.accent, 0.38);
                graphics.fillTriangle(32, 10, 46, 24, 18, 24);
                break;
            case 'drum':
                graphics.fillStyle(appearance.body, 1);
                graphics.fillCircle(32, 30, 20);
                graphics.fillStyle(appearance.accent, 0.9);
                graphics.fillCircle(32, 30, 14);
                graphics.fillTriangle(8, 24, 2, 12, 16, 18);
                graphics.fillTriangle(56, 24, 62, 12, 48, 18);
                break;
            case 'forge':
                graphics.fillStyle(appearance.body, 1);
                graphics.fillRoundedRect(12, 12, 40, 40, 10);
                for (let index = 0; index < 8; index += 1) {
                    const angle = (Math.PI * 2 * index) / 8;
                    const toothX = 32 + Math.cos(angle) * 22;
                    const toothY = 32 + Math.sin(angle) * 22;
                    graphics.fillRect(toothX - 4, toothY - 4, 8, 8);
                }
                graphics.fillStyle(appearance.accent, 0.88);
                graphics.fillCircle(32, 32, 11);
                break;
            case 'gate':
                graphics.fillStyle(appearance.body, 1);
                graphics.fillRoundedRect(14, 8, 36, 48, 10);
                graphics.fillStyle(appearance.accent, 0.82);
                graphics.fillRoundedRect(22, 16, 20, 32, 8);
                graphics.fillRect(28, 2, 8, 12);
                break;
            default:
                graphics.fillStyle(appearance.body, 1);
                graphics.fillCircle(32, 30, 20);
                graphics.fillStyle(appearance.accent, 0.9);
                graphics.fillCircle(10, 12, 6);
                graphics.fillCircle(54, 12, 6);
                break;
        }

        graphics.fillStyle(appearance.eye, 1);
        graphics.fillEllipse(24, 28, 8, 10);
        graphics.fillEllipse(40, 28, 8, 10);
        graphics.fillStyle(0x10161D, 1);
        graphics.fillCircle(24, 29, 3);
        graphics.fillCircle(40, 29, 3);
        graphics.fillStyle(0xFFFFFF, 0.9);
        graphics.fillCircle(22, 27, 1.5);
        graphics.fillCircle(38, 27, 1.5);
        graphics.lineStyle(3, appearance.outline, 0.95);
        graphics.strokeRect(18, 38, 28, 2);

        if (appearance.shape === 'drum') {
            graphics.lineStyle(3, appearance.outline, 0.85);
            graphics.strokeCircle(32, 30, 20);
            graphics.strokeCircle(32, 30, 14);
        } else if (appearance.shape === 'prism') {
            graphics.lineStyle(3, appearance.outline, 0.95);
            graphics.beginPath();
            graphics.moveTo(32, 4);
            graphics.lineTo(54, 22);
            graphics.lineTo(44, 54);
            graphics.lineTo(20, 54);
            graphics.lineTo(10, 22);
            graphics.closePath();
            graphics.strokePath();
        } else {
            graphics.lineStyle(3, appearance.outline, 0.9);
            graphics.strokeCircle(32, 32, 22);
        }

        graphics.generateTexture(textureName, 64, 64);
        graphics.destroy();
        return textureName;
    }

    // 获取当前战役ID
    private getCampaignId(): string {
        // 检查是否是自定义关卡/测试模式
        if ((this.levelData as any).isCustomLevel || (this.levelData as any).isTestMode) {
            return 'custom';
        }

        // 从levelData中获取战役ID
        const levelId = (this.levelData as any).id || '';
        if (levelId.startsWith('custom')) return 'custom';
        if (levelId.startsWith('level_1_')) return 'campaign_1';
        if (levelId.startsWith('level_2_')) return 'campaign_2';
        if (levelId.startsWith('level_3_')) return 'campaign_3';
        if (levelId.startsWith('level_4_')) return 'campaign_4';
        if (levelId.startsWith('level_5_')) return 'campaign_5';
        if (levelId.startsWith('level_6_')) return 'campaign_6';
        if (levelId.startsWith('level_7_')) return 'campaign_7';
        if (levelId.startsWith('level_8_')) return 'campaign_8';
        if (levelId.startsWith('level_9_')) return 'campaign_9';
        if (levelId.startsWith('level_10_')) return 'campaign_10';
        if (levelId.startsWith('level_11_')) return 'campaign_11';
        if (levelId.startsWith('level_12_')) return 'campaign_12';
        if (levelId.startsWith('level_13_')) return 'campaign_13';
        if (levelId.startsWith('level_14_')) return 'campaign_14';
        if (levelId.startsWith('level_15_')) return 'campaign_15';
        if (levelId.startsWith('level_16_')) return 'campaign_16';
        return 'campaign_1';
    }

    // 获取Boss大小
    private getBossSize(campaignId: string): number {
        const BOSS_SIZES: Record<string, number> = {
            custom: 64,  // 自定义关卡Boss默认大小
            campaign_1: 60,
            campaign_2: 70,
            campaign_3: 80,
            campaign_4: 75,
            campaign_5: 65,
            campaign_6: 90,
            campaign_7: 70,
            campaign_8: 65,
            campaign_9: 100,
            campaign_10: 85,
            campaign_11: 80,
            campaign_12: 82,
            campaign_13: 84,
            campaign_14: 86,
            campaign_15: 88,
            campaign_16: 92,
        };
        return BOSS_SIZES[campaignId] || 60;
    }

    // 🎊 Boss名称（战役1-9用原名，战役10用年兽，自定义关卡用通用名）
    private getBossName(campaignId: string): string {
        const BOSS_NAMES: Record<string, string> = {
            custom: '👹 自定义Boss',
            campaign_1: '👹 古街守护者',
            campaign_2: '🤖 机械博士',
            campaign_3: '🌊 水龙王',
            campaign_4: '⚔️ 战神将军',
            campaign_5: '⏰ 时间博士',
            campaign_6: '🦾 机甲统领',
            campaign_7: '🔥 火焰博士',
            campaign_8: '🧪 分子怪博士',
            campaign_9: '⚗️ 酸液博士',
            campaign_10: '🐲 终极年兽',
            campaign_11: '🌀 幻门守卫',
            campaign_12: '🧱 坠门守卫',
            campaign_13: '🪞 镜门守卫',
            campaign_14: '🎼 节拍守卫',
            campaign_15: '🛠️ 工坊守卫',
            campaign_16: '🚪 终门守卫',
        };
        return BOSS_NAMES[campaignId] || '👹 Boss';
    }

    // 颜色加深函数
    private darkenColor(color: number, factor: number): number {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;

        const newR = Math.floor(r * factor);
        const newG = Math.floor(g * factor);
        const newB = Math.floor(b * factor);

        return (newR << 16) | (newG << 8) | newB;
    }

    // 🎊 新年主题：金元宝
    private createCoinTexture(): string {
        const graphics = this.add.graphics();
        // 金元宝形状
        graphics.fillStyle(0xFFD700, 1);
        // 元宝上半部分（弧形）
        graphics.fillEllipse(10, 8, 16, 8);
        // 元宝下半部分（梯形）
        graphics.beginPath();
        graphics.moveTo(2, 10);
        graphics.lineTo(18, 10);
        graphics.lineTo(16, 16);
        graphics.lineTo(4, 16);
        graphics.closePath();
        graphics.fill();
        // 高光
        graphics.fillStyle(0xFFEA00, 0.6);
        graphics.fillCircle(7, 7, 3);
        // 金色边框
        graphics.lineStyle(1, 0xFFAA00, 1);
        graphics.strokeEllipse(10, 8, 16, 8);
        graphics.generateTexture('coinItem', 20, 20);
        graphics.destroy();
        return 'coinItem';
    }

    private createGemTexture(): string {
        // 🎊 新年主题：红包
        const graphics = this.add.graphics();
        // 红包主体
        graphics.fillStyle(0xDC143C, 1);
        graphics.fillRect(3, 2, 14, 16);
        // 金色边框
        graphics.lineStyle(2, 0xFFD700, 1);
        graphics.strokeRect(3, 2, 14, 16);
        // 金色封口
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillRect(3, 6, 14, 3);
        // 金色"福"字（简化为金色圆点）
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillCircle(10, 12, 3);
        graphics.generateTexture('gemItem', 20, 20);
        graphics.destroy();
        return 'gemItem';
    }

    private createKeyTexture(): string {
        // 🎊 新年主题：金钥匙带红绳
        const graphics = this.add.graphics();
        // 红绳
        graphics.fillStyle(0xDC143C, 1);
        graphics.fillCircle(4, 4, 3);
        // 金色钥匙头
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillCircle(6, 6, 4);
        // 金色钥匙身
        graphics.fillRect(6, 6, 10, 2);
        graphics.fillRect(14, 4, 2, 2);
        graphics.fillRect(14, 8, 2, 2);
        graphics.lineStyle(1, 0xffaa00, 1);
        graphics.strokeCircle(6, 6, 4);
        graphics.generateTexture('keyItem', 20, 20);
        graphics.destroy();
        return 'keyItem';
    }

    private createClueTexture(): string {
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffeecc, 1);
        graphics.fillRect(2, 2, 16, 16);
        graphics.lineStyle(1, 0x8b4513, 1);
        graphics.strokeRect(2, 2, 16, 16);
        graphics.lineStyle(1, 0x000000, 0.5);
        graphics.lineBetween(5, 6, 15, 6);
        graphics.lineBetween(5, 10, 15, 10);
        graphics.lineBetween(5, 14, 15, 14);
        graphics.generateTexture('clueItem', 20, 20);
        graphics.destroy();
        return 'clueItem';
    }

    // 🎊 新年主题：烟花星
    private createDashStarTexture(): string {
        const graphics = this.add.graphics();
        // 红金渐变星星
        graphics.fillGradientStyle(0xDC143C, 0xFFD700, 0xFFD700, 0xDC143C, 1);
        // 绘制五角星
        const cx = 10, cy = 10, outerR = 9, innerR = 4;
        graphics.beginPath();
        for (let i = 0; i < 5; i++) {
            const outerAngle = (i * 72 - 90) * Math.PI / 180;
            const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
            const ox = cx + Math.cos(outerAngle) * outerR;
            const oy = cy + Math.sin(outerAngle) * outerR;
            const ix = cx + Math.cos(innerAngle) * innerR;
            const iy = cy + Math.sin(innerAngle) * innerR;
            if (i === 0) {
                graphics.moveTo(ox, oy);
            } else {
                graphics.lineTo(ox, oy);
            }
            graphics.lineTo(ix, iy);
        }
        graphics.closePath();
        graphics.fill();
        // 金色边框
        graphics.lineStyle(1, 0xFFD700, 1);
        graphics.strokePath();
        // 中心金色光点
        graphics.fillStyle(0xFFEA00, 1);
        graphics.fillCircle(cx, cy, 2);
        graphics.generateTexture('dashStarItem', 20, 20);
        graphics.destroy();
        return 'dashStarItem';
    }

    // 🎊 新年主题：福字爱心血包
    private createHeartTexture(): string {
        const graphics = this.add.graphics();

        // 红色爱心 ❤ - 新年红
        graphics.fillStyle(0xDC143C, 1);

        // 绘制爱心形状
        graphics.beginPath();
        const cx = 10, cy = 10;
        // 左半圆
        graphics.arc(cx - 3, cy - 2, 5, Math.PI, 0, false);
        // 右半圆
        graphics.arc(cx + 3, cy - 2, 5, Math.PI, 0, false);
        // 底部尖角
        graphics.lineTo(cx, cy + 8);
        graphics.lineTo(cx - 8, cy - 2);
        graphics.closePath();
        graphics.fill();

        // 金色"福"字装饰（简化为金色圆点）
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillCircle(cx, cy, 3);

        // 白色高光
        graphics.fillStyle(0xffffff, 0.4);
        graphics.fillCircle(cx - 4, cy - 3, 2);

        // 金色边框
        graphics.lineStyle(1, 0xFFD700, 1);
        graphics.strokePath();

        graphics.generateTexture('heartItem', 20, 20);
        graphics.destroy();
        return 'heartItem';
    }

    private triggerQuestion(player: any, trigger: any) {
        // 检查是否已触发或正在答题
        if (!trigger.active || (trigger as any).answered || this.isAnswering) {
            return;
        }

        const questionId = (trigger as any).questionId;
        const question = this.levelData.questions.find((q: any) => q.id === questionId);

        if (!question) {
            console.warn('[PlatformGameScene] 未找到题目:', questionId);
            return;
        }

        debugLog('[PlatformGameScene] 触发答题:', question.question);

        // 标记为已触发
        (trigger as any).answered = true;

        // 使用智能暂停
        this.pauseForQuestion();

        debugLog('[PlatformGameScene] 游戏已暂停，等待答题');

        // 触发答题事件，让React组件显示题目
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('showQuestion', {
                detail: {
                    question,
                    onAnswer: (isCorrect: boolean, userAnswer: string) => {
                        this.handleQuestionAnswer(trigger, isCorrect, userAnswer);
                    }
                }
            });
            window.dispatchEvent(event);
        }
    }

    private handleQuestionAnswer(trigger: any, isCorrect: boolean, userAnswer: string) {
        debugLog('[PlatformGameScene] 收到答题结果:', isCorrect);

        // 使用智能恢复
        this.resumeFromQuestion();

        if (isCorrect) {
            debugLog('[PlatformGameScene] 答对了！');
            this.score += 50;
            this.scoreText.setText(`分数: ${this.score}`);

            // 销毁触发点
            if (trigger.questionMark) trigger.questionMark.destroy();
            trigger.destroy();

            // 执行奖励
            const reward = trigger.reward;
            if (reward === 'unlock_door') {
                // TODO: 解锁门
                debugLog('[PlatformGameScene] 解锁门');
            } else if (reward === 'give_item') {
                // TODO: 给予道具
                debugLog('[PlatformGameScene] 给予道具');
            } else if (reward === 'remove_obstacle') {
                // TODO: 移除障碍
                debugLog('[PlatformGameScene] 移除障碍');
            }

            // 显示成功提示
            const successText = this.add.text(this.player.x, this.player.y - 50, '+50分 答对了！', {
                fontSize: '20px',
                color: '#00ff00',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: successText,
                y: this.player.y - 100,
                alpha: 0,
                duration: 1500,
                onComplete: () => successText.destroy()
            });
        } else {
            debugLog('[PlatformGameScene] 答错了！');
            this.takeDamage(20);

            // 重置触发点，可以重新答题
            (trigger as any).answered = false;

            // 显示失败提示
            const failText = this.add.text(this.player.x, this.player.y - 50, '-20HP 答错了！', {
                fontSize: '20px',
                color: '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: failText,
                y: this.player.y - 100,
                alpha: 0,
                duration: 1500,
                onComplete: () => failText.destroy()
            });
        }
    }

    // 智能暂停：只暂停玩家和敌人，保持环境运行
    private pauseForQuestion() {
        debugLog('[PlatformGameScene] 智能暂停：只暂停玩家和敌人');

        // 暂停玩家
        if (this.player && this.player.body) {
            this.player.setVelocity(0, 0);
            (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
        }

        // 暂停所有敌人
        if (this.enemies) {
            this.enemies.children.entries.forEach((enemy: any) => {
                if (enemy.body) {
                    enemy.setVelocity(0, 0);
                    (enemy.body as Phaser.Physics.Arcade.Body).enable = false;
                }
            });
        }

        // 暂停子弹
        if (this.bullets) {
            this.bullets.children.entries.forEach((bullet: any) => {
                if (bullet.body) {
                    bullet.setVelocity(0, 0);
                    (bullet.body as Phaser.Physics.Arcade.Body).enable = false;
                }
            });
        }

        this.isAnswering = true;
    }

    // 智能恢复：恢复玩家和敌人
    private resumeFromQuestion() {
        debugLog('[PlatformGameScene] 智能恢复：恢复玩家和敌人');

        // 恢复玩家
        if (this.player && this.player.body) {
            (this.player.body as Phaser.Physics.Arcade.Body).enable = true;
        }

        // 恢复所有敌人
        if (this.enemies) {
            this.enemies.children.entries.forEach((enemy: any) => {
                if (enemy.body) {
                    (enemy.body as Phaser.Physics.Arcade.Body).enable = true;
                }
            });
        }

        // 恢复子弹
        if (this.bullets) {
            this.bullets.children.entries.forEach((bullet: any) => {
                if (bullet.body) {
                    (bullet.body as Phaser.Physics.Arcade.Body).enable = true;
                }
            });
        }

        this.isAnswering = false;
    }

    // 战役6特殊功能
    private setupCampaign6Features() {
        const campaignMapData = (this.levelData as any).campaignMapData;

        // 战役7禁用风区系统
        const campaignId = this.getCampaignId();
        if (campaignId === 'campaign_7') return;

        if (!campaignMapData || !campaignMapData.windZones) return;

        // 创建风区可视化和数据
        (this.player as any).windZones = campaignMapData.windZones.map((windData: any) => {
            // 创建风区可视化矩形
            const visualZone = this.add.rectangle(
                windData.x + windData.width / 2,
                windData.y + windData.height / 2,
                windData.width,
                windData.height,
                0xFFD700,  // 🎊 金色
                0.3
            );
            visualZone.setDepth(3);
            visualZone.setStrokeStyle(2, 0xFFD700, 0.8);  // 🎊 金色边框

            return {
                ...windData,
                visualZone: visualZone,
                playerInside: false
            };
        });

    }

    // 炮塔射击（追踪弹）
    private turretShoot(turret: any) {

        const bullet = this.bullets.create(turret.x, turret.y, '');
        bullet.setDisplaySize(14, 14);
        bullet.setCircle(7);

        // 追踪弹外观（橙色发光）
        const bulletGraphics = this.add.circle(turret.x, turret.y, 7, 0xff6600, 1);
        bulletGraphics.setStrokeStyle(2, 0xffaa00, 1);
        (bullet as any).graphics = bulletGraphics;
        (bullet as any).isEnemyBullet = true;
        (bullet as any).isTurretBullet = true;

        // 发光效果
        this.tweens.add({
            targets: bulletGraphics,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0.6,
            duration: 300,
            yoyo: true,
            repeat: -1
        });

        // 追踪逻辑（每帧更新方向）
        const trackingUpdate = () => {
            if (!bullet.active || !this.player.active) {
                if (bulletGraphics) bulletGraphics.destroy();
                return;
            }

            // 计算指向玩家的角度
            const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, this.player.x, this.player.y);

            // 设置速度（追踪速度）
            const speed = 180;
            bullet.setVelocityX(Math.cos(angle) * speed);
            bullet.setVelocityY(Math.sin(angle) * speed);

            // 更新图形位置
            if (bulletGraphics) {
                bulletGraphics.setPosition(bullet.x, bullet.y);
            }

            // 继续追踪
            this.time.delayedCall(50, trackingUpdate);
        };

        trackingUpdate();

        // 5秒后销毁（追踪弹持续时间更长）
        this.time.delayedCall(5000, () => {
            if (bullet.active) {
                if (bulletGraphics) bulletGraphics.destroy();
                bullet.destroy();
            }
        });
    }

    // 🔥 战役9：酸液喷射怪射击
    private acidTurretShoot(turret: any) {
        debugLog('[AcidTurret] 🧪 酸液喷射怪发射酸液弹！');
        this.playSound('enemy_shoot');

        const bullet = this.bullets.create(turret.x, turret.y, '');
        bullet.setDisplaySize(16, 16);
        bullet.setCircle(8);

        // 🎊 新年主题：烟花弹外观（红金配色）
        const bulletGraphics = this.add.circle(turret.x, turret.y, 8, 0xDC143C, 0.9);
        bulletGraphics.setStrokeStyle(3, 0xFFD700, 1);
        (bullet as any).graphics = bulletGraphics;
        (bullet as any).isEnemyBullet = true;
        (bullet as any).isAcidBullet = true;
        (bullet as any).damage = 18; // 酸液伤害

        // 酸液滴落效果
        this.tweens.add({
            targets: bulletGraphics,
            scaleX: 1.2,
            scaleY: 0.8,
            duration: 200,
            yoyo: true,
            repeat: -1
        });

        // 计算指向玩家的角度
        const angle = Phaser.Math.Angle.Between(turret.x, turret.y, this.player.x, this.player.y);

        // 设置速度（比普通子弹慢一点，但伤害高）
        const speed = 220;
        bullet.setVelocityX(Math.cos(angle) * speed);
        bullet.setVelocityY(Math.sin(angle) * speed);

        // 更新图形位置
        const updateGraphics = () => {
            if (!bullet.active) {
                if (bulletGraphics) bulletGraphics.destroy();
                return;
            }
            bulletGraphics.setPosition(bullet.x, bullet.y);
            this.time.delayedCall(16, updateGraphics);
        };
        updateGraphics();

        // 3秒后销毁
        this.time.delayedCall(3000, () => {
            if (bullet.active) {
                if (bulletGraphics) bulletGraphics.destroy();
                bullet.destroy();
            }
        });
    }

    // 🎊 新年主题：烟花喷射器
    private createAcidTurretTexture(): string {
        const key = 'acid_turret_texture';
        if (PlatformGameScene.textureCache.has(key)) return key;

        const graphics = this.add.graphics();

        // 金色底座
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillCircle(22, 22, 20);

        // 红色烟花筒主体
        graphics.fillStyle(0xDC143C, 1);
        graphics.fillCircle(22, 22, 14);

        // 金色喷嘴
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillRect(32, 18, 12, 8);

        // 彩色烟花粒子
        graphics.fillStyle(0xFF8C00, 1);
        graphics.fillCircle(40, 20, 3);
        graphics.fillStyle(0xFFEA00, 1);
        graphics.fillCircle(42, 24, 2);
        graphics.fillStyle(0xFFB6C1, 1);
        graphics.fillCircle(38, 26, 2);

        // 金色星星装饰
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillCircle(22, 22, 4);

        graphics.generateTexture(key, 45, 45);
        graphics.destroy();

        PlatformGameScene.textureCache.set(key, true);
        return key;
    }

    // 场景关闭时清理资源
    shutdown() {
        debugLog('[PlatformGameScene] 场景关闭，清理资源');

        // 清理所有补间动画
        this.tweens.killAll();

        // 清理所有定时器
        this.time.removeAllEvents();

        // 清理所有物理组
        if (this.platforms) this.platforms.clear(true, true);
        if (this.enemies) this.enemies.clear(true, true);
        if (this.collectibles) this.collectibles.clear(true, true);
        if (this.bullets) this.bullets.clear(true, true);
        if (this.questionTriggers) this.questionTriggers.clear(true, true);

        // 清理玩家
        if (this.player) {
            this.player.destroy();
            this.player = null as any;
        }

        // 清理UI元素
        if (this.scoreText) this.scoreText.destroy();
        if (this.objectiveText) this.objectiveText.destroy();
        if (this.bossHPBar) this.bossHPBar.destroy();
        if (this.bossHPBarBg) this.bossHPBarBg.destroy();
        if (this.bossNameText) this.bossNameText.destroy();
        if (this.goalGlow) this.goalGlow.destroy();

        // 重置状态
        this.isGameOver = false;
        this.isAnswering = false;
        this.isBossLevel = false;
        this.bossEnemy = null;

        debugLog('[PlatformGameScene] 资源清理完成');
    }
}
