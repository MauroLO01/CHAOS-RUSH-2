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

export default class WeaponSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.cooldowns = {};
    }

    useWeapon(key) {
        if (this.cooldowns[key]) return;

        switch (key) {
            case "frascoInstavel":
                this._useFrasco();
                break;
            
            case "foiceEnferrujada":
                this.useFoiceEnferrujada();
                break;

            case "sinoPurificacao":
                this._useBell();
                break;

                default:
                    console.warn("⚠️ Arma não reconhecida:", key);
                    break;
        }
    }

    startCooldown(key, ms) {
        this.cooldowns[key] = true;
        this.scene.time.delayedCall(ms, () => { this.cooldowns[key] = false; });
    }

    resetAllCooldowns() {
        Object.keys(this.cooldowns).forEach(k => this.cooldowns[k] = false);
    }

    // ─────────────── 🧪 FRASCO INSTÁVEL ───────────────
    _useFrasco() {
        const scene = this.scene;
        const p = this.player;
        const pointer = scene.input.activePointer;

        const angle1 = Phaser.Math.Angle.Between(p.x, p.y, pointer.worldX, pointer.worldY);

        const effects = ["fire", "poison", "slow"];
        const chosenEffect = effects[Math.floor(Math.random() * effects.length)];

        if (!scene.textures.exists("flask")) {
            console.error("❌ Textura 'flask' não encontrada! Verifique o preload().");
            return;
        }

        // Bônus de área apenas para o efeito 'slow'
        const slowRadiusBonus = (chosenEffect === "slow")
            ? (this.player.slowRadiusBonus || 30) // default 30 se não definido
            : 0;

        const finalRadius = FRASCO_CONFIG.AREA_RADIUS + slowRadiusBonus;

        // Cria o sprite do frasco
        const flask = scene.physics.add.sprite(p.x, p.y, "flask")
            .setDepth(5)
            .setTint(getDebuffColor(chosenEffect));

        // Direção do lançamento (aponta para o cursor)
        scene.physics.velocityFromRotation(angle1, FRASCO_CONFIG.VELOCITY, flask.body.velocity);

        // Ativa cooldown
        this.startCooldown("frascoInstavel", 1200);

        // Quando colidir com inimigo: cria efeito na posição de colisão usando finalRadius
        scene.physics.add.collider(flask, scene.enemies, (frasco, enemy) => {
            this._createGroundEffect(frasco.x, frasco.y, chosenEffect, finalRadius);
            frasco.destroy();
        });

        // Se não colidir, cria o efeito ao fim da vida
        scene.time.delayedCall(FRASCO_CONFIG.LIFESPAN, () => {
            if (flask.active) {
                this._createGroundEffect(flask.x, flask.y, chosenEffect, finalRadius);
                flask.destroy();
            }
        });
    }


    _createGroundEffect(x, y, effect, radius = FRASCO_CONFIG.AREA_RADIUS) {
        const scene = this.scene;

        // usa debuffDurationMultiplier do jogador se existir
        const durationMultiplier = this.player.debuffDurationMultiplier || 1;
        const totalTicks = Math.ceil(FRASCO_CONFIG.BASE_TICKS * durationMultiplier);

        const finalRadius = radius || FRASCO_CONFIG.AREA_RADIUS;
        const color = getDebuffColor(effect);

        const area = scene.add.circle(x, y, finalRadius, color, 0.25)
            .setStrokeStyle(2, color)
            .setDepth(4);

        let ticksDone = 0;

        const timer = scene.time.addEvent({
            delay: FRASCO_CONFIG.AREA_TICK_RATE,
            loop: true,
            callback: () => {
                ticksDone++;

                scene.enemies.children.iterate(e => {
                    if (!e || !e.active) return;

                    const distance = Phaser.Math.Distance.Between(e.x, e.y, x, y);
                    if (distance <= finalRadius) {
                        this._applyFlaskDebuff(e, effect);
                    }
                });

                if (ticksDone >= totalTicks) {
                    if (area && area.destroy) area.destroy();
                    timer.remove(false);
                }
            }
        });
    }


    _applyFlaskDebuff(enemy, effect) {
        const scene = this.scene;
        const baseDotDamage = 8 * (this.player.dotDamageBonus || 1);

        switch (effect) {
            case "fire":
                enemy.takeDamage(baseDotDamage * 1.5);
                break;
            case "poison":
                enemy.takeDamage(baseDotDamage + 2);
                break;
            case "slow":
                enemy.takeDamage(baseDotDamage * 0.1);

                if (!enemy._origSpeed) enemy._origSpeed = enemy.speed;
                if (enemy.speed > enemy._origSpeed * 0.6) {
                    enemy.speed = enemy._origSpeed * 0.6;

                    scene.time.delayedCall(FRASCO_CONFIG.AREA_TICK_RATE, () => {
                        if (enemy.active && enemy.speed < enemy._origSpeed) {
                            enemy.speed = enemy._origSpeed;
                        }
                    });
                }
                break;
        }
    }

    //COVEIRO
    useFoiceEnferrujada() {
        const scene = this.scene;
        const player = this.player;
        if (!scene || !player) return;

        // Bônus da Ascensão da Carcaça
        let damageMultiplier = 1;
        let controlTime = 2000;

        if (player.isInAscension) {
            damageMultiplier = 1.5;
            controlTime = 3000;

            // Veneno mais forte a partir da 3ª ascensão
            if (player.ascensionCount >= 3) {
                player.extraVenomBonus = 1.5;
            }
        }


        if (this.cooldowns["foiceEnferrujada"]) return;
        this.startCooldown("foiceEnferrujada", 2500);

        const foice = scene.add.sprite(player.x, player.y, "foiceSprite" || null)
            .setDepth(6)
            .setOrigin(0.5)
            .setTint(0x9b7653);
        scene.physics.add.existing(foice);
        foice.body.setAllowGravity(false);
        foice.body.isSensor = true;

        const CONTROL_TIME = 2000;
        const SPEED = 420;
        foice.isControlling = true;

        const updateFoice = () => {
            if (!foice.isControlling || !foice.active) return;
            const pointer = scene.input.activePointer;
            const angle = Phaser.Math.Angle.Between(foice.x, foice.y, pointer.worldX, pointer.worldY);
            foice.rotation = angle;
            scene.physics.velocityFromRotation(angle, SPEED, foice.body.velocity);
        };

        const followTimer = scene.time.addEvent({
            delay: 16,
            loop: true,
            callback: updateFoice
        });

        // 🎯 EFEITO AO ACERTAR INIMIGOS
        scene.physics.add.overlap(foice, scene.enemies, (f, enemy) => {
            if (!enemy || !enemy.active || enemy.isDead) return;

            enemy.takeDamage(5 * (player.dotDamageBonus || 1) * (player.extraVenomBonus || 1));
            enemy.isMarked = true;

            // Adiciona marcador visual acima do inimigo
            if (!enemy.markIndicator || !enemy.markIndicator.active) {
                const icon = scene.add.sprite(enemy.x, enemy.y - 24, "markIcon" || null)
                    .setDepth(12)
                    .setScale(0.5)
                    .setTint(0xaa55ff)
                    .setAlpha(0.9);

                // Se não tiver textura "markIcon", cria uma caveirinha desenhada
                if (!scene.textures.exists("markIcon")) {
                    icon.destroy();
                    const textIcon = scene.add.text(enemy.x, enemy.y - 24, "☠️", {
                        fontSize: "16px",
                        color: "#bb55ff",
                        stroke: "#000000",
                        strokeThickness: 3,
                    }).setOrigin(0.5).setDepth(12).setAlpha(0.9);

                    enemy.markIndicator = textIcon;
                } else {
                    enemy.markIndicator = icon;
                }

                // Faz a caveirinha seguir o inimigo
                const follow = scene.time.addEvent({
                    delay: 30,
                    loop: true,
                    callback: () => {
                        if (!enemy.active || enemy.isDead) {
                            if (enemy.markIndicator) enemy.markIndicator.destroy();
                            follow.remove();
                            return;
                        }
                        if (enemy.markIndicator.active)
                            enemy.markIndicator.setPosition(enemy.x, enemy.y - 24);
                    }
                });
            }

            // Dano periódico (putrefação)
            if (!enemy.putrefactionTimer) {
                enemy.putrefactionTimer = scene.time.addEvent({
                    delay: 900,
                    loop: true,
                    callback: () => {
                        if (!enemy.active || enemy.isDead) {
                            enemy.putrefactionTimer.remove(false);
                            if (enemy.markIndicator) enemy.markIndicator.destroy();
                            return;
                        }

                        enemy.takeDamage(5 * (player.dotDamageBonus || 1));
                        enemy.setTint(0x4d7d47);
                        scene.time.delayedCall(120, () => {
                            if (enemy.active) enemy.clearTint();
                        });
                    }
                });
            }

            // Lentidão temporária
            if (!enemy._origSpeed) enemy._origSpeed = enemy.speed;
            enemy.speed = Math.max(enemy._origSpeed * 0.7, 30);
            scene.time.delayedCall(2000, () => {
                if (enemy.active) enemy.speed = enemy._origSpeed;
            });
        });

        // 🔁 Retorno da foice
        scene.time.delayedCall(CONTROL_TIME, () => {
            if (!foice.active) return;

            foice.isControlling = false;
            followTimer.remove(false);

            scene.tweens.add({
                targets: foice,
                x: player.x,
                y: player.y,
                duration: 400,
                ease: "Sine.easeInOut",
                onUpdate: () => {
                    foice.rotation += 0.25;
                },
                onComplete: () => foice.destroy()
            });
        });
    }

    // ─────────────── 🔔 SENTINELA ───────────────
    _useBell() {
        const scene = this.scene;
        const p = this.player;
        const radius = 120;
        const wave = scene.add.circle(p.x, p.y, radius, 0x66ccff, 0.18).setDepth(4);
        scene.enemies.children.iterate(e => {
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
        scene.time.delayedCall(260, () => wave.destroy());
    }
}
