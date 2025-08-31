/**
 * MageJob（魔法使い）クラス
 * 
 * 魔法攻撃と回復に特化した職業
 * 高いMP・魔法攻撃力・技術を持つが、物理防御は低い
 */

import { Job } from './Job';
import {
    StatModifiers,
    GrowthRateModifiers,
    RankUpRequirements,
    JobTrait,
    JobCategory,
    JobData,
    TraitEffectType,
} from '../../types/job';

export class MageJob extends Job {
    constructor(jobData: JobData, initialRank: number = 1) {
        super(jobData, initialRank);
    }

    /**
     * 魔法使いの能力値修正を取得
     * MP・魔法攻撃力・技術にボーナス、物理防御にペナルティ
     */
    public getStatModifiers(): StatModifiers {
        const rankMultiplier = this.currentRank;

        return this.createStatModifiers(
            rankMultiplier * 4,  // HP: ランクごとに+4（低め）
            rankMultiplier * 12, // MP: ランクごとに+12
            rankMultiplier * 6,  // 攻撃力（魔法攻撃力）: ランクごとに+6
            -rankMultiplier * 2, // 防御力: ランクごとに-2（ローブのため）
            rankMultiplier * 2,  // 速度: ランクごとに+2
            rankMultiplier * 5,  // 技術: ランクごとに+5
            rankMultiplier * 3   // 運: ランクごとに+3
        );
    }

    /**
     * 魔法使いの使用可能スキルを取得
     */
    public getAvailableSkills(): string[] {
        const skills: string[] = [];

        // ランク1: 基本スキル
        skills.push('fire_bolt', 'heal', 'magic_shield');

        // ランク2: 強化スキル
        if (this.currentRank >= 2) {
            skills.push('ice_shard', 'group_heal', 'mana_burn');
        }

        // ランク3: 上級スキル
        if (this.currentRank >= 3) {
            skills.push('lightning_bolt', 'mass_heal', 'dispel_magic');
        }

        // ランク4: 奥義
        if (this.currentRank >= 4) {
            skills.push('meteor', 'resurrection', 'time_stop');
        }

        // ランク5: 究極技
        if (this.currentRank >= 5) {
            skills.push('apocalypse', 'divine_intervention', 'reality_warp');
        }

        return skills;
    }

    /**
     * 魔法使いのランクアップ要件を取得
     */
    public getRankUpRequirements(targetRank: number): RankUpRequirements {
        switch (targetRank) {
            case 2:
                return this.createRankUpRequirements(
                    12,  // 薔薇の力コスト
                    4,   // レベル要件
                    ['fire_bolt', 'heal'], // 前提スキル
                );
            case 3:
                return this.createRankUpRequirements(
                    30,  // 薔薇の力コスト
                    10,  // レベル要件
                    ['ice_shard', 'group_heal'], // 前提スキル
                );
            case 4:
                return this.createRankUpRequirements(
                    60,  // 薔薇の力コスト
                    18,  // レベル要件
                    ['lightning_bolt', 'mass_heal'], // 前提スキル
                    ['magic_tower'], // 完了ステージ
                );
            case 5:
                return this.createRankUpRequirements(
                    120, // 薔薇の力コスト
                    28,  // レベル要件
                    ['meteor', 'resurrection'], // 前提スキル
                    ['ancient_library'], // 完了ステージ
                    ['archmage_shadow'], // 撃破ボス
                );
            default:
                throw new Error(`Invalid target rank for MageJob: ${targetRank}`);
        }
    }

