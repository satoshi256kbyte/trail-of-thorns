/**
 * JobSystemErrorHandler - 職業システム固有のエラー処理
 * 
 * このクラスは職業システムで発生するエラーの処理、ユーザーへの適切なエラーメッセージ表示、
 * エラー回復処理、ログ記録とデバッグ支援を提供します。
 * 要件1.5, 2.5, 4.5, 8.5に対応した機能を提供します。
 */

import { JobSystemError, JobSystemContext } from '../../types/job';

/**
 * エラーメッセージ定義
 */
export interface ErrorMessage {
    title: string;
    message: string;
    details?: string;
    actionText?: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * エラーログエントリ
 */
export interface ErrorLogEntry {
    timestamp: Date;
    error: JobSystemError;
    context: JobSystemContext;
    message: string;
    stackTrace?: string;
    userAgent?: string;
    sessionId?: string;
    recovered: boolean;
}

/**
 * エラー回復結果
 */
export interface ErrorRecoveryResult {
    success: boolean;
    message: string;
    actions?: string[];
}

/**
 * エラーハンドラー設定
 */
export interface ErrorHandlerConfig {
    enableLogging: boolean;
    enableUserNotifications: boolean;
    enableAutoRecovery: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    maxLogEntries: number;
    enableStackTrace: boolean;
}

/**
 * JobSystemErrorHandlerクラス
 */
export class JobSystemErrorHandler extends Phaser.Events.EventEmitter {
    private config: ErrorHandlerConfig;
    private errorLog: ErrorLogEntry[] = [];
    private sessionId: string;
    private errorMessages: Map<JobSystemError, ErrorMessage>;

    private static readonly DEFAULT_CONFIG: ErrorHandlerConfig = {
        enableLogging: true,
        enableUserNotifications: true,
        enableAutoRecovery: true,
        logLevel: 'error',
        maxLogEntries: 1000,
        enableStackTrace: true,
    };

    /**
     * ErrorHandlerインスタンスを作成
     * @param config エラーハンドラー設定
     */
    constructor(config?: Partial<ErrorHandlerConfig>) {
        super();

        this.config = { ...JobSystemErrorHandler.DEFAULT_CONFIG, ...config };
        this.sessionId = this.generateSessionId();
        this.errorMessages = this.initializeErrorMessages();

        this.setupGlobalErrorHandlers();
    }

    /**
     * エラーを処理
     * 要件1.5: 職業システム固有のエラー処理
     * 
     * @param error エラー種別
     * @param context エラーコンテキスト
     * @returns エラー処理結果
     */
    public handleError(error: JobSystemError, context: JobSystemContext): ErrorRecoveryResult {
        const timestamp = new Date();
        const errorMessage = this.getErrorMessage(error);

        // エラーログを記録
        if (this.config.enableLogging) {
            this.logError(error, context, errorMessage.message);
        }

        // ユーザー通知を表示
        if (this.config.enableUserNotifications) {
            this.showUserNotification(error, context, errorMessage);
        }

        // エラー回復を試行
        let recoveryResult: ErrorRecoveryResult = {
            success: false,
            message: 'エラー回復に失敗しました',
        };

        if (this.config.enableAutoRecovery) {
            recoveryResult = this.attemptErrorRecovery(error, context);
        }

        // エラーイベントを発行
        this.emit('error_handled', {
            error,
            context,
            timestamp,
            recovered: recoveryResult.success,
        });

        return recoveryResult;
    }

    /**
     * ユーザーへの適切なエラーメッセージ表示
     * 要件2.5: 適切なエラーメッセージ表示
     * 
     * @param error エラー種別
     * @param context エラーコンテキスト
     * @param errorMessage エラーメッセージ
     */
    private showUserNotification(
        error: JobSystemError,
        context: JobSystemContext,
        errorMessage: ErrorMessage
    ): void {
        const notificationData = {
            error,
            context,
            message: errorMessage,
            timestamp: new Date(),
        };

        switch (error) {
            case JobSystemError.INSUFFICIENT_ROSE_ESSENCE:
                this.showRoseEssenceShortageDialog(context, errorMessage);
                break;

            case JobSystemError.LEVEL_REQUIREMENT_NOT_MET:
                this.showLevelRequirementDialog(context, errorMessage);
                break;

            case JobSystemError.PREREQUISITE_SKILLS_MISSING:
                this.showSkillRequirementDialog(context, errorMessage);
                break;

            case JobSystemError.JOB_NOT_FOUND:
                this.showJobNotFoundDialog(context, errorMessage);
                break;

            case JobSystemError.INVALID_RANK:
                this.showInvalidRankDialog(context, errorMessage);
                break;

            case JobSystemError.JOB_CHANGE_NOT_ALLOWED:
                this.showJobChangeNotAllowedDialog(context, errorMessage);
                break;

            case JobSystemError.RANK_UP_NOT_AVAILABLE:
                this.showRankUpNotAvailableDialog(context, errorMessage);
                break;

            case JobSystemError.DATA_CORRUPTION:
                this.showDataCorruptionDialog(context, errorMessage);
                break;

            default:
                this.showGenericErrorDialog(context, errorMessage);
                break;
        }

        this.emit('user_notification_shown', notificationData);
    }

