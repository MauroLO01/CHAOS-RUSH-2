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
    this.damageInterval = 200; // usado pela MainScene para processAuraDamage
    this.auraRange = 110; // raio em pixels
    this.magnetRadius = 120;

    // Debuffs / multiplicadores
    this.debuffDurationMultiplier = 1;
    this.dotDamageBonus = 1;
    this.slowRaidusBonus = 0;

    // Progressão
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 10;

    // Adiciona o player na cena e ativa física
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setSize(20, 20);
    this.setTint(0x00ff00);

    // último hit (proteção contra hits rápidos)
    this.lastHitTime = 0;

    // referência ao PassiveSystem será setada pela MainScene
    this.passiveSystem = null;

    // guarda a classe (nome). A aplicação de atributos é feita pela MainScene para evitar duplicação.
    this.currentClass = null;
    if (selectedClass) {
      this.currentClass = typeof selectedClass === "string" ? selectedClass : (selectedClass.name || null);
    }

    // cria a aura física (hitbox). Implementação robusta:
    this._createAura();

    // se quiser logar/debug:
    // console.log("Player criado", { x, y, selectedClass });
  }

  // injeta PassiveSystem (MainScene chama isso)
  setPassiveSystem(passiveSystem) {
    this.passiveSystem = passiveSystem;
  }

  // cria um sprite circular invisível que será usado como hitbox/aura
  _createAura() {
    // tentamos usar uma textura já existente com nome 'aura_player'
    const texKey = "player_aura_temp";

    // cria textura temporária se não existir
    if (!this.scene.textures.exists(texKey)) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      // desenha um círculo pequeno (vamos escalar o sprite depois)
      g.fillCircle(16, 16, 16);
      g.generateTexture(texKey, 32, 32);
      g.destroy();
    }

    // cria o sprite de aura (visualmente invisível, mas com corpo físico)
    this.aura = this.scene.add.sprite(this.x, this.y, texKey);
    this.aura.setVisible(false); // se quiser ver o hitbox para debug, setVisible(true)
    this.aura.setDepth(1);

    // adiciona física arcade ao aura
    this.scene.physics.add.existing(this.aura);
    if (this.aura.body) {
      // define body como círculo com o raio desejado
      const body = this.aura.body;
      body.setAllowGravity(false);
      body.setImmovable(true);

      // body.setCircle existe na maioria das builds Arcade — se não existir, usamos setSize
      if (typeof body.setCircle === "function") {
        // setCircle espera raio em pixels e pode receber offset, ajustamos para o tamanho que geramos
        const baseRadius = 16; // baseado no texture 32x32
        const scale = (this.auraRange / baseRadius);
        this.aura.setScale(scale);
        // após escalar, recalculamos body circle
        body.setCircle(baseRadius);
        // body offset ajustado automaticamente pelo setCircle em builds padrão; se necessário, setOffset:
        body.setOffset(0, 0);
      } else {
        // fallback: setSize com largura/altura (approx)
        body.setSize(this.auraRange * 2, this.auraRange * 2);
      }

      // marca sensor-like (não colidir fisicamente)
      // Arcade Body não tem isSensor em todas as builds, então usamos colisões imováveis + overlap
      body.checkCollision.none = false;
    }
  }

  // atualiza posição, movimento e pop de aura
  update(cursors) {
    if (this.scene.playerCanMove === false) return;

    // corpo pode ser undefined em alguns edge-cases, checamos
    if (!this.body) return;

    // movement
    const vx = (cursors && cursors.D && cursors.D.isDown ? 1 : 0) + (cursors && cursors.A && cursors.A.isDown ? -1 : 0);
    const vy = (cursors && cursors.S && cursors.S.isDown ? 1 : 0) + (cursors && cursors.W && cursors.W.isDown ? -1 : 0);

    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.lengthSq() > 0) {
      v.normalize().scale(this.speed);
      this.body.setVelocity(v.x, v.y);
    } else {
      this.body.setVelocity(0, 0);
    }

    // sincroniza aura com o player
    if (this.aura) {
      this.aura.x = this.x;
      this.aura.y = this.y;
      // também sincroniza o body caso necessário
      if (this.aura.body) {
        this.aura.body.x = this.x - (this.aura.displayWidth / 2);
        this.aura.body.y = this.y - (this.aura.displayHeight / 2);
      }
    }
  }

  // XP e level
  gainXP(amount) {
    this.xp += amount;
    if (this.level === 0) this.level = 1;
    if (!this.xpToNext || this.xpToNext <= 0) this.xpToNext = 10;
    if (this.scene && this.scene.updateXpBar) this.scene.updateXpBar();
    if (this.xp >= this.xpToNext) this.levelUp();
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);
    if (this.scene && this.scene.updateXpBar) this.scene.updateXpBar();
    this.scene.time.delayedCall(
      200,
      () => {
        if (this.scene.upgradeSystem) this.scene.upgradeSystem.open(this);
      },
      [],
      this
    );
  }

  takeDamage(amount) {
    // proteção
    if (typeof amount !== "number") return;
    this.currentHP -= amount;
    if (this.scene && this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.shake(100, 0.005);
    }
    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.die();
    }
    if (this.scene && this.scene.updateHealthBar) this.scene.updateHealthBar();
  }

  heal(amount) {
    if (typeof amount !== "number") return;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    if (this.scene && this.scene.updateHealthBar) this.scene.updateHealthBar();
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
    this.scene.time.delayedCall(3000, () => this.scene.scene.restart());
  }

  // seleciona classe em runtime (aceita string ou objeto com .name)
  selectClass(classObj) {
    const name = typeof classObj === "string" ? classObj : (classObj && classObj.name) || null;
    this.currentClass = name;
    if (this.passiveSystem && typeof this.passiveSystem.setClass === "function") {
      this.passiveSystem.setClass(name);
    }
  }
}
