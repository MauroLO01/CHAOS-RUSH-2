import Enemy from "../entities/Enemy/enemy.js";

export default class SpawnDirector {
    constructor(scene) {
        this.scene = scene;
        this.player = null;

        // ----- Controle Linear -----
        this.spawnPoints = 0;
        this.pointsPerSecond = 1.2; // 🔥 taxa base (linear)
        this.maxEnemies = 30;

        // ----- Spawn -----
        this.spawnRadius = 450;

        // ----- Pool -----
        this.enemyPool = ["chaser"];

        this.enemyCost = {
            chaser: 1,
            wanderer: 1.2,
            shooter: 1.5,
            fast: 1.3,
            tank: 2.5,
            elite: 4
        };

        // ----- Progressão -----
        this.unlocks = [
            { time: 60, type: "wanderer" },
            { time: 120, type: "shooter" },
            { time: 240, type: "fast" },
            { time: 360, type: "tank" },
            { time: 480, type: "elite" }
        ];

        this.elapsedTime = 0;

        // ----- CHAOS EVENT -----
        this.chaos = {
            active: false,
            duration: 20,          // segundos
            cooldown: 90,          // tempo mínimo entre chaos
            timer: 0,
            nextAt: 60,            // primeiro chaos após 1 min
            spawnMultiplier: 2.2,  // intensidade
            maxEnemyBonus: 20
        };

        // Spawn batching
        this.spawnBatch = [];
        this.spawnBatchDelay = 40; // ms entre spawns do pacote
        this.lastBatchTime = 0;

        // Limite por tipo (anti-spam)
        this.activePerType = {};
        this.maxPerType = {
            chaser: 18,
            wanderer: 10,
            shooter: 8,
            tank: 6,
            elite: 3
        };


    }

    update(time, delta) {
        if (!this.scene.player || !this.scene.enemies) return;
        if (!this.player) this.player = this.scene.player;


        const dt = delta / 1000;
        this.elapsedTime += dt;

        this.updateUnlocks();
        this.updateChaos(dt);

        // ----- taxa base (linear) -----
        let pointsRate = this.pointsPerSecond;
        let maxEnemies = this.maxEnemies;

        if (this.chaos.active) {
            pointsRate *= this.chaos.spawnMultiplier;
            maxEnemies += this.chaos.maxEnemyBonus;
        }

        this.spawnPoints += pointsRate * dt;

        const alive = this.scene.enemies.countActive(true);
        if (alive >= maxEnemies) return;

        this.trySpawn(time);
    }


    updateUnlocks() {
        this.unlocks.forEach(u => {
            if (this.elapsedTime >= u.time && !this.enemyPool.includes(u.type)) {
                this.enemyPool.push(u.type);
                console.log(`🔓 Novo inimigo liberado: ${u.type}`);
            }
        });
    }

    trySpawn(time) {
        if (!this.scene.player) return;

        // -----------------------------
        // Executando batch pendente
        if (this.spawnBatch.length > 0) {
            if (time - this.lastBatchTime >= this.spawnBatchDelay) {
                const next = this.spawnBatch.shift();
                this.lastBatchTime = time;

                this.spawnEnemy(next.type, next.x, next.y);
            }
            return;
        }

        // -----------------------------
        // 🔒 FILTRO DE UNLOCK (ANTI-SPAWN PREMATURO)
        const allowedPool = this.enemyPool.filter(type => {
            const unlock = this.unlocks.find(u => u.type === type);
            return !unlock || this.elapsedTime >= unlock.time;
        });

        if (allowedPool.length === 0) return;

        let pool = [...allowedPool];

        // -----------------------------
        // CHAOS MODE influencia a roleta
        if (this.chaos?.active) {
            const cheap = pool.filter(t => (this.enemyCost[t] ?? 1) <= 1.2);

            pool = Phaser.Utils.Array.Shuffle([
                ...pool,
                ...cheap,
                ...cheap
            ]);
        } else {
            pool = Phaser.Utils.Array.Shuffle(pool);
        }

        // -----------------------------
        // Tentativa de spawn
        for (const type of pool) {
            const cost = this.enemyCost[type] ?? 1;

            if (this.spawnPoints < cost) continue;

            const active = this.activePerType[type] ?? 0;
            const limit = this.maxPerType[type] ?? 99;

            if (active >= limit) continue;

            const pos = this.getSpawnPosition();
            if (!pos) return;

            const batchSize = this.chaos?.active
                ? Phaser.Math.Between(2, 3)
                : 1;

            this.spawnPoints -= cost * batchSize;

            for (let i = 0; i < batchSize; i++) {
                this.spawnBatch.push({
                    type,
                    x: pos.x + Phaser.Math.Between(-20, 20),
                    y: pos.y + Phaser.Math.Between(-20, 20)
                });
            }

            this.lastBatchTime = time;
            return;
        }
    }

    spawnEnemy(type, x, y) {
        const enemy = new Enemy(this.scene, x, y, type);

        enemy.setTarget(this.scene.player);
        this.scene.enemies.add(enemy);

        this.activePerType[type] = (this.activePerType[type] ?? 0) + 1;

        enemy.once("destroy", () => {
            this.activePerType[type]--;
        })
    }

    getSpawnPosition() {
        const px = this.player.x;
        const py = this.player.y;

        for (let i = 0; i < 25; i++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const dist = Phaser.Math.Between(this.spawnRadius, this.spawnRadius + 350);

            const x = px + Math.cos(angle) * dist;
            const y = py + Math.sin(angle) * dist;

            if (
                x < 0 || x > this.scene.worldWidth ||
                y < 0 || y > this.scene.worldHeight
            ) continue;

            return { x, y };
        }

        return null;
    }

    updateChaos(dt) {
        // iniciar chaos
        if (
            !this.chaos.active &&
            this.elapsedTime >= this.chaos.nextAt
        ) {
            this.startChaos();
        }

        // atualizar chaos
        if (this.chaos.active) {
            this.chaos.timer -= dt;

            if (this.chaos.timer <= 0) {
                this.endChaos();
            }
        }
    }

    startChaos() {
        this.chaos.active = true;
        this.chaos.timer = this.chaos.duration;

        console.log("🔥 HORA DO CHAOS!");
    }

    endChaos() {
        this.chaos.active = false;
        this.chaos.nextAt = this.elapsedTime + this.chaos.cooldown;

        console.log("🕯️ Chaos cessou...");
    }

}
