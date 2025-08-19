/**
 * ExperienceErrorHandler - 経験値システムエラーハンドリング
 * 
 * このクラスは経験値システムで発生する各種エラーの分類、処理、回復を行います:
 * - エラーの分類と適切な処理戦略の決定
 * - データ不正、キャラクター不存在等の検出と回復処理
 * - エラー発生時のユーザー通知とガイダンス表示
 * - 経験値処理中断時の状態復旧とクリーンアップ処理
 * - 経験値システムの堅牢性向上とユーザビリティ改善
 * 
 * 要件: 全要件のエラーハンドリング
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import * as Phaser from 'phaser';
import {
    ExperienceError,
    ExperiencePersistenceError,
    ExperienceInfo,
    ExperienceTableData,
    GrowthRates,
    StatLimits,
    UnitStats,
    ExperienceBackupData,
    ExperienceRecoveryOptions
} from '../../types/experience';

/**
 * エラー回復戦略
 */
export enum ErrorRecoveryStrategy {
    RETRY = 'retry',                    // 再試行
    FALLBACK = 'fallback',              // フォールバック値使用
    SKIP = 'skip',                      // 処理をスキップ
    RESET = 'reset',                    // データをリセット
    RESTORE_BACKUP = 'restore_backup',  // バックアップから復元
    USER_INTERVENTION = 'user_intervention', // ユーザー介入が必要
    SYSTEM_SHUTDOWN = 'system_shutdown' // システム停止
}

/**
 * エラー重要度レベル
 */
export enum ErrorSeverity {
    LOW = 'low',        // 軽微（警告レベル）
    MEDIUM = 'medium',  // 中程度（処理継続可能）
    HIGH = 'high',      // 重要（機能制限あり）
    CRITICAL = 'critical' // 致命的（システム停止）
}

/**
 * ユーザー通知タイプ
 */
export enum NotificationType {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    SUCCESS = 'success'
}

/**
 * ユーザー通知情報
 */
export interface UserNotification {
    type: NotificationType;
    title: string;
    message: string;
    details?: string;
    actionRequired?: boolean;
    suggestedActions?: string[];
    autoHide?: boolean;
    duration?: number;
}

/**
 * エラー回復結果
 */
export interface ErrorRecoveryResult {
    success: boolean;
    strategy: ErrorRecoveryStrategy;
    recoveredData?: any;
    userNotification?: UserNotification;
    requiresUserAction?: boolean;
    canContinue?: boolean;
    message?: string;
}

/**
 * エラーコンテキスト
 */
export interface ErrorContext {
    characterId?: string;
    operation?: string;
    details?: any;
    timestamp?: number;
    stackTrace?: string;
    systemState?: any;
}

/**
 * エラー統計情報
 */
export interface ErrorStatistics {
    totalErrors: number;
    errorsByType: Map<ExperienceError, number>;
    errorsBySeverity: Map<ErrorSeverity, number>;
    recoverySuccessRate: number;
    lastErrorTime: number;
    frequentErrors: Array<{ error: ExperienceError; count: number }>;
}

/**
 * ExperienceErrorHandlerクラス
 * 経験値システムのエラーハンドリングを統合管理
 */
export class ExperienceErrorHandler {
    private eventEmitter: Phaser.Events.EventEmitter;
    private backupData: Map<string, ExperienceBackupData[]> = new Map();
    private errorStatistics: ErrorStatistics;
    private recoveryOptions: ExperienceRecoveryOptions;
    private maxBackupCount: number = 5;
    private maxRetryCount: number = 3;
    private retryAttempts: Map<string, number> = new Map();

    // デフォルト値
    private defaultExperienceTable: ExperienceTableData;
    private defaultGrowthRates: GrowthRates;
    private defaultStatLimits: StatLimits;

