export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "enemy");

    this.scene = scene;
    this.speed = Phaser.Math.Between(50, 100);
    this.maxHP = 150;
    this.currentHP = this.maxHP;
    this.xpValue = 10;
    this.isDead = false;

    // Adiciona à cena
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configurações físicas
    this.setCollideWorldBounds(false);
    this.setSize(18, 18);
    this.setOffset(1, 1);

    // Cor inicial
    this.setTint(0xff3333);

    // Target padrão é o player
    this.target = scene.player;
  }

  update() {
    if (!this.active || this.isDead) return;

    // ✔️ Sempre tenta seguir SEU ALVO atual
    const target = this.target ?? this.scene.player;
    if (!target || !target.active) return;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
    }
  }

  takeDamage(amount) {
    if (!this.active || this.isDead) return;

    this.currentHP -= amount;
    this.flashDamage();

    if (this.currentHP <= 0) {
      this.die();
    }
  }

  flashDamage() {
    if (!this.scene || !this.active) return;

    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this && this.active && !this.isDead) {
        this.clearTint();
        this.setTint(0xff3333);
      }
    });
  }

  setTarget(target) {
    this.target = target;
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;

    // Evento para MainScene criar XP Orb
    this.emit("die", this.x, this.y, this.xpValue);

    // Evento global — outras classes escutam isto
    this.scene.events.emit("enemyKilled", this);

    // Animação de morte
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0,
      duration: 200,
      onComplete: () => {
        if (this && this.destroy) this.destroy(true);
      }
    });
  }
}
