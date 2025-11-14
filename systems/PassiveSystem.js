export default class PassiveSystem {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Decide qual passiva ativar com base na classe
     */
    activateClassAbilities(className) {
        if (!className) {
            console.warn("⚠️ Nenhum nome de classe recebido no PassiveSystem.");
            return;
        }

        const normalized = className
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z]/g, "");

        const map = {
            alquimista: () => this.activateAlquimista(),
            coveiro: () => this.activateCoveiro(),
            sentinela: () => this.activateSentinela()
        };

        for (const key in map) {
            if (normalized.includes(key)) {
                console.log(`✨ Passiva reconhecida: ${normalized}`);
                map[key]();
                return;
            }
        }

        console.warn("⚠️ Nenhuma passiva encontrada para:", normalized);
    }

    updatePassiveBar(player) {
        const scene = this.scene;
        if (!scene.passiveBar || !scene.passiveText) return;

        const percent = Math.min(player.kills / player.nextAscencionAt, 1);

        scene.passiveBar.width = 200 * percent;
        scene.passiveText.setText(`Passiva: ${Math.floor(percent * 100)}%`);

        if (percent >= 1) {
            scene.passiveText.setText("☠️ PASSIVA PRONTA!");
            scene.passiveText.setColor('#bb55ff');

            scene.tweens.add({
                targets: scene.passiveBar,
                alpha: { from: 1, to: 0.5 },
                duration: 300,
                yoyo: true,
                repeat: -1
            });
        }
    }

    activateAlquimista() {
        const scene = this.scene;
        const player = scene.player;
        if (!player || !scene.weaponSystem) return;

        player.killCount = 0;
        player.maxKillsForPassive = 40;
        player.passiveReady = false;

        const update = () => {
            const percent = Math.min(player.killCount / player.maxKillsForPassive, 1);
            scene.passiveBar.width = 200 * percent;
            scene.passiveText.setText(`Passiva: ${Math.floor(percent * 100)}%`);

            if (percent >= 1 && !player.passiveReady) {
                player.passiveReady = true;

                scene.tweens.add({
                    targets: scene.passiveBar,
                    alpha: { from: 1, to: 0.5 },
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                });

                scene.passiveText.setText("☠️ PASSIVA PRONTA!");
                scene.passiveText.setColor("#00ffaa");
            }
        };

        scene.events.on("enemyKilled", () => {
            if (!player.passiveReady) {
                player.killCount++;
                update();
            }
        });

        scene.input.keyboard.on("keydown-SPACE", () => {
            if (!player.passiveReady) return;

            scene.weaponSystem.resetAllCooldowns();
            for (let i = 0; i < 3; i++) {
                scene.time.delayedCall(i * 150, () => {
                    scene.weaponSystem._useFrasco(true);
                });
            }

            player.killCount = 0;
            player.passiveReady = false;
            scene.passiveBar.alpha = 1;
            update();
        });

        update();
    }

    activateCoveiro() {
        const scene = this.scene;
        const player = scene.player;
        if (!player) return;

        console.log("☠️ Passiva do Coveiro Ativada!");

        player.kills = 0;
        player.ascensionCount = 0;
        player.nextAscencionAt = 30;
        player.isInAscencion = false;

        // REGISTRA EVENTO CORRETAMENTE
        scene.events.on("enemyKilled", () => {
            if (player.isInAscencion) return;

            player.kills++;
            this.updatePassiveBar(player);

            if (player.kills >= player.nextAscencionAt) {
                this.activateAscensaoCarcaca(player);
            }
        });

        this.updatePassiveBar(player);
    }

    /** Ativa a ascensão (corrigida) */
    activateAscensaoCarcaca(player) {
        const scene = this.scene;

        player = player || scene.player;
        if (!player) {
            console.error("erro: o player está undefined na ascensão!");
            return;
        }

        if (player.isInAscencion) return;

        player.isInAscencion = true;
        player.ascensionCount++;

        if (player.ascensionCount === 3) {
            this.spawnAscencionZombie(scene, player);
        }

        console.log(`⚰️ Ascensão #${player.ascensionCount} iniciada!`);

        const aura = scene.add.circle(player.x, player.y, 90, 0x9933ff, 0.25)
            .setStrokeStyle(3, 0xaa55ff)
            .setDepth(1);

        const auraUpdate = scene.events.on("update", () => {
            if (aura.active) aura.setPosition(player.x, player.y);
        });

        scene.time.delayedCall(20000, () => {
            player.isInAscencion = false;
            player.kills = 0;
            player.nextAscencionAt += 30;

            aura.destroy();
            scene.events.off("update", auraUpdate);

            console.log("☠️ Ascensão terminou.");
        });

        scene.tweens.add({
            targets: player,
            scale: 1.3,
            yoyo: true,
            duration: 400,
            repeat: 3
        });
    }

    spawnAscencionZombie() {
        console.log("zumbi deu spawn");

        const zombie = scene.physics.add.sprite(player.x, player.y, "zombie")
            .setDepth(2)
            .setScale(1.1);

            zombie.maxHp = 100;
            zombie.hp = zombie.maxHp;

            zombie.setAlpha(0);
            scene.tweens.add({
                targets: zombie,
                alpha: 1,
                duration: 400
            });

        zombie.tauntRadius = 260;
        zombie.updateTaunt = scene.time.addEvent({
            delay: 300,
            loop: true,
            callback: () => {
                scene.enemies.children.each(enemy => {
                    if (!enemy.active) return;

                    const dist = Phaser.Math.Distance.Between(
                        zombie.x, zombie.y,
                        enemy.x, enemy.y
                    );

                    if (dist <= zombie.tauntRadius) {
                        enemy.setTarget(zombie);
                    }
                });
            }
        });

        zombie.takeDamage = (dmg) => {
            zombie.hp -= dmg;
            if (zombie.hp <= 0) {
                this.killascencionZombie(scene, zombie);
            }
        };

        scene.time.delayedCall(20000, () => {
            if (zombie.active) this.killascencionZombie(scene, zombie);
        });
    }

    killascencionZombie(scene, zombie) {
        if (!zombie || !zombie.active) return;

        console.log("Zumbi foi de arrasta");

        const fx = scene.add.circle(zombie.x, zombie.y, 40, 0x9933ff, 0.4)
            .setDepth(4);

        scene.tweens.add({
            targets: fx,
            radius: 180,
            alpha: 0,
            duration: 500,
            onComplete: () => fx.destroy()
        });

        zombie.updateTaunt.remove();
        zombie.destroy();
    }

    /* PASSIVA DA SENTINELA*/
    activateSentinela() {
        console.log("🔔 Passiva ativada: +knockback");

        const p = this.scene.player;
        if (!p) return;

        p.knockbackBonus = 1.3;
        p.pushDamageBonus = 1;

        const safeCircle = this.scene.add.circle(p.x, p.y, 80, 0x88ccff, 0.1);
        safeCircle.setDepth(1);

        this.scene.events.on("update", () => {
            safeCircle.x = p.x;
            safeCircle.y = p.y;
        });
    }
}
