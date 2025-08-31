/**
 * JobExperienceIntegration - 職業システムと経験値システムの統合機能
 * 
 * このクラスは職業システムと経験値システム間の統合機能を提供します:
 * - レベルアップ時の職業成長率修正適用
 * - 職業による経験値獲得修正
 * - 職業変更時の経験値処理
 * - 成長計算への職業効果統合
 * 
 * 要件: 1.1, 1.4, 6.2, 6.4
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import {
    ExperienceAction,
    ExperienceContext,
    ExperienceCalculationResult,
    GrowthRates,
    StatGrowthResult,
    LevelUpResult,
    ExperienceSource
} from '../../types/experience';
import {
    StatModifiers,
    GrowthRateModifiers,
    JobChangeResult
} from '../../types/job';
import { Unit } from '../../types/gameplay';

/**
 * 職業経験値修正設定
 */
export interface JobExperienceModifiers {
    /** 経験値獲得倍率 */
    experienceMultiplier: number;
    /** アクション別経験値修正 */
    actionModifiers: {
        [action in ExperienceAction]?: number;
    };
    /** 経験値源別修正 */
    sourceModifiers: {
        [source in ExperienceSource]?: number;
    };
}

/**
 * 職業統合設定
 */
export interface JobIntegrationConfig {
    /** 職業成長率修正を適用するか */
    applyJobGrowthModifiers: boolean;
    /** 職業経験値修正を適用するか */
    applyJobExperienceModifiers: boolean;
    /** 職業変更時の経験値処理を行うか */
    processJobChangeExperience: boolean;
    /** デバッグモード */
    debugMode: boolean;
}

/**
 * 職業変更時の経験値処理結果
 */
export interface JobChangeExperienceResult {
    /** 処理が成功したか */
    success: boolean;
    /** 経験値調整量 */
    experienceAdjustment: number;
    /** レベル調整が発生したか */
    levelAdjusted: boolean;
    /** 調整前レベル */
    oldLevel: number;
    /** 調整後レベル */
    newLevel: number;
    /** エラーメッセージ */
    error?: string;
}

/**
 * JobExperienceIntegrationクラス
 * 職業システムと経験値システムの統合機能を提供
 */
export class JobExperienceIntegration {
    private config: JobIntegrationConfig;
    private jobSystem?: any; // JobSystemの参照
    private experienceSystem?: any; // ExperienceSystemの参照

    private static readonly DEFAULT_CONFIG: JobIntegrationConfig = {
        applyJobGrowthModifiers: true,
        applyJobExperienceModifiers: true,
        processJobChangeExperience: true,
        debugMode: false,
    };

    constructor(config?: Partial<JobIntegrationConfig>) {
        this.config = { ...JobExperienceIntegration.DEFAULT_CONFIG, ...config };
    }

    /**
     * 外部システムの参照を設定
     */
    public setJobSystem(jobSystem: any): void {
        this.jobSystem = jobSystem;
    }

    public setExperienceSystem(experienceSystem: any): void {
        this.experienceSystem = experienceSystem;
    }

    /**
     * レベルアップ時の職業成長率修正を適用
     * 要件: 1.1, 1.4
     * 
     * @param characterId キャラクターID
     * @param baseGrowthRates 基本成長率
     * @param currentLevel 現在のレベル
     * @returns 修正された成長率
     */
    public applyJobGrowthRateModifiers(
        characterId: string,
        baseGrowthRates: GrowthRates,
        currentLevel: number
    ): GrowthRates {
        if (!this.config.applyJobGrowthModifiers || !this.jobSystem) {
            return baseGrowthRates;
        }

        try {
            // キャラクターの現在の職業を取得
            const job = this.jobSystem.getCharacterJob(characterId);
            if (!job) {
                if (this.config.debugMode) {
                    console.warn(`キャラクター ${characterId} の職業が見つかりません`);
                }
                return baseGrowthRates;
            }

            // 職業の成長率修正を取得
            const jobGrowthModifiers = job.getGrowthRateModifiers();
            if (!jobGrowthModifiers) {
                return baseGrowthRates;
            }

            // 基本成長率に職業修正を適用
            const modifiedGrowthRates: GrowthRates = {
                hp: this.applyGrowthModifier(baseGrowthRates.hp, jobGrowthModifiers.hp),
                mp: this.applyGrowthModifier(baseGrowthRates.mp, jobGrowthModifiers.mp),
                attack: this.applyGrowthModifier(baseGrowthRates.attack, jobGrowthModifiers.attack),
                defense: this.applyGrowthModifier(baseGrowthRates.defense, jobGrowthModifiers.defense),
                speed: this.applyGrowthModifier(baseGrowthRates.speed, jobGrowthModifiers.speed),
                skill: this.applyGrowthModifier(baseGrowthRates.skill, jobGrowthModifiers.skill),
                luck: this.applyGrowthModifier(baseGrowthRates.luck, jobGrowthModifiers.luck),
            };

            if (this.config.debugMode) {
                console.log(`職業成長率修正適用 (${characterId}):`, {
                    job: job.name,
                    base: baseGrowthRates,
                    modifiers: jobGrowthModifiers,
                    result: modifiedGrowthRates,
                });
            }

            return modifiedGrowthRates;

        } catch (error) {
            console.error('職業成長率修正適用中にエラー:', error);
            return baseGrowthRates;
        }
    }

