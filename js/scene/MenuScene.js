export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#101018");

    this.add
      .text(this.scale.width / 2, 100, "CHAOS RUSH", {
        fontSize: "64px",
        fill: "#00ffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, 160, "Fractured Realms", {
        fontSize: "28px",
        fill: "#cccccc",
      })
      .setOrigin(0.5);

    const panel = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2 + 50,
      700,
      300,
      0x000000,
      0.5
    ).setOrigin(0.5).setStrokeStyle(2, 0x00ffff);

    const classes = [
      {
        Key: "alquimista",
        name: "A Alquimista Espectral",
        desc: "Manipula frascos instáveis que causam efeitos aleatórios.\nChance de resetar cooldowns ao coletar itens.",
        weaponKey: "frascoInstavel",
      },
      {
        Key: "coveiro",
        name: "O Coveiro Profano",
        desc: "Profana a terra com a Foice Enferrujada, aplicando Podridão e Lentidão aos inimigos.",
        weaponKey: "foiceEnferrujada",
      },
      {
        Key: "sentinela",
        name: "A Sentinela do Sino",
        desc: "Toca o Sino da Purificação, causando dano em área e empurrando inimigos.\nDano bônus quando empurra inimigos.",
        estreia: "EM BREVE!!!!",
        weaponKey: "sinoPurificacao",
      },
    ];


    const startY = this.scale.height / 2 - 50;

    classes.forEach((cls, i) => {
      const btnY = startY + i * 90;

      const btn = this.add.rectangle(
        this.scale.width / 2,
        btnY,
        600,
        80,
        0x111122,
        0.7
      ).setStrokeStyle(2, 0x00ffff).setInteractive({ useHandCursor: true });

      const title = this.add.text(btn.x, btnY - 20, cls.name, {
        fontSize: "22px",
        fill: "#00ffff",
        fontStyle: "bold",
      }).setOrigin(0.5);

      const desc = this.add.text(btn.x, btnY + 15, cls.desc, {
        fontSize: "14px",
        fill: "#cccccc",
        align: "center",
        wordWrap: { width: 550 },
      }).setOrigin(0.5);

      btn.on("pointerover", () => btn.setFillStyle(0x00ffff, 0.3));
      btn.on("pointerout", () => btn.setFillStyle(0x111122, 0.7));

      btn.on("pointerdown", () => {
        console.log("Classe selecionada:", cls.Key);
        this.scene.start("MainScene", {
          selectedClassKey: cls.Key
        });

        const estreia = this.add.text(btn.x - 295, btnY - 35, cls.estreia, {
          fontSize: "20px",
          fill: "#ffff00",
          fontStyle: "bold"
        }).setOrigin(0.01);
      });

      this.add.text(
        this.scale.width / 2,
        this.scale.height - 40,
        "Pressione uma classe para começar",
        {
          fontSize: "18px",
          fill: "#888",
        }
      ).setOrigin(0.5);
    });
  }
}
