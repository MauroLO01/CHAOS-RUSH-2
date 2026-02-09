import EnemyBullet from "../Enemy/EnemyBullet.js";

const resolveAIType = (type) => {
  if (!type) return "chaser";
  if (type.startsWith("shooter")) return "shooter";
  if (type.startsWith("wanderer")) return "wanderer";
  if (type.startsWith("tank")) return "chaser";
  if (type.startsWith("fast")) return "chaser";
  return "chaser";
};

const resolveVariant = (type) => {
  if (!type) return "chaser";
  if (type.startsWith("shooter")) return "shooter";
  if (type.startsWith("wanderer")) return "wanderer";
  if (type.startsWith("tank")) return "tank";
  if (type.startsWith("fast")) return "fast";
  if (type.startsWith("elite")) return "elite";
  return "chaser";
};

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = "chaser") {
    super(scene, x, y, "enemy");

    this.scene = scene;
    this.variant = resolveVariant(type);
    this.aiType = resolveAIType(type);
    this.applyTint();

    // alvo padrão
    this.target = scene.player ?? null;

    // -------------------------
    // ESCALONAMENTO
    const playerLevel = scene.player?.level ?? 1;
    const gameLevel = scene.level ?? scene.wave ?? 1;

    const hpScale = 1 + gameLevel * 0.25;
    const damageScale = 1 + gameLevel * 0.28;

    const speedScale = 1 + Math.min(gameLevel * 0.03, 0.25);

    // -------------------------
    // STATS BASE
    const baseStats = {
      chaser: { hp: 20, speed: 80, damage: 5, tint: 0xff3333, xp: 10 },
      wanderer: { hp: 100, speed: 60, damage: 8, tint: 0x33ff33, xp: 12 },
      shooter: { hp: 80, speed: 40, damage: 10, tint: 0xff9900, xp: 15 },
    };

    const stats = baseStats[this.aiType] ?? baseStats.chaser;

    // -------------------------
    // ATRIBUTOS
    this.speed = Math.round(stats.speed * speedScale);
    this.maxHP = Math.round(stats.hp * hpScale);
    this.currentHP = this.maxHP;
    this.damage = Math.round(stats.damage * damageScale);

    this.xpValue = Math.round(stats.xp * hpScale);


    this.isDead = false;

    // -------------------------
    // PHASER SETUP
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(5);
    this.setCollideWorldBounds(false);
    this.body.setAllowGravity(false);
    this.setSize(18, 18);
    this.setOffset(1, 1);
    this.setTint(stats.tint);

    // -------------------------
    // COMPORTAMENTO
    this.wanderTimer = 0;

    if (this.aiType === "wanderer") {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.setVelocity(
        Math.cos(angle) * this.speed * 0.6,
        Math.sin(angle) * this.speed * 0.6
      );

      this.wanderTimer = Phaser.Math.Between(400, 1200);
    }


    this.shootCooldown = 1800;
    this.lastShotTime = 0;

    this.strafeTimer = 0;
    this.strafeDir = 1;

    console.log("Enemy spawn:", {
      rawType: type,
      variant: this.variant,
      aiType: this.aiType
    });

  }

  // =====================================================
  update(time, delta) {
    if (!this.active || this.isDead) {
      this.setVelocity(0, 0);
      return;
    }

    if (!this.target && this.scene.player) {
      this.target = this.scene.player;
    }

    if (!this.target || !this.target.active) {
      this.setVelocity(0, 0);
      return;
    }

    switch (this.aiType) {
      case "wanderer":
        this.updateWanderer(delta);
        break;
      case "shooter":
        this.updateShooter(time, this.target, delta);
        break;
      case "chaser":
      default:
        this.updateChaser(this.target);
        break;
    }
  }

  setTarget(target) {
    this.target = target;
  }

  // =====================================================
  updateChaser(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distSq = dx * dx + dy * dy;

    if (distSq > 1) {
      const dist = Math.sqrt(distSq);
      this.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
    } else {
      this.setVelocity(0, 0);
    }
  }

  updateWanderer(delta) {
    this.wanderTimer -= delta;

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < 120 * 120) {
        const dist = Math.sqrt(distSq);
        this.setVelocity(
          (dx / dist) * this.speed * 0.4,
          (dy / dist) * this.speed * 0.4
        );
        return;
      }
    }

    if (this.wanderTimer <= 0) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.setVelocity(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed
      );
      this.wanderTimer = Phaser.Math.Between(600, 1500);
    }
  }


  updateShooter(time, target, delta) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const idealMin = 120;
    const idealMax = 250;

    if (dist > idealMax) {
      this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    }
    else if (dist < idealMin) {
      this.setVelocity(-Math.cos(angle) * this.speed, -Math.sin(angle) * this.speed);
    }
    else {
      this.setVelocity(0, 0);

      this.strafeTimer -= delta;
      if (this.strafeTimer <= 0) {
        this.strafeDir = Phaser.Math.Between(0, 1) ? 1 : -1;
        this.strafeTimer = Phaser.Math.Between(400, 1000);
      }

      const perp = angle + Math.PI / 2 * this.strafeDir;
      this.setVelocity(
        Math.cos(perp) * this.speed * 0.6,
        Math.sin(perp) * this.speed * 0.6
      );

      const now = time;
      if (now - this.lastShotTime >= this.shootCooldown) {
        this.lastShotTime = now;
        this.preShootWarning(target);
      }
    }
  }


  // =====================================================
  preShootWarning(target) {
    // aviso visual de disparo
    this.setTint(0xff3333);

    this.scene.time.delayedCall(120, () => {
      if (!this.active || this.isDead) return;

      // restaura a cor correta da variante
      this.applyTint();

      const errX = Phaser.Math.Between(-40, 40);
      const errY = Phaser.Math.Between(-40, 40);

      this.shootAt(target, errX, errY);
    });
  }


  shootAt(target, errX = 0, errY = 0) {
    if (!target?.active) return;
    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      target.x + errX,
      target.y + errY
    );

    const proj = new EnemyBullet(
      this.scene,
      this.x,
      this.y,
      angle,
      this.damage
    );

    this.scene.enemyBullets.add(proj);

    const baseAngle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      target.x,
      target.y
    );

    const spread = Phaser.Math.DegToRad(
      Phaser.Math.Between(-6, 6)
    );

    const finalAngle = baseAngle + spread;

    if (!proj) return;

    proj.setActive(true);
    proj.setVisible(true);
    proj.body.setAllowGravity(false);

    const cleanup = () => {
      if (!proj.active) return;
      proj.destroy();
      if (hit) hit.destroy();
    };

    const hit = this.scene.physics.add.overlap(proj, target, cleanup);

    this.scene.time.delayedCall(2200, cleanup);
  }


  // =====================================================

  applyTint() {
    const tints = {
      chaser: 0xff3333,
      wanderer: 0x33ff33,
      shooter: 0xff9900,
    };

    this.setTint(tints[this.aiType] ?? 0xffffff);
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.currentHP -= amount;
    this.flashDamage();

    if (this.currentHP <= 0) {
      this.die();
    }
  }

  flashDamage() {
    this.setTint(0xffffff);

    this.scene.time.delayedCall(100, () => {
      if (!this.isDead && this.active) {
        this.applyTint();
      }
    });
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;

    this.scene.events.emit("enemyKilled", this);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}
