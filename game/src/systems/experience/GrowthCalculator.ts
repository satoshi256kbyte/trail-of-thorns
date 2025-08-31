/**
 * 能力値成長計算システム
 * キャラクターのレベルアップ時の能力値成長を計算・管理する
 */

import {
    GrowthRates,
    StatGrowthResult,
    GrowthRateData,
    StatLimits
} from '../../types/experience';
import { UnitStats } from '../../types/gameplay';

/**
 * 能力値成長計算クラス
 * 成長率に基づく確率的な能力値成長を計算する
 */
export class GrowthCalculator {
    private growthRateData: GrowthRateData | null = null;

    /**
     * 成長率データを読み込む
     * @param growthRateData 成長率データ
     */
    public loadGrowthRateData(growthRateData: GrowthRateData): void {
        this.growthRateData = growthRateData;
    }

    /**
     * キャラクター固有の成長率を取得する
     * @param characterId キャラクターID
     * @param level 現在のレベル（将来的なレベル依存成長率用）
     * @param jobClass 職業クラス（オプション）
     * @param jobIntegration 職業統合システム（オプション）
     * @returns 成長率データ
     */
    public getGrowthRates(
        characterId: string,
        level: number,
        jobClass?: string,
        jobIntegration?: any
    ): GrowthRates {
        if (!this.growthRateData) {
            throw new Error('Growth rate data not loaded');
        }

        // 基本成長率を取得
        let baseGrowthRates: GrowthRates;

        // キャラクター固有の成長率を優先
        const characterGrowthRates = this.growthRateData.characterGrowthRates[characterId];
        if (characterGrowthRates) {
            baseGrowthRates = { ...characterGrowthRates };
        }
        // 職業クラスの成長率をフォールバック
        else if (jobClass && this.growthRateData.jobClassGrowthRates[jobClass]) {
            baseGrowthRates = { ...this.growthRateData.jobClassGrowthRates[jobClass] };
        }
        // デフォルト成長率（全て50%）
        else {
            baseGrowthRates = {
                hp: 50,
                mp: 50,
                attack: 50,
                defense: 50,
                speed: 50,
                skill: 50,
                luck: 50
            };
        }

        // 職業システム統合が利用可能な場合、職業成長率修正を適用
        if (jobIntegration && typeof jobIntegration.applyJobGrowthRateModifiers === 'function') {
            try {
                return jobIntegration.applyJobGrowthRateModifiers(characterId, baseGrowthRates, level);
            } catch (error) {
                console.warn('Failed to apply job growth rate modifiers:', error);
            }
        }

        return baseGrowthRates;
    }

    /**
     * 成長率に基づいて能力値成長を計算する
     * @param baseStats 現在の基本能力値
     * @param growthRates 成長率
     * @returns 能力値成長結果
     */
    public calculateStatGrowth(baseStats: UnitStats, growthRates: GrowthRates): StatGrowthResult {
        const growth: StatGrowthResult = {
            hp: this.generateRandomGrowth(growthRates.hp),
            mp: this.generateRandomGrowth(growthRates.mp),
            attack: this.generateRandomGrowth(growthRates.attack),
            defense: this.generateRandomGrowth(growthRates.defense),
            speed: this.generateRandomGrowth(growthRates.speed),
            skill: this.generateRandomGrowth(growthRates.skill),
            luck: this.generateRandomGrowth(growthRates.luck)
        };

        // 能力値上限を適用
        const newStats: UnitStats = {
            maxHP: baseStats.maxHP + growth.hp,
            maxMP: baseStats.maxMP + growth.mp,
            attack: baseStats.attack + growth.attack,
            defense: baseStats.defense + growth.defense,
            speed: baseStats.speed + growth.speed,
            movement: baseStats.movement // 移動力は成長しない
        };

        const limitedStats = this.enforceStatLimits(newStats);

        // 実際の成長値を再計算（上限制限後）
        return {
            hp: limitedStats.maxHP - baseStats.maxHP,
            mp: limitedStats.maxMP - baseStats.maxMP,
            attack: limitedStats.attack - baseStats.attack,
            defense: limitedStats.defense - baseStats.defense,
            speed: limitedStats.speed - baseStats.speed,
            skill: growth.skill, // スキルは UnitStats に含まれないため、そのまま
            luck: growth.luck    // 運も UnitStats に含まれないため、そのまま
        };
    }

