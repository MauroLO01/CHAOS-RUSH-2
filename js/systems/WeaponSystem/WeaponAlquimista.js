const FRASCO_CONFIG = {
    VELOCITY: 400,
    LIFESPAN: 400,
    AREA_RADIUS: 60,
    AREA_TICK_RATE: 300,
    BASE_TICKS: 6,
};

function getDebuffColor(type) {
    switch (type) {
        case "fire": return 0xff7700;
        case "poison": return 0x00aa00;
        case "slow": return 0x3366ff;
        default: return 0xffffff;
    }
}

export default class WeaponAlquimista {
    constructor(scene, player, weaponSystem) {
        this.scene = scene;
        this.player = player;
        this.ws = weaponSystem;
    }

    getCooldown() {
        return 1200;
    }

    use() {
        const scene = this.scene;
        const p = this.player;

        const target = scene.getClosestEnemy(450);
        if (!target) return;

        if (!scene.textures.exists("flask")) {
            console.error("❌ Textura 'flask' não encontrada!");
            return;
        }

        const effects = ["fire", "poison", "slow"];
        const chosenEffect = effects[Math.floor(Math.random() * effects.length)];

        const slowRadiusBonus =
            chosenEffect === "slow" ? (p.stats.get("slowRadiusBonus") || 0) : 0;

        const aoe = p.stats.get("aoe") || 1;
        const finalRadius = (FRASCO_CONFIG.AREA_RADIUS + slowRadiusBonus) * aoe;

        const baseAngle = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
        const spread = Phaser.Math.FloatBetween(-0.08, 0.08);

        const flask = scene.physics.add
            .sprite(p.x, p.y, "flask")
            .setDepth(5)
            .setTint(getDebuffColor(chosenEffect));

        flask.effect = chosenEffect;

        scene.physics.velocityFromRotation(
            baseAngle + spread,
            FRASCO_CONFIG.VELOCITY * (p.stats.get("projectileSpeed") || 1),
            flask.body.velocity
        );

        flask.setAngularVelocity(300);

        // FUNÇÃO DE EXPLOSÃO
        const explode = (f) => {
            if (!f.active) return;

            this._createGroundEffect(f.x, f.y, f.effect, finalRadius);

            const boom = scene.add.circle(f.x, f.y, 20, getDebuffColor(f.effect), 0.4);

            scene.tweens.add({
                targets: boom,
                scale: 2.5,
                alpha: 0,
                duration: 200,
                onComplete: () => boom.destroy()
            });

            f.destroy();
            scene.physics.world.removeCollider(collider);
        };

        //COLISÃO
        const collider = scene.physics.add.collider(
            flask,
            scene.enemies,
            (f, enemy) => {
                if (!f.active) return;

                const baseDamage = 10 * p.stats.get("damage");
                const { damage, isCrit } = this.ws.rollCrit(baseDamage);

                enemy.takeDamage(damage);

                // 💥 FX crítico
                if (isCrit) {
                    const critFx = scene.add.circle(f.x, f.y, 20, 0xffd700, 0.4);

                    scene.tweens.add({
                        targets: critFx,
                        scale: 3,
                        alpha: 0,
                        duration: 250,
                        onComplete: () => critFx.destroy()
                    });
                }

                explode(f);
            }
        );

        // EXPLODE AUTOMÁTICO (ESSENCIAL)
        scene.time.delayedCall(FRASCO_CONFIG.LIFESPAN, () => {
            explode(flask);
        });
    }

