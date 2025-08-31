/**
 * レベルアップ処理システム
 * キャラクターのレベルアップ実行、能力値成長処理、現在HP/MPの調整を担当
 */

import {
    LevelUpResult,
    StatGrowthResult,
    GrowthRates,
    UnitStats,
    ExperienceError
} from '../../types/experience';
import { Unit } from '../../types/gameplay';
import { GrowthCalculator } from './GrowthCalculator';
import { ExperienceManager } from './ExperienceManager';

/**
 * レベルアップ処理クラス
 * レベルアップの実行と能力値成長の管理を行う
 */
export class LevelUpProcessor {
    private growthCalculator: GrowthCalculator;
    private experienceManager: ExperienceManager;
    private eventEmitter?: Phaser.Events.EventEmitter;
    private jobIntegration?: any;

    constructor(
        growthCalculator: GrowthCalculator,
        experienceManager: ExperienceManager,
        eventEmitter?: Phaser.Events.EventEmitter
    ) {
        this.growthCalculator = growthCalculator;
        this.experienceManager = experienceManager;
        this.eventEmitter = eventEmitter;
    }

    /**
     * 職業統合システムを設定
     */
    public setJobIntegration(jobIntegration: any): void {
        this.jobIntegration = jobIntegration;
    }

    /**
     * レベルアップ実行処理
     * @param character レベルアップするキャラクター
     * @param jobClass 職業クラス（オプション）
     * @returns レベルアップ結果
     */
    public processLevelUp(character: Unit, jobClass?: string): LevelUpResult {
        if (!character) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        if (!this.experienceManager.hasCharacter(character.id)) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        if (!this.experienceManager.canLevelUp(character.id)) {
            throw new Error(ExperienceError.LEVEL_UP_FAILED);
        }

        // レベルアップ前の状態を記録
        const oldLevel = this.experienceManager.getCurrentLevel(character.id);
        const oldStats = this.convertToExperienceStats(character.stats);
        const timestamp = Date.now();

        // 成長率を取得（職業統合を含む）
        const growthRates = this.growthCalculator.getGrowthRates(
            character.id,
            oldLevel,
            jobClass,
            this.jobIntegration
        );

        // 能力値成長を計算
        const statGrowth = this.processStatGrowth(character, growthRates);

        // キャラクターレベルを更新
        const newLevel = this.updateCharacterLevel(character);

        // 新しい能力値を計算
        const newStats = this.applyStatGrowth(oldStats, statGrowth);

        // キャラクターの能力値を更新
        this.updateCharacterStats(character, newStats);

        // 現在HP/MPを比例調整
        this.adjustCurrentStats(character, oldStats.maxHP, oldStats.maxMP);

        // 次レベルまでの必要経験値を取得
        const newExperienceRequired = this.experienceManager.getExperienceToNextLevel(character.id);

        // レベルアップ結果を作成
        const levelUpResult: LevelUpResult = {
            characterId: character.id,
            oldLevel,
            newLevel,
            statGrowth,
            newExperienceRequired,
            oldStats,
            newStats,
            levelsGained: newLevel - oldLevel,
            timestamp
        };

        // イベント発行
        this.eventEmitter?.emit('level-up-processed', {
            character,
            result: levelUpResult
        });

        return levelUpResult;
    }

    /**
     * 能力値成長処理
     * @param character 対象キャラクター
     * @param growthRates 成長率
     * @returns 能力値成長結果
     */
    public processStatGrowth(character: Unit, growthRates: GrowthRates): StatGrowthResult {
        if (!character) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        if (!growthRates) {
            throw new Error(ExperienceError.GROWTH_RATE_INVALID);
        }

        // 現在の能力値を経験値システム用の形式に変換
        const currentStats = this.convertToExperienceStats(character.stats);

        // 成長計算を実行
        let statGrowth = this.growthCalculator.calculateStatGrowth(currentStats, growthRates);

        // 職業効果を統合
        if (this.jobIntegration && typeof this.jobIntegration.integrateJobEffectsIntoGrowth === 'function') {
            try {
                statGrowth = this.jobIntegration.integrateJobEffectsIntoGrowth(
                    character.id,
                    statGrowth,
                    character.level
                );
            } catch (error) {
                console.warn('Failed to integrate job effects into growth:', error);
            }
        }

        // イベント発行
        this.eventEmitter?.emit('stat-growth-calculated', {
            characterId: character.id,
            growthRates,
            statGrowth
        });

        return statGrowth;
    }

