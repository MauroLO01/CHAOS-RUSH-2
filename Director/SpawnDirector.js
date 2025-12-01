export default class SpawnDirector {
    constructor(scene) {
        this.scene = scene;
        this.player = scene.player;

        // Estado
        this.spawnCooldown = 0;
        this.spawnInterval = 1200;
        this.maxEnemies = 35;
        this.spawnRadius = 450;

        this.difficultyMultiplier = 1;
        this.lastLevel = 1;

        // tipos iniciais
        this.enemyPool = ["normal"];

        // desbloqueios por level
        this.unlocks = [
            { level: 3, type: "fast" },
            { level: 5, type: "tank" },
            { level: 8, type: "shooter" },
            { level: 12, type: "elite" }
        ];
    }

    update(time, delta) {
        if (!this.scene.player) return;

        this.updateDifficulty();

        // CORREÇÃO AQUI:
        const count = this.scene.enemies?.getChildren().length || 0;
        if (count >= this.maxEnemies) return;

        this.spawnCooldown -= delta;

        if (this.spawnCooldown <= 0) {
            this.spawnEnemy();
            this.spawnCooldown = this.spawnInterval / this.difficultyMultiplier;
        }
    }

    updateDifficulty() {
        const level = this.scene.player.level || 1;

        if (level !== this.lastLevel) {
            this.difficultyMultiplier = 1 + (level * 0.10);

            this.unlocks.forEach(u => {
                if (level >= u.level && !this.enemyPool.includes(u.type)) {
                    this.enemyPool.push(u.type);
                    console.log(`Novo inimigo desbloqueado: ${u.type}`);
                }
            });

            this.maxEnemies = 25 + Math.floor(level * 2);
            this.lastLevel = level;
        }
    }

    spawnEnemy() {
        const type = Phaser.Utils.Array.GetRandom(this.enemyPool);
        const pos = this.getSpawnPosition();
        if (!pos) return;

        const enemy = this.scene.spawnEnemy(type, pos.x, pos.y);

        const lvl = this.scene.player.level || 1;

        enemy.maxHP = Math.floor(enemy.maxHP * (1 + lvl * 0.05));
        enemy.speed = Math.floor(enemy.speed * (1 + lvl * 0.03));
        enemy.damage = Math.floor(enemy.damage * (1 + lvl * 0.04));

        enemy.hp = enemy.maxHP;
    }



    getSpawnPosition() {
        const { width, height } = this.scene.scale;
        const px = this.scene.player.x;
        const py = this.scene.player.y;

        let attempts = 20;

        while (attempts-- > 0) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const distance = Phaser.Math.Between(this.spawnRadius, this.spawnRadius + 400);

            const x = px + Math.cos(angle) * distance;
            const y = py + Math.sin(angle) * distance;

            // evita spawn fora da área renderizável
            if (x < 0 || x > this.scene.worldWidth || y < 0 || y > this.scene.worldHeight) continue;

            return { x, y };
        }

        return null;
    }
}
