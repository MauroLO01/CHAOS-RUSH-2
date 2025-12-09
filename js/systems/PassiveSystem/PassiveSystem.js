import PassiveAlquimista from "./PassiveAlquimista.js";
import PassiveCoveiro from "./PassiveCoveiro.js";

export default class PassiveSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.modules = {
      alquimista: new PassiveAlquimista(scene, player),
      coveiro: new PassiveCoveiro(scene, player),
    };

    this.current = null;

    this.scene.events.on("enemyKilled", this.onEnemyKilled, this);
  }

  normalizeClassName(className) {
    return className
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");
  }

  activateClassAbilities(className) {
    if (!className) return;

    const key = this.normalizeClassName(className);
    let selected = null;

    if (key.includes("alquimista")) selected = "alquimista";
    else if (key.includes("coveiro")) selected = "coveiro";

    if (!selected) {
      console.warn("Classe sem passiva implementada:", className);
      return;
    }

    // 🔥 Reseta somente a antiga
    if (this.current && this.modules[this.current]) {
      this.modules[this.current].reset();
    }

    this.current = selected;

    if (
      this.modules[selected] &&
      typeof this.modules[selected].activate === "function"
    ) {
      this.modules[selected].activate();
    }
  }

  deactivateCurrent() {
    if (this.current && this.modules[this.current]) {
      this.modules[this.current].reset();
    }
    this.current = null;
  }

  onEnemyKilled(enemy) {
    if (!this.current) return;

    const mod = this.modules[this.current];
    if (mod && typeof mod.onEnemyKilled === "function") {
      mod.onEnemyKilled(enemy);
    }
  }
}
