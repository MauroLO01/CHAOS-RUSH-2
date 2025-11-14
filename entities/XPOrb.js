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

    // Behavior: flutuar levemente
    this.floatTimer = 0;
    this.baseY = y;
  }

  update(player) {
    if (!this.isAttracted) {
      this.floatTimer += this.scene.game.loop.delta / 1000;
      this.body.velocity.y = Math.sin(this.floatTimer * 2) * 15;
    } else {
      this.floatTimer = 0;
    }

    //atração (imã)

    if (player && player.magnetRadius) {
      const dist = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        player.x,
        player.y
      );

      if (dist <= (player.magnetRadius || 120)) {
        this.isAttracted = true;

        this.scene.physics.moveToObject(this, player, 300);
      } else {
        this.isAttracted = false;
        this.body.velocity.x *= 0.9;
      }
    }
  }
}
