export class DashSkill {
    private scene: Phaser.Scene;
    private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private isDashing: boolean = false;
    private canDash: boolean = true;
    private dashCooldown: number = 1000; // 1 second
    private dashDuration: number = 200; // 200ms
    private dashVelocity: number = 500;
    private lastDashTime: number = 0;

    constructor(scene: Phaser.Scene, player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        this.scene = scene;
        this.player = player;
    }

    update() {
        // Visual effect for cooldown (optional)
    }

    tryDash(direction: 'left' | 'right') {
        const currentTime = this.scene.time.now;
        if (this.canDash && !this.isDashing && currentTime - this.lastDashTime > this.dashCooldown) {
            this.executeDash(direction);
        }
    }

    private executeDash(direction: 'left' | 'right') {
        this.isDashing = true;
        this.canDash = false;
        this.lastDashTime = this.scene.time.now;

        // Apply velocity
        const velocityX = direction === 'left' ? -this.dashVelocity : this.dashVelocity;
        this.player.setVelocityX(velocityX);
        this.player.setVelocityY(0); // Maintain height during dash

        // Visual effect: Ghost trail
        this.createGhostTrail();

        // Reset after duration
        this.scene.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            this.player.setVelocityX(0); // Stop after dash (optional, or let friction handle it)

            // Cooldown reset
            this.scene.time.delayedCall(this.dashCooldown - this.dashDuration, () => {
                this.canDash = true;
            });
        });
    }

    private createGhostTrail() {
        const ghost = this.scene.add.sprite(this.player.x, this.player.y, 'player');
        ghost.setAlpha(0.5);
        ghost.setTint(0x00ffff); // Cyan tint for dash

        this.scene.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 300,
            onComplete: () => ghost.destroy()
        });

        // Create a few more ghosts during the dash
        let count = 0;
        const interval = setInterval(() => {
            if (!this.isDashing || count > 3) {
                clearInterval(interval);
                return;
            }
            const g = this.scene.add.sprite(this.player.x, this.player.y, 'player');
            g.setAlpha(0.3);
            g.setTint(0x00ffff);
            this.scene.tweens.add({
                targets: g,
                alpha: 0,
                duration: 200,
                onComplete: () => g.destroy()
            });
            count++;
        }, 50);
    }
}
