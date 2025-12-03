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
  update() {
    this.handleMovement();
    this.handleDash();
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