    /**
     * 職業による経験値獲得修正を適用
     * 要件: 1.1, 1.4
     * 
     * @param characterId キャラクターID
     * @param baseResult 基本経験値計算結果
     * @param action 経験値獲得アクション
     * @param context 経験値獲得コンテキスト
     * @returns 修正された経験値計算結果
     */
    public applyJobExperienceModifiers(
        characterId: string,
        baseResult: ExperienceCalculationResult,
        action: ExperienceAction,
        context: ExperienceContext
    ): ExperienceCalculationResult {
        if (!this.config.applyJobExperienceModifiers || !this.jobSystem) {
            return baseResult;
        }

        try {
            // キャラクターの現在の職業を取得
            const job = this.jobSystem.getCharacterJob(characterId);
            if (!job) {
                return baseResult;
            }

            // 職業の経験値修正を取得
            const jobExperienceModifiers = this.getJobExperienceModifiers(job);
            if (!jobExperienceModifiers) {
                return baseResult;
            }

            // 修正倍率を計算
            let totalModifier = jobExperienceModifiers.experienceMultiplier;

            // アクション別修正を適用
            const actionModifier = jobExperienceModifiers.actionModifiers[action];
            if (actionModifier !== undefined) {
                totalModifier *= actionModifier;
            }

            // 経験値源別修正を適用
            const sourceModifier = jobExperienceModifiers.sourceModifiers[context.source];
            if (sourceModifier !== undefined) {
                totalModifier *= sourceModifier;
            }

            // 修正された経験値計算結果を作成
            const modifiedResult: ExperienceCalculationResult = {
                ...baseResult,
                multipliedAmount: Math.floor(baseResult.multipliedAmount * totalModifier),
                finalAmount: Math.floor(baseResult.finalAmount * totalModifier),
            };

            if (this.config.debugMode) {
                console.log(`職業経験値修正適用 (${characterId}):`, {
                    job: job.name,
                    action,
                    source: context.source,
                    modifier: totalModifier,
                    before: baseResult.finalAmount,
                    after: modifiedResult.finalAmount,
                });
            }

            return modifiedResult;

        } catch (error) {
            console.error('職業経験値修正適用中にエラー:', error);
            return baseResult;
        }
    }

