/**
 * スキル実行システム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillExecutor: スキル実行のメインフローを管理するクラス
 * - MP消費とクールダウン設定の前処理
 * - スキル効果の適用処理
 * - 戦闘システムへの結果反映機能
 * - スキル実行後の状態更新処理
 */

import * as Phaser from 'phaser';
import {
    SkillData,
    SkillResult,
    SkillExecutionContext,
    SkillEffectResult,
    SkillUsabilityError,
    Position,
    CharacterSkillData,
    ActiveSkillEffect,
    BuffType,
    StatusEffectType,
    DamageType,
    HealType,
    SkillType
} from '../../types/skill';

import { Skill } from './Skill';
import { SkillManager } from './SkillManager';
import { SkillConditionChecker } from './SkillConditionChecker';
import { ExperienceSystem } from '../experience/ExperienceSystem';
import { ExperienceAction, ExperienceSource, ExperienceContext } from '../../types/experience';

/**
 * スキル実行エラー種別
 */
export enum SkillExecutionError {
    /** スキルが見つからない */
    SKILL_NOT_FOUND = 'skill_not_found',
    /** 使用者が見つからない */
    CASTER_NOT_FOUND = 'caster_not_found',
    /** 使用条件を満たしていない */
    USAGE_CONDITIONS_NOT_MET = 'usage_conditions_not_met',
    /** 有効な対象がいない */
    NO_VALID_TARGETS = 'no_valid_targets',
    /** アニメーション実行エラー */
    ANIMATION_ERROR = 'animation_error',
    /** 効果適用エラー */
    EFFECT_APPLICATION_ERROR = 'effect_application_error',
    /** 戦闘システム統合エラー */
    BATTLE_SYSTEM_INTEGRATION_ERROR = 'battle_system_integration_error',
    /** 状態更新エラー */
    STATE_UPDATE_ERROR = 'state_update_error',
    /** 予期しないエラー */
    UNEXPECTED_ERROR = 'unexpected_error'
}

/**
 * スキル実行設定
 */
export interface SkillExecutionConfig {
    /** アニメーションを有効にするか */
    enableAnimations: boolean;
    /** 音響効果を有効にするか */
    enableSoundEffects: boolean;
    /** スキル実行速度倍率 */
    executionSpeed: number;
    /** アニメーションタイムアウト（ミリ秒） */
    animationTimeout: number;
    /** デバッグログを有効にするか */
    enableDebugLogging: boolean;
    /** エラー時の自動復旧を有効にするか */
    enableAutoRecovery: boolean;
}

/**
 * スキル実行状態
 */
export interface SkillExecutionState {
    /** 現在実行中のスキル */
    currentSkill: Skill | null;
    /** 現在の使用者 */
    currentCaster: string | null;
    /** 現在の対象位置 */
    currentTargetPosition: Position | null;
    /** 実行フェーズ */
    phase: 'idle' | 'validation' | 'preprocessing' | 'animation' | 'effect_application' | 'postprocessing' | 'cleanup';
    /** アニメーション実行中フラグ */
    isAnimating: boolean;
    /** 実行開始時刻 */
    executionStartTime: number;
    /** 最後の実行結果 */
    lastResult: SkillResult | null;
}

/**
 * 戦場状態インターフェース（仮定義）
 */
interface BattlefieldState {
    getCharacter?(characterId: string): any;
    getCharacterAt?(position: Position): any;
    getCurrentPlayer?(): string;
    getCurrentTurn?(): number;
    updateCharacterState?(characterId: string, updates: any): void;
    applyDamage?(targetId: string, damage: number): boolean;
    applyHealing?(targetId: string, healing: number): boolean;
    applyStatusEffect?(targetId: string, effect: ActiveSkillEffect): boolean;
    removeStatusEffect?(targetId: string, effectId: string): boolean;
}

/**
 * スキルアニメーターインターフェース（仮定義）
 */
interface SkillAnimator {
    playCastAnimation(skill: Skill, caster: any): Promise<void>;
    playSkillAnimation(skill: Skill, caster: any, targets: any[]): Promise<void>;
    playHitEffect(skill: Skill, target: any): Promise<void>;
    showContinuousEffect(effect: ActiveSkillEffect, target: any): void;
    clearEffects(): void;
}

/**
 * スキル実行システム
 * スキルの実行フローを管理し、各段階の処理を調整する
 */