    constructor() {
        this.eventEmitter = new Phaser.Events.EventEmitter();

        this.errorStatistics = {
            totalErrors: 0,
            errorsByType: new Map(),
            errorsBySeverity: new Map(),
            recoverySuccessRate: 0,
            lastErrorTime: 0,
            frequentErrors: []
        };

        this.recoveryOptions = {
            useBackup: true,
            useSaveDataRecovery: true,
            resetCorruptedData: true,
            useDefaultValues: true,
            preserveProgress: true,
            attemptPartialRecovery: true,
            notifyUser: true
        };

        this.initializeDefaultValues();
    }

    /**
     * エラーハンドリングのメイン処理
     */
    public handleError(
        error: ExperienceError,
        context: ErrorContext = {}
    ): ErrorRecoveryResult {
        const timestamp = Date.now();
        const errorKey = this.generateErrorKey(error, context);

        // エラー統計を更新
        this.updateErrorStatistics(error, timestamp);

        // エラーの重要度を判定
        const severity = this.determineErrorSeverity(error, context);

        // 回復戦略を決定
        const strategy = this.determineRecoveryStrategy(error, severity, context);

        // エラーログを記録
        this.logError(error, context, severity, strategy, timestamp);

        // 回復処理を実行
        const recoveryResult = this.executeRecoveryStrategy(error, strategy, context);

        // ユーザー通知を生成
        if (this.recoveryOptions.notifyUser && recoveryResult.userNotification) {
            this.notifyUser(recoveryResult.userNotification);
        }

        // エラーイベントを発行
        this.eventEmitter.emit('experience-error-handled', {
            error,
            context,
            severity,
            strategy,
            result: recoveryResult,
            timestamp
        });

        return recoveryResult;
    }

    /**
     * キャラクターの経験値データをバックアップ
     */
    public saveBackup(characterId: string, experienceInfo: ExperienceInfo): void {
        try {
            const backup: ExperienceBackupData = {
                characterId,
                experienceInfo: { ...experienceInfo },
                timestamp: Date.now(),
                source: 'auto_backup'
            };

            if (!this.backupData.has(characterId)) {
                this.backupData.set(characterId, []);
            }

            const backups = this.backupData.get(characterId)!;
            backups.push(backup);

            // 古いバックアップを削除
            if (backups.length > this.maxBackupCount) {
                backups.shift();
            }

            console.log(`Backup saved for character ${characterId}`);

        } catch (error) {
            console.error(`Failed to save backup for character ${characterId}:`, error);
        }
    }

    /**
     * バックアップからデータを復元
     */
    public restoreFromBackup(characterId: string): ExperienceInfo | null {
        try {
            const backups = this.backupData.get(characterId);
            if (!backups || backups.length === 0) {
                return null;
            }

            // 最新のバックアップを取得
            const latestBackup = backups[backups.length - 1];
            console.log(`Restored backup for character ${characterId} from ${new Date(latestBackup.timestamp)}`);

            return latestBackup.experienceInfo;

        } catch (error) {
            console.error(`Failed to restore backup for character ${characterId}:`, error);
            return null;
        }
    }

    /**
     * 破損したデータの修復を試行
     */
    public attemptDataRepair(
        characterId: string,
        corruptedData: any
    ): ExperienceInfo | null {
        try {
            console.log(`Attempting to repair data for character ${characterId}`);

            // 基本的な修復処理
            const repairedInfo: ExperienceInfo = {
                characterId,
                currentExperience: this.sanitizeNumber(corruptedData?.currentExperience, 0),
                currentLevel: this.sanitizeNumber(corruptedData?.currentLevel, 1, 1, 99),
                experienceToNextLevel: this.sanitizeNumber(corruptedData?.experienceToNextLevel, 100),
                totalExperience: this.sanitizeNumber(corruptedData?.totalExperience, 0),
                canLevelUp: Boolean(corruptedData?.canLevelUp),
                isMaxLevel: Boolean(corruptedData?.isMaxLevel),
                experienceProgress: this.sanitizeNumber(corruptedData?.experienceProgress, 0, 0, 1)
            };

            // データの整合性をチェック
            if (this.validateRepairedData(repairedInfo)) {
                console.log(`Successfully repaired data for character ${characterId}`);
                return repairedInfo;
            } else {
                console.warn(`Repaired data validation failed for character ${characterId}`);
                return null;
            }

        } catch (error) {
            console.error(`Failed to repair data for character ${characterId}:`, error);
            return null;
        }
    }

