/**
 * ThiefJob（盗賊）クラス
 * 
 * 機動力と特殊技能に特化した職業
 * 高い速度・運・技術を持ち、クリティカル攻撃と特殊効果が得意
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

export class ThiefJob extends Job {
    constructor(jobData: JobData, initialRank: number = 1) {
        super(jobData, initialRank);
    }

    /**
     * 盗賊の能力値修正を取得
     * 速度・運・技術にボーナス、HP・防御力は控えめ
     */
    public getStatModifiers(): StatModifiers {
        const rankMultiplier = this.currentRank;

        return this.createStatModifiers(
            rankMultiplier * 5,  // HP: ランクごとに+5（低め）
            rankMultiplier * 6,  // MP: ランクごとに+6
            rankMultiplier * 4,  // 攻撃力: ランクごとに+4
            rankMultiplier * 1,  // 防御力: ランクごとに+1（低め）
            rankMultiplier * 7,  // 速度: ランクごとに+7
            rankMultiplier * 6,  // 技術: ランクごとに+6
            rankMultiplier * 6   // 運: ランクごとに+6
        );
    }

    /**
     * 盗賊の使用可能スキルを取得
     */
    public getAvailableSkills(): string[] {
        const skills: string[] = [];

        // ランク1: 基本スキル
        skills.push('sneak_attack', 'steal', 'lockpick');

        // ランク2: 強化スキル
        if (this.currentRank >= 2) {
            skills.push('poison_blade', 'smoke_bomb', 'treasure_hunter');
        }

        // ランク3: 上級スキル
        if (this.currentRank >= 3) {
            skills.push('assassinate', 'invisibility', 'trap_detection');
        }

        // ランク4: 奥義
        if (this.currentRank >= 4) {
            skills.push('shadow_clone', 'time_theft', 'master_thief');
        }

        // ランク5: 究極技
        if (this.currentRank >= 5) {
            skills.push('void_step', 'fate_steal', 'phantom_thief');
        }

        return skills;
    }

    /**
     * 盗賊のランクアップ要件を取得
     */
    public getRankUpRequirements(targetRank: number): RankUpRequirements {
        switch (targetRank) {
            case 2:
                return this.createRankUpRequirements(
                    9,   // 薔薇の力コスト
                    7,   // レベル要件
                    ['sneak_attack', 'steal'], // 前提スキル
                );
            case 3:
                return this.createRankUpRequirements(
                    22,  // 薔薇の力コスト
                    14,  // レベル要件
                    ['poison_blade', 'treasure_hunter'], // 前提スキル
                );
            case 4:
                return this.createRankUpRequirements(
                    45,  // 薔薇の力コスト
                    22,  // レベル要件
                    ['assassinate', 'invisibility'], // 前提スキル
                    ['thieves_den'], // 完了ステージ
                );
            case 5:
                return this.createRankUpRequirements(
                    90,  // 薔薇の力コスト
                    33,  // レベル要件
                    ['shadow_clone', 'master_thief'], // 前提スキル
                    ['shadow_realm'], // 完了ステージ
                    ['shadow_king'], // 撃破ボス
                );
            default:
                throw new Error(`Invalid target rank for ThiefJob: ${targetRank}`);
        }
    }

    /**
     * 盗賊の職業特性を取得
     */
    public getJobTraits(): JobTrait[] {
        const traits: JobTrait[] = [];

        // ランク1: 基本特性
        traits.push(
            this.createJobTrait(
                'nimble_fingers',
                '器用な指先',
                'クリティカル率と盗み成功率が上昇する',
                TraitEffectType.STAT_BONUS,
                12,
                'critical_and_steal'
            )
        );

        // ランク2: 強化特性
        if (this.currentRank >= 2) {
            traits.push(
                this.createJobTrait(
                    'poison_expertise',
                    '毒の専門知識',
                    '毒攻撃の効果時間と威力が上昇する',
                    TraitEffectType.SKILL_BONUS,
                    20,
                    'poison_effects'
                )
            );
        }

        // ランク3: 上級特性
        if (this.currentRank >= 3) {
            traits.push(
                this.createJobTrait(
                    'shadow_mastery',
                    '影の習熟',
                    '隠密行動中の攻撃力と回避率が大幅に上昇する',
                    TraitEffectType.STAT_BONUS,
                    30,
                    'stealth_bonus'
                )
            );
        }

        // ランク4: 奥義特性
        if (this.currentRank >= 4) {
            traits.push(
                this.createJobTrait(
                    'master_infiltrator',
                    '潜入の達人',
                    '先制攻撃率が大幅に上昇し、複数回行動が可能になる',
                    TraitEffectType.SPECIAL_ABILITY,
                    35,
                    'multi_action'
                )
            );
        }

        // ランク5: 究極特性
        if (this.currentRank >= 5) {
            traits.push(
                this.createJobTrait(
                    'phantom_thief',
                    '怪盗',
                    '全ての行動が完璧に成功し、反撃を受けない',
                    TraitEffectType.SPECIAL_ABILITY,
                    50,
                    'perfect_actions'
                )
            );
        }

        return traits;
    }

    /**
     * 盗賊の成長率修正を取得
     */
    public getGrowthRateModifiers(): GrowthRateModifiers {
        const rankBonus = (this.currentRank - 1) * 2; // ランクごとに+2%

        return this.createGrowthRateModifiers(
            8 + rankBonus,  // HP成長率: 基本8% + ランクボーナス（低め）
            10 + rankBonus, // MP成長率: 基本10% + ランクボーナス
            9 + rankBonus,  // 攻撃成長率: 基本9% + ランクボーナス
            5 + rankBonus,  // 防御成長率: 基本5% + ランクボーナス（低め）
            18 + rankBonus, // 速度成長率: 基本18% + ランクボーナス
            16 + rankBonus, // 技術成長率: 基本16% + ランクボーナス
            17 + rankBonus  // 運成長率: 基本17% + ランクボーナス
        );
    }

    /**
     * 盗賊固有のメソッド: 奇襲攻撃力計算
     */
    public calculateSneakAttackPower(baseAttack: number, speed: number, luck: number): number {
        const modifiers = this.getStatModifiers();
        const shadowMasteryBonus = this.currentRank >= 3 ? 1.3 : 1.0;
        const phantomThiefBonus = this.currentRank >= 5 ? 1.5 : 1.0;

        // 奇襲攻撃力は攻撃力・速度・運に依存
        const sneakPower = (baseAttack + modifiers.attack) +
            (speed + modifiers.speed) * 0.3 +
            (luck + modifiers.luck) * 0.2;

        return Math.floor(
            sneakPower *
            shadowMasteryBonus *
            phantomThiefBonus
        );
    }

    /**
     * 盗賊固有のメソッド: 盗み成功率計算
     */
    public calculateStealSuccessRate(targetLevel: number, skill: number, luck: number): number {
        const modifiers = this.getStatModifiers();
        const baseRate = 40 + (skill + modifiers.skill) * 0.4 + (luck + modifiers.luck) * 0.3;
        const levelPenalty = Math.max(0, targetLevel - 15) * 3;
        let stealRate = baseRate - levelPenalty;

        // 器用な指先による成功率上昇
        stealRate += 12 * this.currentRank;

        // 怪盗による完璧な盗み
        if (this.currentRank >= 5) {
            stealRate = 95;
        }

        return Math.max(Math.min(stealRate, 95), 5);
    }

    /**
     * 盗賊固有のメソッド: クリティカル率計算
     */
    public calculateCriticalRate(baseCriticalRate: number, luck: number): number {
        const modifiers = this.getStatModifiers();
        let criticalRate = baseCriticalRate + (luck + modifiers.luck) * 0.4;

        // 器用な指先によるクリティカル率上昇
        criticalRate += 12 * this.currentRank;

        // 怪盗による高クリティカル率
        if (this.currentRank >= 5) {
            criticalRate = Math.max(criticalRate, 80);
        }

        return Math.min(criticalRate, 95);
    }

    /**
     * 盗賊固有のメソッド: 先制攻撃率計算
     */
    public calculateInitiativeRate(speed: number): number {
        const modifiers = this.getStatModifiers();
        let initiativeRate = 30 + (speed + modifiers.speed) * 0.5;

        // 潜入の達人による先制攻撃率上昇
        if (this.currentRank >= 4) {
            initiativeRate += 35;
        }

        // 怪盗による完璧な先制
        if (this.currentRank >= 5) {
            initiativeRate = 100;
        }

        return Math.min(initiativeRate, 100);
    }

    /**
     * 盗賊固有のメソッド: 毒攻撃威力計算
     */
    public calculatePoisonDamage(baseDamage: number, skill: number): number {
        if (this.currentRank < 2) {
            return 0;
        }

        const modifiers = this.getStatModifiers();
        const poisonExpertiseBonus = 1 + (0.2 * (this.currentRank - 1));
        const phantomThiefBonus = this.currentRank >= 5 ? 1.5 : 1.0;

        const poisonDamage = baseDamage + (skill + modifiers.skill) * 0.5;

        return Math.floor(
            poisonDamage *
            poisonExpertiseBonus *
            phantomThiefBonus
        );
    }

    /**
     * 盗賊固有のメソッド: 複数回行動判定
     */
    public checkMultiAction(): number {
        if (this.currentRank < 4) {
            return 1;
        }

        // 潜入の達人による複数回行動
        const multiActionChance = 40 + (this.currentRank - 4) * 20;

        if (Math.random() * 100 < multiActionChance) {
            // 怪盗は最大3回行動
            return this.currentRank >= 5 ? 3 : 2;
        }

        return 1;
    }

    /**
     * 盗賊固有のメソッド: 隠密状態判定
     */
    public checkStealthMode(): boolean {
        if (this.currentRank < 3) {
            return false;
        }

        // 影の習熟による隠密状態判定
        const stealthChance = 50 + (this.currentRank - 3) * 15;
        return Math.random() * 100 < stealthChance;
    }

    /**
     * 盗賊固有のメソッド: 反撃回避判定
     */
    public checkCounterAvoidance(): boolean {
        if (this.currentRank < 5) {
            return false;
        }

        // 怪盗による反撃回避（完璧な行動）
        return true;
    }

    /**
     * 盗賊固有のメソッド: 宝探し成功率計算
     */
    public calculateTreasureHuntRate(luck: number): number {
        if (this.currentRank < 2) {
            return 0;
        }

        const modifiers = this.getStatModifiers();
        let treasureRate = 20 + (luck + modifiers.luck) * 0.6;

        // 宝探しスキルによる成功率上昇
        treasureRate += (this.currentRank - 1) * 10;

        // 怪盗による高確率宝探し
        if (this.currentRank >= 5) {
            treasureRate = Math.max(treasureRate, 70);
        }

        return Math.min(treasureRate, 90);
    }
}