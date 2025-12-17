// PassiveAlquimista.js
export default class PassiveAlquimista {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.isCharging = false;
    this.isOverloading = false;

    this.chargeDuration = 4000;
    this.mainExplosionRadius = 180;

    this.player.alchCharge = 0;
    this.player.alchChargeMax = 40 * 15;

    if (this.player._damageTakenMul === undefined)
      this.player._damageTakenMul = 1;

    this._ringTimers = [];
    this._chargeTimer = null;
    this._tempTimers = [];
    this._overlapDetectors = [];
    this._specialBombTimers = [];

    this._origSpeed = null;
    this._origDamageMul = null;

    this.ensureHUD();
  }

  // RESET COMPLETO
  reset() {
    this.clearVisualRings();

    if (this._chargeTimer) this._chargeTimer.remove();
    this._chargeTimer = null;

    this._tempTimers.forEach((t) => t?.remove?.());
    this._tempTimers = [];

    this._overlapDetectors.forEach((det) => det?.destroy?.());
    this._overlapDetectors = [];

    this._specialBombTimers.forEach((t) => t?.remove?.());
    this._specialBombTimers = [];

    // restaurar estado do player
    if (this.isCharging || this.isOverloading) {
      this.player.setCanAttack?.(true);
      this.player.clearTint?.();

      if (this._origSpeed !== null) this.player.speed = this._origSpeed;
      if (this._origDamageMul !== null)
        this.player._damageTakenMul = this._origDamageMul;
    }

    this.isCharging = false;
    this.isOverloading = false;

    this.player.alchCharge = 0;
    this.updateHUD();
  }

  // ATIVAÇÃO — chamando pelo PassiveSystem
  activate() {
    if (
      !this.scene.passiveSystem ||
      this.scene.passiveSystem.current !== "alquimista"
    )
      return;

    this.updateHUD();
  }

  // 🔥 Recebe a morte enviada pelo PassiveSystem
  onEnemyKilled(enemy) {
    this.handleKill();
  }

  // 🔥 Lida com kills, não usa mais listeners internos
  handleKill() {
    if (
      !this.scene.passiveSystem ||
      this.scene.passiveSystem.current !== "alquimista"
    )
      return;

    if (this.isCharging || this.isOverloading) return;

    this.player.alchCharge = Math.min(
      this.player.alchCharge + 15,
      this.player.alchChargeMax
    );

    this.updateHUD();

    if (this.player.alchCharge >= this.player.alchChargeMax) {
      this.beginChargePhase();
    }
  }

  beginChargePhase() {
    if (this.isCharging || this.isOverloading) return;

    this.isCharging = true;
    const player = this.player;

    this._origSpeed = player.speed ?? 200;
    this._origDamageMul = player._damageTakenMul;

    player.setCanAttack(false);
    player.setTint(0x44ffdd);
    player.speed = this._origSpeed * 0.4;
    player._damageTakenMul = 0.2;

    this.startVisualRings();

    this._chargeTimer = this.scene.time.delayedCall(this.chargeDuration, () =>
      this.finishFullCharge()
    );

    this.updateHUD();
  }

  startVisualRings() {
    this.clearVisualRings();
    const p = this.player;
    const scene = this.scene;

    for (let i = 0; i < 3; i++) {
      const ring = scene.add.circle(p.x, p.y, 140 + i * 30, 0xffffff, 0.15);
      ring.setStrokeStyle(3, 0xffffff, 0.6);

      const tween = scene.tweens.add({
        targets: ring,
        radius: 20,
        alpha: 0,
        duration: 800,
        repeat: -1,
        onUpdate: () => {
          ring.x = p.x;
          ring.y = p.y;
        },
      });

      this._ringTimers.push({ ring, tween });
    }
  }

  clearVisualRings() {
    this._ringTimers.forEach(({ ring, tween }) => {
      tween?.stop?.();
      ring?.destroy?.();
    });
    this._ringTimers = [];
  }

  finishFullCharge() {
    if (!this.isCharging) return;

    const player = this.player;
    this.isCharging = false;
    this.isOverloading = true;

    player.speed = this._origSpeed;
    player._damageTakenMul = this._origDamageMul;
    player.clearTint();

    this.clearVisualRings();
    this.scene.cameras.main.shake(200, 0.01);

    this.throwFrascoBomba();
  }

  throwFrascoBomba() {
    const p = this.player;
    const pointer = this.scene.input.activePointer;

    const tx = pointer.worldX ?? p.x + 140;
    const ty = pointer.worldY ?? p.y;
    const tex = this.scene.textures.exists("bottle") ? "bottle" : "flask";

    const bomb = this.scene.physics.add
      .sprite(p.x, p.y, tex)
      .setDepth(20)
      .setScale(1.45);

    this.scene.physics.moveTo(bomb, tx, ty, 700);

    const explode = () => {
      timeLimit.remove?.();
      overlap.destroy?.();

      this.mainExplosion(bomb.x, bomb.y);
      bomb.destroy();

      const finish = this.scene.time.delayedCall(600, () => {
        this.player.setCanAttack(true);
        this.player.alchCharge = 0;
        this.isOverloading = false;
        this.updateHUD();
      });

      this._specialBombTimers.push(finish);
    };

    const timeLimit = this.scene.time.delayedCall(500, explode);
    const overlap = this.scene.physics.add.overlap(
      bomb,
      this.scene.enemies,
      explode
    );

    this._tempTimers.push(timeLimit);
    this._overlapDetectors.push(overlap);
  }

  mainExplosion(x, y) {
    const scene = this.scene;
    const radius = this.mainExplosionRadius;
    const dmg = 120;

    scene.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(e.x, e.y, x, y);
      if (d <= radius) {
        e.takeDamage(dmg);
        this.applyBasicPoison(e);
        this.applyBasicSlow(e);
      }
    });

    const fx = scene.add.circle(x, y, radius, 0xffaa66, 0.18).setDepth(25);

    scene.tweens.add({
      targets: fx,
      alpha: 0,
      duration: 380,
      onComplete: () => fx.destroy(),
    });

    this.spawnExplosionGroundEffects(x, y);
  }

  applyBasicPoison(enemy) {
    if (!enemy.active || enemy.isPoisoned) return;

    enemy.isPoisoned = true;
    const dmg = 5;

    const loop = this.scene.time.addEvent({
      delay: 400,
      repeat: 3,
      callback: () => {
        if (!enemy.active) loop.remove();
        else enemy.takeDamage(dmg);
      },
    });

    this._tempTimers.push(loop);

    this.scene.time.delayedCall(1600, () => (enemy.isPoisoned = false));
  }

  applyBasicSlow(enemy) {
    if (!enemy.active || enemy.isSlowed) return;

    enemy.isSlowed = true;
    const original = enemy.speed;
    enemy.speed = original * 0.5;

    this.scene.time.delayedCall(1200, () => {
      if (enemy.active) enemy.speed = original;
      enemy.isSlowed = false;
    });
  }

  ensureHUD() {
    const scene = this.scene;
    if (!scene.passiveBar) {
      scene.passiveBarBg = scene.add
        .rectangle(100, 70, 200, 10, 0x222222)
        .setOrigin(0);
      scene.passiveBar = scene.add
        .rectangle(100, 70, 0, 10, 0x00ff88)
        .setOrigin(0);
      scene.passiveText = scene.add.text(310, 65, "Passiva: 0%", {
        fontSize: "14px",
        fill: "#00ffcc",
      });
    }
  }

  updateHUD() {
    const p = (this.player.alchCharge || 0) / (this.player.alchChargeMax || 1);

    if (this.isCharging) {
      this.scene.passiveBar.width = 200;
      this.scene.passiveText.setText("Carregando...");
      this.scene.passiveText.setColor("#66ffdd");
      return;
    }

    if (this.isOverloading) {
      this.scene.passiveBar.width = 200;
      this.scene.passiveText.setText("FRASCOBOMBA!");
      this.scene.passiveText.setColor("#ff4444");
      return;
    }

    this.scene.passiveBar.width = 200 * p;
    this.scene.passiveText.setText(`Passiva: ${Math.floor(p * 100)}%`);
    this.scene.passiveText.setColor(p >= 1 ? "#ffcc00" : "#00ffcc");
  }

  spawnExplosionGroundEffects(x, y) {
    const ws = this.scene.weaponSystem;
    if (!ws) return;

    const count = 8;
    const radius = this.mainExplosionRadius * 0.6;
    const effects = ["fire", "poison", "slow"];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = Phaser.Math.Between(radius * 0.3, radius);

      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;

      const chosen = effects[Math.floor(Math.random() * effects.length)];

      ws._createGroundEffect(
        px,
        py,
        chosen,
        this.mainExplosionRadius * 0.35 * 2,
        {
          lifetime: 8000,
          scale: 2.0,
        }
      );
    }
  }
}
