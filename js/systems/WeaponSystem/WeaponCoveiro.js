export default class WeaponCoveiro {
    constructor(scene, player, weaponSystem) {
        this.scene = scene;
        this.player = player;
        this.ws = weaponSystem;
    }

    getCooldown() {
        return 2500;
    }

    use() {
        const scene = this.scene;
        const player = this.player;

        let damageMultiplier = 1;

        if (player.isInAscension) {
            damageMultiplier = 1.5;

            if (player.ascensionCount >= 3) {
                player.extraVenomBonus = 1.5;
            }
        }

        const foice = scene.add.sprite(player.x, player.y, "foiceSprite")
            .setDepth(6)
            .setTint(0x9b7653);

        scene.physics.add.existing(foice);
        foice.body.setAllowGravity(false);
        foice.body.isSensor = true;

        const SPEED = 420;

        const target = scene.getClosestEnemy(450);
        if (!target) return;

        const angle = Phaser.Math.Angle.Between(
            player.x, player.y, target.x, target.y
        );

        scene.physics.velocityFromRotation(angle, SPEED, foice.body.velocity);

        scene.physics.add.overlap(foice, scene.enemies, (f, enemy) => {
            if (!enemy || !enemy.active) return;

            const baseDamage =
                5 *
                (player.stats.get("dotDamageBonus") || 1) *
                (player.extraVenomBonus || 1) *
                damageMultiplier;

            const { damage, isCrit } = this.ws.rollCrit(baseDamage);

            enemy.takeDamage(damage);

            if (isCrit) {
                enemy.setTint(0xffd700);
                scene.time.delayedCall(100, () => enemy.clearTint());
            }
        });

        scene.time.delayedCall(400, () => {
            foice.destroy();
        });
    }
}