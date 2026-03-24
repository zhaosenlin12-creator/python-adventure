export class GlideSkill {
    private scene: Phaser.Scene;
    private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private isGliding: boolean = false;
    private glideGravity: number = 50; // Low gravity for gliding
    private normalGravity: number = 1000; // Default gravity (approximate, will read from body)
    private glideVelocityCap: number = 50; // Max falling speed while gliding

    constructor(scene: Phaser.Scene, player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        this.scene = scene;
        this.player = player;
        // Store initial gravity if possible, or just assume a standard value
        // In Phaser Arcade physics, gravity is usually global or on the body.
        // We'll adjust velocity directly for smoother control.
    }

    update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
        if (!this.player.body) return;

        // Check if in air and falling
        const isFalling = this.player.body.velocity.y > 0;
        const isHoldingJump = cursors.up.isDown;

        if (isFalling && isHoldingJump) {
            this.startGlide();
        } else {
            this.stopGlide();
        }
    }

    private startGlide() {
        if (!this.isGliding) {
            this.isGliding = true;
            // Optional: Play glide sound
        }

        // Cap falling speed
        if (this.player.body.velocity.y > this.glideVelocityCap) {
            this.player.setVelocityY(this.glideVelocityCap);
        }

        // Visual effect: Wind particles below player
        this.createGlideEffect();
    }

    private stopGlide() {
        if (this.isGliding) {
            this.isGliding = false;
            // Stop sound
        }
    }

    private createGlideEffect() {
        // Only create particles occasionally to avoid spam
        if (this.scene.time.now % 200 > 20) return;

        const x = this.player.x + (Math.random() * 20 - 10);
        const y = this.player.y + 20;

        const particle = this.scene.add.circle(x, y, 2, 0xffffff, 0.5);

        this.scene.tweens.add({
            targets: particle,
            y: y + 20,
            alpha: 0,
            duration: 300,
            onComplete: () => particle.destroy()
        });
    }
}
