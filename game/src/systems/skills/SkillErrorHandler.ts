/**
 * スキルエラーハンドリングシステム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillErrorHandler: スキルエラーの分類と処理を行うクラス
 * - 各種スキルエラーの検出と通知機能
 * - エラー発生時のユーザーガイダンス表示
 * - スキル処理中断時の状態復旧とクリーンアップ処理
 */

import * as Phaser from 'phaser';
import {
    SkillUsabilityError,
    SkillResult,
    SkillExecutionContext,
    CharacterSkillData,
    Position
} from '../../types/skill';

/**
 * スキルエラー種別（拡張版）
 */
export enum SkillError {
    // 使用条件エラー
    INSUFFICIENT_MP = 'insufficient_mp',
    SKILL_ON_COOLDOWN = 'skill_on_cooldown',
    USAGE_LIMIT_EXCEEDED = 'usage_limit_exceeded',
    LEVEL_REQUIREMENT_NOT_MET = 'level_requirement_not_met',
    WEAPON_REQUIREMENT_NOT_MET = 'weapon_requirement_not_met',
    JOB_REQUIREMENT_NOT_MET = 'job_requirement_not_met',

    // 対象・範囲エラー
    INVALID_TARGET = 'invalid_target',
    OUT_OF_RANGE = 'out_of_range',
    NO_VALID_TARGETS = 'no_valid_targets',
    TARGET_ALREADY_AFFECTED = 'target_already_affected',

    // システムエラー
    SKILL_NOT_FOUND = 'skill_not_found',
    CASTER_NOT_FOUND = 'caster_not_found',
    ANIMATION_ERROR = 'animation_error',
    DATA_CORRUPTION = 'data_corruption',

    // 状態エラー
    CHARACTER_ALREADY_ACTED = 'character_already_acted',
    CHARACTER_STATUS_PREVENTS_USE = 'character_status_prevents_use',
    BATTLE_STATE_INVALID = 'battle_state_invalid',

    // 実行エラー
    EXECUTION_TIMEOUT = 'execution_timeout',
    EFFECT_APPLICATION_FAILED = 'effect_application_failed',
    STATE_RECOVERY_FAILED = 'state_recovery_failed',
    UNEXPECTED_ERROR = 'unexpected_error'
}

/**
 * エラー重要度レベル
 */
export enum ErrorSeverity {
    /** 情報レベル - ユーザーに通知するが処理は継続 */
    INFO = 'info',
    /** 警告レベル - 注意が必要だが処理は継続可能 */
    WARNING = 'warning',
    /** エラーレベル - 処理を中断する必要がある */
    ERROR = 'error',
    /** 致命的エラー - システム全体に影響する可能性 */
    CRITICAL = 'critical'
}

/**
 * エラーコンテキスト情報
 */
export interface SkillErrorContext {
    /** エラーが発生したスキルID */
    skillId?: string;
    /** エラーが発生した使用者ID */
    casterId?: string;
    /** エラーが発生した対象位置 */
    targetPosition?: Position;
    /** エラーが発生した実行フェーズ */
    executionPhase?: string;
    /** エラーが発生した時刻 */
    timestamp: Date;
    /** 追加のコンテキスト情報 */
    additionalInfo?: Record<string, any>;
}

/**
 * エラー詳細情報
 */
export interface SkillErrorDetails {
    /** エラー種別 */
    error: SkillError;
    /** エラーメッセージ */
    message: string;
    /** ユーザー向けメッセージ */
    userMessage: string;
    /** 重要度 */
    severity: ErrorSeverity;
    /** 回復可能かどうか */
    recoverable: boolean;
    /** 推奨アクション */
    suggestedActions: string[];
    /** エラーコンテキスト */
    context: SkillErrorContext;
}

/**
 * エラー回復戦略
 */
export interface ErrorRecoveryStrategy {
    /** 戦略名 */
    name: string;
    /** 適用可能なエラー種別 */
    applicableErrors: SkillError[];
    /** 回復処理 */
    recover: (errorDetails: SkillErrorDetails, context: SkillExecutionContext) => Promise<boolean>;
    /** 回復成功率の予測 */
    estimateSuccessRate: (errorDetails: SkillErrorDetails) => number;
}

