import * as Phaser from 'phaser';

export class CodeDoor extends Phaser.Physics.Arcade.Sprite {
    public doorId: string;
    public isLocked: boolean = true;
    private label: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, doorId: string) {
        super(scene, x, y, 'door_locked');
        this.doorId = doorId;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Static body (immovable wall)
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);

        // Label
        this.label = scene.add.text(x, y - 40, 'LOCKED', {
            fontSize: '12px',
            color: '#ff0000',
            backgroundColor: '#000000aa',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
    }

    unlock() {
        if (!this.isLocked) return;

        this.isLocked = false;
        this.setTexture('door_open');
        this.label.setText('OPEN');
        this.label.setColor('#00ff00');

        // Disable collision
        (this.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;

        // Visual effect
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 500
        });
    }

    destroy(fromScene?: boolean) {
        if (this.label) this.label.destroy();
        super.destroy(fromScene);
    }
}
