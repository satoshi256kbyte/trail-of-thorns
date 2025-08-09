/**
 * スキルエラーハンドリング統合システム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillErrorIntegration: エラーハンドラーと既存システムの統合を管理するクラス
 * - 既存のSkillExecutorとの統合
 * - エラー回復メカニズムの実装
 * - システム間の連携調整
 */

import * as Phaser from 'phaser';
import {
    SkillErrorHandler,
    SkillError,
    SkillErrorContext,
    UserFeedbackConfig
} from './SkillErrorHandler';
import {
    SkillUserFeedback,
    NotificationConfig,
    GuidanceInfo
} from './SkillUserFeedback';
import { SkillExecutor } from './SkillExecutor';
import { SkillManager } from './SkillManager';
import { SkillConditionChecker } from './SkillConditionChecker';
import {
    SkillExecutionContext,
    SkillResult,
    SkillUsabilityError,
    Position
} from '../../types/skill';

/**
 * エラー統合設定
 */
export interface ErrorIntegrationConfig {
    /** エラーハンドラー設定 */
    errorHandler: Partial<UserFeedbackConfig>;
    /** ユーザーフィードバック設定 */
    userFeedback: Partial<NotificationConfig>;
    /** 自動回復を有効にするか */
    enableAutoRecovery: boolean;
    /** デバッグモードを有効にするか */
    enableDebugMode: boolean;
}

/**
 * スキルエラー統合システム
 * エラーハンドラーと既存のスキルシステムを統合し、
 * 一貫したエラー処理とユーザーフィードバックを提供する
 */