    /**
     * システム状態のクリーンアップ
     */
    public cleanupSystemState(characterId?: string): void {
        try {
            if (characterId) {
                // 特定キャラクターのクリーンアップ
                this.retryAttempts.delete(characterId);
                console.log(`Cleaned up system state for character ${characterId}`);
            } else {
                // 全体のクリーンアップ
                this.retryAttempts.clear();
                console.log('Cleaned up all system state');
            }

            this.eventEmitter.emit('system-state-cleaned', { characterId });

        } catch (error) {
            console.error('Failed to cleanup system state:', error);
        }
    }

    /**
     * エラー統計情報を取得
     */
    public getErrorStatistics(): ErrorStatistics {
        return {
            ...this.errorStatistics,
            errorsByType: new Map(this.errorStatistics.errorsByType),
            errorsBySeverity: new Map(this.errorStatistics.errorsBySeverity),
            frequentErrors: [...this.errorStatistics.frequentErrors]
        };
    }

    /**
     * 回復オプションを設定
     */
    public setRecoveryOptions(options: Partial<ExperienceRecoveryOptions>): void {
        this.recoveryOptions = { ...this.recoveryOptions, ...options };
        console.log('Recovery options updated:', this.recoveryOptions);
    }

    /**
     * イベントリスナーを追加
     */
    public on(event: string, listener: (...args: any[]) => void): void {
        this.eventEmitter.on(event, listener);
    }

    /**
     * イベントリスナーを削除
     */
    public off(event: string, listener: (...args: any[]) => void): void {
        this.eventEmitter.off(event, listener);
    }

    // ===== プライベートメソッド =====

    /**
     * デフォルト値を初期化
     */
    private initializeDefaultValues(): void {
        this.defaultExperienceTable = {
            levelRequirements: [
                0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
                3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450
            ],
            experienceGains: {
                attackHit: 5,
                enemyDefeat: 25,
                allySupport: 10,
                healing: 8
            },
            maxLevel: 20
        };

        this.defaultGrowthRates = {
            hp: 65,
            mp: 45,
            attack: 55,
            defense: 50,
            speed: 40,
            skill: 45,
            luck: 35
        };

        this.defaultStatLimits = {
            maxHP: 999,
            maxMP: 999,
            attack: 99,
            defense: 99,
            speed: 99,
            skill: 99,
            luck: 99
        };
    }

    /**
     * エラーの重要度を判定
     */
    private determineErrorSeverity(error: ExperienceError, context: ErrorContext): ErrorSeverity {
        switch (error) {
            case ExperienceError.SYSTEM_NOT_INITIALIZED:
            case ExperienceError.EXPERIENCE_TABLE_INVALID:
                return ErrorSeverity.CRITICAL;

            case ExperienceError.LEVEL_UP_FAILED:
            case ExperienceError.PERSISTENCE_ERROR:
                return ErrorSeverity.HIGH;

            case ExperienceError.INVALID_CHARACTER:
            case ExperienceError.GROWTH_RATE_INVALID:
                return ErrorSeverity.MEDIUM;

            case ExperienceError.MAX_LEVEL_REACHED:
            case ExperienceError.INVALID_EXPERIENCE_AMOUNT:
            case ExperienceError.STAT_LIMIT_EXCEEDED:
                return ErrorSeverity.LOW;

            default:
                return ErrorSeverity.MEDIUM;
        }
    }

