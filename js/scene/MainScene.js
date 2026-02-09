import Player from "../entities/Player/player.js";
import Enemy from "../entities/Enemy/enemy.js";
import XPOrb from "../entities/XPOrb.js";
import UpgradeSystem from "../systems/UpgradeSystem.js";
import ClassSystem from "../systems/ClassSystems.js";
import PassiveSystem from "../systems/PassiveSystem/PassiveSystem.js";
import WeaponSystem from "../systems/WeaponSystem.js";
import SpawnDirector from "../Director/SpawnDirector.js";
import { PLAYER_CLASSES } from "../entities/Player/PlayerClass.js";
import EnemyBullet from "../entities/Enemy/EnemyBullet.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    // chave da scene (consistente com o que você usa ao start)
    super({ key: "MainScene" });
  }

  preload() {
    const g = this.add.graphics();

    const shapes = [
      { key: "player", color: 0xffffff, type: "rect", w: 20, h: 20 },
      { key: "enemy", color: 0xff3333, type: "rect", w: 20, h: 20 },
      { key: "xp_orb", color: 0x6a00ff, type: "circle", r: 5 },
      { key: "flask", color: 0x00ff00, type: "rect", w: 8, h: 8 }
    ];

    this.load.spritesheet("alquimista", "assets/Sprites/alquimista.jpg", {
      frameWidth: 64,
      frameHeight: 64
    });

    shapes.forEach(shape => {
      g.clear();
      g.fillStyle(shape.color, 1);

      if (shape.type === "rect") g.fillRect(0, 0, shape.w, shape.h);
      else g.fillCircle(shape.r, shape.r, shape.r);

      g.generateTexture(shape.key, shape.w || shape.r * 2, shape.h || shape.r * 2);
    });

    if (!this.textures.exists("pixel")) {
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(0, 0, 1, 1);
      gfx.generateTexture("pixel", 1, 1);
      gfx.destroy();
    }

    g.destroy();
  }

  init(data) {
    this.selectedClassKey = data?.selectedClassKey ?? null;
    console.log("Selected class key:", this.selectedClassKey);
  }


  create() {
    this.cursors = this.input.keyboard.addKeys("W,S,A,D");
    this.cameras.main.setBackgroundColor("#202733");

    // Mundo
    this.worldWidth = 5000;
    this.worldHeight = 5000;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Grupos
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.xpOrbs = this.physics.add.group({
      classType: XPOrb,
      runChildUpdate: true
    });
    this.enemiesInAura = new Set();

    // Sistemas (sem player)
    this.upgradeSystem = new UpgradeSystem(this);
    this.classSystem = new ClassSystem(this);
    this.weaponSystem = null;
    this.passiveSystem = null;

    // Spawn Director
    this.SpawnDirector = new SpawnDirector(this);

    // ===== UI =====
    this.passiveBarBg = this.add.rectangle(100, 70, 200, 10, 0x222222)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.passiveBar = this.add.rectangle(100, 70, 0, 10, 0x00ff88)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1001);

    this.passiveText = this.add.text(310, 65, "Passiva: 0%", {
      fontSize: "14px",
      fill: "#00ffcc"
    })
      .setScrollFactor(0)
      .setDepth(1001);

    // ===== TIMER =====
    this.matchDuration = 10 * 60 * 1000; // 10 minutos
    this.matchStartTime = this.time.now;

    this.timerText = this.add.text(16, 16, "10:00", {
      fontSize: "18px",
      fill: "#ffffff",
      stroke: "#000",
      strokeThickness: 3
    })
      .setScrollFactor(0)
      .setDepth(1000);

    // ===== INPUT =====
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.input.keyboard.on("keydown-SPACE", () => {
      if (!this.passiveSystem || !this.player) return;

      const name = (this.player.currentClass || this.player.className || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, "");

      if (name.includes("alquimista")) {
        this.passiveSystem.activatePassiva?.();
      } else if (name.includes("coveiro")) {
        this.passiveSystem.activateAscension?.(this.player);
      } else if (name.includes("sentinela")) {
        this.passiveSystem.activateSentinela?.();
      }
    });

    // XP drop
    this.events.on("enemyKilled", enemy => {
      if (!enemy) return;
      this.spawnXPOrb(enemy.x, enemy.y, enemy.xpValue);
    });

    this.enemyBullets = this.add.group();

    // Start
    if (!this.selectedClassKey) {
      console.error("Classe não definida, voltando ao menu");
      this.scene.start("MenuScene");
      return;
    }

    console.log("Chamando startGame...");
    this.startGame(this.selectedClassKey);

  }


  // cria/encontra player e inicia sistemas que precisam dele
  startGame(classKey) {
    // evita iniciar duas vezes
    if (this.isGameStarted) return;
    this.isGameStarted = true;

    // resolve configuração da classe
    const classConfig = PLAYER_CLASSES[classKey];

    if (!classConfig) {
      console.error("Classe inválida:", classKey);
      return;
    }

    console.log("Iniciando jogo com a classe:", classKey);

    // ===== PLAYER =====
    this.player = new Player(
      this,
      this.worldWidth / 2,
      this.worldHeight / 2,
      classKey
    );

    if (!this.player) {
      console.error("Falha ao criar o Player");
      return;
    }

    this.player.setCollideWorldBounds?.(true);

    // câmera segue o player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ===== SISTEMAS =====
    this.weaponSystem = new WeaponSystem(this, this.player);
    this.passiveSystem = new PassiveSystem(this, this.player);

    if (classConfig.weaponKey) {
      this.weaponSystem.useWeapon(classConfig.weaponKey);
    }

    this.passiveSystem.activateClassAbilities?.(classKey);


    // ativa habilidades/passivas da classe
    this.passiveSystem.activateClassAbilities?.(classKey);

    // ===== ARMA INICIAL =====
    if (classConfig.weaponKey) {
      this.weaponLoopEvent = this.time.addEvent({
        delay: 1200,
        loop: true,
        callback: () => {
          this.weaponSystem.useWeapon(classConfig.weaponKey);
        },
      });
    }

    // ===== MODIFICADORES DE CLASSE =====
    if (classConfig.moveSpeed) {
      this.player.speed *= 1 + classConfig.moveSpeed;
    }

    if (classConfig.damageMultiplier) {
      this.player.baseDamage *= classConfig.damageMultiplier;
    }

    // ===== HUD =====
    this.healthBarBG = this.add
      .rectangle(100, 20, 200, 20, 0x333333)
      .setOrigin(0)
      .setScrollFactor(0);

    this.healthBar = this.add
      .rectangle(100, 20, 200, 20, 0xff0000)
      .setOrigin(0)
      .setScrollFactor(0);

    this.xpBarBG = this.add
      .rectangle(100, 50, 200, 10, 0x222222)
      .setOrigin(0)
      .setScrollFactor(0);

    this.xpBar = this.add
      .rectangle(100, 50, 0, 10, 0x6a00ff)
      .setOrigin(0)
      .setScrollFactor(0);

    this.levelText = this.add
      .text(310, 35, `Lv ${this.player.level}`, {
        fontSize: "16px",
        fill: "#ffffff",
      })
      .setScrollFactor(0);

    this.updateHealthBar();
    this.updateXpBar();

    // ===== COLISÕES =====
    this.physics.add.overlap(
      this.player,
      this.xpOrbs,
      this.handleXPCollect,
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerHit,
      null,
      this
    );

    // ===== AURA =====
    if (this.player.aura) {
      this.physics.add.overlap(
        this.player.aura,
        this.enemies,
        (aura, enemy) => {
          this.enemiesInAura.add(enemy);
        }
      );
    }

    // ===== LOOP DE DANO DA AURA =====
    this.time.addEvent({
      delay: this.player.damageInterval || 200,
      callback: this.processAuraDamage,
      callbackScope: this,
      loop: true,
    });

    // garante física ativa
    this.physics.resume();
  }


  update(time, delta) {
    if (!this.isGameStarted || !this.player) return;

    // Player
    this.player.update?.(this.cursors);

    // Spawn
    this.SpawnDirector?.update(time, delta);

    // Enemies (opcional manter mesmo com runChildUpdate)
    this.enemies.children.iterate(enemy => {
      enemy?.update?.(time, delta);
    });

    // XP Orbs
    this.xpOrbs.children.iterate(orb => {
      orb?.update?.(this.player);
    });

    // HUD
    this.updateHealthBar();
    this.updateXpBar();

    // Timer
    if (!this.timerText) return;

    const elapsed = time - this.matchStartTime;
    const remaining = Math.max(0, this.matchDuration - elapsed);

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    this.timerText.setText(
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    );
  }

  getClosestEnemy(maxRange = Infinity) {
    if (!this.enemies || !this.player) return null;

    let closest = null;
    let minDist = maxRange;

    const px = this.player.x;
    const py = this.player.y;

    this.enemies.children.iterate(enemy => {
      if (!enemy || !enemy.active || enemy.isDead) return;

      const d = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (d < minDist) {
        minDist = d;
        closest = enemy;
      }
    });

    return closest;
  }


  // resto das funções (copie as suas originais, mantive apenas assinaturas)
  processAuraDamage() {
    this.enemiesInAura.forEach(enemy => {
      if (enemy && enemy.active) {
        if (typeof enemy.takeDamage === "function") {
          enemy.takeDamage(this.player.baseDamage || 10);
        } else if (enemy.currentHP !== undefined) {
          enemy.currentHP -= (this.player.baseDamage || 10);
        }
      }
    });

    this.enemiesInAura.clear();
  }

  handleXPCollect(playerSprite, orb) {
    if (!orb || orb.collected) return;

    orb.collected = true;

    const xpValue = orb.value || 10;
    if (this.player.gainXP) {
      const multiplier = this.player.xpGain || 1;
      this.player.gainXP(Math.floor(xpValue * multiplier));
    }

    this.showXPText(orb.x, orb.y, `+${xpValue} XP`);
    this.events.emit("pickupXP", orb);

    if (typeof orb.collect === "function") {
      orb.collect(this.player);
    } else {
      orb.setVisible(false);
      if (orb.body) orb.body.enable = false;
      this.time.delayedCall(50, () => {
        try { orb.destroy(); } catch (e) { }
      });
    }
  }

  handlePlayerHit(player, enemy) {
    if (!player.lastHitTime || this.time.now - player.lastHitTime > 1000) {
      player.currentHP -= 10;
      this.updateHealthBar();

      player.setTint?.(0xff5555);
      this.time.delayedCall(150, () => player.clearTint?.());

      player.lastHitTime = this.time.now;

      if (player.currentHP <= 0) {
        this.handlePlayerDeath();
      }
    }
  }

  handlePlayerDeath() {
    this.physics.pause();

    this.player.setTint?.(0x000000);

    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      "💀 GAME OVER 💀",
      {
        fontSize: "48px",
        fill: "#ff0000",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 6
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.time.delayedCall(3000, () => this.scene.start("MenuScene"));
  }

  spawnXPOrb(x, y, value) {
    const orb = new XPOrb(this, x, y, value);
    this.xpOrbs.add(orb);
  }

  updateHealthBar() {
    if (!this.player || !this.healthBar) return;

    const hpPercent = Phaser.Math.Clamp(
      this.player.currentHP / this.player.maxHP,
      0,
      1
    );

    this.healthBar.width = 200 * hpPercent;
  }


  updateXpBar() {
    if (!this.player || !this.xpBar || !this.levelText) return;

    const xpPercent = Phaser.Math.Clamp(
      this.player.xp / this.player.xpToNext,
      0,
      1
    );

    this.xpBar.width = 200 * xpPercent;
    this.levelText.setText(`Lv ${this.player.level}`);
  }


  showXPText(x, y, text) {
    const xpText = this.add.text(x, y - 10, text, {
      fontSize: "16px",
      fill: "#00ffff",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: xpText,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => xpText.destroy(),
    });
  }

  showHordeWarning() {
    this.hordeText.setAlpha(1);
    this.hordeText.setScale(0.8);

    this.tweens.add({
      targets: this.hordeText,
      scale: 1.1,
      duration: 300,
      yoyo: true,
      repeat: 2,
    });

    this.tweens.add({
      targets: this.hordeText,
      alpha: 0,
      delay: 2000,
      duration: 500,
    });

    // opcional: screen shake leve
    this.cameras.main.shake(200, 0.005);
  }
}