export class SkillErrorIntegration extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: ErrorIntegrationConfig;

    /** エラーハンドラー */
    private errorHandler: SkillErrorHandler;

    /** ユーザーフィードバック */
    private userFeedback: SkillUserFeedback;

    /** スキル実行システム */
    private skillExecutor: SkillExecutor | null = null;

    /** スキル管理システム */
    private skillManager: SkillManager | null = null;

    /** 条件チェッカー */
    private conditionChecker: SkillConditionChecker | null = null;

    /** デフォルト設定 */
    private static readonly DEFAULT_CONFIG: ErrorIntegrationConfig = {
        errorHandler: {
            enableAutoRecovery: true,
            enableErrorLogging: true,
            showDetailedErrors: false
        },
        userFeedback: {
            position: 'top',
            duration: 3000,
            enableSound: true
        },
        enableAutoRecovery: true,
        enableDebugMode: false
    };

    /**
     * SkillErrorIntegrationを作成する
     * @param scene Phaserシーン
     * @param config 統合設定
     */
    constructor(scene: Phaser.Scene, config?: Partial<ErrorIntegrationConfig>) {
        super();

        this.scene = scene;
        this.config = { ...SkillErrorIntegration.DEFAULT_CONFIG, ...config };

        // エラーハンドラーを初期化
        this.errorHandler = new SkillErrorHandler(scene, this.config.errorHandler);

        // ユーザーフィードバックを初期化
        this.userFeedback = new SkillUserFeedback(scene, this.config.userFeedback);

        this.setupIntegration();
        this.log('SkillErrorIntegration initialized');
    }

    /**
     * スキル実行システムを設定する
     * @param skillExecutor スキル実行システム
     */
    setSkillExecutor(skillExecutor: SkillExecutor): void {
        this.skillExecutor = skillExecutor;
        this.setupSkillExecutorIntegration();
        this.log('SkillExecutor integrated');
    }

    /**
     * スキル管理システムを設定する
     * @param skillManager スキル管理システム
     */
    setSkillManager(skillManager: SkillManager): void {
        this.skillManager = skillManager;
        this.log('SkillManager integrated');
    }

    /**
     * 条件チェッカーを設定する
     * @param conditionChecker 条件チェッカー
     */
    setConditionChecker(conditionChecker: SkillConditionChecker): void {
        this.conditionChecker = conditionChecker;
        this.log('SkillConditionChecker integrated');
    }

    /**
     * 統合システムを設定する
     */
    private setupIntegration(): void {
        // エラーハンドラーのイベントリスナーを設定
        this.setupErrorHandlerListeners();

        // ユーザーフィードバックのイベントリスナーを設定
        this.setupUserFeedbackListeners();

        // システム間の連携を設定
        this.setupSystemIntegration();
    }

    /**
     * エラーハンドラーのイベントリスナーを設定する
     */
    private setupErrorHandlerListeners(): void {
        // 通知表示イベント
        this.errorHandler.on('show-notification', (data) => {
            this.userFeedback.showNotification({
                id: `error_${Date.now()}`,
                message: data.message,
                type: data.type,
                duration: data.duration,
                actions: data.actions
            });
        });

        // 音響効果イベント
        this.errorHandler.on('play-sound', (data) => {
            this.playSound(data.soundKey, data.volume);
        });

        // ガイダンス表示イベント
        this.errorHandler.on('show-guidance', (data) => {
            const guidance: GuidanceInfo = {
                title: data.title,
                actions: data.actions,
                error: data.error,
                description: this.getErrorDescription(data.error)
            };
            this.userFeedback.showGuidance(guidance);
        });

        // 詳細エラー情報表示イベント
        this.errorHandler.on('show-error-details', (data) => {
            if (this.config.enableDebugMode) {
                this.showDebugInfo(data);
            }
        });

        // エラー回復イベント
        this.errorHandler.on('error-recovery-success', (data) => {
            this.userFeedback.showNotification({
                id: `recovery_${Date.now()}`,
                message: 'エラーから回復しました',
                type: 'success',
                duration: 2000
            });
        });

        // 状態復旧イベント
        this.errorHandler.on('state-recovery-success', (data) => {
            this.handleStateRecoverySuccess(data);
        });

        // 各種復旧イベント
        this.errorHandler.on('recover-battlefield-state', (data) => {
            this.recoverBattlefieldState(data);
        });

        this.errorHandler.on('recover-ui-state', (data) => {
            this.recoverUIState(data);
        });

        this.errorHandler.on('cleanup-animations', (data) => {
            this.cleanupAnimations(data);
        });

        this.errorHandler.on('memory-cleanup', (data) => {
            this.performMemoryCleanup(data);
        });
    }

    /**
     * ユーザーフィードバックのイベントリスナーを設定する
     */
    private setupUserFeedbackListeners(): void {
        // 通知音再生イベント
        this.userFeedback.on('play-notification-sound', (data) => {
            this.playSound(data.soundKey, data.volume);
        });

        // 詳細情報表示イベント
        this.userFeedback.on('show-detailed-info', (data) => {
            this.showDetailedErrorInfo(data);
        });
    }

    /**
     * システム間の連携を設定する
     */
    private setupSystemIntegration(): void {
        // スキル実行エラーの統合処理
        this.on('skill-execution-error', async (data) => {
            await this.handleSkillExecutionError(data);
        });

        // 条件チェックエラーの統合処理
        this.on('skill-condition-error', async (data) => {
            await this.handleSkillConditionError(data);
        });
    }

    /**
     * スキル実行システムとの統合を設定する
     */
    private setupSkillExecutorIntegration(): void {
        if (!this.skillExecutor) return;

        // スキル実行エラーイベントをリスン
        this.skillExecutor.on('skill-execution-error', async (data) => {
            await this.handleSkillExecutionError(data);
        });

        // 戦闘システム更新イベントをリスン
        this.skillExecutor.on('battle-system-update', (data) => {
            this.handleBattleSystemUpdate(data);
        });

        // ターン制システム更新イベントをリスン
        this.skillExecutor.on('turn-system-update', (data) => {
            this.handleTurnSystemUpdate(data);
        });
    }

    /**
     * スキル実行エラーを処理する
     * @param data エラーデータ
     */
    private async handleSkillExecutionError(data: any): Promise<void> {
        const { error, context, phase, executionId } = data;

        // エラー種別を変換
        const skillError = this.convertToSkillError(error, phase);

        // エラーコンテキストを作成
        const errorContext: SkillErrorContext = {
            skillId: context.skillId,
            casterId: context.caster,
            targetPosition: context.targetPosition,
            executionPhase: phase,
            timestamp: new Date(),
            additionalInfo: {
                executionId,
                originalError: error.message
            }
        };

        // エラーハンドラーで処理
        const result = await this.errorHandler.handleSkillError(
            skillError,
            errorContext,
            context
        );

        // 結果をスキル実行システムに通知
        this.emit('error-handling-complete', {
            originalError: error,
            handlingResult: result,
            context
        });
    }

    /**
     * スキル条件エラーを処理する
     * @param data エラーデータ
     */
    private async handleSkillConditionError(data: any): Promise<void> {
        const { usabilityResult, skillId, casterId, targetPosition } = data;

        // 使用可能性エラーをスキルエラーに変換
        const skillError = this.convertUsabilityErrorToSkillError(usabilityResult.error);

        // エラーコンテキストを作成
        const errorContext: SkillErrorContext = {
            skillId,
            casterId,
            targetPosition,
            executionPhase: 'condition_check',
            timestamp: new Date(),
            additionalInfo: {
                usabilityDetails: usabilityResult
            }
        };

        // エラーハンドラーで処理
        await this.errorHandler.handleSkillError(skillError, errorContext);
    }

    /**
     * エラー種別を変換する
     * @param error 元のエラー
     * @param phase 実行フェーズ
     * @returns スキルエラー
     */
    private convertToSkillError(error: Error, phase: string): SkillError {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('timeout')) {
            return SkillError.EXECUTION_TIMEOUT;
        }

        if (errorMessage.includes('animation')) {
            return SkillError.ANIMATION_ERROR;
        }

        if (errorMessage.includes('effect')) {
            return SkillError.EFFECT_APPLICATION_FAILED;
        }

        if (errorMessage.includes('data') || errorMessage.includes('corruption')) {
            return SkillError.DATA_CORRUPTION;
        }

        switch (phase) {
            case 'validation':
                return SkillError.SKILL_NOT_FOUND;
            case 'animation':
                return SkillError.ANIMATION_ERROR;
            case 'effect_application':
                return SkillError.EFFECT_APPLICATION_FAILED;
            default:
                return SkillError.UNEXPECTED_ERROR;
        }
    }

    /**
     * 使用可能性エラーをスキルエラーに変換する
     * @param usabilityError 使用可能性エラー
     * @returns スキルエラー
     */
    private convertUsabilityErrorToSkillError(usabilityError?: SkillUsabilityError): SkillError {
        if (!usabilityError) {
            return SkillError.UNEXPECTED_ERROR;
        }

        switch (usabilityError) {
            case SkillUsabilityError.INSUFFICIENT_MP:
                return SkillError.INSUFFICIENT_MP;
            case SkillUsabilityError.SKILL_ON_COOLDOWN:
                return SkillError.SKILL_ON_COOLDOWN;
            case SkillUsabilityError.USAGE_LIMIT_EXCEEDED:
                return SkillError.USAGE_LIMIT_EXCEEDED;
            case SkillUsabilityError.LEVEL_REQUIREMENT_NOT_MET:
                return SkillError.LEVEL_REQUIREMENT_NOT_MET;
            case SkillUsabilityError.WEAPON_REQUIREMENT_NOT_MET:
                return SkillError.WEAPON_REQUIREMENT_NOT_MET;
            case SkillUsabilityError.JOB_REQUIREMENT_NOT_MET:
                return SkillError.JOB_REQUIREMENT_NOT_MET;
            case SkillUsabilityError.INVALID_TARGET:
                return SkillError.INVALID_TARGET;
            case SkillUsabilityError.OUT_OF_RANGE:
                return SkillError.OUT_OF_RANGE;
            case SkillUsabilityError.SKILL_NOT_FOUND:
                return SkillError.SKILL_NOT_FOUND;
            case SkillUsabilityError.CHARACTER_ALREADY_ACTED:
                return SkillError.CHARACTER_ALREADY_ACTED;
            case SkillUsabilityError.CHARACTER_STATUS_PREVENTS_USE:
                return SkillError.CHARACTER_STATUS_PREVENTS_USE;
            default:
                return SkillError.UNEXPECTED_ERROR;
        }
    }

    /**
     * エラー説明を取得する
     * @param error エラー種別
     * @returns エラー説明
     */
    private getErrorDescription(error: SkillError): string {
        switch (error) {
            case SkillError.INSUFFICIENT_MP:
                return 'キャラクターのMPが不足しています。回復アイテムを使用するか、MPを消費しないスキルを選択してください。';
            case SkillError.SKILL_ON_COOLDOWN:
                return 'スキルはクールダウン中です。指定されたターン数が経過するまでお待ちください。';
            case SkillError.INVALID_TARGET:
                return '選択された対象は無効です。スキルの対象種別を確認し、適切な対象を選択してください。';
            case SkillError.OUT_OF_RANGE:
                return '対象が射程外にいます。キャラクターを移動させるか、射程内の対象を選択してください。';
            case SkillError.DATA_CORRUPTION:
                return 'ゲームデータに問題が発生しました。ゲームを再起動することをお勧めします。';
            default:
                return 'エラーの詳細情報は利用できません。';
        }
    }

    /**
     * 音響効果を再生する
     * @param soundKey 音響キー
     * @param volume 音量
     */
    private playSound(soundKey: string, volume: number): void {
        // 実際の音響システムとの統合
        this.emit('play-sound', { soundKey, volume });
        this.log('Sound played', { soundKey, volume });
    }

    /**
     * デバッグ情報を表示する
     * @param data デバッグデータ
     */
    private showDebugInfo(data: any): void {
        console.group('[Skill Error Debug]');
        console.log('Error:', data.error);
        console.log('Message:', data.message);
        console.log('Context:', data.context);
        console.log('Timestamp:', data.timestamp);
        console.groupEnd();
    }

    /**
     * 詳細エラー情報を表示する
     * @param data エラーデータ
     */
    private showDetailedErrorInfo(data: any): void {
        // 詳細エラー情報パネルを表示
        this.emit('show-error-details-panel', data);
    }

    /**
     * 状態復旧成功を処理する
     * @param data 復旧データ
     */
    private handleStateRecoverySuccess(data: any): void {
        this.log('State recovery successful', data);

        // 必要に応じて追加の処理を実行
        this.emit('state-recovery-complete', data);
    }

    /**
     * 戦場状態を復旧する
     * @param data 復旧データ
     */
    private recoverBattlefieldState(data: any): void {
        // 戦場状態の復旧処理
        this.emit('recover-battlefield', data);
        this.log('Battlefield state recovery initiated', data);
    }

    /**
     * UI状態を復旧する
     * @param data 復旧データ
     */
    private recoverUIState(data: any): void {
        // UI状態の復旧処理
        for (const action of data.actions) {
            this.emit(`ui-${action}`, data);
        }
        this.log('UI state recovery initiated', data);
    }

    /**
     * アニメーションをクリーンアップする
     * @param data クリーンアップデータ
     */
    private cleanupAnimations(data: any): void {
        // アニメーションクリーンアップ処理
        for (const action of data.actions) {
            this.emit(`animation-${action}`, data);
        }
        this.log('Animation cleanup initiated', data);
    }

    /**
     * メモリクリーンアップを実行する
     * @param data クリーンアップデータ
     */
    private performMemoryCleanup(data: any): void {
        // メモリクリーンアップ処理
        for (const action of data.actions) {
            this.emit(`memory-${action}`, data);
        }
        this.log('Memory cleanup initiated', data);
    }

    /**
     * 戦闘システム更新を処理する
     * @param data 更新データ
     */
    private handleBattleSystemUpdate(data: any): void {
        // 戦闘システムとの連携処理
        this.emit('battle-system-integration', data);
    }

    /**
     * ターン制システム更新を処理する
     * @param data 更新データ
     */
    private handleTurnSystemUpdate(data: any): void {
        // ターン制システムとの連携処理
        this.emit('turn-system-integration', data);
    }

    /**
     * エラー統計を取得する
     * @returns エラー統計
     */
    getErrorStatistics(): Map<SkillError, number> {
        return this.errorHandler.getErrorStatistics();
    }

    /**
     * エラー履歴を取得する
     * @param limit 取得件数制限
     * @returns エラー履歴
     */
    getErrorHistory(limit?: number) {
        return this.errorHandler.getErrorHistory(limit);
    }

    /**
     * アクティブな通知数を取得する
     * @returns アクティブな通知数
     */
    getActiveNotificationCount(): number {
        return this.userFeedback.getActiveNotificationCount();
    }

    /**
     * 設定を更新する
     * @param config 新しい設定
     */
    updateConfig(config: Partial<ErrorIntegrationConfig>): void {
        this.config = { ...this.config, ...config };

        if (config.errorHandler) {
            this.errorHandler.updateConfig(config.errorHandler);
        }

        if (config.userFeedback) {
            this.userFeedback.updateConfig(config.userFeedback);
        }

        this.log('Configuration updated', this.config);
    }

    /**
     * 全ての通知をクリアする
     */
    clearAllNotifications(): void {
        this.userFeedback.clearAllNotifications();
    }

    /**
     * ログ出力
     * @param message メッセージ
     * @param data 追加データ
     */
    private log(message: string, data?: any): void {
        console.log(`[SkillErrorIntegration] ${message}`, data || '');
    }

    /**
     * システムをリセットする
     */
    reset(): void {
        this.errorHandler.reset();
        this.clearAllNotifications();
        this.log('SkillErrorIntegration reset');
    }

    /**
     * リソースを破棄する
     */
    destroy(): void {
        this.errorHandler.destroy();
        this.userFeedback.destroy();
        this.removeAllListeners();
        this.log('SkillErrorIntegration destroyed');
    }
}