    /**
     * 現在HP/MPの比例調整
     * @param character 対象キャラクター
     * @param oldMaxHP レベルアップ前の最大HP
     * @param oldMaxMP レベルアップ前の最大MP
     */
    public adjustCurrentStats(character: Unit, oldMaxHP: number, oldMaxMP: number): void {
        if (!character) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        if (oldMaxHP <= 0 || oldMaxMP < 0) {
            throw new Error('Invalid old max stats');
        }

        // HP比例調整
        if (oldMaxHP > 0 && character.stats.maxHP > oldMaxHP) {
            const hpRatio = character.currentHP / oldMaxHP;
            const newCurrentHP = Math.floor(character.stats.maxHP * hpRatio);
            character.currentHP = Math.min(newCurrentHP, character.stats.maxHP);
        }

        // MP比例調整
        if (oldMaxMP > 0 && character.stats.maxMP > oldMaxMP) {
            const mpRatio = character.currentMP / oldMaxMP;
            const newCurrentMP = Math.floor(character.stats.maxMP * mpRatio);
            character.currentMP = Math.min(newCurrentMP, character.stats.maxMP);
        }

        // 現在値が最大値を超えないよう制限
        character.currentHP = Math.min(character.currentHP, character.stats.maxHP);
        character.currentMP = Math.min(character.currentMP, character.stats.maxMP);

        // 現在値が0未満にならないよう制限
        character.currentHP = Math.max(0, character.currentHP);
        character.currentMP = Math.max(0, character.currentMP);

        // イベント発行
        this.eventEmitter?.emit('current-stats-adjusted', {
            characterId: character.id,
            oldMaxHP,
            oldMaxMP,
            newMaxHP: character.stats.maxHP,
            newMaxMP: character.stats.maxMP,
            currentHP: character.currentHP,
            currentMP: character.currentMP
        });
    }

    /**
     * キャラクターレベル更新
     * @param character 対象キャラクター
     * @returns 新しいレベル
     */
    public updateCharacterLevel(character: Unit): number {
        if (!character) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        if (!this.experienceManager.hasCharacter(character.id)) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        // 現在のレベルを1つ上げる
        const currentLevel = this.experienceManager.getCurrentLevel(character.id);
        const newLevel = currentLevel + 1;

        // レベルを直接設定（経験値は変更しない）
        this.experienceManager.setLevel(character.id, newLevel, false);

        // イベント発行
        this.eventEmitter?.emit('character-level-updated', {
            characterId: character.id,
            newLevel,
            currentExperience: this.experienceManager.getCurrentExperience(character.id)
        });

        return newLevel;
    }

    /**
     * 複数レベルアップ処理
     * @param character 対象キャラクター
     * @param jobClass 職業クラス（オプション）
     * @returns レベルアップ結果の配列
     */
    public processMultipleLevelUps(character: Unit, jobClass?: string): LevelUpResult[] {
        if (!character) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        const results: LevelUpResult[] = [];
        let levelUpCount = 0;
        const maxLevelUps = 10; // 無限ループ防止

        // レベルアップ可能な限り繰り返し処理
        while (this.experienceManager.canLevelUp(character.id) && levelUpCount < maxLevelUps) {
            const result = this.processLevelUp(character, jobClass);
            results.push(result);
            levelUpCount++;
        }

        if (results.length > 0) {
            // 複数レベルアップイベント発行
            this.eventEmitter?.emit('multiple-level-ups-processed', {
                characterId: character.id,
                results,
                totalLevelsGained: results.reduce((sum, result) => sum + result.levelsGained, 0)
            });
        }

        return results;
    }

    /**
     * レベルアップ可能性チェック
     * @param character 対象キャラクター
     * @returns レベルアップ可能かどうか
     */
    public canProcessLevelUp(character: Unit): boolean {
        if (!character) {
            return false;
        }

        if (!this.experienceManager.hasCharacter(character.id)) {
            return false;
        }

        return this.experienceManager.canLevelUp(character.id);
    }

