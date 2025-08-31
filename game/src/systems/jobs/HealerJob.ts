/**
 * HealerJob（僧侶）クラス
 * 
 * 回復と支援に特化した職業
 * 高いMP・技術・運を持ち、回復魔法と状態異常回復が得意
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

export class HealerJob extends Job {
    constructor(jobData: JobData, initialRank: number = 1) {
        super(jobData, initialRank);
    }

    /**
     * 僧侶の能力値修正を取得
     * MP・技術・運にボーナス、攻撃力は控えめ
     */
    public getStatModifiers(): StatModifiers {
        const rankMultiplier = this.currentRank;

        return this.createStatModifiers(
            rankMultiplier * 7,  // HP: ランクごとに+7
            rankMultiplier * 10, // MP: ランクごとに+10
            rankMultiplier * 2,  // 攻撃力: ランクごとに+2（低め）
            rankMultiplier * 3,  // 防御力: ランクごとに+3
            rankMultiplier * 3,  // 速度: ランクごとに+3
            rankMultiplier * 6,  // 技術: ランクごとに+6
            rankMultiplier * 5   // 運: ランクごとに+5
        );
    }

    /**
     * 僧侶の使用可能スキルを取得
     */
    public getAvailableSkills(): string[] {
        const skills: string[] = [];

        // ランク1: 基本スキル
        skills.push('heal', 'cure', 'bless');

        // ランク2: 強化スキル
        if (this.currentRank >= 2) {
            skills.push('group_heal', 'purify', 'protection');
        }

        // ランク3: 上級スキル
        if (this.currentRank >= 3) {
            skills.push('mass_heal', 'dispel_curse', 'holy_light');
        }

        // ランク4: 奥義
        if (this.currentRank >= 4) {
            skills.push('resurrection', 'divine_protection', 'sanctuary');
        }

        // ランク5: 究極技
        if (this.currentRank >= 5) {
            skills.push('miracle', 'divine_intervention', 'eternal_blessing');
        }

        return skills;
    }

    /**
     * 僧侶のランクアップ要件を取得
     */
    public getRankUpRequirements(targetRank: number): RankUpRequirements {
        switch (targetRank) {
            case 2:
                return this.createRankUpRequirements(
                    13,  // 薔薇の力コスト
                    5,   // レベル要件
                    ['heal', 'cure'], // 前提スキル
                );
            case 3:
                return this.createRankUpRequirements(
                    32,  // 薔薇の力コスト
                    11,  // レベル要件
                    ['group_heal', 'purify'], // 前提スキル
                );
            case 4:
                return this.createRankUpRequirements(
                    65,  // 薔薇の力コスト
                    19,  // レベル要件
                    ['mass_heal', 'holy_light'], // 前提スキル
                    ['sacred_temple'], // 完了ステージ
                );
            case 5:
                return this.createRankUpRequirements(
                    130, // 薔薇の力コスト
                    29,  // レベル要件
                    ['resurrection', 'sanctuary'], // 前提スキル
                    ['celestial_realm'], // 完了ステージ
                    ['fallen_angel'], // 撃破ボス
                );
            default:
                throw new Error(`Invalid target rank for HealerJob: ${targetRank}`);
        }
    }

    /**
     * 僧侶の職業特性を取得
     */
    public getJobTraits(): JobTrait[] {
        const traits: JobTrait[] = [];

        // ランク1: 基本特性
        traits.push(
            this.createJobTrait(
                'divine_favor',
                '神の恩寵',
                '回復魔法の効果が上昇する',
                TraitEffectType.SKILL_BONUS,
                15,
                'healing_power'
            )
        );

        // ランク2: 強化特性
        if (this.currentRank >= 2) {
            traits.push(
                this.createJobTrait(
                    'purification',
                    '浄化の力',
                    '状態異常の回復効果が上昇し、予防効果もある',
                    TraitEffectType.SKILL_BONUS,
                    20,
                    'status_recovery'
                )
            );
        }

        // ランク3: 上級特性
        if (this.currentRank >= 3) {
            traits.push(
                this.createJobTrait(
                    'holy_aura',
                    '聖なるオーラ',
                    '周囲の味方の能力値が上昇する',
                    TraitEffectType.STAT_BONUS,
                    10,
                    'party_buff'
                )
            );
        }

        // ランク4: 奥義特性
        if (this.currentRank >= 4) {
            traits.push(
                this.createJobTrait(
                    'divine_protection',
                    '神の加護',
                    '致命的なダメージを受けた時に生存する可能性がある',
                    TraitEffectType.SPECIAL_ABILITY,
                    25,
                    'death_prevention'
                )
            );
        }

        // ランク5: 究極特性
        if (this.currentRank >= 5) {
            traits.push(
                this.createJobTrait(
                    'saint',
                    '聖人',
                    '全ての支援効果が劇的に強化される',
                    TraitEffectType.SPECIAL_ABILITY,
                    50,
                    'ultimate_support'
                )
            );
        }

        return traits;
    }

    /**
     * 僧侶の成長率修正を取得
     */
    public getGrowthRateModifiers(): GrowthRateModifiers {
        const rankBonus = (this.currentRank - 1) * 2; // ランクごとに+2%

        return this.createGrowthRateModifiers(
            12 + rankBonus, // HP成長率: 基本12% + ランクボーナス
            16 + rankBonus, // MP成長率: 基本16% + ランクボーナス
            4 + rankBonus,  // 攻撃成長率: 基本4% + ランクボーナス（低め）
            8 + rankBonus,  // 防御成長率: 基本8% + ランクボーナス
            7 + rankBonus,  // 速度成長率: 基本7% + ランクボーナス
            17 + rankBonus, // 技術成長率: 基本17% + ランクボーナス
            15 + rankBonus  // 運成長率: 基本15% + ランクボーナス
        );
    }

    /**
     * 僧侶固有のメソッド: 回復力計算
     */
    public calculateHealingPower(baseHealing: number, skill: number): number {
        const modifiers = this.getStatModifiers();
        const divineFavorBonus = 1 + (0.15 * this.currentRank);
        const saintBonus = this.currentRank >= 5 ? 1.5 : 1.0;

        // 回復力は技術に大きく依存
        const healingPower = baseHealing + (skill + modifiers.skill) * 1.0;

        return Math.floor(
            healingPower *
            divineFavorBonus *
            saintBonus
        );
    }

    /**
     * 僧侶固有のメソッド: 状態異常回復成功率計算
     */
    public calculateStatusRecoveryRate(baseRate: number, skill: number): number {
        const modifiers = this.getStatModifiers();
        let recoveryRate = baseRate + (skill + modifiers.skill) * 0.3;

        // 浄化の力による成功率上昇
        if (this.currentRank >= 2) {
            recoveryRate += 20 + (this.currentRank - 2) * 5;
        }

        // 聖人による完全回復
        if (this.currentRank >= 5) {
            recoveryRate = 100;
        }

        return Math.min(recoveryRate, 100);
    }

    /**
     * 僧侶固有のメソッド: パーティバフ効果計算
     */
    public calculatePartyBuffEffect(): StatModifiers {
        if (this.currentRank < 3) {
            return this.createStatModifiers();
        }

        const buffPower = 10 + (this.currentRank - 3) * 5;
        const saintMultiplier = this.currentRank >= 5 ? 2 : 1;

        return this.createStatModifiers(
            buffPower * saintMultiplier, // HP
            buffPower * saintMultiplier, // MP
            buffPower * saintMultiplier, // 攻撃力
            buffPower * saintMultiplier, // 防御力
            buffPower * saintMultiplier, // 速度
            buffPower * saintMultiplier, // 技術
            buffPower * saintMultiplier  // 運
        );
    }

    /**
     * 僧侶固有のメソッド: 蘇生成功率計算
     */
    public calculateResurrectionRate(targetLevel: number, skill: number): number {
        if (this.currentRank < 4) {
            return 0;
        }

        const modifiers = this.getStatModifiers();
        const baseRate = 50 + (skill + modifiers.skill) * 0.5;
        const levelPenalty = Math.max(0, targetLevel - 20) * 2;
        let resurrectionRate = baseRate - levelPenalty;

        // 神の加護による成功率上昇
        resurrectionRate += (this.currentRank - 3) * 10;

        // 聖人による高確率蘇生
        if (this.currentRank >= 5) {
            resurrectionRate = Math.max(resurrectionRate, 80);
        }

        return Math.max(Math.min(resurrectionRate, 95), 10);
    }

    /**
     * 僧侶固有のメソッド: 致命傷回避判定
     */
    public checkDeathPrevention(): boolean {
        if (this.currentRank < 4) {
            return false;
        }

        // 神の加護による致命傷回避判定
        const preventionChance = 25 + (this.currentRank - 4) * 15;
        return Math.random() * 100 < preventionChance;
    }

    /**
     * 僧侶固有のメソッド: 状態異常予防効果判定
     */
    public checkStatusPrevention(): boolean {
        if (this.currentRank < 2) {
            return false;
        }

        // 浄化の力による状態異常予防判定
        const preventionChance = 30 + (this.currentRank - 2) * 10;
        return Math.random() * 100 < preventionChance;
    }

    /**
     * 僧侶固有のメソッド: MP回復効果計算
     */
    public calculateMPRecovery(baseMPRecovery: number, skill: number): number {
        const modifiers = this.getStatModifiers();
        const saintBonus = this.currentRank >= 5 ? 1.5 : 1.0;

        // MP回復は技術に依存
        const mpRecovery = baseMPRecovery + (skill + modifiers.skill) * 0.6;

        return Math.floor(mpRecovery * saintBonus);
    }
}