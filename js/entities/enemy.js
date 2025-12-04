export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = "chaser") {
    super(scene, x, y, "enemy");

    this.scene = scene;
    this.type = type;

    this.target = null;

    // ----- Escalonamento Dinâmico -----
    const playerLevel = scene.player?.level ?? 1;
    const gameLevel = scene.level ?? scene.wave ?? 1;

    const scaleFactor = 1 + (playerLevel * 0.15) + (gameLevel * 0.20);

    // ----- atributos base por tipo -----
    const baseStats = {
      chaser: { hp: 120, speed: 80, tint: 0xff3333, xp: 10 },
      wanderer: { hp: 100, speed: 60, tint: 0x33ff33, xp: 12 },
      shooter: { hp: 80, speed: 30, tint: 0xff9900, xp: 15 }
    };

    const stats = baseStats[type] ?? baseStats.chaser;

    this.speed = stats.speed * scaleFactor;
    this.maxHP = Math.round(stats.hp * scaleFactor);
    this.currentHP = this.maxHP;
    this.xpValue = Math.round(stats.xp * scaleFactor);

    this.isDead = false;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false);
    this.setSize(18, 18);
    this.setOffset(1, 1);
    this.setTint(stats.tint);

    // Wanderer
    this.wanderTimer = 0;

    // Shooter
    this.shootCooldown = 1000;
    this.lastShot = 0;
  }

  update(time, delta) {
    if (!this.active || this.isDead) return;

    const aiMap = {
      normal: "chaser",
      fast: "chaser",
      tank: "chaser",
      elite: "chaser"
    }

    const aiType = aiMap[this.type] || this.type;

    // 🔥 Correção: agora pega o player *assim que existir*
    if (!this.target && this.scene.player) {
      this.target = this.scene.player;
    }

    const target = this.target;
    if (!target || !target.active) return;

    switch (aiType) {
      case "chaser":
        this.updateChaser(target);
        break;

      case "wanderer":
        this.updateWanderer(delta);
        break;

      case "shooter":
        this.updateShooter(time, target);
        break;
    }
  }

  // -------------------------
  // TIPOS DE COMPORTAMENTO

  updateChaser(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.setVelocity(
        (dx / dist) * this.speed,
        (dy / dist) * this.speed
      );
    }
  }

  updateWanderer(delta) {
    this.wanderTimer -= delta;
    if (this.wanderTimer <= 0) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.setVelocity(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed
      );
      this.wanderTimer = Phaser.Math.Between(600, 1500);
    }
  }

  updateShooter(time, target) {
    this.setVelocity(0, 0);

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 300 && time - this.lastShot >= this.shootCooldown) {
      this.lastShot = time;
      this.shootAt(target);
    }
  }

  shootAt(target) {
    if (!this.scene?.enemyProjectiles) return;

    this.scene.enemyProjectiles.fireProjectile(
      this.x, this.y, target.x, target.y
    );
  }

  // -------------------------
  // COMBATE

  takeDamage(amount) {
    if (!this.active || this.isDead) return;

    this.currentHP -= amount;
    this.flashDamage();

    if (this.currentHP <= 0) {
      this.die();
    }
  }

  flashDamage() {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this && this.active && !this.isDead) {
        const tints = {
          chaser: 0xff3333,
          wanderer: 0x33ff33,
          shooter: 0xff9900
        };
        this.setTint(tints[this.type] ?? 0xffffff);
      }
    });
  }

  setTarget(target) {
    this.target = target;
  }

  // MORTE
  die() {
    if (this.isDead) return;
    this.isDead = true;

    this.emit("die", this.x, this.y, this.xpValue);
    this.scene.events.emit("enemyKilled", this);
    this.scene.passiveSystem.onEnemyKill();

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0,
      duration: 200,
      onComplete: () => {
        if (this && this.destroy) this.destroy(true);
      }
    });
  }
}
