import PassiveAlquimista from "../../systems/PassiveSystem/PassiveAlquimista.js";
import PassiveCoveiro from "../../systems/PassiveSystem/PassiveCoveiro.js";
import PassiveSentinela from "../../systems/PassiveSystem/PassiveSentinela.js";

export const PLAYER_CLASSES = {
  alquimista: {
    key: "alquimista",
    texture: "alquimista",
    frame: 0,

    stats: {
      maxHP: 90,
      critChance: 0.05,
      critDamage: 1.6,
      projectileSpeed: 1.1,
      globalCD: 0.95,
      aoe: 1.15,
      xpGain: 1.1,
      pickupRadius: 1.3,
      dotDamageBonus: 0.15,
      debuffDurationMultiplier: 1.2,
      auraRange: 120
    },

    animations: {
      idle: { start: 0, end: 0, frameRate: 1, repeat: -1 },
      walk: { start: 0, end: 7, frameRate: 8, repeat: -1 }
    },

    passive: PassiveAlquimista,
    weaponKey: "frascoInstavel"
  },

  coveiro: {
    key: "coveiro",
    texture: "coveiro",
    frame: 0,

    stats: {
      maxHP: 120,
      armor: 2,
      lifesteal: 0.05,
      dotDamageBonus: 0.3,
      debuffDurationMultiplier: 1.4,
      auraRange: 110
    },

    animations: {
      idle: { start: 0, end: 0, frameRate: 1, repeat: -1 },
      walk: { start: 0, end: 7, frameRate: 7, repeat: -1 }
    },

    passive: PassiveCoveiro,
    weaponKey: "foiceEnferrujada"
  },

  sentinela: {
    key: "sentinela",
    texture: "sentinela",
    frame: 0,

    stats: {
      maxHP: 140,
      armor: 4,
      shield: 10,
      auraRange: 150
    },

    animations: {
      idle: { start: 0, end: 0, frameRate: 1, repeat: -1 },
      walk: { start: 0, end: 7, frameRate: 6, repeat: -1 }
    },

    passive: PassiveSentinela,
    weaponKey: "sinoPurificacao",
    locked: true
  }
};
