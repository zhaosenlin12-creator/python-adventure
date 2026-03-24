import * as Phaser from 'phaser';

export class LogicTrap extends Phaser.Physics.Arcade.Sprite {
    public trapId: string;
    private isActive: boolean = true;
    private fadeTween?: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, trapId: string, cycleTime: number = 3000) {
        super(scene, x, y, 'ground');
        this.trapId = trapId;

        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body

        // Scale to make it a platform
        this.setScale(3, 1);
        this.refreshBody();

        // Set tint to distinguish from normal platforms
        this.setTint(0xFF6600); // Orange color

        // Start the fade cycle
        this.startFadeCycle(cycleTime);
    }

    private startFadeCycle(cycleTime: number) {
        // Cycle: visible -> fade out -> invisible -> fade in -> visible
        this.fadeTween = this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: cycleTime / 4,
            yoyo: true,
            repeat: -1,
            onUpdate: () => {
                // Disable collision when mostly invisible
                if (this.alpha < 0.3) {
                    this.disableBody(true, false);
                    this.isActive = false;
                } else {
                    this.enableBody(true, this.x, this.y, true, true);
                    this.isActive = true;
                }
            }
        });
    }

    destroy(fromScene?: boolean) {
        if (this.fadeTween) {
            this.fadeTween.remove();
        }
        super.destroy(fromScene);
    }
}