/**
 * ユーザーフィードバック設定
 */
export interface UserFeedbackConfig {
    /** 通知表示時間（ミリ秒） */
    notificationDuration: number;
    /** 音響効果を有効にするか */
    enableSoundEffects: boolean;
    /** 詳細エラー情報を表示するか */
    showDetailedErrors: boolean;
    /** 自動回復を試行するか */
    enableAutoRecovery: boolean;
    /** エラーログを記録するか */
    enableErrorLogging: boolean;
}

/**
 * スキルエラーハンドラー
 * スキル実行時のエラーを分類・処理し、適切なユーザーフィードバックを提供する
 */
export class SkillErrorHandler extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: UserFeedbackConfig;
    private recoveryStrategies: Map<SkillError, ErrorRecoveryStrategy[]> = new Map();
    private errorHistory: SkillErrorDetails[] = [];
    private errorStatistics: Map<SkillError, number> = new Map();

    /** デフォルト設定 */
    private static readonly DEFAULT_CONFIG: UserFeedbackConfig = {
        notificationDuration: 3000,
        enableSoundEffects: true,
        showDetailedErrors: false,
        enableAutoRecovery: true,
        enableErrorLogging: true
    };

    /** エラーメッセージテンプレート */
    private static readonly ERROR_MESSAGES: Record<SkillError, { message: string; userMessage: string; severity: ErrorSeverity }> = {
        [SkillError.INSUFFICIENT_MP]: {
            message: 'MP不足によりスキルを使用できません',
            userMessage: 'MPが足りません',
            severity: ErrorSeverity.WARNING
        },
        [SkillError.SKILL_ON_COOLDOWN]: {
            message: 'スキルがクールダウン中です',
            userMessage: 'スキルはまだ使用できません',
            severity: ErrorSeverity.INFO
        },
        [SkillError.USAGE_LIMIT_EXCEEDED]: {
            message: '使用回数制限に達しています',
            userMessage: 'このスキルはもう使用できません',
            severity: ErrorSeverity.WARNING
        },
        [SkillError.LEVEL_REQUIREMENT_NOT_MET]: {
            message: 'レベル要件を満たしていません',
            userMessage: 'レベルが足りません',
            severity: ErrorSeverity.WARNING
        },
        [SkillError.WEAPON_REQUIREMENT_NOT_MET]: {
            message: '必要な武器を装備していません',
            userMessage: '適切な武器が必要です',
            severity: ErrorSeverity.WARNING
        },
        [SkillError.JOB_REQUIREMENT_NOT_MET]: {
            message: '職業要件を満たしていません',
            userMessage: 'この職業では使用できません',
            severity: ErrorSeverity.WARNING
        },
        [SkillError.INVALID_TARGET]: {
            message: '無効な対象が選択されています',
            userMessage: '対象を正しく選択してください',
            severity: ErrorSeverity.WARNING
        },
        [SkillError.OUT_OF_RANGE]: {
            message: '対象が射程外です',
            userMessage: '射程内の対象を選択してください',
            severity: ErrorSeverity.WARNING
        },
        [SkillError.NO_VALID_TARGETS]: {
            message: '有効な対象がいません',
            userMessage: '使用できる対象がいません',
            severity: ErrorSeverity.INFO
        },
        [SkillError.TARGET_ALREADY_AFFECTED]: {
            message: '対象は既に同じ効果を受けています',
            userMessage: '効果は既に適用されています',
            severity: ErrorSeverity.INFO
        },
        [SkillError.SKILL_NOT_FOUND]: {
            message: 'スキルが見つかりません',
            userMessage: 'スキルデータエラー',
            severity: ErrorSeverity.ERROR
        },
        [SkillError.CASTER_NOT_FOUND]: {
            message: '使用者が見つかりません',
            userMessage: 'キャラクターデータエラー',
            severity: ErrorSeverity.ERROR
        },
        [SkillError.ANIMATION_ERROR]: {
            message: 'アニメーション実行エラー',
            userMessage: '表示エラーが発生しました',
            severity: ErrorSeverity.WARNING
        },
        [SkillError.DATA_CORRUPTION]: {
            message: 'データが破損しています',
            userMessage: 'データエラーが発生しました',
            severity: ErrorSeverity.CRITICAL
        },
        [SkillError.CHARACTER_ALREADY_ACTED]: {
            message: 'キャラクターは既に行動済みです',
            userMessage: '既に行動済みです',
            severity: ErrorSeverity.INFO
        },
        [SkillError.CHARACTER_STATUS_PREVENTS_USE]: {
            message: '状態異常によりスキルを使用できません',
            userMessage: '状態異常により使用できません',
            severity: ErrorSeverity.WARNING
        },
        [SkillError.BATTLE_STATE_INVALID]: {
            message: '戦闘状態が無効です',
            userMessage: '戦闘状態エラー',
            severity: ErrorSeverity.ERROR
        },
        [SkillError.EXECUTION_TIMEOUT]: {
            message: 'スキル実行がタイムアウトしました',
            userMessage: '実行時間が長すぎます',
            severity: ErrorSeverity.ERROR
        },
        [SkillError.EFFECT_APPLICATION_FAILED]: {
            message: 'スキル効果の適用に失敗しました',
            userMessage: 'スキル効果の適用に失敗',
            severity: ErrorSeverity.ERROR
        },
        [SkillError.STATE_RECOVERY_FAILED]: {
            message: '状態復旧に失敗しました',
            userMessage: '状態復旧エラー',
            severity: ErrorSeverity.CRITICAL
        },
        [SkillError.UNEXPECTED_ERROR]: {
            message: '予期しないエラーが発生しました',
            userMessage: '予期しないエラー',
            severity: ErrorSeverity.CRITICAL
        }
    };

    /**
     * SkillErrorHandlerを作成する
     * @param scene Phaserシーン
     * @param config ユーザーフィードバック設定
     */
    constructor(scene: Phaser.Scene, config?: Partial<UserFeedbackConfig>) {
        super();

        this.scene = scene;
        this.config = { ...SkillErrorHandler.DEFAULT_CONFIG, ...config };

        this.initializeRecoveryStrategies();
        this.setupEventListeners();

        this.log('SkillErrorHandler initialized', { config: this.config });
    }

    /**
     * スキルエラーを処理する
     * @param error エラー種別
     * @param context エラーコンテキスト
     * @param executionContext 実行コンテキスト（オプション）
     * @returns 処理結果
     */
    async handleSkillError(
        error: SkillError,
        context: SkillErrorContext,
        executionContext?: SkillExecutionContext
    ): Promise<SkillResult> {
        const errorDetails = this.createErrorDetails(error, context);

        // エラー統計を更新
        this.updateErrorStatistics(error);

        // エラー履歴に追加
        this.errorHistory.push(errorDetails);

        // ログ記録
        if (this.config.enableErrorLogging) {
            this.logError(errorDetails);
        }

        // ユーザーフィードバックを表示
        await this.showUserFeedback(errorDetails);

        // 自動回復を試行
        let recoveryResult: SkillResult | null = null;
        if (this.config.enableAutoRecovery && errorDetails.recoverable && executionContext) {
            recoveryResult = await this.attemptErrorRecovery(errorDetails, executionContext);
        }

        // エラーイベントを発行
        this.emit('skill-error', {
            errorDetails,
            recoveryResult,
            context: executionContext
        });

        // 回復に成功した場合は回復結果を返す
        if (recoveryResult && recoveryResult.success) {
            return recoveryResult;
        }

        // エラー結果を返す
        return this.createErrorResult(errorDetails, executionContext);
    }

    /**
     * エラー詳細情報を作成する
     * @param error エラー種別
     * @param context エラーコンテキスト
     * @returns エラー詳細情報
     */
    private createErrorDetails(error: SkillError, context: SkillErrorContext): SkillErrorDetails {
        const template = SkillErrorHandler.ERROR_MESSAGES[error];

        return {
            error,
            message: template.message,
            userMessage: template.userMessage,
            severity: template.severity,
            recoverable: this.isRecoverable(error),
            suggestedActions: this.getSuggestedActions(error, context),
            context
        };
    }

    /**
     * エラーが回復可能かどうかを判定する
     * @param error エラー種別
     * @returns 回復可能かどうか
     */
    private isRecoverable(error: SkillError): boolean {
        const recoverableErrors = [
            SkillError.ANIMATION_ERROR,
            SkillError.EXECUTION_TIMEOUT,
            SkillError.EFFECT_APPLICATION_FAILED
        ];

        return recoverableErrors.includes(error);
    }

    /**
     * 推奨アクションを取得する
     * @param error エラー種別
     * @param context エラーコンテキスト
     * @returns 推奨アクション
     */
    private getSuggestedActions(error: SkillError, context: SkillErrorContext): string[] {
        switch (error) {
            case SkillError.INSUFFICIENT_MP:
                return ['MPを回復してください', '別のスキルを使用してください'];

            case SkillError.SKILL_ON_COOLDOWN:
                return ['ターンを進めてください', '別のスキルを使用してください'];

            case SkillError.USAGE_LIMIT_EXCEEDED:
                return ['別のスキルを使用してください', '次の戦闘で使用してください'];

            case SkillError.LEVEL_REQUIREMENT_NOT_MET:
                return ['レベルアップしてください', '別のスキルを習得してください'];

            case SkillError.WEAPON_REQUIREMENT_NOT_MET:
                return ['適切な武器を装備してください', '別のスキルを使用してください'];

            case SkillError.INVALID_TARGET:
            case SkillError.OUT_OF_RANGE:
                return ['有効な対象を選択してください', '射程内の対象を選択してください'];

            case SkillError.NO_VALID_TARGETS:
                return ['別のスキルを使用してください', '位置を変更してください'];

            case SkillError.CHARACTER_STATUS_PREVENTS_USE:
                return ['状態異常を回復してください', '別のキャラクターを使用してください'];

            case SkillError.DATA_CORRUPTION:
                return ['ゲームを再起動してください', 'セーブデータを確認してください'];

            default:
                return ['もう一度試してください', '別の方法を試してください'];
        }
    }

    /**
     * ユーザーフィードバックを表示する
     * @param errorDetails エラー詳細情報
     */
    private async showUserFeedback(errorDetails: SkillErrorDetails): Promise<void> {
        // エラー通知を表示
        await this.showErrorNotification(errorDetails);

        // 音響効果を再生
        if (this.config.enableSoundEffects) {
            this.playErrorSound(errorDetails.severity);
        }

        // 詳細情報を表示（設定が有効な場合）
        if (this.config.showDetailedErrors) {
            await this.showDetailedErrorInfo(errorDetails);
        }

        // ガイダンスを表示
        await this.showUserGuidance(errorDetails);
    }

    /**
     * エラー通知を表示する
     * @param errorDetails エラー詳細情報
     */
    private async showErrorNotification(errorDetails: SkillErrorDetails): Promise<void> {
        // UI通知システムを使用してエラーメッセージを表示
        this.emit('show-notification', {
            message: errorDetails.userMessage,
            type: errorDetails.severity,
            duration: this.config.notificationDuration,
            actions: errorDetails.suggestedActions
        });

        this.log('Error notification shown', {
            error: errorDetails.error,
            message: errorDetails.userMessage,
            severity: errorDetails.severity
        });
    }

    /**
     * エラー音響効果を再生する
     * @param severity エラー重要度
     */
    private playErrorSound(severity: ErrorSeverity): void {
        let soundKey: string;

        switch (severity) {
            case ErrorSeverity.INFO:
                soundKey = 'info_sound';
                break;
            case ErrorSeverity.WARNING:
                soundKey = 'warning_sound';
                break;
            case ErrorSeverity.ERROR:
                soundKey = 'error_sound';
                break;
            case ErrorSeverity.CRITICAL:
                soundKey = 'critical_error_sound';
                break;
            default:
                soundKey = 'error_sound';
        }

        // 音響効果を再生（実際の実装では適切な音響システムを使用）
        this.emit('play-sound', { soundKey, volume: 0.5 });
    }

    /**
     * 詳細エラー情報を表示する
     * @param errorDetails エラー詳細情報
     */
    private async showDetailedErrorInfo(errorDetails: SkillErrorDetails): Promise<void> {
        this.emit('show-error-details', {
            error: errorDetails.error,
            message: errorDetails.message,
            context: errorDetails.context,
            timestamp: errorDetails.context.timestamp
        });
    }

    /**
     * ユーザーガイダンスを表示する
     * @param errorDetails エラー詳細情報
     */
    private async showUserGuidance(errorDetails: SkillErrorDetails): Promise<void> {
        if (errorDetails.suggestedActions.length > 0) {
            this.emit('show-guidance', {
                title: 'おすすめの対処法',
                actions: errorDetails.suggestedActions,
                error: errorDetails.error
            });
        }
    }

    /**
     * エラー回復を試行する
     * @param errorDetails エラー詳細情報
     * @param context 実行コンテキスト
     * @returns 回復結果
     */
    private async attemptErrorRecovery(
        errorDetails: SkillErrorDetails,
        context: SkillExecutionContext
    ): Promise<SkillResult | null> {
        const strategies = this.recoveryStrategies.get(errorDetails.error) || [];

        for (const strategy of strategies) {
            try {
                this.log('Attempting error recovery', {
                    error: errorDetails.error,
                    strategy: strategy.name
                });

                const success = await strategy.recover(errorDetails, context);

                if (success) {
                    this.log('Error recovery successful', {
                        error: errorDetails.error,
                        strategy: strategy.name
                    });

                    // 回復成功の通知
                    this.emit('error-recovery-success', {
                        error: errorDetails.error,
                        strategy: strategy.name,
                        context
                    });

                    // 成功結果を返す
                    return {
                        success: true,
                        targets: [],
                        effects: [],
                        mpCost: 0,
                        additionalInfo: {
                            recoveredFromError: errorDetails.error,
                            recoveryStrategy: strategy.name
                        }
                    };
                }
            } catch (recoveryError) {
                this.log('Error recovery failed', {
                    error: errorDetails.error,
                    strategy: strategy.name,
                    recoveryError: recoveryError.message
                });
            }
        }

        // 全ての回復戦略が失敗
        this.emit('error-recovery-failed', {
            error: errorDetails.error,
            context,
            attemptedStrategies: strategies.map(s => s.name)
        });

        return null;
    }

    /**
     * 状態復旧とクリーンアップを実行する
     * @param context 実行コンテキスト
     * @param errorDetails エラー詳細情報
     * @returns 復旧成功かどうか
     */
    async performStateRecovery(
        context: SkillExecutionContext,
        errorDetails: SkillErrorDetails
    ): Promise<boolean> {
        try {
            this.log('Starting state recovery', {
                error: errorDetails.error,
                skillId: context.skillId,
                caster: context.caster
            });

            // 1. キャラクター状態の復旧
            await this.recoverCharacterState(context, errorDetails);

            // 2. 戦場状態の復旧
            await this.recoverBattlefieldState(context, errorDetails);

            // 3. UI状態の復旧
            await this.recoverUIState(context, errorDetails);

            // 4. アニメーション状態のクリーンアップ
            await this.cleanupAnimationState(context, errorDetails);

            // 5. メモリリークの防止
            await this.performMemoryCleanup(context, errorDetails);

            this.log('State recovery completed successfully', {
                error: errorDetails.error,
                skillId: context.skillId
            });

            this.emit('state-recovery-success', {
                context,
                errorDetails
            });

            return true;

        } catch (recoveryError) {
            this.log('State recovery failed', {
                error: errorDetails.error,
                recoveryError: recoveryError.message
            });

            this.emit('state-recovery-failed', {
                context,
                errorDetails,
                recoveryError: recoveryError.message
            });

            return false;
        }
    }

    /**
     * キャラクター状態の復旧
     * @param context 実行コンテキスト
     * @param errorDetails エラー詳細情報
     */
    private async recoverCharacterState(
        context: SkillExecutionContext,
        errorDetails: SkillErrorDetails
    ): Promise<void> {
        // 使用者の状態を復旧
        const caster = context.battlefieldState?.getCharacter?.(context.caster);
        if (caster) {
            // MP消費を取り消し（必要に応じて）
            if (errorDetails.error === SkillError.EFFECT_APPLICATION_FAILED) {
                // スキルのMP消費を取得して復旧
                // 実際の実装では、スキルデータから取得
            }

            // 行動済みフラグをリセット（必要に応じて）
            if (caster.hasActed && this.shouldResetActionFlag(errorDetails.error)) {
                caster.hasActed = false;
                context.battlefieldState?.updateCharacterState?.(context.caster, {
                    hasActed: false
                });
            }
        }
    }

    /**
     * 戦場状態の復旧
     * @param context 実行コンテキスト
     * @param errorDetails エラー詳細情報
     */
    private async recoverBattlefieldState(
        context: SkillExecutionContext,
        errorDetails: SkillErrorDetails
    ): Promise<void> {
        // 戦場状態の整合性をチェックし、必要に応じて修正
        // 実際の実装では、BattlefieldStateの復旧メソッドを呼び出し
        this.emit('recover-battlefield-state', {
            context,
            errorDetails
        });
    }

    /**
     * UI状態の復旧
     * @param context 実行コンテキスト
     * @param errorDetails エラー詳細情報
     */
    private async recoverUIState(
        context: SkillExecutionContext,
        errorDetails: SkillErrorDetails
    ): Promise<void> {
        // UI状態をリセット
        this.emit('recover-ui-state', {
            context,
            errorDetails,
            actions: [
                'clear-skill-selection',
                'hide-range-display',
                'reset-cursor',
                'clear-temporary-effects'
            ]
        });
    }

    /**
     * アニメーション状態のクリーンアップ
     * @param context 実行コンテキスト
     * @param errorDetails エラー詳細情報
     */
    private async cleanupAnimationState(
        context: SkillExecutionContext,
        errorDetails: SkillErrorDetails
    ): Promise<void> {
        // アニメーション関連のクリーンアップ
        this.emit('cleanup-animations', {
            context,
            errorDetails,
            actions: [
                'stop-all-animations',
                'clear-temporary-effects',
                'reset-character-sprites',
                'clear-particle-effects'
            ]
        });
    }

    /**
     * メモリクリーンアップ
     * @param context 実行コンテキスト
     * @param errorDetails エラー詳細情報
     */
    private async performMemoryCleanup(
        context: SkillExecutionContext,
        errorDetails: SkillErrorDetails
    ): Promise<void> {
        // メモリリークを防ぐためのクリーンアップ
        this.emit('memory-cleanup', {
            context,
            errorDetails,
            actions: [
                'clear-temporary-objects',
                'release-unused-textures',
                'cleanup-event-listeners',
                'garbage-collect'
            ]
        });
    }

    /**
     * 行動済みフラグをリセットすべきかどうかを判定
     * @param error エラー種別
     * @returns リセットすべきかどうか
     */
    private shouldResetActionFlag(error: SkillError): boolean {
        const resetErrors = [
            SkillError.ANIMATION_ERROR,
            SkillError.EFFECT_APPLICATION_FAILED,
            SkillError.EXECUTION_TIMEOUT
        ];

        return resetErrors.includes(error);
    }

    /**
     * エラー結果を作成する
     * @param errorDetails エラー詳細情報
     * @param context 実行コンテキスト
     * @returns エラー結果
     */
    private createErrorResult(
        errorDetails: SkillErrorDetails,
        context?: SkillExecutionContext
    ): SkillResult {
        return {
            success: false,
            error: errorDetails.error as any,
            errorMessage: errorDetails.userMessage,
            targets: [],
            effects: [],
            mpCost: 0,
            additionalInfo: {
                errorDetails,
                timestamp: errorDetails.context.timestamp,
                severity: errorDetails.severity,
                recoverable: errorDetails.recoverable,
                suggestedActions: errorDetails.suggestedActions
            }
        };
    }

    /**
     * 回復戦略を初期化する
     */
    private initializeRecoveryStrategies(): void {
        // アニメーションエラーの回復戦略
        this.addRecoveryStrategy({
            name: 'animation_error_recovery',
            applicableErrors: [SkillError.ANIMATION_ERROR],
            recover: async (errorDetails, context) => {
                // アニメーションをスキップして効果のみ適用
                this.emit('skip-animation', { context });
                return true;
            },
            estimateSuccessRate: () => 0.9
        });

        // 実行タイムアウトの回復戦略
        this.addRecoveryStrategy({
            name: 'timeout_recovery',
            applicableErrors: [SkillError.EXECUTION_TIMEOUT],
            recover: async (errorDetails, context) => {
                // タイムアウトした処理を中断し、状態をリセット
                this.emit('cancel-execution', { context });
                await this.performStateRecovery(context, errorDetails);
                return true;
            },
            estimateSuccessRate: () => 0.8
        });

        // 効果適用失敗の回復戦略
        this.addRecoveryStrategy({
            name: 'effect_application_recovery',
            applicableErrors: [SkillError.EFFECT_APPLICATION_FAILED],
            recover: async (errorDetails, context) => {
                // 部分的な効果適用を試行
                this.emit('retry-effect-application', { context, partial: true });
                return false; // 通常は回復困難
            },
            estimateSuccessRate: () => 0.3
        });
    }

    /**
     * 回復戦略を追加する
     * @param strategy 回復戦略
     */
    private addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
        for (const error of strategy.applicableErrors) {
            if (!this.recoveryStrategies.has(error)) {
                this.recoveryStrategies.set(error, []);
            }
            this.recoveryStrategies.get(error)!.push(strategy);
        }
    }

    /**
     * エラー統計を更新する
     * @param error エラー種別
     */
    private updateErrorStatistics(error: SkillError): void {
        const count = this.errorStatistics.get(error) || 0;
        this.errorStatistics.set(error, count + 1);
    }

    /**
     * エラーをログに記録する
     * @param errorDetails エラー詳細情報
     */
    private logError(errorDetails: SkillErrorDetails): void {
        const logData = {
            error: errorDetails.error,
            message: errorDetails.message,
            severity: errorDetails.severity,
            context: errorDetails.context,
            timestamp: errorDetails.context.timestamp.toISOString()
        };

        console.error('[SkillErrorHandler]', logData);

        // 外部ログシステムに送信（実際の実装では適切なログシステムを使用）
        this.emit('log-error', logData);
    }

    /**
     * ログ出力
     * @param message メッセージ
     * @param data 追加データ
     */
    private log(message: string, data?: any): void {
        if (this.config.enableErrorLogging) {
            console.log(`[SkillErrorHandler] ${message}`, data || '');
        }
    }

    /**
     * イベントリスナーを設定する
     */
    private setupEventListeners(): void {
        // 定期的なクリーンアップ
        this.scene.time.addEvent({
            delay: 60000, // 1分ごと
            callback: this.performPeriodicCleanup,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * 定期的なクリーンアップを実行する
     */
    private performPeriodicCleanup(): void {
        // 古いエラー履歴を削除
        const maxHistorySize = 100;
        if (this.errorHistory.length > maxHistorySize) {
            this.errorHistory.splice(0, this.errorHistory.length - maxHistorySize);
        }

        this.log('Periodic cleanup performed', {
            historySize: this.errorHistory.length,
            statisticsSize: this.errorStatistics.size
        });
    }

    /**
     * エラー統計を取得する
     * @returns エラー統計
     */
    getErrorStatistics(): Map<SkillError, number> {
        return new Map(this.errorStatistics);
    }

    /**
     * エラー履歴を取得する
     * @param limit 取得件数制限
     * @returns エラー履歴
     */
    getErrorHistory(limit?: number): SkillErrorDetails[] {
        if (limit) {
            return this.errorHistory.slice(-limit);
        }
        return [...this.errorHistory];
    }

    /**
     * 設定を更新する
     * @param config 新しい設定
     */
    updateConfig(config: Partial<UserFeedbackConfig>): void {
        this.config = { ...this.config, ...config };
        this.log('Configuration updated', this.config);
    }

    /**
     * システムをリセットする
     */
    reset(): void {
        this.errorHistory.length = 0;
        this.errorStatistics.clear();
        this.log('SkillErrorHandler reset');
    }

    /**
     * リソースを破棄する
     */
    destroy(): void {
        this.reset();
        this.removeAllListeners();
        this.log('SkillErrorHandler destroyed');
    }
}