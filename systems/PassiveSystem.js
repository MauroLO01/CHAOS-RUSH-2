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

        // inicializa valores de controle
        player.kills = player.kills || 0;
        player.ascensionCount = player.ascensionCount || 0;
        player.nextAscencionAt = player.nextAscencionAt || 30;
        player.isInAscencion = player.isInAscencion || false;

        // evento que incrementa a barra ao abater inimigo
        scene.events.on("enemyKilled", () => {
            if (player.isInAscencion) return;
            player.kills = (player.kills || 0) + 1;
            this.updatePassiveBar(player);
            // não dispara ascensão automaticamente — apenas preenche a barra
        });

        // ative com SPACE — o jogador escolhe quando detonar
        scene.input.keyboard.on("keydown-SPACE", () => {
            if (!player || player.isInAscencion) return;
            if ((player.kills || 0) < (player.nextAscencionAt || 99999)) return;

            // ativa ascensão manualmente
            this.activateAscensaoCarcaca(player);
        });

        // atualiza visual inicial
        this.updatePassiveBar(player);
    }

    // ativa ascensão: recebe player (evita usar this.player)
    activateAscensaoCarcaca(player) {
        const scene = this.scene;
        if (!player) return;
        if (player.isInAscencion) return;

        player.isInAscencion = true;
        player.ascensionCount = (player.ascensionCount || 0) + 1;

        console.log(`⚰️ ASCENSÃO #${player.ascensionCount} ATIVADA`);

        // --- AURA VISUAL + PARTICULAS ---
        const auraRadius = 90;
        const aura = scene.add.circle(player.x, player.y, auraRadius, 0x9933ff, 0.18)
            .setStrokeStyle(3, 0xaa55ff)
            .setDepth(1);

        // emitter de partículas seguindo a aura (usa xp_orb como fallback)
        const partTexture = scene.textures.exists("smoke") ? "smoke" : "xp_orb";
        const auraParticles = scene.add.particles(partTexture).createEmitter({
            x: player.x,
            y: player.y,
            lifespan: { min: 400, max: 900 },
            speed: { min: -20, max: 20 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            frequency: 120,
            tint: 0xaa55ff,
            follow: aura
        });

        // Atualiza posição (para segurança se follow falhar)
        const auraUpdFn = () => {
            if (aura && aura.active) aura.setPosition(player.x, player.y);
        };
        scene.events.on("update", auraUpdFn);

        // spawn do zumbi (tier depende do ascensionCount)
        this.spawnAscencionZombie(player, scene);

        // duração da ascensão
        scene.time.delayedCall(20000, () => {
            player.isInAscencion = false;
            player.kills = 0;
            player.nextAscencionAt = (player.nextAscencionAt || 30) + 30;

            // cleanup visual
            if (aura) aura.destroy();
            if (auraParticles) {
                auraParticles.stop();
                // remove emitter after fade
                scene.time.delayedCall(800, () => auraParticles.manager?.destroy());
            }
            scene.events.off("update", auraUpdFn);

            // recomputa barra visual
            this.updatePassiveBar(player);

            console.log("☠️ Ascensão terminou.");
        });
    }

    // tiers: 1,2,3
    getZombieTier(ascCount) {
        if (ascCount >= 13) return 3;
        if (ascCount >= 7) return 2;
        return 1;
    }

    // spawnAscencionZombie: agora recebe player e scene explictamente
    spawnAscencionZombie(player, scene) {
        scene = scene || this.scene;
        player = player || scene.player;
        if (!scene || !player) return;

        const offset = 60;
        const spawnX = player.x + Phaser.Math.Between(-offset, offset);
        const spawnY = player.y + Phaser.Math.Between(-offset, offset);

        const tier = this.getZombieTier(player.ascensionCount || 0);

        // cria sprite ou fallback circle se textura não existe
        let zombie;
        if (scene.textures.exists("zombie")) {
            zombie = scene.physics.add.sprite(spawnX, spawnY, "zombie").setDepth(3).setScale(1.25);
        } else {
            zombie = scene.add.circle(spawnX, spawnY, 14, 0x3bff3b).setDepth(3);
            scene.physics.add.existing(zombie);
        }

        // garante corpo fisico
        if (zombie.body) {
            zombie.body.setCollideWorldBounds(true);
            zombie.body.setImmovable(false);
            zombie.body.setAllowGravity(false);
        }

        zombie.setAlpha(0);
        scene.tweens.add({ targets: zombie, alpha: 1, duration: 300 });

        // stats por tier
        if (tier === 1) {
            zombie.maxHp = 150;
            zombie.explosionDamage = 120;
            zombie.speed = 45;
        } else if (tier === 2) {
            zombie.maxHp = 300;
            zombie.explosionDamage = 220;
            zombie.speed = 55;
        } else {
            zombie.maxHp = 200;
            zombie.explosionDamage = 320;
            zombie.speed = 60;
            zombie.lifeSteal = 0.25;
        }
        zombie.hp = zombie.maxHp;
        zombie.tauntRadius = 240;
        zombie.isShieldZombie = true;

        // PARTICULAS (depende do tier)
        const pTex = scene.textures.exists("dark") ? "dark" : "xp_orb";
        const colors = tier === 1 ? 0x66ff66 : tier === 2 ? 0x44ff88 : 0xaa55ff;
        const particleEmitter = scene.add.particles(pTex).createEmitter({
            x: zombie.x,
            y: zombie.y,
            lifespan: { min: 500, max: 900 },
            speed: { min: -30, max: 30 },
            scale: { start: 0.45, end: 0 },
            alpha: { start: 0.6, end: 0 },
            frequency: 120,
            tint: colors,
            follow: zombie
        });

        // taunt loop: força inimigos próximos a mirar no zumbi
        const tauntEvent = scene.time.addEvent({
            delay: 300,
            loop: true,
            callback: () => {
                scene.enemies.children.each(enemy => {
                    if (!enemy || !enemy.active) return;
                    const d = Phaser.Math.Distance.Between(zombie.x, zombie.y, enemy.x, enemy.y);
                    if (d <= zombie.tauntRadius) {
                        if (typeof enemy.setTarget === "function") enemy.setTarget(zombie);
                        else enemy.target = zombie;
                    }
                });
            }
        });

        // movimento autônomo simples: anda em direção ao player frontalmente, ou persegue o inimigo mais próximo
        const moveEvent = scene.time.addEvent({
            delay: 300,
            loop: true,
            callback: () => {
                if (!zombie || !zombie.body) return;
                // procura inimigo mais próximo (para cronometrar onde o tank fica)
                let nearest = null;
                let minDist = Infinity;
                scene.enemies.children.each(enemy => {
                    if (!enemy || !enemy.active) return;
                    const dist = Phaser.Math.Distance.Between(zombie.x, zombie.y, enemy.x, enemy.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = enemy;
                    }
                });
                if (nearest) scene.physics.moveToObject(zombie, nearest, zombie.speed);
                else scene.physics.moveToObject(zombie, player, zombie.speed);
            }
        });

        // vida e dano do zumbi: implementa takeDamage e onDeath localmente
        zombie.takeDamage = (dmg, source) => {
            zombie.hp -= dmg;
            // lifesteal do zumbi para o player (se tier 3)
            if (zombie.lifeSteal && source === "zombieAttack" && this.scene.player) {
                // opcional: curar o player por uma % do dano
                const heal = Math.floor(dmg * (zombie.lifeSteal || 0));
                this.scene.player.heal?.(heal);
            }
            if (zombie.hp <= 0) {
                zombie.onDeath?.();
            }
        };

        zombie.onDeath = () => {
            // pequena explosão visual e dano em área (corrosão)
            const explosion = scene.add.circle(zombie.x, zombie.y, 110, 0x55ff66, 0.36).setDepth(4).setStrokeStyle(3, 0x00ff88);
            scene.tweens.add({ targets: explosion, alpha: 0, scale: 1.25, duration: 600, onComplete: () => explosion.destroy() });

            // aplica dano forte por tick na área semelhante ao frasco corrosivo
            const aoeRadius = 110;
            const aoeTicks = 8;
            let tickCount = 0;
            const aoeEvent = scene.time.addEvent({
                delay: 300,
                loop: true,
                callback: () => {
                    tickCount++;
                    scene.enemies.children.each(e => {
                        if (!e || !e.active) return;
                        const dist = Phaser.Math.Distance.Between(zombie.x, zombie.y, e.x, e.y);
                        if (dist <= aoeRadius) {
                            e.takeDamage(zombie.explosionDamage);
                        }
                    });
                    if (tickCount >= aoeTicks) aoeEvent.remove(false);
                }
            });

            // cleanup
            if (tauntEvent) tauntEvent.remove(false);
            if (moveEvent) moveEvent.remove(false);
            if (particleEmitter) {
                particleEmitter.stop();
                scene.time.delayedCall(600, () => {
                    particleEmitter.manager?.destroy();
                });
            }
            if (zombie && zombie.destroy) zombie.destroy();
        };

        // garante tempo máximo de duração do zumbi (caso não morra)
        scene.time.delayedCall(7000, () => {
            if (zombie && zombie.onDeath) zombie.onDeath();
        });

        // retorna o objeto para possíveis usos externos
        return zombie;
    }

    // função para explosão/aoe manual (se quiser usar separadamente)
    explodeTankZombie(scene, zombie) {
        if (!scene || !zombie) return;
        // reusa a lógica de onDeath do próprio zombie se existir
        if (zombie.onDeath) {
            zombie.onDeath();
            return;
        }

        // fallback: cria efeito visual e aplica dano
        const fx = scene.add.circle(zombie.x, zombie.y, 40, 0x55ff55, 0.4).setDepth(40);
        scene.tweens.add({ targets: fx, radius: 180, alpha: 0, duration: 500, onComplete: () => fx.destroy() });

        const corrosion = scene.add.circle(zombie.x, zombie.y, 120, 0x44dd44, 0.25).setDepth(10);
        scene.time.delayedCall(3000, () => corrosion.destroy());

        scene.enemies.children.each(enemy => {
            if (!enemy || !enemy.active) return;
            const d = Phaser.Math.Distance.Between(corrosion.x, corrosion.y, enemy.x, enemy.y);
            if (d <= 120) enemy.takeDamage(35);
        });
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
