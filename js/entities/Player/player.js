import StatsPlayer from "../Player/StatsPlayer.js"
import DamagePlayer from "../Player/DamagePlayer.js";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // SISTEMAS DE STAT E DANO
    this.stats = new StatsPlayer(this);
    this.damageSystem = new DamagePlayer(this, this.stats);

    // SPEED base: usa multiplicador do stats de forma segura
    const baseSpeed = 200;
    const msMult = (typeof this.stats.get === "function") ? this.stats.get("moveSpeedMultiplier") : this.stats.moveSpeedMultiplier;
    this.speed = (msMult && typeof msMult === "number") ? baseSpeed * msMult : baseSpeed;

    // SISTEMAS DE STATUS BASE
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;

    // Vida base
    this.maxHP = this.stats.maxHP || 100;
    this.currentHP = this.maxHP;

    // Dano base
    this.baseDamage = this.stats.baseDamage || 5;

    // Velocidade
    this.speed = this.stats.moveSpeed || 200;

    // Raio do magnetismo
    this.magnetRadius = (typeof this.stats.get === "function" ? (this.stats.get("pickupRadius") || 1) : (this.stats.pickupRadius || 1)) * 100;

    // Multiplicador de XP
    this.xpGain = this.stats.xpGain || 1;

    // INPUTS
    this.keys = scene.input.keyboard.addKeys({
      up: "W",
      left: "A",
      down: "S",
      right: "D",
      dash: "SPACE"
    });

    // MOVIMENTO
    this.speed = this.stats.movementSpeed;
    this.dashing = false;
    this.dashCooldown = false;

    // CONFIGURAÇÕES DO CORPO
    this.setCollideWorldBounds(true);

    // ANIMAÇÕES E CONTROLE
    this.facing = "down";
  }

  // ============   MOVIMENTO DO PLAYER   =============
  update(cursors) {
    this.handleMovement();
    this.handleDash();

    const speed = this.speed;

    let vy = 0;
    let vx = 0;

    if (cursors.A.isDown) vx -= speed;
    if (cursors.D.isDown) vx += speed;
    if (cursors.W.isDown) vy -= speed;
    if (cursors.S.isDown) vy += speed;

    this.setVelocity(vx, vy);
  }

  handleMovement() {
    const { up, down, left, right } = this.keys;
    let vx = 0;
    let vy = 0;

    if (up.isDown) vy = -1;
    else if (down.isDown) vy = 1;

    if (left.isDown) vx = -1;
    else if (right.isDown) vx = 1;

    const speed = this.dashing ? this.speed * 3 : this.speed;

    this.setVelocity(vx * speed, vy * speed);

    if (vx !== 0 || vy !== 0) {
      this.facing = this.getFacingDirection(vx, vy);
    }
  }

  getFacingDirection(vx, vy) {
    if (Math.abs(vx) > Math.abs(vy)) return vx > 0 ? "right" : "left";
    return vy > 0 ? "down" : "up";
  }

  // ============   SISTEMA DE DASH   =================
  handleDash() {
    if (this.keys.dash.isDown && !this.dashing && !this.dashCooldown) {
      this.dashing = true;
      this.dashCooldown = true;

      this.scene.time.delayedCall(150, () => {
        this.dashing = false;
      });

      this.scene.time.delayedCall(600, () => {
        this.dashCooldown = false;
      });
    }
  }

  // Funções de progressão de nível
  gainXP(amount) {
    // usa multiplicador xpGain caso exista
    const multiplier = this.xpGain ?? 1;
    const final = Math.floor(amount * multiplier);
    this.xp += final;

    // atualiza HUD
    this.scene?.updateXpBar?.();

    // loop de level up caso receba muito XP
    while (this.xp >= this.xpToNext) {
      this.levelUp();
    }
  }


  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.25);

    // CORREÇÃO: nome correto é maxHP (não maxHp)
    this.maxHP += 10;
    this.currentHP = this.maxHP;
    this.baseDamage += 1;

    // Atualiza HUD quando upar (se existir)
    this.scene?.updateHealthBar?.();
    this.scene?.updateXpBar?.();

    // Abre menu de upgrades (se existir sistema)
    if (this.scene?.upgradeSystem && typeof this.scene.upgradeSystem.openUpgradeMenu === "function") {
      this.scene.upgradeSystem.openUpgradeMenu(this);
    }
  }

  // ============   SISTEMA DE DANO   =================
  takeDamage(amount) {
    this.damageSystem.takeDamage(amount);
  }

  heal(amount) {
    this.damageSystem.heal(amount);
  }

  refillShield(amount) {
    this.damageSystem.addShield(amount);
  }

  // ============   MORTE DO PLAYER   =================
  die() {
    this.setTint(0xff0000);
    this.setVelocity(0, 0);
    this.scene.playerDied();
  }
}
