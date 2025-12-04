export default class PassiveSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Cooldowns
        this.fireCD = 2000;
        this.poisonCD = 2500;
        this.slowCD = 3000;

        this.fireReady = true;
        this.poisonReady = true;
        this.slowReady = true;

        // Correção: evento correto passando enemy
        this.scene.events.on("enemyKilled", (enemy) => {
            this.handleKill(enemy);
        });
    }


    activateClassAbilities(className) {
        if (!className) {
            console.warn("Classe não reconhecida.");
            return;
        }

        const normalized = className.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z]/g, "");

        const map = {
            alquimista: () => this.activateAlquimista(),
            coveiro: () => this.activateCoveiro(),
            sentinela: () => this.activateSentinela()
        };

        for (const key in map) {
            if (normalized.includes(key)) {
                map[key]();
                return;
            }
        }
    }

    castFireBottle() {
        if (!this.fireReady) return;

        this.fireReady = false;
        this.scene.time.delayedCall(this.fireCD, () => this.fireReady = true);

        this.throwBottle("fire");
    }

    castPoisonBottle() {
        if (!this.poisonReady) return;

        this.poisonReady = false;
        this.scene.time.delayedCall(this.poisonCD, () => this.poisonReady = true);

        this.throwBottle("poison");
    }

    castSlowBottle() {
        if (!this.slowReady) return;

        this.slowReady = false;
        this.scene.time.delayedCall(this.slowCD, () => this.slowReady = true);

        this.throwBottle("slow");
    }

    throwBottle(type) {
        if (!this.player) {
            console.warn("PassiveSystem.throwBottle: player não definido.");
            return;
        }

        // escolhe textura disponível: 'bottle' preferido, senão 'flask'
        const tex = this.scene.textures.exists("bottle") ? "bottle" :
            (this.scene.textures.exists("flask") ? "flask" : null);

        if (!tex) {
            console.warn("PassiveSystem.throwBottle: nenhuma textura de bottle/flask encontrada.");
            return;
        }

        try {
            const bottle = this.scene.physics.add.sprite(this.player.x, this.player.y, tex);
            // se não houver pointer, arremessa numa direção frontal do player (fallback)
            const target = this.scene.input?.activePointer && this.scene.input.activePointer.x !== undefined
                ? this.scene.input.activePointer
                : { x: this.player.x + (this.player.facing === "left" ? -100 : 100), y: this.player.y };

            this.scene.physics.moveToObject(bottle, target, 300);

            bottle.setData("type", type);
            bottle.setData("damage", this.getBottleDamage(type));
            bottle.setData("area", this.getBottleArea(type));

            bottle.setDepth(10);

            // opcional: criar colisão/efeito quando bate (dependendo do resto do game)
            // ex: this.scene.physics.add.overlap(bottle, this.scene.enemies, (...));

        } catch (e) {
            console.error("Erro ao criar bottle:", e);
        }
    }


    getBottleDamage(type) {
        switch (type) {
            case "fire": return 40;
            case "poison": return 20;
            case "slow": return 5;
            default: return 0;
        }
    }

    getBottleArea(type) {
        switch (type) {
            case "fire": return 40;
            case "poison": return 70;
            case "slow": return 125;
            default: return 0;
        }
    }

    activatePassiva() {
        console.log("⚗️ PASSIVA DO ALQUIMISTA ATIVADA!");

        // reset cooldowns
        this.fireReady = true;
        this.poisonReady = true;
        this.slowReady = true;

        // lança todos os frascos
        this.castFireBottle();
        this.castPoisonBottle();
        this.castSlowBottle();

        // opcional: efeito visual
        const fx = this.scene.add.circle(this.player.x, this.player.y, 60, 0x00ffcc, 0.2)
            .setDepth(5);

        this.scene.tweens.add({
            targets: fx,
            alpha: 0,
            duration: 400,
            onComplete: () => fx.destroy()
        });
    }

    handleKill(enemy) {
        const name = this.player.currentClass?.toLowerCase() || "";

        // só o Alquimista carrega passiva com kill
        if (!name.includes("alquimista")) return;

        // garante variáveis
        this.player.alchCharge = this.player.alchCharge ?? 0;
        this.player.alchChargeMax = this.player.alchChargeMax ?? 100;

        // quanto adiciona por kill?
        const amount = 15; // ajuste como quiser

        this.player.alchCharge = Math.min(
            this.player.alchCharge + amount,
            this.player.alchChargeMax
        );

        this.updateAlchBar(this.player);
    }


    // -------------------------------------------------------------------
    // COVEIRO

    activateCoveiro() {
        const scene = this.scene;
        const player = scene.player;
        if (!player) return;

        console.log("☠️ Passiva do Coveiro ativada!");

        player.kills = 0;
        player.ascensionCount = 0;
        player.isInAscencion = false;
        player.nextAscencionAt = 30;

        // evitar múltiplos listeners duplicados
        scene.events.off("enemyKilled", this._enemyKilledHandler);

        this._enemyKilledHandler = () => {
            if (player.isInAscencion) return;
            player.kills++;
            this.updateAscensionBar(player);
        };

        scene.events.on("enemyKilled", this._enemyKilledHandler);

        scene.input.keyboard.on("keydown-SPACE", () => {
            if (player.kills >= player.nextAscencionAt && !player.isInAscencion) {
                this.activateAscension(player);
            }
        });

        this.updateAscensionBar(player);
    }

    updateAscensionBar(player) {
        const scene = this.scene;

        if (!scene.passiveBar || !scene.passiveText) return;

        const percent = Math.min(player.kills / player.nextAscencionAt, 1);

        scene.passiveBar.width = 200 * percent;
        scene.passiveText.setText(`Ascensão: ${Math.floor(percent * 100)}%`);

        if (percent >= 1) {
            scene.passiveText.setText("☠️ ASCENSÃO PRONTA!");
            scene.passiveText.setColor("#aa55ff");
        } else {
            scene.passiveText.setColor("#ffffff");
        }
    }

    activateAscension(player) {
        const scene = this.scene;

        player.isInAscencion = true;
        player.ascensionCount++;

        const asc = player.ascensionCount;
        const duration = 10000 + asc * 2000;

        console.log(`⚰️ ASCENSÃO ${asc} INICIADA (${duration / 1000}s)`);

        // Buffs
        const phase = ((asc - 1) % 3) + 1;

        player.tempSpeed = 40 + asc * 4;
        player.tempMaxHp = 40 + asc * 6;
        player.hp += player.tempMaxHp;

        if (phase >= 2) player.foicePoisonMultiplier = 1.5;
        if (phase === 3) this.spawnZombieTank(player, asc);

        // AURA
        const aura = scene.add.circle(player.x, player.y, 95, 0x8844ff, 0.2)
            .setStrokeStyle(3, 0xbb88ff)
            .setDepth(2);

        const auraUpdate = () => aura.setPosition(player.x, player.y);
        scene.events.on("update", auraUpdate);

        scene.time.delayedCall(duration, () => {
            player.isInAscencion = false;
            player.kills = 0;
            player.nextAscencionAt += 30;

            player.hp -= player.tempMaxHp;
            player.foicePoisonMultiplier = 1;

            aura.destroy();
            scene.events.off("update", auraUpdate);

            this.updateAscensionBar(player);
            console.log("☠️ Ascensão terminou.");
        });
    }

    // --------------------------
    // ZUMBI TANK

    spawnZombieTank(player, asc) {
        const scene = this.scene;

        const tier = asc >= 13 ? 3 : asc >= 7 ? 2 : 1;

        const spawnX = player.x + Phaser.Math.Between(-70, 70);
        const spawnY = player.y + Phaser.Math.Between(-70, 70);

        const hasTexture = scene.textures.exists("zombie");
        const zombie = hasTexture
            ? scene.physics.add.sprite(spawnX, spawnY, "zombie").setScale(1.4 + tier * 0.2)
            : scene.add.circle(spawnX, spawnY, 18, 0x44ff44);

        scene.physics.add.existing(zombie);
        zombie.setDepth(3);
        zombie.setAlpha(0);

        scene.tweens.add({ targets: zombie, alpha: 1, duration: 300 });

        zombie.maxHp = tier === 1 ? 220 : tier === 2 ? 450 : 320;
        zombie.hp = zombie.maxHp;

        zombie.speed = 50 + tier * 10;
        zombie.tauntRadius = 260 + tier * 30;
        zombie.corrosionDamage = 120 + tier * 100;
        zombie.corrosionRadius = 120 + tier * 40;
        zombie.lifeSteal = tier === 3 ? 0.25 : 0;

        // Taunt
        zombie.tauntEvent = scene.time.addEvent({
            delay: 250,
            loop: true,
            callback: () => {
                scene.enemies.children.each(e => {
                    if (!e.active) return;
                    if (Phaser.Math.Distance.Between(zombie.x, zombie.y, e.x, e.y) <= zombie.tauntRadius) {
                        e.target = zombie;
                    }
                });
            }
        });

        // Movimento
        zombie.moveEvent = scene.time.addEvent({
            delay: 400,
            loop: true,
            callback: () => {
                let nearest = null;
                let dist = Infinity;

                scene.enemies.children.each(e => {
                    const d = Phaser.Math.Distance.Between(zombie.x, zombie.y, e.x, e.y);
                    if (d < dist) {
                        nearest = e;
                        dist = d;
                    }
                });

                if (nearest) scene.physics.moveToObject(zombie, nearest, zombie.speed);
                else scene.physics.moveToObject(zombie, player, zombie.speed * 0.6);
            }
        });

        zombie.takeDamage = dmg => {
            zombie.hp -= dmg;
            if (zombie.hp <= 0) zombie.onDeath();
        };

        zombie.onDeath = () => {
            zombie.tauntEvent.remove();
            zombie.moveEvent.remove();

            const ex = scene.add.circle(zombie.x, zombie.y, zombie.corrosionRadius, 0x55ff55, 0.35)
                .setDepth(5)
                .setStrokeStyle(4, 0x99ff99);

            scene.tweens.add({ targets: ex, alpha: 0, duration: 3000 });

            let ticks = 0;

            const tickEvent = scene.time.addEvent({
                delay: 300,
                loop: true,
                callback: () => {
                    scene.enemies.children.each(e => {
                        if (!e.active) return;

                        const d = Phaser.Math.Distance.Between(ex.x, ex.y, e.x, e.y);
                        if (d <= zombie.corrosionRadius) e.takeDamage(zombie.corrosionDamage);
                    });

                    if (++ticks >= 10) tickEvent.remove();
                }
            });

            zombie.destroy();
        };

        // suicídio automático
        scene.time.delayedCall(8000 + tier * 2000, () => {
            if (zombie.active) zombie.onDeath();
        });
    }

    // -------------------------------------------------------------------
    // OUTRAS CLASSES

    activateAlquimista() {
        console.log("⚗️ Passiva do Alquimista iniciada/verificando...");

        // assegura player correto
        if (!this.player) {
            this.player = this.scene?.player || null;
            if (!this.player) {
                console.warn("activateAlquimista: player não disponível ainda.");
                return;
            }
        }

        const scene = this.scene;
        const player = this.player;

        // garante HUD existente (se não existir, cria placeholders mínimos)
        if (!scene.passiveBar || !scene.passiveText) {
            console.warn("HUD de passiva não encontrada — criando placeholders visuais temporários.");
            try {
                scene.passiveBarBg = scene.add.rectangle(100, 70, 200, 10, 0x222222).setOrigin(0).setScrollFactor(0);
                scene.passiveBar = scene.add.rectangle(100, 70, 0, 10, 0x00ff88).setOrigin(0).setScrollFactor(0);
                scene.passiveText = scene.add.text(310, 65, "Passiva: 0%", { fontSize: "14px", fill: "#00ffcc" }).setScrollFactor(0);
            } catch (e) {
                console.error("Erro criando placeholders da HUD de passiva:", e);
            }
        }

        // Inicializa variáveis do jogador (se ainda não existirem)
        player.alchCharge = player.alchCharge ?? 0;
        player.alchChargeMax = player.alchChargeMax ?? 100;

        // Remove update event antigo (evita duplicação)
        if (this._alchUpdateEvent) {
            try { this._alchUpdateEvent.remove(); } catch (e) { }
            this._alchUpdateEvent = null;
        }

        const delayMs = 70; // ~7 segundos para encher 100%
        this._alchUpdateEvent = scene.time.addEvent({
            delay: delayMs,
            loop: true,
            callback: () => {
                // proteção: se player foi destruído, remove evento
                if (!player || player.destroyed || player.scene !== scene) {
                    try { this._alchUpdateEvent.remove(); } catch (e) { }
                    this._alchUpdateEvent = null;
                    return;
                }

                try {
                    if (player.alchCharge < player.alchChargeMax) {
                        player.alchCharge++;
                        this.updateAlchBar(player);
                    }

                    if (player.alchCharge >= player.alchChargeMax) {
                        // chama função que reseta cooldowns e cospe frascos
                        this.activatePassiva();
                        // zera e atualiza HUD
                        player.alchCharge = 0;
                        this.updateAlchBar(player);
                    }
                } catch (e) {
                    console.error("Erro no evento de carregamento da passiva:", e);
                }
            }
        });

        this.updateAlchBar(player);
    }


    updateAlchBar(player) {
        const scene = this.scene;
        if (!scene || !scene.passiveBar || !scene.passiveText) return;

        const percent = (player.alchCharge || 0) / (player.alchChargeMax || 100);
        scene.passiveBar.width = 200 * Phaser.Math.Clamp(percent, 0, 1);
        scene.passiveText.setText(`Passiva: ${Math.floor(percent * 100)}%`);
        scene.passiveText.setColor(percent >= 1 ? "#ffcc00" : "#00ffcc");
    }



    activateSentinela() {
        console.log("PASSIVA SENT");
    }
}
