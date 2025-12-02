// entities/player.js
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, selectedClass = null) {
    super(scene, x, y, "player");
    this.scene = scene;

    // Atributos básicos
    this.speed = 200;
    this.maxHP = 100;
    this.currentHP = this.maxHP;
    this.baseDamage = 5;
    this.damageInterval = 200;
    this.auraRange = 110;
    this.magnetRadius = 120;

    //upgrades NOVO
    this.critChance = 0;
    this.critDamage = 1.5;
    this.lifesteal = 0;
    this.shield = 0;
    this.knockback = 1;
    this.aoe = 1;
    this.globalCD = 1;
    this.xpGain = 1;
    this.pierce = 0;
    this.projectileSpeed = 1;
    this.doubleHit = 0;
    this.pickupRadius = 100;

    // Correção: nome da propriedade
    this.debuffDurationMultiplier = 1;
    this.dotDamageBonus = 1;
    this.slowRadiusBonus = 0;

    // XP / Level
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 10;

    // Adiciona ao jogo
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Física do player
    this.setCollideWorldBounds(true);
    this.setSize(20, 20);
    this.setOffset(10, 10); // correto para hitbox centralizado
    this.setTint(0x00ff00);

    this.lastHitTime = 0;

    // PassiveSystem
    this.passiveSystem = null;

    // Classe selecionada
    this.currentClass = null;
    if (selectedClass) {
      this.currentClass = typeof selectedClass === "string"
        ? selectedClass
        : (selectedClass.name || null);
    }

    this._createAura();
  }

  // Injeta PassiveSystem
  setPassiveSystem(passiveSystem) {
    this.passiveSystem = passiveSystem;
  }

  // Cria aura com body corretamente configurado
  _createAura() {
    const texKey = "player_aura_temp";

    if (!this.scene.textures.exists(texKey)) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(16, 16, 16);
      g.generateTexture(texKey, 32, 32);
      g.destroy();
    }

    this.aura = this.scene.add.sprite(this.x, this.y, texKey);
    this.aura.setVisible(false);
    this.aura.setDepth(-10);

    this.scene.physics.add.existing(this.aura);

    if (this.aura.body) {
      const baseRadius = 16;
      const scale = this.auraRange / baseRadius;
      this.aura.setScale(scale);

      this.aura.body.setAllowGravity(false);
      this.aura.body.setImmovable(true);
      this.aura.body.setCircle(baseRadius);

      // centraliza o body
      const d = this.aura.displayWidth / 2;
      this.aura.body.setOffset(-d, -d);
    }
  }

  update(cursors) {
    if (this.scene.playerCanMove === false) return;
    if (!this.body) return;

    const left = cursors.A?.isDown || cursors.left?.isDown;
    const right = cursors.D?.isDown || cursors.right?.isDown;
    const up = cursors.W?.isDown || cursors.up?.isDown;
    const down = cursors.S?.isDown || cursors.down?.isDown;

    const vx = (right ? 1 : 0) + (left ? -1 : 0);
    const vy = (down ? 1 : 0) + (up ? -1 : 0);

    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.lengthSq() > 0) {
      v.normalize().scale(this.speed);
      this.body.setVelocity(v.x, v.y);
    } else {
      this.body.setVelocity(0, 0);
    }

    // Atualiza posição da aura
    if (this.aura) {
      this.aura.setPosition(this.x, this.y);
      const d = this.aura.displayWidth / 2;
      this.aura.body.setOffset(-d, -d);
    }
  }

  // XP / Level System aprimorado
  gainXP(amount) {
    this.xp += amount;
    if (this.level === 0) this.level = 1;
    if (!this.xpToNext || this.xpToNext <= 0) this.xpToNext = 10;

    if (this.scene?.updateXpBar) this.scene.updateXpBar();

    while (this.xp >= this.xpToNext) {
      this.levelUp();
    }
  }

  levelUp(silent = false) {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);

    if (this.scene?.updateXpBar) this.scene.updateXpBar();

    if (!silent) {
      this.scene.time.delayedCall(200, () => {
        this.scene.upgradeSystem?.openUpgradeMenu(this);
      });
    }
  }

  takeDamage(amount) {
    if (typeof amount !== "number") return;

    this.currentHP -= amount;
    this.scene.cameras?.main?.shake(100, 0.005);

    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.die();
    }

    this.scene.updateHealthBar?.();
  }

  heal(amount) {
    if (typeof amount !== "number") return;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    this.scene.updateHealthBar?.();
  }

  die() {
    this.scene.physics.pause();
    this.setTint(0x000000);

    this.scene.add
      .text(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        "GAME OVER",
        { fontSize: "48px", fill: "#ff4444" }
      )
      .setOrigin(0.5);

    // destrói aura ao morrer
    if (this.aura) {
      this.aura.destroy();
      this.aura = null;
    }

    this.scene.time.delayedCall(3000, () => {
      this.scene.scene.restart();
    });
  }

  selectClass(classObj) {
    const name = typeof classObj === "string"
      ? classObj
      : (classObj?.name || null);

    this.currentClass = name;

    this.passiveSystem?.setClass?.(name);
  }
}
