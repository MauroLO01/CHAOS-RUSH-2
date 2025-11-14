// ClassSystem.js
export default class ClassSystem {
    constructor(scene) {
        this.scene = scene;

        this.classes = {
            ALCHEMIST: {
                key: "ALCHEMIST",
                name: "Alquimista Espectral",
                subtitle: "Volatilidade & Magia Arcana",
                description: "Frasco instável + Ressaca Mágica (chance de zerar cooldowns ao pegar pickup).",
                weaponKey: "frascoInstavel",
                passiveKey: "ressacaMagica",
                base: { speedMultiplier: 1.0, damageMultiplier: 1.0, auraRangeBonus: 10 }
            },

            GRAVEDIGGER: {
                key: "GRAVEDIGGER",
                name: "Coveiro Profano",
                subtitle: "Culto dos Mortos",
                description: "Um necromante que transforma a morte em defesa. Domina a putrefação e comando dos mortos",
                weaponKey: "foiceEnferrujada",
                passiveKey: "ascensaoCarcara",
                base: { speedMultiplier: -0.1, damageMultiplier: 1.2, auraRangeBonus: 30 }
            },

            SENTINEL: {
                key: "SENTINEL",
                name: "Sentinela do Sino",
                subtitle: "Eco Sagrado",
                description: "Sino da Purificação: push + área. Passiva: aumenta knockback e dano ao empurrar.",
                weaponKey: "sinoPurificacao",
                passiveKey: "ecoSagrado",
                base: { speedMultiplier: 1.0, damageMultiplier: 1.0, auraRangeBonus: 10 }
            }
        };
    }

    getAll() {
        return Object.values(this.classes);
    }

    get(key) {
        return this.classes[key];
    }

    // chama UI (você já tem um menu; chame este método se quiser usar esta definição)
    openSelectionMenu(onSelect) {
        // Mantém compatibilidade: cria botões com as classes definidas aqui.
        const { width, height } = this.scene.scale;
        const bg = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0).setDepth(100);
        const title = this.scene.add.text(width / 2, 80, "ESCOLHA SUA CLASSE", { fontSize: "36px", fill: "#fff" }).setOrigin(0.5).setDepth(101);

        const classes = this.getAll();
        const spacing = 220;
        const startX = width / 2 - ((classes.length - 1) * spacing) / 2;

        const elements = [];

        classes.forEach((cls, i) => {
            const x = startX + i * spacing;
            const card = this.scene.add.rectangle(x, height / 2, 200, 260, 0x222233).setDepth(101).setInteractive({ useHandCursor: true });
            const icon = this.scene.add.text(x, height / 2 - 80, i === 0 ? "🧪" : i === 1 ? "⚰️" : "🔔", { fontSize: "48px" }).setOrigin(0.5).setDepth(102);
            const name = this.scene.add.text(x, height / 2 - 20, cls.name, { fontSize: "18px", fill: "#ffd700" }).setOrigin(0.5).setDepth(102);
            const sub = this.scene.add.text(x, height / 2 + 8, cls.subtitle, { fontSize: "14px", fill: "#fff" }).setOrigin(0.5).setDepth(102);
            const desc = this.scene.add.text(x, height / 2 + 48, cls.description, { fontSize: "12px", fill: "#ddd", align: "center", wordWrap: { width: 180 } }).setOrigin(0.5).setDepth(102);

            card.on("pointerover", () => card.setFillStyle(0x333355));
            card.on("pointerout", () => card.setFillStyle(0x222233));
            card.on("pointerdown", () => {
                // destruir tudo!
                [...elements, bg, title].forEach(e => e.destroy());
                onSelect(cls);
            });

            elements.push(card, icon, name, sub, desc);
        });
    }
}
