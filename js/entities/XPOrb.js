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

    // physics
    this.setCircle(6);
    this.setTint(0x00ffff);
    this.setAlpha(0.9);
    if (this.body) this.body.setAllowGravity(false);

    // blending + depth
    this.setBlendMode(Phaser.BlendModes.ADD);

    // trail visual (se for usado)
    this.trail = scene.add.circle(x, y, 10, 0x00ffff, 0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.15)
      .setDepth(this.depth - 1);

    // pulse tween (salvaremos referência para controlar)
    this._pulseTween = scene.tweens.add({
      targets: this,
      scale: { from: 0.9, to: 1.05 },
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: "Sine.easeInOut"
    });

    // trail tween (opcional) - guardamos referência
    this._trailTween = scene.tweens.add({
      targets: this.trail,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.2, to: 0.05 },
      repeat: -1,
      duration: 800,
      yoyo: true
    });

    // safe flag para impedir múltiplas destruições
    this._destroyScheduled = false;
  }

  update(player) {
    const magnet = player?.magnetRadius ?? (player?.pickupRadius ? player.pickupRadius * 100 : undefined);
    if (player && magnet) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

      // Se estiver dentro do raio de magnetismo, puxa a orb
      if (dist <= magnet) {
        this.isAttracted = true;

        // brilho e trail
        this.setAlpha(Phaser.Math.Clamp(this.alpha + 0.02, 0.9, 1.4));
        if (this.trail) this.trail.setAlpha(Phaser.Math.Clamp(this.trail.alpha + 0.01, 0.05, 0.25));

        // mover para o player
        this.scene.physics.moveToObject(this, player, 300);

        // --- FALLBACK: se a orb estiver muito próxima, force a coleta (evita passar reto) ---
        // distância de “coleta automática” — ajuste conforme o tamanho do player/orb
        const autoCollectDistance = 18;
        if (dist <= autoCollectDistance) {
          // chama collect diretamente (proteções internas do collect impedem duplicação)
          this.collect(player);
        }

      } else {
        // fora do raio
        this.isAttracted = false;
        this.setAlpha(0.9);
        if (this.trail) this.trail.setAlpha(0.15);
        if (this.body) this.body.velocity.x *= 0.9;
      }
    }
  }

  /**
   * Chamado quando o jogador pega a orb.
   * Faz limpeza segura, anima um tween de pickup e destrói depois.
   */
  collect(player) {
    if (this.collected || this._destroyScheduled) return;
    this.collected = true;
    this._destroyScheduled = true;

    // desativa colisões e corpo imediatamente
    try {
      if (this.body) {
        this.body.enable = false;
        this.body.checkCollision.none = true;
        this.body.setVelocity(0, 0);
      }
    } catch (e) { }

    // para tweens ligados a esta orb
    try { if (this._pulseTween) this._pulseTween.stop(); } catch (e) { }
    try { if (this._trailTween) this._trailTween.stop(); } catch (e) { }

    // animação de coleta (tween): orb sobe e some
    const pickupTween = this.scene.tweens.add({
      targets: this,
      y: this.y - 20,
      alpha: 0,
      scale: 0.2,
      duration: 250,
      ease: "Cubic.easeOut",
      onComplete: () => {
        // limpa trail e destrói a orb
        this.destroyCleanup();
      }
    });

    // opcional: anima o trail também
    if (this.trail) {
      try {
        this.scene.tweens.add({
          targets: this.trail,
          alpha: 0,
          scale: 0.2,
          duration: 200,
          ease: "Cubic.easeOut",
        });
      } catch (e) { }
    }
  }

  collect(player) {
    if (this._destroyScheduled) return;
    this._destroyScheduled = true;

    // Para a atração
    this.isAttracted = false;

    // Para a física
    if (this.body) {
      this.body.enable = false;
      this.setVelocity(0, 0);
    }

    // Para os tweens
    if (this._pulseTween) this._pulseTween.stop();
    if (this._trailTween) this._trailTween.stop();

    // Some o trail
    if (this.trail) {
      this.trail.setVisible(false);
      this.scene.tweens.killTweensOf(this.trail);
      this.trail.destroy();
    }

    // Pequena animação de absorção
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: 120,
      ease: "Cubic.easeIn",
      onComplete: () => {
        try { this.destroy(); } catch (e) { }
      }
    });
  }


  /**
   * Remove referências extras e destrói o sprite com segurança.
   */
  destroyCleanup() {
    // remove tweens pendentes
    try { if (this._pulseTween) this._pulseTween.stop(); } catch (e) { }
    try { if (this._trailTween) this._trailTween.stop(); } catch (e) { }

    // destrói o trail se existir
    try {
      if (this.trail && this.trail.destroy) {
        this.trail.destroy();
        this.trail = null;
      }
    } catch (e) { }

    // finalmente destruir a orb (protege de múltiplas chamadas)
    try {
      if (this && this.destroy) {
        super.destroy(); // chama o destroy original
      }
    } catch (e) { }
  }

  // segurança extra: ao chamar destroy diretamente, limpa antes
  destroy(fromScene) {
    // garante cleanup
    try { this.destroyCleanup(); } catch (e) { }
    // chama o destroy do pai (Phaser.GameObjects)
    try { super.destroy(fromScene); } catch (e) { }
  }
}
