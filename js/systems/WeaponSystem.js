const FRASCO_CONFIG = {
  VELOCITY: 400,
  LIFESPAN: 400,
  AREA_RADIUS: 60,
  AREA_TICK_RATE: 300,
  BASE_TICKS: 6,
};

function getDebuffColor(type) {
  switch (type) {
    case "fire":
      return 0xff7700;
    case "poison":
      return 0x00aa00;
    case "slow":
      return 0x3366ff;
    default:
      return 0xffffff;
  }
}

export default class WeaponSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.cooldowns = {};
  }

  useWeapon(key) {
    if (!this.player.canAttack) return;

    if (this.cooldowns[key]) return;

    switch (key) {
      case "frascoInstavel":
        this._useFrasco();
        break;
      case "foiceEnferrujada":
        this.useFoiceEnferrujada();
        break;
      case "sinoPurificacao":
        this._useBell();
        break;
      default:
        console.warn("⚠️ Arma não reconhecida:", key);
        break;
    }
  }

  startCooldown(key, ms) {
    this.cooldowns[key] = true;
    this.scene.time.delayedCall(ms, () => {
      this.cooldowns[key] = false;
    });
  }

  resetAllCooldowns() {
    Object.keys(this.cooldowns).forEach((k) => (this.cooldowns[k] = false));
  }

  // ─────────────── 🧪 FRASCO INSTÁVEL ───────────────
  _useFrasco() {

    const scene = this.scene;
    const p = this.player;

    const target = scene.getClosestEnemy(450);
    if (!target) return;

    // verifica textura antes de criar
    if (!scene.textures.exists("flask")) {
      console.error("❌ Textura 'flask' não encontrada! Verifique o preload().");
      return;
    }

    // efeitos possíveis
    const effects = ["fire", "poison", "slow"];
    const chosenEffect = effects[Math.floor(Math.random() * effects.length)];

    // bônus de área apenas para slow
    const slowRadiusBonus =
      chosenEffect === "slow"
        ? (this.player.slowRadiusBonus || 30)
        : 0;

    const finalRadius = FRASCO_CONFIG.AREA_RADIUS + slowRadiusBonus;

    // calcula ângulo até o inimigo
    const baseAngle = Phaser.Math.Angle.Between(
      p.x,
      p.y,
      target.x,
      target.y
    );

    // pequeno espalhamento
    const spread = Phaser.Math.FloatBetween(-0.08, 0.08);
    const finalAngle = baseAngle + spread;

    // cria frasco
    const flask = scene.physics.add
      .sprite(p.x, p.y, "flask")
      .setDepth(5)
      .setTint(getDebuffColor(chosenEffect));

    // guarda o efeito no objeto
    flask.effect = chosenEffect;

    // aplica velocidade
    scene.physics.velocityFromRotation(
      finalAngle,
      FRASCO_CONFIG.VELOCITY,
      flask.body.velocity
    );

    // pequena rotação visual opcional
    flask.setAngularVelocity(300);

    // cooldown da habilidade
    this.startCooldown("frascoInstavel", 1200);

    // colisão com inimigos
    const collider = scene.physics.add.collider(
      flask,
      scene.enemies,
      (f, enemy) => {

        if (!f.active) return;

        this._createGroundEffect(
          f.x,
          f.y,
          f.effect,
          finalRadius
        );

        f.destroy();

        // remove collider para evitar leak
        scene.physics.world.removeCollider(collider);
      }
    );
  }

  _createGroundEffect(
    x,
    y,
    effect,
    radius = FRASCO_CONFIG.AREA_RADIUS,
    options = {}
  ) {
    const scene = this.scene;

    // aceita multiplicadores opcionais
    const lifetime = options.lifetime || null;
    const radiusMul = options.radiusMul || 1;
    const finalRadius = (radius || FRASCO_CONFIG.AREA_RADIUS) * radiusMul;

    // se lifetime não foi definido, usa sistema de ticks normal
    const durationMultiplier = this.player.debuffDurationMultiplier || 1;
    const totalTicks = lifetime
      ? Math.ceil(lifetime / FRASCO_CONFIG.AREA_TICK_RATE)
      : Math.ceil(FRASCO_CONFIG.BASE_TICKS * durationMultiplier);

    const color = getDebuffColor(effect);

    const area = scene.add
      .circle(x, y, finalRadius, color, 0.25)
      .setStrokeStyle(2, color)
      .setDepth(4);

    let ticksDone = 0;

    const timer = scene.time.addEvent({
      delay: FRASCO_CONFIG.AREA_TICK_RATE,
      loop: true,
      callback: () => {
        ticksDone++;

        scene.enemies.children.iterate((e) => {
          if (!e || !e.active) return;

          const distance = Phaser.Math.Distance.Between(e.x, e.y, x, y);
          if (distance <= finalRadius) {
            this._applyFlaskDebuff(e, effect);
          }
        });

        if (ticksDone >= totalTicks) {
          if (area && area.destroy) area.destroy();
          timer.remove(false);
        }
      },
    });
  }

  _applyFlaskDebuff(enemy, effect) {
    const scene = this.scene;
    const baseDotDamage = 8 * (this.player.dotDamageBonus || 1);

    switch (effect) {
      case "fire":
        enemy.takeDamage(baseDotDamage * 1.5);
        break;
      case "poison":
        enemy.takeDamage(baseDotDamage + 2);
        break;
      case "slow":
        // small damage tick for slow, mostly slows the enemy
        enemy.takeDamage(Math.max(1, Math.floor(baseDotDamage * 0.1)));

        if (enemy.speed == null && enemy.body && enemy.body.velocity) {
          // try to infer a speed property if missing
          enemy._origSpeed =
            Math.abs(enemy.body.velocity.x) + Math.abs(enemy.body.velocity.y) ||
            100;
          enemy.speed = enemy._origSpeed;
        }

        if (!enemy._origSpeed) enemy._origSpeed = enemy.speed;
        // apply slow only if not already slowed beyond target
        const slowFactor = 0.6;
        const minSpeed = 30;
        const targetSpeed = Math.max(enemy._origSpeed * slowFactor, minSpeed);

        if (enemy.speed > targetSpeed) {
          enemy.speed = targetSpeed;

          // restore speed after one tick interval
          scene.time.delayedCall(FRASCO_CONFIG.AREA_TICK_RATE, () => {
            if (enemy.active && enemy.speed < enemy._origSpeed) {
              enemy.speed = enemy._origSpeed;
            }
          });
        }
        break;
    }
  }

  //COVEIRO
  useFoiceEnferrujada() {
    const scene = this.scene;
    const player = this.player;
    if (!scene || !player) return;

    // Bônus da Ascensão da Carcaça
    let damageMultiplier = 1;
    let controlTime = 2000;

    if (player.isInAscension) {
      damageMultiplier = 1.5;
      controlTime = 3000;

      // Veneno mais forte a partir da 3ª ascensão
      if (player.ascensionCount >= 3) {
        player.extraVenomBonus = 1.5;
      }
    }

    if (this.cooldowns["foiceEnferrujada"]) return;
    this.startCooldown("foiceEnferrujada", 2500);

    const foice = scene.add
      .sprite(
        player.x,
        player.y,
        scene.textures.exists("foiceSprite") ? "foiceSprite" : null
      )
      .setDepth(6)
      .setOrigin(0.5)
      .setTint(0x9b7653);
    scene.physics.add.existing(foice);
    foice.body.setAllowGravity(false);
    if (foice.body.setSize) foice.body.setSize(24, 24);
    foice.body.isSensor = true;

    const SPEED = 420;
    foice.isControlling = true;

    let aimOffset = Phaser.Math.FloatBetween(-0.12, 0.12);

    const updateFoice = () => {
      if (!foice.isControlling || !foice.active) return;

      const target = scene.getClosestEnemy(450);
      if (!target) {
        foice.body.setVelocity(0, 0);
        return;
      }

      const angle = Phaser.Math.Angle.Between(
        foice.x,
        foice.y,
        target.x,
        target.y
      ) + aimOffset;

      foice.rotation = angle;
      scene.physics.velocityFromRotation(angle, SPEED, foice.body.velocity);

      scene.time.addEvent({
        delay: 400,
        loop: true,
        callback: () => {
          aimOffset = Phaser.Math.FloatBetween(-0.12, 0.12);
        }
      });
    };

    const followTimer = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: updateFoice,
    });

    // 🎯 EFEITO AO ACERTAR INIMIGOS
    scene.physics.add.overlap(foice, scene.enemies, (f, enemy) => {
      if (!enemy || !enemy.active || enemy.isDead) return;

      const damage =
        5 *
        (player.dotDamageBonus || 1) *
        (player.extraVenomBonus || 1) *
        damageMultiplier;
      enemy.takeDamage(damage);
      enemy.isMarked = true;

      // Adiciona marcador visual acima do inimigo
      if (!enemy.markIndicator || !enemy.markIndicator.active) {
        let icon = null;
        if (scene.textures.exists("markIcon")) {
          icon = scene.add
            .sprite(enemy.x, enemy.y - 24, "markIcon")
            .setDepth(12)
            .setScale(0.5)
            .setTint(0xaa55ff)
            .setAlpha(0.9);
        } else {
          icon = scene.add
            .text(enemy.x, enemy.y - 24, "☠️", {
              fontSize: "16px",
              color: "#bb55ff",
              stroke: "#000000",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(12)
            .setAlpha(0.9);
        }

        enemy.markIndicator = icon;

        // Faz a caveirinha seguir o inimigo
        const follow = scene.time.addEvent({
          delay: 30,
          loop: true,
          callback: () => {
            if (!enemy || !enemy.active || enemy.isDead) {
              if (enemy && enemy.markIndicator) {
                enemy.markIndicator.destroy();
                enemy.markIndicator = null;
              }
              follow.remove();
              return;
            }
            if (enemy.markIndicator && enemy.markIndicator.active)
              enemy.markIndicator.setPosition(enemy.x, enemy.y - 24);
          },
        });
      }

      // Dano periódico (putrefação)
      if (!enemy.putrefactionTimer) {
        enemy.putrefactionTimer = scene.time.addEvent({
          delay: 900,
          loop: true,
          callback: () => {
            if (!enemy || !enemy.active || enemy.isDead) {
              if (enemy && enemy.putrefactionTimer) {
                enemy.putrefactionTimer.remove(false);
                enemy.putrefactionTimer = null;
              }
              if (enemy && enemy.markIndicator) {
                enemy.markIndicator.destroy();
                enemy.markIndicator = null;
              }
              return;
            }

            enemy.takeDamage(5 * (player.dotDamageBonus || 1));
            if (enemy.setTint) enemy.setTint(0x4d7d47);
            scene.time.delayedCall(120, () => {
              if (enemy && enemy.active && enemy.clearTint) enemy.clearTint();
            });
          },
        });
      }

      // Lentidão temporária
      if (!enemy._origSpeed) enemy._origSpeed = enemy.speed;
      enemy.speed = Math.max(enemy._origSpeed * 0.7, 30);
      scene.time.delayedCall(2000, () => {
        if (enemy && enemy.active) enemy.speed = enemy._origSpeed;
      });
    });

    // 🔁 Retorno da foice
    scene.time.delayedCall(controlTime, () => {
      if (!foice.active) return;

      foice.isControlling = false;
      if (followTimer) followTimer.remove(false);

      scene.tweens.add({
        targets: foice,
        x: player.x,
        y: player.y,
        duration: 400,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          foice.rotation += 0.25;
        },
        onComplete: () => {
          if (foice && foice.destroy) foice.destroy();
        },
      });
    });
  }

  // ─────────────── 🔔 SENTINELA ───────────────
  _useBell() {
    const scene = this.scene;
    const p = this.player;
    const radius = 120;
    const wave = scene.add.circle(p.x, p.y, radius, 0x66ccff, 0.18).setDepth(4);
    scene.enemies.children.iterate((e) => {
      if (!e || !e.active) return;
      const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
      if (d <= radius) {
        const angle = Phaser.Math.Angle.Between(p.x, p.y, e.x, e.y);
        const kb = 300 * (p.knockbackBonus || 1);
        scene.physics.velocityFromRotation(angle, kb, e.body.velocity);
        const extra = p.extraDamageOnPush || 0;
        e.takeDamage(12 + extra);
        scene.events.emit("enemyPushed", e);
      }
    });
    this.startCooldown("sinoPurificacao", 1400);
    scene.time.delayedCall(260, () => {
      if (wave && wave.destroy) wave.destroy();
    });
  }
}