    /**
     * 薔薇の力不足ダイアログを表示
     */
    private showRoseEssenceShortageDialog(context: JobSystemContext, message: ErrorMessage): void {
        const dialogData = {
            title: message.title,
            message: message.message,
            details: `必要な薔薇の力: ${context.requiredRoseEssence || 0}\n現在の薔薇の力: ${context.currentRoseEssence || 0}`,
            buttons: [
                {
                    text: 'ボス戦に挑戦',
                    action: 'navigate_to_boss_battle',
                    style: 'primary',
                },
                {
                    text: '閉じる',
                    action: 'close',
                    style: 'secondary',
                },
            ],
            severity: message.severity,
        };

        this.emit('show_dialog', dialogData);
    }

    /**
     * レベル要件不足ダイアログを表示
     */
    private showLevelRequirementDialog(context: JobSystemContext, message: ErrorMessage): void {
        const dialogData = {
            title: message.title,
            message: message.message,
            details: `必要レベル: ${context.requiredLevel || 0}\n現在のレベル: ${context.currentLevel || 0}`,
            buttons: [
                {
                    text: '戦闘で経験値を獲得',
                    action: 'navigate_to_battle',
                    style: 'primary',
                },
                {
                    text: '閉じる',
                    action: 'close',
                    style: 'secondary',
                },
            ],
            severity: message.severity,
        };

        this.emit('show_dialog', dialogData);
    }

    /**
     * スキル要件不足ダイアログを表示
     */
    private showSkillRequirementDialog(context: JobSystemContext, message: ErrorMessage): void {
        const missingSkills = context.missingSkills || [];
        const skillList = missingSkills.join(', ');

        const dialogData = {
            title: message.title,
            message: message.message,
            details: `不足しているスキル: ${skillList}`,
            buttons: [
                {
                    text: 'スキル習得方法を確認',
                    action: 'show_skill_guide',
                    style: 'primary',
                },
                {
                    text: '閉じる',
                    action: 'close',
                    style: 'secondary',
                },
            ],
            severity: message.severity,
        };

        this.emit('show_dialog', dialogData);
    }

    /**
     * 職業が見つからないダイアログを表示
     */
    private showJobNotFoundDialog(context: JobSystemContext, message: ErrorMessage): void {
        const dialogData = {
            title: message.title,
            message: message.message,
            details: `指定された職業ID: ${context.targetJobId || 'unknown'}`,
            buttons: [
                {
                    text: '職業一覧を確認',
                    action: 'show_job_list',
                    style: 'primary',
                },
                {
                    text: '閉じる',
                    action: 'close',
                    style: 'secondary',
                },
            ],
            severity: message.severity,
        };

        this.emit('show_dialog', dialogData);
    }

    /**
     * 無効なランクダイアログを表示
     */
    private showInvalidRankDialog(context: JobSystemContext, message: ErrorMessage): void {
        const dialogData = {
            title: message.title,
            message: message.message,
            details: `指定されたランク: ${context.targetRank || 0}\n有効な範囲: 1-${context.maxRank || 1}`,
            buttons: [
                {
                    text: '閉じる',
                    action: 'close',
                    style: 'secondary',
                },
            ],
            severity: message.severity,
        };

        this.emit('show_dialog', dialogData);
    }

