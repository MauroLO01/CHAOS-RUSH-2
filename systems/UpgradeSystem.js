export default class UpgradeSystem {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.optionTexts = [];
    const { width, height } = scene.scale;

    this.bg = scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false)
      .setAlpha(0);
    this.titleText = scene.add
      .text(width / 2, height * 0.2, "SELECIONE UM UPGRADE", {
        fontSize: "36px",
        fill: "#fff",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false)
      .setAlpha(0);

    this.availableUpgrades = this.defineUpgrades();
    scene.input.keyboard.on("keydown-ONE", () => this.selectOption(0));
    scene.input.keyboard.on("keydown-TWO", () => this.selectOption(1));
    scene.input.keyboard.on("keydown-THREE", () => this.selectOption(2));
    scene.scale.on("resize", this.resize, this);
  }

  defineUpgrades() {
    return {
      aura_base: {
        text: "🌀 AURA Level 1: +10% de raio",
        effect: (player) => {
          player.auraRange *= 1.1;
          if (player.aura)
            player.aura.setScale(player.aura.scaleX * 1.1 || 1.1);
        },
        type: "base",
      },
      damage_up: {
        text: "⚔️ Dano +2",
        effect: (player) => {
          player.baseDamage += 2;
        },
      },
      speed_up: {
        text: "🏃 Velocidade +30",
        effect: (player) => {
          player.speed += 30;
        },
      },
      magnet_range: {
        text: "🧲 Ímã: +50 de alcance",
        effect: (player) => {
          player.magnetRadius = (player.magnetRadius || 100) + 50;
        },
      },
      risky_hp_dmg: {
        text: "🔥 Risco: Dano +30% | Vida Máx -20%",
        effect: (player) => {
          player.baseDamage = Math.floor(player.baseDamage * 1.3);
          player.maxHP = Math.floor((player.maxHP || 100) * 0.8);
        },
        requiredLevel: 3,
        type: "risky",
      },
      risky_speed_dmg: {
        text: "⚡ Risco: Velocidade +40 | Dano -1",
        effect: (player) => {
          player.speed += 40;
          player.baseDamage = Math.max(1, player.baseDamage - 1);
        },
        requiredLevel: 2,
        type: "risky",
      },
    };
  }

  fadeInMenu() {
    this.bg.setVisible(true);
    this.titleText.setVisible(true);
    this.scene.tweens.add({
      targets: [this.bg, this.titleText],
      alpha: 1,
      duration: 400,
      ease: "Sine.easeInOut",
    });
  }

  fadeOutMenu(callback) {
    this.scene.tweens.add({
      targets: [
        this.bg,
        this.titleText,
        ...this.optionTexts.map((o) => o.text),
      ],
      alpha: 0,
      duration: 400,
      ease: "Sine.easeInOut",
      onComplete: () => {
        [
          this.bg,
          this.titleText,
          ...this.optionTexts.map((o) => o.text),
        ].forEach((obj) => obj.setVisible(false));
        if (callback) callback();
      },
    });
  }

  open(player) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.scene.playerCanMove = false;
    if (this.scene.player && this.scene.player.body)
      this.scene.player.body.moves = false;

    // aplica upgrade inicial silencioso apenas uma vez
    if (player.level === 1 && !player._initialUpgradeGiven) {
      const baseUpgrade = this.availableUpgrades.aura_base;
      baseUpgrade.effect(player);
      player._initialUpgradeGiven = true;
      this.isOpen = false;
      this.scene.playerCanMove = true;
      if (this.scene.player && this.scene.player.body)
        this.scene.player.body.moves = true;
      return;
    }

    this.fadeInMenu();
    this.titleText.setText("SELECIONE UM UPGRADE");

    const allUpgrades = Object.values(this.availableUpgrades).filter(
      (u) => u.type !== "base"
    );
    const filtered = allUpgrades.filter(
      (u) => !u.requiredLevel || player.level >= u.requiredLevel
    );
    const optionsToDisplay = Phaser.Utils.Array.Shuffle(filtered).slice(0, 3);

    this.optionTexts.forEach((t) => t.text.destroy());
    this.optionTexts = [];
    const startY = this.scene.scale.height * 0.4;
    const spacing = 80;

    optionsToDisplay.forEach((option, index) => {
      const y = startY + index * spacing;
      const text = this.scene.add
        .text(this.scene.scale.width / 2, y, `${index + 1}. ${option.text}`, {
          fontSize: "22px",
          fill: option.type === "risky" ? "#ff9900" : "#fff",
          backgroundColor: "#222",
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101)
        .setAlpha(0)
        .setInteractive();

      this.scene.tweens.add({
        targets: text,
        alpha: 1,
        duration: 300,
        delay: 150 * index,
      });
      text.on("pointerover", () => text.setStyle({ backgroundColor: "#444" }));
      text.on("pointerout", () => text.setStyle({ backgroundColor: "#222" }));
      text.on("pointerdown", () => this.selectOption(index));
      this.optionTexts.push({ text, upgrade: option });
    });
  }

  selectOption(index) {
    if (!this.isOpen || !this.optionTexts[index]) return;
    const chosenOption = this.optionTexts[index].upgrade;
    chosenOption.effect(this.scene.player);
    console.log(`✅ Upgrade aplicado: ${chosenOption.text}`);
    this.closeMenu();
  }

  closeMenu() {
    this.fadeOutMenu(() => {
      this.optionTexts.forEach((t) => t.text.destroy());
      this.optionTexts = [];
      this.isOpen = false;
      this.scene.playerCanMove = true;
      if (this.scene.player && this.scene.player.body)
        this.scene.player.body.moves = true;
    });
  }

  resize(gameSize) {
    const { width, height } = gameSize;
    this.bg.setPosition(width / 2, height / 2).setSize(width, height);
    this.titleText.setPosition(width / 2, height * 0.2);
    const startY = height * 0.4;
    const spacing = 80;
    this.optionTexts.forEach((t, index) => {
      t.text.setPosition(width / 2, startY + index * spacing);
    });
  }
}
