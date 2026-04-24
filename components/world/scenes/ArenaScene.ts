import * as Phaser from 'phaser';
import { ArenaChallenge, getArenaChallengeById, getArenaChallengesByDifficulty } from '@/types/arena';
import { touchInputManager, TouchInputState } from '@/lib/input/TouchInputManager';
import { getArenaRewardClaimsUsed, ARENA_DAILY_DIAMOND_LIMIT } from '@/lib/arenaRewards';
import { ARENA_CONTROLS_HINT } from '@/lib/gameplayText';

// 生产环境禁用调试日志
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

export class ArenaScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private moveKeys!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };
    private interactKey!: Phaser.Input.Keyboard.Key;
    private currentChallenge: ArenaChallenge | null = null;
    private timeRemaining: number = 0;
    private timerText!: Phaser.GameObjects.Text;
    private globalTimerText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private challengeText!: Phaser.GameObjects.Text;
    private canDoubleJump: boolean = false;
    private jumpCount: number = 0;
    private lastJumpTime: number = 0;
    private isNearChallenge: boolean = false;
    private timerEvent: Phaser.Time.TimerEvent | null = null;
    private arenaTimerEvent: Phaser.Time.TimerEvent | null = null;
    private arenaTimerRemaining: number = 180;
    // 🔥 新增：挑战完成冷却期，防止重复触发
    private isInChallengeCooldown: boolean = false;
    private challengeZones: Phaser.GameObjects.Zone[] = [];
    // 🔥 保存绑定的事件处理函数引用，用于正确移除事件监听器
    private boundHandleCompleted: ((e: Event) => void) | null = null;
    private boundHandleFailed: ((e: Event) => void) | null = null;
    private boundHandleClosed: ((e: Event) => void) | null = null;
    private lastCompletionKey: string | null = null;
    private lastCompletionAt: number = 0;
    private stationChallenges: ArenaChallenge[] = [];
    
    // 🔥 触控输入状态追踪
    private lastTouchState: TouchInputState = {
        left: false, right: false, up: false, down: false,
        jump: false, attack: false, interact: false, dash: false, timestamp: 0
    };

    constructor() {
        super({ key: 'ArenaScene' });
    }

    private pickStationChallenges(): ArenaChallenge[] {
        return ['easy', 'medium', 'hard'].map((difficulty) => {
            const pool = getArenaChallengesByDifficulty(difficulty as ArenaChallenge['difficulty']);
            return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
        });
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // 🔥 初始化状态
        this.challengeZones = [];
        this.isInChallengeCooldown = false;
        this.currentChallenge = null;
        this.stationChallenges = this.pickStationChallenges();

        // 确保音效已加载（如果没有经过BootScene）
        if (!this.cache.audio.exists('success')) {
            debugLog('[ArenaScene] Generating audio...');
            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                
                // Success sound
                const successDuration = 0.5;
                const successBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * successDuration, audioCtx.sampleRate);
                const successData = successBuffer.getChannelData(0);
                for (let i = 0; i < successBuffer.length; i++) {
                    const t = i / audioCtx.sampleRate;
                    const progress = t / successDuration;
                    const freq1 = 523.25;
                    const freq2 = 659.25;
                    const freq3 = 783.99;
                    let freq = freq1;
                    if (progress > 0.33) freq = freq2;
                    if (progress > 0.66) freq = freq3;
                    const envelope = Math.sin(Math.PI * (progress % 0.33) / 0.33) * (1 - progress * 0.5);
                    successData[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
                }
                this.cache.audio.add('success', successBuffer);

                // Fail sound
                const failDuration = 0.4;
                const failBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * failDuration, audioCtx.sampleRate);
                const failData = failBuffer.getChannelData(0);
                for (let i = 0; i < failBuffer.length; i++) {
                    const t = i / audioCtx.sampleRate;
                    const progress = t / failDuration;
                    const freq = 200 - 100 * progress;
                    const envelope = Math.sin(Math.PI * progress) * (1 - progress * 0.8);
                    failData[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
                }
                this.cache.audio.add('fail', failBuffer);

                debugLog('[ArenaScene] Audio generated');
            } catch (e) {
                console.error('[ArenaScene] Failed to generate audio:', e);
            }
        }

        // Background
        this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

        // Title
        this.add.text(width / 2, 30, '🏆 竞技场', {
            fontSize: '32px',
            color: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Score display
        this.scoreText = this.add.text(20, 20, '', {
            fontSize: '18px',
            color: '#ffffff'
        });
        this.updateScoreDisplay();

        // Timer
        this.timerText = this.add.text(width - 20, 20, '挑战时间: --', {
            fontSize: '20px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(1, 0);

        this.globalTimerText = this.add.text(width - 20, 50, '竞技剩余: 120s', {
            fontSize: '18px',
            color: '#00ffea',
            fontStyle: 'bold'
        }).setOrigin(1, 0);

        // Challenge info
        this.challengeText = this.add.text(width / 2, 80, `${ARENA_CONTROLS_HINT} | 通关可拿积分和钻石`, {
            fontSize: '16px',
            color: '#00ff00',
            backgroundColor: '#000000aa',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);

        // Create platforms
        this.platforms = this.physics.add.staticGroup();

        // Ground
        this.platforms.create(width / 2, height - 32, 'ground').setScale(20, 1).refreshBody();

        // Challenge platforms - lowered and spread out
        this.platforms.create(300, height - 120, 'ground').setScale(3, 1).refreshBody();
        this.platforms.create(width / 2, height - 120, 'ground').setScale(3, 1).refreshBody();
        this.platforms.create(width - 300, height - 120, 'ground').setScale(3, 1).refreshBody();

        // Player
        this.player = this.physics.add.sprite(width / 2, height - 100, 'player');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);

        // Physics
        this.physics.add.collider(this.player, this.platforms);

        // Input
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.moveKeys = this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D,
            }) as typeof this.moveKeys;
            this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        }

        // Check if player has double jump skill from window global
        if (typeof window !== 'undefined' && (window as any).__gameStore) {
            const skills = (window as any).__gameStore.getState().skills;
            if (skills && skills.includes('double_jump')) {
                this.canDoubleJump = true;
            }
        }

        // Listen for skill unlock events
        this.game.events.on('skill-unlocked', (skillId: string) => {
            if (skillId === 'double_jump') {
                this.canDoubleJump = true;
            }
        });

        // Camera follow player
        this.cameras.main.setBounds(0, 0, width, height);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // Create challenge stations - spread out horizontally
        this.createChallengeStation(300, height - 170, this.stationChallenges[0]);
        this.createChallengeStation(width / 2, height - 170, this.stationChallenges[1]);
        this.createChallengeStation(width - 300, height - 170, this.stationChallenges[2]);

        // Back button
        const backButton = this.add.text(20, height - 40, '← 返回大厅', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 }
        }).setInteractive();

        backButton.on('pointerdown', () => {
            this.scene.start('MainScene');
        });

        // Leaderboard button
        const leaderboardButton = this.add.text(width - 150, height - 40, '🏆 排行榜', {
            fontSize: '16px',
            color: '#FFD700',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 }
        }).setInteractive();

        leaderboardButton.on('pointerdown', () => {
            if (typeof window !== 'undefined') {
                // 触发竞技场专用排行榜
                window.dispatchEvent(new Event('open-arena-leaderboard'));
            }
        });

        // Listen for challenge events from both game events and window events
        this.game.events.on('challenge-completed', this.onChallengeCompleted, this);
        this.game.events.on('challenge-closed', this.onChallengeClosed, this);
        this.game.events.on('challenge-failed', this.onExternalChallengeFailed, this);

        // Also listen to window events as backup
        // 🔥 保存绑定的函数引用，以便正确移除
        if (typeof window !== 'undefined') {
            this.boundHandleCompleted = this.handleWindowChallengeCompleted.bind(this);
            this.boundHandleFailed = this.handleWindowChallengeFailed.bind(this);
            this.boundHandleClosed = this.handleWindowChallengeClosed.bind(this);
            window.addEventListener('arena-challenge-completed', this.boundHandleCompleted);
            window.addEventListener('arena-challenge-failed', this.boundHandleFailed);
            window.addEventListener('arena-challenge-closed', this.boundHandleClosed);
            
            // 🔥 监听模态框关闭事件，重置按键状态
            window.addEventListener('modal-closed', () => {
                this.resetKeyboardState();
            });
        }

        this.startArenaTimer();
    }

    handleWindowChallengeCompleted(e: Event) {
        const customEvent = e as CustomEvent;
        debugLog('[ArenaScene] Window event received:', customEvent.detail);
        this.onChallengeCompleted(customEvent.detail);
    }

    handleWindowChallengeFailed(e: Event) {
        this.failChallenge();
    }

    handleWindowChallengeClosed(e: Event) {
        this.onChallengeClosed();
    }
    
    resetKeyboardState() {
        // 🔥 强制重置所有按键状态，防止按键残留
        if (this.input.keyboard) {
            // 重置所有方向键
            this.cursors.up.isDown = false;
            this.cursors.down.isDown = false;
            this.cursors.left.isDown = false;
            this.cursors.right.isDown = false;
            if (this.moveKeys) {
                this.moveKeys.up.isDown = false;
                this.moveKeys.down.isDown = false;
                this.moveKeys.left.isDown = false;
                this.moveKeys.right.isDown = false;
            }
            if (this.interactKey) this.interactKey.isDown = false;
            
            // 清除按键队列
            this.input.keyboard.resetKeys();
        }
        debugLog('[ArenaScene] 按键状态已重置');
    }

    startArenaTimer() {
        this.arenaTimerRemaining = 120;
        this.updateArenaTimerText();
        if (this.arenaTimerEvent) {
            this.arenaTimerEvent.remove();
        }
        this.arenaTimerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.arenaTimerRemaining--;
                this.updateArenaTimerText();
                if (this.arenaTimerRemaining <= 0) {
                    this.endArenaSession();
                }
            },
            callbackScope: this,
            loop: true
        });
    }

    updateArenaTimerText() {
        this.globalTimerText.setText(`竞技剩余: ${Math.max(this.arenaTimerRemaining, 0)}s`);
    }

    endArenaSession() {
        if (this.arenaTimerEvent) {
            this.arenaTimerEvent.remove();
            this.arenaTimerEvent = null;
        }

        this.showResult('竞技时间结束', '即将返回大厅', '#ffff00');
        this.time.delayedCall(1500, () => {
            this.scene.start('MainScene');
        });
    }

    createChallengeStation(x: number, y: number, challenge: ArenaChallenge) {
        // Difficulty colors
        const difficultyColor = challenge.difficulty === 'easy' ? 0x00ff00
            : challenge.difficulty === 'medium' ? 0xffff00
                : 0xff0000;

        const difficultyColorHex = challenge.difficulty === 'easy' ? '#00ff00'
            : challenge.difficulty === 'medium' ? '#ffff00'
                : '#ff0000';

        // Create glowing platform base
        const platformGlow = this.add.rectangle(x, y + 20, 100, 10, difficultyColor, 0.3);
        this.tweens.add({
            targets: platformGlow,
            alpha: 0.6,
            yoyo: true,
            repeat: -1,
            duration: 1000
        });

        // Main station circle with gradient effect
        const outerCircle = this.add.circle(x, y, 40, difficultyColor, 0.2);
        const middleCircle = this.add.circle(x, y, 30, difficultyColor, 0.4);
        const innerCircle = this.add.circle(x, y, 20, difficultyColor, 0.8);

        // Pulsing animation for circles
        this.tweens.add({
            targets: [outerCircle, middleCircle, innerCircle],
            scale: 1.1,
            alpha: 0.9,
            yoyo: true,
            repeat: -1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        // Challenge icon (trophy emoji)
        const icon = this.add.text(x, y, '🏆', {
            fontSize: '24px'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: icon,
            y: y - 5,
            yoyo: true,
            repeat: -1,
            duration: 1500,
            ease: 'Sine.easeInOut'
        });

        // Title with better styling
        const title = this.add.text(x, y - 70, challenge.title, {
            fontSize: '16px',
            color: difficultyColorHex,
            backgroundColor: '#000000dd',
            padding: { x: 10, y: 5 },
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Points badge
        const pointsBg = this.add.rectangle(x, y - 45, 80, 25, 0xFFD700, 0.8);
        pointsBg.setStrokeStyle(2, 0xFFA500);

        const pointsText = this.add.text(x, y - 45, `${challenge.points}分`, {
            fontSize: '14px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Difficulty badge
        const difficultyText = challenge.difficulty === 'easy' ? '简单'
            : challenge.difficulty === 'medium' ? '中等'
                : '困难';

        const difficultyBadge = this.add.text(x, y + 50, difficultyText, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: difficultyColorHex,
            padding: { x: 8, y: 3 },
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Interaction zone - use static body like MainScene portals
        const zone = this.add.zone(x, y, 120, 120);
        this.physics.add.existing(zone, true); // Static body

        // Store challenge reference in zone data
        zone.setData('challenge', challenge);
        zone.setData('triggered', false);
        
        // 🔥 保存区域引用，用于后续重置
        this.challengeZones.push(zone);

        this.physics.add.overlap(this.player, zone, () => {
            this.isNearChallenge = true;
            // 🔥 修复：增加更多条件防止重复触发
            // 1. 必须按上键或触控跳跃
            // 2. 当前没有进行中的挑战
            // 3. 该区域没有被触发过（或已完成冷却）
            // 4. 不在挑战完成的冷却期内
            const touchState = touchInputManager.getState();
            const wantsInteract = this.interactKey?.isDown || touchState.interact;
            if (wantsInteract && 
                !this.currentChallenge && 
                !zone.getData('triggered') &&
                !this.isInChallengeCooldown) {
                zone.setData('triggered', true);
                this.startChallenge(challenge);
                // 🔥 不要在这里重置 triggered，等挑战完成后再重置
            }
        });

        // Interactive hint
        const hint = this.add.text(x, y + 70, 'F / 触控键开始挑战', {
            fontSize: '12px',
            color: '#00ffff',
            backgroundColor: '#000000cc',
            padding: { x: 6, y: 3 },
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: hint,
            alpha: 0.4,
            scale: 1.05,
            yoyo: true,
            repeat: -1,
            duration: 600
        });
    }

    startChallenge(challenge: ArenaChallenge) {
        this.currentChallenge = challenge;
        this.timeRemaining = challenge.timeLimit;

        this.challengeText.setText(`挑战: ${challenge.title}`);

        // Dispatch event to open challenge modal
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-arena-challenge', {
                detail: { challenge }
            }));
        }

        // Start timer and store reference
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    updateTimer() {
        if (!this.currentChallenge) return;

        this.timeRemaining--;
        this.timerText.setText(`挑战时间: ${this.timeRemaining}s`);

        if (this.timeRemaining <= 0) {
            this.failChallenge();
        }
    }

    onChallengeCompleted(data: { challengeId: string; timeUsed: number; codeLength: number }) {
        debugLog('[ArenaScene] onChallengeCompleted called', data);
        debugLog('[ArenaScene] Current challenge:', this.currentChallenge);
        const completionKey = `${data.challengeId}:${data.timeUsed}:${data.codeLength}`;
        const now = Date.now();
        if (this.lastCompletionKey === completionKey && now - this.lastCompletionAt < 3000) {
            debugLog('[ArenaScene] Duplicate completion ignored:', completionKey);
            return;
        }
        if (this.isInChallengeCooldown) {
            debugLog('[ArenaScene] Completion ignored due to cooldown');
            return;
        }
        this.lastCompletionKey = completionKey;
        this.lastCompletionAt = now;
        this.isInChallengeCooldown = true;

        // Find the challenge if not already set
        const challenge = this.currentChallenge ?? getArenaChallengeById(data.challengeId) ?? null;

        if (!challenge) {
            console.error('[ArenaScene] No challenge found for completion, challengeId:', data.challengeId);
            return;
        }

        debugLog('[ArenaScene] Processing completion for challenge:', challenge.title);

        // Stop timer
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }

        // Calculate bonus points
        const timeBonus = Math.max(0, this.timeRemaining * 10);
        const efficiencyBonus = data.codeLength < 10 ? 50 : 0;
        const totalPoints = challenge.points + timeBonus + efficiencyBonus;

        debugLog('[ArenaScene] Calculated points:', {
            base: challenge.points,
            timeBonus,
            efficiencyBonus,
            total: totalPoints
        });

        // Update store
        if (typeof window !== 'undefined' && (window as any).__gameStore) {
            const store = (window as any).__gameStore.getState();
            if (store.addArenaScore) store.addArenaScore(totalPoints);
            if (store.completeChallenge) store.completeChallenge(challenge.id);
            if (store.submitScore) {
                store.submitScore({
                    challengeId: challenge.id,
                    score: totalPoints,
                    timeUsed: data.timeUsed,
                    codeLength: data.codeLength
                });
            }
        }

        // Play success sound with confetti effect
        debugLog('[ArenaScene] About to play success sound and show animation');
        let isMuted = false;
        if (typeof window !== 'undefined' && (window as any).__soundStore) {
            isMuted = (window as any).__soundStore.getState().isMuted || false;
        }
        if (!isMuted) {
            try {
                this.sound.play('success', { volume: 0.5 });
                debugLog('[ArenaScene] Success sound played');
            } catch (e) {
                console.error('[ArenaScene] Error playing sound:', e);
            }
        }

        // Show big success animation in center
        try {
            this.showSuccessAnimation(totalPoints);
            debugLog('[ArenaScene] Success animation triggered');
        } catch (e) {
            console.error('[ArenaScene] Error showing animation:', e);
        }

        // Reset state
        this.currentChallenge = null;
        
        // 🔥 设置冷却期，防止立即重复触发
        this.time.delayedCall(3000, () => {
            this.isInChallengeCooldown = false;
            // 重置所有挑战区域的 triggered 状态
            this.challengeZones.forEach(zone => {
                zone.setData('triggered', false);
            });
        });
        this.isNearChallenge = false;
        this.timerText.setText('挑战时间: --');
        this.challengeText.setText(`${ARENA_CONTROLS_HINT} | 继续挑战可冲分，今日钻石有上限`);
        this.updateScoreDisplay();
    }

    failChallenge() {
        if (!this.currentChallenge) return;

        // Stop timer
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }

        // Play fail sound
        let isMuted = false;
        if (typeof window !== 'undefined' && (window as any).__soundStore) {
            isMuted = (window as any).__soundStore.getState().isMuted || false;
        }
        if (!isMuted) {
            try {
                this.sound.play('fail', { volume: 0.4 });
            } catch (e) {
                console.error('[ArenaScene] Error playing fail sound:', e);
            }
        }

        this.showResult('时间到！', '挑战失败', '#ff0000');
        this.currentChallenge = null;
        this.isNearChallenge = false;
        this.timerText.setText('挑战时间: --');
        this.challengeText.setText(`${ARENA_CONTROLS_HINT} | 失败不扣分，调整后再试`);
        
        // 🔥 设置冷却期，防止立即重复触发
        this.isInChallengeCooldown = true;
        this.time.delayedCall(2000, () => {
            this.isInChallengeCooldown = false;
            // 重置所有挑战区域的 triggered 状态
            this.challengeZones.forEach(zone => {
                zone.setData('triggered', false);
            });
        });
    }

    onExternalChallengeFailed() {
        this.failChallenge();
    }

    onChallengeClosed() {
        if (this.currentChallenge) {
            // Stop timer
            if (this.timerEvent) {
                this.timerEvent.remove();
                this.timerEvent = null;
            }

            this.currentChallenge = null;
            this.isNearChallenge = false;
            this.timerText.setText('挑战时间: --');
            this.challengeText.setText(`${ARENA_CONTROLS_HINT} | 选下一题继续冲分`);
            
            // 🔥 设置冷却期，防止立即重复触发
            this.isInChallengeCooldown = true;
            this.time.delayedCall(2000, () => {
                this.isInChallengeCooldown = false;
                // 重置所有挑战区域的 triggered 状态
                this.challengeZones.forEach(zone => {
                    zone.setData('triggered', false);
                });
            });
        }
    }

    showSuccessAnimation(points: number) {
        const { width, height } = this.cameras.main;

        // Create success title
        const successTitle = this.add.text(width / 2, height / 2 - 40, '🎉 挑战成功！', {
            fontSize: '48px',
            color: '#00ff00',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 6, stroke: true, fill: true }
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

        // Create points display
        const pointsText = this.add.text(width / 2, height / 2 + 20, `+${points} 分`, {
            fontSize: '56px',
            color: '#ffff00',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 6, stroke: true, fill: true }
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

        // Animate title
        this.tweens.add({
            targets: successTitle,
            scale: { from: 0.3, to: 1.2 },
            alpha: { from: 0, to: 1 },
            duration: 400,
            ease: 'Back.out'
        });

        // Animate points with delay
        this.tweens.add({
            targets: pointsText,
            scale: { from: 0.3, to: 1.3 },
            alpha: { from: 0, to: 1 },
            duration: 500,
            delay: 200,
            ease: 'Elastic.out',
            onComplete: () => {
                // Fade out both after showing
                this.tweens.add({
                    targets: [successTitle, pointsText],
                    alpha: 0,
                    y: '-=80',
                    duration: 1000,
                    delay: 1500,
                    ease: 'Power2',
                    onComplete: () => {
                        successTitle.destroy();
                        pointsText.destroy();
                    }
                });
            }
        });

        // Add particle effects
        this.createSuccessParticles(width / 2, height / 2);
    }

    createSuccessParticles(x: number, y: number) {
        // Create simple particle effect using circles
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const distance = 100 + Math.random() * 50;
            const particle = this.add.circle(x, y, 8, 0xffff00).setDepth(99);
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                scale: 0,
                duration: 800 + Math.random() * 400,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    showResult(title: string, message: string, color: string) {
        const { width, height } = this.cameras.main;

        const resultText = this.add.text(width / 2, height / 2, `${title}\n${message}`, {
            fontSize: '48px',
            color: color,
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 5, stroke: true, fill: true }
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

        this.tweens.add({
            targets: resultText,
            scale: { from: 0.5, to: 1.2 },
            alpha: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                this.tweens.add({
                    targets: resultText,
                    y: height / 2 - 100,
                    alpha: 0,
                    duration: 1500,
                    delay: 1000,
                    onComplete: () => resultText.destroy()
                });
            }
        });
    }

    updateScoreDisplay() {
        let score = 0;
        let highScore = 0;
        let rewardClaimsUsed = 0;
        if (typeof window !== 'undefined' && (window as any).__gameStore) {
            const state = (window as any).__gameStore.getState();
            score = state.arenaScore || 0;
            highScore = state.arenaHighScore || 0;
            rewardClaimsUsed = getArenaRewardClaimsUsed(state.completedChallenges || []);
        }
        this.scoreText.setText(`积分: ${score} | 最高: ${highScore} | 今日钻石: ${rewardClaimsUsed}/${ARENA_DAILY_DIAMOND_LIMIT}`);
    }

    handleJump() {
        const currentTime = this.time.now;

        // Debounce jump - prevent rapid fire
        if (currentTime - this.lastJumpTime < 200) {
            return;
        }

        // First jump - on ground
        if (this.player.body?.touching.down) {
            this.player.setVelocityY(-330);
            this.jumpCount = 1;
            this.lastJumpTime = currentTime;
        }
        // Double jump - in air
        else if (this.canDoubleJump && this.jumpCount < 2) {
            this.player.setVelocityY(-300);
            this.jumpCount = 2;
            this.lastJumpTime = currentTime;

            // Visual effect
            const particles = this.add.particles(this.player.x, this.player.y + 20, 'particle', {
                speed: 50,
                scale: { start: 0.5, end: 0 },
                lifespan: 300,
                quantity: 10,
                tint: 0x00FFFF
            });

            this.time.delayedCall(400, () => {
                particles.destroy();
            });
        }
    }

    update() {
        if (!this.cursors) return;

        // 获取触控输入状态
        const touchState = touchInputManager.getState();
        
        // 合并键盘和触控输入
        const inputLeft = this.cursors.left.isDown || this.moveKeys.left.isDown || touchState.left;
        const inputRight = this.cursors.right.isDown || this.moveKeys.right.isDown || touchState.right;
        const inputUp = this.cursors.up.isDown || this.moveKeys.up.isDown || touchState.up || touchState.jump;

        // Reset near challenge flag
        this.isNearChallenge = false;

        // 🔥 如果正在挑战中，禁用所有移动
        if (this.currentChallenge) {
            this.player.setVelocityX(0);
            return;
        }

        // Player movement - 冷却期不影响移动（支持触控）
        if (inputLeft) {
            this.player.setVelocityX(-200);
            this.player.setFlipX(true);
        } else if (inputRight) {
            this.player.setVelocityX(200);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // Handle jump ONLY if not near a challenge（支持触控）
        const touchJumpJustPressed = (touchState.up && !this.lastTouchState.up) || 
                                     (touchState.jump && !this.lastTouchState.jump);
        if ((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.moveKeys.up) || touchJumpJustPressed) && !this.isNearChallenge) {
            this.handleJump();
        }

        // Reset jump count when touching ground
        if (this.player.body?.touching.down) {
            this.jumpCount = 0;
        }
        
        // 更新触控状态追踪
        this.lastTouchState = { ...touchState };
    }

    shutdown() {
        this.game.events.off('challenge-completed', this.onChallengeCompleted, this);
        this.game.events.off('challenge-closed', this.onChallengeClosed, this);
        this.game.events.off('challenge-failed', this.onExternalChallengeFailed, this);
        
        // 🔥 使用保存的函数引用正确移除事件监听器
        if (typeof window !== 'undefined') {
            if (this.boundHandleCompleted) {
                window.removeEventListener('arena-challenge-completed', this.boundHandleCompleted);
            }
            if (this.boundHandleFailed) {
                window.removeEventListener('arena-challenge-failed', this.boundHandleFailed);
            }
            if (this.boundHandleClosed) {
                window.removeEventListener('arena-challenge-closed', this.boundHandleClosed);
            }
            
            // 🔥 触发场景切换事件，通知其他场景重置键盘状态
            window.dispatchEvent(new Event('scene-changed'));
        }
        
        // 清理定时器
        if (this.arenaTimerEvent) {
            this.arenaTimerEvent.remove();
            this.arenaTimerEvent = null;
        }
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
        
        // 清理状态
        this.challengeZones = [];
        this.boundHandleCompleted = null;
        this.boundHandleFailed = null;
        this.boundHandleClosed = null;
        this.currentChallenge = null;
        this.isInChallengeCooldown = false;
    }
}
