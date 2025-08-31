/**
 * ArcherJob（弓使い）クラス
 * 
 * 遠距離攻撃と機動力に特化した職業
 * 高い速度・技術・運を持ち、クリティカル攻撃が得意
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

export class ArcherJob extends Job {
    constructor(jobData: JobData, initialRank: number = 1) {
        super(jobData, initialRank);
    }

    /**
     * 弓使いの能力値修正を取得
     * 速度・技術・運にボーナス、バランス型の能力値
     */
    public getStatModifiers(): StatModifiers {
        const rankMultiplier = this.currentRank;

        return this.createStatModifiers(
            rankMultiplier * 6,  // HP: ランクごとに+6
            rankMultiplier * 4,  // MP: ランクごとに+4
            rankMultiplier * 4,  // 攻撃力: ランクごとに+4
            rankMultiplier * 2,  // 防御力: ランクごとに+2（軽装備）
            rankMultiplier * 6,  // 速度: ランクごとに+6
            rankMultiplier * 5,  // 技術: ランクごとに+5
            rankMultiplier * 4   // 運: ランクごとに+4
        );
    }

    /**
     * 弓使いの使用可能スキルを取得
     */
    public getAvailableSkills(): string[] {
        const skills: string[] = [];

        // ランク1: 基本スキル
        skills.push('aimed_shot', 'quick_step', 'eagle_eye');

        // ランク2: 強化スキル
        if (this.currentRank >= 2) {
            skills.push('double_shot', 'evasion_boost', 'weak_point_strike');
        }

        // ランク3: 上級スキル
        if (this.currentRank >= 3) {
            skills.push('piercing_arrow', 'shadow_step', 'hunter_instinct');
        }

        // ランク4: 奥義
        if (this.currentRank >= 4) {
            skills.push('arrow_rain', 'phantom_shot', 'perfect_aim');
        }

        // ランク5: 究極技
        if (this.currentRank >= 5) {
            skills.push('divine_arrow', 'time_dilation', 'absolute_precision');
        }

        return skills;
    }

    /**
     * 弓使いのランクアップ要件を取得
     */
    public getRankUpRequirements(targetRank: number): RankUpRequirements {
        switch (targetRank) {
            case 2:
                return this.createRankUpRequirements(
                    11,  // 薔薇の力コスト
                    6,   // レベル要件
                    ['aimed_shot', 'eagle_eye'], // 前提スキル
                );
            case 3:
                return this.createRankUpRequirements(
                    28,  // 薔薇の力コスト
                    13,  // レベル要件
                    ['double_shot', 'weak_point_strike'], // 前提スキル
                );
            case 4:
                return this.createRankUpRequirements(
                    55,  // 薔薇の力コスト
                    21,  // レベル要件
                    ['piercing_arrow', 'hunter_instinct'], // 前提スキル
                    ['forest_depths'], // 完了ステージ
                );
            case 5:
                return this.createRankUpRequirements(
                    110, // 薔薇の力コスト
                    32,  // レベル要件
                    ['arrow_rain', 'perfect_aim'], // 前提スキル
                    ['sky_fortress'], // 完了ステージ
                    ['wind_dragon'], // 撃破ボス
                );
            default:
                throw new Error(`Invalid target rank for ArcherJob: ${targetRank}`);
        }
    }

    /**
     * 弓使いの職業特性を取得
     */
    public getJobTraits(): JobTrait[] {
        const traits: JobTrait[] = [];

        // ランク1: 基本特性
        traits.push(
            this.createJobTrait(
                'keen_sight',
                '鋭い視力',
                '命中率とクリティカル率が上昇する',
                TraitEffectType.STAT_BONUS,
                10,
                'accuracy_and_critical'
            )
        );

        // ランク2: 強化特性
        if (this.currentRank >= 2) {
            traits.push(
                this.createJobTrait(
                    'swift_reflexes',
                    '素早い反射',
                    '回避率と先制攻撃率が上昇する',
                    TraitEffectType.STAT_BONUS,
                    15,
                    'evasion_and_initiative'
                )
            );
        }

        // ランク3: 上級特性
        if (this.currentRank >= 3) {
            traits.push(
                this.createJobTrait(
                    'hunter_expertise',
                    '狩人の専門技術',
                    '弱点攻撃時のダメージが大幅に増加する',
                    TraitEffectType.DAMAGE_BONUS,
                    25,
                    'weak_point_attack'
                )
            );
        }

        // ランク4: 奥義特性
        if (this.currentRank >= 4) {
            traits.push(
                this.createJobTrait(
                    'phantom_archer',
                    '幻影の射手',
                    '攻撃後に追加攻撃が発動する可能性がある',
                    TraitEffectType.SPECIAL_ABILITY,
                    30,
                    'follow_up_attack'
                )
            );
        }

        // ランク5: 究極特性
        if (this.currentRank >= 5) {
            traits.push(
                this.createJobTrait(
                    'divine_marksman',
                    '神射手',
                    '全ての射撃攻撃が必中かつ最大威力になる',
                    TraitEffectType.SPECIAL_ABILITY,
                    50,
                    'perfect_shots'
                )
            );
        }

        return traits;
    }

    /**
     * 弓使いの成長率修正を取得
     */
    public getGrowthRateModifiers(): GrowthRateModifiers {
        const rankBonus = (this.currentRank - 1) * 2; // ランクごとに+2%

        return this.createGrowthRateModifiers(
            10 + rankBonus, // HP成長率: 基本10% + ランクボーナス
            8 + rankBonus,  // MP成長率: 基本8% + ランクボーナス
            11 + rankBonus, // 攻撃成長率: 基本11% + ランクボーナス
            6 + rankBonus,  // 防御成長率: 基本6% + ランクボーナス
            16 + rankBonus, // 速度成長率: 基本16% + ランクボーナス
            14 + rankBonus, // 技術成長率: 基本14% + ランクボーナス
            13 + rankBonus  // 運成長率: 基本13% + ランクボーナス
        );
    }

    /**
     * 弓使い固有のメソッド: 射撃攻撃力計算
     */
    public calculateRangedAttackPower(baseAttack: number, skill: number): number {
        const modifiers = this.getStatModifiers();
        const hunterExpertiseBonus = this.currentRank >= 3 ? 1.25 : 1.0;
        const divineMaksmanBonus = this.currentRank >= 5 ? 1.5 : 1.0;

        // 射撃攻撃力は攻撃力と技術の両方に依存
        const rangedPower = (baseAttack + modifiers.attack) + (skill + modifiers.skill) * 0.3;

        return Math.floor(
            rangedPower *
            hunterExpertiseBonus *
            divineMaksmanBonus
        );
    }

    /**
     * 弓使い固有のメソッド: 命中率計算
     */
    public calculateAccuracy(baseAccuracy: number, skill: number): number {
        const modifiers = this.getStatModifiers();
        let accuracy = baseAccuracy + (skill + modifiers.skill) * 0.2;

        // 鋭い視力による命中率上昇
        accuracy += 10 * this.currentRank;

        // 神射手による必中効果
        if (this.currentRank >= 5) {
            accuracy = 100;
        }

        return Math.min(accuracy, 100);
    }

    /**
     * 弓使い固有のメソッド: クリティカル率計算
     */
    public calculateCriticalRate(baseCriticalRate: number, luck: number): number {
        const modifiers = this.getStatModifiers();
        let criticalRate = baseCriticalRate + (luck + modifiers.luck) * 0.3;

        // 鋭い視力によるクリティカル率上昇
        criticalRate += 10 * this.currentRank;

        // 神射手による最大クリティカル率
        if (this.currentRank >= 5) {
            criticalRate = 95;
        }

        return Math.min(criticalRate, 95);
    }

    /**
     * 弓使い固有のメソッド: 回避率計算
     */
    public calculateEvasionRate(baseEvasion: number, speed: number): number {
        const modifiers = this.getStatModifiers();
        let evasionRate = baseEvasion + (speed + modifiers.speed) * 0.2;

        // 素早い反射による回避率上昇
        if (this.currentRank >= 2) {
            evasionRate += 15;
        }

        // 幻影の射手による追加回避
        if (this.currentRank >= 4) {
            evasionRate += 10;
        }

        return Math.min(evasionRate, 80); // 最大80%
    }

    /**
     * 弓使い固有のメソッド: 追加攻撃判定
     */
    public checkFollowUpAttack(): boolean {
        if (this.currentRank < 4) {
            return false;
        }

        // 幻影の射手による追加攻撃判定
        const followUpChance = 30 + (this.currentRank - 4) * 10;
        return Math.random() * 100 < followUpChance;
    }

    /**
     * 弓使い固有のメソッド: 弱点攻撃ダメージ倍率
     */
    public getWeakPointDamageMultiplier(): number {
        let multiplier = 1.0;

        // 狩人の専門技術による弱点攻撃強化
        if (this.currentRank >= 3) {
            multiplier += 0.25 * (this.currentRank - 2);
        }

        // 神射手による最大威力
        if (this.currentRank >= 5) {
            multiplier = 2.0;
        }

        return multiplier;
    }
}