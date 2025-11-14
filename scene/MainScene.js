import Player from "../entities/player.js";
import Enemy from "../entities/enemy.js";
import XPOrb from "../entities/XPOrb.js";
import UpgradeSystem from "../systems/UpgradeSystem.js";
import ClassSystem from "../systems/classSystems.js";
import PassiveSystem from "../systems/passiveSystem.js";
import WeaponSystem from "../systems/weaponSystem.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    const g = this.add.graphics();

    const shapes = [
      { key: "player", color: 0xffffff, type: "rect", w: 20, h: 20 },
      { key: "enemy", color: 0xff3333, type: "rect", w: 20, h: 20 },
      { key: "xp_orb", color: 0x6a00ff, type: "circle", r: 5 },
      { key: "flask", color: 0x00ff00, type: "rect", w: 8, h: 8 },
    ];

    shapes.forEach(shape => {
      g.clear();
      g.fillStyle(shape.color, 1);
      if (shape.type === "rect") g.fillRect(0, 0, shape.w, shape.h);
      else if (shape.type === "circle") g.fillCircle(shape.r, shape.r, shape.r);
      g.generateTexture(shape.key, shape.w || shape.r * 2, shape.h || shape.r * 2);
    });

    g.destroy();
  }


  init(data) {
    this.selectedClass = data.selectedClass || null;
  }

  create() {
    this.cursors = this.input.keyboard.addKeys("W,S,A,D");
    this.cameras.main.setBackgroundColor("#202733");

    this.worldWidth = 5000;
    this.worldHeight = 5000;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Inicializa grupos e sistemas
    this.enemies = this.physics.add.group();
    this.xpOrbs = this.physics.add.group({ classType: XPOrb, runChildUpdate: true });
    this.enemiesInAura = new Set();
    this.waveCount = 0;
    this.spawnAmount = 3;
    this.baseSpawnDelay = 3000;

    this.upgradeSystem = new UpgradeSystem(this);
    this.classSystem = new ClassSystem(this);
    this.passiveSystem = new PassiveSystem(this);
    this.weaponSystem = new WeaponSystem(this);

    this.passiveBarBg = this.add.rectangle(100, 70, 200, 10, 0x222222)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.passiveBar = this.add.rectangle(100, 70, 0, 10, 0x00ff88)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.passiveText = this.add.text(310, 65, "Passiva: 0%", {
      fontSize: "14px",
      fill: "#00ffcc"
    }).setScrollFactor(0);

    if (this.selectedClass) {
      this.startGame(this.selectedClass);
    } else {
      console.warn("⚠️ Nenhuma classe recebida. Retornando ao menu...");
      this.scene.start("MenuScene");
    }
  }

  startGame(selectedClass) {
    if (this.isGameStarted) return;
    this.isGameStarted = true;

    this.player = new Player(this, this.worldWidth / 2, this.worldHeight / 2, selectedClass);
    this.player.setCollideWorldBounds(true);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.weaponSystem = new WeaponSystem(this, this.player);
    this.passiveSystem = new PassiveSystem(this, this.player);

    const normalizedName = selectedClass.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");

    this.passiveSystem.activateClassAbilities(normalizedName);

    // Remove menu da seleção de classe se existir
    if (this.classSystem.menuBackground) this.classSystem.menuBackground.destroy();
    if (this.classSystem.classButtons)
      this.classSystem.classButtons.forEach((btn) => btn.destroy());

    // Loop de ataque da arma
    this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => this.weaponSystem.useWeapon(selectedClass.weaponKey),
    });

    // Aplica atributos da classe
    if (selectedClass.moveSpeed) this.player.speed *= 1 + selectedClass.moveSpeed;
    if (selectedClass.damageMultiplier) this.player.baseDamage *= selectedClass.damageMultiplier;
    if (selectedClass.passive) selectedClass.passive(this, this.player);

    // Interface
    this.healthBarBG = this.add.rectangle(100, 20, 200, 20, 0x333333).setOrigin(0, 0).setScrollFactor(0);
    this.healthBar = this.add.rectangle(100, 20, 200, 20, 0xff0000).setOrigin(0, 0).setScrollFactor(0);
    this.xpBarBG = this.add.rectangle(100, 50, 200, 10, 0x222222).setOrigin(0, 0).setScrollFactor(0);
    this.xpBar = this.add.rectangle(100, 50, 0, 10, 0x6a00ff).setOrigin(0, 0).setScrollFactor(0);
    this.levelText = this.add.text(310, 35, `Lv ${this.player.level}`, {
      fontSize: "16px",
      fill: "#ffffff",
    }).setScrollFactor(0);

    this.updateHealthBar();
    this.updateXpBar();

    // Overlaps e dano
    this.physics.add.overlap(this.player.aura, this.enemies, (aura, enemy) => {
      this.enemiesInAura.add(enemy);
    });
    this.physics.add.overlap(this.player, this.xpOrbs, this.handleXPCollect, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);

    this.time.addEvent({
      delay: this.player.damageInterval || 200,
      callback: this.processAuraDamage,
      callbackScope: this,
      loop: true,
    });

    this.physics.resume();
    this.time.delayedCall(1000, () => this.startWave(), [], this);

    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.passiveSystem.activateAscensaoCarcaca) {
        this.passiveSystem.activateAscensaoCarcaca();
      }
    });

  }

  update() {
    if (!this.isGameStarted || !this.player) return;

    this.player.update(this.cursors);
    this.enemies.children.iterate((enemy) => enemy?.update(this.player));
    this.xpOrbs.children.iterate((orb) => orb?.update(this.player));

    this.updateHealthBar();
    this.updateXpBar();

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.passiveSystem.activateAscensaoCarcaca(this.player);
    }
  }

  processAuraDamage() {
    this.enemiesInAura.forEach((enemy) => {
      if (enemy && enemy.active) enemy.takeDamage(this.player.baseDamage || 10);
    });
    this.enemiesInAura.clear();
  }

  handleXPCollect(playerSprite, orb) {
    if (!orb || orb.collected) return;
    orb.collected = true;
    const xpValue = orb.value || 10;
    this.player.gainXP(xpValue);
    this.showXPText(orb.x, orb.y, `+${xpValue} XP`);
    this.events.emit("pickupXP", orb);
    orb.destroy();
  }

  handlePlayerHit(player, enemy) {
    if (!player.lastHitTime || this.time.now - player.lastHitTime > 1000) {
      player.currentHP -= 10;
      this.updateHealthBar();
      player.setTint(0xff5555);
      this.time.delayedCall(150, () => player.clearTint());
      player.lastHitTime = this.time.now;

      if (player.currentHP <= 0) this.handlePlayerDeath();
    }
  }

  handlePlayerDeath() {
    this.physics.pause();
    this.player.setTint(0x000000);

    this.add.text(this.scale.width / 2, this.scale.height / 2, "💀 GAME OVER 💀", {
      fontSize: "48px",
      fill: "#ff0000",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0);

    this.time.delayedCall(3000, () => {
      this.scene.start("MenuScene");
    });
  }

  updateHealthBar() {
    const hpPercent = Phaser.Math.Clamp(this.player.currentHP / this.player.maxHP, 0, 1);
    this.healthBar.width = 200 * hpPercent;
  }

  updateXpBar() {
    const xpPercent = Phaser.Math.Clamp(this.player.xp / this.player.xpToNext, 0, 1);
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
    }).setOrigin(0.5).setDepth(20).setAlpha(1);

    this.tweens.add({
      targets: xpText,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => xpText.destroy(),
    });
  }

  spawnEnemy() {
    const minDistance = (this.player.auraRange || 100) * 1.5;
    const margin = 100;

    let x, y;
    do {
      x = Phaser.Math.Between(margin, this.worldWidth - margin);
      y = Phaser.Math.Between(margin, this.worldHeight - margin);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < minDistance);

    const enemy = new Enemy(this, x, y);
    enemy.on("die", (ex, ey, value) => this.spawnXPOrb(ex, ey, value));
    this.enemies.add(enemy);
  }

  spawnXPOrb(x, y, value) {
    const orb = new XPOrb(this, x, y, value);
    this.xpOrbs.add(orb);
  }

  startWave() {
    if (!this.isGameStarted) return;

    for (let i = 0; i < this.spawnAmount; i++) {
      this.time.delayedCall(i * 200, this.spawnEnemy, [], this);
    }

    this.waveCount++;
    this.spawnAmount += 2;

    const nextDelay = Math.max(this.baseSpawnDelay - this.waveCount * 500, 10000);
    this.time.addEvent({
      delay: nextDelay,
      callback: this.startWave,
      callbackScope: this,
      loop: false,
    });
  }
}
