import * as Phaser from 'phaser';

export class SkillShrine extends Phaser.Physics.Arcade.Sprite {
    public skillId: string;
    private floatTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, skillId: string) {
        super(scene, x, y, 'shrine');
        this.skillId = skillId;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Static body (doesn't move by physics)
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);

        // Floating animation
        this.floatTween = scene.tweens.add({
            targets: this,
            y: y - 10,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add a glow effect (simple particle)
        const particles = scene.add.particles(x, y, 'particle', {
            speed: 20,
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            frequency: 500,
            tint: 0xFFD700
        });
        particles.startFollow(this);
    }

    destroy(fromScene?: boolean) {
        if (this.floatTween) this.floatTween.remove();
        super.destroy(fromScene);
    }
}
