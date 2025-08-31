/**
 * WarriorJob（戦士）クラス
 * 
 * 物理攻撃と防御に特化した職業
 * 高いHP・攻撃力・防御力を持つが、魔法系能力は低い
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

export class WarriorJob extends Job {
    constructor(jobData: JobData, initialRank: number = 1) {
        super(jobData, initialRank);
    }

    /**
     * 戦士の能力値修正を取得
     * HP・攻撃力・防御力にボーナス、速度にペナルティ
     */
    public getStatModifiers(): StatModifiers {
        const rankMultiplier = this.currentRank;

        return this.createStatModifiers(
            rankMultiplier * 8,  // HP: ランクごとに+8
            rankMultiplier * 2,  // MP: ランクごとに+2（低め）
            rankMultiplier * 5,  // 攻撃力: ランクごとに+5
            rankMultiplier * 4,  // 防御力: ランクごとに+4
            -rankMultiplier * 1, // 速度: ランクごとに-1（重装備のため）
            rankMultiplier * 2,  // 技術: ランクごとに+2
            rankMultiplier * 1   // 運: ランクごとに+1
        );
    }

    /**
     * 戦士の使用可能スキルを取得
     */
    public getAvailableSkills(): string[] {
        const skills: string[] = [];

        // ランク1: 基本スキル
        skills.push('sword_slash', 'guard');

        // ランク2: 強化スキル
        if (this.currentRank >= 2) {
            skills.push('power_strike', 'shield_bash');
        }

        // ランク3: 上級スキル
        if (this.currentRank >= 3) {
            skills.push('berserker_rage', 'defensive_stance');
        }

        // ランク4: 奥義
        if (this.currentRank >= 4) {
            skills.push('sword_mastery', 'iron_will');
        }

        // ランク5: 究極技
        if (this.currentRank >= 5) {
            skills.push('legendary_strike', 'unbreakable_defense');
        }

        return skills;
    }

    /**
     * 戦士のランクアップ要件を取得
     */
    public getRankUpRequirements(targetRank: number): RankUpRequirements {
        switch (targetRank) {
            case 2:
                return this.createRankUpRequirements(
                    10,  // 薔薇の力コスト
                    5,   // レベル要件
                    ['sword_slash'], // 前提スキル
                );
            case 3:
                return this.createRankUpRequirements(
                    25,  // 薔薇の力コスト
                    12,  // レベル要件
                    ['power_strike', 'guard'], // 前提スキル
                );
            case 4:
                return this.createRankUpRequirements(
                    50,  // 薔薇の力コスト
                    20,  // レベル要件
                    ['berserker_rage'], // 前提スキル
                    ['stage_boss_1'], // 完了ステージ
                );
            case 5:
                return this.createRankUpRequirements(
                    100, // 薔薇の力コスト
                    30,  // レベル要件
                    ['sword_mastery', 'iron_will'], // 前提スキル
                    ['stage_boss_2'], // 完了ステージ
                    ['demon_lord'], // 撃破ボス
                );
            default:
                throw new Error(`Invalid target rank for WarriorJob: ${targetRank}`);
        }
    }

    /**
     * 戦士の職業特性を取得
     */
    public getJobTraits(): JobTrait[] {
        const traits: JobTrait[] = [];

        // ランク1: 基本特性
        traits.push(
            this.createJobTrait(
                'warrior_fortitude',
                '戦士の不屈',
                'HP減少時に攻撃力が上昇する',
                TraitEffectType.DAMAGE_BONUS,
                10,
                'self',
                'hp_below_50_percent'
            )
        );

        // ランク2: 強化特性
        if (this.currentRank >= 2) {
            traits.push(
                this.createJobTrait(
                    'weapon_mastery',
                    '武器習熟',
                    '物理攻撃のダメージが増加する',
                    TraitEffectType.DAMAGE_BONUS,
                    15,
                    'physical_attack'
                )
            );
        }

        // ランク3: 上級特性
        if (this.currentRank >= 3) {
            traits.push(
                this.createJobTrait(
                    'battle_hardened',
                    '戦場の経験',
                    '物理ダメージを軽減する',
                    TraitEffectType.RESISTANCE,
                    20,
                    'physical_damage'
                )
            );
        }

        // ランク4: 奥義特性
        if (this.currentRank >= 4) {
            traits.push(
                this.createJobTrait(
                    'sword_saint',
                    '剣聖',
                    'クリティカル率が大幅に上昇する',
                    TraitEffectType.STAT_BONUS,
                    25,
                    'critical_rate'
                )
            );
        }

        // ランク5: 究極特性
        if (this.currentRank >= 5) {
            traits.push(
                this.createJobTrait(
                    'legendary_warrior',
                    '伝説の戦士',
                    '全ての物理能力が大幅に強化される',
                    TraitEffectType.STAT_BONUS,
                    30,
                    'all_physical_stats'
                )
            );
        }

        return traits;
    }

    /**
     * 戦士の成長率修正を取得
     */
    public getGrowthRateModifiers(): GrowthRateModifiers {
        const rankBonus = (this.currentRank - 1) * 2; // ランクごとに+2%

        return this.createGrowthRateModifiers(
            15 + rankBonus, // HP成長率: 基本15% + ランクボーナス
            5 + rankBonus,  // MP成長率: 基本5% + ランクボーナス（低め）
            12 + rankBonus, // 攻撃成長率: 基本12% + ランクボーナス
            10 + rankBonus, // 防御成長率: 基本10% + ランクボーナス
            3 + rankBonus,  // 速度成長率: 基本3% + ランクボーナス（低め）
            6 + rankBonus,  // 技術成長率: 基本6% + ランクボーナス
            4 + rankBonus   // 運成長率: 基本4% + ランクボーナス
        );
    }

    /**
     * 戦士固有のメソッド: 物理攻撃力計算
     */
    public calculatePhysicalAttackPower(baseAttack: number): number {
        const modifiers = this.getStatModifiers();
        const weaponMasteryBonus = this.currentRank >= 2 ? 1.15 : 1.0;
        const legendaryWarriorBonus = this.currentRank >= 5 ? 1.3 : 1.0;

        return Math.floor(
            (baseAttack + modifiers.attack) *
            weaponMasteryBonus *
            legendaryWarriorBonus
        );
    }

    /**
     * 戦士固有のメソッド: 物理防御力計算
     */
    public calculatePhysicalDefense(baseDefense: number): number {
        const modifiers = this.getStatModifiers();
        const battleHardenedBonus = this.currentRank >= 3 ? 1.2 : 1.0;
        const legendaryWarriorBonus = this.currentRank >= 5 ? 1.3 : 1.0;

        return Math.floor(
            (baseDefense + modifiers.defense) *
            battleHardenedBonus *
            legendaryWarriorBonus
        );
    }

    /**
     * 戦士固有のメソッド: クリティカル率計算
     */
    public calculateCriticalRate(baseCriticalRate: number): number {
        let criticalRate = baseCriticalRate;

        // 剣聖特性によるクリティカル率上昇
        if (this.currentRank >= 4) {
            criticalRate += 25;
        }

        // 伝説の戦士特性による追加ボーナス
        if (this.currentRank >= 5) {
            criticalRate += 15;
        }

        return Math.min(criticalRate, 95); // 最大95%
    }
}