    /**
     * 回復戦略を決定
     */
    private determineRecoveryStrategy(
        error: ExperienceError,
        severity: ErrorSeverity,
        context: ErrorContext
    ): ErrorRecoveryStrategy {
        const errorKey = this.generateErrorKey(error, context);
        const retryCount = this.retryAttempts.get(errorKey) || 0;

        // 再試行回数が上限に達している場合
        if (retryCount >= this.maxRetryCount) {
            switch (severity) {
                case ErrorSeverity.CRITICAL:
                    return ErrorRecoveryStrategy.SYSTEM_SHUTDOWN;
                case ErrorSeverity.HIGH:
                    return ErrorRecoveryStrategy.RESTORE_BACKUP;
                default:
                    return ErrorRecoveryStrategy.FALLBACK;
            }
        }

        // エラー種別による戦略決定
        switch (error) {
            case ExperienceError.SYSTEM_NOT_INITIALIZED:
                return retryCount < 2 ? ErrorRecoveryStrategy.RETRY : ErrorRecoveryStrategy.SYSTEM_SHUTDOWN;

            case ExperienceError.INVALID_CHARACTER:
                return this.recoveryOptions.useBackup ?
                    ErrorRecoveryStrategy.RESTORE_BACKUP : ErrorRecoveryStrategy.SKIP;

            case ExperienceError.MAX_LEVEL_REACHED:
                return ErrorRecoveryStrategy.SKIP;

            case ExperienceError.INVALID_EXPERIENCE_AMOUNT:
                return ErrorRecoveryStrategy.FALLBACK;

            case ExperienceError.EXPERIENCE_TABLE_INVALID:
            case ExperienceError.GROWTH_RATE_INVALID:
                return this.recoveryOptions.useDefaultValues ?
                    ErrorRecoveryStrategy.FALLBACK : ErrorRecoveryStrategy.SYSTEM_SHUTDOWN;

            case ExperienceError.STAT_LIMIT_EXCEEDED:
                return ErrorRecoveryStrategy.FALLBACK;

            case ExperienceError.LEVEL_UP_FAILED:
                return this.recoveryOptions.useBackup ?
                    ErrorRecoveryStrategy.RESTORE_BACKUP : ErrorRecoveryStrategy.SKIP;

            case ExperienceError.PERSISTENCE_ERROR:
                return retryCount < 2 ? ErrorRecoveryStrategy.RETRY : ErrorRecoveryStrategy.SKIP;

            default:
                return ErrorRecoveryStrategy.FALLBACK;
        }
    }

    /**
     * 回復戦略を実行
     */
    private executeRecoveryStrategy(
        error: ExperienceError,
        strategy: ErrorRecoveryStrategy,
        context: ErrorContext
    ): ErrorRecoveryResult {
        const errorKey = this.generateErrorKey(error, context);

        switch (strategy) {
            case ErrorRecoveryStrategy.RETRY:
                return this.executeRetryStrategy(errorKey, error, context);

            case ErrorRecoveryStrategy.FALLBACK:
                return this.executeFallbackStrategy(error, context);

            case ErrorRecoveryStrategy.SKIP:
                return this.executeSkipStrategy(error, context);

            case ErrorRecoveryStrategy.RESET:
                return this.executeResetStrategy(error, context);

            case ErrorRecoveryStrategy.RESTORE_BACKUP:
                return this.executeRestoreBackupStrategy(error, context);

            case ErrorRecoveryStrategy.USER_INTERVENTION:
                return this.executeUserInterventionStrategy(error, context);

            case ErrorRecoveryStrategy.SYSTEM_SHUTDOWN:
                return this.executeSystemShutdownStrategy(error, context);

            default:
                return {
                    success: false,
                    strategy,
                    canContinue: false,
                    message: `Unknown recovery strategy: ${strategy}`
                };
        }
    }

