import WeaponAlquimista from "./WeaponAlquimista.js";
import WeaponCoveiro from "./WeaponCoveiro.js";

export default class WeaponSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.cooldowns = {};
    this.weapons = {};

    this._initWeapons();
  }

  _initWeapons() {
    this.weapons["frascoInstavel"] = new WeaponAlquimista(
      this.scene,
      this.player,
      this
    );

    this.weapons["foiceEnferrujada"] = new WeaponCoveiro(
      this.scene,
      this.player,
      this
    );
  }

  useWeapon(key) {
    if (!this.player.canAttack) return;
    if (this.cooldowns[key]) return;

    const weapon = this.weapons[key];
    if (!weapon) {
      console.warn("⚠️ Arma não encontrada:", key);
      return;
    }

    const stats = this.player.stats;

    // DOUBLE HIT REAL
    const doubleChance = stats.get("doubleHit") || 0;
    const isDouble = Math.random() < doubleChance;

    weapon.use();

    if (isDouble) {
      this.scene.time.delayedCall(80, () => {
        weapon.use();
      });
    }

    //  attack speed global
    const atkSpeed = stats.get("attackSpeed") || 1;
    const finalCD = weapon.getCooldown() / atkSpeed;

    this.startCooldown(key, finalCD);
  }

  startCooldown(key, ms) {
    this.cooldowns[key] = true;

    this.scene.time.delayedCall(ms, () => {
      this.cooldowns[key] = false;
    });
  }

  // CRÍTICO GLOBAL
  rollCrit(baseDamage) {
    const stats = this.player.stats;

    const critChance = stats.get("critChance") || 0;
    const critDamage = stats.get("critDamage") || 1.5;

    const isCrit = Math.random() < critChance;

    return {
      damage: isCrit ? baseDamage * critDamage : baseDamage,
      isCrit,
    };
  }
}