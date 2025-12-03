export default class UpgradeSystem {
  constructor(scene) {
    this.scene = scene;
    this.player = scene.player;

    this.isMenuOpen = false;
    this.menuContainer = null;

    // LISTA DOS UPGRADES
    this.upgrades = [
      {
        id: "damage_up_1",
        name: "Dano +20%",
        desc: "Aumenta o dano causado por todas as armas.",
        apply: () => { this.player.baseDamage *= 1.20; }
      },
      {
        id: "damage_up_2",
        name: "Dano +35%",
        desc: "Aumenta significativamente o dano.",
        apply: () => { this.player.baseDamage *= 1.35; }
      },
      {
        id: "attack_speed",
        name: "Atk Speed +15%",
        desc: "Armas atacam mais rápido.",
        apply: () => {
          if (this.scene.weaponLoopEvent)
            this.scene.weaponLoopEvent.delay *= 0.85;
        }
      },
      {
        id: "max_hp_1",
        name: "Vida Máxima +20%",
        desc: "Aumenta a vida máxima.",
        apply: () => {
          this.player.maxHP = Math.floor(this.player.maxHP * 1.2);
          this.player.currentHP = this.player.maxHP;
        }
      },
      {
        id: "regen_hp",
        name: "Regeneração",
        desc: "Regenera 2 HP por segundo.",
        apply: () => {
          if (!this.player.regenEvent) {
            this.player.regenEvent = this.scene.time.addEvent({
              delay: 1000,
              loop: true,
              callback: () => {
                this.player.currentHP = Math.min(
                  this.player.maxHP,
                  this.player.currentHP + 2
                );
              }
            });
          }
        }
      },
      {
        id: "move_speed",
        name: "Velocidade +15%",
        desc: "Aumenta velocidade de movimento.",
        apply: () => { this.player.speed *= 1.15; }
      },
      {
        id: "pickup_range",
        name: "Pickup +50%",
        desc: "Aumenta a distância para pegar XP.",
        apply: () => { this.player.pickupRadius = (this.player.pickupRadius || 100) * 1.5; }
      },
      {
        id: "crit_chance",
        name: "Crítico +10%",
        desc: "Ataques têm chance de causar dano crítico.",
        apply: () => {
          this.player.critChance = (this.player.critChance || 0) + 0.10;
        }
      },
      {
        id: "crit_damage",
        name: "Dano Crítico +50%",
        desc: "Críticos causam mais dano.",
        apply: () => {
          this.player.critDamage = (this.player.critDamage || 1.5) + 0.5;
        }
      },
      {
        id: "projectile_speed",
        name: "Projéteis +20% Vel.",
        desc: "Projéteis viajam mais rápido.",
        apply: () => { this.player.projectileSpeed = (this.player.projectileSpeed || 1) * 1.20; }
      },
      {
        id: "projectile_pierce",
        name: "Perfuração +1",
        desc: "Projéteis atravessam mais um inimigo.",
        apply: () => { this.player.pierce = (this.player.pierce || 0) + 1; }
      },
      {
        id: "armor",
        name: "Armadura +2",
        desc: "Reduz dano recebido.",
        apply: () => { this.player.armor = (this.player.armor || 0) + 2; }
      },
      {
        id: "knockback",
        name: "Knockback +40%",
        desc: "Empurra inimigos para longe.",
        apply: () => { this.player.knockback = (this.player.knockback || 1) * 1.4; }
      },
      {
        id: "aoe",
        name: "Área +25%",
        desc: "Golpes e habilidades ocupam mais espaço.",
        apply: () => { this.player.aoe = (this.player.aoe || 1) * 1.25; }
      },
      {
        id: "cooldown_global",
        name: "Cooldown -10%",
        desc: "Todas habilidades recarregam mais rápido.",
        apply: () => { this.player.globalCD = (this.player.globalCD || 1) * 0.90; }
      },
      {
        id: "xp_gain",
        name: "XP +20%",
        desc: "Ganha mais XP das orbs.",
        apply: () => { this.player.xpGain = (this.player.xpGain || 1) * 1.20; }
      },
      {
        id: "lifesteal",
        name: "Lifesteal 3%",
        desc: "Recupera vida ao causar dano.",
        apply: () => { this.player.lifesteal = (this.player.lifesteal || 0) + 0.03; }
      },
      {
        id: "shield",
        name: "Escudo",
        desc: "Ganha um escudo que absorve 50 de dano.",
        apply: () => { this.player.shield = (this.player.shield || 0) + 50; }
      },
      {
        id: "double_hit",
        name: "Golpe Duplo",
        desc: "10% de chance de atacar 2 vezes.",
        apply: () => { this.player.doubleHit = (this.player.doubleHit || 0) + 0.10; }
      }
    ];
  }


  // -------------------------------------
  // CHECK DE LEVEL UP
  checkForLevelUp() {
    if (this.player.xp >= this.player.xpToNext) {
      this.player.level++;
      this.player.xp -= this.player.xpToNext;
      this.player.xpToNext = Math.floor(this.player.xpToNext * 1.25);

      this.openUpgradeMenu();
    }
  }

  // -------------------------------------
  // MENU DE UPGRADE
  openUpgradeMenu() {
    if (this.isMenuOpen) return;
    this.isMenuOpen = true;

    this.scene.physics.pause();
    if (this.scene.weaponLoopEvent)
      this.scene.weaponLoopEvent.paused = true;

    const cam = this.scene.cameras.main;
    const cx = cam.worldView.x + cam.width / 2;
    const cy = cam.worldView.y + cam.height / 2;

    this.menuContainer = this.scene.add.container(0, 0);

    const bg = this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.75)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive();

    this.menuContainer.add(bg);

    const title = this.scene.add.text(cx, cy - 180, "Escolha um Upgrade", {
      fontSize: "40px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 8
    }).setOrigin(0.5);

    this.menuContainer.add(title);

    const options = Phaser.Utils.Array.Shuffle(this.upgrades).slice(0, 3);

    let startX = cx - 280;

    options.forEach((upg, i) => {

      // CARD
      const card = this.scene.add.rectangle(startX + 280 * i, cy + 20, 240, 160, 0x1d1d1d)
        .setStrokeStyle(4, 0x00eaff)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      card.setScale(0);

      // Animação de spawn
      this.scene.tweens.add({
        targets: card,
        scaleX: 1,
        scaleY: 1,
        ease: "Back.Out",
        duration: 400,
        delay: i * 120
      });

      // Nome
      const name = this.scene.add.text(card.x, card.y - 45, upg.name, {
        fontSize: "20px",
        color: "#00eaff",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 4
      }).setOrigin(0.5);

      // Descrição
      const desc = this.scene.add.text(card.x, card.y + 10, upg.desc, {
        fontSize: "16px",
        color: "#ffffff",
        wordWrap: { width: 200 },
        align: "center"
      }).setOrigin(0.5);

      card.on("pointerover", () => {
        this.scene.tweens.add({
          targets: card,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 120,
          ease: "Linear"
        });
        card.setStrokeStyle(5, 0x00ffff);
      });

      card.on("pointerout", () => {
        this.scene.tweens.add({
          targets: card,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: "Linear"
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
    upgrade.apply();
    this.closeMenu();
  }

  closeMenu() {
    this.menuContainer.destroy();
    this.menuContainer = null;
    this.isMenuOpen = false;

    this.scene.physics.resume();
    if (this.scene.weaponLoopEvent)
      this.scene.weaponLoopEvent.paused = false;
  }
}
