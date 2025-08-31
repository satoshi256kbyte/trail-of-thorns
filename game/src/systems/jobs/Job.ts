/**
 * Job基底クラス
 * 
 * 全ての職業クラスの基底となる抽象クラス
 * 能力値修正、スキル管理、ランクアップ要件などの共通機能を定義
 */

import {
    StatModifiers,
    GrowthRateModifiers,
    RankUpRequirements,
    JobTrait,
    JobCategory,
    JobData,
} from '../../types/job';

/**
 * Job抽象基底クラス
 */
export abstract class Job {
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;
    public readonly category: JobCategory;
    public readonly maxRank: number;

    protected currentRank: number;

    constructor(jobData: JobData, initialRank: number = 1) {
        this.id = jobData.id;
        this.name = jobData.name;
        this.description = jobData.description;
        this.category = jobData.category;
        this.maxRank = jobData.maxRank;
        this.currentRank = Math.max(1, Math.min(initialRank, this.maxRank));
    }

    /**
     * 現在のランクを取得
     */
    public getCurrentRank(): number {
        return this.currentRank;
    }

    /**
     * ランクを設定
     */
    public setRank(rank: number): void {
        this.currentRank = Math.max(1, Math.min(rank, this.maxRank));
    }

    /**
     * 最大ランクかどうかを判定
     */
    public isMaxRank(): boolean {
        return this.currentRank >= this.maxRank;
    }

    /**
     * 次のランクが存在するかを判定
     */
    public hasNextRank(): boolean {
        return this.currentRank < this.maxRank;
    }

    // =============================================================================
    // 抽象メソッド（各職業クラスで実装必須）
    // =============================================================================

    /**
     * 現在のランクでの基本能力値修正を取得
     */
    public abstract getStatModifiers(): StatModifiers;

    /**
     * 現在のランクで使用可能なスキルIDリストを取得
     */
    public abstract getAvailableSkills(): string[];

    /**
     * 指定ランクへのランクアップ要件を取得
     */
    public abstract getRankUpRequirements(targetRank: number): RankUpRequirements;

    /**
     * 職業特性を取得
     */
    public abstract getJobTraits(): JobTrait[];

    /**
     * 現在のランクでの成長率修正を取得
     */
    public abstract getGrowthRateModifiers(): GrowthRateModifiers;

    // =============================================================================
    // 共通メソッド
    // =============================================================================

    /**
     * 指定ランクでの能力値修正を取得
     */
    public getStatModifiersForRank(rank: number): StatModifiers {
        const originalRank = this.currentRank;
        this.currentRank = Math.max(1, Math.min(rank, this.maxRank));
        const modifiers = this.getStatModifiers();
        this.currentRank = originalRank;
        return modifiers;
    }

    /**
     * 指定ランクで使用可能なスキルを取得
     */
    public getAvailableSkillsForRank(rank: number): string[] {
        const originalRank = this.currentRank;
        this.currentRank = Math.max(1, Math.min(rank, this.maxRank));
        const skills = this.getAvailableSkills();
        this.currentRank = originalRank;
        return skills;
    }

    /**
     * 指定ランクでの成長率修正を取得
     */
    public getGrowthRateModifiersForRank(rank: number): GrowthRateModifiers {
        const originalRank = this.currentRank;
        this.currentRank = Math.max(1, Math.min(rank, this.maxRank));
        const modifiers = this.getGrowthRateModifiers();
        this.currentRank = originalRank;
        return modifiers;
    }

    /**
     * ランクアップ可能かを判定
     */
    public canRankUp(): boolean {
        return this.currentRank < this.maxRank;
    }

    /**
     * 次のランクへのランクアップ要件を取得
     */
    public getNextRankRequirements(): RankUpRequirements | null {
        if (!this.canRankUp()) {
            return null;
        }
        return this.getRankUpRequirements(this.currentRank + 1);
    }

    /**
     * ランクアップ実行
     */
    public rankUp(): boolean {
        if (!this.canRankUp()) {
            return false;
        }
        this.currentRank++;
        return true;
    }

    /**
     * 職業情報の文字列表現を取得
     */
    public toString(): string {
        return `${this.name} (Rank ${this.currentRank}/${this.maxRank})`;
    }

    /**
     * 職業データをJSONオブジェクトとして取得
     */
    public toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            category: this.category,
            currentRank: this.currentRank,
            maxRank: this.maxRank,
            statModifiers: this.getStatModifiers(),
            availableSkills: this.getAvailableSkills(),
            jobTraits: this.getJobTraits(),
            growthRateModifiers: this.getGrowthRateModifiers(),
        };
    }

    // =============================================================================
    // ヘルパーメソッド
    // =============================================================================

    /**
     * 能力値修正を作成するヘルパーメソッド
     */
    protected createStatModifiers(
        hp: number = 0,
        mp: number = 0,
        attack: number = 0,
        defense: number = 0,
        speed: number = 0,
        skill: number = 0,
        luck: number = 0
    ): StatModifiers {
        return { hp, mp, attack, defense, speed, skill, luck };
    }

    /**
     * 成長率修正を作成するヘルパーメソッド
     */
    protected createGrowthRateModifiers(
        hp: number = 0,
        mp: number = 0,
        attack: number = 0,
        defense: number = 0,
        speed: number = 0,
        skill: number = 0,
        luck: number = 0
    ): GrowthRateModifiers {
        return { hp, mp, attack, defense, speed, skill, luck };
    }

    /**
     * ランクアップ要件を作成するヘルパーメソッド
     */
    protected createRankUpRequirements(
        roseEssenceCost: number,
        levelRequirement: number,
        prerequisiteSkills: string[] = [],
        completedStages: string[] = [],
        defeatedBosses: string[] = []
    ): RankUpRequirements {
        return {
            roseEssenceCost,
            levelRequirement,
            prerequisiteSkills,
            completedStages,
            defeatedBosses,
        };
    }

    /**
     * 職業特性を作成するヘルパーメソッド
     */
    protected createJobTrait(
        id: string,
        name: string,
        description: string,
        effectType: string,
        effectValue: number,
        target?: string,
        condition?: string
    ): JobTrait {
        return {
            id,
            name,
            description,
            effect: {
                type: effectType as any,
                value: effectValue,
                target,
                condition,
            },
        };
    }
}