    /**
     * 職業変更時の経験値処理
     * 要件: 6.2, 6.4
     * 
     * @param characterId キャラクターID
     * @param oldJobId 変更前の職業ID
     * @param newJobId 変更後の職業ID
     * @param jobChangeResult 職業変更結果
     * @returns 経験値処理結果
     */
    public processJobChangeExperience(
        characterId: string,
        oldJobId: string,
        newJobId: string,
        jobChangeResult: JobChangeResult
    ): JobChangeExperienceResult {
        if (!this.config.processJobChangeExperience || !this.experienceSystem) {
            return {
                success: true,
                experienceAdjustment: 0,
                levelAdjusted: false,
                oldLevel: 0,
                newLevel: 0,
            };
        }

        try {
            // 現在の経験値情報を取得
            const experienceInfo = this.experienceSystem.getExperienceInfo(characterId);
            if (!experienceInfo) {
                return {
                    success: false,
                    experienceAdjustment: 0,
                    levelAdjusted: false,
                    oldLevel: 0,
                    newLevel: 0,
                    error: '経験値情報が見つかりません',
                };
            }

            const oldLevel = experienceInfo.currentLevel;

            // 職業変更による経験値調整を計算
            const experienceAdjustment = this.calculateJobChangeExperienceAdjustment(
                characterId,
                oldJobId,
                newJobId,
                experienceInfo
            );

            // 経験値調整を適用
            if (experienceAdjustment !== 0) {
                // 経験値を調整（負の値の場合は減少）
                if (experienceAdjustment > 0) {
                    this.experienceSystem.awardExperience(characterId, ExperienceAction.SUPPORT, {
                        source: ExperienceSource.SKILL_USE,
                        action: ExperienceAction.SUPPORT,
                        amount: experienceAdjustment,
                        metadata: {
                            reason: 'job_change_bonus',
                            oldJob: oldJobId,
                            newJob: newJobId,
                        },
                        timestamp: Date.now(),
                    });
                } else {
                    // 経験値減少処理（実装は慎重に行う）
                    console.warn('職業変更による経験値減少は現在未実装です');
                }
            }

            // レベル調整が必要かチェック
            const newExperienceInfo = this.experienceSystem.getExperienceInfo(characterId);
            const levelAdjusted = newExperienceInfo.currentLevel !== oldLevel;

            if (this.config.debugMode) {
                console.log(`職業変更経験値処理 (${characterId}):`, {
                    oldJob: oldJobId,
                    newJob: newJobId,
                    experienceAdjustment,
                    levelAdjusted,
                    oldLevel,
                    newLevel: newExperienceInfo.currentLevel,
                });
            }

            return {
                success: true,
                experienceAdjustment,
                levelAdjusted,
                oldLevel,
                newLevel: newExperienceInfo.currentLevel,
            };

        } catch (error) {
            console.error('職業変更経験値処理中にエラー:', error);
            return {
                success: false,
                experienceAdjustment: 0,
                levelAdjusted: false,
                oldLevel: 0,
                newLevel: 0,
                error: error instanceof Error ? error.message : '不明なエラー',
            };
        }
    }

    /**
     * 成長計算への職業効果統合
     * 要件: 1.1, 1.4
     * 
     * @param characterId キャラクターID
     * @param baseStatGrowth 基本能力値成長
     * @param currentLevel 現在のレベル
     * @returns 職業効果を統合した能力値成長
     */
    public integrateJobEffectsIntoGrowth(
        characterId: string,
        baseStatGrowth: StatGrowthResult,
        currentLevel: number
    ): StatGrowthResult {
        if (!this.jobSystem) {
            return baseStatGrowth;
        }

        try {
            // キャラクターの現在の職業を取得
            const job = this.jobSystem.getCharacterJob(characterId);
            if (!job) {
                return baseStatGrowth;
            }

            // 職業の能力値修正を取得（レベルアップ時のボーナス）
            const jobStatModifiers = job.getStatModifiers();
            if (!jobStatModifiers) {
                return baseStatGrowth;
            }

            // レベルアップ時の職業ボーナスを計算（ランクに応じた追加成長）
            const jobBonus = this.calculateJobLevelUpBonus(job, currentLevel);

            // 基本成長に職業ボーナスを追加
            const enhancedGrowth: StatGrowthResult = {
                hp: baseStatGrowth.hp + jobBonus.hp,
                mp: baseStatGrowth.mp + jobBonus.mp,
                attack: baseStatGrowth.attack + jobBonus.attack,
                defense: baseStatGrowth.defense + jobBonus.defense,
                speed: baseStatGrowth.speed + jobBonus.speed,
                skill: baseStatGrowth.skill + jobBonus.skill,
                luck: baseStatGrowth.luck + jobBonus.luck,
            };

            if (this.config.debugMode) {
                console.log(`職業効果統合 (${characterId}):`, {
                    job: job.name,
                    level: currentLevel,
                    baseGrowth: baseStatGrowth,
                    jobBonus,
                    result: enhancedGrowth,
                });
            }

            return enhancedGrowth;

        } catch (error) {
            console.error('職業効果統合中にエラー:', error);
            return baseStatGrowth;
        }
    }

