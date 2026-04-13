import StatsPlayer from "./StatsPlayer.js";
import DamagePlayer from "./DamagePlayer.js";
import { PLAYER_CLASSES } from "./PlayerClass.js";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, classKey) {

    const classConfig = PLAYER_CLASSES[classKey];

    if (!classConfig) {
      return;
    }

    const textureKey = scene.textures.exists(classConfig.texture)
      ? classConfig.texture
      : "player";

    super(scene, x, y, textureKey, classConfig.frame ?? 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(80, 120);
    this.setOffset(88, 100);
    this.setScale(0.5, 0.75);

    this.animState = "idle";
    this.lastAnim = "";
    
    console.log("player recebeu classKey:", classKey)
    this.classKey = classKey;
    this.classConfig = classConfig;

    // SISTEMAS DE STAT E DANO
    this.stats = new StatsPlayer(this, classConfig.stats);
    this.damageSystem = new DamagePlayer(this, this.stats);

    // SISTEMA DE VELOCIDADE
    this.speedBase = 200;
    this.speedModifiers = {};
    this.speed = this.speedBase;

    // STATUS BASE
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;

    this.maxHP = this.stats.maxHP || 100;
    this.currentHP = this.maxHP;

    this.baseDamage = this.stats.baseDamage || 5;

    this.magnetRadius =
      (typeof this.stats.get === "function"
        ? this.stats.get("pickupRadius") || 1
        : this.stats.pickupRadius || 1) * 100;

    this.xpGain = this.stats.xpGain || 1;

    // INPUTS
    this.keys = scene.input.keyboard.addKeys({
      up: "W",
      left: "A",
      down: "S",
      right: "D",
      dash: "SPACE",
    });

    this.dashing = false;
    this.dashCooldown = false;

    this.setCollideWorldBounds(true);
    this.facing = "down";

    this.canAttack = true;
    this.inputLocked = false;

    this.createAnimations();

  }

  // SISTEMA PRINCIPAL

  addSpeedModifier(name, mult) {
    this.speedModifiers[name] = mult;
    this.recalculateSpeed();
  }

  removeSpeedModifier(name) {
    delete this.speedModifiers[name];
    this.recalculateSpeed();
  }

  recalculateSpeed() {
    let finalMult = 1;

    for (const key in this.speedModifiers) {
      finalMult *= this.speedModifiers[key];
    }

    this.speed = this.speedBase * finalMult;
  }

  setCanAttack(value) {
    this.canAttack = value;

    // trava dash também quando carregando a bomba
    if (!value) {
      this.dashing = false;
      this.dashCooldown = true;
    } else {
      // libera novamente após final da bomba
      this.dashCooldown = false;
    }
  }

  lockInput() {
    this.inputLocked = true;
    this.setVelocity(0, 0);
  }

  unlockInput() {
    this.inputLocked = false;
  }

  // MOVIMENTO DO PLAYER
  update() {

    if (this.inputLocked) {
      this.setVelocity(0, 0);
      return;
    }

    this.handleMovement();
    this.handleDash();

    const speed = this.speed;

    let vy = 0;
    let vx = 0;
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

    const vec = new Phaser.Math.Vector2(vx, vy).normalize();
    this.setVelocity(vec.x * speed, vec.y * speed);

    if (vx !== 0 || vy !== 0) {
      this.facing = this.getFacingDirection(vx, vy);
    }

    this.updateAnimations(vx, vy);

  }

  getFacingDirection(vx, vy) {
    if (Math.abs(vx) > Math.abs(vy)) return vx > 0 ? "right" : "left";
    return vy > 0 ? "down" : "up";
  }

  // SISTEMA DE DASH
  handleDash() {
    if (!this.canAttack) return;

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

  // SISTEMA DE XP / LEVEL
  gainXP(amount) {
    const multiplier = this.xpGain ?? 1;
    const final = Math.floor(amount * multiplier);
    this.xp += final;

    this.scene?.updateXpBar?.();

    while (this.xp >= this.xpToNext) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.25);

    this.maxHP += 10;
    this.currentHP = this.maxHP;
    this.baseDamage += 1;

    this.scene?.updateHealthBar?.();
    this.scene?.updateXpBar?.();

    if (this.scene?.upgradeSystem?.openUpgradeMenu)
      this.scene.upgradeSystem.openUpgradeMenu();
  }

  // SISTEMA DE DANO
  takeDamage(amount) {
    this.damageSystem.takeDamage(amount);
  }

  heal(amount) {
    this.damageSystem.heal(amount);
  }

  refillShield(amount) {
    this.damageSystem.addShield(amount);
  }

  createAnimations() {
    const anims = this.scene.anims;
    const animConfig = this.classConfig.animations;

    for (const key in animConfig) {
      const animKey = `${this.classKey}-${key}`;

      if (anims.exists(animKey)) continue;

      anims.create({
        key: animKey,
        frames: anims.generateFrameNumbers(this.texture.key, {
          start: animConfig[key].start,
          end: animConfig[key].end
        }),
        frameRate: animConfig[key].frameRate || 8,
        repeat: animConfig[key].repeat ?? -1
      });
    }
  }

  updateAnimations(vx, vy) {

    let state = "idle";

    if (vx !== 0 || vy !== 0) {
      state = "walk";
    }

    if (this.animState !== state) {
      this.animState = state;
    }

    const animKey = `${this.classKey}-${this.animState}`;

    if (!this.scene.anims.exists(animKey)) {
      console.warn("Animação não existe:", animKey);
      return;
    }

    if (this.lastAnim !== animKey) {
      this.play(animKey, true);
      this.lastAnim = animKey;
    }
    if (!this.scene.textures.exists(this.texture.key)) {
      console.warn("Texture não encontrada:", this.texture.key);
      return;
    }

  }

  // MORTE DO PLAYER
  die() {
    this.setTint(0xff0000);
    this.setVelocity(0, 0);
    this.scene.playerDied();
  }
}
