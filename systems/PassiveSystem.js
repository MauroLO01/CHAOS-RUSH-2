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
    }


    activateClassAbilities(className) {
        if (!className) return console.warn("Classe não reconhecida.");

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
        if (!this.player) return console.warn("Player não definido no PassiveSystem.");

        const bottle = this.scene.physics.add.sprite(this.player.x, this.player.y, "bottle");

        this.scene.physics.moveToObject(bottle, this.scene.input.activePointer, 300);

        bottle.setData("type", type);
        bottle.setData("damage", this.getBottleDamage(type));
        bottle.setData("area", this.getBottleArea(type));
    }


    getBottleDamage(type) {
        switch (type) {
            case "fire": return 40;
            case "poison": return 20;
            case "slow": return 5;
        }
    }

    getBottleArea(type) {
        switch (type) {
            case "fire": return 40;
            case "poison": return 70;
            case "slow": return 125;
        }
    }

    activatePassiva() {
        this.fireReady = true;
        this.poisonReady = true;
        this.slowReady = true;

        this.castFireBottle();
        this.castPoisonBottle();
        this.castSlowBottle();
    }

    activateCoveiro() {
        const scene = this.scene;
        const player = scene.player;
        if (!player) return;

        console.log("☠️ Passiva do Coveiro ativada!");

        // Inicialização segura
        player.kills = 0;
        player.ascensionCount = 0;
        player.isInAscencion = false;

        player.nextAscencionAt = 30; // primeira ascensão

        scene.events.on("enemyKilled", () => {
            console.log("🎯 PassiveSystem recebeu enemyKilled");
            console.log(`evento recebido "enemykilled`)
            if (player.isInAscencion) return;

            player.kills++;
            this.updateAscensionBar(player);
        });

        // espaço para ativar ascensão
        scene.input.keyboard.on("keydown-SPACE", () => {
            if (player.kills < player.nextAscencionAt) return;
            if (player.isInAscencion) return;
            this.activateAscension(player);
        });

        this.updateAscensionBar(player);
    }

    updateAscensionBar(player) {
        const scene = this.scene;

        const percent = Math.min(player.kills / player.nextAscencionAt, 1);
        scene.passiveBar.width = 200 * percent;
        scene.passiveText.setText(`Ascensão: ${Math.floor(percent * 100)}%`);

        if (percent >= 1) {
            scene.passiveText.setText("☠️ ASCENSÃO PRONTA!");
            scene.passiveText.setColor("#aa55ff");
        }
    }


    activateAscension(player) {
        const scene = this.scene;

        player.isInAscencion = true;
        player.ascensionCount++;

        const asc = player.ascensionCount;
        const duration = 10000 + (asc * 2000);

        console.log(`⚰️ ASCENSÃO ${asc} INICIADA (Duração ${duration / 1000}s)`);

        //buff por ascensão
        // Ascensões cíclicas (1 → 2 → 3 → repete)
        const phase = ((asc - 1) % 3) + 1;

        // Buff base de todas
        player.tempSpeed = 40 + asc * 4;
        player.tempMaxHp = 40 + asc * 6;
        player.hp += player.tempMaxHp;

        if (phase >= 2) {
            player.foicePoisonMultiplier = 1.5;
        }

        if (phase === 3) {
            this.spawnZombieTank(player, asc);
        }

        //AURA VISUAL 
        const aura = scene.add.circle(player.x, player.y, 95, 0x8844ff, 0.2)
            .setStrokeStyle(3, 0xbb88ff)
            .setDepth(2);

        const auraUpdate = scene.events.on("update", () => {
            aura.setPosition(player.x, player.y);
        });

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

    //ZUMBI TANK EVOLUTIVO 
    spawnZombieTank(player, asc) {
        const scene = this.scene;

        const tier = asc >= 13 ? 3 : asc >= 7 ? 2 : 1;

        const spawnX = player.x + Phaser.Math.Between(-70, 70);
        const spawnY = player.y + Phaser.Math.Between(-70, 70);

        console.log(`🧟‍♂️ Zumbi Tank Tier ${tier} criado!`);

        const tex = scene.textures.exists("zombie") ? "zombie" : null;

        const zombie = tex
            ? scene.physics.add.sprite(spawnX, spawnY, "zombie")
                .setScale(1.4 + tier * 0.2)
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

        zombie.tauntEvent = scene.time.addEvent({
            delay: 250,
            loop: true,
            callback: () => {
                scene.enemies.children.each(e => {
                    if (!e.active) return;
                    const d = Phaser.Math.Distance.Between(zombie.x, zombie.y, e.x, e.y);
                    if (d <= zombie.tauntRadius) e.target = zombie;
                });
            }
        });

        //movimentção
        zombie.moveEvent = scene.time.addEvent({
            delay: 400,
            loop: true,
            callback: () => {
                let nearest = null;
                let dist = 99999;

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
                .setDepth(5).setStrokeStyle(4, 0x99ff99);

            scene.tweens.add({ targets: ex, alpha: 0, duration: 3000 });

            let ticks = 0;
            const tickEvent = scene.time.addEvent({
                delay: 300,
                loop: true,
                callback: () => {
                    scene.enemies.children.each(e => {
                        if (!e.active) return;

                        const d = Phaser.Math.Distance.Between(ex.x, ex.y, e.x, e.y);
                        if (d <= zombie.corrosionRadius) {
                            e.takeDamage(zombie.corrosionDamage);
                        }
                    });

                    ticks++;
                    if (ticks >= 10) tickEvent.remove();
                }
            });

            zombie.destroy();
        };

        scene.time.delayedCall(8000 + tier * 2000, () => {
            if (zombie.active) zombie.onDeath();
        });
    }

    // Alquimista (inalterado)
    activateAlquimista() {
        console.log("PASSIVA ALC");
    }

    activateSentinela() {
        console.log("PASSIVA SENT");
    }
}
