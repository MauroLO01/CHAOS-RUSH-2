export default class EnemyBullet extends Phaser.GameObjects.Container {
    constructor(scene, x, y, angle, damage = 8) {
        super(scene, x, y);

        this.scene = scene;
        this.damage = damage;

        // VISUAL DO PROJÉTIL
        // Núcleo do tiro (um retângulo branquinho)
        this.core = scene.add.rectangle(0, 0, 6, 3, 0xffffff);
        this.core.setOrigin(0.5);
        this.add(this.core);

        // Rastro (um retângulo maior, com alpha)
        this.trail = scene.add.rectangle(-12, 0, 20, 2, 0xffffff, 0.35);
        this.trail.setOrigin(1, 0.5);
        this.add(this.trail);

        // Adicionar ao mundo
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // FÍSICA
        const speed = 420;

        this.rotation = angle;
        this.body.setAllowGravity(false);
        this.body.setSize(6, 3);

        this.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );

        // ANIMAÇÃO DO RASTRO
        scene.tweens.add({
            targets: this.trail,
            alpha: 0,
            duration: 140,
            ease: "linear"
        });

        // Destruir após 1.7s (segurança)
        this.lifeTimer = scene.time.delayedCall(1700, () => {
            this.destroySelf();
        });
    }

    destroySelf() {
        if (!this.scene) return;
        this.destroy(true);
    }
}
