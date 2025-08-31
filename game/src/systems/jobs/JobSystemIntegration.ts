/**
 * JobSystemIntegration - エラーハンドリングとユーザーフィードバックの統合
 * 
 * このクラスはJobSystemにエラーハンドリング、ユーザーフィードバック、
 * デバッグ機能を統合します。
 * 要件1.5, 2.5, 4.5, 8.5に対応した機能を提供します。
 */

import { JobSystemErrorHandler } from './JobSystemErrorHandler';
import { JobSystemUserFeedback } from './JobSystemUserFeedback';
import { JobSystemDebugger } from './JobSystemDebugger';
import { JobSystemError, JobSystemContext } from '../../types/job';

/**
 * 統合システム設定
 */
export interface IntegrationConfig {
    enableErrorHandling: boolean;
    enableUserFeedback: boolean;
    enableDebugger: boolean;
    errorHandlerConfig?: any;
    feedbackConfig?: any;
    debuggerConfig?: any;
}

/**
 * JobSystemIntegrationクラス
 */
export class JobSystemIntegration extends Phaser.Events.EventEmitter {
    private errorHandler?: JobSystemErrorHandler;
    private userFeedback?: JobSystemUserFeedback;
    private debugger?: JobSystemDebugger;
    private config: IntegrationConfig;

    private static readonly DEFAULT_CONFIG: IntegrationConfig = {
        enableErrorHandling: true,
        enableUserFeedback: true,
        enableDebugger: false,
    };

    /**
     * Integrationインスタンスを作成
     * @param config 統合設定
     */
    constructor(config?: Partial<IntegrationConfig>) {
        super();

        this.config = { ...JobSystemIntegration.DEFAULT_CONFIG, ...config };
        this.initializeComponents();
        this.setupIntegration();
    }

    /**
     * コンポーネントを初期化
     */
    private initializeComponents(): void {
        // エラーハンドラーを初期化
        if (this.config.enableErrorHandling) {
            this.errorHandler = new JobSystemErrorHandler(this.config.errorHandlerConfig);
        }

        // ユーザーフィードバックシステムを初期化
        if (this.config.enableUserFeedback) {
            this.userFeedback = new JobSystemUserFeedback(this.config.feedbackConfig);
        }

        // デバッガーを初期化
        if (this.config.enableDebugger) {
            this.debugger = new JobSystemDebugger(this.config.debuggerConfig);
        }
    }

    /**
     * システム間の統合を設定
     */
    private setupIntegration(): void {
        // エラーハンドラーとユーザーフィードバックの連携
        if (this.errorHandler && this.userFeedback) {
            this.errorHandler.on('error_handled', (data) => {
                this.userFeedback!.handleJobSystemFeedback(data.error, data.context);
            });

            this.errorHandler.on('show_dialog', (dialogData) => {
                this.userFeedback!.showDialog(dialogData);
            });
        }

        // エラーハンドラーとデバッガーの連携
        if (this.errorHandler && this.debugger) {
            this.errorHandler.on('error_logged', (logEntry) => {
                this.debugger!.error('error', logEntry.message, logEntry.context);
            });
        }

        // ユーザーフィードバックとデバッガーの連携
        if (this.userFeedback && this.debugger) {
            this.userFeedback.on('show_notification', (notification) => {
                this.debugger!.info('feedback', 'Notification shown', notification);
            });

            this.userFeedback.on('show_dialog', (dialog) => {
                this.debugger!.info('feedback', 'Dialog shown', dialog);
            });
        }
    }

    /**
     * エラーを処理
     * 
     * @param error エラー種別
     * @param context エラーコンテキスト
     * @returns エラー処理結果
     */
    public handleError(error: JobSystemError, context: JobSystemContext): any {
        // デバッガーにエラーを記録
        if (this.debugger) {
            this.debugger.logErrorContext(error, context);
        }

        // エラーハンドラーで処理
        if (this.errorHandler) {
            const result = this.errorHandler.handleError(error, context);

            // 処理結果をイベントで通知
            this.emit('error_processed', {
                error,
                context,
                result,
                timestamp: new Date(),
            });

            return result;
        }

        // フォールバック処理
        console.error(`JobSystem Error: ${error}`, context);
        return {
            success: false,
            message: 'エラーハンドラーが利用できません',
        };
    }