    /**
     * レベルアップ予測
     * @param character 対象キャラクター
     * @param additionalExperience 追加経験値
     * @param jobClass 職業クラス（オプション）
     * @returns 予測されるレベルアップ結果
     */
    public predictLevelUp(
        character: Unit,
        additionalExperience: number,
        jobClass?: string
    ): LevelUpResult | null {
        if (!character || additionalExperience < 0) {
            return null;
        }

        if (!this.experienceManager.hasCharacter(character.id)) {
            return null;
        }

        // 現在の経験値に追加経験値を加算した場合のレベルを計算
        const currentExperience = this.experienceManager.getCurrentExperience(character.id);
        const predictedExperience = currentExperience + additionalExperience;

        // 一時的に経験値を設定してレベルアップをシミュレート
        const originalExperience = currentExperience;
        const originalLevel = this.experienceManager.getCurrentLevel(character.id);

        try {
            // 経験値を一時的に設定（レベル更新しない）
            this.experienceManager.setExperience(character.id, predictedExperience, false);

            if (this.experienceManager.canLevelUp(character.id)) {
                // レベルアップ処理をシミュレート（実際には適用しない）
                const growthRates = this.growthCalculator.getGrowthRates(
                    character.id,
                    originalLevel,
                    jobClass
                );

                const statGrowth = this.growthCalculator.calculateStatGrowth(
                    this.convertToExperienceStats(character.stats),
                    growthRates
                );

                // 予測経験値から新しいレベルを計算
                const newLevel = (this.experienceManager as any).experienceDataLoader.calculateLevelFromExperience(predictedExperience);
                const newStats = this.applyStatGrowth(
                    this.convertToExperienceStats(character.stats),
                    statGrowth
                );

                return {
                    characterId: character.id,
                    oldLevel: originalLevel,
                    newLevel,
                    statGrowth,
                    newExperienceRequired: this.experienceManager.getExperienceToNextLevel(character.id),
                    oldStats: this.convertToExperienceStats(character.stats),
                    newStats,
                    levelsGained: newLevel - originalLevel,
                    timestamp: Date.now()
                };
            }

            return null;
        } finally {
            // 元の経験値とレベルに戻す
            this.experienceManager.setExperience(character.id, originalExperience);
        }
    }

    /**
     * UnitStatsを経験値システム用のUnitStatsに変換
     * @param stats 基本UnitStats
     * @returns 経験値システム用UnitStats
     */
    private convertToExperienceStats(stats: import('../../types/gameplay').UnitStats): UnitStats {
        return {
            maxHP: stats.maxHP,
            maxMP: stats.maxMP,
            attack: stats.attack,
            defense: stats.defense,
            speed: stats.speed,
            movement: stats.movement,
            skill: 50, // デフォルト値（実際のキャラクターデータから取得すべき）
            luck: 50   // デフォルト値（実際のキャラクターデータから取得すべき）
        };
    }

    /**
     * 能力値成長を適用
     * @param baseStats 基本能力値
     * @param growth 成長値
     * @returns 成長後の能力値
     */
    private applyStatGrowth(baseStats: UnitStats, growth: StatGrowthResult): UnitStats {
        return {
            maxHP: baseStats.maxHP + growth.hp,
            maxMP: baseStats.maxMP + growth.mp,
            attack: baseStats.attack + growth.attack,
            defense: baseStats.defense + growth.defense,
            speed: baseStats.speed + growth.speed,
            movement: baseStats.movement, // 移動力は成長しない
            skill: baseStats.skill + growth.skill,
            luck: baseStats.luck + growth.luck
        };
    }

    /**
     * キャラクターの能力値を更新
     * @param character 対象キャラクター
     * @param newStats 新しい能力値
     */
    private updateCharacterStats(character: Unit, newStats: UnitStats): void {
        // 基本UnitStatsの部分のみ更新
        character.stats.maxHP = newStats.maxHP;
        character.stats.maxMP = newStats.maxMP;
        character.stats.attack = newStats.attack;
        character.stats.defense = newStats.defense;
        character.stats.speed = newStats.speed;
        // movement は成長しないのでそのまま
        // skill と luck は基本UnitStatsに含まれないため、
        // 将来的にキャラクターデータ構造を拡張する必要がある
    }

    /**
     * システムの初期化状態をチェック
     * @returns 初期化されているかどうか
     */
    public isInitialized(): boolean {
        return (
            this.growthCalculator.isDataLoaded() &&
            this.experienceManager.isDataLoaderReady()
        );
    }

    /**
     * デバッグ情報を取得
     * @returns デバッグ情報
     */
    public getDebugInfo(): any {
        return {
            initialized: this.isInitialized(),
            growthCalculatorReady: this.growthCalculator.isDataLoaded(),
            experienceManagerReady: this.experienceManager.isDataLoaderReady(),
            statLimits: this.growthCalculator.getStatLimits()
        };
    }

    /**
     * リソースの解放
     */
    public destroy(): void {
        this.eventEmitter?.emit('level-up-processor-destroyed');
    }
}