import Enemy from "../entities/Enemy/enemy.js";

export default class SpawnDirector {
  constructor(scene) {
    this.scene = scene;
    this.player = null;

    // -------------------------
    // TIMER DA RUN
    this.matchDuration = 10 * 60 * 1000; // 10 minutos
    this.matchStartTime = scene.time.now;

    // -------------------------
    // ORDA
    this.hordeActive = false;
    this.hordeDuration = 40 * 1000; // 40s
    this.nextHordeTime = 4 * 60 * 1000; // primeira aos 4 min
    this.hordeInterval = 2 * 60 * 1000;

    // -------------------------
    // SPAWN
    this.spawnCooldown = 0;

    this.normalSpawnRate = 0.7; // inimigos por segundo
    this.hordeSpawnRate = 1.3;  // durante orda (ajustável)

    this.maxEnemies = 25;
    this.spawnRadius = 450;

    // -------------------------
    // TIPOS DE INIMIGO
    this.enemyPool = ["normal"];

    this.unlocks = [
      { time: 2 * 60 * 1000, type: "fast" },
      { time: 4 * 60 * 1000, type: "tank" },
      { time: 6 * 60 * 1000, type: "shooter" },
      { time: 8 * 60 * 1000, type: "elite" },
    ];

    this.maxShooters = 2;
  }

  update(time, delta) {
    if (!this.scene.player) return;
    if (!this.player) this.player = this.scene.player;

    const elapsed = time - this.matchStartTime;

    this.updateEnemyUnlocks(elapsed);
    this.updateHordeState(elapsed);

    this.spawnCooldown -= delta;

    const spawnRate = this.hordeActive
      ? this.hordeSpawnRate
      : this.normalSpawnRate;

    const interval = 1000 / spawnRate;

    if (this.spawnCooldown <= 0) {
      this.trySpawn(elapsed);
      this.spawnCooldown = interval;
    }
  }

  // -------------------------
  // CONTROLE DAS ORDAS
  updateHordeState(elapsed) {
    if (!this.hordeActive && elapsed >= this.nextHordeTime) {
      this.startHorde();
    }

    if (
      this.hordeActive &&
      elapsed >= this.hordeEndTime
    ) {
      this.endHorde();
    }
  }

  startHorde() {
    this.hordeActive = true;
    this.hordeEndTime = this.nextHordeTime + this.hordeDuration;
    this.nextHordeTime += this.hordeInterval;

    this.scene.events.emit("hordeWarning");

    // aqui depois entra o aviso visual:
    // this.scene.events.emit("hordeStart");
  }

  endHorde() {
    this.hordeActive = false;

    // this.scene.events.emit("hordeEnd");
  }

  // -------------------------
  // UNLOCK DE INIMIGOS PELO TEMPO
  updateEnemyUnlocks(elapsed) {
    this.unlocks.forEach((u) => {
      if (elapsed >= u.time && !this.enemyPool.includes(u.type)) {
        this.enemyPool.push(u.type);
        console.log(`Novo inimigo desbloqueado: ${u.type}`);
      }
    });
  }

  // -------------------------
  // SPAWN
  trySpawn(elapsed) {
    const count = this.scene.enemies.getChildren().length;
    if (count >= this.maxEnemies) return;

    this.spawnEnemy(elapsed);
  }

  spawnEnemy(elapsed) {
    let type = Phaser.Utils.Array.GetRandom(this.enemyPool);

    if (type === "shooter") {
      const shooterCount = this.scene.enemies
        .getChildren()
        .filter((e) => e.aiType === "shooter").length;

      if (shooterCount >= this.maxShooters) {
        type = "normal";
      }
    }

    const pos = this.getSpawnPosition();
    if (!pos) return;

    const enemy = new Enemy(this.scene, pos.x, pos.y, type);
    this.scene.enemies.add(enemy);

    // -------------------------
    // ESCALA SOMENTE VIDA (POR TEMPO)
    const timeFactor = elapsed / this.matchDuration;

    enemy.maxHP = Math.floor(enemy.maxHP * (1 + timeFactor * 1.2));
    enemy.currentHP = enemy.maxHP;

    // velocidade NÃO escala
    return enemy;
  }

  // -------------------------
  // POSIÇÃO DE SPAWN
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
