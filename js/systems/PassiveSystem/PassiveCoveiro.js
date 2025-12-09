export default class PassiveCoveiro {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.spaceHandler = null;
    this.aura = null;
    this.auraUpdate = null;
    this.tempEvents = [];
    this.zombieTanks = [];
  }

  activate() {
    console.log("☠️ PASSIVA – COVEIRO");

    const player = this.player;
    const scene = this.scene;

    this.reset();

    if (this.scene.passiveSystem.current !== "coveiro") return;

    player.kills = 0;
    player.ascensionCount = 0;
    player.isInAscencion = false;
    player.nextAscencionAt = 30;

    this.ensureHUD();
    this.updateHUD();

    this.spaceHandler = scene.input.keyboard.on("keydown-SPACE", () => {
      if (this.scene.passiveSystem.current !== "coveiro") return;

      if (player.kills >= player.nextAscencionAt && !player.isInAscencion) {
        this.activateAscension();
      }
    });
  }

  onEnemyKilled(enemy) {
    const player = this.player;

    if (this.scene.passiveSystem.current !== "coveiro") return;
    if (player.isInAscencion) return;

    player.kills++;
    this.updateHUD();
  }

  reset() {
    const scene = this.scene;

    if (this.spaceHandler) {
      scene.input.keyboard.off("keydown-SPACE", this.spaceHandler);
      this.spaceHandler = null;
    }

    if (this.aura) {
      this.aura.destroy();
      this.aura = null;
    }

    if (this.auraUpdate) {
      scene.events.off("update", this.auraUpdate);
      this.auraUpdate = null;
    }

    this.tempEvents.forEach((ev) => ev.remove());
    this.tempEvents = [];

    this.zombieTanks.forEach((z) => {
      if (z.onDeath) z.onDeath();
    });
    this.zombieTanks = [];
  }

  ensureHUD() {
    const scene = this.scene;

    if (!scene.passiveBar) {
      scene.passiveBarBg = scene.add
        .rectangle(100, 70, 200, 10, 0x222222)
        .setOrigin(0);

      scene.passiveBar = scene.add
        .rectangle(100, 70, 0, 10, 0xaa55ff)
        .setOrigin(0);

      scene.passiveText = scene.add.text(310, 65, "Ascensão: 0%", {
        fontSize: "14px",
        fill: "#ffffff",
      });
    }
  }

  updateHUD() {
    if (this.scene.passiveSystem.current !== "coveiro") return;

    const player = this.player;
    const scene = this.scene;

    const percent = Math.min(player.kills / player.nextAscencionAt, 1);

    scene.passiveBar.width = 200 * percent;
    scene.passiveText.setText(`Ascensão: ${Math.floor(percent * 100)}%`);

    if (percent >= 1) scene.passiveText.setColor("#aa55ff");
    else scene.passiveText.setColor("#ffffff");
  }

  activateAscension() {
    const player = this.player;
    const scene = this.scene;

    if (this.scene.passiveSystem.current !== "coveiro") return;

    player.isInAscencion = true;
    player.ascensionCount++;

    const asc = player.ascensionCount;
    const duration = 10000 + asc * 2000;
    const phase = ((asc - 1) % 3) + 1;

    player.tempSpeed = 40 + asc * 4;
    player.tempMaxHp = 40 + asc * 6;
    player.hp += player.tempMaxHp;

    if (phase >= 2) player.foicePoisonMultiplier = 1.5;
    if (phase === 3) this.spawnZombieTank(asc);

    this.aura = scene.add
      .circle(player.x, player.y, 95, 0x8844ff, 0.2)
      .setStrokeStyle(3, 0xbb88ff)
      .setDepth(2);

    this.auraUpdate = () => {
      if (!this.aura) return;
      this.aura.setPosition(player.x, player.y);
    };

    scene.events.on("update", this.auraUpdate);

    const endEvent = scene.time.delayedCall(duration, () => {
      if (this.scene.passiveSystem.current !== "coveiro") return;

      player.isInAscencion = false;
      player.kills = 0;
      player.nextAscencionAt += 30;

      player.hp -= player.tempMaxHp;
      player.foicePoisonMultiplier = 1;

      if (this.aura) this.aura.destroy();
      this.aura = null;

      scene.events.off("update", this.auraUpdate);
      this.auraUpdate = null;

      this.updateHUD();
    });

    this.tempEvents.push(endEvent);
  }

  spawnZombieTank(asc) {
    const scene = this.scene;
    const player = this.player;

    const tier = asc >= 13 ? 3 : asc >= 7 ? 2 : 1;

    const spawnX = player.x + Phaser.Math.Between(-70, 70);
    const spawnY = player.y + Phaser.Math.Between(-70, 70);

    const zombie = scene.physics.add
      .sprite(spawnX, spawnY, "zombie")
      .setScale(1.4 + tier * 0.2)
      .setDepth(3);

    zombie.hp = tier === 1 ? 220 : tier === 2 ? 450 : 320;
    zombie.speed = 50 + tier * 10;
    zombie.corrosionDamage = 120 + tier * 100;
    zombie.corrosionRadius = 120 + tier * 40;

    zombie.tauntEvent = scene.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        if (this.scene.passiveSystem.current !== "coveiro") return;
        scene.enemies.children.each((e) => {
          if (Phaser.Math.Distance.Between(zombie.x, zombie.y, e.x, e.y) <= 260)
            e.target = zombie;
        });
      },
    });

    zombie.moveEvent = scene.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        if (this.scene.passiveSystem.current !== "coveiro") return;

        let nearest = null;
        let dist = Infinity;

        scene.enemies.children.each((e) => {
          const d = Phaser.Math.Distance.Between(zombie.x, zombie.y, e.x, e.y);
          if (d < dist) {
            nearest = e;
            dist = d;
          }
        });

        if (nearest) scene.physics.moveToObject(zombie, nearest, zombie.speed);
        else scene.physics.moveToObject(zombie, player, zombie.speed * 0.6);
      },
    });

    zombie.takeDamage = (dmg) => {
      zombie.hp -= dmg;
      if (zombie.hp <= 0) zombie.onDeath();
    };

    zombie.onDeath = () => {
      if (zombie._dead) return;
      zombie._dead = true;

      zombie.tauntEvent.remove();
      zombie.moveEvent.remove();

      const explosionRadius = zombie.corrosionRadius || 120;
      const explosionDamage = zombie.corrosionDamage || 100;

      // --- 🔥 Explosão 100% VISUAL — agora com Graphics (não empurra ninguém!)
      const explosion = scene.add.graphics();
      explosion.setDepth(5);

      // animação desenhando círculo crescendo
      scene.tweens.add({
        targets: explosion,
        duration: 300,
        onUpdate: (tween) => {
          const radius = 20 + (explosionRadius - 20) * tween.progress;
          explosion.clear();
          explosion.fillStyle(0x8844ff, 0.35);
          explosion.fillCircle(zombie.x, zombie.y, radius);
        },
        onComplete: () => {
          explosion.destroy();
        },
      });

      // --- 🧪 Aplicar veneno igual o da foice
      scene.enemies.children.each((enemy) => {
        if (!enemy || !enemy.active || enemy.isDead) return;

        const dist = Phaser.Math.Distance.Between(
          zombie.x,
          zombie.y,
          enemy.x,
          enemy.y
        );

        if (dist <= explosionRadius) {
          // Marca para veneno
          if (!enemy.corrosionTicks) enemy.corrosionTicks = 0;
          enemy.corrosionTicks += 3; // 3 ticks de veneno forte

          enemy.corrosionDamage = explosionDamage;
          enemy.corrosionSource = "coveiro-zumbi";

          // Caso exista callback do veneno
          if (enemy.applyCorrosion) enemy.applyCorrosion();
        }
      });

      // remover zumbi
      zombie.destroy();
    };

    this.zombieTanks.push(zombie);

    const endEvent = scene.time.delayedCall(8000 + tier * 2000, () =>
      zombie.onDeath()
    );
    this.tempEvents.push(endEvent);
  }
}