    /**
     * 再試行戦略を実行
     */
    private executeRetryStrategy(
        errorKey: string,
        error: ExperienceError,
        context: ErrorContext
    ): ErrorRecoveryResult {
        const retryCount = (this.retryAttempts.get(errorKey) || 0) + 1;
        this.retryAttempts.set(errorKey, retryCount);

        return {
            success: true,
            strategy: ErrorRecoveryStrategy.RETRY,
            canContinue: true,
            message: `Retry attempt ${retryCount}/${this.maxRetryCount}`,
            userNotification: {
                type: NotificationType.INFO,
                title: '処理を再試行中',
                message: `${this.getErrorDisplayName(error)}の処理を再試行しています...`,
                autoHide: true,
                duration: 3000
            }
        };
    }

    /**
     * フォールバック戦略を実行
     */
    private executeFallbackStrategy(
        error: ExperienceError,
        context: ErrorContext
    ): ErrorRecoveryResult {
        let recoveredData: any = null;
        let message = '';

        switch (error) {
            case ExperienceError.INVALID_EXPERIENCE_AMOUNT:
                recoveredData = 0;
                message = 'Invalid experience amount set to 0';
                break;

            case ExperienceError.EXPERIENCE_TABLE_INVALID:
                recoveredData = this.defaultExperienceTable;
                message = 'Using default experience table';
                break;

            case ExperienceError.GROWTH_RATE_INVALID:
                recoveredData = this.defaultGrowthRates;
                message = 'Using default growth rates';
                break;

            case ExperienceError.STAT_LIMIT_EXCEEDED:
                recoveredData = this.defaultStatLimits;
                message = 'Applied stat limits';
                break;

            case ExperienceError.DATA_NOT_FOUND:
                if (context.characterId) {
                    recoveredData = this.createDefaultExperienceInfo(context.characterId);
                    message = 'Created default experience info';
                }
                break;

            default:
                message = 'Applied fallback values';
                break;
        }

        return {
            success: true,
            strategy: ErrorRecoveryStrategy.FALLBACK,
            recoveredData,
            canContinue: true,
            message,
            userNotification: {
                type: NotificationType.WARNING,
                title: 'デフォルト値を使用',
                message: `${this.getErrorDisplayName(error)}のため、デフォルト値を使用します。`,
                autoHide: true,
                duration: 5000
            }
        };
    }

    /**
     * スキップ戦略を実行
     */
    private executeSkipStrategy(
        error: ExperienceError,
        context: ErrorContext
    ): ErrorRecoveryResult {
        return {
            success: true,
            strategy: ErrorRecoveryStrategy.SKIP,
            canContinue: true,
            message: 'Operation skipped due to error',
            userNotification: {
                type: NotificationType.INFO,
                title: '処理をスキップ',
                message: `${this.getErrorDisplayName(error)}のため、この処理をスキップしました。`,
                autoHide: true,
                duration: 4000
            }
        };
    }

    /**
     * リセット戦略を実行
     */
    private executeResetStrategy(
        error: ExperienceError,
        context: ErrorContext
    ): ErrorRecoveryResult {
        if (context.characterId) {
            this.cleanupSystemState(context.characterId);
        }

        return {
            success: true,
            strategy: ErrorRecoveryStrategy.RESET,
            canContinue: true,
            message: 'System state reset',
            userNotification: {
                type: NotificationType.WARNING,
                title: 'データをリセット',
                message: `${this.getErrorDisplayName(error)}のため、データをリセットしました。`,
                autoHide: true,
                duration: 5000
            }
        };
    }

