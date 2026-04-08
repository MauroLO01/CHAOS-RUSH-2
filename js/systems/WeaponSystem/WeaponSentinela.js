export default class WeaponSentinela {
    constructor(scene, player) { }

    _useBell() {
        const scene = this.scene;
        const p = this.player;
        const radius = 120;
        const wave = scene.add.circle(p.x, p.y, radius, 0x66ccff, 0.18).setDepth(4);
        scene.enemies.children.iterate((e) => {
            if (!e || !e.active) return;
            const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
            if (d <= radius) {
                const angle = Phaser.Math.Angle.Between(p.x, p.y, e.x, e.y);
                const kb = 300 * (p.knockbackBonus || 1);
                scene.physics.velocityFromRotation(angle, kb, e.body.velocity);
                const extra = p.extraDamageOnPush || 0;
                e.takeDamage(12 + extra);
                scene.events.emit("enemyPushed", e);
            }
        });
        this.startCooldown("sinoPurificacao", 1400);
        scene.time.delayedCall(260, () => {
            if (wave && wave.destroy) wave.destroy();
        });
    }
}