    /**
     * 職業変更不可ダイアログを表示
     */
    private showJobChangeNotAllowedDialog(context: JobSystemContext, message: ErrorMessage): void {
        const dialogData = {
            title: message.title,
            message: message.message,
            details: context.reason || '職業変更の条件を満たしていません',
            buttons: [
                {
                    text: '条件を確認',
                    action: 'show_job_change_requirements',
                    style: 'primary',
                },
                {
                    text: '閉じる',
                    action: 'close',
                    style: 'secondary',
                },
            ],
            severity: message.severity,
        };

        this.emit('show_dialog', dialogData);
    }

    /**
     * ランクアップ不可ダイアログを表示
     */
    private showRankUpNotAvailableDialog(context: JobSystemContext, message: ErrorMessage): void {
        const dialogData = {
            title: message.title,
            message: message.message,
            details: context.reason || 'ランクアップの条件を満たしていません',
            buttons: [
                {
                    text: '条件を確認',
                    action: 'show_rank_up_requirements',
                    style: 'primary',
                },
                {
                    text: '閉じる',
                    action: 'close',
                    style: 'secondary',
                },
            ],
            severity: message.severity,
        };

        this.emit('show_dialog', dialogData);
    }

    /**
     * データ破損ダイアログを表示
     */
    private showDataCorruptionDialog(context: JobSystemContext, message: ErrorMessage): void {
        const dialogData = {
            title: message.title,
            message: message.message,
            details: 'ゲームデータに問題が検出されました。自動修復を試行します。',
            buttons: [
                {
                    text: '自動修復を実行',
                    action: 'attempt_data_repair',
                    style: 'primary',
                },
                {
                    text: 'データをリセット',
                    action: 'reset_job_data',
                    style: 'warning',
                },
                {
                    text: '閉じる',
                    action: 'close',
                    style: 'secondary',
                },
            ],
            severity: message.severity,
        };

        this.emit('show_dialog', dialogData);
    }

    /**
     * 汎用エラーダイアログを表示
     */
    private showGenericErrorDialog(context: JobSystemContext, message: ErrorMessage): void {
        const dialogData = {
            title: message.title,
            message: message.message,
            details: context.reason || '予期しないエラーが発生しました',
            buttons: [
                {
                    text: '再試行',
                    action: 'retry_operation',
                    style: 'primary',
                },
                {
                    text: '閉じる',
                    action: 'close',
                    style: 'secondary',
                },
            ],
            severity: message.severity,
        };

        this.emit('show_dialog', dialogData);
    }

    /**
     * エラー回復処理
     * 要件8.5: エラー回復処理
     * 
     * @param error エラー種別
     * @param context エラーコンテキスト
     * @returns 回復結果
     */
    public attemptErrorRecovery(error: JobSystemError, context: JobSystemContext): ErrorRecoveryResult {
        try {
            switch (error) {
                case JobSystemError.DATA_CORRUPTION:
                    return this.recoverFromDataCorruption(context);

                case JobSystemError.JOB_NOT_FOUND:
                    return this.recoverFromJobNotFound(context);

                case JobSystemError.INVALID_RANK:
                    return this.recoverFromInvalidRank(context);

                case JobSystemError.INSUFFICIENT_ROSE_ESSENCE:
                    return this.recoverFromInsufficientRoseEssence(context);

                default:
                    return {
                        success: false,
                        message: `エラー ${error} の自動回復は対応していません`,
                    };
            }
        } catch (recoveryError) {
            this.logError(
                JobSystemError.DATA_CORRUPTION,
                context,
                `エラー回復処理中に例外が発生: ${recoveryError}`
            );

            return {
                success: false,
                message: 'エラー回復処理中に問題が発生しました',
            };
        }
    }

    /**
     * データ破損からの回復
     */
    private recoverFromDataCorruption(context: JobSystemContext): ErrorRecoveryResult {
        const actions: string[] = [];

        try {
            // キャラクター職業データの整合性チェック
            if (context.characterId && context.targetJobId) {
                // デフォルト職業に設定
                this.emit('recover_character_job', {
                    characterId: context.characterId,
                    defaultJobId: 'warrior', // デフォルト職業
                    rank: 1,
                });
                actions.push('キャラクター職業をデフォルトに設定');
            }

            // 薔薇の力データの修復
            if (context.currentRoseEssence !== undefined && context.currentRoseEssence < 0) {
                this.emit('recover_rose_essence', { amount: 0 });
                actions.push('薔薇の力を0にリセット');
            }

            return {
                success: true,
                message: 'データ破損を修復しました',
                actions,
            };

        } catch (error) {
            return {
                success: false,
                message: 'データ破損の修復に失敗しました',
            };
        }
    }

