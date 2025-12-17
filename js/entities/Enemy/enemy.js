import EnemyBullet from "./EnemyBullet.js";

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = "chaser") {
    super(scene, x, y, "enemy");

    this.scene = scene;
    this.type = type;

    this.target = null;

    // ----- Escalonamento Dinâmico -----
    const playerLevel = scene.player?.level ?? 1;
    const gameLevel = scene.level ?? scene.wave ?? 1;

    const scaleFactor = 1 + playerLevel * 0.15 + gameLevel * 0.2;

    // ----- atributos base por tipo -----
    const baseStats = {
      chaser: { hp: 20, speed: 80, tint: 0xff3333, xp: 10 },
      wanderer: { hp: 100, speed: 60, tint: 0x33ff33, xp: 12 },
      shooter: { hp: 80, speed: 40, tint: 0xff9900, xp: 15 },
    };

    // mapear tipos que vêm do SpawnDirector
    const typeMap = {
      normal: "chaser",
      fast: "chaser",
      tank: "chaser",
      elite: "chaser",
      shooter: "shooter",
      wanderer: "wanderer",
    };

    const effectiveType = typeMap[this.type] || this.type;
    this.aiType = effectiveType;

    const stats = baseStats[this.aiType] ?? baseStats.chaser;

    this.speed = stats.speed * scaleFactor || 60;
    this.maxHP = Math.round(stats.hp * scaleFactor || 20);
    this.currentHP = this.maxHP;
    this.xpValue = Math.round(stats.xp * scaleFactor || 10);

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
    this.shootCooldown = 1800; // NERF: antes era 1000
    this.lastShotTime = 0;

    // strafing
    this.strafeTimer = 0;
    this.strafeDir = 1;

    // damage
    this.damage = this.damage || 5;
  }

  update(time, delta) {
    if (!this.active || this.isDead) return;

    if (!this.target && this.scene.player) {
      this.target = this.scene.player;
    }

    const target = this.target;
    if (!target || !target.active) return;

    switch (this.aiType) {
      case "chaser":
        this.updateChaser(target);
        break;
      case "wanderer":
        this.updateWanderer(delta);
        break;
      case "shooter":
        this.updateShooter(time, target, delta);
        break;
      default:
        this.updateChaser(target);
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
      this.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
    } else {
      this.setVelocity(0, 0);
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

  // SHOOTER FINAL MOD
  updateShooter(time, target, delta) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angleToPlayer = Math.atan2(dy, dx);

    // NERF: alcance reduzido
    const idealMin = 120;
    const idealMax = 250;

    if (dist > idealMax) {
      this.setVelocity(
        Math.cos(angleToPlayer) * this.speed,
        Math.sin(angleToPlayer) * this.speed
      );
    } else if (dist < idealMin) {
      this.setVelocity(
        -Math.cos(angleToPlayer) * this.speed,
        -Math.sin(angleToPlayer) * this.speed
      );
    } else {
      this.setVelocity(0, 0);
      this.strafeTimer -= delta;

      if (this.strafeTimer <= 0) {
        this.strafeDir = Phaser.Math.Between(0, 1) ? 1 : -1;
        this.strafeTimer = Phaser.Math.Between(400, 1000);
      }

      const perpAngle = angleToPlayer + (Math.PI / 2) * this.strafeDir;
      const strafeSpeed = Math.max(30, this.speed * 0.6);

      this.setVelocity(
        Math.cos(perpAngle) * strafeSpeed,
        Math.sin(perpAngle) * strafeSpeed
      );
    }

    const now = this.scene.time?.now ?? time;

    if (
      dist <= idealMax + 30 &&
      now - this.lastShotTime >= this.shootCooldown
    ) {
      this.lastShotTime = now;

      // ALERTA ANTES DO TIRO
      this.preShootWarning(target);
    }
  }

  // -------------------------
  // ANIMAÇÃO DE ALERTA + ERRO DE MIRA
  preShootWarning(target) {
    // efeito de alerta
    this.setTint(0xff3333);

    this.scene.time.delayedCall(120, () => {
      if (!this.active || this.isDead) return;

      const tints = {
        chaser: 0xff3333,
        wanderer: 0x33ff33,
        shooter: 0xff9900,
      };
      this.setTint(tints[this.aiType] || 0xffffff);

      // erro proposital de mira
      const aimErrorX = Phaser.Math.Between(-40, 40);
      const aimErrorY = Phaser.Math.Between(-40, 40);

      this.shootAt(target, aimErrorX, aimErrorY);
    });
  }

  // -------------------------
  // TIRO COM ERRO E VELOCIDADE REDUZIDA
  shootAt(target, errX = 0, errY = 0) {
    const aimX = target.x + errX;
    const aimY = target.y + errY;

    // sistema centralizado de projeteis
    if (
      this.scene?.enemyProjectiles &&
      typeof this.scene.enemyProjectiles.fireProjectile === "function"
    ) {
      try {
        this.scene.enemyProjectiles.fireProjectile(
          this.x,
          this.y,
          aimX,
          aimY,
          {
            damage: this.damage || 8,
            speed: 280, // NERF: projétil mais lento
          }
        );
        return;
      } catch (e) {
        console.warn("enemyProjectiles.fireProjectile falhou, fallback usado.", e);
      }
    }

    // fallback
    const scene = this.scene;
    const proj = scene.physics.add.sprite(this.x, this.y, null).setDepth(6);
    proj.setDisplaySize(6, 6);
    proj.body.setAllowGravity(false);

    const speed = 280; // NERF: antes 420
    scene.physics.moveTo(proj, aimX, aimY, speed);

    // colisão
    const overlap = scene.physics.add.overlap(proj, target, (p, pl) => {
      try {
        if (typeof pl.takeDamage === "function") {
          pl.takeDamage(this.damage || 8);
        } else if (pl.currentHP !== undefined) {
          pl.currentHP -= this.damage || 8;
        }
      } catch (e) { }

      try {
        overlap.destroy();
      } catch (e) { }

      try {
        p.destroy();
      } catch (e) { }
    });

    scene.time.delayedCall(2200, () => {
      try {
        overlap.destroy();
      } catch (e) { }
      try {
        proj.destroy();
      } catch (e) { }
    });
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
          shooter: 0xff9900,
        };
        this.setTint(tints[this.type] ?? tints[this.aiType] ?? 0xffffff);
      }
    });
  }

  setTarget(target) {
    this.target = target;
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;

    this.emit("die", this.x, this.y, this.xpValue);
    this.scene.events.emit("enemyKilled", this);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0,
      duration: 200,
      onComplete: () => {
        if (this && this.destroy) this.destroy(true);
      },
    });
  }
}