    /**
     * バックアップ復元戦略を実行
     */
    private executeRestoreBackupStrategy(
        error: ExperienceError,
        context: ErrorContext
    ): ErrorRecoveryResult {
        if (!context.characterId) {
            return {
                success: false,
                strategy: ErrorRecoveryStrategy.RESTORE_BACKUP,
                canContinue: false,
                message: 'No character ID provided for backup restoration'
            };
        }

        const restoredData = this.restoreFromBackup(context.characterId);

        if (restoredData) {
            return {
                success: true,
                strategy: ErrorRecoveryStrategy.RESTORE_BACKUP,
                recoveredData: restoredData,
                canContinue: true,
                message: 'Data restored from backup',
                userNotification: {
                    type: NotificationType.SUCCESS,
                    title: 'データを復元',
                    message: `バックアップからデータを復元しました。`,
                    autoHide: true,
                    duration: 4000
                }
            };
        } else {
            return {
                success: false,
                strategy: ErrorRecoveryStrategy.RESTORE_BACKUP,
                canContinue: false,
                message: 'No backup available for restoration',
                userNotification: {
                    type: NotificationType.ERROR,
                    title: 'バックアップなし',
                    message: `復元可能なバックアップが見つかりませんでした。`,
                    autoHide: true,
                    duration: 5000
                }
            };
        }
    }

    /**
     * ユーザー介入戦略を実行
     */
    private executeUserInterventionStrategy(
        error: ExperienceError,
        context: ErrorContext
    ): ErrorRecoveryResult {
        return {
            success: false,
            strategy: ErrorRecoveryStrategy.USER_INTERVENTION,
            requiresUserAction: true,
            canContinue: false,
            message: 'User intervention required',
            userNotification: {
                type: NotificationType.ERROR,
                title: 'ユーザー操作が必要',
                message: `${this.getErrorDisplayName(error)}の解決にはユーザー操作が必要です。`,
                actionRequired: true,
                suggestedActions: [
                    'ゲームを再起動してください',
                    'セーブデータを確認してください',
                    'サポートにお問い合わせください'
                ],
                autoHide: false
            }
        };
    }

    /**
     * システム停止戦略を実行
     */
    private executeSystemShutdownStrategy(
        error: ExperienceError,
        context: ErrorContext
    ): ErrorRecoveryResult {
        return {
            success: false,
            strategy: ErrorRecoveryStrategy.SYSTEM_SHUTDOWN,
            canContinue: false,
            message: 'System shutdown required due to critical error',
            userNotification: {
                type: NotificationType.ERROR,
                title: '致命的エラー',
                message: `致命的なエラーが発生しました。ゲームを再起動してください。`,
                actionRequired: true,
                suggestedActions: [
                    'ゲームを再起動してください',
                    'ブラウザのキャッシュをクリアしてください',
                    'サポートにお問い合わせください'
                ],
                autoHide: false
            }
        };
    }

    /**
     * エラー統計を更新
     */
    private updateErrorStatistics(error: ExperienceError, timestamp: number): void {
        this.errorStatistics.totalErrors++;
        this.errorStatistics.lastErrorTime = timestamp;

        // エラー種別別の統計
        const currentCount = this.errorStatistics.errorsByType.get(error) || 0;
        this.errorStatistics.errorsByType.set(error, currentCount + 1);

        // 頻出エラーの更新
        this.updateFrequentErrors(error);
    }

    /**
     * 頻出エラーを更新
     */
    private updateFrequentErrors(error: ExperienceError): void {
        const existingIndex = this.errorStatistics.frequentErrors.findIndex(
            item => item.error === error
        );

        if (existingIndex >= 0) {
            this.errorStatistics.frequentErrors[existingIndex].count++;
        } else {
            this.errorStatistics.frequentErrors.push({ error, count: 1 });
        }

        // 頻度順にソート
        this.errorStatistics.frequentErrors.sort((a, b) => b.count - a.count);

        // 上位10件のみ保持
        if (this.errorStatistics.frequentErrors.length > 10) {
            this.errorStatistics.frequentErrors = this.errorStatistics.frequentErrors.slice(0, 10);
        }
    }

    /**
     * エラーキーを生成
     */
    private generateErrorKey(error: ExperienceError, context: ErrorContext): string {
        return `${error}_${context.characterId || 'global'}_${context.operation || 'unknown'}`;
    }

