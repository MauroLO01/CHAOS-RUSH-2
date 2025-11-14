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

    //propriedade para debuffs 
    this.debuffDurationMultiplier = 1;
    this.dotDamageBonus = 1;

    this.slowRaidusBonus = 0;

    // Sistema de progressão
    this.level = 0;
    this.xp = 0;
    this.xpToNext = 10;

    // Adiciona o player na cena e ativa física
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setSize(20, 20);
    this.setTint(0x00ff00);

    // Aura visual + física
    this.aura = scene.add.circle(this.x, this.y, this.auraRange, 0x00ffff, 0.15);
    scene.physics.add.existing(this.aura);

    if (this.aura.body) {
      this.aura.body.setAllowGravity(false);
      this.aura.body.setImmovable(true);
      this.aura.body.setCircle(this.auraRange);
      this.aura.body.isSensor = true;
    }

    //  Se o jogador escolheu uma classe, aplica os bônus/debuffs dela
    if (selectedClass) {
      if (selectedClass.speedBonus) this.speed += selectedClass.speedBonus;
      if (selectedClass.damageMultiplier)
        this.baseDamage *= selectedClass.damageMultiplier;
      if (selectedClass.maxHPBonus) {
        this.maxHP += selectedClass.maxHPBonus;
        this.currentHP = this.maxHP;
      }
      if (selectedClass.auraBonus) {
        this.auraRange += selectedClass.auraBonus;
        this.aura.setRadius(this.auraRange);
        if (this.aura.body) this.aura.body.setCircle(this.auraRange);
      }

      if (selectedClass.passive === 'ressacamagica') {
        this.debuffDurationMultiplier = 1.25;
      }
    }
  }


  update(cursors) {
    if (this.scene.playerCanMove === false) return;
    this.body.setVelocity(0);

    if (cursors.W.isDown) this.body.setVelocityY(-this.speed);
    if (cursors.S.isDown) this.body.setVelocityY(this.speed);
    if (cursors.A.isDown) this.body.setVelocityX(-this.speed);
    if (cursors.D.isDown) this.body.setVelocityX(this.speed);

    this.body.velocity.normalize().scale(this.speed);

    if (this.aura) {
      this.aura.x = this.x;
      this.aura.y = this.y;
    }
  }

  gainXP(amount) {
    this.xp += amount;
    if (this.level === 0) this.xpToNext = 10;
    if (this.scene && this.scene.updateXpBar) this.scene.updateXpBar();
    if (this.xp >= this.xpToNext) this.levelUp();
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);
    if (this.scene && this.scene.updateXpBar) this.scene.updateXpBar();
    // chame o upgrade system com pequeno delay para evitar conflito de tweens
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
    this.currentHP -= amount;
    this.scene.cameras.main.shake(100, 0.005);
    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.die();
    }
    if (this.scene && this.scene.updateHealthBar) this.scene.updateHealthBar();
  }

  heal(amount) {
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
}