export class SkillExecutor extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: SkillExecutionConfig;
    private state: SkillExecutionState;
    private skillManager: SkillManager;
    private conditionChecker: SkillConditionChecker;
    private animator: SkillAnimator | null = null;
    private experienceSystem: ExperienceSystem | null = null;

    /** 実行履歴 */
    private executionHistory: SkillResult[] = [];

    /** パフォーマンス監視 */
    private performanceMetrics: Map<string, number> = new Map();

    /** デフォルト設定 */
    private static readonly DEFAULT_CONFIG: SkillExecutionConfig = {
        enableAnimations: true,
        enableSoundEffects: true,
        executionSpeed: 1.0,
        animationTimeout: 5000,
        enableDebugLogging: true,
        enableAutoRecovery: true
    };

    /**
     * SkillExecutorを作成する
     * @param scene Phaserシーン
     * @param skillManager スキル管理システム
     * @param conditionChecker 条件チェッカー
     * @param config 実行設定
     */
    constructor(
        scene: Phaser.Scene,
        skillManager: SkillManager,
        conditionChecker: SkillConditionChecker,
        config?: Partial<SkillExecutionConfig>
    ) {
        super();

        this.scene = scene;
        this.skillManager = skillManager;
        this.conditionChecker = conditionChecker;
        this.config = { ...SkillExecutor.DEFAULT_CONFIG, ...config };

        // 状態を初期化
        this.state = {
            currentSkill: null,
            currentCaster: null,
            currentTargetPosition: null,
            phase: 'idle',
            isAnimating: false,
            executionStartTime: 0,
            lastResult: null
        };

        this.setupEventListeners();
    }

    /**
     * スキルアニメーターを設定する
     * @param animator スキルアニメーター
     */
    setAnimator(animator: SkillAnimator): void {
        this.animator = animator;
        this.log('Skill animator set');
    }

    /**
     * 経験値システムを設定する
     * @param experienceSystem 経験値システム
     */
    setExperienceSystem(experienceSystem: ExperienceSystem): void {
        this.experienceSystem = experienceSystem;
        this.log('Experience system set');
    }

    /**
     * スキルを実行する（メインフロー）
     * @param context スキル実行コンテキスト
     * @returns 実行結果
     */
    async executeSkill(context: SkillExecutionContext): Promise<SkillResult> {
        const executionId = `${context.skillId}_${context.caster}_${Date.now()}`;
        this.state.executionStartTime = performance.now();

        try {
            this.log('Starting skill execution', {
                skillId: context.skillId,
                caster: context.caster,
                targetPosition: context.targetPosition,
                executionId
            });

            // フェーズ1: バリデーション
            this.state.phase = 'validation';
            const validationResult = await this.validateExecution(context);
            if (!validationResult.success) {
                return validationResult;
            }

            const skill = this.skillManager.getSkill(context.skillId)!;
            this.state.currentSkill = skill;
            this.state.currentCaster = context.caster;
            this.state.currentTargetPosition = context.targetPosition;

            // フェーズ2: 前処理（MP消費、クールダウン設定）
            this.state.phase = 'preprocessing';
            const preprocessResult = await this.performPreprocessing(skill, context);
            if (!preprocessResult.success) {
                return preprocessResult;
            }

            // フェーズ3: アニメーション実行
            this.state.phase = 'animation';
            await this.playSkillAnimation(skill, context);

            // フェーズ4: スキル効果適用
            this.state.phase = 'effect_application';
            const effectResult = await this.applySkillEffects(skill, context);
            if (!effectResult.success) {
                return effectResult;
            }

            // フェーズ4.5: 経験値付与処理
            await this.processSkillExperience(skill, context, effectResult);

            // フェーズ5: 後処理（状態更新、戦闘システム反映）
            this.state.phase = 'postprocessing';
            const postprocessResult = await this.performPostprocessing(skill, context, effectResult);

            // フェーズ6: クリーンアップ
            this.state.phase = 'cleanup';
            await this.performCleanup(skill, context);

            // 実行完了
            const finalResult = {
                ...effectResult,
                ...postprocessResult,
                additionalInfo: {
                    executionTime: performance.now() - this.state.executionStartTime,
                    executionId,
                    ...effectResult.additionalInfo,
                    ...postprocessResult.additionalInfo
                }
            };

            this.state.lastResult = finalResult;
            this.state.phase = 'idle';
            this.executionHistory.push(finalResult);

            // 統計情報を更新
            this.skillManager.updateSkillStatistics(
                context.skillId,
                finalResult.success,
                this.calculateTotalDamage(finalResult.effects),
                this.hasCriticalHit(finalResult.effects)
            );

            this.emit('skill-executed', {
                context,
                result: finalResult,
                executionTime: finalResult.additionalInfo?.executionTime
            });

            this.log('Skill execution completed', {
                skillId: context.skillId,
                success: finalResult.success,
                executionTime: finalResult.additionalInfo?.executionTime,
                executionId
            });

            return finalResult;

        } catch (error) {
            const errorResult = this.handleExecutionError(error as Error, context, executionId);
            this.state.phase = 'idle';
            this.state.lastResult = errorResult;
            return errorResult;
        }
    }

    /**
     * 実行前のバリデーション
     * @param context 実行コンテキスト
     * @returns バリデーション結果
     */
    private async validateExecution(context: SkillExecutionContext): Promise<SkillResult> {
        // スキルの存在チェック
        const skill = this.skillManager.getSkill(context.skillId);
        if (!skill) {
            return {
                success: false,
                error: SkillUsabilityError.SKILL_NOT_FOUND,
                errorMessage: `スキル「${context.skillId}」が見つかりません`,
                targets: [],
                effects: [],
                mpCost: 0
            };
        }

        // 使用者の存在チェック
        const caster = context.battlefieldState?.getCharacter?.(context.caster);
        if (!caster) {
            return {
                success: false,
                error: SkillUsabilityError.SKILL_NOT_FOUND,
                errorMessage: `使用者「${context.caster}」が見つかりません`,
                targets: [],
                effects: [],
                mpCost: 0
            };
        }

        // 使用条件チェック
        let characterSkillData = this.conditionChecker.getCharacterSkillData(context.caster);
        if (!characterSkillData) {
            // キャラクタースキルデータが存在しない場合は作成
            characterSkillData = {
                characterId: context.caster,
                learnedSkills: [context.skillId], // 実行しようとしているスキルは習得済みとする
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            };
            this.conditionChecker.setCharacterSkillData(context.caster, characterSkillData);
        }

        const usabilityResult = this.conditionChecker.canUseSkill(
            skill,
            context.caster,
            context.targetPosition,
            context.battlefieldState,
            characterSkillData
        );

        if (!usabilityResult.canUse) {
            return {
                success: false,
                error: usabilityResult.error || SkillUsabilityError.SKILL_NOT_FOUND,
                errorMessage: usabilityResult.message || '使用条件を満たしていません',
                targets: [],
                effects: [],
                mpCost: skill.usageCondition.mpCost,
                additionalInfo: {
                    conditionDetails: usabilityResult.conditionDetails
                }
            };
        }

        return {
            success: true,
            targets: [],
            effects: [],
            mpCost: skill.usageCondition.mpCost
        };
    }

    /**
     * 前処理（MP消費、クールダウン設定）
     * @param skill スキル
     * @param context 実行コンテキスト
     * @returns 前処理結果
     */
    private async performPreprocessing(skill: Skill, context: SkillExecutionContext): Promise<SkillResult> {
        try {
            const caster = context.battlefieldState?.getCharacter?.(context.caster);
            if (!caster) {
                throw new Error('使用者が見つかりません');
            }

            // MP消費
            if (skill.usageCondition.mpCost > 0) {
                caster.currentMP = Math.max(0, caster.currentMP - skill.usageCondition.mpCost);

                // 戦場状態を更新
                context.battlefieldState?.updateCharacterState?.(context.caster, {
                    currentMP: caster.currentMP
                });

                this.log('MP consumed', {
                    caster: context.caster,
                    mpCost: skill.usageCondition.mpCost,
                    remainingMP: caster.currentMP
                });
            }

            // クールダウン設定
            if (skill.usageCondition.cooldown > 0) {
                const currentTurn = context.currentTurn || context.battlefieldState?.getCurrentTurn?.() || 0;
                this.conditionChecker.setSkillCooldown(skill.id, context.caster, currentTurn);

                this.log('Cooldown set', {
                    skillId: skill.id,
                    caster: context.caster,
                    cooldownTurns: skill.usageCondition.cooldown,
                    currentTurn
                });
            }

            // 使用回数カウント増加
            if (skill.usageCondition.usageLimit > 0) {
                this.conditionChecker.incrementSkillUsage(skill.id, context.caster);

                this.log('Usage count incremented', {
                    skillId: skill.id,
                    caster: context.caster
                });
            }

            return {
                success: true,
                targets: [],
                effects: [],
                mpCost: skill.usageCondition.mpCost
            };

        } catch (error) {
            return {
                success: false,
                error: SkillExecutionError.STATE_UPDATE_ERROR as any,
                errorMessage: `前処理エラー: ${error}`,
                targets: [],
                effects: [],
                mpCost: skill.usageCondition.mpCost
            };
        }
    }

    /**
     * スキルアニメーション実行
     * @param skill スキル
     * @param context 実行コンテキスト
     */
    private async playSkillAnimation(skill: Skill, context: SkillExecutionContext): Promise<void> {
        if (!this.config.enableAnimations || !this.animator) {
            return;
        }

        try {
            this.state.isAnimating = true;
            const caster = context.battlefieldState?.getCharacter?.(context.caster);

            // 詠唱アニメーション
            if (skill.animation.castAnimation) {
                await this.animator.playCastAnimation(skill, caster);
            }

            // 対象を取得
            const affectedPositions = skill.getAffectedPositions(context.targetPosition);
            const targets: any[] = [];

            for (const position of affectedPositions) {
                const character = context.battlefieldState?.getCharacterAt?.(position);
                if (character) {
                    targets.push(character);
                }
            }

            // スキル発動アニメーション
            if (skill.animation.effectAnimation) {
                await this.animator.playSkillAnimation(skill, caster, targets);
            }

            this.state.isAnimating = false;

            this.log('Skill animation completed', {
                skillId: skill.id,
                caster: context.caster,
                targetCount: targets.length
            });

        } catch (error) {
            this.state.isAnimating = false;
            this.log('Animation error (continuing execution)', {
                error: error.message,
                skillId: skill.id
            });
            // アニメーションエラーは実行を停止しない
        }
    }

    /**
     * スキル効果適用
     * @param skill スキル
     * @param context 実行コンテキスト
     * @returns 効果適用結果
     */
    private async applySkillEffects(skill: Skill, context: SkillExecutionContext): Promise<SkillResult> {
        try {
            // スキル固有の実行処理を呼び出し
            const skillResult = await skill.execute(context);

            // 追加の効果処理（継続効果など）
            if (skillResult.success && skillResult.effects) {
                await this.processContinuousEffects(skill, context, skillResult.effects);
            }

            this.log('Skill effects applied', {
                skillId: skill.id,
                success: skillResult.success,
                effectCount: skillResult.effects?.length || 0
            });

            return skillResult;

        } catch (error) {
            return {
                success: false,
                error: SkillExecutionError.EFFECT_APPLICATION_ERROR as any,
                errorMessage: `効果適用エラー: ${error}`,
                targets: [],
                effects: [],
                mpCost: skill.usageCondition.mpCost
            };
        }
    }

    /**
     * 継続効果の処理
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param effects 効果結果
     */
    private async processContinuousEffects(
        skill: Skill,
        context: SkillExecutionContext,
        effects: SkillEffectResult[]
    ): Promise<void> {
        for (const effect of effects) {
            if (effect.success && this.isContinuousEffect(effect.effectType)) {
                const target = context.battlefieldState?.getCharacter?.(effect.targetId);
                if (target && this.animator) {
                    // 継続効果の視覚表現を作成
                    const activeEffect: ActiveSkillEffect = {
                        effectId: `${skill.id}_${effect.targetId}_${Date.now()}`,
                        effectType: this.getEffectType(effect.effectType),
                        value: effect.actualValue,
                        remainingDuration: this.getEffectDuration(skill, effect.effectType),
                        sourceSkillId: skill.id,
                        casterId: context.caster,
                        appliedAt: new Date()
                    };

                    this.animator.showContinuousEffect(activeEffect, target);

                    // 戦場状態に継続効果を追加
                    context.battlefieldState?.applyStatusEffect?.(effect.targetId, activeEffect);
                }
            }
        }
    }

    /**
     * スキル使用時の経験値処理
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     */
    private async processSkillExperience(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult
    ): Promise<void> {
        if (!this.experienceSystem || !result.success) {
            return;
        }

        try {
            // スキル種別に基づいて経験値アクションを決定
            const experienceAction = this.getExperienceActionForSkill(skill);

            // 基本経験値コンテキストを作成
            const experienceContext: ExperienceContext = {
                source: this.getExperienceSourceForSkill(skill),
                action: experienceAction,
                timestamp: Date.now(),
                battleContext: {
                    battleId: context.battlefieldState?.battleId || 'unknown',
                    turnNumber: context.currentTurn,
                    attackerId: context.caster,
                    skillId: skill.id
                },
                metadata: {
                    skillType: skill.skillType,
                    targetCount: result.targets.length,
                    effectCount: result.effects.length
                }
            };

            // スキル種別に応じた経験値処理
            await this.processSkillTypeExperience(skill, context, result, experienceContext);

            this.log('Skill experience processed', {
                skillId: skill.id,
                caster: context.caster,
                action: experienceAction,
                targetCount: result.targets.length
            });

        } catch (error) {
            this.log('Failed to process skill experience', {
                error: error.message,
                skillId: skill.id,
                caster: context.caster
            });
        }
    }

    /**
     * スキル種別に応じた経験値処理
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     * @param experienceContext 経験値コンテキスト
     */
    private async processSkillTypeExperience(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult,
        experienceContext: ExperienceContext
    ): Promise<void> {
        // スキル効果による経験値ボーナスを計算
        const skillBonus = this.calculateSkillExperienceBonus(skill, context, result);

        // 経験値コンテキストにボーナスを追加
        const enhancedContext: ExperienceContext = {
            ...experienceContext,
            bonusAmount: (experienceContext.bonusAmount || 0) + skillBonus.totalBonus,
            multiplier: (experienceContext.multiplier || 1.0) * skillBonus.multiplier,
            metadata: {
                ...experienceContext.metadata,
                skillBonus: skillBonus
            }
        };

        switch (skill.skillType) {
            case SkillType.HEAL:
                await this.processHealingExperience(skill, context, result, enhancedContext);
                break;

            case SkillType.BUFF:
                await this.processBuffExperience(skill, context, result, enhancedContext);
                break;

            case SkillType.DEBUFF:
                await this.processDebuffExperience(skill, context, result, enhancedContext);
                break;

            case SkillType.ATTACK:
                await this.processAttackSkillExperience(skill, context, result, enhancedContext);
                break;

            case SkillType.STATUS:
                await this.processStatusSkillExperience(skill, context, result, enhancedContext);
                break;

            case SkillType.SPECIAL:
                await this.processSpecialSkillExperience(skill, context, result, enhancedContext);
                break;

            default:
                // 基本的なスキル使用経験値を付与
                this.experienceSystem!.awardExperience(
                    context.caster,
                    ExperienceAction.SKILL_CAST,
                    enhancedContext
                );
                break;
        }
    }

    /**
     * 回復スキル使用時の経験値処理
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     * @param experienceContext 経験値コンテキスト
     */
    private async processHealingExperience(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult,
        experienceContext: ExperienceContext
    ): Promise<void> {
        // 回復量に基づいて経験値ボーナスを計算
        let totalHealing = 0;
        let successfulHeals = 0;

        for (const effect of result.effects) {
            if (effect.success && effect.effectType === 'heal') {
                totalHealing += effect.actualValue;
                successfulHeals++;
            }
        }

        if (successfulHeals > 0) {
            // 回復経験値を付与
            const healingContext: ExperienceContext = {
                ...experienceContext,
                source: ExperienceSource.HEALING,
                action: ExperienceAction.HEAL,
                bonusAmount: Math.floor(totalHealing / 10), // 回復量の10%をボーナス経験値として付与
                metadata: {
                    ...experienceContext.metadata,
                    totalHealing,
                    successfulHeals,
                    averageHealing: totalHealing / successfulHeals
                }
            };

            this.experienceSystem!.awardExperience(
                context.caster,
                ExperienceAction.HEAL,
                healingContext
            );

            this.log('Healing experience awarded', {
                caster: context.caster,
                totalHealing,
                successfulHeals,
                bonusAmount: healingContext.bonusAmount
            });
        }
    }

    /**
     * バフスキル使用時の経験値処理
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     * @param experienceContext 経験値コンテキスト
     */
    private async processBuffExperience(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult,
        experienceContext: ExperienceContext
    ): Promise<void> {
        let successfulBuffs = 0;
        let buffTargets: string[] = [];

        for (const effect of result.effects) {
            if (effect.success && effect.effectType === 'buff') {
                successfulBuffs++;
                if (!buffTargets.includes(effect.targetId)) {
                    buffTargets.push(effect.targetId);
                }
            }
        }

        if (successfulBuffs > 0) {
            // バフ経験値を付与
            const buffContext: ExperienceContext = {
                ...experienceContext,
                source: ExperienceSource.ALLY_SUPPORT,
                action: ExperienceAction.BUFF_APPLY,
                bonusAmount: successfulBuffs * 2, // バフ1つにつき2ポイントのボーナス
                metadata: {
                    ...experienceContext.metadata,
                    successfulBuffs,
                    buffTargets: buffTargets.length,
                    isGroupBuff: buffTargets.length > 1
                }
            };

            this.experienceSystem!.awardExperience(
                context.caster,
                ExperienceAction.BUFF_APPLY,
                buffContext
            );

            this.log('Buff experience awarded', {
                caster: context.caster,
                successfulBuffs,
                buffTargets: buffTargets.length,
                bonusAmount: buffContext.bonusAmount
            });
        }
    }

    /**
     * デバフスキル使用時の経験値処理
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     * @param experienceContext 経験値コンテキスト
     */
    private async processDebuffExperience(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult,
        experienceContext: ExperienceContext
    ): Promise<void> {
        let successfulDebuffs = 0;
        let debuffTargets: string[] = [];

        for (const effect of result.effects) {
            if (effect.success && effect.effectType === 'debuff') {
                successfulDebuffs++;
                if (!debuffTargets.includes(effect.targetId)) {
                    debuffTargets.push(effect.targetId);
                }
            }
        }

        if (successfulDebuffs > 0) {
            // デバフ経験値を付与
            const debuffContext: ExperienceContext = {
                ...experienceContext,
                source: ExperienceSource.ALLY_SUPPORT,
                action: ExperienceAction.DEBUFF_APPLY,
                bonusAmount: successfulDebuffs * 3, // デバフ1つにつき3ポイントのボーナス（バフより高め）
                metadata: {
                    ...experienceContext.metadata,
                    successfulDebuffs,
                    debuffTargets: debuffTargets.length,
                    isGroupDebuff: debuffTargets.length > 1
                }
            };

            this.experienceSystem!.awardExperience(
                context.caster,
                ExperienceAction.DEBUFF_APPLY,
                debuffContext
            );

            this.log('Debuff experience awarded', {
                caster: context.caster,
                successfulDebuffs,
                debuffTargets: debuffTargets.length,
                bonusAmount: debuffContext.bonusAmount
            });
        }
    }

    /**
     * 攻撃スキル使用時の経験値処理
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     * @param experienceContext 経験値コンテキスト
     */
    private async processAttackSkillExperience(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult,
        experienceContext: ExperienceContext
    ): Promise<void> {
        let totalDamage = 0;
        let successfulHits = 0;
        let criticalHits = 0;

        for (const effect of result.effects) {
            if (effect.success && effect.effectType === 'damage') {
                totalDamage += effect.actualValue;
                successfulHits++;
                if (effect.isCritical) {
                    criticalHits++;
                }
            }
        }

        if (successfulHits > 0) {
            // 攻撃スキル経験値を付与
            let bonusAmount = Math.floor(totalDamage / 20); // ダメージの5%をボーナス経験値として付与
            bonusAmount += criticalHits * 5; // クリティカルヒット1回につき5ポイント追加

            const attackContext: ExperienceContext = {
                ...experienceContext,
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                bonusAmount,
                metadata: {
                    ...experienceContext.metadata,
                    totalDamage,
                    successfulHits,
                    criticalHits,
                    averageDamage: totalDamage / successfulHits
                }
            };

            this.experienceSystem!.awardExperience(
                context.caster,
                ExperienceAction.ATTACK,
                attackContext
            );

            this.log('Attack skill experience awarded', {
                caster: context.caster,
                totalDamage,
                successfulHits,
                criticalHits,
                bonusAmount
            });
        }
    }

    /**
     * 状態異常スキル使用時の経験値処理
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     * @param experienceContext 経験値コンテキスト
     */
    private async processStatusSkillExperience(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult,
        experienceContext: ExperienceContext
    ): Promise<void> {
        let successfulStatusEffects = 0;
        let statusTargets: string[] = [];

        for (const effect of result.effects) {
            if (effect.success && effect.effectType === 'status') {
                successfulStatusEffects++;
                if (!statusTargets.includes(effect.targetId)) {
                    statusTargets.push(effect.targetId);
                }
            }
        }

        if (successfulStatusEffects > 0) {
            // 状態異常経験値を付与
            const statusContext: ExperienceContext = {
                ...experienceContext,
                source: ExperienceSource.ALLY_SUPPORT,
                action: ExperienceAction.SUPPORT,
                bonusAmount: successfulStatusEffects * 4, // 状態異常1つにつき4ポイントのボーナス
                metadata: {
                    ...experienceContext.metadata,
                    successfulStatusEffects,
                    statusTargets: statusTargets.length
                }
            };

            this.experienceSystem!.awardExperience(
                context.caster,
                ExperienceAction.SUPPORT,
                statusContext
            );

            this.log('Status skill experience awarded', {
                caster: context.caster,
                successfulStatusEffects,
                statusTargets: statusTargets.length,
                bonusAmount: statusContext.bonusAmount
            });
        }
    }

    /**
     * 特殊スキル使用時の経験値処理
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     * @param experienceContext 経験値コンテキスト
     */
    private async processSpecialSkillExperience(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult,
        experienceContext: ExperienceContext
    ): Promise<void> {
        // 特殊スキルは基本経験値 + 固定ボーナス
        const specialContext: ExperienceContext = {
            ...experienceContext,
            source: ExperienceSource.SKILL_USE,
            action: ExperienceAction.SKILL_CAST,
            bonusAmount: 10, // 特殊スキルは固定で10ポイントのボーナス
            metadata: {
                ...experienceContext.metadata,
                isSpecialSkill: true
            }
        };

        this.experienceSystem!.awardExperience(
            context.caster,
            ExperienceAction.SKILL_CAST,
            specialContext
        );

        this.log('Special skill experience awarded', {
            caster: context.caster,
            skillId: skill.id,
            bonusAmount: specialContext.bonusAmount
        });
    }

    /**
     * スキルに対応する経験値アクションを取得
     * @param skill スキル
     * @returns 経験値アクション
     */
    private getExperienceActionForSkill(skill: Skill): ExperienceAction {
        switch (skill.skillType) {
            case SkillType.HEAL:
                return ExperienceAction.HEAL;
            case SkillType.BUFF:
                return ExperienceAction.BUFF_APPLY;
            case SkillType.DEBUFF:
                return ExperienceAction.DEBUFF_APPLY;
            case SkillType.ATTACK:
                return ExperienceAction.ATTACK;
            case SkillType.STATUS:
                return ExperienceAction.SUPPORT;
            case SkillType.SPECIAL:
            default:
                return ExperienceAction.SKILL_CAST;
        }
    }

    /**
     * スキルに対応する経験値ソースを取得
     * @param skill スキル
     * @returns 経験値ソース
     */
    private getExperienceSourceForSkill(skill: Skill): ExperienceSource {
        switch (skill.skillType) {
            case SkillType.HEAL:
                return ExperienceSource.HEALING;
            case SkillType.BUFF:
            case SkillType.DEBUFF:
            case SkillType.STATUS:
                return ExperienceSource.ALLY_SUPPORT;
            case SkillType.ATTACK:
                return ExperienceSource.ATTACK_HIT;
            case SkillType.SPECIAL:
            default:
                return ExperienceSource.SKILL_USE;
        }
    }

    /**
     * スキル効果による経験値ボーナスを計算
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     * @returns 経験値ボーナス情報
     */
    private calculateSkillExperienceBonus(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult
    ): { totalBonus: number; multiplier: number; details: any } {
        const skillData = skill as any; // SkillDataにアクセスするためのキャスト
        const experienceBonus = skillData.data?.experienceBonus;

        if (!experienceBonus) {
            return { totalBonus: 0, multiplier: 1.0, details: {} };
        }

        let totalBonus = experienceBonus.fixedBonus || 0;
        let multiplier = experienceBonus.baseMultiplier || 1.0;
        const details: any = {
            fixedBonus: experienceBonus.fixedBonus || 0,
            baseMultiplier: experienceBonus.baseMultiplier || 1.0
        };

        // 効果値に基づくボーナス
        if (experienceBonus.effectValueMultiplier) {
            const totalEffectValue = result.effects.reduce((sum, effect) =>
                effect.success ? sum + effect.actualValue : sum, 0);
            const effectBonus = Math.floor(totalEffectValue * experienceBonus.effectValueMultiplier);
            totalBonus += effectBonus;
            details.effectValueBonus = effectBonus;
        }

        // 対象数に基づくボーナス
        if (experienceBonus.targetCountBonus) {
            const targetBonus = result.targets.length * experienceBonus.targetCountBonus;
            totalBonus += targetBonus;
            details.targetCountBonus = targetBonus;
        }

        // クリティカル時の追加ボーナス
        if (experienceBonus.criticalBonus) {
            const criticalCount = result.effects.filter(effect => effect.isCritical).length;
            if (criticalCount > 0) {
                const criticalBonus = criticalCount * experienceBonus.criticalBonus;
                totalBonus += criticalBonus;
                details.criticalBonus = criticalBonus;
            }
        }

        // 特殊条件ボーナス
        if (experienceBonus.specialConditions) {
            let specialBonus = 0;
            const specialDetails: any[] = [];

            for (const condition of experienceBonus.specialConditions) {
                const conditionMet = this.checkSpecialCondition(condition, skill, context, result);
                if (conditionMet) {
                    specialBonus += condition.bonus;
                    specialDetails.push({
                        type: condition.type,
                        bonus: condition.bonus,
                        description: condition.description
                    });
                }
            }

            if (specialBonus > 0) {
                totalBonus += specialBonus;
                details.specialConditions = specialDetails;
            }
        }

        return { totalBonus, multiplier, details };
    }

    /**
     * 特殊条件をチェック
     * @param condition 条件
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result スキル実行結果
     * @returns 条件を満たしているかどうか
     */
    private checkSpecialCondition(
        condition: any, // SkillExperienceBonusCondition
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult
    ): boolean {
        const caster = context.battlefieldState?.getCharacter?.(context.caster);
        if (!caster) return false;

        switch (condition.type) {
            case 'low_hp':
                // HP が指定値以下の場合
                const hpPercentage = (caster.currentHP / caster.stats.maxHP) * 100;
                return hpPercentage <= (condition.value || 25);

            case 'high_damage':
                // 指定値以上のダメージを与えた場合
                const totalDamage = result.effects
                    .filter(effect => effect.effectType === 'damage' && effect.success)
                    .reduce((sum, effect) => sum + effect.actualValue, 0);
                return totalDamage >= (condition.value || 50);

            case 'multiple_targets':
                // 指定数以上の対象に効果を与えた場合
                return result.targets.length >= (condition.value || 3);

            case 'status_effect':
                // 状態異常効果を与えた場合
                return result.effects.some(effect =>
                    effect.effectType === 'status' && effect.success);

            case 'combo':
                // コンボ攻撃の場合（実装は戦闘システムに依存）
                return context.battlefieldState?.isComboAttack?.(context.caster) || false;

            default:
                return false;
        }
    }

    /**
     * 後処理（状態更新、戦闘システム反映）
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param effectResult 効果適用結果
     * @returns 後処理結果
     */
    private async performPostprocessing(
        skill: Skill,
        context: SkillExecutionContext,
        effectResult: SkillResult
    ): Promise<Partial<SkillResult>> {
        try {
            // 戦闘システムへの結果反映
            await this.reflectToBattleSystem(skill, context, effectResult);

            // キャラクター状態の更新
            await this.updateCharacterStates(skill, context, effectResult);

            // ターン制システムとの連携
            await this.integrateWithTurnSystem(skill, context, effectResult);

            this.log('Post-processing completed', {
                skillId: skill.id,
                caster: context.caster
            });

            return {
                additionalInfo: {
                    postProcessingCompleted: true,
                    battleSystemIntegrated: true,
                    turnSystemIntegrated: true
                }
            };

        } catch (error) {
            this.log('Post-processing error', {
                error: error.message,
                skillId: skill.id
            });

            return {
                additionalInfo: {
                    postProcessingError: error.message
                }
            };
        }
    }

    /**
     * 戦闘システムへの結果反映
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result 実行結果
     */
    private async reflectToBattleSystem(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult
    ): Promise<void> {
        // 戦闘システムが利用可能な場合、結果を反映
        // 実際の実装では、BattleSystemのインスタンスを受け取って連携する
        this.emit('battle-system-update', {
            skill,
            context,
            result,
            updateType: 'skill_execution'
        });
    }

    /**
     * キャラクター状態の更新
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result 実行結果
     */
    private async updateCharacterStates(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult
    ): Promise<void> {
        // 使用者の行動済みフラグを設定
        const caster = context.battlefieldState?.getCharacter?.(context.caster);
        if (caster) {
            caster.hasActed = true;
            context.battlefieldState?.updateCharacterState?.(context.caster, {
                hasActed: true
            });
        }

        // 対象キャラクターの状態更新は各スキルの実行処理で行われているため、
        // ここでは追加の状態更新があれば実行
    }

    /**
     * ターン制システムとの統合
     * @param skill スキル
     * @param context 実行コンテキスト
     * @param result 実行結果
     */
    private async integrateWithTurnSystem(
        skill: Skill,
        context: SkillExecutionContext,
        result: SkillResult
    ): Promise<void> {
        // ターン制システムとの連携
        this.emit('turn-system-update', {
            skill,
            context,
            result,
            updateType: 'skill_usage'
        });
    }

    /**
     * クリーンアップ処理
     * @param skill スキル
     * @param context 実行コンテキスト
     */
    private async performCleanup(skill: Skill, context: SkillExecutionContext): Promise<void> {
        // 状態をリセット
        this.state.currentSkill = null;
        this.state.currentCaster = null;
        this.state.currentTargetPosition = null;
        this.state.isAnimating = false;

        // アニメーション効果をクリア（必要に応じて）
        if (this.animator) {
            // 一時的な効果のみクリア、継続効果は残す
        }

        this.log('Cleanup completed', {
            skillId: skill.id,
            caster: context.caster
        });
    }

    /**
     * 実行エラーのハンドリング
     * @param error エラー
     * @param context 実行コンテキスト
     * @param executionId 実行ID
     * @returns エラー結果
     */
    private handleExecutionError(
        error: Error,
        context: SkillExecutionContext,
        executionId: string
    ): SkillResult {
        this.log('Skill execution error', {
            error: error.message,
            skillId: context.skillId,
            caster: context.caster,
            phase: this.state.phase,
            executionId
        });

        // 状態をクリーンアップ
        this.state.currentSkill = null;
        this.state.currentCaster = null;
        this.state.currentTargetPosition = null;
        this.state.isAnimating = false;

        // エラーイベントを発行
        this.emit('skill-execution-error', {
            error,
            context,
            phase: this.state.phase,
            executionId
        });

        return {
            success: false,
            error: SkillExecutionError.UNEXPECTED_ERROR as any,
            errorMessage: `スキル実行エラー: ${error.message}`,
            targets: [],
            effects: [],
            mpCost: 0,
            additionalInfo: {
                executionId,
                errorPhase: this.state.phase,
                executionTime: performance.now() - this.state.executionStartTime
            }
        };
    }

    /**
     * イベントリスナーの設定
     */
    private setupEventListeners(): void {
        // アニメーション完了イベント
        this.on('animation-complete', () => {
            this.state.isAnimating = false;
        });

        // エラー回復イベント
        this.on('error-recovery', (data) => {
            if (this.config.enableAutoRecovery) {
                this.performErrorRecovery(data);
            }
        });
    }

    /**
     * エラー回復処理
     * @param data 回復データ
     */
    private performErrorRecovery(data: any): void {
        // 基本的なエラー回復処理
        this.state.phase = 'idle';
        this.state.isAnimating = false;
        this.state.currentSkill = null;
        this.state.currentCaster = null;
        this.state.currentTargetPosition = null;

        this.log('Error recovery performed', data);
    }

    /**
     * 継続効果かどうかを判定
     * @param effectType 効果種別
     * @returns 継続効果かどうか
     */
    private isContinuousEffect(effectType: string): boolean {
        return ['buff', 'debuff', 'status'].includes(effectType);
    }

    /**
     * 効果種別を取得
     * @param effectType 効果種別文字列
     * @returns 効果種別
     */
    private getEffectType(effectType: string): BuffType | StatusEffectType {
        // 実際の実装では、効果種別の詳細な変換を行う
        return BuffType.ATTACK_UP; // プレースホルダー
    }

    /**
     * 効果持続時間を取得
     * @param skill スキル
     * @param effectType 効果種別
     * @returns 持続時間
     */
    private getEffectDuration(skill: Skill, effectType: string): number {
        const effect = skill.effects.find(e => e.type === effectType);
        return effect?.duration || 3;
    }

    /**
     * 総ダメージを計算
     * @param effects 効果結果
     * @returns 総ダメージ
     */
    private calculateTotalDamage(effects: SkillEffectResult[]): number {
        return effects
            .filter(effect => effect.effectType === 'damage' && effect.success)
            .reduce((total, effect) => total + effect.actualValue, 0);
    }

    /**
     * クリティカルヒットがあるかチェック
     * @param effects 効果結果
     * @returns クリティカルヒットがあるか
     */
    private hasCriticalHit(effects: SkillEffectResult[]): boolean {
        return effects.some(effect => effect.isCritical === true);
    }

    /**
     * ログ出力
     * @param message メッセージ
     * @param data 追加データ
     */
    private log(message: string, data?: any): void {
        if (this.config.enableDebugLogging) {
            console.log(`[SkillExecutor] ${message}`, data || '');
        }
    }

    /**
     * 現在の実行状態を取得
     * @returns 実行状態
     */
    getExecutionState(): SkillExecutionState {
        return { ...this.state };
    }

    /**
     * 実行履歴を取得
     * @param limit 取得件数制限
     * @returns 実行履歴
     */
    getExecutionHistory(limit?: number): SkillResult[] {
        if (limit) {
            return this.executionHistory.slice(-limit);
        }
        return [...this.executionHistory];
    }

    /**
     * パフォーマンスメトリクスを取得
     * @returns パフォーマンスメトリクス
     */
    getPerformanceMetrics(): Map<string, number> {
        return new Map(this.performanceMetrics);
    }

    /**
     * システムをリセット
     */
    reset(): void {
        this.state = {
            currentSkill: null,
            currentCaster: null,
            currentTargetPosition: null,
            phase: 'idle',
            isAnimating: false,
            executionStartTime: 0,
            lastResult: null
        };

        this.executionHistory.length = 0;
        this.performanceMetrics.clear();

        if (this.animator) {
            this.animator.clearEffects();
        }

        this.log('SkillExecutor reset');
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.reset();
        this.removeAllListeners();
        this.log('SkillExecutor destroyed');
    }
}