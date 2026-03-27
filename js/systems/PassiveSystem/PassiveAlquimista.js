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
      .setDepth(999)
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

    bomb.setTint(0xffaa00);

    this.scene.tweens.add({
      targets: bomb,
      scale: 1.8,
      duration: 1000,
      yoyo: true,
      repeat: 1
    });

    this._tempTimers.push(timeLimit);
    this._overlapDetectors.push(overlap);
  }

  mainExplosion(x, y) {
    const scene = this.scene;
    const radius = this.mainExplosionRadius;
    const dmg = 120;

    // DANO
    scene.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(e.x, e.y, x, y);
      if (d <= radius) {
        e.takeDamage(dmg, { isCrit: true });
        this.applyBasicPoison(e);
        this.applyBasicSlow(e);
      }
    });

    const flash = scene.add.circle(x, y, 40, 0xffffff, 0.8).setDepth(999);

    scene.tweens.add({
      targets: flash,
      scale: 4,
      alpha: 0,
      duration: 1000,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy()
    });

    // SHOCKWAVE
    const wave = scene.add.circle(x, y, 20, 0xffaa66, 0.4)
      .setStrokeStyle(4, 0xff8844)
      .setDepth(999);

    scene.tweens.add({
      targets: wave,
      radius: radius,
      alpha: 1,
      duration: 600,
      ease: "Quad.Out",
      onComplete: () => wave.destroy()
    });

    // FUMAÇA / FOGO (PARTÍCULAS)
    this.spawnExplosionParticles(x, y);

    // IMPACTO
    scene.cameras.main.shake(250, 0.015);

    // RESÍDUO
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

      const chosen = this.getRandonEffect();

      this.spawnStatusEffect(px, py, chosen);

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

  spawnExplosionParticles(x, y) {
    const scene = this.scene;

    const pulse = this.scene.add.circle(x, y, 60, 0xff6600, 0.2);

    this.scene.tweens.add({
      targets: pulse,
      scale: 3,
      alpha: 0,
      duration: 500,
      onComplete: () => pulse.destroy()
    });

    // FAÍSCAS
    for (let i = 0; i < 20; i++) {
      const particle = scene.add.circle(x, y, 3, 0xffaa33).setDepth(999);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(100, 300);

      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.5,
        duration: 500,
        ease: "Cubic.Out",
        onComplete: () => particle.destroy()
      });
    }

    // FUMAÇA
    for (let i = 0; i < 10; i++) {
      const smoke = scene.add.circle(x, y, 10, 0x555555, 0.4).setDepth(999);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(20, 80);

      scene.tweens.add({
        targets: smoke,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        scale: 2,
        alpha: 0,
        duration: 800,
        ease: "Sine.Out",
        onComplete: () => smoke.destroy()
      });
    }

    // ENERGIA CENTRAL
    const core = scene.add.circle(x, y, 25, 0xffdd88, 0.5).setDepth(999);

    scene.tweens.add({
      targets: core,
      scale: 2,
      alpha: 0,
      duration: 300,
      ease: "Cubic.Out",
      onComplete: () => core.destroy()
    });
  }

  spawnStatusEffects(x, y, type) {
    switch (type) {
      case "fire":
        this.spawnFireEffects(x, y);
        break;
      case "poison":
        this.spawnPoisonEffect(x, y);
        break;
      case "slow":
        this.spawnSlowEffect(x, y);
        break;
    }
  }

  spawnFireEffect(x, y) {
    const scene = this.scene;

    for (let i = 0; i < 12; i++) {
      const flame = scene.add.circle(x, y, 4, 0xff6600).setDepth(999);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(40, 120);

      scene.tweens.add({
        targets: flame,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        scale: 0.5,
        alpha: 0,
        duration: 400,
        ease: "Cubic.Out",
        onComplete: () => flame.destroy()
      });
    }

    // glow central
    const glow = scene.add.circle(x, y, 20, 0xff3300, 0.3);

    scene.tweens.add({
      targets: glow,
      scale: 1.8,
      alpha: 0,
      duration: 300,
      onComplete: () => glow.destroy()
    });
  }

  spawnPoisonEffect(x, y) {
    const scene = this.scene;

    for (let i = 0; i < 8; i++) {
      const bubble = scene.add.circle(x, y, 6, 0x66ff66, 0.6).setDepth(999);

      const offsetX = Phaser.Math.Between(-20, 20);
      const offsetY = Phaser.Math.Between(-10, 10);

      scene.tweens.add({
        targets: bubble,
        x: x + offsetX,
        y: y + offsetY - 30,
        scale: 0.3,
        alpha: 0,
        duration: 800,
        ease: "Sine.Out",
        onComplete: () => bubble.destroy()
      });
    }

    // pulso venenoso
    const pulse = scene.add.circle(x, y, 25, 0x33cc66, 0.2);

    scene.tweens.add({
      targets: pulse,
      scale: 1.5,
      alpha: 0,
      duration: 600,
      onComplete: () => pulse.destroy()
    });
  }

  spawnSlowEffect(x, y) {
    const scene = this.scene;

    for (let i = 0; i < 10; i++) {
      const ice = scene.add.rectangle(x, y, 4, 8, 0x66ccff).setDepth(999);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(20, 60);

      scene.tweens.add({
        targets: ice,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        rotation: Phaser.Math.FloatBetween(0, 3),
        alpha: 0,
        duration: 700,
        ease: "Sine.Out",
        onComplete: () => ice.destroy()
      });
    }

    // aura fria
    const aura = scene.add.circle(x, y, 30, 0x66ccff, 0.15);

    scene.tweens.add({
      targets: aura,
      scale: 2,
      alpha: 0,
      duration: 700,
      onComplete: () => aura.destroy()
    });
  }

  getRandonEffect() {
    const effects = ["fire", "poison", "slow"];
    return effects[Math.floor(Math.random() * effects.length)]
  }
}
