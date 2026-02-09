import Enemy from "../entities/Enemy/enemy.js";

export default class SpawnDirector {
    constructor(scene) {
        this.scene = scene;
        this.player = null;

        this.elapsedTime = 0;

        this.baseSpawnRate = 1.0;     // inimigos / segundo
        this.spawnAccumulator = 0;

        this.baseMaxEnemies = 25;

        // ==========================
        // 🧩 COMPOSIÇÃO
        // ==========================
        this.enemyPool = ["chaser"];

        this.enemyWeights = {
            chaser: 5,
            shooter: 2,
            tank: 1,
            elite: 0.5
        };

        this.unlocks = [
            { time: 120, type: "shooter" },
            { time: 300, type: "tank" },
            { time: 420, type: "elite" }
        ];

        //eventos
        this.event = {
            active: false,
            type: null,
            timer: 0
        };

        this.nextEventAt = 90;

        //SPAWN
        this.spawnRadius = 450;
        this.spawnDelay = 120;
        this.lastSpawnTime = 0;

        //LIMITES
        this.activePerType = {};
        this.maxPerType = {
            chaser: 20,
            shooter: 8,
            tank: 5,
            elite: 2
        };
    }

    // ===================================================
    update(time, delta) {
        if (!this.scene.player) return;
        if (!this.player) this.player = this.scene.player;

        const dt = delta / 1000;
        this.elapsedTime += dt;

        this.updateUnlocks();
        this.updateEvents(dt);

        const maxEnemies = this.getMaxEnemies();
        const alive = this.scene.enemies.countActive(true);
        if (alive >= maxEnemies) return;

        this.spawnAccumulator += this.getSpawnRate() * dt;

        if (
            this.spawnAccumulator >= 1 &&
            time - this.lastSpawnTime >= this.spawnDelay
        ) {
            this.spawnAccumulator -= 1;
            this.lastSpawnTime = time;
            this.spawnEnemyFromPool();
        }
    }

    // ===================================================
    getSpawnRate() {
        let rate = this.baseSpawnRate;

        // Progressão lenta
        rate += Math.min(this.elapsedTime / 300, 1.5);

        if (this.event.active && this.event.type === "horde") {
            rate *= 1.8;
        }

        return rate;
    }

    getMaxEnemies() {
        let max = this.baseMaxEnemies;

        max += Math.floor(this.elapsedTime / 120) * 3;

        if (this.event.active && this.event.type === "horde") {
            max += 10;
        }

        return max;
    }

    // ===================================================
    updateUnlocks() {
        this.unlocks.forEach(u => {
            if (this.elapsedTime >= u.time && !this.enemyPool.includes(u.type)) {
                this.enemyPool.push(u.type);
                console.log(`🔓 ${u.type} liberado`);
            }
        });
    }

    // ===================================================
    spawnEnemyFromPool() {
        const pool = [];

        this.enemyPool.forEach(type => {
            const active = this.activePerType[type] ?? 0;
            const limit = this.maxPerType[type] ?? 99;
            if (active >= limit) return;

            const weight = this.enemyWeights[type] ?? 1;
            for (let i = 0; i < weight; i++) pool.push(type);
        });

        if (pool.length === 0) return;

        const type = Phaser.Utils.Array.GetRandom(pool);
        const pos = this.getSpawnPosition();
        if (!pos) return;

        this.spawnEnemy(type, pos.x, pos.y);
    }

    // ===================================================
    spawnEnemy(type, x, y) {
        const enemy = new Enemy(this.scene, x, y, type);
        enemy.setTarget(this.scene.player);

        this.scene.enemies.add(enemy);
        this.activePerType[type] = (this.activePerType[type] ?? 0) + 1;

        enemy.once("destroy", () => {
            this.activePerType[type]--;
        });
    }

    // ===================================================
    getSpawnPosition() {
        const px = this.player.x;
        const py = this.player.y;

        for (let i = 0; i < 20; i++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const dist = Phaser.Math.Between(this.spawnRadius, this.spawnRadius + 300);

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

    // ===================================================
    updateEvents(dt) {
        if (!this.event.active && this.elapsedTime >= this.nextEventAt) {
            this.startEvent("horde");
        }

        if (this.event.active) {
            this.event.timer -= dt;
            if (this.event.timer <= 0) {
                this.endEvent();
            }
        }
    }

    startEvent(type) {
        this.event.active = true;
        this.event.type = type;
        this.event.timer = 18;

        console.log("🔥 HORDE INICIADA");
    }

    endEvent() {
        this.event.active = false;
        this.event.type = null;
        this.nextEventAt = this.elapsedTime + 90;

        console.log("🕯️ Horde finalizada");
    }
}
