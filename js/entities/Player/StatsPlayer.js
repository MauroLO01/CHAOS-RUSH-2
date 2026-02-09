export default class StatsPlayer {
  constructor(player, baseStats = {}) {
    this.player = player;

    // Base imutável da classe (alquimista, coveiro, etc)
    this.baseStats = {
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
      auraRange: 110,

      ...baseStats // 👈 classe sobrescreve aqui
    };

    // Stats atuais (base + modificadores)
    this.stats = { ...this.baseStats };
  }

  // GETTER UNIVERSAL
  get(key) {
    return this.stats[key];
  }

  get movementSpeed() {
    const base = 200;
    return base * this.get("moveSpeedMultiplier");
  }

  // SET DIRETO
  set(key, value) {
    const old = this.stats[key];
    this.stats[key] = value;
    this._emitChange(key, value, old);
  }

  // +FLAT
  addFlat(key, amount) {
    const old = this.stats[key];
    this.stats[key] += amount;
    this._emitChange(key, this.stats[key], old);
  }

  // +%
  addPercent(key, percent) {
    const old = this.stats[key];
    this.stats[key] *= (1 + percent);
    this._emitChange(key, this.stats[key], old);
  }

  // *MULT
  multiply(key, factor) {
    const old = this.stats[key];
    this.stats[key] *= factor;
    this._emitChange(key, this.stats[key], old);
  }

  // RESET PARA BASE DA CLASSE
  resetToBase() {
    const oldStats = { ...this.stats };
    this.stats = { ...this.baseStats };

    for (const k in this.stats) {
      if (this.stats[k] !== oldStats[k]) {
        this._emitChange(k, this.stats[k], oldStats[k]);
      }
    }
  }

  // RESET TOTAL (troca de classe)
  applyNewBaseStats(newBaseStats = {}) {
    this.baseStats = {
      ...this.baseStats,
      ...newBaseStats
    };

    this.resetToBase();
  }

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
    // regen, buffs temporários, DOT, escudos, etc
  }

  onPlayerDeath() { }
}
