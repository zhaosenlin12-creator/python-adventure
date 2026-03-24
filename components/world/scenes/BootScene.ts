import * as Phaser from 'phaser';

// 生产环境禁用调试日志
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        debugLog('BootScene: preload started');
        try {
            const graphics = this.add.graphics();

            debugLog('BootScene: generating player texture');
            // 1. Enhanced Player Texture (Cyberpunk Character)
            graphics.clear();

            // Jetpack/Back装备 (背景层)
            graphics.fillStyle(0x333333);
            graphics.fillRect(6, 18, 4, 8);
            graphics.fillRect(22, 18, 4, 8);

            // Body (主体)
            graphics.fillStyle(0x1a1a2e); // Deep navy blue
            graphics.fillRoundedRect(8, 18, 16, 18, 3);

            // Armor plates (装甲板)
            graphics.fillStyle(0x16213e);
            graphics.fillRect(10, 20, 12, 3);
            graphics.fillRect(10, 28, 12, 3);

            // Head (头部)
            graphics.fillStyle(0x0f3460); // Darker blue
            graphics.fillRoundedRect(10, 6, 12, 12, 2);

            // Helmet glow (头盔发光边缘)
            graphics.lineStyle(1, 0x00d9ff);
            graphics.strokeRoundedRect(10, 6, 12, 12, 2);

            // Visor (面罩 - 霓虹绿)
            graphics.fillStyle(0x00ff41);
            graphics.fillRect(12, 10, 8, 4);

            // Visor glow effect
            graphics.fillStyle(0x00ff41, 0.3);
            graphics.fillRect(11, 9, 10, 6);

            // Arms (手臂)
            graphics.fillStyle(0x1a1a2e);
            graphics.fillRect(6, 22, 4, 10);
            graphics.fillRect(22, 22, 4, 10);

            // Hands (手)
            graphics.fillStyle(0x0f3460);
            graphics.fillCircle(8, 32, 2);
            graphics.fillCircle(24, 32, 2);

            // Legs (腿)
            graphics.fillStyle(0x16213e);
            graphics.fillRect(10, 36, 5, 10);
            graphics.fillRect(17, 36, 5, 10);

            // Boots (靴子)
            graphics.fillStyle(0x0f3460);
            graphics.fillRect(10, 44, 5, 4);
            graphics.fillRect(17, 44, 5, 4);

            // Energy core (能量核心)
            graphics.fillStyle(0x00d9ff);
            graphics.fillCircle(16, 26, 2);

            // Core glow
            graphics.fillStyle(0x00d9ff, 0.4);
            graphics.fillCircle(16, 26, 4);

            graphics.generateTexture('player', 32, 48);

            debugLog('BootScene: generating ground texture');
            // 2. Ground Texture
            graphics.clear();
            graphics.fillStyle(0x111111);
            graphics.fillRect(0, 0, 32, 32);
            graphics.lineStyle(2, 0x00FFFF);
            graphics.strokeRect(0, 0, 32, 32);
            graphics.fillStyle(0x008888);
            graphics.fillRect(4, 4, 8, 8);
            graphics.fillRect(20, 20, 8, 8);
            graphics.generateTexture('ground', 32, 32);

            debugLog('BootScene: generating portal texture');
            // 3. Portal Texture
            graphics.clear();
            graphics.lineStyle(4, 0xFF00FF);
            graphics.strokeCircle(16, 16, 14);
            graphics.lineStyle(2, 0xFFFFFF);
            graphics.strokeCircle(16, 16, 10);
            graphics.fillStyle(0xFF00FF, 0.2);
            graphics.fillCircle(16, 16, 8);
            graphics.generateTexture('portal', 32, 32);

            debugLog('BootScene: generating star texture');
            // 4. Star Texture
            graphics.clear();
            graphics.fillStyle(0xFFFFFF);
            graphics.fillCircle(2, 2, 2);
            graphics.generateTexture('star', 4, 4);

            debugLog('BootScene: generating particle texture');
            // 5. Particle Texture
            graphics.clear();
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle', 8, 8);

            debugLog('BootScene: generating shrine texture');
            // 6. Skill Shrine Texture
            graphics.clear();
            graphics.fillStyle(0x444444);
            graphics.fillRect(8, 8, 16, 24);
            graphics.fillStyle(0xFFD700);
            graphics.fillTriangle(16, 12, 12, 20, 20, 20);
            graphics.fillStyle(0x00FFFF, 0.8);
            graphics.fillCircle(16, 6, 4);
            graphics.generateTexture('shrine', 32, 32);

            debugLog('BootScene: generating door textures');
            // 7. Enhanced Door Textures
            // Locked Door
            graphics.clear();
            graphics.fillStyle(0x2a2a2a);
            graphics.fillRect(0, 0, 32, 64);
            graphics.fillStyle(0x1a1a1a);
            graphics.fillRect(4, 4, 24, 28);
            graphics.fillRect(4, 34, 24, 26);
            graphics.fillStyle(0xff0000);
            graphics.fillRect(2, 0, 2, 64);
            graphics.fillRect(28, 0, 2, 64);
            graphics.fillStyle(0x8b0000);
            graphics.fillCircle(16, 32, 8);
            graphics.fillStyle(0xff0000);
            graphics.fillCircle(16, 32, 5);
            graphics.fillStyle(0xffff00);
            graphics.fillRect(14, 28, 4, 6);
            graphics.fillCircle(16, 28, 3);
            graphics.generateTexture('door_locked', 32, 64);

            // Open Door
            graphics.clear();
            graphics.fillStyle(0x2a2a2a);
            graphics.fillRect(0, 0, 32, 64);
            graphics.fillStyle(0x0a0a0a);
            graphics.fillRect(6, 4, 20, 28);
            graphics.fillRect(6, 34, 20, 26);
            graphics.fillStyle(0x00ff00, 0.6);
            graphics.fillRect(2, 0, 2, 64);
            graphics.fillRect(28, 0, 2, 64);
            graphics.fillStyle(0x006400);
            graphics.fillCircle(16, 32, 8);
            graphics.fillStyle(0x00ff00);
            graphics.fillCircle(16, 32, 5);
            graphics.fillStyle(0x00ff00, 0.2);
            graphics.fillRect(4, 4, 24, 56);
            graphics.generateTexture('door_open', 32, 64);

            debugLog('BootScene: generating pet placeholder texture');
            // 8. 🐾 Pet Placeholder Texture (Simple Dog)
            graphics.clear();
            // Body
            graphics.fillStyle(0xD2691E); // Brown
            graphics.fillEllipse(24, 24, 16, 12);
            // Head
            graphics.fillStyle(0xD2691E);
            graphics.fillCircle(12, 20, 10);
            // Ears
            graphics.fillStyle(0x8B4513);
            graphics.fillEllipse(8, 14, 4, 8);
            graphics.fillEllipse(16, 14, 4, 8);
            // Eyes
            graphics.fillStyle(0x000000);
            graphics.fillCircle(10, 18, 2);
            graphics.fillCircle(14, 18, 2);
            // Nose
            graphics.fillStyle(0x000000);
            graphics.fillCircle(12, 22, 2);
            // Legs
            graphics.fillStyle(0xD2691E);
            graphics.fillRect(18, 30, 3, 8);
            graphics.fillRect(24, 30, 3, 8);
            graphics.fillRect(28, 30, 3, 8);
            // Tail
            graphics.fillStyle(0xD2691E);
            graphics.fillEllipse(36, 20, 6, 4);
            graphics.generateTexture('pet-placeholder', 48, 48);

            // Audio Generation
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Jump sound
            const jumpDuration = 0.1;
            const jumpBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * jumpDuration, audioCtx.sampleRate);
            const jumpData = jumpBuffer.getChannelData(0);
            for (let i = 0; i < jumpBuffer.length; i++) {
                const t = i / audioCtx.sampleRate;
                const freq = 400 - 200 * t;
                jumpData[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / jumpDuration);
            }
            this.cache.audio.add('jump', jumpBuffer);

            // Success sound - triumphant ascending tones
            const successDuration = 0.5;
            const successBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * successDuration, audioCtx.sampleRate);
            const successData = successBuffer.getChannelData(0);
            for (let i = 0; i < successBuffer.length; i++) {
                const t = i / audioCtx.sampleRate;
                const progress = t / successDuration;
                // Three ascending notes
                const freq1 = 523.25; // C5
                const freq2 = 659.25; // E5
                const freq3 = 783.99; // G5
                let freq = freq1;
                if (progress > 0.33) freq = freq2;
                if (progress > 0.66) freq = freq3;
                const envelope = Math.sin(Math.PI * (progress % 0.33) / 0.33) * (1 - progress * 0.5);
                successData[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
            }
            this.cache.audio.add('success', successBuffer);

            // Fail sound - descending disappointed tone
            const failDuration = 0.4;
            const failBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * failDuration, audioCtx.sampleRate);
            const failData = failBuffer.getChannelData(0);
            for (let i = 0; i < failBuffer.length; i++) {
                const t = i / audioCtx.sampleRate;
                const progress = t / failDuration;
                const freq = 200 - 100 * progress; // Descending tone
                const envelope = Math.sin(Math.PI * progress) * (1 - progress * 0.8);
                failData[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
            }
            this.cache.audio.add('fail', failBuffer);

            // Background music - ambient loop
            const bgDuration = 8; // 8 second loop
            const bgBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * bgDuration, audioCtx.sampleRate);
            const bgData = bgBuffer.getChannelData(0);
            for (let i = 0; i < bgBuffer.length; i++) {
                const t = i / audioCtx.sampleRate;
                const progress = (t % 2) / 2; // 2-second cycles
                
                // Multiple harmonics for rich ambient sound
                const freq1 = 110; // A2
                const freq2 = 165; // E3
                const freq3 = 220; // A3
                
                const wave1 = Math.sin(2 * Math.PI * freq1 * t) * 0.3;
                const wave2 = Math.sin(2 * Math.PI * freq2 * t) * 0.2;
                const wave3 = Math.sin(2 * Math.PI * freq3 * t) * 0.1;
                
                const envelope = 0.5 + 0.3 * Math.sin(2 * Math.PI * progress);
                bgData[i] = (wave1 + wave2 + wave3) * envelope * 0.15; // Low volume
            }
            this.cache.audio.add('background', bgBuffer);

            debugLog('BootScene: textures and audio generated successfully');
            graphics.destroy();
        } catch (error) {
            console.error('BootScene: error in preload', error);
        }
    }

    create() {
        debugLog('BootScene: create started');
        this.scene.start('MainScene');
        debugLog('BootScene: started MainScene');
    }
}
