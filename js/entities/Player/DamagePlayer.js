export default class DamagePlayer {
    constructor(player, stats) {
        this.player = player;
        this.stats = stats;

        const maxHP = (typeof stats.get === "function") ? (stats.get("maxHP") || 100) : (stats.maxHP || 100);
        if (typeof this.player.currentHP !== "number") {
            this.player.currentHP = maxHP;
        }
    }

    takeDamage(amount) {
        let dmg = amount;

        // ===== ESCUDO =====
        let shield = this.stats.shield;
        if (shield > 0) {
            const absorbed = Math.min(shield, dmg);
            shield -= absorbed;
            dmg -= absorbed;

            this.stats.shield = shield;

            if (dmg <= 0) {
                this.player.scene.updateHealthBar?.();
                return;
            }
        }

        // ===== ARMADURA =====
        const armor = this.stats.armor || 0;
        dmg -= armor;

        if (dmg < 1) dmg = 1;

        // ===== APLICA DANO =====
        this.player.currentHP -= dmg;

        this.player.scene.cameras?.main?.shake(100, 0.005);

        if (this.player.currentHP <= 0) {
            this.player.currentHP = 0;
            this.player.die();
        }

        this.player.scene.updateHealthBar?.();
    }

    calculateDamage(baseDamage = 1) {
        let dmg = baseDamage;

        // ========= CRÍTICO =========
        const critChance = this.stats.critChance;
        const critDmg = this.stats.critDamage;

        let isCrit = false;

        if (Math.random() < critChance) {
            dmg *= critDmg;
            isCrit = true;
        }

        // ========= DOUBLE HIT =========
        const doubleHitChance = this.stats.doubleHit;
        const hits = Math.random() < doubleHitChance ? 2 : 1;

        // ========= LIFESTEAL =========
        const lifesteal = this.stats.lifesteal;
        if (lifesteal > 0) {
            const healAmount = dmg * lifesteal;
            this.player.heal(healAmount);
        }

        return {
            damage: dmg,
            hits,
            isCrit
        };
    }

    getKnockback(force) {
        const knockMod = this.stats.knockback || 1;
        return force * knockMod;
    }

    dealDamageToEnemy(enemy, baseDamage = 1) {
        const info = this.calculateDamage(baseDamage);

        for (let i = 0; i < info.hits; i++) {
            enemy.takeDamage(info.damage);

            if (enemy.applyKnockback) {
                enemy.applyKnockback(this.getKnockback(50));
            }
        }

        return info;
    }
}
