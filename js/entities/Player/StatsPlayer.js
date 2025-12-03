export default class StatsPlayer {
  constructor(player) {
    this.player = player;

    // Base Stats (valores iniciais)
    this.stats = {
      maxHP: 100,

      armor: 0,
      shield: 0,

      critChance: 0,         // 0 = 0%, 1 = 100%
      critDamage: 1.5,       // 1.5 = +50% dano crítico

      lifesteal: 0,          // 0 = sem roubo de vida

      pierce: 0,             // quantos inimigos o projétil atravessa
      projectileSpeed: 1, 
      globalCD: 1,           // multiplicador de cooldown
      aoe: 1,                // multiplicador de área (aura inclusive)
      xpGain: 1,             // multiplicador de XP
      doubleHit: 0,          // chance de atacar 2x

      knockback: 1,
      pickupRadius: 1,       // raio multiplicado para pegar XP

      // Para efeitos futuros / passivas
      dotDamageBonus: 0,
      debuffDurationMultiplier: 1,
      slowRadiusBonus: 0,

      moveSpeedMultiplier: 1,

      auraRange: 110 // usado pelo player.js para escalar a aura
    };

  }

  // GETTER UNIVERSAL
  get(key) {
    return this.stats[key];
  }

  get movementSpeed() {
    const base = 200;
    return base * (this.get ? this.get("moveSpeedMultiplier") : this.stats.moveSpeedMultiplier);
  }

  // SETTER UNIVERSAL
  set(key, value) {
    const old = this.stats[key];
    this.stats[key] = value;

    // dispara evento de mudança
    this._emitChange(key, value, old);
  }

  // Aumentar flat (ex: +10)
  addFlat(key, amount) {
    const old = this.stats[key];
    this.stats[key] += amount;

    this._emitChange(key, this.stats[key], old);
  }

  // Aumentar percentualmente (ex: +20% → 0.20)
  addPercent(key, percent) {
    const old = this.stats[key];
    this.stats[key] *= (1 + percent);

    this._emitChange(key, this.stats[key], old);
  }

  // Multiplicar direto (ex: *1.20)
  multiply(key, factor) {
    const old = this.stats[key];
    this.stats[key] *= factor;

    this._emitChange(key, this.stats[key], old);
  }

  // Emissão de eventos
  _emitChange(key, value, oldValue) {
    if (value === oldValue) return;

    if (this.player?.events) {
      this.player.events.emit("statChanged", {
        key,
        value,
        oldValue
      });
    }
  }

  update() {
    // Vazio nesta primeira versão.
    // Futuras versões terão regen, buffs, overshield, timers, etc.
  }

  // Reset total dos stats (ex: ao trocar de classe)
  reset() {
    const oldStats = { ...this.stats };

    this.stats = {
      maxHP: 100,

      armor: 0,
      shield: 0,

      critChance: 0,
      critDamage: 1.5,

      lifesteal: 0,

      pierce: 0,
      projectileSpeed: 1,
      globalCD: 1,
      aoe: 1,
      xpGain: 1,
      doubleHit: 0,

      knockback: 1,
      pickupRadius: 1,

      dotDamageBonus: 0,
      debuffDurationMultiplier: 1,
      slowRadiusBonus: 0,

      moveSpeedMultiplier: 1,

      auraRange: 110
    };


    // dispara evento de reset para cada stat modificado
    for (const k in this.stats) {
      if (this.stats[k] !== oldStats[k]) {
        this._emitChange(k, this.stats[k], oldStats[k]);
      }
    }
  }

  // Chamado quando o player morre
  onPlayerDeath() {
  }
}