    /**
     * 職業が見つからないエラーからの回復
     */
    private recoverFromJobNotFound(context: JobSystemContext): ErrorRecoveryResult {
        if (context.characterId) {
            // デフォルト職業に設定
            this.emit('recover_character_job', {
                characterId: context.characterId,
                defaultJobId: 'warrior',
                rank: 1,
            });

            return {
                success: true,
                message: 'デフォルト職業（戦士）に設定しました',
                actions: ['デフォルト職業に変更'],
            };
        }

        return {
            success: false,
            message: 'キャラクターIDが不明なため回復できません',
        };
    }

    /**
     * 無効なランクエラーからの回復
     */
    private recoverFromInvalidRank(context: JobSystemContext): ErrorRecoveryResult {
        if (context.characterId && context.targetRank !== undefined) {
            const validRank = Math.max(1, Math.min(context.targetRank, context.maxRank || 1));

            this.emit('recover_character_rank', {
                characterId: context.characterId,
                validRank,
            });

            return {
                success: true,
                message: `ランクを有効な値（${validRank}）に修正しました`,
                actions: [`ランクを${validRank}に修正`],
            };
        }

        return {
            success: false,
            message: '必要な情報が不足しているため回復できません',
        };
    }

    /**
     * 薔薇の力不足エラーからの回復
     */
    private recoverFromInsufficientRoseEssence(context: JobSystemContext): ErrorRecoveryResult {
        // 薔薇の力不足は自動回復できないが、ユーザーガイダンスを提供
        const shortage = (context.requiredRoseEssence || 0) - (context.currentRoseEssence || 0);

        return {
            success: false,
            message: `薔薇の力が${shortage}不足しています。ボス戦で薔薇の力を獲得してください。`,
            actions: ['ボス戦への案内'],
        };
    }

    /**
     * エラーログを記録
     * 要件8.5: ログ記録とデバッグ支援
     * 
     * @param error エラー種別
     * @param context エラーコンテキスト
     * @param message エラーメッセージ
     */
    private logError(error: JobSystemError, context: JobSystemContext, message: string): void {
        const logEntry: ErrorLogEntry = {
            timestamp: new Date(),
            error,
            context,
            message,
            stackTrace: this.config.enableStackTrace ? new Error().stack : undefined,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            sessionId: this.sessionId,
            recovered: false,
        };

        this.errorLog.push(logEntry);

        // ログサイズ制限
        if (this.errorLog.length > this.config.maxLogEntries) {
            this.errorLog.shift();
        }

        // コンソール出力
        if (this.shouldLog(message)) {
            console.error(`[JobSystem Error] ${error}:`, {
                message,
                context,
                timestamp: logEntry.timestamp.toISOString(),
            });
        }

        // エラーログイベントを発行
        this.emit('error_logged', logEntry);
    }

    /**
     * ログレベルに基づいてログ出力を判定
     */
    private shouldLog(message: string): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.config.logLevel);
        const errorLevelIndex = levels.indexOf('error');