    /**
     * 確率的成長計算を行う
     * @param growthRate 成長率（0-100%）
     * @returns 成長値（0または1）
     */
    public generateRandomGrowth(growthRate: number): number {
        // 成長率を0-100の範囲に制限
        const clampedRate = Math.max(0, Math.min(100, growthRate));

        // 0-99の乱数を生成し、成長率と比較
        const randomValue = Math.floor(Math.random() * 100);

        return randomValue < clampedRate ? 1 : 0;
    }

    /**
     * 能力値上限制限を適用する
     * @param stats 制限前の能力値
     * @returns 制限後の能力値
     */
    public enforceStatLimits(stats: UnitStats): UnitStats {
        if (!this.growthRateData) {
            // データが読み込まれていない場合はそのまま返す
            return { ...stats };
        }

        const limits = this.growthRateData.statLimits;

        return {
            maxHP: Math.min(stats.maxHP, limits.maxHP),
            maxMP: Math.min(stats.maxMP, limits.maxMP),
            attack: Math.min(stats.attack, limits.attack),
            defense: Math.min(stats.defense, limits.defense),
            speed: Math.min(stats.speed, limits.speed),
            movement: stats.movement // 移動力は制限しない
        };
    }

    /**
     * 能力値上限を取得する
     * @returns 能力値上限設定
     */
    public getStatLimits(): StatLimits | null {
        return this.growthRateData?.statLimits || null;
    }

    /**
     * 成長率データが読み込まれているかチェック
     * @returns データ読み込み状態
     */
    public isDataLoaded(): boolean {
        return this.growthRateData !== null;
    }

    /**
     * 成長率データをクリアする（テスト用）
     */
    public clearData(): void {
        this.growthRateData = null;
    }

    /**
     * 複数レベルアップ時の累積成長を計算する
     * @param baseStats 基本能力値
     * @param growthRates 成長率
     * @param levelUps レベルアップ回数
     * @returns 累積成長結果
     */
    public calculateCumulativeGrowth(
        baseStats: UnitStats,
        growthRates: GrowthRates,
        levelUps: number
    ): StatGrowthResult {
        let totalGrowth: StatGrowthResult = {
            hp: 0,
            mp: 0,
            attack: 0,
            defense: 0,
            speed: 0,
            skill: 0,
            luck: 0
        };

        let currentStats = { ...baseStats };

        for (let i = 0; i < levelUps; i++) {
            const levelGrowth = this.calculateStatGrowth(currentStats, growthRates);

            // 成長を累積
            totalGrowth.hp += levelGrowth.hp;
            totalGrowth.mp += levelGrowth.mp;
            totalGrowth.attack += levelGrowth.attack;
            totalGrowth.defense += levelGrowth.defense;
            totalGrowth.speed += levelGrowth.speed;
            totalGrowth.skill += levelGrowth.skill;
            totalGrowth.luck += levelGrowth.luck;

            // 現在の能力値を更新
            currentStats.maxHP += levelGrowth.hp;
            currentStats.maxMP += levelGrowth.mp;
            currentStats.attack += levelGrowth.attack;
            currentStats.defense += levelGrowth.defense;
            currentStats.speed += levelGrowth.speed;
        }

        return totalGrowth;
    }

    /**
     * 成長期待値を計算する
     * @param growthRates 成長率
     * @param levelUps レベルアップ回数
     * @returns 期待成長値
     */
    public calculateExpectedGrowth(growthRates: GrowthRates, levelUps: number): StatGrowthResult {
        return {
            hp: Math.round((growthRates.hp / 100) * levelUps),
            mp: Math.round((growthRates.mp / 100) * levelUps),
            attack: Math.round((growthRates.attack / 100) * levelUps),
            defense: Math.round((growthRates.defense / 100) * levelUps),
            speed: Math.round((growthRates.speed / 100) * levelUps),
            skill: Math.round((growthRates.skill / 100) * levelUps),
            luck: Math.round((growthRates.luck / 100) * levelUps)
        };
    }
}