    /**
     * エラーをログに記録
     */
    private logError(
        error: ExperienceError,
        context: ErrorContext,
        severity: ErrorSeverity,
        strategy: ErrorRecoveryStrategy,
        timestamp: number
    ): void {
        const logLevel = severity === ErrorSeverity.CRITICAL ? 'error' :
            severity === ErrorSeverity.HIGH ? 'warn' : 'info';

        const logMessage = `[ExperienceError] ${error} | Severity: ${severity} | Strategy: ${strategy} | Context: ${JSON.stringify(context)}`;

        console[logLevel](logMessage);

        // 詳細ログをデバッグモードで出力
        if (process.env.NODE_ENV === 'development') {
            console.debug('Error details:', {
                error,
                context,
                severity,
                strategy,
                timestamp: new Date(timestamp).toISOString()
            });
        }
    }

    /**
     * ユーザーに通知
     */
    private notifyUser(notification: UserNotification): void {
        // イベントを発行してUIシステムに通知
        this.eventEmitter.emit('user-notification', notification);

        // コンソールにも出力
        const logLevel = notification.type === NotificationType.ERROR ? 'error' :
            notification.type === NotificationType.WARNING ? 'warn' : 'info';

        console[logLevel](`[User Notification] ${notification.title}: ${notification.message}`);
    }

    /**
     * エラーの表示名を取得
     */
    private getErrorDisplayName(error: ExperienceError): string {
        const displayNames: Record<ExperienceError, string> = {
            [ExperienceError.DATA_NOT_FOUND]: 'データが見つかりません',
            [ExperienceError.INVALID_CHARACTER]: '無効なキャラクター',
            [ExperienceError.MAX_LEVEL_REACHED]: '最大レベルに到達',
            [ExperienceError.INVALID_EXPERIENCE_AMOUNT]: '無効な経験値量',
            [ExperienceError.EXPERIENCE_TABLE_INVALID]: '経験値テーブルが無効',
            [ExperienceError.GROWTH_RATE_INVALID]: '成長率が無効',
            [ExperienceError.STAT_LIMIT_EXCEEDED]: '能力値上限超過',
            [ExperienceError.LEVEL_UP_FAILED]: 'レベルアップ失敗',
            [ExperienceError.SYSTEM_NOT_INITIALIZED]: 'システム未初期化',
            [ExperienceError.PERSISTENCE_ERROR]: 'データ保存エラー'
        };

        return displayNames[error] || 'エラー';
    }

    /**
     * 数値をサニタイズ
     */
    private sanitizeNumber(
        value: any,
        defaultValue: number,
        min?: number,
        max?: number
    ): number {
        let result = typeof value === 'number' && !isNaN(value) ? value : defaultValue;

        if (min !== undefined && result < min) {
            result = min;
        }

        if (max !== undefined && result > max) {
            result = max;
        }

        return result;
    }

    /**
     * 修復されたデータを検証
     */
    private validateRepairedData(data: ExperienceInfo): boolean {
        try {
            return (
                typeof data.characterId === 'string' &&
                data.characterId.length > 0 &&
                typeof data.currentExperience === 'number' &&
                data.currentExperience >= 0 &&
                typeof data.currentLevel === 'number' &&
                data.currentLevel >= 1 &&
                data.currentLevel <= 99 &&
                typeof data.experienceToNextLevel === 'number' &&
                data.experienceToNextLevel >= 0 &&
                typeof data.totalExperience === 'number' &&
                data.totalExperience >= 0 &&
                typeof data.experienceProgress === 'number' &&
                data.experienceProgress >= 0 &&
                data.experienceProgress <= 1
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * デフォルトの経験値情報を作成
     */
    private createDefaultExperienceInfo(characterId: string): ExperienceInfo {
        return {
            characterId,
            currentExperience: 0,
            currentLevel: 1,
            experienceToNextLevel: 100,
            totalExperience: 0,
            canLevelUp: false,
            isMaxLevel: false,
            experienceProgress: 0
        };
    }
}