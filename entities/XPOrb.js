export default class XPOrb extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, value = 10) {
    super(scene, x, y, "xp_orb");

    this.scene = scene;
    this.value = value;
    this.collected = false;
    this.isAttracted = false;
    this.floatTimer = 0;
    this.baseY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(6);
    this.setTint(0x00ffff);
    this.setAlpha(0.9);
    this.body.setAllowGravity(false);

    // shader-like glow (aditivo)
    this.setBlendMode(Phaser.BlendModes.ADD);

    // pulso inicial
    scene.tweens.add({
      targets: this,
      scale: { from: 0.9, to: 1.05 },
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: "Sine.easeInOut"
    });

    // leve rastro
    this.trail = scene.add.circle(x, y, 10, 0x00ffff, 0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.15)
      .setDepth(this.depth - 1);

    scene.tweens.add({
      targets: this.trail,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.2, to: 0.05 },
      repeat: -1,
      duration: 800,
      yoyo: true
    });
  }

  update(player) {

    // atualiza rastro (segue a orb)
    if (this.trail) {
      this.trail.x = this.x;
      this.trail.y = this.y;
    }

    // flutuação
    if (!this.isAttracted) {
      this.floatTimer += this.scene.game.loop.delta / 1000;
      this.body.velocity.y = Math.sin(this.floatTimer * 2) * 15;
    } else {
      this.floatTimer = 0;
    }

    // ATRAÇÃO / IMÃ
    if (player && player.magnetRadius) {

      const dist = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        player.x,
        player.y
      );

      if (dist <= player.magnetRadius) {
        this.isAttracted = true;

        // brilho aumenta quando é atraída
        this.setAlpha(Phaser.Math.Clamp(this.alpha + 0.02, 0.9, 1.4));
        this.trail.setAlpha(Phaser.Math.Clamp(this.trail.alpha + 0.01, 0.05, 0.25));

        // aceleração para o player
        this.scene.physics.moveToObject(this, player, 300);

      } else {
        this.isAttracted = false;

        // volta ao brilho normal
        this.setAlpha(0.9);
        this.trail.setAlpha(0.15);

        // reduz lentamente a velocidade lateral
        this.body.velocity.x *= 0.9;
      }
    }
  }
}