    /**
     * 成功フィードバックを表示
     * 
     * @param title タイトル
     * @param message メッセージ
     * @param details 詳細
     */
    public showSuccessFeedback(title: string, message: string, details?: string): void {
        if (this.userFeedback) {
            this.userFeedback.showSuccessNotification(title, message, details);
        }

        if (this.debugger) {
            this.debugger.info('feedback', `Success: ${title}`, { message, details });
        }
    }

    /**
     * 情報フィードバックを表示
     * 
     * @param title タイトル
     * @param message メッセージ
     * @param details 詳細
     */
    public showInfoFeedback(title: string, message: string, details?: string): void {
        if (this.userFeedback) {
            this.userFeedback.showInfoNotification(title, message, details);
        }

        if (this.debugger) {
            this.debugger.info('feedback', `Info: ${title}`, { message, details });
        }
    }

    /**
     * 警告フィードバックを表示
     * 
     * @param title タイトル
     * @param message メッセージ
     * @param details 詳細
     */
    public showWarningFeedback(title: string, message: string, details?: string): void {
        if (this.userFeedback) {
            this.userFeedback.showWarningNotification(title, message, details);
        }

        if (this.debugger) {
            this.debugger.warn('feedback', `Warning: ${title}`, { message, details });
        }
    }

    /**
     * 職業変更の成功フィードバック
     * 
     * @param characterId キャラクターID
     * @param oldJobName 旧職業名
     * @param newJobName 新職業名
     */
    public showJobChangeSuccess(characterId: string, oldJobName: string, newJobName: string): void {
        this.showSuccessFeedback(
            '職業変更完了',
            `${oldJobName}から${newJobName}に職業を変更しました`,
            `キャラクター: ${characterId}`
        );

        if (this.debugger) {
            this.debugger.logJobChange(characterId, oldJobName, newJobName, true);
        }
    }

    /**
     * ランクアップの成功フィードバック
     * 
     * @param characterId キャラクターID
     * @param jobName 職業名
     * @param newRank 新ランク
     * @param roseEssenceUsed 使用した薔薇の力
     */
    public showRankUpSuccess(
        characterId: string,
        jobName: string,
        newRank: number,
        roseEssenceUsed: number
    ): void {
        this.showSuccessFeedback(
            'ランクアップ完了',
            `${jobName}がランク${newRank}にランクアップしました`,
            `薔薇の力 ${roseEssenceUsed} を使用`
        );

        if (this.debugger) {
            this.debugger.logRankUp(characterId, jobName, newRank - 1, newRank, roseEssenceUsed, true);
        }
    }

    /**
     * 薔薇の力獲得の成功フィードバック
     * 
     * @param amount 獲得量
     * @param source 獲得源
     * @param currentTotal 現在の合計
     */
    public showRoseEssenceGainSuccess(amount: number, source: string, currentTotal: number): void {
        this.showSuccessFeedback(
            '薔薇の力を獲得',
            `薔薇の力を${amount}獲得しました`,
            `現在の薔薇の力: ${currentTotal}`
        );

        if (this.debugger) {
            this.debugger.logRoseEssenceChange('gain', amount, source, currentTotal);
        }
    }

    /**
     * パフォーマンス測定を開始
     * 
     * @param name 測定名
     * @param metadata メタデータ
     */
    public startPerformanceTracking(name: string, metadata?: any): void {
        if (this.debugger) {
            this.debugger.startPerformanceTracking(name, metadata);
        }
    }

    /**
     * パフォーマンス測定を終了
     * 
     * @param name 測定名
     * @returns 測定結果
     */
    public endPerformanceTracking(name: string): any {
        if (this.debugger) {
            return this.debugger.endPerformanceTracking(name);
        }
        return null;
    }

    /**
     * システム状態をログ
     * 
     * @param jobSystem JobSystemインスタンス
     */
    public logSystemState(jobSystem: any): void {
        if (this.debugger) {
            this.debugger.logJobSystemState(jobSystem);
        }
    }

