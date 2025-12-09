import Enemy from "../entities/Enemy/enemy.js";

export default class SpawnDirector {
  constructor(scene) {
    this.scene = scene;
    this.player = null;

    this.state = "pressure";
    this.stateTimer = 6000;
    this.pressureDuration = 6000;
    this.breatherDuration = 7000;

    this.pressureSpawnRate = 3;
    this.breatherSpawnRate = 0.25;

    this.spawnCooldown = 0;

    this.spawnInterval = 1200;
    this.maxEnemies = 35;
    this.spawnRadius = 450;

    this.difficultyMultiplier = 1;
    this.lastLevel = 1;

    this.enemyPool = ["normal"];

    this.unlocks = [
      { level: 3, type: "fast" },
      { level: 5, type: "tank" },
      { level: 12, type: "shooter" },
      { level: 18, type: "elite" },
    ];

    this.maxShooters = 2;
  }

  update(time, delta) {
    if (!this.scene.player) return;
    if (!this.player) this.player = this.scene.player;

    this.updateDifficulty();

    this.stateTimer -= delta;
    this.spawnCooldown -= delta;

    if (this.state === "pressure") {
      this.updatePressure(delta);
    } else {
      this.updateBreather(delta);
    }
  }

  // -------------------------
  // PRESSURE
  updatePressure(delta) {
    // spawn rápido
    const interval = 1000 / this.pressureSpawnRate;

    if (this.spawnCooldown <= 0) {
      this.trySpawn();
      this.spawnCooldown = interval;
    }

    if (this.stateTimer <= 0) {
      this.enterBreather();
    }
  }

  // -------------------------
  // BREATHER
  updateBreather(delta) {
    // spawn baixo
    const interval = 1000 / this.breatherSpawnRate;

    if (this.spawnCooldown <= 0) {
      this.trySpawn();
      this.spawnCooldown = interval;
    }

    if (this.stateTimer <= 0) {
      this.enterPressure();
      this.increaseCycleDifficulty();
    }
  }

  // -------------------------
  // Troca de estado
  enterPressure() {
    this.state = "pressure";
    this.stateTimer = this.pressureDuration;
    this.spawnCooldown = 0;
  }

  enterBreather() {
    this.state = "breather";
    this.stateTimer = this.breatherDuration;
    this.spawnCooldown = 0;
  }

  // -------------------------
  // A cada ciclo, o jogo fica mais difícil
  increaseCycleDifficulty() {
    this.pressureSpawnRate += 0.4;
    this.breatherSpawnRate += 0.2;

    this.pressureDuration = Math.max(2000, this.pressureDuration - 300);
    this.breatherDuration = Math.max(1500, this.breatherDuration - 200);
  }

  // -------------------------
  // Spawn original preservado
  trySpawn() {
    const count = this.scene.enemies.getChildren().length;
    if (count >= this.maxEnemies) return;
    this.spawnEnemy();
  }

  updateDifficulty() {
    const level = this.scene.player?.level || 1;

    if (level !== this.lastLevel) {
      this.difficultyMultiplier = 1 + level * 0.1;

      this.unlocks.forEach((u) => {
        if (level >= u.level && !this.enemyPool.includes(u.type)) {
          this.enemyPool.push(u.type);
          console.log(`Novo inimigo desbloqueado: ${u.type}`);
        }
      });

      this.maxEnemies = 25 + Math.floor(level * 2);

      this.lastLevel = level;
    }
  }

  // -------------------------
  // Spawn real
  spawnEnemy() {
    let type = Phaser.Utils.Array.GetRandom(this.enemyPool);

    if (type === "shooter") {
      const shooterCount = this.scene.enemies.getChildren().filter(e => e.aiType === "shooter").length;

      if (shooterCount >= this.maxShooters) {
        // Força outro tipo
        type = "normal"; // ou "fast" ou "random exceto shooter"
      }
    }

    const pos = this.getSpawnPosition();
    if (!pos) return;

    const enemy = this.realSpawnEnemy(type, pos.x, pos.y);
    if (!enemy) return;

    const lvl = this.scene.player?.level || 1;

    enemy.maxHP = Math.floor(
      (enemy.maxHP || enemy.currentHP) * (1 + lvl * 0.05)
    );
    enemy.speed = Math.floor((enemy.speed || 1) * (1 + lvl * 0.03));
    enemy.damage = Math.floor((enemy.damage || 1) * (1 + lvl * 0.04));

    enemy.currentHP = enemy.maxHP;
    return enemy;
  }

  realSpawnEnemy(type, x, y) {
    const enemy = new Enemy(this.scene, x, y, type);
    this.scene.enemies.add(enemy);
    return enemy;
  }

  getSpawnPosition() {
    const px = this.scene.player.x;
    const py = this.scene.player.y;

    let attempts = 30;

    while (attempts-- > 0) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(
        this.spawnRadius,
        this.spawnRadius + 400
      );

      const x = px + Math.cos(angle) * dist;
      const y = py + Math.sin(angle) * dist;

      if (x < 0 || x > this.scene.worldWidth) continue;
      if (y < 0 || y > this.scene.worldHeight) continue;

      return { x, y };
    }

    return null;
  }
}
