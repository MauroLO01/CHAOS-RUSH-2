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

  getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
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

  // Recebe a morte enviada pelo PassiveSystem
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

    const colors = [0x00ffcc, 0x00ddaa, 0x009977];

    for (let i = 0; i < 3; i++) {
      const ring = scene.add.circle(p.x, p.y, 60 + i * 28, 0x000000, 0);
      ring.setStrokeStyle(2, colors[i], 0.9);
      ring.setDepth(10);

      const tweens = scene.tweens.add({
        targets: ring,
        scaleX: 2.2 + i * 0.3,
        scaleY: 2.2 + i * 0.3,
        alpha: 0,
        duration: 600 + i * 200,
        repeat: -1,
        ease: "Stepped",
        easeParams: [4],
        onUpdate: () => {
          ring.x = p.x;
          ring.y = p.y;
        },
      });

      this._ringTimers.push({ ring, tweens });
    }

    const BlinkTimer = scene.time.addEvent({
      delay: 400,
      repeat: -1,
      callback: () => {
        if (!this.isCharging) return;
        const on = (Math.floor(scene.time.now / 400) % 2 === 0);
        p.setTint(on ? 0x44ffdd : 0x00ffcc);
      },
    });

    this._ringTimers.push({ ring: null, tween: BlinkTimer });
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
      () => explode()
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

  spawnPoisonEffect(x, y) {
    const scene = this.scene;
    const poisonColors = [0x00ff44, 0x44ff88, 0xaaff00];

    for (let i = 0; i < 10; i++) {
      const color = poisonColors[i % poisonColors.length];
      const bubble = scene.add
        .rectangle(
          x + Phaser.Math.Between(-24, 24),
          y + Phaser.Math.Between(-8, 8),
          6, 6, color, 0.85
        )
        .setDepth(999);

      scene.tweens.add({
        targets: bubble,
        y: bubble.y - Phaser.Math.Between(20, 50),
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 700,
        ease: 'Stepped',
        easeParams: [5],
        onComplete: () => bubble.destroy(),
      });
    }
  }

  _spawnResidue(x, y, effect) {
    const scene = this.scene;

    const colorMap = {
      fire: 0xff4400,
      poison: 0x00cc44,
      slow: 0x44aaff,
    };
    const color = colorMap[effect] || 0xffffff;
    const lifetime = 6000;

    // Poça no chão — círculo central que pulsa
    const puddle = scene.add
      .circle(x, y, 18, color, 0.28)
      .setStrokeStyle(3, color, 0.9)
      .setDepth(3);

    // Pulso periódico
    const pulseTimer = scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (!puddle.active) return;
        scene.tweens.add({
          targets: puddle,
          scaleX: 1.15, scaleY: 1.15,
          duration: 200,
          yoyo: true,
          ease: 'Stepped',
          easeParams: [2],
        });
      },
    });

    // Partículas específicas por tipo
    const particleTimer = scene.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        if (!puddle.active) return;

        if (effect === 'fire') {
          // Faíscas que sobem
          for (let i = 0; i < 5; i++) {
            const ox = Phaser.Math.Between(-14, 14);
            const spark = scene.add
              .rectangle(x + ox, y, 3, 3, this.getRandom([0xff2200, 0xff6600, 0xffdd00]))
              .setDepth(6);
            scene.tweens.add({
              targets: spark,
              y: y - Phaser.Math.Between(14, 30),
              alpha: 0, scaleX: 0.3, scaleY: 0.3,
              duration: 380,
              ease: 'Stepped', easeParams: [3],
              onComplete: () => spark.destroy(),
            });
          }
        }

        if (effect === 'poison') {
          // Bolhas que sobem devagar
          for (let i = 0; i < 4; i++) {
            const ox = Phaser.Math.Between(-12, 12);
            const oy = Phaser.Math.Between(-6, 6);
            const bubble = scene.add
              .circle(x + ox, y + oy, Phaser.Math.Between(3, 5),
                this.getRandom([0x00ff44, 0x44ff88, 0xaaff00]), 0.8)
              .setDepth(6);
            scene.tweens.add({
              targets: bubble,
              y: y + oy - Phaser.Math.Between(12, 24),
              alpha: 0, scale: 0.2,
              duration: 700,
              ease: 'Sine.Out',
              onComplete: () => bubble.destroy(),
            });
          }
        }

        if (effect === 'slow') {
          for (let i = 0; i < 5; i++) {
            const ox = Phaser.Math.Between(-14, 14);
            const w = (i % 2 === 0) ? 2 : 5;
            const h = (i % 2 === 0) ? 5 : 2;
            const flake = scene.add
              .rectangle(x + ox, y - 8, w, h,
                this.getRandom([0xaaeeff, 0x66ccff, 0xffffff]))
              .setDepth(6)
              .setAngle(Phaser.Math.Between(0, 90));
            scene.tweens.add({
              targets: flake,
              y: y + Phaser.Math.Between(4, 14),
              angle: flake.angle + 60,
              alpha: 0,
              duration: 650,
              ease: 'Stepped', easeParams: [4],
              onComplete: () => flake.destroy(),
            });
          }
        }
      },
    });

    // Destroy tudo após lifetime
    scene.time.delayedCall(lifetime, () => {
      pulseTimer.remove(false);
      particleTimer.remove(false);

      // Fade out suave da poça
      scene.tweens.add({
        targets: puddle,
        alpha: 0,
        duration: 400,
        onComplete: () => puddle.destroy(),
      });
    });
  }

  spawnExplosionGroundEffects(x, y) {
    console.log("WS:", this.scene.weaponSystem);
    console.log("WEAPONS:", this.scene.weaponSystem?.weapons);
    console.log("ALQUIMISTA:", this.scene.weaponSystem?.weapons?.alquimista);
    const ws = this.scene.weaponSystem?.weapons?.frascoInstavel;

    if (!ws || typeof ws._createGroundEffect !== 'function') {
      console.warn("⚠️ WeaponAlquimista não disponível para ground effect")
      return;
    }

    const count = 14;
    const radius = this.mainExplosionRadius * 0.85;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = Phaser.Math.Between(radius * 0.3, radius);

      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;

      const chosen = this.getRandonEffect();

      // resíduo visual — não depende do ws
      this._spawnResidue(px, py, chosen);

      // área de dano — só chama se ws existir
      if (ws) {
        ws._createGroundEffect(
          px, py, chosen,
          this.mainExplosionRadius * 0.35 * 2,
          { lifetime: 8000 }
        );
      }
    }
  }


  getRandonEffect() {
    const effects = ["fire", "poison", "slow"];
    return effects[Math.floor(Math.random() * effects.length)]
  }

  spawnExplosionParticles(x, y) {
    const scene = this.scene;

    // FLASH
    const flash = scene.add.rectangle(x, y, 40, 40, 0xffffff, 1).setDepth(1000);

    scene.tweens.add({
      targets: flash,
      scaleX: 5,
      scaleY: 5,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy()
    });

    // FAÍSCAS
    for (let i = 0; i < 20; i++) {
      const spark = scene.add
        .rectangle(x, y, 4, 4, 0xffaa00)
        .setDepth(999);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(40, 140);

      scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 300,
        onComplete: () => spark.destroy()
      });
    }

    // FUMAÇA
    for (let i = 0; i < 8; i++) {
      const smoke = scene.add
        .rectangle(
          x + Phaser.Math.Between(-20, 20),
          y + Phaser.Math.Between(-10, 10),
          8, 8,
          0x777777,
          0.7
        )
        .setDepth(998);

      scene.tweens.add({
        targets: smoke,
        y: smoke.y - Phaser.Math.Between(20, 50),
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 600,
        onComplete: () => smoke.destroy()
      });
    }
  }
}