    /**
     * 設定を更新
     */
    public updateConfig(newConfig: Partial<JobIntegrationConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 現在の設定を取得
     */
    public getConfig(): JobIntegrationConfig {
        return { ...this.config };
    }

    /**
     * 職業システムの参照を取得
     */
    public getJobSystem(): any {
        return this.jobSystem;
    }

    // =============================================================================
    // プライベートメソッド
    // =============================================================================

    /**
     * 成長率修正を適用
     */
    private applyGrowthModifier(baseRate: number, modifier: number): number {
        // 修正値を加算（パーセンテージポイント）
        const modifiedRate = baseRate + modifier;

        // 0-100%の範囲に制限
        return Math.max(0, Math.min(100, modifiedRate));
    }

    /**
     * 職業の経験値修正を取得
     */
    private getJobExperienceModifiers(job: any): JobExperienceModifiers | null {
        try {
            // 職業から経験値修正設定を取得
            // これは職業クラスに実装される予定のメソッド
            if (typeof job.getExperienceModifiers === 'function') {
                return job.getExperienceModifiers();
            }

            // フォールバック: 職業カテゴリーに基づくデフォルト修正
            return this.getDefaultJobExperienceModifiers(job.category);

        } catch (error) {
            console.error('職業経験値修正取得中にエラー:', error);
            return null;
        }
    }

    /**
     * 職業カテゴリーに基づくデフォルト経験値修正を取得
     */
    private getDefaultJobExperienceModifiers(jobCategory: string): JobExperienceModifiers {
        const defaultModifiers: Record<string, JobExperienceModifiers> = {
            warrior: {
                experienceMultiplier: 1.0,
                actionModifiers: {
                    [ExperienceAction.ATTACK]: 1.1,
                    [ExperienceAction.DEFEAT]: 1.1,
                },
                sourceModifiers: {
                    [ExperienceSource.ATTACK_HIT]: 1.1,
                    [ExperienceSource.ENEMY_DEFEAT]: 1.1,
                },
            },
            mage: {
                experienceMultiplier: 1.0,
                actionModifiers: {
                    [ExperienceAction.SKILL_CAST]: 1.2,
                    [ExperienceAction.SUPPORT]: 1.1,
                },
                sourceModifiers: {
                    [ExperienceSource.SKILL_USE]: 1.2,
                    [ExperienceSource.ALLY_SUPPORT]: 1.1,
                },
            },
            healer: {
                experienceMultiplier: 1.0,
                actionModifiers: {
                    [ExperienceAction.HEAL]: 1.3,
                    [ExperienceAction.SUPPORT]: 1.2,
                },
                sourceModifiers: {
                    [ExperienceSource.HEALING]: 1.3,
                    [ExperienceSource.ALLY_SUPPORT]: 1.2,
                },
            },
            archer: {
                experienceMultiplier: 1.0,
                actionModifiers: {
                    [ExperienceAction.ATTACK]: 1.05,
                },
                sourceModifiers: {
                    [ExperienceSource.CRITICAL_HIT]: 1.2,
                },
            },
            thief: {
                experienceMultiplier: 1.1,
                actionModifiers: {},
                sourceModifiers: {
                    [ExperienceSource.TURN_SURVIVAL]: 1.1,
                },
            },
        };

        return defaultModifiers[jobCategory] || {
            experienceMultiplier: 1.0,
            actionModifiers: {},
            sourceModifiers: {},
        };
    }

    /**
     * 職業変更による経験値調整を計算
     */
    private calculateJobChangeExperienceAdjustment(
        characterId: string,
        oldJobId: string,
        newJobId: string,
        experienceInfo: any
    ): number {
        // 現在は職業変更による経験値調整は行わない
        // 将来的に職業間のバランス調整が必要になった場合に実装
        return 0;
    }

    /**
     * 職業のレベルアップボーナスを計算
     */
    private calculateJobLevelUpBonus(job: any, currentLevel: number): StatGrowthResult {
        try {
            // 職業ランクに基づくレベルアップボーナスを計算
            const jobRank = job.rank || 1;
            const bonusMultiplier = Math.max(0, (jobRank - 1) * 0.1); // ランク2以上で10%ずつボーナス

            // 特定レベルでの追加ボーナス（5の倍数レベル）
            const levelBonus = (currentLevel % 5 === 0) ? 1 : 0;

            return {
                hp: Math.floor(bonusMultiplier * 2) + levelBonus,
                mp: Math.floor(bonusMultiplier * 1) + levelBonus,
                attack: Math.floor(bonusMultiplier * 1) + levelBonus,
                defense: Math.floor(bonusMultiplier * 1) + levelBonus,
                speed: Math.floor(bonusMultiplier * 0.5),
                skill: Math.floor(bonusMultiplier * 1) + levelBonus,
                luck: Math.floor(bonusMultiplier * 0.5),
            };

        } catch (error) {
            console.error('職業レベルアップボーナス計算中にエラー:', error);
            return {
                hp: 0,
                mp: 0,
                attack: 0,
                defense: 0,
                speed: 0,
                skill: 0,
                luck: 0,
            };
        }
    }
}