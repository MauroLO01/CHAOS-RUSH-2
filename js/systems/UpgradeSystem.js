export default class UpgradeSystem {
  constructor(scene) {
    this.scene = scene;

    // OBS: não guardamos this.player aqui pois scene.player pode ser criado depois.
    this.isMenuOpen = false;
    this.menuContainer = null;

    // LISTA DOS UPGRADES
    // Cada apply recebe o player atual (pego dinamicamente) e faz mudanças via stats sempre que possível.
    this.upgrades = [
      {
        id: "damage_up_1",
        name: "Dano +20%",
        desc: "Aumenta o dano causado por todas as armas.",
        apply: (player) => {
          if (!player) return;
          player.baseDamage = (player.baseDamage || 5) * 1.2;
        },
      },
      {
        id: "damage_up_2",
        name: "Dano +35%",
        desc: "Aumenta significativamente o dano.",
        apply: (player) => {
          if (!player) return;
          player.baseDamage = (player.baseDamage || 5) * 1.35;
        },
      },
      {
        id: "attack_speed",
        name: "Atk Speed +15%",
        desc: "Armas atacam mais rápido.",
        apply: (player) => {
          // afeta o evento global de weaponLoopEvent (feito na cena)
          if (this.scene.weaponLoopEvent) {
            this.scene.weaponLoopEvent.delay = Math.max(
              50,
              this.scene.weaponLoopEvent.delay * 0.85
            );
          }
        },
      },
      {
        id: "max_hp_1",
        name: "Vida Máxima +20%",
        desc: "Aumenta a vida máxima.",
        apply: (player) => {
          if (!player) return;
          // reajusta maxHP no player (StatsPlayer tem key maxHP)
          const stats = player.stats;
          if (stats && typeof stats.get === "function") {
            stats.multiply("maxHP", 1.2);
            // garante que player.currentHP acompanhe
            player.currentHP = Math.min(
              player.currentHP ?? stats.get("maxHP"),
              Math.floor(stats.get("maxHP"))
            );
          } else {
            player.maxHP = Math.floor((player.maxHP || 100) * 1.2);
            player.currentHP = player.maxHP;
          }
        },
      },
      {
        id: "regen_hp",
        name: "Regeneração",
        desc: "Regenera 2 HP por segundo.",
        apply: (player) => {
          if (!player) return;
          if (!player.regenEvent && player.scene) {
            player.regenEvent = player.scene.time.addEvent({
              delay: 1000,
              loop: true,
              callback: () => {
                player.currentHP = Math.min(
                  player.maxHP,
                  (player.currentHP || player.maxHP) + 2
                );
                player.scene?.updateHealthBar?.();
              },
            });
          }
        },
      },
      {
        id: "move_speed",
        name: "Velocidade +15%",
        desc: "Aumenta velocidade de movimento.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.multiply === "function") {
            stats.multiply("moveSpeedMultiplier", 1.15);
            // sincroniza player.speed (se seu player usa movementSpeed getter, isso pode ser redundante)
            if (typeof stats.get === "function") {
              player.speed = stats.get("moveSpeedMultiplier") * 200;
            }
          } else {
            player.speed = (player.speed || 200) * 1.15;
          }
        },
      },
      {
        id: "pickup_range",
        name: "Pickup +50%",
        desc: "Aumenta a distância para pegar XP.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.multiply === "function") {
            stats.multiply("pickupRadius", 1.5);
            player.magnetRadius = (stats.get("pickupRadius") || 1) * 100;
          } else {
            player.pickupRadius = (player.pickupRadius || 100) * 1.5;
            player.magnetRadius = player.pickupRadius * 100;
          }
        },
      },
      {
        id: "crit_chance",
        name: "Crítico +10%",
        desc: "Ataques têm chance de causar dano crítico.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.addFlat === "function") {
            stats.addFlat("critChance", 0.1);
          } else {
            player.critChance = (player.critChance || 0) + 0.1;
          }
        },
      },
      {
        id: "crit_damage",
        name: "Dano Crítico +50%",
        desc: "Críticos causam mais dano.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.addFlat === "function") {
            stats.addFlat("critDamage", 0.5);
          } else {
            player.critDamage = (player.critDamage || 1.5) + 0.5;
          }
        },
      },
      {
        id: "projectile_speed",
        name: "Projéteis +20% Vel.",
        desc: "Projéteis viajam mais rápido.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.multiply === "function") {
            stats.multiply("projectileSpeed", 1.2);
          } else {
            player.projectileSpeed = (player.projectileSpeed || 1) * 1.2;
          }
        },
      },
      {
        id: "projectile_pierce",
        name: "Perfuração +1",
        desc: "Projéteis atravessam mais um inimigo.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.addFlat === "function") {
            stats.addFlat("pierce", 1);
          } else {
            player.pierce = (player.pierce || 0) + 1;
          }
        },
      },
      {
        id: "armor",
        name: "Armadura +2",
        desc: "Reduz dano recebido.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.addFlat === "function") {
            stats.addFlat("armor", 2);
          } else {
            player.armor = (player.armor || 0) + 2;
          }
        },
      },
      {
        id: "knockback",
        name: "Knockback +40%",
        desc: "Empurra inimigos para longe.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.multiply === "function") {
            stats.multiply("knockback", 1.4);
          } else {
            player.knockback = (player.knockback || 1) * 1.4;
          }
        },
      },
      {
        id: "aoe",
        name: "Área +25%",
        desc: "Golpes e habilidades ocupam mais espaço.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.multiply === "function") {
            stats.multiply("aoe", 1.25);
          } else {
            player.aoe = (player.aoe || 1) * 1.25;
          }
        },
      },
      {
        id: "cooldown_global",
        name: "Cooldown -10%",
        desc: "Todas habilidades recarregam mais rápido.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.multiply === "function") {
            stats.multiply("globalCD", 0.9);
          } else {
            player.globalCD = (player.globalCD || 1) * 0.9;
          }
        },
      },
      {
        id: "xp_gain",
        name: "XP +20%",
        desc: "Ganha mais XP das orbs.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.multiply === "function") {
            stats.multiply("xpGain", 1.2);
            player.xpGain = stats.get("xpGain");
          } else {
            player.xpGain = (player.xpGain || 1) * 1.2;
          }
        },
      },
      {
        id: "lifesteal",
        name: "Lifesteal 3%",
        desc: "Recupera vida ao causar dano.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.addFlat === "function") {
            stats.addFlat("lifesteal", 0.03);
          } else {
            player.lifesteal = (player.lifesteal || 0) + 0.03;
          }
        },
      },
      {
        id: "shield",
        name: "Escudo",
        desc: "Ganha um escudo que absorve 50 de dano.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.addFlat === "function") {
            stats.addFlat("shield", 50);
          } else {
            player.shield = (player.shield || 0) + 50;
          }
        },
      },
      {
        id: "double_hit",
        name: "Golpe Duplo",
        desc: "10% de chance de atacar 2 vezes.",
        apply: (player) => {
          if (!player) return;
          const stats = player.stats;
          if (stats && typeof stats.addFlat === "function") {
            stats.addFlat("doubleHit", 0.1);
          } else {
            player.doubleHit = (player.doubleHit || 0) + 0.1;
          }
        },
      },
    ];
  }

  // -------------------------------------
  // CHECK DE LEVEL UP (opcional: use scene.player atual)
  checkForLevelUp() {
    const p = this.scene.player;
    if (!p) return;

    if (p.xp >= p.xpToNext) {
      p.level++;
      p.xp -= p.xpToNext;
      p.xpToNext = Math.floor(p.xpToNext * 1.25);

      this.openUpgradeMenu();
    }
  }

  // -------------------------------------
  // MENU DE UPGRADE
  openUpgradeMenu() {
    if (this.isMenuOpen) return;
    this.isMenuOpen = true;

    const player = this.scene.player;
    if (!player) return;

    player.lockInput();

    this.scene.physics.pause();
    if (this.scene.weaponLoopEvent) this.scene.weaponLoopEvent.paused = true;

    const cam = this.scene.cameras.main;
    const cx = cam.worldView.x + cam.width / 2;
    const cy = cam.worldView.y + cam.height / 2;

    this.menuContainer = this.scene.add.container(0, 0).setDepth(9999);

    const bg = this.scene.add
      .rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.75)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive()
      .setDepth(9999);

    this.menuContainer.add(bg).setDepth(9999);

    const title = this.scene.add
      .text(cx, cy - 180, "Escolha um Upgrade", {
        fontSize: "40px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(9999);

    this.menuContainer.add(title).setDepth(9999);

    const options = Phaser.Utils.Array.Shuffle(this.upgrades).slice(0, 3);

    let startX = cx - 280;

    options.forEach((upg, i) => {
      // CARD
      const card = this.scene.add
        .rectangle(startX + 280 * i, cy + 20, 240, 160, 0x1d1d1d)
        .setStrokeStyle(4, 0x00eaff)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(9999);

      card.setScale(0);

      // Animação de spawn
      this.scene.tweens.add({
        targets: card,
        scaleX: 1,
        scaleY: 1,
        ease: "Back.Out",
        duration: 400,
        delay: i * 120,
      });

      // Nome
      const name = this.scene.add
        .text(card.x, card.y - 45, upg.name, {
          fontSize: "20px",
          color: "#00eaff",
          fontStyle: "bold",
          stroke: "#000",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(9999);

      // Descrição
      const desc = this.scene.add
        .text(card.x, card.y + 10, upg.desc, {
          fontSize: "16px",
          color: "#ffffff",
          wordWrap: { width: 200 },
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(9999);

      card.on("pointerover", () => {
        this.scene.tweens.add({
          targets: card,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 120,
          ease: "Linear",
        });
        card.setStrokeStyle(5, 0x00ffff);
      });

      card.on("pointerout", () => {
        this.scene.tweens.add({
          targets: card,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: "Linear",
        });
        card.setStrokeStyle(4, 0x00eaff);
      });

      // CLICK
      card.on("pointerdown", () => {
        this.applyUpgrade(upg);
      });

      this.menuContainer.add(card);
      this.menuContainer.add(name);
      this.menuContainer.add(desc);
    });
  }

  applyUpgrade(upgrade) {
    const player = this.scene.player;
    if (!player) {
      console.warn(
        "UpgradeSystem: player not found when applying upgrade",
        upgrade.id
      );
      return;
    }

    try {
      // apply recebe player
      upgrade.apply(player);
    } catch (e) {
      console.error("Upgrade apply error:", e, upgrade);
    }

    // Sincronizações pós-upgrade (ex.: magnetRadius, speed derived from stats)
    try {
      if (player.stats && typeof player.stats.get === "function") {
        // sincroniza valores que o MainScene e orbs usam
        if (player.stats.get("pickupRadius") !== undefined) {
          player.magnetRadius = (player.stats.get("pickupRadius") || 1) * 100;
        }
        if (player.stats.get("moveSpeedMultiplier") !== undefined) {
          player.speed = (player.stats.get("moveSpeedMultiplier") || 1) * 200;
        }
        if (player.stats.get("xpGain") !== undefined) {
          player.xpGain = player.stats.get("xpGain");
        }
      }
    } catch (e) {
    }

    this.closeMenu();
  }

  closeMenu() {
    const player = this.scene.player;

    if (this.menuContainer) this.menuContainer.destroy();
    this.menuContainer = null;
    this.isMenuOpen = false;

    this.scene.physics.resume();
    if (this.scene.weaponLoopEvent) this.scene.weaponLoopEvent.paused = false;

    // DESBLOQUEIA O JOGADOR AQUI, NÃO NO OPEN
    if (player && typeof player.unlockInput === "function") {
      player.unlockInput();
    }
  }
}