    /**
     * ガイダンスを表示
     * 
     * @param category ガイダンスカテゴリ
     * @param context コンテキスト
     */
    public showGuidance(category: string, context?: any): void {
        if (this.userFeedback) {
            this.userFeedback.showGuidance(category, context);
        }

        if (this.debugger) {
            this.debugger.info('guidance', `Guidance shown: ${category}`, context);
        }
    }

    /**
     * 確認ダイアログを表示
     * 
     * @param title タイトル
     * @param message メッセージ
     * @param onConfirm 確認時のコールバック
     * @param onCancel キャンセル時のコールバック
     * @returns ダイアログID
     */
    public showConfirmDialog(
        title: string,
        message: string,
        onConfirm?: () => void,
        onCancel?: () => void
    ): string {
        if (this.userFeedback) {
            return this.userFeedback.showConfirmDialog(title, message, onConfirm, onCancel);
        }
        return '';
    }

    /**
     * エラー統計を取得
     */
    public getErrorStatistics(): any {
        if (this.errorHandler) {
            return this.errorHandler.getErrorStatistics();
        }
        return null;
    }

    /**
     * デバッグ統計を取得
     */
    public getDebugStatistics(): any {
        if (this.debugger) {
            return this.debugger.getStatistics();
        }
        return null;
    }

    /**
     * エラーログを取得
     * 
     * @param limit 取得件数制限
     */
    public getErrorLog(limit?: number): any[] {
        if (this.errorHandler) {
            return this.errorHandler.getErrorLog(limit);
        }
        return [];
    }

    /**
     * デバッグログを取得
     * 
     * @param filter フィルター
     */
    public getDebugLog(filter?: string): any[] {
        if (this.debugger) {
            return this.debugger.getLogs(filter);
        }
        return [];
    }

    /**
     * ログをエクスポート
     */
    public exportLogs(): string {
        const exportData = {
            timestamp: new Date().toISOString(),
            errorLog: this.errorHandler?.exportErrorLog(),
            debugLog: this.debugger?.exportLogs(),
            statistics: {
                error: this.getErrorStatistics(),
                debug: this.getDebugStatistics(),
            },
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 設定を更新
     * 
     * @param newConfig 新しい設定
     */
    public updateConfig(newConfig: Partial<IntegrationConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // 各コンポーネントの設定を更新
        if (this.errorHandler && newConfig.errorHandlerConfig) {
            this.errorHandler.updateConfig(newConfig.errorHandlerConfig);
        }

        if (this.userFeedback && newConfig.feedbackConfig) {
            this.userFeedback.updateConfig(newConfig.feedbackConfig);
        }

        if (this.debugger && newConfig.debuggerConfig) {
            this.debugger.updateConfig(newConfig.debuggerConfig);
        }

        this.emit('config_updated', this.config);
    }

    /**
     * デバッグモードを有効/無効化
     * 
     * @param enabled 有効フラグ
     */
    public setDebugMode(enabled: boolean): void {
        this.config.enableDebugger = enabled;

        if (enabled && !this.debugger) {
            this.debugger = new JobSystemDebugger(this.config.debuggerConfig);
            this.setupIntegration();
        } else if (!enabled && this.debugger) {
            this.debugger.destroy();
            this.debugger = undefined;
        } else if (this.debugger) {
            this.debugger.setEnabled(enabled);
        }
    }

    /**
     * 全ての通知を非表示
     */
    public hideAllNotifications(): void {
        if (this.userFeedback) {
            this.userFeedback.hideAllNotifications();
        }
    }

    /**
     * 全てのダイアログを非表示
     */
    public hideAllDialogs(): void {
        if (this.userFeedback) {
            this.userFeedback.hideAllDialogs();
        }
    }

    /**
     * ログをクリア
     */
    public clearLogs(): void {
        if (this.errorHandler) {
            this.errorHandler.clearErrorLog();
        }

        if (this.debugger) {
            this.debugger.clearLogs();
        }
    }

    /**
     * リソースを破棄
     */
    public destroy(): void {
        if (this.errorHandler) {
            this.errorHandler.destroy();
        }

        if (this.userFeedback) {
            this.userFeedback.destroy();
        }

        if (this.debugger) {
            this.debugger.destroy();
        }

        this.removeAllListeners();
    }
}