    _createGroundEffect(x, y, effect, radius) {
        const scene = this.scene;
        const player = this.player;

        const intensity = player.stats.get("dotDamageBonus") || 1;

        const durationMultiplier = this.player.stats.get("debuffDurationMultiplier") || 1;
        const totalTicks = Math.ceil(FRASCO_CONFIG.BASE_TICKS * durationMultiplier);

        const color = getDebuffColor(effect);

        const area = scene.add
            .circle(x, y, radius, color, 0.15)
            .setStrokeStyle(2, color, 0.8)
            .setDepth(4);

        let ticks = 0;

        // PARTICLES LOOP
        const particleLoop = scene.time.addEvent({
            delay: 120,
            loop: true,
            callback: () => {
                this._spawnParticles(x, y, radius, effect, intensity, 1);
            }
        });

        const timer = scene.time.addEvent({
            delay: FRASCO_CONFIG.AREA_TICK_RATE,
            loop: true,
            callback: () => {
                ticks++;

                scene.enemies.children.iterate((e) => {
                    if (!e || !e.active) return;

                    const d = Phaser.Math.Distance.Between(e.x, e.y, x, y);
                    if (d <= radius) {
                        this._applyDebuff(e, effect);
                    }
                });

                if (ticks >= totalTicks) {
                    area.destroy();
                    particleLoop.remove();
                    timer.remove();
                }
            },
        });
    }

    _applyDebuff(enemy, effect) {
        const baseDot = 8 * (this.player.stats.get("dotDamageBonus") || 1);

        const { damage, isCrit } = this.ws.rollCrit(baseDot);

        if (effect === "fire") enemy.takeDamage(damage * 1.5);
        if (effect === "poison") enemy.takeDamage(damage + 2);

        if (effect === "slow") {
            enemy.takeDamage(Math.max(1, Math.floor(damage * 0.1)));

            if (!enemy._origSpeed) enemy._origSpeed = enemy.speed;
            const targetSpeed = Math.max(enemy._origSpeed * 0.4, 30);

            if (enemy.speed > targetSpeed) {
                enemy.speed = targetSpeed;
                this.scene.time.delayedCall(FRASCO_CONFIG.AREA_TICK_RATE + 50, () => {
                    if (enemy.active) enemy.speed = enemy._origSpeed;
                });
            }
        }
    }

    _spawnParticles(cx, cy, r, type, intensity, aoe) {
        const scene = this.scene;
        const count = Math.floor(3 * aoe);

        for (let i = 0; i < count; i++) {

            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const dist = Phaser.Math.FloatBetween(0, r);

            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;

            //  FIRE
            if (type === "fire") {
                const flame = scene.add.circle(px, py, 3 * intensity, 0xff6600)
                    .setDepth(5);

                scene.tweens.add({
                    targets: flame,
                    y: py - Phaser.Math.Between(20, 40),
                    alpha: 0,
                    scale: 0.2,
                    duration: 400,
                    ease: "Sine.Out",
                    onComplete: () => flame.destroy()
                });
            }

            //POISON
            if (type === "poison") {
                const bubble = scene.add.circle(px, py, Phaser.Math.Between(2, 5), 0x00ff88, 0.8)
                    .setDepth(5);

                scene.tweens.add({
                    targets: bubble,
                    y: py - Phaser.Math.Between(10, 30),
                    alpha: 0,
                    scale: 0.3,
                    duration: 700,
                    ease: "Sine.Out",
                    onComplete: () => bubble.destroy()
                });

                // NÉVOA
                if (Math.random() < 0.3) {
                    const cloud = scene.add.circle(px, py, 10 * intensity, 0x00aa55, 0.15);

                    scene.tweens.add({
                        targets: cloud,
                        scale: 2,
                        alpha: 0,
                        duration: 1200,
                        onComplete: () => cloud.destroy()
                    });
                }
            }

            // SLOW
            if (type === "slow") {
                const shard = scene.add.rectangle(px, py, 3, 8, 0xaaddff)
                    .setDepth(5)
                    .setAngle(Phaser.Math.Between(0, 180));

                scene.tweens.add({
                    targets: shard,
                    y: py + Phaser.Math.Between(10, 25),
                    angle: shard.angle + 90,
                    alpha: 0,
                    duration: 600,
                    onComplete: () => shard.destroy()
                });
            }
        }
    }
}