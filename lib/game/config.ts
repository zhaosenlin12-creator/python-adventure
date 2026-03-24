import * as Phaser from 'phaser';
import { BootScene } from '../../components/world/scenes/BootScene';
import { MainScene } from '../../components/world/scenes/MainScene';
import { ArenaScene } from '../../components/world/scenes/ArenaScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280, // Viewport width
    height: 720, // Viewport height
    parent: 'phaser-game',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 500 },
            debug: false // Set to true to see physics bodies
        }
    },
    scene: [BootScene, MainScene, ArenaScene],
    input: {
        keyboard: {
            target: window // 让键盘事件监听整个窗口，而不仅仅是canvas
        }
    }
};

