import Player from "../entities/Player/player.js";
import Enemy from "../entities/enemy.js";
import XPOrb from "../entities/XPOrb.js";
import UpgradeSystem from "../systems/UpgradeSystem.js";
import ClassSystem from "../systems/ClassSystems.js";
import PassiveSystem from "../systems/PassiveSystem.js";
import WeaponSystem from "../systems/WeaponSystem.js";
import SpawnDirector from "../Director/SpawnDirector.js";

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

    shapes.forEach(shape => {
      g.clear();
      g.fillStyle(shape.color, 1);

      if (shape.type === "rect") g.fillRect(0, 0, shape.w, shape.h);
      else g.fillCircle(shape.r, shape.r, shape.r);

      g.generateTexture(shape.key, shape.w || shape.r * 2, shape.h || shape.r * 2);
    });

    g.destroy();
  }

  init(data) {
    this.selectedClass = data.selectedClass || null;
  }

  create() {
    // inputs
    this.cursors = this.input.keyboard.addKeys("W,S,A,D");
    this.cameras.main.setBackgroundColor("#202733");

    // Mundo
    this.worldWidth = 5000;
    this.worldHeight = 5000;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Grupos
    this.enemies = this.physics.add.group();
    this.xpOrbs = this.physics.add.group({ classType: XPOrb, runChildUpdate: true });
    this.enemiesInAura = new Set();

    // Sistemas (instancie alguns que NÃO precisam de player)
    this.upgradeSystem = new UpgradeSystem(this);
    this.classSystem = new ClassSystem(this);
    this.weaponSystem = null; // criado no startGame
    // NOTE: NÃO criar PassiveSystem aqui — será criado em startGame com player

    // UI
    this.passiveBarBg = this.add.rectangle(100, 70, 200, 10, 0x222222).setOrigin(0).setScrollFactor(0);
    this.passiveBar = this.add.rectangle(100, 70, 0, 10, 0x00ff88).setOrigin(0).setScrollFactor(0);
    this.passiveText = this.add.text(310, 65, "Passiva: 0%", {
      fontSize: "14px",
      fill: "#00ffcc"
    }).setScrollFactor(0);

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Diretor de Spawn
    this.SpawnDirector = new SpawnDirector(this);

    // Listener seguro para o SPACE.
    // O listener existe já (não depende de passiveSystem existir),
    // mas só chama o sistema quando ele estiver presente e o player também.
    this.input.keyboard.on("keydown-SPACE", () => {
      if (!this.passiveSystem || !this.player) return;

      // tenta obter o nome da classe do player (consistente com seu fluxo)
      const name = (this.player.currentClass || this.player.className || "").toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, "");

      // chama o método correto (mantenha nomes compatíveis com PassiveSystem)
      if (name.includes("alquimista")) {
        // Alquimista: chamada imediata que dispara os frascos (activatePassiva)
        if (typeof this.passiveSystem.activatePassiva === "function") {
          this.passiveSystem.activatePassiva();
        }
      } else if (name.includes("coveiro")) {
        // Coveiro: ativa ascensão (passa player se o método precisar)
        if (typeof this.passiveSystem.activateAscension === "function") {
          // alguns códigos usam activateAscension(player)
          try {
            this.passiveSystem.activateAscension(this.player);
          } catch (e) {
            // fallback: tenta sem params
            try { this.passiveSystem.activateAscension(); } catch (er) { }
          }
        }
      } else if (name.includes("sentinela")) {
        if (typeof this.passiveSystem.activateSentinela === "function") {
          this.passiveSystem.activateSentinela();
        }
      } else {
        // Se quiser coisas padrão para outras classes, trate aqui
      }
    });

    // Se já veio com classe selecionada, iniciar — mantém sua lógica antiga
    if (this.selectedClass) {
      this.startGame(this.selectedClass);
    } else {
      this.scene.start("MenuScene");
    }

    // evento global de spawn XP orbs a partir de inimigos mortos
    this.events.on("enemyKilled", (enemy) => {
      this.spawnXPOrb(enemy.x, enemy.y, enemy.xpValue);
    });
  }

  // cria/encontra player e inicia sistemas que precisam dele
  startGame(selectedClass) {
    if (this.isGameStarted) return;
    this.isGameStarted = true;

    // cria o player (uso do seu construtor original)
    this.player = new Player(
      this,
      this.worldWidth / 2,
      this.worldHeight / 2,
      selectedClass
    );

    if (this.player.setCollideWorldBounds)
      this.player.setCollideWorldBounds(true);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // sistemas que precisam de player
    this.weaponSystem = new WeaponSystem(this, this.player);
    // cria passiveSystem COM player aqui (apenas uma vez)
    this.passiveSystem = new PassiveSystem(this, this.player);
    this.passiveSystem.activateClassAbilities(selectedClass);

    // ativa as habilidades passivas da classe selecionada
    const normalizedName = (selectedClass.name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");

    if (this.passiveSystem.activateClassAbilities)
      this.passiveSystem.activateClassAbilities()

    if (this.classSystem.menuBackground) this.classSystem.menuBackground.destroy();
    if (this.classSystem.classButtons)
      this.classSystem.classButtons.forEach(btn => btn.destroy());

    if (selectedClass.weaponKey) {
      this.weaponLoopEvent = this.time.addEvent({
        delay: 1200,
        loop: true,
        callback: () => this.weaponSystem.useWeapon(selectedClass.weaponKey),
      });
    }

    if (selectedClass.moveSpeed) this.player.speed *= 1 + selectedClass.moveSpeed;
    if (selectedClass.damageMultiplier) this.player.baseDamage *= selectedClass.damageMultiplier;
    if (selectedClass.passive) selectedClass.passive(this, this.player);

    // HUD (health/xp) — sua implementação original
    this.healthBarBG = this.add.rectangle(100, 20, 200, 20, 0x333333).setOrigin(0).setScrollFactor(0);
    this.healthBar = this.add.rectangle(100, 20, 200, 20, 0xff0000).setOrigin(0).setScrollFactor(0);

    this.xpBarBG = this.add.rectangle(100, 50, 200, 10, 0x222222).setOrigin(0).setScrollFactor(0);
    this.xpBar = this.add.rectangle(100, 50, 0, 10, 0x6a00ff).setOrigin(0).setScrollFactor(0);

    this.levelText = this.add.text(310, 35, `Lv ${this.player.level}`, {
      fontSize: "16px",
      fill: "#ffffff",
    }).setScrollFactor(0);

    this.updateHealthBar();
    this.updateXpBar();

    // Aura overlap
    if (this.player.aura) {
      this.physics.add.overlap(this.player.aura, this.enemies, (aura, enemy) => {
        this.enemiesInAura.add(enemy);
      });
    }

    // colisões e overlaps
    this.physics.add.overlap(this.player, this.xpOrbs, this.handleXPCollect, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);

    // Evento periódico para processar dano da aura
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

    if (this.SpawnDirector && typeof this.SpawnDirector.update === "function") {
      this.SpawnDirector.update(time, delta);
    }

    if (this.player.update) this.player.update(this.cursors);

    this.enemies.children.iterate((enemy) => {
      if (enemy && enemy.update) enemy.update(time, delta);
    });

    this.xpOrbs.children.iterate((orb) => {
      if (orb && orb.update) orb.update(this.player);
    });

    this.updateHealthBar();
    this.updateXpBar();

    // Observação: não duplicamos lógica de SPACE no update — o listener em create() já faz o trabalho
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
    if (!this.player) return;

    const hpPercent = Phaser.Math.Clamp(this.player.currentHP / this.player.maxHP, 0, 1);
    this.healthBar.width = 200 * hpPercent;
  }

  updateXpBar() {
    if (!this.player) return;

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
}
