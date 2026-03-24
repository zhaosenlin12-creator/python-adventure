export class WallJumpSkill {
    private scene: Phaser.Scene;
    private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private canWallJump: boolean = true;
    private wallJumpCooldown: number = 500; // 500ms cooldown to prevent spamming
    private lastWallJumpTime: number = 0;

    constructor(scene: Phaser.Scene, player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        this.scene = scene;
        this.player = player;
    }

    update() {
        // Optional: Add visual cues when sliding down a wall
        if (this.isTouchingWall() && !this.player.body.touching.down) {
            // Slow down sliding
            if (this.player.body.velocity.y > 0) {
                this.player.setVelocityY(100); // Cap sliding speed
            }
        }
    }

    tryWallJump() {
        const currentTime = this.scene.time.now;
        if (this.canWallJump &&
            this.isTouchingWall() &&
            !this.player.body.touching.down &&
            currentTime - this.lastWallJumpTime > this.wallJumpCooldown) {

            this.executeWallJump();
        }
    }

    private isTouchingWall(): boolean {
        return this.player.body.blocked.left || this.player.body.blocked.right;
    }

    private executeWallJump() {
        this.lastWallJumpTime = this.scene.time.now;

        // Determine direction (jump away from wall)
        const jumpVelocityX = 300;
        const jumpVelocityY = -400;

        if (this.player.body.blocked.left) {
            this.player.setVelocityX(jumpVelocityX);
        } else {
            this.player.setVelocityX(-jumpVelocityX);
        }

        this.player.setVelocityY(jumpVelocityY);

        // Visual effect: Dust particles
        this.createDustEffect();

        // Sound effect (if available)
        // this.scene.sound.play('jump');
    }

    private createDustEffect() {
        const x = this.player.body.blocked.left ? this.player.x - 10 : this.player.x + 10;
        const y = this.player.y;

        const particles = this.scene.add.particles(x, y, 'particle', {
            speed: { min: 50, max: 100 },
            angle: this.player.body.blocked.left ? { min: -45, max: 45 } : { min: 135, max: 225 },
            scale: { start: 0.5, end: 0 },
            lifespan: 300,
            quantity: 5,
            tint: 0xcccccc
        });

        this.scene.time.delayedCall(300, () => {
            particles.destroy();
        });
    }
}