        return errorLevelIndex >= currentLevelIndex;
    }

    /**
     * エラーメッセージを初期化
     */
    private initializeErrorMessages(): Map<JobSystemError, ErrorMessage> {
        const messages = new Map<JobSystemError, ErrorMessage>();

        messages.set(JobSystemError.JOB_NOT_FOUND, {
            title: '職業が見つかりません',
            message: '指定された職業が存在しません。',
            details: '職業データが正しく読み込まれているか確認してください。',
            severity: 'error',
        });

        messages.set(JobSystemError.INVALID_RANK, {
            title: '無効なランク',
            message: '指定されたランクが有効な範囲外です。',
            details: 'ランクは1以上、職業の最大ランク以下である必要があります。',
            severity: 'error',
        });

        messages.set(JobSystemError.INSUFFICIENT_ROSE_ESSENCE, {
            title: '薔薇の力が不足しています',
            message: 'ランクアップに必要な薔薇の力が足りません。',
            details: 'ボス戦で薔薇の力を獲得してください。',
            actionText: 'ボス戦に挑戦',
            severity: 'warning',
        });

        messages.set(JobSystemError.LEVEL_REQUIREMENT_NOT_MET, {
            title: 'レベルが不足しています',
            message: 'ランクアップに必要なレベルに達していません。',
            details: '戦闘で経験値を獲得してレベルアップしてください。',
            actionText: '戦闘に参加',
            severity: 'warning',
        });

        messages.set(JobSystemError.PREREQUISITE_SKILLS_MISSING, {
            title: '必要なスキルが不足しています',
            message: 'ランクアップに必要なスキルを習得していません。',
            details: '指定されたスキルを習得してから再度お試しください。',
            actionText: 'スキル習得方法を確認',
            severity: 'warning',
        });

        messages.set(JobSystemError.JOB_CHANGE_NOT_ALLOWED, {
            title: '職業変更できません',
            message: '現在の状況では職業を変更できません。',
            details: '職業変更の条件を確認してください。',
            severity: 'warning',
        });

        messages.set(JobSystemError.RANK_UP_NOT_AVAILABLE, {
            title: 'ランクアップできません',
            message: '現在の状況ではランクアップできません。',
            details: 'ランクアップの条件を確認してください。',
            severity: 'warning',
        });

        messages.set(JobSystemError.DATA_CORRUPTION, {
            title: 'データエラー',
            message: 'ゲームデータに問題が検出されました。',
            details: '自動修復を試行するか、データをリセットしてください。',
            actionText: '自動修復を実行',
            severity: 'critical',
        });

        return messages;
    }

    /**
     * エラーメッセージを取得
     */
    private getErrorMessage(error: JobSystemError): ErrorMessage {
        return this.errorMessages.get(error) || {
            title: '予期しないエラー',
            message: '予期しないエラーが発生しました。',
            details: 'しばらく時間をおいて再度お試しください。',
            severity: 'error',
        };
    }

    /**
     * セッションIDを生成
     */
    private generateSessionId(): string {
        return `job_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * グローバルエラーハンドラーを設定
     */
    private setupGlobalErrorHandlers(): void {
        // 未処理の例外をキャッチ
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                if (event.error && event.error.message?.includes('JobSystem')) {
                    this.logError(
                        JobSystemError.DATA_CORRUPTION,
                        { error: JobSystemError.DATA_CORRUPTION },
                        `未処理の例外: ${event.error.message}`
                    );
                }
            });

            window.addEventListener('unhandledrejection', (event) => {
                if (event.reason && event.reason.message?.includes('JobSystem')) {
                    this.logError(
                        JobSystemError.DATA_CORRUPTION,
                        { error: JobSystemError.DATA_CORRUPTION },
                        `未処理のPromise拒否: ${event.reason.message}`
                    );
                }
            });
        }
    }

    /**
     * エラーログを取得
     * 
     * @param limit 取得件数制限
     * @returns エラーログ配列
     */
    public getErrorLog(limit?: number): ErrorLogEntry[] {
        const logs = [...this.errorLog].reverse(); // 新しい順
        return limit ? logs.slice(0, limit) : logs;
    }

    /**
     * エラー統計を取得
     */
    public getErrorStatistics(): any {
        const stats = {
            totalErrors: this.errorLog.length,
            errorsByType: new Map<JobSystemError, number>(),
            errorsByHour: new Map<string, number>(),
            recoveryRate: 0,
        };

        let recoveredCount = 0;

        for (const entry of this.errorLog) {
            // エラー種別別の統計
            const currentCount = stats.errorsByType.get(entry.error) || 0;
            stats.errorsByType.set(entry.error, currentCount + 1);

            // 時間別の統計
            const hour = entry.timestamp.toISOString().substr(0, 13);
            const hourCount = stats.errorsByHour.get(hour) || 0;
            stats.errorsByHour.set(hour, hourCount + 1);

            // 回復率の計算
            if (entry.recovered) {
                recoveredCount++;
            }
        }

        stats.recoveryRate = this.errorLog.length > 0 ? recoveredCount / this.errorLog.length : 0;

        return stats;
    }

    /**
     * エラーログをクリア
     */
    public clearErrorLog(): void {
        this.errorLog = [];
        this.emit('error_log_cleared');
    }

    /**
     * エラーログをエクスポート
     */
    public exportErrorLog(): string {
        const exportData = {
            sessionId: this.sessionId,
            exportTime: new Date().toISOString(),
            config: this.config,
            statistics: this.getErrorStatistics(),
            logs: this.errorLog,
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 設定を更新
     */
    public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.emit('config_updated', this.config);
    }

    /**
     * リソースを破棄
     */
    public destroy(): void {
        this.clearErrorLog();
        this.removeAllListeners();
    }
}