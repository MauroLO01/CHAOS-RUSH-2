export default class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, angle, damage = 8) {
        super(scene, x, y, "pixel");

        this.scene = scene;
        this.damage = damage;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setAllowGravity(false);

        this.setDisplaySize(10, 3);
        this.setTint(0xffffff);

        const speed = 420;

        this.setRotation(angle);
        this.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );

        scene.time.delayedCall(1700, () => {
            if (this.active) this.destroy();
        });
    }

    destroySelf() {
        if (!this.scene) return;
        this.destroy(true);
    }
}