    /**
     * 魔法使いの職業特性を取得
     */
    public getJobTraits(): JobTrait[] {
        const traits: JobTrait[] = [];

        // ランク1: 基本特性
        traits.push(
            this.createJobTrait(
                'mana_efficiency',
                '魔力効率',
                'スキル使用時のMP消費量が減少する',
                TraitEffectType.SKILL_BONUS,
                10,
                'mp_cost_reduction'
            )
        );

        // ランク2: 強化特性
        if (this.currentRank >= 2) {
            traits.push(
                this.createJobTrait(
                    'elemental_mastery',
                    '元素習熟',
                    '属性魔法のダメージが増加する',
                    TraitEffectType.DAMAGE_BONUS,
                    20,
                    'elemental_magic'
                )
            );
        }

        // ランク3: 上級特性
        if (this.currentRank >= 3) {
            traits.push(
                this.createJobTrait(
                    'spell_penetration',
                    '魔法貫通',
                    '敵の魔法防御を一部無視する',
                    TraitEffectType.SPECIAL_ABILITY,
                    25,
                    'magic_defense_ignore'
                )
            );
        }

        // ランク4: 奥義特性
        if (this.currentRank >= 4) {
            traits.push(
                this.createJobTrait(
                    'arcane_intellect',
                    '秘術の知性',
                    '魔法攻撃力と回復力が大幅に上昇する',
                    TraitEffectType.STAT_BONUS,
                    30,
                    'magic_power'
                )
            );
        }

        // ランク5: 究極特性
        if (this.currentRank >= 5) {
            traits.push(
                this.createJobTrait(
                    'reality_bender',
                    '現実改変者',
                    '全ての魔法効果が劇的に強化される',
                    TraitEffectType.SPECIAL_ABILITY,
                    50,
                    'all_magic_effects'
                )
            );
        }

        return traits;
    }

    /**
     * 魔法使いの成長率修正を取得
     */
    public getGrowthRateModifiers(): GrowthRateModifiers {
        const rankBonus = (this.currentRank - 1) * 2; // ランクごとに+2%

        return this.createGrowthRateModifiers(
            8 + rankBonus,  // HP成長率: 基本8% + ランクボーナス（低め）
            18 + rankBonus, // MP成長率: 基本18% + ランクボーナス
            10 + rankBonus, // 攻撃成長率: 基本10% + ランクボーナス
            4 + rankBonus,  // 防御成長率: 基本4% + ランクボーナス（低め）
            8 + rankBonus,  // 速度成長率: 基本8% + ランクボーナス
            15 + rankBonus, // 技術成長率: 基本15% + ランクボーナス
            12 + rankBonus  // 運成長率: 基本12% + ランクボーナス
        );
    }

    /**
     * 魔法使い固有のメソッド: 魔法攻撃力計算
     */
    public calculateMagicAttackPower(baseAttack: number, skill: number): number {
        const modifiers = this.getStatModifiers();
        const elementalMasteryBonus = this.currentRank >= 2 ? 1.2 : 1.0;
        const arcaneIntellectBonus = this.currentRank >= 4 ? 1.3 : 1.0;
        const realityBenderBonus = this.currentRank >= 5 ? 1.5 : 1.0;

        // 魔法攻撃力は攻撃力と技術の両方に依存
        const magicPower = (baseAttack + modifiers.attack) + (skill + modifiers.skill) * 0.5;

        return Math.floor(
            magicPower *
            elementalMasteryBonus *
            arcaneIntellectBonus *
            realityBenderBonus
        );
    }

    /**
     * 魔法使い固有のメソッド: 回復力計算
     */
    public calculateHealingPower(baseHealing: number, skill: number): number {
        const modifiers = this.getStatModifiers();
        const arcaneIntellectBonus = this.currentRank >= 4 ? 1.3 : 1.0;
        const realityBenderBonus = this.currentRank >= 5 ? 1.5 : 1.0;

        // 回復力は技術に大きく依存
        const healingPower = baseHealing + (skill + modifiers.skill) * 0.8;

        return Math.floor(
            healingPower *
            arcaneIntellectBonus *
            realityBenderBonus
        );
    }

    /**
     * 魔法使い固有のメソッド: MP消費量計算
     */
    public calculateMPCost(baseCost: number): number {
        let mpCost = baseCost;

        // 魔力効率による消費量減少
        const efficiencyReduction = 0.1 * this.currentRank;
        mpCost = Math.floor(mpCost * (1 - efficiencyReduction));

        // 現実改変者による追加減少
        if (this.currentRank >= 5) {
            mpCost = Math.floor(mpCost * 0.8);
        }

        return Math.max(mpCost, 1); // 最低1MP
    }

    /**
     * 魔法使い固有のメソッド: 魔法防御貫通率計算
     */
    public calculateMagicPenetration(): number {
        let penetration = 0;

        // 魔法貫通特性
        if (this.currentRank >= 3) {
            penetration += 25;
        }

        // 現実改変者による追加貫通
        if (this.currentRank >= 5) {
            penetration += 25;
        }

        return Math.min(penetration, 75); // 最大75%
    }
}